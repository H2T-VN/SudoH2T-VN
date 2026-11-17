# FE/BE cần tích hợp gì với phần AI?

Ngày bàn giao: 17/11/2026. Đây là **contract đề xuất để FE/BE triển khai**; repository
này chưa có HTTP server hay giao diện. Phần AI đã có hàm chạy, callback và dữ liệu
thật để hai bên nối vào. Không cần chờ train thêm model để tích hợp chế độ demo.

## 1. Luồng MVP nên nối trước

```text
FE chọn model/dataset đã duyệt → BE tạo job → worker gọi thư viện AI
                                               ↓
FE xem baseline/progress/kết quả ← API đọc trạng thái và artifacts
```

Ưu tiên nối **Try Demo Model** trước với bundle MobileNet đã có. Sau đó mở **Test
Your Own Model** cho ONNX/dataset do người vận hành duyệt và đăng ký trước. Upload
model công khai là bước riêng sau khi BE có worker isolation và resource limits.
MVP không nhận `.pt/.pth/.pkl` hoặc tự train model người dùng.

## 2. Backend owner — việc cần làm

| Việc | Đầu vào / đầu ra cụ thể |
|---|---|
| Model registry | `model_id` → đường dẫn bundle nội bộ, tên hiển thị, task, class order, hash, approval status. Bundle demo đã có trong `artifacts/deployment-370485049`; format mới xem `custom-classification.md`. |
| Dataset registry | `dataset_id` → thư mục `images/` + `labels.csv`, quyền truy cập, số ảnh và model/class mapping tương thích. Có thể đăng ký dữ liệu demo trước, chưa cần public upload. |
| Tạo job | Kiểm tra owner/quyền, model/dataset đã duyệt, request đúng schema; lưu job ID rồi đưa vào queue. FE chỉ gửi ID, không gửi đường dẫn local hay `trusted_local=true`. |
| AI worker | Gọi `run_classification`, ghi callback progress vào job, đọc cờ cancel từ job. Mỗi lần chạy dùng thư mục attempt mới. Inference chạy trong worker, ngoài async HTTP event loop. |
| Trạng thái/lỗi | Lưu job queued/running/completed/cancelled/failed; phân biệt kết quả `no_eligible_sources`. Bắt lỗi validation/inference, trả lỗi dễ hiểu cho FE; không công khai stack trace/đường dẫn nội bộ. |
| Kết quả | Đọc `report.json`, `baseline.json`, `hunt/result.json`; paginate trials/cases thay vì gửi toàn bộ log qua mỗi lần polling. |
| Artifact/download | Chuyển relative artifact path thành asset ID/URL có kiểm tra quyền. Chỉ phục vụ file nằm trong attempt tương ứng; xuất report, CSV, ảnh và regression test. Không nhận path tùy ý từ client. |
| Hủy/timeout | Cancel hợp tác giữa các inference. Timeout cứng hoặc ONNX bị treo cần worker process do BE quản lý; callback không ngắt native inference đang chạy. |

Gợi ý routes cho MVP (BE chốt tên và triển khai, **chưa tồn tại trong repo này**):

| Route | Mục đích |
|---|---|
| `GET /api/models` | Danh sách model người dùng được phép chọn, trạng thái approved/unsupported/pending. |
| `GET /api/datasets?model_id=...` | Dataset được phép chọn và mapping tương thích. |
| `POST /api/hunts` | Tạo job baseline + hunt, trả `202` với `job_id`; không chờ inference trong request. |
| `GET /api/hunts/{job_id}` | Job state, phase, phase counters, cancel_requested, lỗi nếu có. |
| `POST /api/hunts/{job_id}/cancel` | Ghi yêu cầu hủy; chưa tự coi là đã hủy cho đến khi worker xác nhận. |
| `GET /api/hunts/{job_id}/results` | Baseline + summary sau khi có kết quả; trạng thái chưa sẵn sàng phải rõ ràng. |
| `GET /api/hunts/{job_id}/trials?offset=0&limit=20` | Trials có phân trang, filter theo action/failure status. |
| `GET /api/hunts/{job_id}/assets/{asset_id}` | Ảnh/report/CSV/test export do server ánh xạ và kiểm tra quyền. |

