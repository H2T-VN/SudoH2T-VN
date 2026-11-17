# Chạy AI trên Kaggle

Các notebook dưới đây là pipeline **demo MobileNet/Imagenette và benchmark Hunter**.
Phần kiểm thử ONNX classification do người dùng cung cấp có contract riêng tại
[docs/custom-classification.md](../docs/ai/custom-classification.md). Không cần train
lại model của người dùng để nạp vào adapter. Notebook đã rebuild theo source mới;
kết quả Kaggle lịch sử chỉ thuộc các hash đã ghi trong
[kaggle-run-status.json](../docs/ai/kaggle-run-status.json), bản source mới còn NOT_RUN.

## 1. Chuẩn bị một lần

1. Chạy `python ai-service/tools/build_kaggle_bundle.py` tại gốc dự án.
2. File `dist/miragehunter-source.zip` chứa code AI, scripts và config, không chứa dataset/checkpoint.
3. Notebook mới đã nhúng ZIP và kiểm tra SHA256 khi bootstrap; không cần tạo hoặc
   gắn thêm Kaggle Dataset chứa source.
4. Thêm Imagenette-160 hoặc Imagenette-320 qua **Add Input**. Cần cấu trúc `train/<WNID>/` và
   `val/<WNID>/`, đủ 10 lớp Imagenette. Không dùng một dataset ImageNet bất kỳ thay thế.
5. Import notebook `.ipynb` trong `experiments/kaggle/` vào Kaggle.
6. Bật Internet để cài dependencies/tải pretrained weights; chọn GPU cho notebook train
   nếu tài khoản được cấp. Các notebook không cần token Kaggle trong code.

Notebook không hardcode tên tài khoản hay dataset slug. Nếu có nhiều bản Imagenette,
điền `config['dataset_root']` hoặc `DATASET_ROOT` là folder chứa `train/` và `val/`.
Input `jhoward/imagenette-160-px` chứa file `imagenette-160.tgz`; loader hiện tự giải nén
vào `/kaggle/temp/imagenette-cache/<archive-sha256>/`, rồi kiểm tra đủ 10 lớp ở cả
train/val. Có thể đặt DATASET_ROOT trực tiếp tới file TGZ. Input gốc không bị sửa.

## 2. Notebook 01 — train

Mở `01_train_mobilenetv3_imagenette.ipynb`, Add Input: Imagenette.
Chạy bootstrap, chỉnh config, rồi chạy `train(config)`.

- Mặc định seed 42, 8 epochs, batch 64, LR 1e-4, early stopping patience 3.
- Hai epochs đầu train classifier; sau đó mở thêm 2 block cuối. Config thay đổi được.
- `train/` chia stratified train/dev; `val/` gốc là held-out test.
- Chọn checkpoint theo dev loss, chỉ đánh giá test khi model đã chọn xong.
- Held-out ở đây là không dùng để fine-tune/chọn cấu hình của dự án. Vì Imagenette là
  tập con ImageNet và dùng pretrained ImageNet, chưa chứng minh test độc lập với dữ liệu pretraining.
- Ghi ảnh/split/hash, mapping, preprocessing, history, môi trường và metric thật.
- Nếu OOM, giảm batch size. CPU vẫn được hỗ trợ nhưng có thể rất chậm.
- Chọn **Save Version → Save & Run All**, đợi hoàn thành và kiểm tra Output.

Output: `/kaggle/working/miragehunter_artifacts/`, kèm ZIP tổng hợp.
`classification_metrics.json` chỉ được tạo sau evaluation thực tế, không có số liệu placeholder.

### Resume

Attach Output lần trước, đặt `config['resume']` tới `training_resume.pth` đáng tin cậy.
Dùng output directory mới nếu lần trước đã hoàn thành đánh giá test. Nếu GPU hết phiên,
cần checkpoint được Kaggle lưu/persist trước; notebook không thể khôi phục file đã mất.
Seed, split, batch size, LR và cấu hình mở lớp phải khớp. RNG, optimizer, best weights
và history được lưu để resume; không bảo đảm bitwise giữa GPU/thư viện khác nhau.
Muốn đổi hyperparameter: coi là thí nghiệm mới, không tiếp tục tối ưu theo test.

## 3. Notebook 02 — ONNX và parity

Import `02_export_verify_onnx.ipynb`. Add Input:

- Output notebook 01, bao gồm checkpoint và các JSON/CSV cạnh nó;
- Imagenette cùng phiên bản.

Notebook xuất logits `[N,10]`, ONNX opset 17 và so ít nhất 20 ảnh **dev**.
Kiểm tra cả preprocessing độc lập Torchvision ↔ Pillow/NumPy, logit differences và top-1.
Mismatch sẽ dừng với lỗi và ghi parity report thất bại. Không triển khai artifact lỗi.

