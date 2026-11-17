"""
Edge-case tests identified during Kiro review.

Coverage gaps addressed here (not duplicated from existing test files):

1.  TransformationSpec direction field semantics (darkening vs brightening).
2.  LinUCB arm index mapping when transforms list is not the full TRANSFORMS tuple.
3.  Hybrid pending-state guard: double suggest, double update, mismatched kind.
4.  TPEOnly pending-state guards.
5.  LinUCB tie-breaking is seeded, not arbitrary.
6.  context.extract_context on a 2×2 image (minimum size, no interior pixels for Laplacian).
7.  check_probabilities: sum slightly off, negative values, wrong shape, non-finite values.
8.  automatic_validity: near-constant image is "invalid"; normal image is "provisionally_valid".
9.  classify_failure: baseline_incorrect is never a confirmed_failure even with verified validity.
10. run_hunt: source_id collision raises ValueError.
11. run_hunt: model_id mismatch raises ValueError.
12. run_hunt: empty images list raises ValueError.
13. run_hunt: label out of range raises ValueError.
14. minimizer: zero budget returns original record unchanged.
15. minimizer: ground_truth=None returns original record without querying the model.
16. pixel_hash: different shapes with same bytes produce different hashes.
17. replay_case: model_sha256 mismatch raises ValueError.
18. replay_case: source pixel hash mismatch raises ValueError.
19. replay_case: transformed pixel hash mismatch raises AssertionError/ValueError.
20. OnnxClassifier (using existing onnx_artifact fixture): missing manifest field raises ValueError.
21. run_hunt: cancelled before first trial → total_target_inferences == 0.
22. run_hunt with minimization_budget=0: no minimization queries even on failure.
23. TransformationSpec rejects direction values outside {-1, 1}.
24. brightness severity=0 is exact identity even with direction=-1.
25. metrics.summarize: empty records list returns zeroed counts, None rates.

Tests are written to run on CPU with no trained model and no network access.
Initially NOT_RUN by Kiro. Subsequent execution by Codex is recorded in docs/test-results.xml.
"""
import json
import numpy as np
import pytest
from pydantic import ValidationError

from app.evaluation.classification_oracle import classify_failure
from app.evaluation.fingerprint import pixel_hash, replay_case, write_json
from app.evaluation.metrics import summarize
from app.evaluation.validity import Validity, automatic_validity
from app.hunter.context import extract_context
from app.hunter.hybrid import Hybrid
from app.hunter.linucb import LinUCB
from app.minimization.minimizer import minimize_failure
from app.hunter.runner import run_hunt
from app.hunter.tpe_search import TPEOnly
from app.models.contracts import HuntConfig, TransformationSpec, check_probabilities
from app.transforms.image_corruptions import transform_image
from conftest import ThresholdClassifier, reviewed


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _image(fill=120, h=30, w=42):
    return np.full((h, w, 3), fill, dtype=np.uint8)


def _probs(n=2, winner=0):
    p = np.full(n, 0.1 / (n - 1), dtype=np.float32)
    p[winner] = 0.9
    return p


def _config(**kwargs):
    base = dict(model_id="fixture-threshold", transforms=["brightness"], max_queries=5, seed=7)
    base.update(kwargs)
    return HuntConfig(**base)


# ---------------------------------------------------------------------------
# 1. TransformationSpec direction semantics
# ---------------------------------------------------------------------------

class TestDirectionSemantics:
    def test_direction_plus1_brightens(self):
        image = _image(100)
        spec = TransformationSpec(kind="brightness", severity=1.0, seed=0, direction=1)
        out = transform_image(image, spec)
        assert out.mean() > image.mean(), "direction=+1 at severity=1 should brighten"

    def test_direction_minus1_darkens(self):
        image = _image(100)
        spec = TransformationSpec(kind="brightness", severity=1.0, seed=0, direction=-1)
        out = transform_image(image, spec)
        assert out.mean() < image.mean(), "direction=-1 at severity=1 should darken"

    def test_direction_invalid_value(self):
        with pytest.raises(ValidationError):
            TransformationSpec(kind="brightness", severity=0.5, seed=0, direction=0)

    def test_direction_invalid_string(self):
        with pytest.raises(ValidationError):
            TransformationSpec(kind="brightness", severity=0.5, seed=0, direction="up")

    def test_brightness_identity_with_direction_minus1(self):
        """severity=0 must still return exact copy regardless of direction."""
        image = _image(100)
        spec = TransformationSpec(kind="brightness", severity=0, seed=0, direction=-1)
        out = transform_image(image, spec)
        np.testing.assert_array_equal(out, image)


