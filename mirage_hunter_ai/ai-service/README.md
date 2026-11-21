# MirageHunter AI service — phần AI

Code AI được chuyển từ workspace H2T-MirageHunter vào đúng cấu trúc monorepo.
FE ở `../frontend`, Java BE ở `../backend-service`; hai phần đó không thay đổi.

## Kiro trong quá trình phát triển AI

Ngày 16/11/2026, nhóm dùng Kiro IDE để viết đặc tả AI từ code hiện có, review
pipeline kiểm thử và bổ sung **53 ca kiểm thử biên** thuộc 25 nhóm. Sau review,
Codex sửa các điểm cần xử lý và chạy lại bộ test.

- [Nhật ký Kiro phần AI](../docs/ai/kiro-development-log.md) ghi lại từ lúc giao
  việc đến lúc kiểm tra lại, kèm đường dẫn tới từng file.
- [Bản review của Kiro](../docs/ai/kiro-review.md) và
  [bộ kiểm thử do Kiro viết](tests/test_kiro_edge_cases.py) cho thấy đóng góp
  trực tiếp vào phần Hunter, Oracle, ONNX và replay.

## Những gì có thể dùng

- MobileNetV3-Small/Imagenette demo đã train trên Kaggle, ONNX CPU; adapter ONNX
  classification cấu hình được cho model local đã được người vận hành duyệt.
- Dataset ảnh + labels.csv; baseline Accuracy/Precision/Recall/F1, confusion matrix.
- Random/TPE-only/LinUCB-only/Hybrid; evidence, minimization, fingerprint và replay.
- Pipeline AI đồng bộ có phase progress/cancel để thành viên phụ trách tích hợp.
- Health endpoint có sẵn giữ nguyên. Chưa thêm inference HTTP endpoint, queue,
  quản lý job hay giao diện. Browser tiếp tục gọi Spring Boot, không gọi AI trực tiếp.

## Cấu trúc

```text
app/models/          ONNX adapters + classifier/HuntConfig contracts
app/transforms/      brightness, blur, noise, JPEG
app/hunter/          search policies + budgeted runner
app/evaluation/      dataset, baseline, validity, oracle, evidence
app/minimization/    giảm cường độ case lỗi
app/pipelines/       classification workflow + replay CLI
app/api/, app/core/  scaffold health/settings sẵn có
tests/               AI tests + health test sẵn có
tools/               schemas, Kaggle bundle, CPU smoke tools
../experiments/      Kaggle scripts/configs/notebooks
../docs/ai/          contract, measured results, Kiro evidence
```

## Cài đặt và kiểm tra — chạy từ ai-service

```powershell
py -3.11 -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[custom,dev]"
.venv\Scripts\python.exe tools/build_kaggle_bundle.py
.venv\Scripts\python.exe -m pytest
.venv\Scripts\ruff.exe check app tests tools ../experiments
.venv\Scripts\python.exe tools/export_schemas.py
```

Python 3.11 là target của scaffold; package hỗ trợ 3.11–3.13. Train, export và
benchmark nặng chỉ chạy trên Kaggle. Notebook local chưa có outputs và phải giữ
NOT_RUN cho source mới; các kết quả Kaggle cũ có hash riêng trong docs/ai.

## Gọi phần AI

```python
from app.pipelines.classification import run_classification

report = run_classification(
    artifacts="path/to/operator-reviewed-model",
    dataset="path/to/labelled-dataset",
    output="path/to/new-output-directory",
    trusted_local=True,
    dataset_id="registered-dataset-id",
    strategy="hybrid", queries=20, seed=42,
    progress=lambda event: print(event),
    cancelled=lambda: False,
)
```

`trusted_local` do người vận hành quyết định, không nhận từ browser. Thư viện
không phải sandbox. Pipeline local giới hạn 0–30 search queries. Baseline clean
và hunt baseline là hai passes riêng, được tính đủ trong tổng inference.

```powershell
.venv\Scripts\python.exe -m app.pipelines.classification --artifacts artifacts/deployment-370485049 --dataset artifacts/classification-smoke-data --output artifacts/my-new-run --queries 3
.venv\Scripts\python.exe -m app.pipelines.replay --case artifacts/my-new-run/hunt/trial-000000 --artifacts artifacts/deployment-370485049
```

Các artifacts trên chỉ có ở máy phát triển đã tải/kiểm chứng; clone Git không kèm
model weights hoặc dataset. Định dạng model/dataset: [contract](../docs/ai/custom-classification.md).
Kết quả tự động là candidate; confirmed failure cần ground truth, baseline đúng
và review bảo toàn ngữ nghĩa. Không coi confidence drop là lỗi đã xác nhận.

## Bàn giao

- [Lưu ý chuyển cấu trúc và trạng thái](../docs/ai/monorepo-import.md)
- [Contract tích hợp AI](../docs/ai/backend-contract.md)
- [Kaggle instructions](../experiments/README.md)
- [Kiro evidence](../docs/ai/kiro-usage.md): Kiro đóng góp thật ở workspace gốc;
  không có lần Kiro execution mới được tuyên bố cho việc chuyển repo.
