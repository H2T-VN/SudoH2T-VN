import csv
import json

import numpy as np
import onnx
import pytest
from onnx import TensorProto, helper
from PIL import Image
from pydantic import ValidationError

from app.pipelines.classification import run_classification
from app.evaluation.baseline import evaluate_baseline
from app.evaluation.fingerprint import replay_case
from app.evaluation.labelled_dataset import load_labelled_dataset
from app.models.configurable_classifier import (
    ClassificationManifest, ClassificationPreprocessing, ConfigurableOnnxClassifier,
    load_classifier, preprocess_configurable,
)
from app.models.onnx_classifier import sha256_file


def make_bundle(root, layout="NCHW", output_kind="logits", invalid_probabilities=False):
    root.mkdir()
    shape = ["N", 3, 8, 12] if layout == "NCHW" else ["N", 8, 12, 3]
    axes = [2, 3] if layout == "NCHW" else [1, 2]
    nodes = [helper.make_node("ReduceMean", ["images"], ["mean"], axes=axes, keepdims=0),
             helper.make_node("MatMul", ["mean", "weights"], ["scores"])]
    last = "scores"
    if output_kind == "probabilities" and not invalid_probabilities:
        nodes.append(helper.make_node("Softmax", [last], ["probabilities"], axis=1))
        last = "probabilities"
    graph = helper.make_graph(nodes, "synthetic-general-adapter-fixture", [
        helper.make_tensor_value_info("images", TensorProto.FLOAT, shape)], [
        helper.make_tensor_value_info(last, TensorProto.FLOAT, ["N", 3])], initializer=[
        helper.make_tensor("weights", TensorProto.FLOAT, [3, 3], np.eye(3).ravel().tolist())])
    onnx.save(helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=9), root / "model.onnx")
    manifest = {"format_version": "classification-onnx-v1", "task": "image_classification",
                "model_id": "synthetic-rgb-three-class", "model_file": "model.onnx",
                "model_sha256": sha256_file(root / "model.onnx"), "class_names": ["red", "green", "blue"],
                "output_kind": output_kind, "preprocessing": {"input_size": [8, 12], "layout": layout}}
    write_manifest(root, manifest)
    return root


def write_manifest(root, manifest):
    (root / "model_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")


