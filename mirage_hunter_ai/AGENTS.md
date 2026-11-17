# H2T-MirageHunter agent guide

## Stack

- `frontend/`: React 18 + TypeScript + Vite, React Router and Axios.
- `backend-service/`: Java 21 + Spring Boot 3.4.5 + Maven, Web, Validation, JPA, Actuator and Flyway.
- `ai-service/`: Python 3.11 target, FastAPI, Uvicorn and Pydantic Settings.
- `mysql`: MySQL 8.4 in Docker Compose.

## Repository layout

This is a monorepo. Frontend UI code belongs in `frontend/src/`, backend code in
`backend-service/src/`, and AI code in `ai-service/app/`. Runtime data, uploaded
images and model weights must not be committed.

## Build and check commands

```powershell
# Docker stack
Copy-Item .env.example .env
docker compose up --build

# Frontend
Set-Location frontend
npm.cmd install
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build

# Backend (requires Java 21)
Set-Location backend-service
.\mvnw.cmd test
.\mvnw.cmd package

# AI (requires Python 3.11)
Set-Location ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m pytest
```

Linux/macOS equivalents use `./mvnw` and `python3.11 -m venv .venv`.

## Rules

- Do not invent AI inference, accuracy, benchmark, or model results.
- Do not call the AI service or MySQL directly from the browser; use the backend API.
- Keep `.kiro/` and dependency lockfiles tracked.
- Do not add a license until the project owners choose one.
- Treat existing user changes as protected; inspect before editing overlapping files.
