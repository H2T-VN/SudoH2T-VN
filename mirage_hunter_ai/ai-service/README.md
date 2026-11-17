# AI service

The service currently exposes only a real FastAPI health endpoint. It does not
load weights, datasets, or return simulated model results.

Package responsibilities:

- `app/api`: HTTP routers.
- `app/core`: settings and logging.
- `app/schemas`: request/response models.
- `app/models`: future model adapters and inference contracts.
- `app/transforms`: future image transformations with label-preservation checks.
- `app/hunter`: future Random, TPE, LinUCB and Hybrid search strategies.
- `app/evaluation`: future baseline/failure evaluator.
- `app/minimization`: future failing-case minimization.
- `app/pipelines`: future orchestration of the above components.
- `app/utils`: small shared utilities.
