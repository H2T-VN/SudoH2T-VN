import json

import numpy as np
import onnx
import onnxruntime as ort
import pytest
from onnx import TensorProto, helper

from app.evaluation.fingerprint import write_json
from app.models.onnx_classifier import DEFAULT_PREPROCESSING, OnnxClassifier, preprocess_image, sha256_file


@pytest.fixture
def onnx_artifact(tmp_path):
    """Real executable ONNX graph, synthetic test fixture, no trained accuracy claims."""
    graph = helper.make_graph([
        helper.make_node("ReduceMean", ["images"], ["mean"], axes=[2, 3], keepdims=0),
        helper.make_node("MatMul", ["mean", "weights"], ["logits"]),
    ], "fixture", [helper.make_tensor_value_info("images", TensorProto.FLOAT, ["N", 3, 224, 224])],
        [helper.make_tensor_value_info("logits", TensorProto.FLOAT, ["N", 2])],
        initializer=[helper.make_tensor("weights", TensorProto.FLOAT, [3, 2], [1, -1, 1, -1, 1, -1])])
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)], ir_version=9)
    onnx.save(model, tmp_path / "mobilenetv3_imagenette.onnx")
    write_json(tmp_path / "class_to_idx.json", {"class_a": 0, "class_b": 1})
    write_json(tmp_path / "preprocessing.json", DEFAULT_PREPROCESSING)
    # Measure real fixture parity against its exact NumPy mathematical reference.
    session = ort.InferenceSession(str(tmp_path / "mobilenetv3_imagenette.onnx"),
                                   providers=["CPUExecutionProvider"])
    diffs = []
    for _ in range(20):
        x = np.random.default_rng(len(diffs)).normal(size=(1, 3, 224, 224)).astype(np.float32)
        actual = session.run(None, {"images": x})[0]
        expected = x.mean(axis=(2, 3)) @ np.array([[1, -1]] * 3, dtype=np.float32)
        np.testing.assert_allclose(actual, expected, atol=1e-5, rtol=1e-4)
        diffs.append(float(np.abs(actual - expected).max()))
    write_json(tmp_path / "onnx_parity_report.json", {"status": "passed", "samples": len(diffs),
               "max_abs_logit_diff": max(diffs), "scope": "synthetic software fixture only"})
    write_json(tmp_path / "model_manifest.json", {
        "model_id": "fixture-onnx", "output_kind": "logits", "parity_status": "passed",
        "sha256": {name: sha256_file(tmp_path / name) for name in (
            "mobilenetv3_imagenette.onnx", "class_to_idx.json", "preprocessing.json", "onnx_parity_report.json")}})
    return tmp_path


def test_real_onnx_runtime_cpu(onnx_artifact, image):
    classifier = OnnxClassifier(onnx_artifact)
    p = classifier.predict(image)
    assert p.shape == (2,) and p.dtype == np.float32 and np.isclose(p.sum(), 1)
    x = preprocess_image(image, DEFAULT_PREPROCESSING)
    expected_logits = x.mean(axis=(2, 3)) @ np.array([[1, -1]] * 3)
    exp = np.exp(expected_logits[0] - expected_logits.max())
    np.testing.assert_allclose(p, exp / exp.sum(), rtol=1e-4, atol=1e-5)


@pytest.mark.parametrize("name", ["mobilenetv3_imagenette.onnx", "preprocessing.json", "class_to_idx.json",
                                 "onnx_parity_report.json"])
def test_hash_tamper_rejected(onnx_artifact, name):
    with (onnx_artifact / name).open("ab") as stream:
        stream.write(b"tampered")
    with pytest.raises(ValueError, match="SHA256"):
        OnnxClassifier(onnx_artifact)


def test_bad_mapping_rejected(onnx_artifact):
    write_json(onnx_artifact / "class_to_idx.json", {"a": 0, "b": 0})
    manifest_path = onnx_artifact / "model_manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["sha256"]["class_to_idx.json"] = sha256_file(onnx_artifact / "class_to_idx.json")
    write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="Class mapping"):
        OnnxClassifier(onnx_artifact)


@pytest.mark.parametrize("status,samples", [("failed", 20), ("passed", 19)])
def test_unverified_parity_rejected(onnx_artifact, status, samples):
    report_path = onnx_artifact / "onnx_parity_report.json"
    write_json(report_path, {"status": status, "samples": samples, "scope": "rejection fixture"})
    manifest_path = onnx_artifact / "model_manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["sha256"]["onnx_parity_report.json"] = sha256_file(report_path)
    write_json(manifest_path, manifest)
    with pytest.raises(ValueError, match="passed parity"):
        OnnxClassifier(onnx_artifact)


def test_preprocess_rgb_and_layout(image):
    x = preprocess_image(image, DEFAULT_PREPROCESSING)
    assert x.shape == (1, 3, 224, 224) and x.dtype == np.float32
    expected = (120 / 255 - np.array(DEFAULT_PREPROCESSING["mean"])) / DEFAULT_PREPROCESSING["std"]
    np.testing.assert_allclose(x[0, :, 50, 50], expected, atol=1e-6)


def test_real_onnx_hunt_and_replay(onnx_artifact, image, tmp_path):
    from app.evaluation.fingerprint import replay_case
    from app.hunter.runner import run_hunt
    from app.models.contracts import HuntConfig
    adapter = OnnxClassifier(onnx_artifact)
    label = int(adapter.predict(image).argmax())
    run_dir = tmp_path / "hunt"
    result = run_hunt([image], [label], adapter, HuntConfig(model_id=adapter.model_id, max_queries=3), run_dir)
    assert result.actual_queries == 3
    replay_case(run_dir / result.trials[0]["artifact_path"], adapter)


def test_library_smoke_cli_records_progress_and_real_response(onnx_artifact, image, tmp_path):
    from app.hunter.runner import run_hunt
    from app.models.contracts import HuntConfig
    from tools.smoke_ai_hunt import main
    adapter = OnnxClassifier(onnx_artifact)
    label = int(adapter.predict(image).argmax())
    saved = tmp_path / "saved"
    result = run_hunt([image], [label], adapter, HuntConfig(model_id=adapter.model_id, max_queries=1), saved)
    output = tmp_path / "smoke"
    report = main(["--artifacts", str(onnx_artifact), "--case",
                   str(saved / result.trials[0]["artifact_path"]), "--output", str(output), "--queries", "2"])
    assert report["replay_passed"]
    assert report["providers"] == ["CPUExecutionProvider"]
    assert report["progress_events"] == [{"done": 1, "total": 2}, {"done": 2, "total": 2}]
    assert report["result"]["total_target_inferences"] == 3
    assert json.loads((output / "result.json").read_text())["run_id"] == report["result"]["run_id"]
