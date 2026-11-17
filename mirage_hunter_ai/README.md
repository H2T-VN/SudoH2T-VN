# H2T-MirageHunter

H2T-MirageHunter là scaffold cho nền tảng kiểm tra độ bền của model phân loại ảnh. Luồng mục tiêu là tải ảnh và nhãn đúng, chọn tối đa ba model tương thích, áp dụng biến đổi có kiểm soát, so sánh dự đoán trên ảnh gốc/ảnh biến đổi và lưu case lỗi có thể tái lập.

Phiên bản hiện tại tập trung vào kết nối service và hợp đồng API: frontend React/Vite, backend Spring Boot, AI service FastAPI và MySQL. Phần AI đã được bổ sung tại `ai-service/app`: ONNX inference, baseline, Hunter và minimization; xem [AI README](ai-service/README.md) và [ghi chú chuyển repo](docs/ai/monorepo-import.md). Các endpoint inference/experiment, upload và kết nối FE/BE tới pipeline AI chưa được tích hợp.

## Điều kiện môi trường

- Docker Desktop với `docker compose` (khuyến nghị cho toàn bộ stack).
- Chạy frontend local: Node.js 20+ và npm.
- Chạy backend local: JDK 21 và Maven Wrapper.
- Chạy AI local: Python 3.11.
- MySQL 8.4 nếu chạy database ngoài Compose.

Các phiên bản dependency cụ thể nằm trong `frontend/package.json`/`package-lock.json`, `backend-service/pom.xml` và `ai-service/pyproject.toml`.

## Chạy bằng Docker Compose

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up --build
```

Linux/macOS:

```bash
cp .env.example .env
docker compose config
docker compose up --build
```

Truy cập:

- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/health
- Backend kiểm tra AI: http://localhost:8080/api/health/ai
- AI service: http://localhost:8000/health
- MySQL: `localhost:3306` mặc định, có thể đổi bằng `MYSQL_PORT`.

Compose truyền biến môi trường trực tiếp vào container. Vite nhúng `VITE_API_BASE_URL=/api` trong lúc build; trình duyệt không gọi hostname container. Nginx phục vụ SPA và proxy `/api` sang backend.

## Chạy từng service local

### Windows PowerShell

```powershell
docker compose up -d mysql

Set-Location ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

Mở PowerShell khác để chạy backend (cần JDK 21):

```powershell
Set-Location backend-service
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:3306/miragehunter?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:SPRING_DATASOURCE_USERNAME = "miragehunter"
$env:SPRING_DATASOURCE_PASSWORD = "change-me-local"
$env:AI_SERVICE_BASE_URL = "http://localhost:8000"
.\mvnw.cmd spring-boot:run
```

Mở PowerShell thứ ba để chạy frontend:

```powershell
Set-Location frontend
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

### Linux/macOS

```bash
docker compose up -d mysql
cd ai-service
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload --port 8000
```

Ở terminal khác:

```bash
cd backend-service
export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3306/miragehunter?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
export SPRING_DATASOURCE_USERNAME=miragehunter
export SPRING_DATASOURCE_PASSWORD=change-me-local
export AI_SERVICE_BASE_URL=http://localhost:8000
./mvnw spring-boot:run
```

Ở terminal thứ ba:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Spring Boot không tự đọc file `.env`; khi chạy local hãy export biến môi trường như trên hoặc cấu hình trong IDE. Vite chỉ đọc biến `VITE_*` trong thư mục frontend tại thời điểm chạy/build.

## Kiểm tra và dừng

```bash
docker compose ps
curl http://localhost:8080/api/health
curl http://localhost:8080/api/health/ai
curl http://localhost:8000/health
```

`docker compose down` dừng và xóa container nhưng giữ named volume MySQL. `docker compose down -v` xóa cả volume và dữ liệu MySQL; chỉ dùng khi thực sự muốn reset database.

Kiểm tra frontend:

```bash
cd frontend
npm install
npm run typecheck
npm run lint
npm run build
```

Kiểm tra backend và AI được ghi trong `AGENTS.md`; các lệnh này cần JDK 21 và Python 3.11 tương ứng.

## Đã làm và chưa làm

Đã làm:

- React/Vite routes `/`, `/experiments/new`, `/models`, `/results`, `/minimization`.
- Axios client có base URL, timeout và xử lý lỗi; frontend chỉ gọi backend.
- Spring Boot health endpoints, CORS cấu hình được, AI client timeout và lỗi 503.
- Flyway migration `experiments`, entity và repository tương ứng.
- FastAPI `/health`, Pydantic Settings, logging và smoke test.
- Dockerfiles, healthchecks, depends_on theo health, Nginx SPA fallback/API proxy.

Chưa làm:

- CRUD experiment, upload ảnh/model/dataset và label mapping.
- Inference/model adapter, biến đổi ảnh, Random/TPE/LinUCB/Hybrid.
- Evaluator, minimization, job queue, lịch sử và kết quả AI.
- Authentication, benchmark, accuracy hoặc nguồn dataset/license đã xác nhận.

Chi tiết hợp đồng nằm tại [`docs/api-contract.md`](docs/api-contract.md), nguyên tắc đánh giá tại [`docs/evaluation.md`](docs/evaluation.md), và phạm vi Kiro tại [`.kiro/specs/miragehunter/`](.kiro/specs/miragehunter/).
