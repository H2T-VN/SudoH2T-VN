from dataclasses import dataclass

import numpy as np

from app.transforms.image_corruptions import check_image


@dataclass(frozen=True)
class Validity:
    status: str
    reason: str


def automatic_validity(original, transformed, spec):
    """Quality screen only: this cannot establish semantic label preservation."""
    check_image(original)
    check_image(transformed)
    if original.shape != transformed.shape:
        return Validity("invalid", "shape_changed")
    clipped = float(np.mean((transformed <= 2) | (transformed >= 253)))
    if clipped > 0.98 and transformed.std() < 2:
        return Validity("invalid", "near_constant_clipped_image")
    return Validity("provisionally_valid", "automatic_quality_screen_only")
