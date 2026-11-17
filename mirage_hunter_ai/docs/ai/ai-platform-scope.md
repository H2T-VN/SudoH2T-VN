# Tiến độ phần AI theo hướng nền tảng kiểm thử

Đối chiếu với README người dùng cung cấp ngày 17/11/2026, lưu nguyên bản tại
[references/product-readme-supplied.md](references/product-readme-supplied.md).
Roadmap trong README là mục tiêu, không phải bằng chứng chức năng đã hoàn thành.

## Phần đã có trước khi mở rộng

| Hạng mục | Đã thực hiện |
|---|---|
| Demo Target Model | MobileNetV3-Small, Imagenette 10 lớp; train Kaggle 8 epochs. Test accuracy 96,80% trên 500 ảnh. |
| Export | ONNX CPU; parity top-1 100% trên 32 ảnh dev; đã tải và kiểm tra hash. |
| AI Hunter | Random, conditional TPE, contextual LinUCB và Hybrid LinUCB + TPE theo family; brightness/blur/noise/JPEG. |
| Benchmark | 12 runs trên Kaggle, 2.400 search queries; 75 candidate records, chưa có confirmed failure sau review. |
| Reproducibility | Lưu ảnh/metadata/fingerprint, replay, minimization và xuất pytest. |
| Kiro | Specs, steering, review và bộ 53 edge cases đã có bằng chứng thực tế. |

Phần này phù hợp chế độ **Try Demo Model** và lõi Hunter. Trước lần sửa hiện tại,
adapter triển khai bị giới hạn theo contract MobileNet/Imagenette, chưa đủ cho
**Test Your Own Model**.

## Đã sửa trong lần này — Codex triển khai

1. Thêm adapter ONNX classification cấu hình metadata, input size/layout/color,
   normalization, logits/probabilities và thứ tự lớp; giữ adapter demo cũ.
2. Thêm dataset ảnh có `labels.csv`, kiểm tra đường dẫn/nhãn/giới hạn và ghi hash.
3. Thêm baseline Accuracy, macro Precision/Recall/F1, confusion matrix, metrics
   từng lớp và dự đoán từng ảnh, tách lỗi có sẵn khỏi lỗi do phép biến đổi.
4. Nối thành workflow thư viện/CLI: load → baseline → hunt → report; mở rộng replay
   và regression test cho contract mới. Xuất schema manifest cho backend owner.
5. Cập nhật README, contract và phạm vi bàn giao; giữ tài liệu đầu vào nguyên bản.

Kiểm tra: **166 tests passed; Ruff sạch**. ONNX MobileNet đã train thật chạy được
qua adapter mới trên 3 ảnh và replay thành công. Không coi smoke test này là đo
accuracy, training mới hay kiểm chứng nhiều kiến trúc. Chi tiết ở
[platform-local-validation.json](platform-local-validation.json) và
[custom-classification.md](custom-classification.md).

Đã bổ sung progress theo pha preparing/baseline/hunt_baseline/hunting/finished và
hủy hợp tác. Hủy clean baseline không xuất metrics chưa hoàn chỉnh; hủy hunt giữ
kết quả một phần với status cancelled. Smoke ONNX thật: 15 progress events,
3 replay thành công; mẫu response ở `integration/local-smoke-response.json`.
Hướng dẫn FE/BE cụ thể: [fe-be-integration.md](fe-be-integration.md).

## Việc tiếp theo theo vai trò

| Người phụ trách | Việc còn lại |
|---|---|
| AI — bạn | Kiểm chứng một kiến trúc classifier khác trên Kaggle; kiểm tra native/ONNX và metadata; chạy so sánh Hunter với source mới khi cần; review candidate về ngữ nghĩa. |
| AI + Kiro | Review và bổ sung edge cases cho adapter/dataset/baseline mới; request đã chuẩn bị, chưa có lần thực thi Kiro mới. |
| Backend owner | Registry/allowlist, upload và validation có kiểm soát, worker isolation và giới hạn tài nguyên, queue/job/cancel, API/storage/export. |
| Frontend owner | Demo/Own Model, input model/dataset, Start AI Hunt, metrics, Failure Explorer, report download. |

Chưa hỗ trợ upload public hoặc mọi loại ONNX. Cờ trusted-local phải do người vận
hành quyết định sau review. HTTP/frontend vẫn **NOT_INTEGRATED**. Human semantic
review còn pending; confirmed failures vẫn 0. Object Detection/YOLO và IoU/mAP chưa
triển khai. Không tự train lại model người dùng.

Kết quả Kaggle cũ thuộc source được ghi trong `kaggle-run-status.json`; notebook
đã rebuild ở local với code mới nhưng **NOT_RUN_FOR_THIS_SOURCE_VERSION**. Không
cần bỏ công việc đã làm: MobileNet tiếp tục là demo và bộ kiểm thử tương thích.
