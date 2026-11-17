# AI implementation status

Product scope: **Try Demo Model** plus **Test Your Own Model** for controlled,
operator-reviewed ONNX image classifiers. See [scope](ai-platform-scope.md) and
[new format contract](custom-classification.md). Public upload is not implemented.

## Implemented

- Kaggle training/config/split/checkpoint/resume/metrics pipeline for MobileNetV3-Small.
- Kaggle ONNX exporter and parity verifier, including preprocessing comparison.
- Three Kaggle notebook templates with embedded, SHA256-checked source bundles.
- Imagenette TGZ discovery and checked extraction; unpacked datasets remain supported.
- CPU ONNX classifier with manifest/hash/shape/class/preprocessing validation.
- Configurable classification adapter: input size/layout/color/normalization,
  ordered classes and logits/probabilities; legacy demo compatibility retained.
- Labelled CSV dataset loader, bounded paths/images and file/pixel provenance.
- Baseline accuracy, macro precision/recall/F1, per-class metrics, confusion matrix
  and per-image predictions; local baseline/hunt/report CLI with custom replay.
- Phase progress and cooperative cancellation through clean baseline and hunt;
  cancellation never publishes incomplete baseline metrics as completed.
- FE/BE integration checklist, proposed request schema, worker-call example and
  executed real-model library response samples (HTTP remains unverified).
- Pre-runtime graph checks reject external weights/custom operator domains in the
  new adapter. These checks are not a sandbox for untrusted uploads.
- Four deterministic corruptions, contextual LinUCB, conditional TPE and Hybrid.
- Budgeted runner, quality-screened proxy feedback, strict confirmation oracle.
- Separate-budget grid minimization, evidence PNGs, fingerprints, replay CLI and exported Pytest.
- Backend schemas/contract, dataset disclosure, evaluation and Kaggle instructions.
- CPU test workflow for future GitHub integration (workflow not executed on GitHub yet).

## Verification boundary

Local software tests use synthetic fixtures, including an executable ONNX graph.
Executed result: **166 passed**, Ruff checks passed. Kiro contributed specs, steering,
review and a 53-case edge suite; Codex applied follow-up fixes and ran the tests.
The recorded local environment is Python 3.12.14; dependency versions are captured in
`requirements-tested.txt`. See `test-results.xml` for the last test run.
Trained ONNX weights were downloaded and verified locally; no local training was performed.
The minimal deployment ZIP and real replay/library smoke are documented in `ai-handoff.md`.
The new configurable workflow also passed with the same trained ONNX on three
selected labelled images, plus replay; see `platform-local-validation.json`.
This demonstrates compatibility, not a new accuracy benchmark or second architecture.
The latest integration smoke recorded 15 phase progress events and three successful
replays; see `integration/local-smoke-response.json` and `fe-be-integration.md`.
The platform extension is Codex-authored; its new Kiro review is PREPARED_NOT_EXECUTED.

```text
Kaggle notebook 01 status: COMPLETED; version 2 / run 370340546; 8 epochs on GPU T4 x2
Kaggle notebook 02 status: COMPLETED; run 370485049; parity passed on 32 dev images
Kaggle notebook 03 status: COMPLETED; run 370489176; 12 runs, 2400 search queries on CPU
Model artifact status: DOWNLOADED; ARCHIVE CRC AND MANIFEST HASHES VERIFIED; MINIMAL DEPLOYMENT BUNDLE READY
ONNX evidence: Kaggle parity passed; real CPU inference, three saved-case replays and three-query library smoke passed locally
Measured model metrics: dev_accuracy=0.9732454439705313; test_accuracy=0.968; test_count=500
Original Kiro task: COMPLETED; SIX OUTPUT FILES INSPECTED; FOLLOW-UP VERIFIED
Kiro platform-extension review: PREPARED_NOT_EXECUTED
Second trained architecture validation: NOT_RUN
FastAPI/Frontend integration: CONTRACT_PROPOSED, NOT_INTEGRATED
Production RAM/latency: NOT_MEASURED; Kaggle hunt runtime/process RAM recorded separately
```

Initial workspace contained only the supplied specification, with no AGENTS.md,
README, code, approved Kiro spec or Git checkout. No commit/push was created.
No frontend or HTTP service was added. Optional YOLO/LightGBM remain out of scope.

Current machine: `.venv-test/Scripts/python.exe` is the verified Python 3.12 test
interpreter. System `python` is Python 3.15 and is not the supported AI interpreter.

Remote execution evidence and notebook URL: `kaggle-run-status.json`.
Measured Hunter comparison and limitations: `benchmark-370489176.md`.
Unlabelled candidate-count regression corrected; unchanged observations no longer count as candidates.
Human semantic review remains pending. Current rebuilt notebook source has not been rerun on Kaggle.
