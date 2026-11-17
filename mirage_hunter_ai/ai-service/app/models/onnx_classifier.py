import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.transforms.image_corruptions import check_image

DEFAULT_PREPROCESSING = {
    "version": "imagenette-rgb-v1", "color_order": "RGB", "input_size": 224,
    "resize_shorter": 256, "interpolation": "bilinear", "crop": "center",
    "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225],
    "scale": 255.0, "dtype": "float32", "layout": "NCHW",
}


def sha256_file(path):
    with open(path, "rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def validate_preprocessing(config):
    if config != DEFAULT_PREPROCESSING:
        raise ValueError("Unsupported preprocessing; expected imagenette-rgb-v1 exact contract")


def preprocess_image(image, config):
    check_image(image)
    validate_preprocessing(config)
    im = Image.fromarray(image)
    width, height = im.size
    shorter = config["resize_shorter"]
    # Same PIL bilinear Resize + CenterCrop integer rules as torchvision.
    size = (shorter, int(shorter * height / width)) if width <= height else (
        int(shorter * width / height), shorter)
    im = im.resize(size, Image.Resampling.BILINEAR)
    crop = config["input_size"]
    left, top = round((im.width - crop) / 2), round((im.height - crop) / 2)
    x = np.asarray(im.crop((left, top, left + crop, top + crop)), dtype=np.float32) / 255.0
    x = (x - np.array(config["mean"], dtype=np.float32)) / np.array(config["std"], dtype=np.float32)
    return np.ascontiguousarray(x.transpose(2, 0, 1)[None], dtype=np.float32)


class OnnxClassifier:
    def __init__(self, artifact_dir, threads=1):
        root = Path(artifact_dir)
        self.manifest = json.loads((root / "model_manifest.json").read_text(encoding="utf-8"))
        required = {"model_id", "output_kind", "sha256", "parity_status"}
        if not isinstance(self.manifest, dict) or required - self.manifest.keys():
            missing = required - self.manifest.keys() if isinstance(self.manifest, dict) else required
            raise ValueError(f"Invalid model manifest; missing required fields: {sorted(missing)}")
        if not isinstance(self.manifest["sha256"], dict):
            raise ValueError("Invalid model manifest sha256 mapping")
        for name in ("mobilenetv3_imagenette.onnx", "class_to_idx.json", "preprocessing.json",
                     "onnx_parity_report.json"):
            expected = self.manifest["sha256"][name]
            if sha256_file(root / name) != expected:
                raise ValueError(f"SHA256 mismatch: {name}")
        parity = json.loads((root / "onnx_parity_report.json").read_text(encoding="utf-8"))
        if self.manifest.get("parity_status") != "passed" or parity.get("status") != "passed" or parity.get("samples", 0) < 20:
            raise ValueError("Artifact requires a passed parity report on at least 20 samples")
        self.preprocessing = json.loads((root / "preprocessing.json").read_text(encoding="utf-8"))
        validate_preprocessing(self.preprocessing)
        mapping = json.loads((root / "class_to_idx.json").read_text(encoding="utf-8"))
        if len(mapping) < 2 or sorted(mapping.values()) != list(range(len(mapping))):
            raise ValueError("Class mapping must be unique contiguous indices")
        self.class_names = sorted(mapping, key=mapping.get)
        self.model_id = self.manifest["model_id"]
        self.model_sha256 = self.manifest["sha256"]["mobilenetv3_imagenette.onnx"]
        import onnxruntime as ort
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(root / "mobilenetv3_imagenette.onnx"),
                                            sess_options=options, providers=["CPUExecutionProvider"])
        inputs, outputs = self.session.get_inputs(), self.session.get_outputs()
        if len(inputs) != 1 or inputs[0].type != "tensor(float)" or inputs[0].shape[1:] != [3, 224, 224]:
            raise ValueError("Expected one float32 NCHW [N,3,224,224] input")
        if len(outputs) != 1 or outputs[0].shape[1:] != [len(mapping)]:
            raise ValueError("Expected logits [N,C]")
        if self.manifest.get("output_kind") != "logits":
            raise ValueError("Manifest must declare output_kind=logits")
        self.input_name = inputs[0].name

    def predict(self, image_rgb_uint8):
        x = preprocess_image(image_rgb_uint8, self.preprocessing)
        logits = self.session.run(None, {self.input_name: x})[0]
        if logits.shape != (1, len(self.class_names)) or not np.isfinite(logits).all():
            raise ValueError("Invalid ONNX logits")
        exp = np.exp(logits[0] - logits[0].max())
        return (exp / exp.sum()).astype(np.float32)
