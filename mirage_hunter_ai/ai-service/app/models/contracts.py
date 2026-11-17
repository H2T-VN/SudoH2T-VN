from typing import Literal, Protocol

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

TRANSFORMS = ("brightness", "blur", "noise", "jpeg")
TransformKind = Literal["brightness", "blur", "noise", "jpeg"]


class TransformationSpec(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", allow_inf_nan=False)
    kind: TransformKind
    severity: float = Field(ge=0, le=1)
    seed: int = Field(ge=0, le=2**32 - 1)
    direction: Literal[-1, 1] = 1


class HuntConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model_id: str = "mobilenetv3-imagenette-v1"
    dataset_id: str = "local-labelled"
    strategy: Literal["random", "tpe_only", "linucb_only", "hybrid"] = "hybrid"
    max_queries: int = Field(default=100, ge=0, le=100000)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
    transforms: list[TransformKind] = Field(default_factory=lambda: list(TRANSFORMS), min_length=1)
    startup_trials: int = Field(default=10, ge=1)
    alpha: float = Field(default=0.5, gt=0, allow_inf_nan=False)
    regularization: float = Field(default=1.0, gt=0, allow_inf_nan=False)
    exploration: float = Field(default=0.1, ge=0, le=1, allow_inf_nan=False)
    minimization_budget: int = Field(default=0, ge=0, le=10000)

    @model_validator(mode="after")
    def unique_transforms(self):
        if len(set(self.transforms)) != len(self.transforms):
            raise ValueError("transforms must be unique")
        return self


class ClassifierAdapter(Protocol):
    model_id: str
    model_sha256: str
    class_names: list[str]
    preprocessing: dict

    def predict(self, image_rgb_uint8: np.ndarray) -> np.ndarray:
        """Return finite probabilities float32 (C,) in class mapping order."""


def check_probabilities(value, num_classes: int) -> np.ndarray:
    p = np.asarray(value, dtype=np.float32)
    if p.shape != (num_classes,) or not np.isfinite(p).all():
        raise ValueError("Invalid classifier output shape or nonfinite values")
    if (p < 0).any() or not np.isclose(p.sum(), 1, atol=1e-5):
        raise ValueError("Classifier must return normalized probabilities")
    return p
