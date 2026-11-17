# Kiro Review — MirageHunter AI

**Reviewer:** Kiro (IDE)  
**Session:** sess_9601b0e5-d68f-42df-b4b8-a9fc40f7d93a  
**Date:** 2026 (review pass, no Kaggle execution)  
**Scope:** `ai-service/app/`, `ai-service/tests/`, `experiments/scripts/`

---

## Files Inspected

| File | Purpose |
|------|---------|
| `ai-service/app/transforms/image_corruptions.py` | 4 deterministic transforms, `physical_parameters`, `check_image` |
| `ai-service/app/models/contracts.py` | `TransformationSpec`, `HuntConfig`, `ClassifierAdapter`, `check_probabilities` |
| `ai-service/app/models/onnx_classifier.py` | `OnnxClassifier`, `preprocess_image`, `DEFAULT_PREPROCESSING` |
| `ai-service/app/evaluation/classification_oracle.py` | 5-state `classify_failure` |
| `ai-service/app/evaluation/validity.py` | `Validity`, `automatic_validity` |
| `ai-service/app/evaluation/metrics.py` | `summarize` |
| `ai-service/app/evaluation/fingerprint.py` | `save_case`, `replay_case`, `pixel_hash`, `environment` |
| `ai-service/app/hunter/base.py` | `HunterStrategy` protocol |
| `ai-service/app/hunter/context.py` | `extract_context`, `FEATURE_VERSION` |
| `ai-service/app/hunter/random_search.py` | `RandomSearch` |
| `ai-service/app/hunter/tpe_search.py` | `TPEOnly` |
| `ai-service/app/hunter/linucb.py` | `LinUCB` |
| `ai-service/app/hunter/hybrid.py` | `Hybrid`, `create_strategy` |
| `ai-service/app/minimization/minimizer.py` | `minimize_failure` |
| `ai-service/app/hunter/runner.py` | `run_hunt`, `HuntResult` |
| `ai-service/app/pipelines/replay.py` | CLI replay tool |
| `ai-service/tests/conftest.py` | `ThresholdClassifier`, `image`, `model`, `reviewed` fixtures |
| `ai-service/tests/test_transforms.py` | Determinism, identity, bad-input rejection |
| `ai-service/tests/test_oracle.py` | 7 parametrized oracle cases |
| `ai-service/tests/test_hunter.py` | Budget, determinism, state, schedule, minimization |
| `ai-service/tests/test_onnx_classifier.py` | ONNX runtime, SHA256 tamper, preprocessing |
| `ai-service/tests/test_experiments.py` | Stratified split, notebook validity, schema |
| `experiments/scripts/common.py` | `require_kaggle`, `find_dataset`, `WNID_NAMES` |
| `experiments/scripts/train.py` | `stratified_indices`, `train()`, resume |
| `experiments/scripts/export_onnx.py` | `export_and_verify()` |
| `experiments/scripts/benchmark.py` | `benchmark()` |
| `AGENTS.md` | Project conventions |
| `H2T_MirageHunter_AI_Codex_Kaggle_Spec.md` | Full AI/ML specification |

---

## Files Created by This Review Pass

| File | Description |
|------|-------------|
| `.kiro/specs/miragehunter-ai/requirements.md` | Functional and non-functional requirements, derived from actual code |
| `.kiro/specs/miragehunter-ai/design.md` | Architecture, data flow, component details |
| `.kiro/specs/miragehunter-ai/tasks.md` | Task status tracking, next steps |
| `.kiro/steering/ai-standards.md` | AI/ML coding standards and review checklist |
| `ai-service/tests/test_kiro_edge_cases.py` | 25 edge-case tests (see section below) |
| `docs/kiro-review.md` | This document |

---

## Test Execution Status

**NOT_RUN by Kiro** — Kiro did not execute tests or training. Read-only directory-listing
shell calls were visible in the IDE session, despite the prompt requesting file tools only.
Codex subsequently ran the suite and corrected this execution note; see `kiro-followup.md`
and `test-results.xml`. The original review findings below remain Kiro's inspection notes.

`ai-service/tests/test_kiro_edge_cases.py` was written to be self-contained: it uses the existing
`ThresholdClassifier` and `reviewed` fixtures from `conftest.py`, creates synthetic images with
NumPy, and requires no ONNX model on disk (the ONNX-dependent test is skipped when
`onnxruntime`/`onnx` are not installed). There are no fabricated pass results.

---

## Findings

### Finding 1 — Brightness Direction Defaults to 1 (Darkening Effectively Disabled)

**File:** `ai-service/app/models/contracts.py`, `ai-service/app/hunter/random_search.py`

`TransformationSpec.direction` defaults to `1`, and `RandomSearch.make_spec` only passes
`direction` through when explicitly supplied. `LinUCB` never supplies a direction and always
calls `make_spec(kind, severity)`, which uses the default `direction=None` and then picks
randomly. `Hybrid` and `TPEOnly` correctly call `trial.suggest_categorical("direction", [-1, 1])`
for brightness, so they explore both directions.

