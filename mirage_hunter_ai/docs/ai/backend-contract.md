# AI library integration proposal

No existing backend contract was present when this module was created. This is a
proposal for the backend owner to integrate, not an implemented HTTP service.

```python
from app.models.onnx_classifier import OnnxClassifier
from app.models.contracts import HuntConfig
from app.hunter.runner import run_hunt

model = OnnxClassifier("/trusted/artifacts")
config = HuntConfig(model_id=model.model_id, dataset_id="demo-v1",
                    strategy="hybrid", max_queries=20, seed=42)
result = run_hunt(images, labels, model, config, "/new/run/output",
                  source_ids=image_ids,
                  progress=lambda done, total: update_progress(done, total),
                  cancelled=lambda: job_cancelled())
payload = result.model_dump()
```

`images`: list of RGB uint8 NumPy H×W×3 arrays. `labels`: contiguous class indices or
None. `source_ids` must be unique strings aligned with images. Each run creates its
output directory; reusing an existing directory raises an error. No FastAPI imports
or database writes are embedded in the engine.

Suggested endpoints: POST `/api/hunts` accepts `HuntConfig` and returns a job ID;
GET `/api/hunts/{id}` returns progress/status; GET `/api/hunts/{id}/results` returns
`HuntResult`; export endpoint serves only artifacts inside that job's directory.
The backend must choose final paths and enforce allowlisted model/dataset IDs.

`HuntConfig.model_json_schema()` and `HuntResult.model_json_schema()` are executable
JSON schemas. `tools/export_schemas.py` writes copies to `docs/schemas/`.
Unknown request fields and duplicate transformations are rejected.
Legacy demo artifact loading requires the ONNX file, class mapping, preprocessing, manifest and
the hash-verified passed parity report (at least 20 samples).

## Controlled custom-classification extension

The new AI-only contract is [custom-classification.md](custom-classification.md).
The backend may dispatch an operator-reviewed bundle with
`app.models.configurable_classifier.load_classifier(path, trusted_local=True)`.
New-format bundles contain `model.onnx` and `model_manifest.json` with explicit
preprocessing, output kind and ordered classes. The manifest schema is exported
to `docs/schemas/` by `tools/export_schemas.py`.

`load_labelled_dataset` accepts bounded JPEG/PNG images and class-name CSV labels.
`evaluate_baseline` returns clean classification metrics and predictions.
`app.pipelines.classification.run_classification` combines them with the existing Hunter
for small local checks (at most 30 search queries). Clean evaluation and hunt
baseline are separate passes and included in its total inference count.
For asynchronous jobs the backend owns orchestration around these library calls;
the existing runner progress/cancellation callbacks remain available.

The wrapper now accepts `dataset_id`, `progress(event)` and `cancelled()`.
Progress phases cover preparing, baseline, hunt_baseline, hunting and finished.
The runner additionally accepts `baseline_progress(done, total)`. Cancellation of
clean evaluation raises `EvaluationCancelled` and publishes no complete metrics;
hunt cancellation returns a partial report with its explicit status. Callbacks
cannot interrupt native inference mid-call. The concrete FE/BE checklist, proposed
request schema, worker example and real library samples are in
[fe-be-integration.md](fe-be-integration.md). These are not deployed HTTP endpoints.

The operator trust flag is not a request field or a sandbox. The service must
decide model approval through its own registry. Public arbitrary-model upload,
worker isolation/resource limits and HTTP endpoints remain NOT_IMPLEMENTED here.
The new adapter validates its graph/metadata but does not claim native-vs-ONNX
parity for a user's model; the operator must obtain that evidence separately.

## Ownership and limits

Backend owns job queue, single-flight inference or concurrency limits, upload size and
pixel limits, timeout, cancellation, authentication, CORS and persistent storage.
Use a new attempt directory on a restarted job, for example `/data/runs/{job_id}/{attempt_id}`;
the library does not resume an existing hunt output directory after a service restart.
CPU inference is synchronous library code: run it outside the async event loop.
Never expose arbitrary local output/artifact paths as request parameters.
No .pt/.pkl uploads or user-provided executable validity callbacks.

`max_queries` counts every transformed-image inference invocation, including errors
and invalid images. Baseline inference and minimization have separate counters;
`total_target_inferences` includes all three. Warm-up is inside max_queries.
No technical-error feedback updates the policies.

Default `automatic_validity` can reject damaged images or return provisionally_valid.
A trusted `validity_policy(original, transformed, spec)` may return `Validity('verified',
reason)` only when semantic preservation was reviewed for those exact pixels and model
task. A browser-supplied `verified=true` must never be accepted as proof.

Reports expose proxy feedback explicitly. A confidence drop can guide search, but
ground truth and review govern confirmed failure status.

For unlabelled images, `candidate` requires a changed top-1 prediction or an absolute
change in top-1 confidence greater than `1e-5`. The delta, threshold and change flag
are recorded in each successful trial. An unchanged observation is `not_failed`, meaning
no observed change, not proof that an unlabelled prediction is correct. No unlabelled
trial trains the search policy or enters the denominator of `confirmed_failure_rate`;
that rate is null when no reviewed, labelled, baseline-correct trials are available.
Labelled benchmark oracle behavior is unchanged.

Replay from the installed AI environment:

```powershell
python -m app.pipelines.replay --case "path/to/run/trial-000001" --artifacts "path/to/trusted/artifacts"
python -m pytest "path/to/run/trial-000001/test_regression.py"
```

Set `MIRAGEHUNTER_ARTIFACT_DIR` before running an exported regression test.
For a reviewed new-format model, replay additionally requires
`--trusted-local-model`; exported regression tests use
`MIRAGEHUNTER_TRUSTED_LOCAL_MODEL=1`. Legacy demo replay remains compatible.
