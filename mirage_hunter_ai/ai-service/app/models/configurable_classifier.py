"""Explicit image-classification adapter for operator-reviewed local ONNX models.

This is not an upload sandbox. The caller must review the model before runtime loading.
The legacy Imagenette adapter remains unchanged for the measured Kaggle artifacts.
"""
import json
from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.contracts import check_probabilities
from app.models.onnx_classifier import OnnxClassifier, sha256_file
from app.transforms.image_corruptions import check_image


class ClassificationPreprocessing(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    version: Literal["image-classification-v1"] = "image-classification-v1"
    input_size: tuple[int, int]  # height, width
    layout: Literal["NCHW", "NHWC"] = "NCHW"
    color_order: Literal["RGB", "BGR"] = "RGB"
    resize_mode: Literal["stretch", "shorter_center_crop"] = "stretch"
    resize_shorter: int | None = Field(default=None, ge=2, le=2048)
    interpolation: Literal["nearest", "bilinear", "bicubic"] = "bilinear"
    scale: float = Field(default=255.0, gt=0, le=65535)
    mean: tuple[float, float, float] = (0.0, 0.0, 0.0)
    std: tuple[float, float, float] = (1.0, 1.0, 1.0)

    @model_validator(mode="after")
    def supported_size(self):
        if any(isinstance(x, bool) or not 2 <= x <= 1024 for x in self.input_size):
            raise ValueError("input_size dimensions must be 2..1024")
        if any(x <= 0 for x in self.std):
            raise ValueError("std must be positive")
        if self.resize_mode == "shorter_center_crop":
            if self.input_size[0] != self.input_size[1] or self.resize_shorter is None:
                raise ValueError("shorter_center_crop needs square input and resize_shorter")
            if self.resize_shorter < self.input_size[0]:
                raise ValueError("resize_shorter must cover input_size")
        elif self.resize_shorter is not None:
            raise ValueError("stretch must not declare resize_shorter")
        return self


class ClassificationManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format_version: Literal["classification-onnx-v1"]
    task: Literal["image_classification"]
    model_id: str = Field(min_length=1, max_length=128)
    model_file: Literal["model.onnx"] = "model.onnx"
    model_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    class_names: list[str] = Field(min_length=2, max_length=1000)
    output_kind: Literal["logits", "probabilities"]
    preprocessing: ClassificationPreprocessing

    @model_validator(mode="after")
    def unique_classes(self):
        if any(not name.strip() for name in self.class_names) or len(set(self.class_names)) != len(self.class_names):
            raise ValueError("class_names must be non-empty and unique, in output order")
        return self


def preprocess_configurable(image, config: ClassificationPreprocessing):
    check_image(image)
    height, width = config.input_size
    im = Image.fromarray(image)
    interpolation = {"nearest": Image.Resampling.NEAREST, "bilinear": Image.Resampling.BILINEAR,
                     "bicubic": Image.Resampling.BICUBIC}[config.interpolation]
    if config.resize_mode == "stretch":
        im = im.resize((width, height), interpolation)
    else:
        shorter = config.resize_shorter
        size = ((shorter, int(shorter * im.height / im.width)) if im.width <= im.height else
                (int(shorter * im.width / im.height), shorter))
        if max(size) > 8192:
            raise ValueError("Resized image exceeds supported dimensions")
        im = im.resize(size, interpolation)
        left, top = round((im.width - width) / 2), round((im.height - height) / 2)
        im = im.crop((left, top, left + width, top + height))
    x = np.asarray(im, dtype=np.float32)
    if config.color_order == "BGR":
        x = x[:, :, ::-1]
    x = (x / config.scale - np.array(config.mean, dtype=np.float32)) / np.array(config.std, dtype=np.float32)
    if config.layout == "NCHW":
        x = x.transpose(2, 0, 1)
    return np.ascontiguousarray(x[None], dtype=np.float32)


def validate_self_contained_graph(path):
    """Check protobuf before ORT; not a security sandbox or a resource-use guarantee."""
    import onnx
    model = onnx.load_model(path, load_external_data=False)
    pending = [model]
    while pending:
        message = pending.pop()
        if message.DESCRIPTOR.full_name == "onnx.TensorProto":
            if message.external_data or message.data_location == onnx.TensorProto.EXTERNAL:
                raise ValueError("External-data ONNX is unsupported; provide one self-contained model.onnx")
        if message.DESCRIPTOR.full_name == "onnx.NodeProto" and message.domain not in ("", "ai.onnx"):
            raise ValueError("Custom operator domains are unsupported")
        for field, value in message.ListFields():
            if field.message_type is not None:
                pending.extend(value if field.is_repeated else [value])
    if model.functions or model.training_info:
        raise ValueError("Local functions and training graphs are unsupported in this adapter")
    onnx.checker.check_model(model)


class ConfigurableOnnxClassifier:
    def __init__(self, artifact_dir, *, trusted_local=False, max_model_bytes=64 * 1024 * 1024):
        if not trusted_local:
            raise ValueError("Custom ONNX requires operator-reviewed trusted_local=True; public upload is unsupported")
        root = Path(artifact_dir).resolve()
        manifest_path = root / "model_manifest.json"
        if manifest_path.stat().st_size > 1024 * 1024:
            raise ValueError("Manifest exceeds 1 MiB")
        self.config = ClassificationManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        path = (root / self.config.model_file).resolve()
        if path.parent != root or not path.is_file() or not 0 < path.stat().st_size <= max_model_bytes:
            raise ValueError("Model must be an in-bundle file within configured size limit")
        if sha256_file(path) != self.config.model_sha256:
            raise ValueError("SHA256 mismatch: model.onnx")
        validate_self_contained_graph(path)
        self.manifest = self.config.model_dump(mode="json")
        self.model_id = self.config.model_id
        self.model_sha256 = self.config.model_sha256
        self.class_names = list(self.config.class_names)
        self.preprocessing = self.config.preprocessing.model_dump(mode="json")
        import onnxruntime as ort
        options = ort.SessionOptions()
        options.intra_op_num_threads = options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])
        inputs, outputs = self.session.get_inputs(), self.session.get_outputs()
        height, width = self.config.preprocessing.input_size
        expected = [3, height, width] if self.config.preprocessing.layout == "NCHW" else [height, width, 3]
        if len(inputs) != 1 or inputs[0].type != "tensor(float)" or len(inputs[0].shape) != 4:
            raise ValueError("Expected exactly one float32 rank-4 image input")
        if inputs[0].shape[1:] != expected or (isinstance(inputs[0].shape[0], int) and inputs[0].shape[0] != 1):
            raise ValueError("ONNX input shape does not match configured single-image preprocessing")
        if len(outputs) != 1 or outputs[0].type != "tensor(float)" or len(outputs[0].shape) != 2:
            raise ValueError("Expected exactly one float32 [N,C] classification output")
        if outputs[0].shape[1] != len(self.class_names):
            raise ValueError("ONNX class dimension does not match class_names")
        self.input_name = inputs[0].name

    def predict(self, image_rgb_uint8):
        x = preprocess_configurable(image_rgb_uint8, self.config.preprocessing)
        values = self.session.run(None, {self.input_name: x})[0]
        if values.shape != (1, len(self.class_names)) or not np.isfinite(values).all():
            raise ValueError("Invalid ONNX classification output")
        if self.config.output_kind == "logits":
            exp = np.exp(values[0] - values[0].max())
            return check_probabilities(exp / exp.sum(), len(self.class_names))
        return check_probabilities(values[0], len(self.class_names))


def load_classifier(artifact_dir, *, trusted_local=False):
    """Dispatch by explicit format; preserve legacy parity checks and preprocessing."""
    path = Path(artifact_dir) / "model_manifest.json"
    if path.stat().st_size > 1024 * 1024:
        raise ValueError("Manifest exceeds 1 MiB")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(manifest, dict) and "format_version" in manifest:
        return ConfigurableOnnxClassifier(artifact_dir, trusted_local=trusted_local)
    return OnnxClassifier(artifact_dir)