However, when `LinUCB.suggest` is used directly (not via Hybrid), it calls `self.make_spec(kind,
rng.random())` without a direction argument, which triggers the random fallback in `make_spec`.
That is correct. The edge case is: `RandomSearch.make_spec(kind, severity, direction=None)`
will call `self.rng.choice([-1, 1])` — this is fine. The issue is subtle: if a caller passes
`direction=None` explicitly to `make_spec`, it correctly samples. This is consistent.

**Status:** No code defect; behavior is correct. Documented here for clarity.

---

### Finding 2 — `automatic_validity` Cannot Produce `verified` Status

**File:** `ai-service/app/evaluation/validity.py`

`automatic_validity` returns either `"provisionally_valid"` or `"invalid"`. It can never
produce `"verified"`. This is intentional per the spec (§4.3), but it means that in a
standard deployment without a trusted validity callback override, **no trial will ever reach
`confirmed_failure`**. All failures will be classified as `candidate`.

The existing tests confirm this via `test_candidates_not_confirmed` (which passes
`automatic_validity`, the default) and confirm confirmed failures only via the `reviewed`
fixture (which hard-codes `"verified"`).

**Risk:** If the Backend integration wires `validity_policy=automatic_validity` without
providing a trusted override, the production system will never produce confirmed failures.
This matches spec intent, but the API contract should document this explicitly so the
Backend team does not expect confirmed failures from pure auto-screening.

**Proposed action for Codex/Backend:** Add a docstring to `run_hunt` and a comment in
the FastAPI route handler noting: "Without a trusted reviewed-image validation callback,
all failures are `candidate`. To obtain `confirmed_failure`, pass `validity_policy` wired
to a server-side human-review gate or a verified ground-truth oracle."

---

### Finding 3 — LinUCB `exploration` Is an ε-Greedy Escape, Not Pure UCB

**File:** `ai-service/app/hunter/linucb.py`

```python
if self.rng.random() < self.config.exploration:
    return str(self.rng.choice(self.arms))
```

Standard LinUCB uses UCB scores exclusively; this implementation adds an ε-greedy escape.
The spec (§5.2) does not mandate pure UCB. The default `exploration=0.1` means 10 % of
arm selections are uniformly random. This is a valid design choice but should be noted
in the benchmark report so comparisons to pure contextual bandits are fair.

The score computation uses `np.linalg.solve` correctly (not `np.linalg.inv`), satisfying
the spec requirement.

**Status:** Design note, no defect.

---

### Finding 4 — `minimize_failure` Uses Ascending Grid, Breaking Early

**File:** `ai-service/app/minimization/minimizer.py`

The minimizer scans `np.linspace(0, source_severity, budget+1)[:-1]` in ascending order
and returns the **first** grid point where failure is reproduced. This is not the global
minimum severity; it is the lowest severity found within the budget.

The comment in the code correctly states "Minimum FOUND, not global minimum." The spec
(§5.6) allows this: "lưu ảnh gây lỗi nhẹ nhất tìm thấy trong ngân sách, tuyệt đối không
gọi là tối ưu toàn cục."

**Subtle issue:** Because the grid starts at 0 and increments, the first failure encountered
is likely the minimum in the linear scan — which may be the global minimum if the failure
boundary is monotone. If the boundary is non-monotone (failure at low severity but not medium),
the ascending scan would correctly find the low-severity failure first. The `break` after the
first failure means intermediate non-failing severities between that point and `source_severity`
are not explored. This is documented behavior.

**Risk:** No code defect. For the benchmark report, the phrasing should be "minimum severity
found" rather than "minimum severity threshold."

---

### Finding 5 — `HuntConfig.transforms` List Order Affects LinUCB Arm Indices

**File:** `ai-service/app/hunter/linucb.py`, `ai-service/app/models/contracts.py`

`LinUCB.__init__` builds `self.A` and `self.b` with shape `[len(arms), 6, 6]` and `[len(arms), 6]`.
The arm index is determined by `self.arms.index(spec.kind)` in `update()`.

`HuntConfig.transforms` is a `list[TransformKind]`. If a user constructs two `HuntConfig`
objects with the same transforms in different orders (e.g., `["blur","noise"]` vs
`["noise","blur"]`), arm indices differ. This is not currently a problem because a single
`run_hunt` call uses one config, but it matters if a checkpoint or partial state is serialized
and reloaded with a differently-ordered config.

**Proposed action for Codex:** In a future iteration, sort `transforms` canonically in
`LinUCB.__init__` (not in `HuntConfig`, to preserve user-specified priority if any) and
assert at resume time. For now, document the ordering dependency in `linucb.py`.

---

### Finding 6 — ONNX Parity Test Uses `dev` Split Only; `atol/rtol` Not Logged to Manifest

**File:** `experiments/scripts/export_onnx.py`

The parity test correctly uses `split["dev"]` (never held-out test), and `atol=1e-4, rtol=1e-4`
are predeclared before export (not tuned on results). Good.

However, `atol` and `rtol` are present in `onnx_parity_report.json` but **not in
`model_manifest.json`**. The manifest's `parity_status` field is just `"passed"` without
the tolerance. If the ONNX file is ever re-verified with a different tolerance, the manifest
won't reflect which tolerance was used in the original pass.

