import numpy as np

FEATURE_VERSION = "luminance-sharpness-confidence-v1"


def extract_context(image, probabilities):
    luminance = image.astype(np.float64).mean(axis=2) / 255
    center = luminance[1:-1, 1:-1]
    if center.size:
        lap = (-4 * center + luminance[:-2, 1:-1] + luminance[2:, 1:-1]
               + luminance[1:-1, :-2] + luminance[1:-1, 2:])
        sharpness = min(float(np.log1p(lap.var() * 1e4) / 10), 1.0)
    else:
        sharpness = 0.0
    p = np.asarray(probabilities, dtype=np.float64)
    entropy = -np.sum(p * np.log(np.clip(p, 1e-12, 1))) / np.log(len(p))
    return np.array([1, luminance.mean(), luminance.std(), sharpness, p.max(), entropy])
