# MirageHunter AI — Design

_This document describes the actual architecture as implemented. It is derived from
code inspection, not forward-looking goals. Proposed changes are confined to
`docs/kiro-review.md`._

---

## 1. Module Map

```
backend/
└── app/
    ├── transforms/
    │   └── image_corruptions.py   — four deterministic transforms, check_image, physical_parameters
    ├── models/
    │   ├── contracts.py           — TransformationSpec, HuntConfig, ClassifierAdapter protocol, check_probabilities
    │   └── onnx_classifier.py     — OnnxClassifier, preprocess_image, DEFAULT_PREPROCESSING
    ├── evaluation/
    │   ├── classification_oracle.py — classify_failure (5-state FSM)
    │   ├── validity.py            — Validity dataclass, automatic_validity
    │   ├── metrics.py             — summarize(records) → summary dict
    │   └── fingerprint.py         — pixel_hash, write_json, save_case, replay_case, environment
    ├── hunter/
    │   ├── base.py                — HunterStrategy Protocol
    │   ├── context.py             — extract_context (6-feature vector)
    │   ├── random_search.py       — RandomSearch (stateless baseline)
    │   ├── tpe_search.py          — TPEOnly (single joint Optuna study)
    │   ├── linucb.py              — LinUCB (contextual bandit, ε-greedy)
    │   ├── hybrid.py              — Hybrid (LinUCB arm + per-arm TPE severity) + create_strategy factory
    │   ├── minimizer.py           — minimize_failure (ascending grid search)
    │   └── runner.py              — run_hunt (orchestration, budget accounting, CSV/JSON output)
    └── replay.py                  — CLI entry point for replay_case

experiments/
└── scripts/
    ├── common.py    — require_kaggle, find_dataset, WNID_NAMES, file_hash
    ├── train.py     — stratified_indices, classification_metrics, train() (Kaggle-only)
    ├── export_onnx.py — export_and_verify() (Kaggle-only, ONNX parity)
    └── benchmark.py   — benchmark() (Kaggle-only, 4 strategies × N seeds)
```

---

## 2. Data Flow

### 2.1 Hunt Execution

```
run_hunt(images, labels, model, config, output_dir)
│
├─ Validation: image shapes, label range, source_id uniqueness, model_id match
│
├─ Baseline pass (baseline_queries):
│   For each image → model.predict(original)
│   Eligible set = {i : label[i] is None OR argmax(p) == label[i]}
│
├─ Schedule generation:
│   Independent RNG(seed) → permutation of eligible → schedule[:max_queries]
│   (Schedule is strategy-agnostic; same order for all strategies with same seed)
│
├─ Strategy creation: create_strategy(config) → one of {RandomSearch, TPEOnly, LinUCB, Hybrid}
│
└─ Trial loop (max_queries iterations):
    context  = extract_context(image, baseline_probabilities)
    spec     = strategy.suggest(context, trial_index)
    changed  = transform_image(image, spec)
    validity = validity_policy(original, changed, spec)   ← server-trusted callback
    p        = model.predict(changed)                     ← counts as 1 query
    status   = classify_failure(label, baseline_pred, argmax(p), validity)
    reward   = (argmax(p) != label) if usable else 0
    strategy.update(context, spec, reward, margin, usable)
    ├─ if failure: minimize_failure(..., minimization_budget)
    └─ save_case(dir, original, changed, row)
```

### 2.2 Validity State Machine

```
              transform_image
                    │
        ┌───────────▼───────────┐
        │   automatic_validity  │   ← shape check + clipping heuristic
        └───────────┬───────────┘
     ┌──────────────┼──────────────┐
 "invalid"  "provisionally_valid"  "verified" (injected by trusted callback)
     │               │                    │
  skip/no       classify_failure      classify_failure
  reward          → "candidate"        → "confirmed_failure" if
                  (never confirmed)      (baseline correct ∧ pred wrong)
```

### 2.3 Failure Classification (5-state FSM)

```python
classify_failure(ground_truth, baseline_pred, transformed_pred, validity):
    if validity.status == "invalid"              → "invalid"
    if ground_truth is None                      → "candidate"
    if baseline_pred != ground_truth             → "baseline_incorrect"
    if transformed_pred == ground_truth          → "not_failed"
    if validity.status == "verified"             → "confirmed_failure"
    else                                         → "candidate"
```

---

## 3. Component Details

### 3.1 TransformationSpec (frozen Pydantic)

```
kind:      Literal["brightness", "blur", "noise", "jpeg"]
severity:  float ∈ [0, 1]      ← normalized; mapped to physical range per transform
seed:      int ∈ [0, 2³²−1]    ← noise RNG seed; brightness/blur/jpeg are deterministic without it
direction: Literal[-1, 1]       ← brightness only; default 1 (darkening disabled without explicit set)
```

Physical parameter mapping:
- `brightness`: factor = `1 + direction * 0.35 * severity`
- `blur`: sigma = `2 * severity`
- `noise`: sigma_uint8 = `10 * severity`
- `jpeg`: quality = `round(95 − 45 * severity)`, subsampling = 0

### 3.2 LinUCB State

Each arm `a` maintains `A_a` (6×6, initialized `λI`) and `b_a` (6-vector, initialized 0).