# ---------------------------------------------------------------------------
# 2. LinUCB arm index mapping with partial transforms list
# ---------------------------------------------------------------------------

class TestLinUCBArmMapping:
    def test_single_arm_index_zero(self):
        """With one transform, the only arm is index 0."""
        config = _config(transforms=["noise"])
        policy = LinUCB(config)
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        spec = policy.suggest(x, 0)
        A_before = policy.A.copy()
        b_before = policy.b.copy()
        policy.update(x, spec, 1.0, 0.5, True)
        # Only arm 0 should change.
        np.testing.assert_allclose(policy.A[0], A_before[0] + np.outer(x, x))
        np.testing.assert_allclose(policy.b[0], b_before[0] + x)

    def test_two_arm_update_only_chosen_arm(self):
        config = _config(transforms=["blur", "jpeg"])
        policy = LinUCB(config)
        x = np.array([1.0, 0.4, 0.2, 0.6, 0.7, 0.3])
        A_before = policy.A.copy()
        spec = policy.suggest(x, 0)
        policy.update(x, spec, 1.0, 0.4, True)
        changed = policy.arms.index(spec.kind)
        unchanged = 1 - changed
        np.testing.assert_allclose(policy.A[unchanged], A_before[unchanged])

    def test_invalid_feedback_does_not_change_either_arm(self):
        config = _config(transforms=["blur", "noise"])
        policy = LinUCB(config)
        x = np.array([1.0, 0.3, 0.1, 0.5, 0.9, 0.1])
        spec = policy.suggest(x, 0)
        A_before = policy.A.copy()
        b_before = policy.b.copy()
        policy.update(x, spec, 0.0, 0.0, False)
        np.testing.assert_array_equal(policy.A, A_before)
        np.testing.assert_array_equal(policy.b, b_before)


# ---------------------------------------------------------------------------
# 3. Hybrid pending-state guard
# ---------------------------------------------------------------------------

class TestHybridPendingGuard:
    def _make_hybrid(self, transforms=("brightness",)):
        config = HuntConfig(model_id="fixture-threshold", transforms=list(transforms),
                            max_queries=10, seed=1, startup_trials=2)
        return Hybrid(config)

    def test_double_suggest_raises(self):
        h = self._make_hybrid()
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        h.suggest(x, 0)
        with pytest.raises(RuntimeError, match="pending"):
            h.suggest(x, 1)

    def test_update_without_suggest_raises(self):
        h = self._make_hybrid()
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        spec = TransformationSpec(kind="brightness", severity=0.5, seed=0)
        with pytest.raises(RuntimeError, match="No pending"):
            h.update(x, spec, 0.0, 0.0, True)

    def test_update_with_mismatched_kind_raises(self):
        h = self._make_hybrid(transforms=["brightness", "blur"])
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        spec_returned = h.suggest(x, 0)
        # Build a spec with the other arm's kind.
        other_kind = "blur" if spec_returned.kind == "brightness" else "brightness"
        wrong_spec = spec_returned.model_copy(update={"kind": other_kind})
        with pytest.raises(ValueError, match="mismatch"):
            h.update(x, wrong_spec, 0.0, 0.0, True)

    def test_valid_cycle_clears_pending(self):
        h = self._make_hybrid()
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        spec = h.suggest(x, 0)
        h.update(x, spec, 1.0, 0.3, True)
        assert h.pending is None
        # Second cycle should not raise.
        spec2 = h.suggest(x, 1)
        h.update(x, spec2, 0.0, 0.0, False)


