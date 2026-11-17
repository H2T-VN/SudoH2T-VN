import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path

import numpy as np
from PIL import Image

from app.models.contracts import TransformationSpec, check_probabilities
from app.transforms.image_corruptions import TRANSFORM_VERSION, transform_image


def pixel_hash(image):
    header = json.dumps({"shape": image.shape, "dtype": str(image.dtype)}, sort_keys=True).encode()
    return hashlib.sha256(header + np.ascontiguousarray(image).tobytes()).hexdigest()


def environment():
    versions = {}
    for name in ("numpy", "Pillow", "optuna", "onnxruntime", "torch", "torchvision", "onnx", "pydantic"):
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            versions[name] = "not_installed"
    return {"python": platform.python_version(), "platform": platform.platform(), "packages": versions}


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")


def save_case(directory, original, transformed, record):
    root = Path(directory)
    root.mkdir(parents=True, exist_ok=False)
    Image.fromarray(original).save(root / "original.png")
    Image.fromarray(transformed).save(root / "transformed.png")
    identity = {key: record[key] for key in ("model_sha256", "source_sha256", "image_sha256",
                                           "preprocessing", "class_names", "transform")}
    fingerprint_id = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    write_json(root / "fingerprint.json", {**record, "fingerprint_id": fingerprint_id,
                                         "replay_atol": 1e-5, "replay_rtol": 1e-4,
                                         "transform_version": TRANSFORM_VERSION,
                                         "replay_command": 'python -m app.pipelines.replay --case "' + str(root)
                                         + '" --artifacts "PATH_TO_TRUSTED_ARTIFACTS"',
                                         "environment": environment()})
    (root / "test_regression.py").write_text(
        '"""Regression expectation: the current target still reproduces this observed failure.\n'
        'After a model fix, replace the expectation with the ground-truth label and update model provenance.\n'
        'Set MIRAGEHUNTER_ARTIFACT_DIR to trusted ONNX artifacts.\n"""\n'
        'import os\nfrom pathlib import Path\nfrom app.models.configurable_classifier import load_classifier\n'
        'from app.evaluation.fingerprint import replay_case\n\n'
        'def test_reproduce_observation():\n'
        '    model = load_classifier(os.environ["MIRAGEHUNTER_ARTIFACT_DIR"],\n'
        '                            trusted_local=os.environ.get("MIRAGEHUNTER_TRUSTED_LOCAL_MODEL") == "1")\n'
        '    replay_case(Path(__file__).parent, model)\n', encoding="utf-8")


def replay_case(directory, model):
    root = Path(directory)
    record = json.loads((root / "fingerprint.json").read_text(encoding="utf-8"))
    if model.model_sha256 != record["model_sha256"] or model.preprocessing != record["preprocessing"]:
        raise ValueError("Replay model/preprocessing mismatch")
    if model.class_names != record["class_names"] or record["transform_version"] != TRANSFORM_VERSION:
        raise ValueError("Replay class mapping/transform version mismatch")
    original = np.asarray(Image.open(root / "original.png").convert("RGB"))
    if pixel_hash(original) != record["source_sha256"]:
        raise ValueError("Source pixel hash mismatch")
    regenerated = transform_image(original, TransformationSpec(**record["transform"]))
    saved = np.asarray(Image.open(root / "transformed.png").convert("RGB"))
    if pixel_hash(regenerated) != record["image_sha256"] or not np.array_equal(regenerated, saved):
        raise ValueError("Transformed pixels do not reproduce; check library versions")
    probabilities = check_probabilities(model.predict(regenerated), len(model.class_names))
    if int(probabilities.argmax()) != record["transformed_pred"]:
        raise AssertionError("Prediction no longer reproduces")
    atol, rtol = record.get("replay_atol", 1e-5), record.get("replay_rtol", 1e-4)
    if not np.isfinite([atol, rtol]).all() or not 0 <= atol <= 1e-3 or not 0 <= rtol <= 1e-3:
        raise ValueError("Invalid replay probability tolerance")
    np.testing.assert_allclose(probabilities, record["transformed_probabilities"], atol=atol, rtol=rtol)
    return record
