from io import BytesIO

import numpy as np
from PIL import Image, ImageFilter

from app.models.contracts import TransformationSpec

TRANSFORM_VERSION = "rgb-corruptions-v1"


def check_image(image):
    if not isinstance(image, np.ndarray) or image.dtype != np.uint8:
        raise ValueError("Expected RGB uint8 ndarray")
    if image.ndim != 3 or image.shape[2] != 3 or min(image.shape[:2]) < 2:
        raise ValueError("Expected RGB HxWx3 image with H,W >= 2")


def physical_parameters(spec: TransformationSpec) -> dict:
    s = spec.severity
    return {
        "brightness": {"factor": 1 + spec.direction * 0.35 * s},
        "blur": {"sigma": 2 * s},
        "noise": {"sigma_uint8": 10 * s},
        "jpeg": {"quality": round(95 - 45 * s), "subsampling": 0},
    }[spec.kind]


def transform_image(image: np.ndarray, spec: TransformationSpec) -> np.ndarray:
    check_image(image)
    if spec.severity == 0:
        return image.copy()  # exact identity, including JPEG
    params = physical_parameters(spec)
    if spec.kind == "brightness":
        return np.clip(np.rint(image.astype(np.float32) * params["factor"]), 0, 255).astype(np.uint8)
    if spec.kind == "noise":
        rng = np.random.default_rng(spec.seed)
        return np.clip(np.rint(image.astype(np.float32) + rng.normal(
            0, params["sigma_uint8"], image.shape)), 0, 255).astype(np.uint8)
    if spec.kind == "blur":
        return np.asarray(Image.fromarray(image).filter(ImageFilter.GaussianBlur(params["sigma"]))).copy()
    buffer = BytesIO()
    Image.fromarray(image).save(buffer, format="JPEG", **params)
    buffer.seek(0)
    with Image.open(buffer) as decoded:
        return np.asarray(decoded.convert("RGB")).copy()