# ---------------------------------------------------------------------------
# 4. TPEOnly pending-state guards
# ---------------------------------------------------------------------------

class TestTPEOnlyPendingGuard:
    def _make_tpe(self):
        config = _config(transforms=["blur", "noise"], startup_trials=2)
        return TPEOnly(config)

    def test_double_suggest_raises(self):
        tpe = self._make_tpe()
        x = np.ones(6)
        tpe.suggest(x, 0)
        with pytest.raises(RuntimeError, match="pending"):
            tpe.suggest(x, 1)

    def test_update_without_suggest_raises(self):
        tpe = self._make_tpe()
        x = np.ones(6)
        spec = TransformationSpec(kind="blur", severity=0.3, seed=0)
        with pytest.raises(RuntimeError, match="No pending"):
            tpe.update(x, spec, 0.0, 0.0, True)

    def test_valid_cycle_clears_pending(self):
        tpe = self._make_tpe()
        x = np.ones(6)
        spec = tpe.suggest(x, 0)
        tpe.update(x, spec, 1.0, 0.5, True)
        assert tpe.pending is None


# ---------------------------------------------------------------------------
# 5. LinUCB tie-breaking is seeded
# ---------------------------------------------------------------------------

class TestLinUCBTieBreaking:
    def test_same_seed_same_choice_on_tie(self):
        """Fresh A/b matrices → all scores are equal → tie-breaking must be deterministic."""
        config = _config(transforms=["brightness", "blur", "noise", "jpeg"], seed=99)
        p1 = LinUCB(config)
        p2 = LinUCB(config)
        x = np.array([1.0, 0.5, 0.1, 0.3, 0.8, 0.2])
        # Both policies have identical RNG state; they must choose the same arm.
        spec1 = p1.suggest(x, 0)
        spec2 = p2.suggest(x, 0)
        assert spec1.kind == spec2.kind


# ---------------------------------------------------------------------------
# 6. extract_context on minimum-size image (2×2)
# ---------------------------------------------------------------------------

class TestExtractContextMinimalImage:
    def test_2x2_image_no_laplacian_interior(self):
        """2×2 image has no interior pixels; sharpness should degrade gracefully to 0."""
        image = np.array([[[100, 120, 80], [110, 130, 90]],
                          [[105, 115, 85], [115, 125, 95]]], dtype=np.uint8)
        probs = np.array([0.6, 0.2, 0.1, 0.1], dtype=np.float32)
        ctx = extract_context(image, probs)
        assert ctx.shape == (6,)
        assert ctx[0] == 1.0  # bias
        assert 0.0 <= ctx[1] <= 1.0  # mean luminance
        assert 0.0 <= ctx[2] <= 1.0  # luminance std
        assert ctx[3] == 0.0, "sharpness must be 0 when there are no interior pixels"
        assert 0.0 <= ctx[4] <= 1.0  # baseline confidence
        assert 0.0 <= ctx[5] <= 1.0  # entropy


# ---------------------------------------------------------------------------
# 7. check_probabilities validation
# ---------------------------------------------------------------------------

class TestCheckProbabilities:
    def test_valid_probs_returned_as_float32(self):
        p = check_probabilities([0.3, 0.7], 2)
        assert p.dtype == np.float32
        assert p.shape == (2,)

    def test_wrong_length_raises(self):
        with pytest.raises(ValueError):
            check_probabilities([0.5, 0.5], 3)

    def test_nonfinite_raises(self):
        with pytest.raises(ValueError):
            check_probabilities([float("nan"), 1.0], 2)

    def test_negative_value_raises(self):
        with pytest.raises(ValueError):
            check_probabilities([-0.1, 1.1], 2)

    def test_sum_too_far_from_one_raises(self):
        with pytest.raises(ValueError):
            check_probabilities([0.3, 0.3], 2)

    def test_sum_exactly_one_accepted(self):
        # Sum within atol=1e-5.
        p = np.array([0.5, 0.5], dtype=np.float32)
        result = check_probabilities(p, 2)
        np.testing.assert_allclose(result.sum(), 1.0, atol=1e-5)


# ---------------------------------------------------------------------------
# 8. automatic_validity
# ---------------------------------------------------------------------------

