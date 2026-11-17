import numpy as np
import pytest

from app.evaluation.fingerprint import replay_case
from app.evaluation.validity import Validity
from app.hunter.linucb import LinUCB
from app.hunter.runner import run_hunt
from app.models.contracts import HuntConfig
from conftest import reviewed


@pytest.mark.parametrize("strategy", ["random", "tpe_only", "linucb_only", "hybrid"])
def test_budget_and_determinism(strategy, image, model, tmp_path):
    config = HuntConfig(model_id=model.model_id, strategy=strategy, transforms=["brightness"],
                        max_queries=18, seed=42, startup_trials=2)
    first = run_hunt([image], [0], model, config, tmp_path / "first", validity_policy=reviewed)
    second = run_hunt([image], [0], model, config, tmp_path / "second", validity_policy=reviewed)
    assert first.actual_queries == 18 and first.baseline_queries == 1
    assert model.calls == 2 * (1 + 18)
    assert first.confirmed_failures > 0
    assert [r["image_sha256"] for r in first.trials] == [r["image_sha256"] for r in second.trials]
    assert [r["transform"] for r in first.trials] == [r["transform"] for r in second.trials]
    case = first.failure_cases[0]
    replay_case(tmp_path / "first" / case["artifact_path"], model)


def test_candidates_not_confirmed(image, model, tmp_path):
    config = HuntConfig(model_id=model.model_id, strategy="random", transforms=["brightness"], max_queries=30)
    result = run_hunt([image], [0], model, config, tmp_path / "run")
    assert result.candidate_failures > 0 and result.confirmed_failures == 0
    assert result.summary["confirmed_failure_rate"] is None


def test_baseline_wrong_is_excluded(image, model, tmp_path):
    result = run_hunt([image], [1], model, HuntConfig(model_id=model.model_id), tmp_path / "run")
    assert result.actual_queries == 0
    assert result.summary["baseline_incorrect_sources"] == 1
    assert result.confirmed_failures == 0


@pytest.mark.parametrize("strategy", ["tpe_only", "hybrid"])
def test_missing_labels_no_feedback(strategy, image, model, tmp_path):
    result = run_hunt([image], [None], model, HuntConfig(model_id=model.model_id, strategy=strategy,
                      max_queries=4), tmp_path / "run")
    assert result.confirmed_failures == 0 and result.actual_queries == 4


@pytest.mark.parametrize("strategy", ["random", "tpe_only", "linucb_only", "hybrid"])
def test_unlabelled_unchanged_observation_not_counted(strategy, image, model, tmp_path):
    # Blurring this uniform image leaves pixels and the classifier probabilities identical.
    result = run_hunt([image], [None], model, HuntConfig(
        model_id=model.model_id, strategy=strategy, transforms=["blur"], max_queries=3),
        tmp_path / "unchanged", validity_policy=reviewed)
    assert result.actual_queries == 3 and result.total_target_inferences == 4
    assert all(r["source_sha256"] == r["image_sha256"] for r in result.trials)
    assert all(r["failure_status"] == "not_failed" for r in result.trials)
    assert result.candidate_failures == result.confirmed_failures == 0
    assert result.failure_cases == []
    assert (tmp_path / "unchanged/failure_cases.jsonl").read_text() == ""
    assert result.summary["queries_to_first_candidate"] is None
    assert result.summary["unique_candidate_failures"] == 0
    assert result.summary["valid_queries"] == 0
    assert result.summary["confirmed_failure_rate"] is None


@pytest.mark.parametrize("delta,expected", [(0.0, 0), (1e-6, 0), (1e-3, 2), (-1e-3, 2), (-0.8, 2)])
def test_unlabelled_candidate_requires_prediction_or_confidence_change(delta, expected, image, model, tmp_path):
    def predict(_):
        model.calls += 1
        change = 0.0 if model.calls == 1 else delta
        return np.array([0.9 + change, 0.1 - change], dtype=np.float32)
    model.predict = predict
    result = run_hunt([image], [None], model, HuntConfig(
        model_id=model.model_id, strategy="random", transforms=["blur"], max_queries=2),
        tmp_path / "confidence", validity_policy=reviewed)
    assert result.candidate_failures == len(result.failure_cases) == expected
    assert result.confirmed_failures == 0
    assert result.summary["confirmed_failure_rate"] is None


