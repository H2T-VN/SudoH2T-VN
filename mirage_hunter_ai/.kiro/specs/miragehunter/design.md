# MirageHunter scaffold design

## Runtime flow

The browser talks to Nginx (or Vite's local proxy) at `/api`. Nginx forwards
those requests to `backend-service`. The backend owns configuration, persistence
and dependency error handling. Only the backend calls `ai-service`; the AI service
currently exposes connectivity health and no inference API.

```text
Browser -> frontend (Nginx/Vite) -> backend-service -> ai-service
                                      |
                                      +-> MySQL / Flyway
```

## Backend boundaries

- `controller`: HTTP endpoints and DTO validation.
- `client`: outbound AI service calls.
- `entity` / `repository`: the initial `experiments` persistence boundary.
- `config`: CORS, HTTP client and application configuration.
- `exception`: structured errors and global handling.

## AI boundaries

`app/api` contains routers, `app/schemas` contains API models, and
`app/core` contains settings/logging. The future `models`, `transforms`,
`hunter`, `evaluation`, `minimization` and `pipelines` packages are explicit
extension points and intentionally contain no fake inference behavior.

## Configuration

Docker Compose passes environment variables explicitly. Local runs require the
developer to export variables or pass them in the shell; Spring Boot and Vite do
not silently read a root `.env` file at runtime.
