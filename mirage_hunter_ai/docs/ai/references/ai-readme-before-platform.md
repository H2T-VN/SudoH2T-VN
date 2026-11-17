# MirageHunter AI — H2T

AI/ML module for reproducible failure hunting in image classifiers. The MVP target is
**MobileNetV3-Small fine-tuned on Imagenette (10 classes) on Kaggle**, exported to ONNX
for CPU inference. This repository currently contains the AI library and experiment
pipeline; the team's FastAPI service and frontend are separate integration work.

```text
Kaggle: train target → export ONNX → verify parity → benchmark
Web: labelled images → transform → CPU inference → evaluate → evidence/replay
                     ↑ LinUCB chooses family; TPE chooses severity
```

## Start here

- [Kaggle instructions (Vietnamese)](experiments/README.md)
- [Training notebook](experiments/kaggle/01_train_mobilenetv3_imagenette.ipynb)
- [ONNX export notebook](experiments/kaggle/02_export_verify_onnx.ipynb)
- [Hunter benchmark notebook](experiments/kaggle/03_hunter_benchmark.ipynb)
- [Backend library contract](docs/backend-contract.md)
- [Evaluation policy](docs/evaluation.md)
- [Kiro workflow and evidence](docs/kiro-usage.md)
- [Existing work disclosure](docs/existing-work-disclosure.md)

## Local CPU development

Use Python 3.11–3.13 (3.12 recommended). Training does not run locally.

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -e ".[test]"
.venv\Scripts\python -m pytest -q
.venv\Scripts\python tools/build_kaggle_bundle.py
```

On the current Windows workspace, the verified environment is `.venv-test`:
`.venv-test\Scripts\python -m pytest -q`. System Python 3.15 is not used for AI dependencies.

Deployment dependencies are in `backend/requirements-ai.txt`; they exclude Torch,
Torchvision, Ultralytics and training dependencies. Use trusted artifact bundles only.

## Status and evidence

Local notebook files ship without embedded outputs. The training notebook completed
on Kaggle [version 2](https://www.kaggle.com/code/hungdeptrai123456/h2t-miragehunter-01-train-mobilenetv3-imagenette?scriptVersionId=370340546):
8 epochs, dev accuracy 97.32%, test accuracy 96.80% on 500 images. The checkpoint,
metrics and training history are available in that version's Output. Downloaded model
artifacts stay separate from source under the ignored `artifacts/` directory.
See `docs/kaggle-run-status.json` for observed evidence.
ONNX export completed on Kaggle [run 370485049](https://www.kaggle.com/code/hungdeptrai123456/h2t-miragehunter-02-export-verify-onnx/notebook?scriptVersionId=370485049):
parity passed on 32 dev images, 100% top-1 agreement, maximum absolute logit difference
0.0000276566, and identical preprocessing. Hunter [benchmark run 370489176](https://www.kaggle.com/code/hungdeptrai123456/h2t-miragehunter-03-hunter-benchmark?scriptVersionId=370489176)
completed 12 runs with 2,400 search queries on CPU. Mean candidate counts were Random
4.33, TPE-only 6.67, LinUCB-only 5.67 and Hybrid 8.33. Confirmed counts remain zero
pending semantic review. See [full results and limits](docs/benchmark-370489176.md).

Unit tests use synthetic classifiers, including an executable ONNX fixture; those
software tests are separate from the measured Kaggle training run.

Local verification: **126 tests passed**, Ruff clean. Kiro generated specs, steering,
review and the edge-case test suite; Codex applied follow-up corrections and executed tests.

The downloaded trained ONNX bundle passed hash checks, real CPU inference and three
saved-case replays. A three-query library integration smoke also passed without Torch.
See the [AI handoff](docs/ai-handoff.md) for the deployment ZIP, actual response JSON,
commands and the 75-case human-review gallery. HTTP integration remains pending.

Automatic quality checks produce **candidate** failures. A confirmed induced failure
requires a trusted label, correct baseline, wrong transformed prediction and verified
preservation of the semantic label. Confidence drop alone is insufficient.

No YOLO/LightGBM extension, web server or arbitrary model upload is implemented.
The original Vietnamese project specification remains unchanged.