Score: `θ_a · x + α · √(x · A_a⁻¹ · x)`, where `θ_a = A_a⁻¹ · b_a`.

Implementation uses `np.linalg.solve(A_a, b_a)` and `np.linalg.solve(A_a, x)` to avoid
explicit matrix inversion. Tie-breaking is seeded via the strategy RNG.

Update (only when `valid=True`):
- `A_a += xᵀx`
- `b_a += reward * x`

### 3.3 Hybrid Ask/Tell

```
suggest():
    kind   = LinUCB.choose_arm(context)       ← ε-greedy bandit
    trial  = studies[kind].ask()              ← Optuna trial
    sev    = trial.suggest_float("severity", 0, 1)
    dir    = trial.suggest_categorical("direction", [-1,1])  ← brightness only
    self.pending = (kind, trial)
    return TransformationSpec(kind, sev, seed, dir)

update(valid=True):
    studies[kind].tell(trial, score)          ← maximizes margin
    LinUCB.update(context, spec, reward, ...)

update(valid=False):
    studies[kind].tell(trial, state=FAIL)
    LinUCB.update called with valid=False; A/b remain unchanged
```

One pending trial enforced; second `suggest()` without `update()` raises `RuntimeError`.

### 3.4 Schedule Independence

A dedicated `np.random.default_rng(config.seed)` is used exclusively for schedule
generation. It is never shared with strategy RNGs, so the trial order seen by all
four strategies is identical for a given seed.

### 3.5 OnnxClassifier Loading Sequence

```
1. Read model_manifest.json
2. SHA256-verify ONNX, class_to_idx.json, preprocessing.json and onnx_parity_report.json;
   require passed parity report with at least 20 samples
3. Validate preprocessing == DEFAULT_PREPROCESSING (exact match)
4. Validate class_to_idx: contiguous 0…C-1 indices, no duplicates
5. Create ort.InferenceSession(CPUExecutionProvider)
6. Assert input shape [N,3,224,224] float32 and output shape [N,C]
7. Assert manifest["output_kind"] == "logits"
```

Preprocessing in `preprocess_image`:
1. Resize shorter side to 256 (bilinear), matching torchvision integer rounding rules.
2. CenterCrop 224×224.
3. Normalize with ImageNet mean/std, layout NCHW float32.

### 3.6 Training Checkpoint Resume

The checkpoint saved after each epoch includes full RNG state:
- `torch.get_rng_state()` / `torch.cuda.get_rng_state_all()`
- `np.random.get_state()` serialized as plain-Python tuple
- `random.getstate()`
- DataLoader generator state

Resume validation checks `split_hash`, `class_to_idx`, and six core config keys
(`seed`, `batch_size`, `learning_rate`, `weight_decay`, `head_epochs`,
`unfreeze_last_blocks`). Mismatch raises `ValueError`.

A guard prevents double test-set evaluation: if `classification_metrics.json` already
exists in the output dir, the script refuses to continue.

---

## 4. Output Artifacts

### Per-run (output_dir/)

```
config.json             HuntConfig dump
environment.json        library versions + platform
schedule.json           ordered list of source_image_ids
trial_log.csv           one row per trial (sorted column names)
failure_cases.jsonl     rows for confirmed/candidate failures only
summary.json            counts, rates, timing, minimization stats
result.json             HuntResult Pydantic dump
trial-NNNNNN/           per-case directories:
    original.png
    transformed.png
    fingerprint.json    full provenance + replay command
    test_regression.py  standalone pytest regression
trial-NNNNNN-minimized/ (if minimization ran and found a lower severity)
```

### Kaggle training artifacts (miragehunter_artifacts/)

```
mobilenetv3_imagenette_best.pth
mobilenetv3_imagenette.onnx
class_to_idx.json
preprocessing.json
train_config.json
training_history.csv
classification_metrics.json
confusion_matrix.csv
split_manifest.json
environment.json
onnx_parity_report.json
model_manifest.json         ← SHA256 of ONNX, checkpoint, class mapping, preprocessing,
                              split manifest and parity report; required by OnnxClassifier
```

---

## 5. Key Design Decisions and Rationale

| Decision | Rationale |
|----------|-----------|
| `np.linalg.solve` over `np.linalg.inv` in LinUCB | Numerically stable; avoids explicit inverse computation. |
| `severity=0` returns `image.copy()` before computing JPEG | JPEG at quality 100 is not lossless; identity must be exact. |
| Independent schedule RNG | Ensures ablation fairness; strategy cannot influence which images it sees. |
| `provisionally_valid` → `candidate` (never confirmed) | Heuristic SSIM/pixel screens do not prove semantic label preservation (§4.3). |
| Optuna `ask/tell` API | Gives explicit budget control; avoids `study.optimize` callback depth. |
| Brightness `direction` field | Allows both darkening and brightening; enables finer exploration without asymmetric severity bias. |
| `check_probabilities` enforces sum-to-1 | Prevents silent NaN/inf propagation; catches logit-vs-probability adapter bugs. |
| `model_id` check in `run_hunt` | Guards against silently running the wrong model on a configured hunt. |
| `classification_metrics.json` existence guard | Prevents inadvertent second test-set evaluation with a different checkpoint. |
