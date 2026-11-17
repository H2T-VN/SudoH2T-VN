import numpy as np

from app.evaluation.classification_oracle import classify_failure
from app.evaluation.fingerprint import pixel_hash
from app.models.contracts import check_probabilities
from app.transforms.image_corruptions import physical_parameters, transform_image


def minimize_failure(original, record, model, validity_policy, budget, cancelled=None):
    """Ascending grid, no monotonicity assumption. Minimum FOUND, not global minimum."""
    from app.models.contracts import TransformationSpec
    best = record.copy()
    queries, errors = 0, []
    if budget <= 0 or record["ground_truth"] is None:
        return best, None, queries, errors
    source_spec = TransformationSpec(**record["transform"])
    best_image = None
    for severity in np.linspace(0, source_spec.severity, budget + 1)[:-1]:
        if cancelled and cancelled():
            break
        spec = source_spec.model_copy(update={"severity": float(severity)})
        changed = transform_image(original, spec)
        validity = validity_policy(original, changed, spec)
        if validity.status == "invalid":
            continue
        queries += 1
        try:
            p = check_probabilities(model.predict(changed), len(model.class_names))
        except Exception as exc:
            errors.append({"severity": float(severity), "error": str(exc)})
            continue
        status = classify_failure(record["ground_truth"], record["original_pred"], int(p.argmax()), validity)
        if int(p.argmax()) != record["ground_truth"] and status in ("candidate", "confirmed_failure"):
            # A confirmed case cannot be replaced with an unverified candidate.
            if record["failure_status"] == "confirmed_failure" and status != "confirmed_failure":
                continue
            best = {**record, "transform": spec.model_dump(), "severity": float(severity),
                    "physical_parameters": physical_parameters(spec), "image_sha256": pixel_hash(changed),
                    "transformed_pred": int(p.argmax()), "transformed_probabilities": p.tolist(),
                    "transformed_conf": float(p.max()), "failure_status": status,
                    "validity_status": validity.status, "validity_reason": validity.reason,
                    "margin": float(np.max(np.delete(p, record["ground_truth"])) - p[record["ground_truth"]])}
            best_image = changed
            break  # All earlier sampled severities were evaluated; unsampled regions remain unknown.
    return best, best_image, queries, errors
