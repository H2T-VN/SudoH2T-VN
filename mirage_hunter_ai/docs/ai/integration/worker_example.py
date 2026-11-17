"""AI call example only. Backend owner provides registry, queue, auth and job store.

Validate the request with classification-job-request.schema.json before this call.
Run in a worker process with appropriate resource limits, not an HTTP event loop.
No job lifecycle implementation or HTTP integration is claimed by this example.
"""
from app.pipelines.classification import run_classification


def call_ai(*, approved_model, registered_dataset, new_attempt_dir, request,
            save_progress, is_cancelled):
    # Both records are backend-owned and resolved after access checks, never client paths.
    if approved_model["approval_status"] != "approved":
        raise ValueError("Model requires operator approval")
    allowed = {"model_id", "dataset_id", "strategy", "max_queries", "seed"}
    if set(request) - allowed:
        raise ValueError("Unsupported MVP request fields")
    if request["model_id"] != approved_model["model_id"]:
        raise ValueError("Model registry mismatch")
    if request["dataset_id"] != registered_dataset["dataset_id"]:
        raise ValueError("Dataset registry mismatch")
    return run_classification(
        approved_model["artifact_dir"], registered_dataset["directory"], new_attempt_dir,
        trusted_local=True, dataset_id=registered_dataset["dataset_id"],
        strategy=request.get("strategy", "hybrid"), queries=request["max_queries"],
        seed=request.get("seed", 42), progress=save_progress, cancelled=is_cancelled,
    )


# Catch app.evaluation.baseline.EvaluationCancelled in the worker to mark cancelled;
# never publish incomplete baseline metrics. Other exceptions mark failed.
# On return inspect report['status']; 'finished' progress does not imply completed.
# Callback persistence should not raise; cancellation is cooperative between calls.