def make_dataset(root, rows=None):
    (root / "images").mkdir(parents=True)
    for name, rgb in (("r.png", [255, 0, 0]), ("g.png", [0, 255, 0]), ("b.png", [0, 0, 255])):
        Image.fromarray(np.full((10, 14, 3), rgb, dtype=np.uint8)).save(root / "images" / name)
    with (root / "labels.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["image_filename", "ground_truth_label"])
        writer.writerows(rows or [("images/r.png", "red"), ("images/g.png", "green"), ("images/b.png", "blue")])
    return root


@pytest.mark.parametrize("layout", ["NCHW", "NHWC"])
@pytest.mark.parametrize("kind", ["logits", "probabilities"])
def test_custom_input_size_layout_output_and_replay(tmp_path, layout, kind):
    bundle = make_bundle(tmp_path / "model", layout, kind)
    with pytest.raises(ValueError, match="operator-reviewed"):
        load_classifier(bundle)
    model = load_classifier(bundle, trusted_local=True)
    dataset = make_dataset(tmp_path / "data")
    output = tmp_path / "out"
    report = run_classification(bundle, dataset, output, trusted_local=True, queries=2)
    assert report["baseline"]["accuracy"] == report["baseline"]["macro_f1"] == 1
    assert report["baseline"]["confusion_matrix"] == np.eye(3, dtype=int).tolist()
    assert report["total_target_inferences"] == 3 + 3 + 2
    assert report["hunt_summary"]["confirmed_failures"] == 0
    assert report["hunt_summary"]["baseline_accuracy"] == 1
    assert model.session.get_providers() == ["CPUExecutionProvider"]
    result = json.loads((output / "hunt/result.json").read_text())
    for trial in result["trials"]:
        replay_case(output / "hunt" / trial["artifact_path"], model)
    # The exported regression uses the adapter factory, preserving custom metadata.
    test_source = (output / "hunt/trial-000000/test_regression.py").read_text()
    assert "load_classifier" in test_source and "MIRAGEHUNTER_TRUSTED_LOCAL_MODEL" in test_source


def test_color_scale_normalization_and_input_immutability():
    image = np.full((5, 7, 3), [20, 40, 60], dtype=np.uint8)
    original = image.copy()
    config = ClassificationPreprocessing(input_size=(4, 6), color_order="BGR", scale=10,
                                          mean=(1, 2, 3), std=(1, 2, 3), layout="NHWC")
    x = preprocess_configurable(image, config)
    assert x.shape == (1, 4, 6, 3) and x.dtype == np.float32 and x.flags.c_contiguous
    np.testing.assert_allclose(x[0, 0, 0], [5, 1, -1 / 3])
    np.testing.assert_array_equal(image, original)


def test_general_center_crop_matches_demo_preprocessing(image):
    from app.models.onnx_classifier import DEFAULT_PREPROCESSING, preprocess_image
    config = ClassificationPreprocessing(input_size=(224, 224), resize_mode="shorter_center_crop",
                                          resize_shorter=256, mean=DEFAULT_PREPROCESSING["mean"],
                                          std=DEFAULT_PREPROCESSING["std"])
    np.testing.assert_array_equal(preprocess_configurable(image, config), preprocess_image(image, DEFAULT_PREPROCESSING))


@pytest.mark.parametrize("change", [
    {"input_size": [0, 8]}, {"input_size": [8, 2048]}, {"std": [1, 0, 1]},
    {"mean": [float("nan"), 0, 0]}, {"scale": 0}, {"layout": "CHW"},
    {"resize_mode": "shorter_center_crop"}, {"resize_shorter": 20},
    {"input_size": [8, 8], "resize_mode": "shorter_center_crop", "resize_shorter": 4},
])
def test_bad_preprocessing_rejected(change):
    with pytest.raises(ValidationError):
        ClassificationPreprocessing.model_validate({"input_size": [8, 12], **change})


@pytest.mark.parametrize("key,value", [
    ("task", "object_detection"), ("format_version", "unknown"), ("model_file", "../model.onnx"),
    ("class_names", ["red", "red"]), ("class_names", ["red", ""]), ("output_kind", "boxes"),
])
def test_bad_custom_manifest_rejected(tmp_path, key, value):
    bundle = make_bundle(tmp_path / "model")
    manifest = json.loads((bundle / "model_manifest.json").read_text())
    manifest[key] = value
    write_manifest(bundle, manifest)
    with pytest.raises(ValidationError):
        load_classifier(bundle, trusted_local=True)


def test_hash_shape_class_mismatch_and_size_limit(tmp_path):
    bundle = make_bundle(tmp_path / "model")
    with pytest.raises(ValueError, match="size limit"):
        ConfigurableOnnxClassifier(bundle, trusted_local=True, max_model_bytes=1)
    manifest = json.loads((bundle / "model_manifest.json").read_text())
    manifest["preprocessing"]["input_size"] = [16, 12]
    write_manifest(bundle, manifest)
    with pytest.raises(ValueError, match="shape"):
        load_classifier(bundle, trusted_local=True)
    manifest["preprocessing"]["input_size"] = [8, 12]
    manifest["class_names"] = ["a", "b"]
    write_manifest(bundle, manifest)
    with pytest.raises(ValueError, match="class dimension"):
        load_classifier(bundle, trusted_local=True)
    manifest["model_sha256"] = "0" * 64
    write_manifest(bundle, manifest)
    with pytest.raises(ValueError, match="SHA256"):
        load_classifier(bundle, trusted_local=True)


def test_invalid_probabilities_are_not_silently_softmaxed(tmp_path):
    model = load_classifier(make_bundle(tmp_path / "model", output_kind="probabilities", invalid_probabilities=True),
                            trusted_local=True)
    with pytest.raises(ValueError, match="normalized"):
        model.predict(np.full((10, 12, 3), 255, dtype=np.uint8))


@pytest.mark.parametrize("rows,match", [
    ([("../secret.png", "red")], "relative"), ([("C:/secret.png", "red")], "Invalid"),
    ([("images/r.png", "red"), ("images/r.png", "green")], "duplicate"),
    ([("images/missing.png", "red")], "missing"), ([("images/r.png", "unknown")], "Unknown"),
])
def test_bad_dataset_rejected(tmp_path, rows, match):
    dataset = make_dataset(tmp_path / "data", rows)
    with pytest.raises(ValueError, match=match):
        load_labelled_dataset(dataset, ["red", "green", "blue"])


def test_dataset_limits_hashes_and_label_order(tmp_path):
    dataset = make_dataset(tmp_path / "data")
    data = load_labelled_dataset(dataset, ["blue", "red", "green"])
    assert data.labels == [1, 2, 0]
    assert data.manifest[0]["sha256"] == sha256_file(dataset / "images/r.png")
    for limit in ({"max_images": 2}, {"max_pixels": 10}, {"max_total_bytes": 100}):
        with pytest.raises(ValueError):
            load_labelled_dataset(dataset, ["red", "green", "blue"], **limit)


def test_baseline_metrics_and_exclusions(image, model):
    report = evaluate_baseline([image] * 3, [0, 1, 0], model, ["a", "b", "c"])
    assert report["accuracy"] == pytest.approx(2 / 3)
    assert report["confusion_matrix"] == [[2, 0], [1, 0]]
    assert report["macro_precision"] == pytest.approx(1 / 3)
    assert report["macro_recall"] == .5
    assert report["macro_f1"] == .4
    assert report["eligible_source_ids"] == ["a", "c"] and report["baseline_incorrect"] == 1
    with pytest.raises(ValueError, match="ground-truth"):
        evaluate_baseline([image], [None], model)
    with pytest.raises(ValueError, match="ground-truth"):
        evaluate_baseline([image], [True], model)
    with pytest.raises(ValueError, match="unique"):
        evaluate_baseline([image] * 2, [0, 0], model, ["a", "a"])


def test_unknown_manifest_fields_rejected(tmp_path):
    bundle = make_bundle(tmp_path / "model")
    value = json.loads((bundle / "model_manifest.json").read_text())
    value["python_preprocessing_code"] = "never executed"
    with pytest.raises(ValidationError):
        ClassificationManifest.model_validate(value)


@pytest.mark.parametrize("change", ["external_data", "custom_operator"])
def test_unsupported_graph_rejected_before_runtime(tmp_path, change):
    bundle = make_bundle(tmp_path / "model")
    graph = onnx.load(bundle / "model.onnx")
    if change == "external_data":
        weight = graph.graph.initializer[0]
        weight.ClearField("float_data")
        weight.data_location = TensorProto.EXTERNAL
        weight.external_data.add(key="location", value="../outside.bin")
    else:
        graph.graph.node[0].domain = "vendor.custom"
    (bundle / "model.onnx").write_bytes(graph.SerializeToString())
    manifest = json.loads((bundle / "model_manifest.json").read_text())
    manifest["model_sha256"] = sha256_file(bundle / "model.onnx")
    write_manifest(bundle, manifest)
    with pytest.raises(ValueError, match="External-data|Custom operator"):
        load_classifier(bundle, trusted_local=True)


def test_platform_phase_progress_and_registered_dataset_id(tmp_path):
    bundle = make_bundle(tmp_path / "model")
    dataset = make_dataset(tmp_path / "data")
    events = []
    report = run_classification(bundle, dataset, tmp_path / "out", trusted_local=True,
                                dataset_id="registered-data-v2", queries=2, progress=events.append)
    assert report["status"] == "completed" and report["run_id"]
    assert report["dataset_id"] == "registered-data-v2"
    config = json.loads((tmp_path / "out/hunt/config.json").read_text())
    assert config["dataset_id"] == report["dataset_id"]
    assert [e["phase"] for e in events] == (
        ["preparing"] * 3 + ["baseline"] * 4 + ["hunt_baseline"] * 4 + ["hunting"] * 2 + ["finished"])
    for phase in ("preparing", "baseline", "hunt_baseline", "hunting", "finished"):
        values = [e["completed"] for e in events if e["phase"] == phase]
        assert values == sorted(values)
        assert values[-1] == next(e["total"] for e in events if e["phase"] == phase)
    assert report["total_target_inferences"] == 8


@pytest.mark.parametrize("phase", ["baseline", "hunt_baseline", "hunting"])
def test_platform_cooperative_cancel_preserves_counts_and_status(tmp_path, phase):
    from app.evaluation.baseline import EvaluationCancelled

    bundle = make_bundle(tmp_path / "model")
    dataset = make_dataset(tmp_path / "data")
    stop = False

    def progress(event):
        nonlocal stop
        if event["phase"] == phase and event["completed"] == 1:
            stop = True

    def run():
        return run_classification(bundle, dataset, tmp_path / "out", trusted_local=True,
                                  queries=3, progress=progress, cancelled=lambda: stop)

    if phase == "baseline":
        with pytest.raises(EvaluationCancelled) as caught:
            run()
        assert caught.value.inference_queries == 1 and caught.value.phase == "baseline"
        assert not (tmp_path / "out/baseline.json").exists()
        assert not (tmp_path / "out/report.json").exists()
        assert not (tmp_path / "out/hunt").exists()
    else:
        report = run()
        hunt = json.loads((tmp_path / "out/hunt/result.json").read_text())
        assert report["status"] == hunt["status"] == "cancelled"
        assert report["baseline"]["count"] == 3
        assert report["total_target_inferences"] == (4 if phase == "hunt_baseline" else 7)
        assert hunt["actual_queries"] == (0 if phase == "hunt_baseline" else 1)


def test_platform_pre_cancel_and_invalid_config_do_not_load_model(tmp_path, monkeypatch):
    import app.pipelines.classification as workflow
    from app.evaluation.baseline import EvaluationCancelled

    def unexpected_load(*args, **kwargs):
        pytest.fail("Must reject cancellation/config before loading ONNX")

    monkeypatch.setattr(workflow, "load_classifier", unexpected_load)
    with pytest.raises(EvaluationCancelled) as caught:
        run_classification("unused", "unused", tmp_path / "out", cancelled=lambda: True)
    assert caught.value.inference_queries == 0 and caught.value.phase == "preparing"
    with pytest.raises(ValidationError):
        run_classification("unused", "unused", tmp_path / "out", seed=-1)
    assert not (tmp_path / "out").exists()


def test_baseline_cancel_after_last_image_never_returns_completed_metrics(image, model):
    from app.evaluation.baseline import EvaluationCancelled

    done = 0

    def progress(completed, total):
        nonlocal done
        done = completed

    with pytest.raises(EvaluationCancelled) as caught:
        evaluate_baseline([image], [0], model, progress=progress, cancelled=lambda: done == 1)
    assert caught.value.inference_queries == 1


def test_hunt_baseline_progress_counts_inference_errors(tmp_path, image, model):
    from app.hunter.runner import run_hunt
    from app.models.contracts import HuntConfig

    def broken_predict(image):
        raise RuntimeError("synthetic inference error")

    model.predict = broken_predict
    events = []
    result = run_hunt([image] * 2, [0, 0], model, HuntConfig(model_id=model.model_id, max_queries=1),
                      tmp_path / "hunt", baseline_progress=lambda done, total: events.append((done, total)))
    assert events == [(0, 2), (1, 2), (2, 2)]
    assert result.status == "no_eligible_sources" and result.baseline_queries == 2
    assert result.actual_queries == 0 and len(result.summary["baseline_errors"]) == 2