Output thêm: ONNX, `onnx_parity_report.json`, `model_manifest.json` kèm SHA256.
Đưa ONNX + mapping + preprocessing + manifest + parity report tới Backend.
Model adapter kiểm hash và yêu cầu parity report đã pass trên ít nhất 20 mẫu lúc load.
Các file `.pth` chỉ cần trên Kaggle; Backend triển khai ONNX cùng 4 file metadata nêu trên.

## 4. Notebook 03 — benchmark

Import `03_hunter_benchmark.ipynb`. Add Input: Output notebook 02 + Imagenette.
Chạy 4 strategies × seeds `[42,123,2026]`, mặc định 200 queries/run, cùng source subset/schedule.
Freeze config trước khi chạy held-out; dùng dev trong một thí nghiệm khác để thiết kế thuật toán.
Không đưa kết quả test trở lại chọn model hoặc reward rồi gọi đó là đánh giá độc lập.

Ảnh được nạp và hash đối chiếu với split manifest. Chỉ baseline đúng được đưa vào hunt;
baseline accuracy và chi phí sàng lọc vẫn được báo. LinUCB/TPE được reset mỗi run.
Online adaptation nằm trong một run theo protocol đã chốt; trạng thái không chuyển giữa các run.

Output: `benchmark.csv`, `aggregate.json`, biểu đồ candidate mean ± sample std, từng run
có config/schedule/trials/ảnh/fingerprint. Mỗi thư mục run phải mới để tránh ghi đè.

**Mặc định chỉ kiểm tra chất lượng tự động nên lỗi là candidate.** Candidate count không
phải confirmed count. Backend cần review theo hash ảnh để xác nhận giữ nhãn.
RAM báo là process high-water tích lũy trên Linux, không phải RAM độc lập từng strategy.

## 5. Source nhúng trong notebook

Sau khi sửa source hoặc template, chạy lại `python ai-service/tools/build_kaggle_bundle.py` và
import notebook mới. Bootstrap xác minh SHA256 rồi giải nén source nhúng vào
`/kaggle/working/miragehunter-source`. Source đính kèm từ output notebook trước
không được chọn thay cho phiên bản nhúng này.

## 6. Bàn giao

Gửi Backend: ONNX + manifest + class mapping + preprocessing, link/version notebook,
parity report, baseline accuracy thật, thư mục vài case có quyền chia sẻ, giới hạn query
và thời gian/RAM đã đo. Không commit dataset hoặc checkpoint lớn lên GitHub.

Ngày 16/11/2026: đã sửa loader TGZ và chạy **Save & Run All** version 2, run `370340546`,
GPU T4 x2. Training hoàn tất 8 epochs; dev accuracy 97,32%, test accuracy 96,80% trên
500 ảnh. Output có checkpoint, metrics, history, split manifest và `miragehunter-output.zip`
(Kaggle hiển thị 24,83 MB). Lượt train này đã dùng source input
`hungdeptrai123456/h2t-miragehunter-ai-source-v2-tgz`; notebook mới dùng source nhúng.
Lượt đầu `370337350` đã lỗi do TGZ chưa giải nén; kết quả thành công thuộc version 2.
Ngày 17/11/2026: notebook 02, run `370485049`, hoàn tất trên CPU trong 1 phút 7 giây.
Parity pass trên 32 ảnh dev: top-1 khớp 100%, max absolute logit diff 0,0000276566,
preprocessing diff bằng 0. ZIP artifact đã tải về, CRC và sáu hash trong manifest đều khớp.
Notebook 03, run `370489176`, đã chạy thành công: 12 lượt trên CPU, 2.400 search queries.
Candidate trung bình: Random 4,33; TPE-only 6,67; LinUCB-only 5,67; Hybrid 8,33.
Chưa có semantic review nên confirmed bằng 0. Output ZIP hiển thị 263,64 MB.
Xem `docs/benchmark-370489176.md` và `docs/kaggle-run-status.json` để lấy bằng chứng,
độ lệch chuẩn, cấu hình và giới hạn diễn giải.

Đã tạo gói triển khai CPU tối thiểu trong `artifacts/deployment-370485049/` và ZIP 5 file,
không kèm Torch/checkpoint. Ba case thật replay pass; smoke thư viện hoàn tất 3 truy vấn.
Xem `docs/ai-handoff.md` để lấy lệnh chạy, response JSON thật và gallery 75 candidate cần
người review. Bản sửa oracle ảnh không nhãn nằm trong bundle mới; các lượt Kaggle đã
chạy vẫn giữ source hash cũ, không được ghi nhận thành lượt chạy của code mới.
