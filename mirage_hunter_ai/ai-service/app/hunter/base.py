from typing import Protocol

import numpy as np

from app.models.contracts import TransformationSpec


class HunterStrategy(Protocol):
    name: str

    def suggest(self, context: np.ndarray, trial_index: int) -> TransformationSpec: ...

    def update(self, context, spec, reward: float, score: float, valid: bool) -> None: ...