def test_invalid_no_confirmation(image, model, tmp_path):
    result = run_hunt([image], [0], model, HuntConfig(model_id=model.model_id, max_queries=6),
                      tmp_path / "run", validity_policy=lambda *_: Validity("invalid", "fixture"))
    assert result.summary["invalid_trials"] == 6 and result.confirmed_failures == 0


def test_linucb_numeric_update_and_invalid_feedback(model):
    policy = LinUCB(HuntConfig(model_id=model.model_id, transforms=["noise"]))
    x = np.array([1, .2, .1, .3, .9, .2])
    spec = policy.suggest(x, 0)
    initial_a, initial_b = policy.A.copy(), policy.b.copy()
    policy.update(x, spec, 1, 0.2, False)
    np.testing.assert_array_equal(policy.A, initial_a)
    policy.update(x, spec, 1, .2, True)
    np.testing.assert_allclose(policy.A[0], initial_a[0] + np.outer(x, x))
    np.testing.assert_allclose(policy.b[0], initial_b[0] + x)


@pytest.mark.parametrize("strategy", ["tpe_only", "hybrid", "linucb_only"])
def test_error_does_not_learn(strategy, image, model, tmp_path):
    original_predict = model.predict
    calls = 0
    def broken(image):
        nonlocal calls
        calls += 1
        if calls > 1:
            raise RuntimeError("fixture inference failure")
        return original_predict(image)
    model.predict = broken
    result = run_hunt([image], [0], model, HuntConfig(model_id=model.model_id, strategy=strategy,
                      max_queries=5), tmp_path / "run")
    assert result.actual_queries == 5 and result.summary["error_trials"] == 5
    assert result.total_target_inferences == 6


def test_minimization_cost(image, model, tmp_path):
    config = HuntConfig(model_id=model.model_id, strategy="random", transforms=["brightness"],
                        max_queries=15, minimization_budget=7)
    result = run_hunt([image], [0], model, config, tmp_path / "run", validity_policy=reviewed)
    assert 0 < result.minimization_queries <= 7
    assert model.calls == result.total_target_inferences == 16 + result.minimization_queries
    assert result.confirmed_failures > 0


def test_schedule_same_across_strategies(image, model, tmp_path):
    schedules = []
    for strategy in ("random", "tpe_only", "linucb_only", "hybrid"):
        result = run_hunt([image, image.copy()], [0, 0], model,
                          HuntConfig(model_id=model.model_id, strategy=strategy, max_queries=9),
                          tmp_path / strategy)
        schedules.append([r["source_image_id"] for r in result.trials])
    assert all(s == schedules[0] for s in schedules)


def test_zero_budget_and_cancel(image, model, tmp_path):
    zero = run_hunt([image], [0], model, HuntConfig(model_id=model.model_id, max_queries=0), tmp_path / "zero")
    assert zero.actual_queries == 0
    stopped = run_hunt([image], [0], model, HuntConfig(model_id=model.model_id), tmp_path / "stop",
                       cancelled=lambda: True)
    assert stopped.total_target_inferences == 0
    assert stopped.status == "cancelled"


def test_cancel_interrupts_minimization(image, model):
    from app.minimization.minimizer import minimize_failure
    record = {"ground_truth": 0, "original_pred": 0, "severity": 1.0,
              "failure_status": "confirmed_failure", "transform": {
                  "kind": "brightness", "severity": 1.0, "seed": 0, "direction": 1}}
    _, _, queries, errors = minimize_failure(image, record, model, reviewed, 10,
                                             cancelled=lambda: model.calls >= 2)
    assert queries == model.calls == 2
    assert not errors
