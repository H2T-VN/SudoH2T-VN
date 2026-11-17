import numpy as np
import pytest

from app.evaluation.validity import Validity
from app.models.onnx_classifier import DEFAULT_PREPROCESSING


class ThresholdClassifier:
    """Synthetic unit-test fixture; NEVER used as trained model or benchmark result."""
    model_id = "fixture-threshold"
    model_sha256 = "fixture-not-a-real-model"
    class_names = ["dark", "bright"]
    preprocessing = DEFAULT_PREPROCESSING

    def __init__(self):
        self.calls = 0

    def predict(self, image):
        self.calls += 1
        return np.array([0.9, 0.1] if image.mean() < 128 else [0.1, 0.9], dtype=np.float32)


@pytest.fixture
def image():
    return np.full((30, 42, 3), 120, dtype=np.uint8)


@pytest.fixture
def model():
    return ThresholdClassifier()


def reviewed(original, changed, spec):
    return Validity("verified", "synthetic_fixture_review_only")
