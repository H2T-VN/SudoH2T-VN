import numpy as np
import pytest
from pydantic import ValidationError

from app.models.contracts import TRANSFORMS, TransformationSpec
from app.transforms.image_corruptions import transform_image


@pytest.mark.parametrize("kind", TRANSFORMS)
def test_determinism_and_identity(kind):
    original = np.random.default_rng(42).integers(0, 256, (45, 61, 3), dtype=np.uint8)
    before = original.copy()
    spec = TransformationSpec(kind=kind, severity=0.6, seed=23)
    first, second = transform_image(original, spec), transform_image(original, spec)
    np.testing.assert_array_equal(first, second)
    np.testing.assert_array_equal(original, before)
    np.testing.assert_array_equal(transform_image(original, spec.model_copy(update={"severity": 0})), original)
    assert first.shape == original.shape and first.dtype == np.uint8
    assert not np.shares_memory(first, original)


@pytest.mark.parametrize("severity", [-0.01, 1.01, float("nan"), float("inf")])
def test_reject_bad_severity(severity):
    with pytest.raises(ValidationError):
        TransformationSpec(kind="blur", severity=severity, seed=1)


@pytest.mark.parametrize("bad", [np.zeros((3, 3)), np.zeros((3, 3, 4), dtype=np.uint8)])
def test_bad_image(bad):
    with pytest.raises(ValueError):
        transform_image(bad, TransformationSpec(kind="blur", severity=0.5, seed=1))
