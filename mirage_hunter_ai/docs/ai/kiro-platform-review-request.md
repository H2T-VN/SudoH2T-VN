# Kiro review request — controlled classification extension

Status: **PREPARED_NOT_EXECUTED**. This request was authored by Codex. No new Kiro
session/output is claimed. Earlier genuine Kiro work remains in `kiro-usage.md`.

Submit to Kiro in this workspace when its chat can be used:

```text
Review the current controlled ONNX image-classification extension against
docs/references/product-readme-supplied.md and AGENTS.md. Preserve the original
spec and existing Kaggle evidence. Scope is AI library only; no frontend/FastAPI,
training locally, public upload, commits, pushes or fabricated metrics.

Inspect ai-service/app/models/configurable_classifier.py,
ai-service/app/evaluation/labelled_dataset.py, ai-service/app/evaluation/baseline.py,
ai-service/app/pipelines/classification.py, ai-service/app/pipelines/replay.py,
ai-service/app/evaluation/fingerprint.py and
ai-service/tests/test_configurable_classification.py.

Also inspect the latest phase-progress and cooperative-cancellation changes in
classification.py, evaluation/baseline.py and hunter/runner.py. Verify that a
cancelled clean baseline never yields completed metrics, partial hunt reports
preserve counters/status and finished progress is not treated as job success.
Review docs/fe-be-integration.md and docs/integration/worker_example.py for honest
HTTP/ownership boundaries. Local 166-test execution and real-model smoke are
Codex evidence, not Kiro execution evidence.

Focus on metadata/class-order/preprocessing correctness, bounded dataset paths,
external ONNX data/custom operators, error handling, baseline confusion metrics,
budget counting, legacy compatibility and replay. Static checks and trusted_local
are not a sandbox; public model execution must remain unsupported here.

Write concrete findings with file/line and disposition in
docs/kiro-platform-review.md; add meaningful missing tests if warranted. Run
python -m pytest -q and ruff check backend experiments tools using .venv-test
when available. Rebuild the Kaggle bundle if bundled source changes.

Record actual commands/results and authorship. If an environment prevents a
check, mark NOT_RUN with the actual reason. Do not claim a new trained model,
Kaggle run or HTTP integration from synthetic fixtures/local smoke tests.
```

After actual execution, record session ID/date, inspect files, run checks and
update `kiro-usage.md`. Until then this extension is Codex-authored and its Kiro
review remains pending.
