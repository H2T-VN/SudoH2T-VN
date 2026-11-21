# Nhật ký phát triển phần AI với Kiro

Ngày **16/11/2026**, nhóm dùng **Kiro IDE 1.4.178** để review thư viện kiểm thử
model phân loại ảnh của MirageHunter và bổ sung các ca kiểm thử còn thiếu.
Phiên Kiro được ghi nhận với mã `sess_9601b0e5-d68f-42df-b4b8-a9fc40f7d93a`.
Code AI và notebook Kaggle ban đầu do Codex triển khai.
[Bằng chứng phiên làm việc](kiro-usage.md)

| Bước | Việc đã làm | Bằng chứng |
|---|---|---|
| 1. Giao việc | Nhóm yêu cầu Kiro đọc code AI hiện có, viết đặc tả theo phần đã triển khai, tìm rủi ro và bổ sung test biên. | [Prompt đã gửi cho Kiro](kiro-task-prompt.md) |
| 2. Viết đặc tả | Kiro tạo yêu cầu, thiết kế, danh sách công việc và các quy tắc cho phần AI. | [Yêu cầu](../../.kiro/specs/miragehunter-ai/requirements.md) · [Thiết kế](../../.kiro/specs/miragehunter-ai/design.md) · [Công việc](../../.kiro/specs/miragehunter-ai/tasks.md) · [Quy tắc AI](../../.kiro/steering/ai-standards.md) |
| 3. Review code | Kiro đọc các module Hunter, phép biến đổi ảnh, Oracle, ONNX và replay. Review nêu các điểm cần kiểm tra, gồm cách phân biệt lỗi nghi vấn với lỗi đã xác nhận và dung sai khi tái lập dự đoán. | [Review của Kiro](kiro-review.md) |
| 4. Viết test biên | Kiro bổ sung **53 ca kiểm thử thuộc 25 nhóm**. Các ca bao gồm việc LinUCB/TPE xử lý lượt thử đang chờ, Oracle phân loại ảnh đã sai từ đầu và replay từ chối model có hash khác. | [File test](../../ai-service/tests/test_kiro_edge_cases.py) |
| 5. Sửa và chạy test | Codex kiểm tra các phát hiện, sửa thông báo lỗi cho hai kiểm thử về lượt thử đang chờ, bổ sung kiểm tra báo cáo parity và làm rõ dung sai replay. Codex chạy bộ test tổng hợp sau đợt review, ghi nhận **102 ca đạt** và Ruff sạch ở thời điểm đó. | [Các thay đổi sau review](kiro-followup.md) · [Kết quả theo từng giai đoạn](kiro-usage.md) |

Sau khi chuyển thư viện AI vào monorepo, Codex chạy lại **167 ca kiểm thử** và
một lượt kiểm tra với ONNX MobileNetV3-Small thật. Báo cáo ghi nhận ba lượt
replay thành công. Các file Kiro từ phiên 16/11 được đưa vào monorepo cùng
phần AI. [Kết quả kiểm tra monorepo](monorepo-validation.json)

Các file đặc tả Kiro mô tả trạng thái tại thời điểm review. Kết quả train,
export ONNX và benchmark thực tế được cập nhật riêng theo từng phiên bản
notebook Kaggle. [Kết quả Kaggle](kaggle-run-status.json)

Yêu cầu Kiro review phần mở rộng nhận model ONNX riêng đã được chuẩn bị và
đang chờ thực hiện. Kiro Hooks đang ở trạng thái `NOT_RUN`.
[Yêu cầu review tiếp theo](kiro-platform-review-request.md) · [Phạm vi sử dụng Kiro](kiro-usage.md)
