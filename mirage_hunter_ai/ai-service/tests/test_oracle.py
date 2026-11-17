import pytest

from app.evaluation.classification_oracle import classify_failure
from app.evaluation.validity import Validity


@pytest.mark.parametrize("truth,base,pred,validity,expected", [
    (0, 0, 1, "verified", "confirmed_failure"),
    (0, 0, 1, "provisionally_valid", "candidate"),
    (None, 0, 1, "verified", "candidate"),
    (None, 0, 0, "verified", "not_failed"),
    (None, 0, 0, "provisionally_valid", "not_failed"),
    (0, 1, 1, "verified", "baseline_incorrect"),
    (0, 0, 1, "invalid", "invalid"),
    (0, 0, 0, "verified", "not_failed"),
    (0, 0, 0, "provisionally_valid", "not_failed"),
])
def test_oracle(truth, base, pred, validity, expected):
    assert classify_failure(truth, base, pred, Validity(validity, "fixture")) == expected


@pytest.mark.parametrize("validity,expected", [
    ("verified", "candidate"), ("provisionally_valid", "candidate"), ("invalid", "invalid"),
])
def test_unlabelled_confidence_change_is_candidate_only(validity, expected):
    assert classify_failure(None, 0, 0, Validity(validity, "fixture"), confidence_changed=True) == expected


def test_labelled_correct_prediction_is_not_failure_after_confidence_change():
    assert classify_failure(0, 0, 0, Validity("verified", "fixture"), confidence_changed=True) == "not_failed"
