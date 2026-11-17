# MirageHunter AI — Task Status

_Tracks implementation tasks from §10 of the spec. Status reflects code present in
the repository at time of Kiro review. No training has been run; Kaggle artifact
status is NOT_GENERATED._

---

## Completed Tasks

### AI-01 — Survey and Contract ✅
- Repository covers the AI modules and experiment pipeline planned in spec §7.
- Python contract (`ClassifierAdapter`, `HunterStrategy`, `TransformationSpec`,
  `HuntConfig`) defined in `backend/app/models/contracts.py` and `backend/app/hunter/base.py`.
- No breaking changes to existing files; `frontend/` and `.kiro/` untouched by Codex.

### AI-02 — Kaggle Training Notebook ✅ (code complete, NOT_RUN)
- `experiments/kaggle/01_train_mobilenetv3_imagenette.ipynb` — full training loop,
  stratified split, resume support, metrics, all mandatory artifacts.
- `experiments/configs/train_mobilenetv3.yaml` — configurable epochs/batch/LR.
- `experiments/scripts/train.py` — importable entry point; `require_kaggle()` guard.
- **Notebook execution status: NOT_RUN** — awaiting user to run on Kaggle with GPU.

### AI-03 — ONNX Export and CPU Adapter ✅ (code complete, NOT_RUN on Kaggle)
- `experiments/kaggle/02_export_verify_onnx.ipynb` — export, parity test (≥20 dev images), manifest.
- `experiments/scripts/export_onnx.py` — importable; `require_kaggle()` guard.
- `backend/app/models/onnx_classifier.py` — `OnnxClassifier` with SHA256 verification.
- **Artifact status: NOT_GENERATED** — requires Notebook 01 output.

### AI-04 — Transformations and Oracle ✅
- `backend/app/transforms/image_corruptions.py` — 4 transforms, `physical_parameters`, `check_image`.
- `backend/app/evaluation/classification_oracle.py` — 5-state `classify_failure`.
- `backend/app/evaluation/validity.py` — `Validity` dataclass, `automatic_validity`.
- Tests: `backend/tests/test_transforms.py`, `backend/tests/test_oracle.py`.

### AI-05 — Baselines ✅
- `backend/app/hunter/random_search.py` — `RandomSearch`.
- `backend/app/hunter/tpe_search.py` — `TPEOnly` with ask/tell.
- Tests: `backend/tests/test_hunter.py` (budget, determinism, oracle correctness).

### AI-06 — LinUCB and Hybrid ✅
- `backend/app/hunter/context.py` — `extract_context`, `FEATURE_VERSION`.
- `backend/app/hunter/linucb.py` — `LinUCB` with ε-greedy, `np.linalg.solve`.
- `backend/app/hunter/hybrid.py` — `Hybrid` + `create_strategy` factory.
- Tests: `test_hunter.py::test_linucb_numeric_update_and_invalid_feedback`,
  `test_hunter.py::test_schedule_same_across_strategies`.

### AI-07 — Minimization and Fingerprint ✅
- `backend/app/hunter/minimizer.py` — ascending grid, budget-tracked, no monotonicity assumption.
- `backend/app/evaluation/fingerprint.py` — `save_case`, `replay_case`, `pixel_hash`.
- `backend/app/replay.py` — CLI replay tool.
- Tests: `test_hunter.py::test_minimization_cost`.

### AI-08 — Kaggle Benchmark ✅ (code complete, NOT_RUN)
- `experiments/kaggle/03_hunter_benchmark.ipynb` — 4 strategies × N seeds.
- `experiments/scripts/benchmark.py` — importable; `require_kaggle()` guard.
- `experiments/configs/benchmark.yaml` — configurable seeds, queries, strategies.
- **Benchmark status: NOT_RUN** — requires Notebooks 01 and 02 to have produced artifacts.

### AI-09 — Backend Integration ✅ (interface complete, integration not tested end-to-end)
- `run_hunt` is a pure-Python function; no FastAPI imports.
- `HuntResult` Pydantic model provides the response schema.
- `GET /health`, job routing, and async queue remain with the Backend team.
- Payload schema documented in spec §6.2 and in `contracts.py`.

---

## Pending Tasks

### AI-10 — Advanced Extensions (not started, not blocking MVP)
- LightGBM failure predictor (requires sufficient confirmed-failure logs from live hunts).
- YOLOv8n-OBB integration with rotated-box matching.
- Both gated by feature flags and require dedicated benchmarks.

---

## Kiro-Added Tasks

### KT-01 — Edge-case test suite ✅
- `backend/tests/test_kiro_edge_cases.py` — created by this Kiro review pass.
- Tests were NOT_RUN by Kiro at creation. Codex subsequently executes them; see
  `docs/test-results.xml` and `docs/kiro-followup.md` for validation and fixes.

### KT-02 — Specs and steering ✅
- `.kiro/specs/miragehunter-ai/requirements.md` — created.
- `.kiro/specs/miragehunter-ai/design.md` — created.
- `.kiro/specs/miragehunter-ai/tasks.md` — this file.
- `.kiro/steering/ai-standards.md` — created.

### KT-03 — Review document ✅
- `docs/kiro-review.md` — findings, proposed fixes (for Codex to apply), file list.

---

## Measured Metrics

**NOT_MEASURED** — All accuracy, failure-rate, and timing figures await actual Kaggle runs.

---

## Next Actions for Team

1. Run `01_train_mobilenetv3_imagenette.ipynb` on Kaggle (GPU recommended).
2. Run `02_export_verify_onnx.ipynb` using the checkpoint from step 1.
3. Run `03_hunter_benchmark.ipynb` using the ONNX artifact from step 2.
4. Place the verified ONNX artifact bundle in backend deployment environment.
5. Coordinate with Backend team on `POST /api/hunts` async job contract.
6. Apply proposed fixes from `docs/kiro-review.md` (Codex or Backend team).
7. Run `python -m pytest -q` after any source changes (locally executable tests only).
