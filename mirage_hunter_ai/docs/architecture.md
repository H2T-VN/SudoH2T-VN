# Architecture

```text
Browser
  |
  | /api (Vite proxy locally, Nginx in Docker)
  v
backend-service (Spring Boot :8080) -----> ai-service (FastAPI :8000)
  |
  +----> MySQL 8.4 (:3306, Flyway)
```

The browser never receives a container hostname and never talks directly to AI or MySQL. The backend is the boundary for persistence, orchestration and dependency errors. The current AI boundary is intentionally limited to health.

The frontend production bundle receives `VITE_API_BASE_URL=/api` at build time. Changing an environment variable after Vite has built the static files does not change that bundle; rebuild the image for a different build-time value.