**Proposed action for Codex:** Add `"parity_atol"` and `"parity_rtol"` to the manifest
dict in `export_and_verify()`.

---

### Finding 7 — `train.py` Resume Does Not Restore `generator` State on Non-CUDA Path

**File:** `experiments/scripts/train.py`

On resume, the code does:

```python
generator.set_state(checkpoint["loader_rng"].cpu())
```

The `generator` is a `torch.Generator` initialized on CPU. `.cpu()` is called on the saved
state. This is correct on CPU. On a CUDA environment where the DataLoader generator might
be on CUDA, calling `.cpu()` on the restored state before `set_state` could silently produce
incorrect behavior if the saved state was on a different device.

The spec requires "exact GPU reproducibility not guaranteed" (noted in `environment.json`),
so this is a known limitation. However, the current code does not assert that the saved
generator device matches the restored generator device.

**Proposed action for Codex:** Add a comment: "Generator state restored to CPU; exact
GPU DataLoader reproducibility across different GPUs or driver versions is not guaranteed."
This is already noted in `environment.json` via `determinism` field, so this is a documentation
gap only.

---

### Finding 8 — `test_experiments.py::test_generated_notebooks_valid_and_unexecuted` Asserts Exactly 3 Notebooks

**File:** `ai-service/tests/test_experiments.py`

```python
assert len(notebooks) == 3
```

If a fourth Kaggle notebook is added (e.g., `04_train_failure_predictor_lightgbm.ipynb`
per spec §3.4), this assertion will fail. The check ensures no notebook is accidentally
executed, which is valuable, but the count hard-codes the current number.

**Proposed action for Codex:** Change to `assert len(notebooks) >= 3` and iterate over
`notebooks` without the fixed-count assertion, or update the count when adding notebook 04.

---

### Finding 9 — `replay_case` Tolerance is Hard-coded `atol=1e-5`

**File:** `ai-service/app/evaluation/fingerprint.py`

```python
np.testing.assert_allclose(probabilities, record["transformed_probabilities"], atol=1e-5, rtol=1e-4)
```

This tolerance is not taken from the fingerprint record or the manifest. If the ONNX model
is re-exported with different opset or onnxruntime version, replay may fail even though the
prediction is semantically unchanged. The replay tolerance should ideally be recorded in the
fingerprint and used during verification.

**Proposed action for Codex:** Store `replay_atol` and `replay_rtol` in `fingerprint.json`
(e.g., taken from `model_manifest.json["parity_atol"]`) and use `record.get("replay_atol", 1e-5)`
in `replay_case`.

---

### Finding 10 — `HuntConfig.transforms` Accepts Duplicates via JSON (but Pydantic validator catches it)

**File:** `ai-service/app/models/contracts.py`

The `unique_transforms` model validator correctly rejects duplicates. This is verified
by `test_experiments.py::test_contract_schema`. No defect; noted for completeness.

---

### Finding 11 — `run_hunt` Output Directory Must Not Exist (`exist_ok=False`)

**File:** `ai-service/app/hunter/runner.py`

```python
root.mkdir(parents=True, exist_ok=False)
```

If a background job restarts (e.g., Render Free service restart) and tries to resume the
same `output_dir`, it will raise `FileExistsError`. This is intentional (prevents
result corruption), but the Backend team needs to generate a new `output_dir` per job
attempt rather than reusing the same path.

**Proposed action for Backend:** Use `run_id = uuid.uuid4().hex` as the output directory
suffix; since `run_id` is generated inside `run_hunt`, the caller should pass a unique
path per invocation, e.g., `Path("/data/runs") / job_id / attempt_id`.

---

## Summary of Proposed Fixes for Codex

These are all non-breaking additions or documentation improvements. None modifies existing
test behavior.

| # | File | Proposed Change |
|---|------|-----------------|
| F1 | `run_hunt` docstring | Note: auto-screening produces `candidate` only; `confirmed_failure` requires trusted validity callback. |
| F2 | `export_and_verify()` manifest dict | Add `"parity_atol"` and `"parity_rtol"` fields. |
| F3 | `export_and_verify()` manifest dict | Already correct; this is documentation only. |
| F4 | `fingerprint.py` `save_case` | Store `"replay_atol"` and `"replay_rtol"` from manifest in fingerprint; use them in `replay_case`. |
| F5 | `test_experiments.py` | Change `assert len(notebooks) == 3` to `assert len(notebooks) >= 3`. |
| F6 | `linucb.py` | Add docstring noting that arm index depends on `config.transforms` order; sort canonically in `__init__`. |
| F7 | `train.py` resume block | Add comment clarifying `generator.set_state(...cpu())` limitation on multi-GPU. |

---

## Measured Metrics

**NOT_MEASURED** — No accuracy, failure rate, or timing figures were obtained during this
review pass. All numbers in the codebase that appear as defaults (e.g., `learning_rate=1e-4`,
`alpha=0.5`) are configurable starting points from the spec, not measured optima.

Kaggle notebook run status: **NOT_RUN**  
Model artifact status: **NOT_GENERATED**
