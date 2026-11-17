from app.evaluation.validity import Validity


CONFIDENCE_CHANGE_ATOL = 1e-5


def classify_failure(ground_truth, baseline_pred, transformed_pred, validity: Validity, *, confidence_changed=False):
    """Unlabelled candidates require an observed change; not_failed does not establish correctness."""
    if validity.status == "invalid":
        return "invalid"
    if ground_truth is None:
        return "candidate" if baseline_pred != transformed_pred or confidence_changed else "not_failed"
    if baseline_pred != ground_truth:
        return "baseline_incorrect"
    if transformed_pred == ground_truth:
        return "not_failed"
    if validity.status == "verified":
        return "confirmed_failure"
    return "candidate"