Upload/đăng ký model và dataset từ browser cần routes riêng do BE sở hữu. AI loader
không giải nén ZIP. Nếu nhận ZIP, BE phải giải nén trong staging riêng, giới hạn
dung lượng/kích thước/số file và chặn traversal/symlink trước khi gọi AI loader.

Request MVP đề xuất:

```json
{
  "model_id": "mobilenetv3-imagenette-v1",
  "dataset_id": "imagenette-reviewed-subset",
  "strategy": "hybrid",
  "max_queries": 20,
  "seed": 42
}
```

ID trên minh họa registry; backend phải đăng ký ID thực của bundle/dataset. Schema:
[classification-job-request.schema.json](integration/classification-job-request.schema.json).
Với wrapper local hiện tại, query budget 0–30. Worker nhận `strategy` là một trong
`random`, `tpe_only`, `linucb_only`, `hybrid`. Wrapper dùng đủ bốn phép biến đổi và
minimization=0; FE chưa bật tùy chỉnh transforms/minimization ở luồng này. Backend
muốn dùng những cấu hình đó cần nối trực tiếp `HuntConfig` + `run_hunt`, thống nhất
contract và kiểm thử trước. Không nhận nguyên `HuntConfig` từ browser: schema nội bộ
có giới hạn ngân sách cao hơn wrapper MVP.

Mẫu worker: [worker_example.py](integration/worker_example.py). Đây là ví dụ gọi
thư viện, không phải queue/API đã triển khai. Backend cung cấp registry, job store,
retry policy và callback. Đồng bộ trạng thái cancel khi kết thúc job để tránh ghi
đè yêu cầu hủy bằng trạng thái completed.

## 3. Frontend owner — màn hình và dữ liệu cần dùng

| Màn hình/thành phần | Dữ liệu và hành vi |
|---|---|
| Chọn model/dataset | Hai chế độ Demo / Own Model đã duyệt; chọn từ registry. Hiển thị task, lớp, preprocessing và trạng thái tương thích; không quảng cáo nhận mọi model ML/DL. |
| Start AI Hunt | Strategy, budget 0–30, seed; gửi request tạo job. Khóa submit khi đang gửi, xử lý validation và lưu `job_id` để mở lại. |
| Job progress | Poll status, gợi ý 1–2 giây/lần khi đang chạy; hiển thị phase và completed/total theo phase. Có Cancel, trạng thái đang yêu cầu hủy và lỗi/retry. Dừng polling khi terminal. |
| Baseline dashboard | Accuracy, macro Precision/Recall/F1, confusion matrix, per-class support/metrics và các ảnh sai sẵn. Trục confusion matrix: hàng = ground truth, cột = prediction. |
| Hunt summary | Số candidate, confirmed, invalid, error; actual/baseline/minimization queries, tổng inference và số nguồn đủ điều kiện. Không đổi nhãn candidate thành confirmed. |
| Failure Explorer | Ảnh gốc/biến đổi, ground truth, prediction/confidence trước/sau, phép biến đổi, mức độ, validity và failure status. Ảnh lấy qua asset URL của BE. |
| Export | Tải report JSON, trial CSV, evidence và pytest qua endpoint download. Replay online chỉ bật khi BE có worker replay; file export hiện dùng được qua Python CLI. |

Metrics là số 0–1: FE format thành phần trăm, không nhân thêm ở API. `null` là
chưa xác định, hiển thị “Chưa đủ dữ liệu”, không đổi thành 0%. Class index phải tra
theo `class_names`, không tự sort tên lớp. Macro metric bao gồm mọi lớp khai báo,
kể cả lớp không có ảnh; vì vậy smoke 3 ảnh không phải benchmark trên 10 lớp.

Trong MVP một job tự chạy baseline rồi hunt. FE có thể hiển thị baseline sau khi
BE đọc được `baseline.json`. Nếu cần người dùng duyệt baseline rồi mới bấm hunt,
BE tách thành hai job qua `evaluate_baseline` và `run_hunt`; wrapper hiện tại không
có điểm pause/chờ FE xác nhận.

