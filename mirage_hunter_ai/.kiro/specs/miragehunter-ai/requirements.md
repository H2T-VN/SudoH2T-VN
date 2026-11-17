# MirageHunter AI — Requirements

_Derived from actual implementation in `backend/app/`, `backend/tests/`, and
`experiments/scripts/` as of the Kiro review pass. References to the spec document
are to `H2T_MirageHunter_AI_Codex_Kaggle_Spec.md`._

---

## Scope

The AI/ML module covers:

- Deterministic image transformation engine (brightness, blur, noise, JPEG).
- Four hunter strategies (Random, TPE-only, LinUCB-only, Hybrid LinUCB+TPE).
- Ground-truth oracle with explicit validity states.
- Query-budgeted hunt runner with inline accounting.
- Failure minimizer and reproducible fingerprint/replay.
- ONNX CPU inference adapter with manifest verification.
- Training scripts that run only on Kaggle (guarded by `require_kaggle()`).

Frontend, FastAPI routing, database persistence, and job queue are **not** in scope
for this module. The AI module is a pure-Python library that the backend imports.

---

## Functional Requirements

### FR-1 Image Transformations

| ID | Requirement | Source |
|----|-------------|--------|
| FR-1.1 | Four transforms implemented: `brightness`, `blur`, `noise`, `jpeg`. | §4.1 |
| FR-1.2 | Each transform is deterministic: same `TransformationSpec` → identical pixel output. | §8.3 test-1 |
| FR-1.3 | `severity=0` returns a pixel-identical copy of the input (identity). | §4.2 |
| FR-1.4 | Input image is never mutated; output dtype is `uint8 HxWx3`. | §4.2 |
| FR-1.5 | `noise` uses a seeded RNG derived from `spec.seed`; clip to `[0,255]`. | §4.1 |
| FR-1.6 | `jpeg` quality is `round(95 − 45*severity)`, range `[50, 95]`. | `image_corruptions.py` |
| FR-1.7 | `brightness` supports direction `{-1, 1}`; factor is `1 + direction*0.35*severity`. | `image_corruptions.py` |
| FR-1.8 | `TransformationSpec` is a frozen Pydantic model; `severity ∈ [0,1]`, `seed ∈ [0, 2³²−1]`. | `contracts.py` |

### FR-2 Validity and Oracle

| ID | Requirement | Source |
|----|-------------|--------|
| FR-2.1 | Five failure states: `confirmed_failure`, `not_failed`, `candidate`, `invalid`, `baseline_incorrect`. | §4.3 |
| FR-2.2 | `confirmed_failure` requires ground truth ≠ None, baseline correct, validity `verified`, prediction wrong. | `classification_oracle.py` |
| FR-2.3 | `provisionally_valid` from automatic screen → `candidate`, never `confirmed`. | §4.3 warning |
| FR-2.4 | `invalid` images do not update hunter state and do not count as confirmed failures. | §5.5 |
| FR-2.5 | `automatic_validity` rejects shape changes and near-constant clipped images. | `validity.py` |
| FR-2.6 | Validity `verified` may only be injected by a trusted server-side callback, never from browser input. | `runner.py` comment |

### FR-3 Hunter Strategies

| ID | Requirement | Source |
|----|-------------|--------|
| FR-3.1 | All four strategies share the `HunterStrategy` protocol: `suggest(context, trial_index)`, `update(context, spec, reward, score, valid)`. | `base.py` |
| FR-3.2 | `RandomSearch`: uniform action and severity from seeded RNG; stateless update. | `random_search.py` |
| FR-3.3 | `TPEOnly`: single joint Optuna study; categorical action + conditional `severity_{kind}` float per arm. | `tpe_search.py` |
| FR-3.4 | `LinUCB`: per-arm `A` (6×6) and `b` (6,) matrices; score = `θ·x + α·√(x·A⁻¹·x)`; uses `np.linalg.solve` not `inv`. | `linucb.py` |
| FR-3.5 | `LinUCB` ε-greedy: probability `config.exploration` of uniform random arm. | `linucb.py` |
| FR-3.6 | `Hybrid`: LinUCB selects arm, then per-arm Optuna study (`ask/tell`) selects severity. | `hybrid.py` |
| FR-3.7 | `Hybrid` and `TPEOnly` raise `RuntimeError` if `update` is not called between consecutive `suggest` calls. | `tpe_search.py`, `hybrid.py` |
| FR-3.8 | LinUCB A/b do not learn from `valid=False`; Optuna closes pending trials as FAIL without learning invalid scores. | `runner.py` |
| FR-3.9 | Optuna studies seed = `config.seed + arm_index mod 2³²`; `n_startup_trials = config.startup_trials`. | `hybrid.py` |

### FR-4 Context Vector

| ID | Requirement |
|----|-------------|
| FR-4.1 | Six-element vector: `[1.0, mean_luminance, luminance_std, sharpness, baseline_confidence, baseline_entropy]`. |
| FR-4.2 | All features normalized to `[0, 1]`; computed **before** transformation. |
| FR-4.3 | Sharpness: log-scaled Laplacian variance, clamped to `[0, 1]`. |
| FR-4.4 | Entropy: normalized softmax entropy `∈ [0, 1]`. |
| FR-4.5 | Feature version string `FEATURE_VERSION` stored in trial fingerprints; pixel replay does not rerun action selection. |

