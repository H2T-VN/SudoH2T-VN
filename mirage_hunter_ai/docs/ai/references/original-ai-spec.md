# H2T — MIRAGEHUNTER AI: ĐẶC TẢ TRIỂN KHAI PHẦN AI/ML CHO CODEX

**Dự án:** H2T-MirageHunter — Kiroween 2026, Frankenstein / Best Student Project: Frankenstein  
**Module phụ trách:** `backend/app/hunter/`, `backend/app/models/`, `backend/app/transforms/`, `backend/app/evaluation/`, `experiments/`  
**Người thực hiện:** Thành viên AI/ML (phối hợp với Backend và Frontend)  
**Ngày soạn:** 16/11/2026  
**Mục đích:** Dán hoặc đính kèm file này cho **Codex** để giao nhiệm vụ **tạo mã nguồn AI chạy thật, notebook huấn luyện trên Kaggle, benchmark và model artifact có thể triển khai**. Đây là *đặc tả*, **không phải kết quả training**.

> **YÊU CẦU CỐT LÕI:** Toàn bộ việc **fine-tune/huấn luyện target model cho demo và các thực nghiệm nặng phải thực hiện trên Kaggle Notebooks** (GPU khi có). Không chỉ viết notebook mà phải có hướng dẫn chạy, export checkpoint/ONNX, lưu metric, hash, kiểm chứng ONNX. Người dùng sẽ tự chạy notebook trên tài khoản Kaggle; Codex không được tuyên bố đã train nếu chưa có log/outputs thực tế.

> **PHÂN BIỆT:** `LinUCB + TPE` là **thuật toán Hunter học/tối ưu trực tuyến từ phản hồi**, không phải neural network cần train trước trên GPU. **Kaggle vẫn bắt buộc** cho việc fine-tune target MobileNetV3-Small, tạo artifact ONNX và chạy benchmark. Mô hình *LightGBM Failure Predictor* train trên log kiểm thử là phần nâng cao, chỉ bật khi có đủ dữ liệu hợp lệ.

---

## 0. CHỈ THỊ CHO CODEX — ĐỌC TRƯỚC KHI CODE

1. Đọc `AGENTS.md`, `.kiro/specs/miragehunter/requirements.md`, `design.md`, `tasks.md` (nếu đã tồn tại), `README.md` và cấu trúc repository hiện tại. **Không ghi đè kiến trúc, không phá contract đã được nhóm phê duyệt.** Nếu thiếu file, ghi rõ và dùng tài liệu này làm đặc tả AI tạm thời.
2. **Chỉ làm module AI/ML và API contract cần thiết để tích hợp**; không tự ý viết lại `frontend/`, `.kiro/` hoặc các module Backend của thành viên khác. Thỏa thuận contract với backend trước khi nối API.
3. Triển khai theo thứ tự **MVP đơn giản chạy thật → Hunter → benchmark → YOLO-OBB tùy chọn**. Mỗi giai đoạn có unit test và hướng dẫn chạy.
4. **Không tạo số liệu giả để làm kết quả thực nghiệm**; phân biệt `example` với `measured`. Không tuyên bố Hybrid tốt hơn baseline nếu chưa đo.
5. **Kaggle là môi trường training và benchmark**, không phải server phục vụ web liên tục. Web backend miễn phí dùng artifact suy luận đã export.
6. Ghi lại danh sách file sửa, lệnh đã chạy, test pass/fail, môi trường, lỗi còn tồn đọng; đừng tạo commit/push nếu chưa được yêu cầu.
7. Mã nguồn mới thuộc repo dự thi. Nếu dùng pretrained weights/đoạn code/dataset có trước, nêu nguồn và giấy phép trong `docs/existing-work-disclosure.md`; không copy code cũ mà không được phép.

### Definition of Done tối thiểu

- [ ] Notebook Kaggle **thực sự có mã train/fine-tune** MobileNetV3-Small trên Imagenette, checkpoint, ONNX export, metrics, model manifest.
- [ ] ONNX inference dùng đúng preprocessing/label mapping, có parity test so với PyTorch.
- [ ] `Random Search`, `TPE-only`, `LinUCB-only`, `Hybrid LinUCB+TPE` cùng một interface, seed và query budget.
- [ ] Ít nhất 4 phép biến đổi: brightness, blur, noise, JPEG; ảnh biến đổi được lưu đầy đủ để tái lập.
- [ ] Chỉ gắn nhãn **confirmed failure** khi có ground truth, baseline đúng và biến đổi hợp lệ; không nhầm confidence drop với failure.
- [ ] Kết quả benchmark tạo từ lần chạy thật: CSV/JSON; tối thiểu so Random với Hybrid, mục tiêu đủ 4 phương pháp.
- [ ] Test tự động cho reproducibility, budget, shape/dtype, correctness oracle và API schema.
- [ ] Có lệnh chạy local inference/test, hướng dẫn kết nối `Start AI Hunt` với FastAPI.

---

## 1. MỤC TIÊU VÀ PHẠM VI

**Bài toán:** Cho một **target image classifier** và tập ảnh có nhãn đúng, tự động tìm các phép biến đổi hình ảnh mà **không làm mất nhãn ngữ nghĩa**, nhưng khiến classifier từ dự đoán đúng trở thành dự đoán sai. Tìm lỗi với ngân sách số lượt inference giới hạn, lưu bằng chứng và cho phép chạy lại.

**Phương pháp chính:** **Metamorphic Testing + Hybrid Adaptive Search (LinUCB Contextual Bandit + TPE)**.