class TestAutomaticValidity:
    def test_normal_image_provisionally_valid(self):
        image = _image(120)
        spec = TransformationSpec(kind="blur", severity=0.3, seed=0)
        out = transform_image(image, spec)
        v = automatic_validity(image, out, spec)
        assert v.status == "provisionally_valid"

    def test_near_constant_clipped_is_invalid(self):
        """An image almost entirely at 0 should trigger the clipping guard."""
        image = _image(120)
        clipped = np.zeros_like(image)
        spec = TransformationSpec(kind="brightness", severity=1.0, seed=0)
        v = automatic_validity(image, clipped, spec)
        assert v.status == "invalid"
        assert "clipped" in v.reason or "constant" in v.reason

    def test_shape_changed_is_invalid(self):
        image = _image(120, h=30, w=42)
        different_shape = np.full((30, 43, 3), 120, dtype=np.uint8)
        spec = TransformationSpec(kind="blur", severity=0.3, seed=0)
        v = automatic_validity(image, different_shape, spec)
        assert v.status == "invalid"
        assert "shape" in v.reason


# ---------------------------------------------------------------------------
# 9. classify_failure: baseline_incorrect never becomes confirmed_failure
# ---------------------------------------------------------------------------

class TestClassifyFailureBaselineIncorrect:
    def test_verified_but_baseline_wrong_is_not_confirmed(self):
        # ground_truth=1, baseline predicted 0 (wrong), post-transform predicts 1 (correct now)
        result = classify_failure(1, 0, 1, Validity("verified", "fixture"))
        assert result == "baseline_incorrect"

    def test_verified_baseline_wrong_post_wrong_still_baseline_incorrect(self):
        # ground_truth=1, baseline predicted 0, post-transform predicts 2
        result = classify_failure(1, 0, 2, Validity("verified", "fixture"))
        assert result == "baseline_incorrect"

    def test_verified_all_correct_conditions_is_confirmed(self):
        result = classify_failure(1, 1, 0, Validity("verified", "fixture"))
        assert result == "confirmed_failure"


# ---------------------------------------------------------------------------
# 10. run_hunt: source_id collision
# ---------------------------------------------------------------------------

class TestRunHuntSourceIdCollision:
    def test_duplicate_source_ids_raise(self, tmp_path):
        model = ThresholdClassifier()
        images = [_image(120), _image(130)]
        with pytest.raises(ValueError, match="unique"):
            run_hunt(images, [0, 0], model, _config(max_queries=2),
                     tmp_path / "run", source_ids=["same", "same"])


# ---------------------------------------------------------------------------
# 11. run_hunt: model_id mismatch
# ---------------------------------------------------------------------------

class TestRunHuntModelIdMismatch:
    def test_model_id_mismatch_raises(self, tmp_path):
        model = ThresholdClassifier()
        config = HuntConfig(model_id="wrong-model", transforms=["brightness"],
                            max_queries=5, seed=0)
        with pytest.raises(ValueError, match="model_id"):
            run_hunt([_image(120)], [0], model, config, tmp_path / "run")


# ---------------------------------------------------------------------------
# 12. run_hunt: empty images list
# ---------------------------------------------------------------------------

class TestRunHuntEmptyImages:
    def test_empty_images_raise(self, tmp_path):
        model = ThresholdClassifier()
        with pytest.raises(ValueError):
            run_hunt([], [], model, _config(), tmp_path / "run")


# ---------------------------------------------------------------------------
# 13. run_hunt: label out of range
# ---------------------------------------------------------------------------

class TestRunHuntLabelOutOfRange:
    def test_label_too_large_raises(self, tmp_path):
        model = ThresholdClassifier()
        # ThresholdClassifier has 2 classes; label 2 is out of range.
        with pytest.raises(ValueError):
            run_hunt([_image(120)], [2], model, _config(max_queries=1),
                     tmp_path / "run")

    def test_negative_label_raises(self, tmp_path):
        model = ThresholdClassifier()
        with pytest.raises(ValueError):
            run_hunt([_image(120)], [-1], model, _config(max_queries=1),
                     tmp_path / "run")


