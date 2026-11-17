# API contract

Only the endpoints in the first table are implemented in this scaffold.

## Implemented endpoints

### `GET /api/health`

Returns backend process health.

```json
{
  "status": "UP",
  "service": "backend-service"
}
```

Status: `200 OK`.

### `GET /api/health/ai`

The backend calls `GET /health` on the configured AI service and forwards a healthy response.

```json
{
  "status": "UP",
  "service": "ai-service"
}
```

Status: `200 OK` when AI responds with `status: UP`. If AI is unavailable, returns a non-success response, or returns an unhealthy response, the backend returns `503 Service Unavailable`:

```json
{
  "timestamp": "2026-01-01T00:00:00Z",
  "status": 503,
  "error": "AI_SERVICE_UNAVAILABLE",
  "message": "AI service is not reachable",
  "path": "/api/health/ai"
}
```

The timestamp is generated at response time. Messages may differ for timeout, connection and unhealthy-response cases.

### `GET /health` (AI service)

```json
{
  "status": "UP",
  "service": "ai-service"
}
```

Status: `200 OK`.

### `GET /actuator/health` (backend operational endpoint)

Spring Actuator exposes this endpoint for the Docker healthcheck. It is not the frontend application contract.

## Not implemented yet

The following are design targets, not available endpoints. Do not build a client that treats them as working:

- `POST /api/experiments`
- `GET /api/experiments`
- `GET /api/experiments/{id}`
- `POST /api/experiments/{id}/run`
- `GET /api/experiments/{id}/results`
- `GET /api/models`
- `POST /api/models`
- `POST /api/images`
- `POST /api/minimization`

No request/response schema is claimed for those endpoints until their behavior is implemented and tested.