- **Metamorphic Testing:** tạo ảnh đã biến đổi, kiểm tra quan hệ nhãn/điều kiện hợp lệ.
- **LinUCB:** chọn **họ biến đổi** phù hợp với đặc trưng ảnh và kết quả học online.
- **TPE/Optuna:** tối ưu **cường độ biến đổi** sau khi một họ đã được chọn.
- **Target Model:** MobileNetV3-Small fine-tuned trên Kaggle; ResNet18 hoặc YOLOv8n-OBB là mở rộng, không cản MVP.
- **Failure Oracle:** đối chiếu với **ground truth**; phân biệt `confirmed`, `candidate`, `invalid`, `not_failed`.

**Ngoài phạm vi MVP:** huấn luyện PPO/Diffusion lớn; upload/thực thi model `.pkl/.pt` bất kỳ từ người dùng web; chẩn đoán y tế; tạo dữ liệu giả nhưng gắn nhãn là kiểm chứng thực nghiệm; đánh giá YOLO detection bằng accuracy của classifier.

### 1.1. Pipeline nghiệp vụ

```text
Dataset có ground truth (Imagenette)
         +
Target pretrained/fine-tuned trên Kaggle -> export ONNX
         |
         v
Original inference -> chọn nguồn baseline đúng
         |
         v
Start AI Hunt: [Random | TPE | LinUCB | Hybrid]
         |
         v
Chọn loại biến đổi + cường độ + seed
         |
         v
Tạo ảnh biến đổi, kiểm tra điều kiện hợp lệ
         |
         v
ONNX Target inference -> so sánh ground truth
         |
         +----> feedback cho LinUCB / TPE
         |
         v
Failure record -> minimization -> fingerprint -> JSON/CSV + ảnh/test
```

---

## 2. TECH STACK, MÔI TRƯỜNG, DATASET

