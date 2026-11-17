# MirageHunter scaffold requirements

## Scope

This specification covers the initial service scaffold and the health/connectivity
path only. Image inference, model adapters, search strategies, minimization and
result persistence beyond the initial experiment table are future work.

## Requirements

1. The repository shall contain independently runnable frontend, backend-service,
   ai-service and MySQL components.
2. The frontend shall use React + TypeScript + Vite, route the requested pages,
   and communicate through the backend API only.
3. The backend shall expose its own health endpoint and an AI dependency health
   endpoint. AI unavailability shall produce HTTP 503 with a structured error.
4. The backend shall use Java 21-compatible Spring Boot, JPA validation and
   Flyway migrations against MySQL 8.4.
5. The AI service shall expose a real FastAPI `/health` endpoint and load settings
   using Pydantic Settings.
6. Docker Compose shall provide healthchecks, service dependency ordering, a
   persistent MySQL named volume, and Nginx SPA/API routing.
7. Documentation shall distinguish implemented behavior from proposed APIs and
   shall not claim unmeasured AI results.

## Explicit non-goals for this increment

- Random, TPE, LinUCB or Hybrid search implementation.
- Model loading, inference, dataset ingestion or image transformation execution.
- Authentication, authorization, user accounts and background job orchestration.
- Claims about accuracy, robustness, benchmarks, datasets or licenses.