## 4. Map progress và kết quả đúng cách

Callback AI thật có dạng:

```json
{"phase": "baseline", "completed": 1, "total": 3, "unit": "images"}
```

| Phase | Ý nghĩa |
|---|---|
| `preparing` | Nạp model, dataset; đếm steps. |
| `baseline` | Đánh giá clean metrics; đếm ảnh. |
| `hunt_baseline` | Clean pass riêng của Hunter để chọn nguồn đủ điều kiện; đếm ảnh/inference attempts. |
| `hunting` | Search queries đã dùng / ngân sách; có tính cả inference lỗi. |
| `finished` | Đã ghi report; **không tự đồng nghĩa job completed**, cần đọc `report.status`. |

Counters reset khi đổi phase; không dùng một phần trăm chung cho toàn bộ job.
`total_target_inferences` trong report gồm clean evaluation + hunt baseline +
search + minimization. Ví dụ 3 ảnh, 3 search queries: 3 + 3 + 3 = 9. Replay sau đó
tốn thêm inference, không nằm trong workflow total này.

- Hủy khi preparing/baseline: bắt `EvaluationCancelled`, lấy `phase` và
  `inference_queries`. Không có baseline metrics hoàn chỉnh hoặc final report;
  job phải là cancelled, không render partial metrics thành báo cáo hoàn tất.
- Hủy khi hunt: thư viện trả report `status=cancelled`, baseline đã hoàn thành và
  hunt counters là số thực đã dùng; UI có thể hiển thị kết quả một phần có nhãn rõ.
- `no_eligible_sources`: xem baseline incorrect và baseline errors; thông báo hunt
  không có nguồn phù hợp, không báo đạt robustness 100%.
- Lỗi inference/log/validation phải hiển thị là lỗi chạy thử, không coi là lỗi dự
  đoán đã xác nhận của model. Browser review cũng không được tự gửi `verified=true`
  để nâng candidate thành confirmed; cần quy trình review đáng tin cậy ràng buộc
  hash model/ảnh/transform như `evaluation.md`.

## 5. Dữ liệu thật để hai bên phát triển

[local-smoke-response.json](integration/local-smoke-response.json) là response
thư viện đã chạy thật với ONNX MobileNet, 3 ảnh, 3 query, 15 progress events và
3 replay thành công. [local-smoke-trial.json](integration/local-smoke-trial.json)
chứa một trial thật cho mapping chi tiết. Các file này **không phải HTTP response
đã được xác minh**, không phải kết quả model thứ hai hoặc accuracy benchmark.
`artifact_path` trong trial là nội bộ; BE phải ánh xạ thành asset URL, FE không
truy cập filesystem của worker. Không dựng URL giả rồi coi là tích hợp thành công.

## 6. Điều kiện nghiệm thu chung

1. Demo job đi từ FE → API → worker AI thật; baseline, hunt result và ảnh đọc được.
2. Model/dataset không được phép hoặc không tương thích bị từ chối có thông báo.
3. Progress đổi phase đúng; số inference khớp report; baseline sai sẵn được tách riêng.
4. Cancel trước khi chạy, trong baseline và trong hunt đều tới trạng thái đúng;
   không đánh dấu complete khi bị hủy hoặc không có nguồn đủ điều kiện.
5. Mở lại job theo ID sau reload; worker chết/retry dùng attempt mới, không ghi
   đè hoặc trộn kết quả attempt cũ. Download không đọc được file ngoài job.
6. Một case export replay được với đúng model hash. Candidate vẫn là candidate
   cho đến khi review bảo toàn ngữ nghĩa được xác minh.

Hiện mới xác minh thư viện AI local, **166 tests pass, Ruff sạch**. HTTP, queue,
storage, upload public và FE flow đều chưa được chạy nghiệm thu. Kiro review phần
mở rộng và kiểm chứng thêm một kiến trúc model trên Kaggle vẫn còn pending.