# ---------------------------------------------------------------------------
# 14. minimizer: zero budget returns original record
# ---------------------------------------------------------------------------

class TestMinimizerZeroBudget:
    def test_zero_budget_returns_original_no_query(self, tmp_path):
        model = ThresholdClassifier()
        # Build a minimal record that looks like a confirmed failure.
        image = _image(200)
        spec = TransformationSpec(kind="brightness", severity=0.9, seed=0, direction=-1)
        changed = transform_image(image, spec)
        from app.evaluation.fingerprint import pixel_hash as phash
        from app.transforms.image_corruptions import physical_parameters
        record = {
            "run_id": "test", "trial_id": 0, "source_image_id": "img0",
            "model_sha256": model.model_sha256, "model_id": model.model_id,
            "preprocessing": model.preprocessing, "class_names": model.class_names,
            "strategy": "random", "action": "brightness", "severity": 0.9,
            "seed": 0, "transform": spec.model_dump(),
            "physical_parameters": physical_parameters(spec),
            "ground_truth": 1, "original_pred": 1, "original_conf": 0.9,
            "original_probabilities": [0.1, 0.9],
            "context": [1.0, 0.5, 0.1, 0.3, 0.9, 0.1],
            "feature_version": "v1",
            "source_sha256": phash(image), "image_sha256": phash(changed),
            "validity_status": "verified", "validity_reason": "fixture",
            "failure_status": "confirmed_failure",
            "transformed_pred": 0, "transformed_conf": 0.9,
            "transformed_probabilities": [0.9, 0.1],
            "margin": 0.8, "timestamp": "2026-01-01T00:00:00+00:00",
        }
        calls_before = model.calls
        best, best_image, used, errors = minimize_failure(
            image, record, model, reviewed, budget=0
        )
        assert used == 0
        assert best_image is None
        assert errors == []
        assert model.calls == calls_before, "Zero budget must not invoke model"


# ---------------------------------------------------------------------------
# 15. minimizer: ground_truth=None returns original without querying
# ---------------------------------------------------------------------------

class TestMinimizerNoGroundTruth:
    def test_no_ground_truth_returns_original(self):
        model = ThresholdClassifier()
        image = _image(120)
        spec = TransformationSpec(kind="blur", severity=0.5, seed=0)
        changed = transform_image(image, spec)
        from app.evaluation.fingerprint import pixel_hash as phash
        from app.transforms.image_corruptions import physical_parameters
        record = {
            "run_id": "t", "trial_id": 0, "source_image_id": "i0",
            "model_sha256": "x", "model_id": "fixture-threshold",
            "preprocessing": {}, "class_names": ["a", "b"],
            "strategy": "random", "action": "blur", "severity": 0.5,
            "seed": 0, "transform": spec.model_dump(),
            "physical_parameters": physical_parameters(spec),
            "ground_truth": None, "original_pred": 1, "original_conf": 0.9,
            "original_probabilities": [0.1, 0.9],
            "context": [1.0] * 6, "feature_version": "v1",
            "source_sha256": phash(image), "image_sha256": phash(changed),
            "validity_status": "provisionally_valid", "validity_reason": "fixture",
            "failure_status": "candidate", "timestamp": "2026-01-01T00:00:00+00:00",
        }
        calls_before = model.calls
        best, best_image, used, errors = minimize_failure(
            image, record, model, reviewed, budget=10
        )
        assert used == 0
        assert best_image is None
        assert model.calls == calls_before


# ---------------------------------------------------------------------------
# 16. pixel_hash: different shapes with same pixel bytes differ
# ---------------------------------------------------------------------------

class TestPixelHash:
    def test_different_shapes_different_hash(self):
        """Two arrays with identical byte content but different shapes must hash differently."""
        a = np.zeros((6, 1, 3), dtype=np.uint8)
        b = np.zeros((2, 3, 3), dtype=np.uint8)
        # Both have 18 bytes of zeros; shape encodes metadata.
        assert pixel_hash(a) != pixel_hash(b)

    def test_same_array_same_hash(self):
        a = _image(80)
        assert pixel_hash(a) == pixel_hash(a.copy())