| Thành phần | Lựa chọn ưu tiên | Ghi chú |
|---|---|---|
| Kaggle training | Python 3 + PyTorch / torchvision | GPU nếu khả dụng; pin versions thực tế trong metadata |
| Target classifier | `torchvision.models.mobilenet_v3_small` | Fine-tune **10 classes Imagenette** trên Kaggle |
| Kaggle dataset | [fastai/imagenette](https://github.com/fastai/imagenette) | Lấy **Imagenette-160 hoặc 320**; ghi nguồn/license và version thực tế |
| Deployment model | ONNX + ONNX Runtime **CPU** | Không cần Torch trong backend miễn phí |
| TPE | `optuna.samplers.TPESampler` | seed cố định, startup trials rõ ràng |
| Bandit | LinUCB tự triển khai bằng NumPy | Có state, regularization và exploration alpha |
| Image transforms | Pillow + NumPy (+ OpenCV khi cần) | Không bắt buộc Albumentations cho MVP |
| Test | `pytest` | tests nhỏ chạy CPU không cần Kaggle |
| Benchmark | Kaggle notebook/CLI | Kết quả CSV/JSON, seeds và độ phân tán |
| Backend | FastAPI | API do thành viên Backend tích hợp; tránh chạy job dài trong request đồng bộ |

### 2.1. Chính sách dataset

1. Imagenette có 10 lớp là các WordNet ID (WNID) xuất phát từ ImageNet. **Không được nhầm nhãn 0–9 với ID 0–9 của ImageNet 1000 lớp**.
2. Tải/chọn dataset trên Kaggle qua `Add Input`, code phải tự tìm path trong `/kaggle/input/` hoặc chấp nhận `DATASET_ROOT` cấu hình; **không hardcode path account cụ thể**.
3. Lấy ảnh từ folder `train/` để phân chia nội bộ `train/dev` **theo stratified split và seed cố định**; giữ folder `val/` gốc là **held-out test** không dùng để chọn hyperparameter, chỉnh reward, train Hunter hoặc LightGBM.
4. Tạo `class_to_idx.json` theo thứ tự WNID **được lưu cố định**; không phụ thuộc tình cờ vào thứ tự đọc filesystem. Lưu bảng WNID ↔ tên lớp.
5. Chỉ dùng ảnh test được phép chia sẻ lên web. Không commit toàn bộ dataset vào GitHub; đưa nguồn/giấy phép vào `datasets/README.md`.
6. Khi mục tiêu là *induced failure*, chỉ dùng những ảnh ban đầu **target dự đoán đúng** làm tập nguồn thử. Báo cáo cả baseline accuracy để không gây thiên lệch đánh giá.
7. Đánh giá lỗi trên dữ liệu held-out; dữ liệu dùng để tune thuật toán không được trộn với held-out trong báo cáo cuối.

---

## 3. YÊU CẦU BẮT BUỘC: TRAIN TRÊN KAGGLE

### 3.1. Notebook và script phải tạo

- `experiments/kaggle/01_train_mobilenetv3_imagenette.ipynb` — notebook **thực sự fine-tune** model.
- `experiments/kaggle/02_export_verify_onnx.ipynb` — export và xác minh output ONNX.
- `experiments/kaggle/03_hunter_benchmark.ipynb` — chạy Random/TPE/LinUCB/Hybrid, xuất kết quả thực.
- `experiments/configs/train_mobilenetv3.yaml` — cấu hình có thể sửa.
- `experiments/README.md` — hướng dẫn import notebook vào Kaggle, cấu hình input, chạy từ đầu đến cuối, lấy output.
- Có thể dùng `experiments/scripts/` cho code dùng chung, nhưng notebook phải tự chạy được khi đưa script hoặc repo lên Kaggle; tránh hardcode ổ đĩa local.

### 3.2. Quy trình huấn luyện target MobileNetV3-Small

**Mục tiêu:** checkpoint classifier phân biệt 10 lớp Imagenette, rồi xuất model nhẹ để suy luận web miễn phí.

1. Trong Kaggle: `New Notebook` → `Settings` → `Accelerator: GPU` (nếu được cấp) → `Add Input` Imagenette. Ghi GPU/CPU thực tế. Không khẳng định chắc chắn luôn được GPU.
2. `seed=42` cho Python, NumPy, Torch và DataLoader; log mức độ deterministic / thuật toán không hoàn toàn deterministic.
3. Model: lấy pretrained ImageNet weights tương thích torchvision đang cài; **thay fully connected layer cuối thành 10 outputs**; log tên weights/phiên bản và giấy phép.
4. Input `224×224 RGB`, normalization đúng theo lựa chọn pretrained weights; lưu `preprocessing.json` (mean/std, resize, interpolation, color order). Train augmentation có thể `RandomResizedCrop` và `RandomHorizontalFlip`; valid/test dùng transforms cố định. Không áp test corruptions trong training evaluation nếu chưa công bố rõ.
5. Split: gốc `train` → `train/dev`; gốc `val` giữ nguyên làm held-out test. Dùng stratified split và lưu danh sách ID ảnh theo split.
6. Train 5–10 epochs **như cấu hình ban đầu**, batch size chọn phù hợp GPU/CPU, `CrossEntropyLoss`, `AdamW`, learning rate ví dụ `1e-4`, early stopping theo dev loss/accuracy. Cho phép cấu hình epochs/batch/LR; **không ghi số liệu kết quả chưa đo**.
7. Bắt đầu fine-tune **classifier head**, tùy khả năng GPU có thể unfreeze vài lớp cuối; luôn ghi chính xác phần nào đã train.
8. Lưu **best checkpoint theo dev metric**, state_dict + config + class mapping, không lưu mỗi object pickle đầy đủ. Báo cáo `dev_accuracy`, `test_accuracy` (chạy **một lần cuối** sau khi chốt model), confusion matrix và per-class metrics. Không đưa metric trên test trở lại để chọn model.
9. Có thể đánh giá robustness bổ sung trên biến đổi giữ nhãn; ghi riêng so với clean accuracy.
10. Xuất file vào `/kaggle/working/miragehunter_artifacts/`; dùng **Save Version → Save & Run All**, tải artifacts ở Output. Nếu notebook cần GPU mà phiên hết hạn, có cơ chế resume checkpoint.

**Artifacts bắt buộc (tên có thể mở rộng nhưng phải nhất quán):**

```text
/kaggle/working/miragehunter_artifacts/
├── mobilenetv3_imagenette_best.pth
├── mobilenetv3_imagenette.onnx
├── class_to_idx.json
├── preprocessing.json
├── train_config.json
├── training_history.csv
├── classification_metrics.json
├── confusion_matrix.csv
├── split_manifest.json            # image IDs, split, seed, hashes khi khả thi
├── environment.json               # python/torch/torchvision/onnxruntime/GPU versions
├── onnx_parity_report.json
└── model_manifest.json            # SHA256 + provenance + input/output contract
```

**BẮT BUỘC:** Notebook viết code thật để tạo tất cả output; nếu phần nào chưa chạy được, phải hiển thị lỗi hoặc `not_run` rõ ràng, không tạo một JSON giả nói rằng đã pass.

### 3.3. ONNX export và kiểm chứng

- Export với PyTorch ONNX exporter phù hợp version, opset và ONNX Runtime đã kiểm tra; ưu tiên input `float32 [N,3,224,224]`, output `[N,10]` **logits**; cấu hình batch N (cố định 1 hoặc dynamic được ghi rõ).
- **Cùng ảnh + cùng preprocessing** phải cho dự đoán gần tương đương giữa Torch và ONNX; test ít nhất 20 ảnh có nhãn.
- Lưu `max_abs_logit_diff`, `mean_abs_logit_diff`, `top1_agreement`, số trường hợp không khớp và thư viện/runtime version. Chọn tolerance dựa trên thực nghiệm; phát hiện mismatch, không âm thầm bỏ qua.
- Kiểm tra metadata lớp và dtype; inference local chạy được dù không có GPU/Torch (chỉ cần ONNX Runtime + preprocessing).
- Model inference API trả **logits/probabilities có thứ tự lớp cố định**; nếu tính softmax dùng implementation ổn định số học.

### 3.4. Nếu muốn train thêm **mô hình Hunter** trên Kaggle (Phase nâng cao)

Có thể thêm **LightGBM Failure Predictor** sau khi thu thập một lượng log kiểm thử đủ đa dạng và hợp lệ:

- Notebook `experiments/kaggle/04_train_failure_predictor_lightgbm.ipynb`.
- Features: image context, phép biến đổi, severity, target model version; **KHÔNG dùng feature sau khi đã biết prediction của ảnh biến đổi** (tránh leakage).
- Label `1` nếu **confirmed induced failure**, `0` nếu valid non-failure; loại `invalid/candidate`.
- Split theo **source image ID**, không random theo từng biến thể để tránh gần trùng ảnh giữa train và test.
- Báo cáo PR-AUC, ROC-AUC, Precision/Recall và calibration/Brier nếu đủ dữ liệu; so sánh với tần suất lỗi baseline.
- Dùng model này làm *candidate reranker* **tùy chọn có feature flag**, không thay thế LinUCB+TPE. Thử nghiệm A/B phải chứng minh có cải thiện; nếu không có đủ dữ liệu thì **không train/không claim**.

> Không được đánh tráo yêu cầu Kaggle: fine-tune MobileNetV3 ở §3.2 là bước training **bắt buộc**. LightGBM là nâng cấp có điều kiện. LinUCB và TPE vẫn là phương pháp AI Hunter chính.

---

## 4. METAMORPHIC TESTING — TẠO TRƯỜNG HỢP KIỂM THỬ

### 4.1. Các phép biến đổi MVP (tham số khởi đầu)

| ID | Phép biến đổi | Miền ban đầu | Nguyên tắc |
|---|---|---|---|
| `brightness` | Nhân cường độ sáng | `[0.65,1.35]` | Không đưa ảnh về gần như đen/trắng hoàn toàn |
| `blur` | Gaussian blur | sigma `[0.0,2.0]` | Kernel size được tính hợp lệ theo sigma |
| `noise` | Gaussian noise | sigma `[0.0,10.0]` trên uint8 | RNG theo seed, clip pixel `[0,255]` |
| `jpeg` | JPEG compression | quality `[50,95]` | Ghi compression quality, có thể dùng integer |

Đây là **miền đề xuất**, không phải bằng chứng mọi biến đổi đều bảo toàn nhãn. Code phải có kiểm tra chất lượng/validity và hỗ trợ gắn cờ cần kiểm tra thủ công.

### 4.2. Interface đề xuất

```python
@dataclass(frozen=True)
class TransformationSpec:
    kind: Literal['brightness', 'blur', 'noise', 'jpeg']
    severity: float
    seed: int


def transform_image(image_rgb_uint8: np.ndarray, spec: TransformationSpec) -> np.ndarray:
    """Không sửa image gốc; trả uint8 HxWx3, giữ chiều/cỡ ảnh."""
```

- Transform luôn **giữ H×W×3**, dtype `uint8`, RGB, không có NaN, không mutate input; noise deterministic theo seed.
- Với phép nhân độ sáng, cần lưu `factor` thực tế. Với TPE, severity chuẩn hóa [0,1] rồi map vào miền của từng phép biến đổi; **0 tương ứng biến đổi gần/đúng identity** nếu có thể.
- Giữ ảnh đã biến đổi trong kết quả kiểm thử, cùng `image_sha256`, source ID, transform spec, model SHA256.
- V1 không dùng crop/rotation để tránh phải thay nhãn hình học. Khi mở rộng YOLO-OBB, mọi phép đổi hình học phải cập nhật bounding boxes đúng.

### 4.3. Trạng thái oracle

- `confirmed_failure`: ground truth hợp lệ, baseline gốc đúng, ảnh biến đổi còn hợp lệ (theo quy tắc/kiểm tra), **prediction sau biến đổi sai**.
- `not_failed`: baseline đúng, phép biến đổi hợp lệ, prediction vẫn đúng.
- `candidate`: dự đoán khác hoặc confidence thay đổi nhưng **thiếu nhãn đúng hoặc ảnh chưa được kiểm tra hợp lệ**.
- `invalid`: ảnh hỏng/đối tượng mất khả năng nhận biết hoặc transformation không bảo toàn bài toán.
- `baseline_incorrect`: target đã sai trên ảnh gốc; **không đếm là induced failure**. Có thể báo cáo riêng.

**Cảnh báo:** Heuristics như SSIM, brightness threshold, sharpness threshold có thể giúp lọc ảnh nhưng **không chứng minh giữ nguyên nhãn ngữ nghĩa**. Tập lỗi được báo cáo là `confirmed` nên có nhãn gốc tin cậy và chính sách kiểm duyệt ảnh biến đổi, ít nhất kiểm tra thủ công các lỗi nổi bật trong video. Nếu chỉ auto heuristic, hiển thị `provisionally_valid` / `candidate` và nói rõ giới hạn.

---

## 5. AI HUNTER — THIẾT KẾ THUẬT TOÁN

### 5.1. Context cho LinUCB

Context vector chuẩn hóa, tính **trước khi biến đổi ảnh**, ví dụ:

```text
x = [
  1.0,                   # bias
  mean_luminance,        # [0,1]
  luminance_std,         # [0,1]
  normalized_sharpness,  # Laplacian variance with clipping/log scaling
  baseline_confidence,   # [0,1]
  baseline_entropy       # normalized softmax entropy [0,1]
]
```

Nếu context feature khác thay đổi theo model, phải lưu version của feature extractor. Không dùng ground-truth label làm feature dự đoán nếu muốn giải pháp mở rộng cho dữ liệu không nhãn; ground truth chỉ dùng oracle/benchmark. Không dùng kết quả của ảnh sau biến đổi làm input để chọn action trước đó.

### 5.2. LinUCB

- **Actions:** `brightness`, `blur`, `noise`, `jpeg`.
- Một `A_a = λI` và `b_a = 0` cho mỗi action; `theta_a = A_a^{-1} b_a`.
- Điểm action: `theta_a.T @ x + alpha * sqrt(x.T @ inv(A_a) @ x)`.
- Dùng `np.linalg.solve` thay explicit `np.linalg.inv` để ổn định số học.
- Chọn action có score cao nhất; tie-breaking seeded.
- Cập nhật `A_a += x x.T`, `b_a += reward*x` **chỉ khi có feedback hợp lệ**.
- `alpha` và `lambda` cấu hình; default đề xuất `alpha=0.5`, `lambda=1.0` (phải benchmark, không coi là tối ưu).
- **Reward khởi đầu:** `1` cho một induced failure hợp lệ (có thể chỉ thưởng unique case), `0` cho valid nonfailure; invalid không thưởng và thống kê riêng. Đừng lẫn reward với xác suất dự đoán của model.
- Tránh reward quá thiên về severity cực lớn: tối ưu chính theo **failure discovery**, sau đó dùng bước minimization để tìm biến đổi nhẹ hơn.

### 5.3. TPE (Optuna)

- Mỗi `action` có một **Optuna study riêng** tối ưu severity trong miền tương ứng. Như vậy TPE học mức cường độ sau khi Bandit chọn action.
- Seed = `global_seed + stable_action_index`; cấu hình `n_startup_trials` rõ ràng (Optuna mặc định 10 **mỗi study**). Với 4 arms, cần tính ngân sách warm-up thực tế.
- **Score liên tục cho classifier:** `margin = max_{k != y} p_k(x') - p_y(x')` (chỉ trên ảnh/nhãn hợp lệ). Margin dương ↔ top-1 sai, trừ tie; tối đa hóa margin là proxy để tìm vùng gây lỗi.
- Cần **khởi tạo ảnh baseline đúng**; nếu invalid, thử đó không được báo là lỗi (có thể record trial penalty rõ ràng).
- Với hybrid, đề xuất API `ask/tell` của Optuna để Bandit chọn action trước rồi TPE đề xuất severity. Không dùng `study.optimize` lồng ghép bừa bãi gây khó kiểm soát query budget.
- Dùng fixed image schedule (cùng source image order giữa phương pháp) để tránh một chiến lược may mắn được ảnh khó hơn. Lưu lại lịch này trong config/result.

### 5.4. Bốn strategy cần cài đặt (ablation)

| Strategy | Chọn action | Chọn severity |
|---|---|---|
| `random` | Uniform seeded | Uniform seeded |
| `tpe_only` | Categorical trong một joint Optuna study (hoặc random arm + TPE, nhưng phải ghi rõ thiết kế) | TPE, conditional theo action |
| `linucb_only` | LinUCB theo context | Uniform seeded |
| `hybrid` | LinUCB theo context | TPE study riêng theo action |

**Không gọi LinUCB-only là contextual nếu không thật sự tính và sử dụng context.** `tpe_only` phải mô tả rõ lựa chọn action để so sánh công bằng. Nếu joint conditional space khó triển khai đúng, dùng TPE global chọn action categorical + severity được scale chung `[0,1]`, và công bố sự khác biệt với hybrid.

### 5.5. Query budget và warm-up

- `max_queries` là số lần **target inference trên ảnh biến đổi**, không tính inference gốc để sàng lọc nguồn; báo cáo thêm `baseline_queries` và `total_target_inferences` để minh bạch chi phí toàn hệ thống.
- Chạy đúng hoặc thấp hơn ngân sách; record `actual_queries`, `valid_queries`, `invalid_queries`, `queries_to_first_failure`.
- Nếu sử dụng per-arm TPE, giai đoạn đầu cần warm-up ví dụ **8–10 trials/arm**; sau đó mới so số lỗi. Với budget 50, hybrid có thể không đủ dữ liệu; không tuyên bố TPE học hiệu quả nếu chỉ thử vài lần.
- Mỗi trial dùng image ID có sẵn theo schedule, seed và params; duplicate trial có thể kiểm tra trước để không đếm lỗi trùng.
- Nếu inference/backend lỗi, ghi `error` và không update policy từ kết quả lỗi kỹ thuật; quy định rõ có tính vào *attempts* hay không (báo cáo cả hai).

### 5.6. Minimization và Failure Fingerprint

- Khi có lỗi, thực hiện binary search hoặc coarse-to-fine đối với **một severity scalar**, bắt đầu từ identity rồi tiến gần ngưỡng lỗi; với corruption không đơn điệu phải dùng bracket/grid refinement và **không giả định duy nhất một ngưỡng**.
- Những lượt inference cho minimization **phải đếm riêng** (`minimization_queries`) hoặc nằm trong ngân sách chung nếu bài benchmark quy định; **không được giấu chi phí**.
- Lưu ảnh gây lỗi nhẹ nhất **tìm thấy trong ngân sách**, tuyệt đối không gọi là tối ưu toàn cục.
- Failure Fingerprint: source/model SHA256, preprocessing, transform kind/severity/seed, raw logits/probs, true label, predicted labels, validity status, timestamp, environment, lệnh replay.

---

## 6. DATA CONTRACT GIỮA AI VÀ BACKEND

### 6.1. Python interfaces (gợi ý)

```python
class ClassifierAdapter(Protocol):
    model_id: str
    class_names: list[str]
    def predict(self, image_rgb_uint8: np.ndarray) -> np.ndarray:
        """Return probabilities shape (C,), float32; preprocessing encapsulated."""


class HunterStrategy(Protocol):
    name: str
    def suggest(self, context: np.ndarray, trial_index: int) -> TransformationSpec: ...
    def update(self, context: np.ndarray, spec: TransformationSpec,
               reward: float, score: float, valid: bool) -> None: ...


def run_hunt(images, labels, model: ClassifierAdapter,
             strategy: HunterStrategy, config: HuntConfig) -> HuntResult: ...
```

- `run_hunt` không import Next.js hoặc FastAPI; module thuần Python, dễ test.
- `ClassifierAdapter` MVP đọc **ONNX file tin cậy, có manifest hợp lệ**. Không nhận upload thực thi `.pkl/.pt` từ browser.
- Nếu dùng model return logits thay probabilities, convert trong adapter và document; tránh trộn metric logits/prob.

### 6.2. Request/Response contract đề xuất

**Request (JSON minh họa):**

```json
{
  "model_id": "mobilenetv3-imagenette-v1",
  "dataset_id": "imagenette-demo-verified",
  "strategy": "hybrid",
  "max_queries": 100,
  "seed": 42,
  "transforms": ["brightness", "blur", "noise", "jpeg"]
}
```

**Response rút gọn (schema; số liệu sẽ do engine thật điền):**

```json
{
  "run_id": "<generated-id>",
  "status": "completed",
  "model_id": "mobilenetv3-imagenette-v1",
  "strategy": "hybrid",
  "seed": 42,
  "max_queries": 100,
  "actual_queries": "<integer>",
  "confirmed_failures": "<integer>",
  "candidate_failures": "<integer>",
  "invalid_trials": "<integer>",
  "failure_cases": "<list-of-records>"
}
```

**Lưu ý:** Đây là template mô tả trường dữ liệu, không phải JSON response mẫu để đưa thẳng vào API. Codex phải định nghĩa schema Pydantic chuẩn và kiểu giá trị tương ứng (`int`, `list`, v.v.), không dùng chuỗi placeholder trong kết quả thật.

### 6.3. Job execution

- Test theo `max_queries` có thể mất nhiều thời gian: thiết kế `POST /api/hunts` → trả `run_id`, `GET /api/hunts/{run_id}` → trạng thái, `GET /api/hunts/{run_id}/results` → JSON. Hỏi/đồng bộ với Backend trước khi code API.
- Với Render Free có sleep và filesystem không bền vững: **không được giả định background worker/job còn sống qua restart**. Bản demo có thể dùng số query nhỏ hoặc job chạy trong một process kèm timeout; dữ liệu quan trọng lưu ngoài filesystem nếu cần persist.
- Có `GET /health`; khóa `model_id`, `dataset_id` vào allowlist cho bản demo. Giới hạn upload size, image dimensions, number of concurrent jobs.
- Không cần database phức tạp trong module AI; AI trả records để Backend quyết định lưu SQLite/DB ngoài.

---

## 7. CẤU TRÚC FILE CẦN CODEX TẠO / ĐIỀU CHỈNH

```text
H2T-MirageHunter/
├── .kiro/                         # do nhóm/Kiro quản lý; KHÔNG xóa/ignore
├── frontend/                      # do người FE quản lý; KHÔNG tự sửa
├── backend/
│   ├── app/
│   │   ├── hunter/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── random_search.py
│   │   │   ├── tpe_search.py
│   │   │   ├── linucb.py
│   │   │   ├── hybrid.py
│   │   │   ├── context.py
│   │   │   ├── runner.py
│   │   │   └── minimizer.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── contracts.py
│   │   │   └── onnx_classifier.py
│   │   ├── transforms/
│   │   │   ├── __init__.py
│   │   │   └── image_corruptions.py
│   │   └── evaluation/
│   │       ├── __init__.py
│   │       ├── classification_oracle.py
│   │       ├── validity.py
│   │       ├── metrics.py
│   │       └── fingerprint.py
│   ├── tests/
│   │   ├── test_transforms.py
│   │   ├── test_classifier_adapter.py
│   │   ├── test_hunter_budget.py
│   │   ├── test_linucb.py
│   │   ├── test_tpe.py
│   │   ├── test_oracle.py
│   │   ├── test_reproducibility.py
│   │   └── test_end_to_end.py
│   ├── requirements-ai.txt         # CPU inference only; avoid torch in web runtime
│   └── ...                         # do not remove existing project files
├── datasets/
│   └── README.md
├── experiments/
│   ├── kaggle/
│   │   ├── 01_train_mobilenetv3_imagenette.ipynb
│   │   ├── 02_export_verify_onnx.ipynb
│   │   └── 03_hunter_benchmark.ipynb
│   ├── configs/
│   │   ├── train_mobilenetv3.yaml
│   │   └── benchmark.yaml
│   ├── scripts/
│   │   └── ...
│   ├── results/
│   │   └── README.md                # không commit các số liệu giả
│   └── README.md
├── docs/
│   ├── evaluation.md
│   └── existing-work-disclosure.md
├── AGENTS.md
├── README.md
└── LICENSE
```

**Không đặt checkpoint/dataset lớn vào GitHub một cách tùy tiện.** Dùng GitHub Release, storage hoặc Kaggle output nếu quyền cho phép; ghi hướng dẫn fetch + SHA256. Deployment chỉ đưa đúng ONNX + metadata cần suy luận.

---

## 8. EXPERIMENTAL DESIGN — CHỨNG MINH GIÁ TRỊ PHƯƠNG PHÁP

### 8.1. Cùng điều kiện giữa 4 phương pháp

- Cùng target checkpoint hash, tập ảnh held-out, label mapping, preprocessing, transform validity policy.
- Cùng `max_queries` (gợi ý benchmark: `100`, `200`; chọn theo tốc độ thực tế). Cùng **fixed image schedule**, seeds ví dụ `[42, 123, 2026]`; mở rộng 5 seeds nếu ngân sách cho phép.
- Bandit/TPE có giai đoạn warm-up được tính trong budget, không miễn trừ lượt thử ban đầu.
- Phải báo cáo **tỷ lệ ảnh biến đổi bị loại**; chiến lược chỉ tạo ảnh phi thực tế không được điểm cao.
- Nếu dùng `confirmed_failure`, nêu chính sách xác minh; nếu chưa kiểm duyệt thủ công, cần ghi đây là *candidate/automatic-check* khi thích hợp.
- Phân tích riêng hai loại mục tiêu: **max lỗi tìm thấy dưới cùng budget** và **min severity của lỗi tìm thấy**; không trộn thành một kết luận mơ hồ.
- Thống kê **mean ± std** qua seeds và số lỗi unique, không cherry-pick một seed đẹp.

### 8.2. File kết quả yêu cầu

```text
experiments/results/<run-name>/
├── config.json
├── trial_log.csv         # mỗi trial một hàng
├── summary.json          # budget, failure counts, timings, seed
├── failure_cases.jsonl   # fingerprint từng case (nếu có)
├── benchmark.csv         # 4 strategies x seeds
└── environment.json
```

Columns nên có trong `trial_log.csv`:
`run_id,trial_id,source_image_id,model_sha256,strategy,action,severity,seed,ground_truth,original_pred,transformed_pred,original_conf,transformed_conf,margin,validity_status,failure_status,latency_ms,image_sha256`.

### 8.3. Test tự động bắt buộc

1. Cùng ảnh + transform parameters + seed → **pixel output giống nhau**.
2. Không sửa ảnh input, không làm thay đổi shape, dtype, range.
3. Không vượt `max_queries`; warm-up và minimization được ghi riêng đúng.
4. Model dự đoán sai ngay trên ảnh gốc → **không** tính induced failure.
5. Thiếu ground truth / biến đổi invalid → **không** tạo confirmed failure.
6. Có ground truth, baseline đúng, ảnh hợp lệ, prediction sau sai → xác nhận `confirmed_failure` (theo validity policy).
7. LinUCB update state đúng, không update khi inference exception.
8. Optuna ask/tell không vượt budget, dùng seed deterministic trong khả năng runtime.
9. ONNX/class label/preprocessing loading failure trả lỗi rõ ràng.
10. Replay fingerprint phải tái tạo cùng ảnh/trial (giới hạn khác biệt do thư viện, cần pin version).

---

## 9. TỐI ƯU DEPLOY WEB MIỄN PHÍ (RENDER FREE)

Mục tiêu hiện tại: Web frontend Next.js ở Render Static Site, backend FastAPI ở Render Web Service Free. Gói này có giới hạn tài nguyên; **không bảo đảm mọi pipeline AI chạy được**.

- Inference backend dùng `onnxruntime` (CPU) + NumPy + Pillow + Optuna + FastAPI; **không cài Torch, Ultralytics hoặc full Kaggle training requirements** vào image deploy.
- Export `MobileNetV3-Small` 10-class, target input 224; giảm batch/number of concurrent jobs, thử 10–30 queries cho demo live trước rồi benchmark 100–200 trên Kaggle.
- Test RAM/cold start trên môi trường tương tự **512 MB**; nếu vượt, giới hạn worker/threads và cân nhắc tách inference hoặc dùng hosted compute khác, **không fake kết quả**.
- `YOLOv8n-OBB best.pt` từ repo cũ chỉ là **extension**: benchmark trên Kaggle với checkpoint được phép sử dụng; không bắt buộc deploy full PyTorch YOLO trên Render Free.
- Không lưu file cá nhân/ảnh nhạy cảm trong public repo; xóa tạm đúng cách, kiểm soát size/timeouts, filetypes.

---

## 10. TASK LIST CHO CODEX THEO THỨ TỰ THỰC HIỆN

### TASK AI-01 — Khảo sát và contract
- Đọc Specs/Kiro và repo hiện tại, nêu các xung đột hoặc file thiếu.
- Đề xuất Python contract với Backend; chốt nhiệm vụ, tránh sửa trùng.
- **Done:** file list + interface design + no breaking changes.

### TASK AI-02 — Kaggle training notebook (BẮT BUỘC)
- Tạo notebook train MobileNetV3-Small trên Imagenette, split/seed chuẩn, metadata, metrics, best checkpoint.
- Hướng dẫn `Add Input`, GPU, `Save & Run All`, download outputs.
- **Done:** notebook chạy được trên môi trường Kaggle khi người dùng cung cấp dataset; checkpoint và metrics sẽ do lần chạy thực tế tạo ra.

### TASK AI-03 — ONNX export & CPU adapter (BẮT BUỘC)
- Tạo notebook export, parity test Torch vs ONNX; tạo adapter `predict(image)` dùng đúng preprocessing.
- **Done:** test parity + smoke inference; lưu model manifest.

### TASK AI-04 — Transformations & oracle
- Tạo 4 phép biến đổi deterministic, ground-truth oracle, validity statuses, saved test cases.
- **Done:** pytest cho shape/seed/oracle/invalid.

### TASK AI-05 — Baselines
- Cài `RandomSearch` và `TPEOnly` cùng interface; log trials, budget.
- **Done:** runner với fake classifier + ONNX classifier, tests pass.

### TASK AI-06 — LinUCB + Hybrid
- Context extractor, LinUCB, per-arm TPE, shared configs.
- **Done:** chạy end-to-end, update policy đúng, budget không vượt.

### TASK AI-07 — Minimization & fingerprint
- Tạo fingerprint và replay; severity search có ghi query costs.
- **Done:** test replay và export JSON/ảnh test.

### TASK AI-08 — Kaggle benchmark (BẮT BUỘC)
- Tạo notebook 03 benchmark 4 strategies trên held-out images, 3+ seeds; xuất logs/summary/plots từ dữ liệu thật.
- **Done:** notebook code chạy được, báo cáo chỉ dựa vào kết quả thực tế và có variance.

### TASK AI-09 — Backend integration
- Đưa AI module thành API/library dễ import; trao đổi với thành viên Backend về request/response, timeouts, CORS, job semantics.
- **Done:** local smoke test Start AI Hunt và sample payload thực.

### TASK AI-10 — Nâng cao khi đủ thời gian (KHÔNG làm trước MVP)
- Tích hợp YOLOv8n-OBB + rotated-box matching + nhãn đúng nếu có.
- Hoặc train LightGBM Failure Predictor trên Kaggle từ **log đủ dữ liệu**.
- Hoặc restoration → detector, chỉ khi có ground truth cho nhiệm vụ detection.
- **Done:** extension có benchmark riêng, không làm hỏng baseline.

---

## 11. LỆNH CHẠY VÀ CÁCH BÀN GIAO

**Local (sau khi Codex tạo requirements/module):**

```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements-ai.txt
python -m pytest -q tests
```

**Kaggle:**

1. Upload/đồng bộ `experiments/kaggle/*.ipynb` và script phụ trợ vào Kaggle Notebook; `Add Input` dataset Imagenette; bật GPU khi có.
2. Run Notebook 01. Kiểm tra đường dẫn `/kaggle/working/miragehunter_artifacts/` và metric đầu ra.
3. Run Notebook 02 (dùng checkpoint/output từ Notebook 01) để export + parity.
4. Run Notebook 03 (sử dụng ONNX artifact + bộ ảnh test held-out) để benchmark.
5. `Save Version → Save & Run All`; tải output artifact (không copy token/credentials cá nhân vào repo).
6. Đưa file ONNX/metadata **đã kiểm tra hash** vào môi trường Backend deployment; cập nhật `docs/evaluation.md` bằng số liệu có nguồn notebook/link version.

**Bàn giao cho thành viên Backend/FE:** `Model manifest`, `class_to_idx`, `preprocessing`, Python interface, API schema, ví dụ JSON response thực, một bộ ảnh demo hợp lệ, thời gian inference ước lượng **được đo thật** và giới hạn phần cứng.

**Không để Codex tự suy diễn rằng đã train:** Hãy yêu cầu xuất status theo định dạng:

```text
Implemented:
- ...
Tests executed:
- ...
Kaggle notebook run status:
- NOT_RUN / RAN_SUCCESSFULLY / FAILED + link/log evidence
Model artifact status:
- NOT_GENERATED / EXPORTED + checksum
Measured metrics:
- ... / NOT_MEASURED
Known limitations:
- ...
Next action for team member:
- ...
```

---

## 12. PROMPT DÁN VÀO CODEX (KÈM FILE NÀY)

> Read `H2T_MirageHunter_AI_Codex_Kaggle_Spec.md` completely, then read `AGENTS.md` and the approved Kiro specs in `.kiro/specs/miragehunter/`. Implement only the AI/ML tasks in the specification, starting with the Kaggle MobileNetV3-Small fine-tuning notebook and ONNX export, followed by the deterministic transformation/oracle engine and four hunter strategies (Random, TPE-only, LinUCB-only, Hybrid LinUCB+TPE). Use Kaggle for all model training and heavy benchmarks, while keeping the deployed CPU inference minimal (ONNX Runtime). Provide runnable notebooks, tests, configs, metadata, model/data provenance, and clear reproduction instructions. Do not fabricate trained checkpoints, Kaggle run logs, results, or claim superiority without measured benchmarks. Do not modify frontend or approved Kiro files unless asked. Before changing APIs, inspect the existing backend contracts. Implement tasks incrementally with tests. Finally report changed files, test results, notebook execution status, artifacts generated, blockers, and next steps.

---

## 13. NGUỒN THAM KHẢO CẦN GIỮ TRONG BÁO CÁO

### Phương pháp nghiên cứu

1. Spieker, H. & Gotlieb, A. (2020), *Adaptive Metamorphic Testing with Contextual Bandits*. https://www.sciencedirect.com/science/article/pii/S0164121220300558
2. Xie, X. et al. (2019), *DeepHunter: A Coverage-Guided Fuzz Testing Framework for Deep Neural Networks*. https://doi.org/10.1145/3293882.3330579
3. Hendrycks, D. & Dietterich, T. (2019), *Benchmarking Neural Network Robustness to Common Corruptions and Perturbations*. https://arxiv.org/abs/1903.12261
4. Bergstra, J. et al. (2011), *Algorithms for Hyper-Parameter Optimization*. https://papers.nips.cc/paper/4443-algorithms-for-hyper-parameter-optimization
5. Li, L. et al. (2010), *A Contextual-Bandit Approach to Personalized News Article Recommendation* (LinUCB). https://arxiv.org/abs/1003.0146

### Tài liệu kỹ thuật

- Kaggle Notebooks: https://www.kaggle.com/docs/notebooks
- Kaggle GPU tips: https://www.kaggle.com/page/GPU-tips-and-tricks
- Imagenette: https://github.com/fastai/imagenette
- Optuna TPESampler: https://optuna.readthedocs.io/en/stable/reference/samplers/generated/optuna.samplers.TPESampler.html
- PyTorch torchvision models: https://pytorch.org/vision/stable/models.html
- ONNX Runtime Python: https://onnxruntime.ai/docs/get-started/with-python.html
- Kiroween rules: https://kiroween.devpost.com/rules

**Ghi chú bản quyền và thể lệ:** Tài liệu hướng dẫn nghiên cứu/thiết kế. Dữ liệu, code và checkpoints sử dụng phải có quyền phù hợp. Mô hình cũ của nhóm hoặc nguồn bên ngoài phải được khai báo theo yêu cầu *New Projects Only* trong cuộc thi.
