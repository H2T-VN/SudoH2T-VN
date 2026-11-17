# AI/ML Standards for MirageHunter

These standards apply to every file under `backend/app/`, `backend/tests/`,
`experiments/scripts/`, and `experiments/kaggle/`. Read them before writing or
reviewing AI/ML code.

---

## Integrity and Honesty

- **Never fabricate metrics.** Accuracy numbers, failure rates, timing figures, and
  Kaggle run logs must come from actual execution. Placeholders must say `NOT_MEASURED`
  or `NOT_RUN` explicitly.
- **Never mark unexecuted notebooks as executed.** Kaggle notebooks stay `NOT_RUN`
  until a user has run them and can link the output version.
- **Distinguish `example` from `measured`.** Code comments and docs must be clear
  about which numbers are illustrative defaults and which are measured results.

## Failure Oracle Discipline

- `confirmed_failure` requires all four conditions: ground truth present, baseline
  prediction correct, transform validity `verified`, and post-transform prediction wrong.
- Automatic heuristics (`automatic_validity`) produce `provisionally_valid` and yield
  `candidate` status at best — never `confirmed`.
- `baseline_incorrect` images are excluded from the hunt schedule and from all
  failure counts. Report them separately.
- Do not learn rewards/scores from invalid or error trials. Call
  `strategy.update(..., valid=False)`: LinUCB A/b remain unchanged; Optuna must
  close the pending trial as FAIL (bookkeeping changes, learned observations do not).

## Query Budget Accounting

- `max_queries` counts **target inferences on transformed images only**.
- Track and report three separate counters: `baseline_queries`, `actual_queries`
  (hunt trial inferences), `minimization_queries`.
- `total_target_inferences` = sum of all three.
- Inference errors still consume a query. Never retry within budget without counting.

## Reproducibility

- Every `TransformationSpec` must fully determine pixel output for deterministic
  transforms, and seed the RNG for stochastic ones (`noise`).
- The schedule RNG must be independent from strategy RNGs so the trial order is
  strategy-agnostic.
- Pin library versions in `requirements-ai.txt` for the web runtime and in
  `experiments/requirements-kaggle.txt` for training. Replay failures across
  environments are possible; document them. `docs/requirements-tested.txt` records
  the exact local test environment; Kaggle runs must record their actual versions.

## Validity Screening

- Do not use ground-truth labels as hunter input features.
- Do not use post-transform predictions as input to the action-selection step
  that produced them (data leakage).
- Label transform outputs `provisionally_valid` when only automatic screens have
  been applied. Semantic label preservation requires review for the exact
  transformed pixels. A correct clean baseline alone cannot prove preservation.

## Deployment Safety

- Deployed backend uses ONNX Runtime CPU only. No PyTorch, Ultralytics, or large
  training dependencies in the production image.
- `OnnxClassifier` must verify SHA256 of every artifact file before loading.
- Never accept a browser-supplied `verified=True` boolean. Validity state must come
  from a trusted server-side function.
- `model_id` and `dataset_id` are allowlisted server-side; never taken verbatim from
  user input without validation.

## Kaggle Workflow

- Heavy training, ONNX export, and benchmark runs happen exclusively on Kaggle.
  `require_kaggle()` from `experiments/scripts/common.py` enforces this.
- Do not commit dataset files or `.pth` checkpoints to the repository.
  Reference artifacts by SHA256 and provide fetch instructions.
- Datasets are split as: `train/ → train+dev` (stratified, seed 42); `val/ → held-out test`.
  The held-out set must not influence hyperparameter tuning, reward shaping, or
  LightGBM training.
- The `classification_metrics.json` existence guard in `train.py` prevents accidental
  double test-set evaluation. Respect it.

## Code Style

- Pure-Python AI library: `run_hunt` and all hunter classes must import nothing from
  `fastapi`, `sqlalchemy`, `celery`, or any web framework.
- Use `np.linalg.solve` instead of `np.linalg.inv` in LinUCB for numerical stability.
- Use Pydantic `BaseModel` with `extra="forbid"` for all public data contracts.
- Use `allow_inf_nan=False` on numeric Pydantic fields to catch NaN/inf early.
- Tests that require Kaggle must call `require_kaggle()` or be marked `skip` on
  non-Kaggle environments.

## Review Checklist

Before merging any AI/ML change, verify:

- [ ] No fabricated numbers in comments, docstrings, or JSON fixtures.
- [ ] `confirmed_failure` paths require `validity.status == "verified"`.
- [ ] Query counters updated correctly for error/invalid/valid paths.
- [ ] Strategy `update(valid=False)` leaves LinUCB A/b unchanged and closes Optuna
      pending trials as FAIL without learning invalid rewards/scores.
- [ ] Parity test samples ≥20, tolerance predeclared before export.
- [ ] New transforms preserve shape, dtype, and do not mutate input.
- [ ] `python -m pytest -q` passes on locally executable tests.
- [ ] `ruff check backend experiments tools` passes without new errors.