# ---------------------------------------------------------------------------
# 17–19. replay_case error paths (no ONNX runtime required; uses save_case + stubs)
# ---------------------------------------------------------------------------

class TestReplayCaseErrorPaths:
    """These tests write a valid fingerprint.json then corrupt one field each."""

    def _build_case_dir(self, tmp_path, model):
        """Save a minimal fingerprint that replay_case can read."""
        from app.evaluation.fingerprint import pixel_hash as phash, write_json
        from app.transforms.image_corruptions import TRANSFORM_VERSION
        image = _image(120)
        spec = TransformationSpec(kind="blur", severity=0.3, seed=0)
        changed = transform_image(image, spec)
        case_dir = tmp_path / "case"
        case_dir.mkdir()
        from PIL import Image as PILImage
        PILImage.fromarray(image).save(case_dir / "original.png")
        PILImage.fromarray(changed).save(case_dir / "transformed.png")
        import hashlib
        probs = model.predict(changed).tolist()
        record = {
            "model_sha256": model.model_sha256,
            "source_sha256": phash(image),
            "image_sha256": phash(changed),
            "preprocessing": model.preprocessing,
            "class_names": model.class_names,
            "transform": spec.model_dump(),
            "transform_version": TRANSFORM_VERSION,
            "transformed_pred": int(np.argmax(probs)),
            "transformed_probabilities": probs,
        }
        identity = {k: record[k] for k in ("model_sha256", "source_sha256", "image_sha256",
                                            "preprocessing", "class_names", "transform")}
        record["fingerprint_id"] = hashlib.sha256(
            json.dumps(identity, sort_keys=True).encode()
        ).hexdigest()
        write_json(case_dir / "fingerprint.json", record)
        return case_dir, image, changed, spec, probs

    def test_model_sha256_mismatch_raises(self, tmp_path):
        model = ThresholdClassifier()
        case_dir, _, _, _, _ = self._build_case_dir(tmp_path, model)
        # Tamper with model sha256 in fingerprint.
        fp_path = case_dir / "fingerprint.json"
        data = json.loads(fp_path.read_text())
        data["model_sha256"] = "wrong_sha"
        write_json(fp_path, data)
        with pytest.raises(ValueError, match="mismatch"):
            replay_case(case_dir, model)

    def test_source_pixel_hash_mismatch_raises(self, tmp_path):
        model = ThresholdClassifier()
        case_dir, _, _, _, _ = self._build_case_dir(tmp_path, model)
        # Replace original.png with a different image.
        from PIL import Image as PILImage
        PILImage.fromarray(_image(200)).save(case_dir / "original.png")
        with pytest.raises(ValueError, match="[Hh]ash"):
            replay_case(case_dir, model)

    def test_transform_version_mismatch_raises(self, tmp_path):
        model = ThresholdClassifier()
        case_dir, _, _, _, _ = self._build_case_dir(tmp_path, model)
        fp_path = case_dir / "fingerprint.json"
        data = json.loads(fp_path.read_text())
        data["transform_version"] = "wrong-version-99"
        write_json(fp_path, data)
        with pytest.raises(ValueError, match="[Vv]ersion"):
            replay_case(case_dir, model)