### FR-5 Hunt Runner

| ID | Requirement | Source |
|----|-------------|--------|
| FR-5.1 | `max_queries` controls target inference on transformed images; baseline queries are counted separately. | `runner.py` |
| FR-5.2 | Schedule RNG is seeded independently from strategy RNG; image order is consistent across all strategies. | §5.3 / `runner.py` |
| FR-5.3 | Only images where baseline prediction == ground truth (or ground truth is None) enter the schedule. | §2.1 §6 |
| FR-5.4 | Each inference attempt (including errors) consumes one query. | `runner.py` |
| FR-5.5 | Inference exceptions → reward 0, `valid=False` passed to strategy; `failure_status=error`. | `runner.py` |
| FR-5.6 | `cancelled` callback checked before each trial; `status="cancelled"` returned. | `runner.py` |
| FR-5.7 | `model_id` in config must match `model.model_id`; mismatch raises `ValueError`. | `runner.py` |
| FR-5.8 | `source_ids` must be unique and length-matched to images. | `runner.py` |
| FR-5.9 | Per-trial row saved to `trial_log.csv`; full columns per spec §8.2. | `runner.py` |
| FR-5.10 | `HuntResult` Pydantic model returned; also written as `result.json`. | `runner.py` |

### FR-6 Failure Minimizer

| ID | Requirement | Source |
|----|-------------|--------|
| FR-6.1 | Ascending severity grid from 0 to original severity within budget; first failure found is returned. | `minimizer.py` |
| FR-6.2 | Minimization query count tracked and reported separately in `HuntResult`. | §5.6 |
| FR-6.3 | A `confirmed_failure` case may not be replaced by a `candidate` from minimization. | `minimizer.py` |
| FR-6.4 | Invalid grid proposals during minimization are skipped; only actual model invocations consume minimization_queries. | `minimizer.py` |
| FR-6.5 | No monotonicity assumption; result is labeled "minimum found in budget", not global minimum. | §5.6 |

### FR-7 Fingerprint and Replay

| ID | Requirement | Source |
|----|-------------|--------|
| FR-7.1 | Each case directory contains `original.png`, `transformed.png`, `fingerprint.json`, `test_regression.py`. | `fingerprint.py` |
| FR-7.2 | `pixel_hash` includes shape/dtype header; replay verifies both source and transformed pixel hashes. | `fingerprint.py` |
| FR-7.3 | `replay_case` checks model SHA256, preprocessing, class names, and transform version before comparing pixels. | `fingerprint.py` |
| FR-7.4 | `replay_case` asserts top-1 prediction and probability allclose with `atol=1e-5, rtol=1e-4`. | `fingerprint.py` |

### FR-8 ONNX Classifier Adapter

| ID | Requirement | Source |
|----|-------------|--------|
| FR-8.1 | Verifies SHA256 of ONNX, class mapping, preprocessing and parity report; requires passed parity on at least 20 samples. | `onnx_classifier.py` |
| FR-8.2 | Preprocessing contract is exactly `imagenette-rgb-v1`; any deviation raises `ValueError`. | `onnx_classifier.py` |
| FR-8.3 | Model input `float32 [N,3,224,224]`; output `[N,C]` logits; adapter applies stable softmax. | §3.3 |
| FR-8.4 | Only `CPUExecutionProvider`; threads configurable, default 1. | `onnx_classifier.py` |
| FR-8.5 | `class_to_idx.json` must have contiguous indices `0…C-1`; duplicate values rejected. | `onnx_classifier.py` |

### FR-9 Training (Kaggle only)

| ID | Requirement | Source |
|----|-------------|--------|
| FR-9.1 | `require_kaggle()` guard prevents local training; raises `RuntimeError` outside `/kaggle/working`. | `common.py` |
| FR-9.2 | Stratified split with fixed seed; `val/` folder is strictly held-out. | §3.2 §2.1 |
| FR-9.3 | Resume checkpoint verified against `split_hash` and key config fields. | `train.py` |
| FR-9.4 | Test evaluation runs exactly once, after dev-based model selection. | §3.2 point 8 |
| FR-9.5 | `preprocessing.json` saved with every training run; ONNX export verifies match against checkpoint. | `export_onnx.py` |
| FR-9.6 | ONNX parity requires at least 20 dev images; atol/rtol predeclared; failure blocks creation of a deployable passed manifest. | `export_onnx.py` |

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Web deployment uses only `onnxruntime` (CPU), NumPy, Pillow, Optuna, Pydantic. No Torch in deployed image. |
| NFR-2 | Deployment goal: fit the chosen host (512 MB is an unverified target); small live demos use at most 30 queries. Production fit is NOT_MEASURED. |
| NFR-3 | No benchmark numbers, accuracy figures, or Kaggle output may be fabricated. All placeholders marked `NOT_MEASURED`. |
| NFR-4 | Datasets must not be committed to the repository. ONNX artifact referenced by SHA256 and fetched separately. |
| NFR-5 | No `git commit`, `git push`, or local training without explicit authorization. |
| NFR-6 | Reproduced failures require pinned library versions; version mismatch across environments is documented. |
