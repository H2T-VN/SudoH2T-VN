# Chuyển phần AI vào monorepo — 17/11/2026

Đã tạo nhánh local **AI** từ **main**, commit gốc
`ac5acc52daee47e153c9de48354b1907a9ea6568`. Chưa commit/push. Remote origin/AI đã
tồn tại từ trước; lần chuyển này không sửa nhánh remote đó hoặc main.

## Cấu trúc và phạm vi

| Workspace AI cũ | Vị trí mới, tính từ mirage_hunter_ai |
|---|---|
| backend/app/models, transforms, hunter, evaluation | ai-service/app/{models,transforms,hunter,evaluation} |
| backend/app/hunter/minimizer.py | ai-service/app/minimization/minimizer.py |
| backend/app/classification.py | ai-service/app/pipelines/classification.py |
| backend/app/replay.py | ai-service/app/pipelines/replay.py |
| backend/tests | ai-service/tests |
| tools | ai-service/tools |
| experiments | experiments |
| docs | docs/ai |
| .kiro/specs/miragehunter-ai và ai-standards.md | giữ namespace riêng trong .kiro, không ghi đè specs scaffold |

Giữ nguyên FE, Java backend, Docker Compose, root product README, settings và
health endpoint có sẵn. Không thêm FE/API inference/job queue/worker service mới.
README scaffold chỉ được sửa đúng trạng thái phần AI; các file shared docs gốc
và .kiro/specs/miragehunter của nhóm được giữ nguyên.

## Phần AI hiện có

ONNX CPU classifier, configurable classification metadata, labelled CSV loader,
baseline metrics, Random/TPE/LinUCB/Hybrid Hunter, quality validity + oracle,
minimization, evidence/fingerprint, replay, regression export và phase progress/
cooperative cancellation. Xem [AI README](../../ai-service/README.md) để gọi code.
Service HTTP vẫn chỉ có health; thành viên BE tích hợp AI theo contract và cấu
trúc Spring Boot → ai-service sẵn có. Trình duyệt không gọi AI service trực tiếp.

## Đã xác minh tại repo mới

- **167 tests pass**: 166 AI tests được chuyển + 1 health test có sẵn.
- Ruff: `ruff check app tests tools ../experiments` sạch.
- Import path đã kiểm tra trỏ tới `ai-service/app/pipelines/classification.py`
  trong repo này; không chạy nhầm code AI ở workspace cũ.
- ONNX MobileNet thật: 3 ảnh có nhãn, 3 search queries, 9 workflow inferences,
  15 progress events và 3 replay thành công. Đây là smoke tương thích, không phải
  accuracy benchmark hoặc một model thứ hai đã train. Replay tốn inference riêng.
- Kaggle bundle/schema/notebooks được rebuild theo ai-service layout. Notebook
  không có outputs; source mới vẫn NOT_RUN. Các run và metric Kaggle cũ giữ hash
  lịch sử riêng, không gán cho lần chuyển repo này.

Chi tiết: [monorepo-validation.json](monorepo-validation.json),
[test-results-monorepo.xml](test-results-monorepo.xml),
[response smoke thật](integration/monorepo-smoke-response.json).

## Giới hạn môi trường và provenance

Target của scaffold là Python 3.11, package hỗ trợ 3.11–3.13. Trên máy hiện tại,
Windows Application Control chặn Python 3.11 vừa tải và một số DLL trong virtualenv
mới. Tests/smoke đã chạy bằng môi trường AI Python 3.12.14 được phép trước đó, với
PYTHONPATH trỏ vào repo mới. Không tắt hay vượt chính sách máy. Chưa xác minh chạy
bằng Python 3.11 hoặc toàn Docker stack tại lần chuyển này.

Model weights và ảnh chỉ được copy vào `ai-service/artifacts/` để kiểm tra local,
đã được gitignore; clone Git không có các file đó. Không copy môi trường, secrets
hay dữ liệu upload vào phần source. Bản spec đầu vào giữ nguyên byte tại
`references/original-ai-spec.md`; các README đầu vào trong references cũng giữ nguyên.

Kiro specs/steering/review/tests là bằng chứng từ workspace cũ. Codex thực hiện
việc chuyển cấu trúc và cập nhật import path; không có Kiro execution mới được
tuyên bố. Những log, test-results.xml và tài liệu bàn giao cũ trong docs/ai là
record lịch sử; ưu tiên file monorepo-* cho lần kiểm tra ở repo mới.