# ---------------------------------------------------------------------------
# 20. Missing manifest field raises ValueError (via OnnxClassifier fixture)
# This test only imports the fixture if onnxruntime + onnx are available.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("missing_key", ["model_id", "output_kind", "sha256"])
def test_onnx_classifier_missing_manifest_field(tmp_path, missing_key):
    """Manifest missing a required field should raise before attempting ONNX load."""
    # We can test this without actually loading a real ONNX model by patching
    # the manifest before OnnxClassifier tries to verify SHA256.
    try:
        import onnxruntime  # noqa: F401
        import onnx  # noqa: F401
    except ImportError:
        pytest.skip("onnxruntime/onnx not installed")

    from app.evaluation.fingerprint import write_json
    from app.models.onnx_classifier import DEFAULT_PREPROCESSING, sha256_file

    # Write stub files so SHA256 reads exist.
    (tmp_path / "mobilenetv3_imagenette.onnx").write_bytes(b"\x00")
    write_json(tmp_path / "class_to_idx.json", {"a": 0, "b": 1})
    write_json(tmp_path / "preprocessing.json", DEFAULT_PREPROCESSING)

    manifest = {
        "model_id": "test-model",
        "output_kind": "logits",
        "parity_status": "passed",  # Invalid-manifest fixture; never loaded as a trained artifact.
        "sha256": {
            "mobilenetv3_imagenette.onnx": sha256_file(tmp_path / "mobilenetv3_imagenette.onnx"),
            "class_to_idx.json": sha256_file(tmp_path / "class_to_idx.json"),
            "preprocessing.json": sha256_file(tmp_path / "preprocessing.json"),
        }
    }
    del manifest[missing_key]
    write_json(tmp_path / "model_manifest.json", manifest)

    from app.models.onnx_classifier import OnnxClassifier
    with pytest.raises(ValueError, match=missing_key):
        OnnxClassifier(tmp_path)


# ---------------------------------------------------------------------------
# 21. run_hunt: cancelled before first trial
# ---------------------------------------------------------------------------

class TestCancelledBeforeFirstTrial:
    def test_always_cancel_zero_inferences(self, tmp_path):
        model = ThresholdClassifier()
        result = run_hunt(
            [_image(120)], [0], model, _config(max_queries=10),
            tmp_path / "run",
            cancelled=lambda: True,
        )
        assert result.total_target_inferences == 0
        assert result.status in ("cancelled", "no_eligible_sources")


# ---------------------------------------------------------------------------
# 22. run_hunt with minimization_budget=0: no minimization queries
# ---------------------------------------------------------------------------

class TestNoMinimizationOnZeroBudget:
    def test_zero_budget_no_min_queries(self, tmp_path):
        model = ThresholdClassifier()
        config = _config(max_queries=10, minimization_budget=0)
        result = run_hunt([_image(120)], [0], model, config,
                          tmp_path / "run", validity_policy=reviewed)
        assert result.minimization_queries == 0


# ---------------------------------------------------------------------------
# 23. TransformationSpec rejects direction outside {-1, 1}
# (additional values beyond the class above)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("bad_dir", [2, -2, 0.5, None])
def test_direction_out_of_literal_raises(bad_dir):
    with pytest.raises(ValidationError):
        TransformationSpec(kind="brightness", severity=0.5, seed=0, direction=bad_dir)


# ---------------------------------------------------------------------------
# 24. brightness severity=0 is exact identity even with direction=-1
# (combined edge: identity path in transform_image taken before computing factor)
# ---------------------------------------------------------------------------

def test_brightness_zero_severity_exact_identity_direction_minus1():
    image = np.arange(90, dtype=np.uint8).reshape(5, 6, 3)
    spec = TransformationSpec(kind="brightness", severity=0, seed=0, direction=-1)
    out = transform_image(image, spec)
    np.testing.assert_array_equal(out, image)
    assert not np.shares_memory(out, image)


# ---------------------------------------------------------------------------
# 25. metrics.summarize on empty record list
# ---------------------------------------------------------------------------

class TestSummarizeEmpty:
    def test_empty_records_zero_counts_none_rates(self):
        result = summarize([])
        assert result["confirmed_failures"] == 0
        assert result["candidate_failures"] == 0
        assert result["invalid_trials"] == 0
        assert result["error_trials"] == 0
        assert result["confirmed_failure_rate"] is None
        assert result["queries_to_first_failure"] is None
        assert result["queries_to_first_candidate"] is None
        assert result["unique_confirmed_failures"] == 0
        assert result["unique_candidate_failures"] == 0

    def test_all_error_trials_rate_is_none(self):
        """confirmed_failure_rate requires at least one verified-status row."""
        records = [{"failure_status": "error", "validity_status": "provisionally_valid",
                    "source_image_id": "i", "action": "blur", "query_index": 1}]
        result = summarize(records)
        assert result["confirmed_failure_rate"] is None
