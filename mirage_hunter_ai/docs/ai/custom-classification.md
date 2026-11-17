# Controlled ONNX image-classification contract

Implemented in `ai-service/app/models/configurable_classifier.py`,
`ai-service/app/evaluation/labelled_dataset.py`, `ai-service/app/evaluation/baseline.py`
and `ai-service/app/pipelines/classification.py`. This is a library/local CLI, not an HTTP upload
service. Model review is an operator responsibility before enabling runtime loading.

## Artifact format

```text
reviewed-model/
  model.onnx
  model_manifest.json
```

Example manifest (replace the placeholder SHA256 with the actual file hash):

```json
{
  "format_version": "classification-onnx-v1",
  "task": "image_classification",
  "model_id": "my-reviewed-classifier-v1",
  "model_file": "model.onnx",
  "model_sha256": "REPLACE_WITH_ACTUAL_64_LOWERCASE_HEX_SHA256",
  "class_names": ["cat", "dog", "bird"],
  "output_kind": "logits",
  "preprocessing": {
    "version": "image-classification-v1",
    "input_size": [224, 224],
    "layout": "NCHW",
    "color_order": "RGB",
    "resize_mode": "stretch",
    "interpolation": "bilinear",
    "scale": 255.0,
    "mean": [0.485, 0.456, 0.406],
    "std": [0.229, 0.224, 0.225]
  }
}
```

This is a format example, not a trained artifact. Every value must match the actual
model export. `class_names` lists unique names in exact output-index order, 2–1,000
classes. Labels use these names. Do not reorder classes alphabetically after export.

- Exactly one float32 image input with static spatial/channel dimensions, NCHW or
  NHWC; batch 1 or symbolic. Exactly one float32 `[N,C]` output with static C.
- Dimensions H/W 2–1,024. `stretch` resizes directly. `shorter_center_crop` requires
  square input and explicit `resize_shorter` covering the crop (maximum 2,048).
  Interpolation: nearest/bilinear/bicubic; RGB/BGR supported.
- Normalization is `(pixel / scale - mean) / std`, before layout conversion. Dataset
  loader applies EXIF orientation and converts decoded images to RGB.
- `output_kind=logits` applies stable softmax. `probabilities` validates the model's
  probabilities without applying softmax a second time.
- Default model file limit: 64 MiB; manifest: 1 MiB. Unknown fields, invalid shapes,
  hash mismatches and unsupported outputs fail explicitly.
- The graph must contain its weights in one file. The adapter inspects protobuf
  without loading external data, rejects external tensor data, custom operator
  domains, local functions and training graphs, then runs the ONNX checker before
  creating a CPUExecutionProvider session.

These checks do not provide isolation or guarantee bounded model runtime/memory.
Use operator-reviewed local files only. Public uploads require a backend-owned
isolated worker, resource limits, access controls and registry before execution.
No `.pt`, `.pth`, `.pkl` or custom Python execution is accepted by this adapter.
ONNX supports [external tensor data](https://onnx.ai/onnx/repo-docs/ExternalData.html);
this adapter deliberately rejects that format.

`load_classifier(directory, trusted_local=True)` dispatches this explicit format.
Legacy demo bundles still use `OnnxClassifier` and retain their existing hash/parity
requirements. New-format metadata is not evidence of export parity: the operator
must separately validate preprocessing/class order and compare native-vs-ONNX
outputs before approving a model.

## Labelled dataset

```text
labelled-dataset/
  images/
    photo-001.jpg
    photo-002.png
  labels.csv
```

```csv
image_filename,ground_truth_label
images/photo-001.jpg,cat
images/photo-002.png,dog
```

CSV header/order must match exactly. Ground truth is a class name, not an ambiguous
numeric index. Use relative POSIX paths inside `images/`; duplicate files, traversal,
unknown classes and missing labels are rejected. JPEG/PNG only, at least 2×2 pixels.
Default local bounds: 100 images, 4 million pixels/image, 128 MiB decoded RGB total,
1 MiB labels CSV. Exceeding a bound fails; it does not silently sample the dataset.
The manifest records file and decoded-pixel SHA256 with source IDs and mapped labels.

## Run and inspect

Install `pip install -e ".[custom,test]"` in Python 3.11–3.13. From the repository:

```powershell
python -m app.pipelines.classification --artifacts path/to/reviewed-model --dataset path/to/labelled-dataset --output path/to/new-run --trusted-local-model --strategy hybrid --queries 20 --seed 42
```

The output directory must be new. `queries` is 0–30 for this small local workflow;
heavy benchmarks remain on Kaggle. Strategies: random/tpe_only/linucb_only/hybrid.
Outputs include `dataset_manifest.json`, `environment.json`, `baseline.json`,
`report.json` and `hunt/` with the existing result, trial evidence and regression
tests. `baseline.json` contains accuracy, macro precision/recall/F1, per-class
metrics/support, confusion matrix, per-image predictions and baseline-correct IDs.
Zero-denominator class metrics use zero. Failed inference aborts baseline evaluation.

`run_classification(..., dataset_id="registered-id", progress=callback,
cancelled=is_cancelled)` supports worker-owned progress/cancel callbacks. Progress
receives `{phase, completed, total, unit}` with phase-local counters. Clean-baseline
cancellation raises `EvaluationCancelled` with phase and inference attempt count;
incomplete metrics are not returned. Hunt cancellation returns a partial report
with `status=cancelled`. Callbacks are cooperative between inference calls and
cannot interrupt a running native ONNX call. `finished` means the report is written;
use its status to decide the job state. See [FE/BE integration](fe-be-integration.md).

The clean evaluation and Hunter's clean baseline are currently separate passes.
`report.json` explicitly includes both in `total_target_inferences`. For three
images and three search queries without errors/minimization, total inference is 9.
Baseline mistakes are visible in the clean report and excluded from induced-failure
claims. Automatic quality validity yields candidates; confirmation still requires
ground truth, correct clean prediction and reviewed semantic preservation.

```powershell
python -m app.pipelines.replay --case path/to/new-run/hunt/trial-000001 --artifacts path/to/reviewed-model --trusted-local-model
$env:MIRAGEHUNTER_ARTIFACT_DIR = 'path/to/reviewed-model'
$env:MIRAGEHUNTER_TRUSTED_LOCAL_MODEL = '1'
python -m pytest path/to/new-run/hunt/trial-000001/test_regression.py
```

The trust environment variable is only for an operator running exported regression
tests with the reviewed new-format model. Existing demo replays need no new trust
flag. A replay checks reproducibility for the same model hash; it does not certify
that a later model has fixed the error.

## Actual verification

- 166 software tests passed overall, including executable synthetic 3-class ONNX
  fixtures across layouts/logits/probabilities, preprocessing, baseline metrics,
  dataset rejection, graph rejection, full workflow and replay. Fixtures are not
  accuracy benchmarks or trained targets.
- The downloaded trained MobileNet ONNX was loaded through the new format, then
  baseline → 3-query Hybrid hunt → replay passed on three selected labelled images.
  See `platform-local-validation.json`. This is compatibility evidence only.
- An additional worker-call smoke recorded 15 phase progress events and replayed
  all three trials; actual response is `integration/local-smoke-response.json`.
- No second trained architecture, public upload or HTTP integration has been
  validated. Latest rebuilt notebook source remains NOT_RUN on Kaggle.
