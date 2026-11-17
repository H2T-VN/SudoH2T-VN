"""Clean classification evaluation independent of the Imagenette training pipeline."""
import time

import numpy as np

from app.models.contracts import check_probabilities


class EvaluationCancelled(RuntimeError):
    """Cooperative cancellation; incomplete clean metrics must not be published."""

    def __init__(self, inference_queries, phase="baseline"):
        self.inference_queries = inference_queries
        self.phase = phase
        super().__init__(f"Evaluation cancelled during {phase} after {inference_queries} inference attempts")


def evaluate_baseline(images, labels, model, source_ids=None, *, progress=None, cancelled=None):
    if not images or len(images) != len(labels):
        raise ValueError("Need equal non-empty images and ground-truth labels")
    source_ids = list(source_ids) if source_ids is not None else [str(i) for i in range(len(images))]
    if len(source_ids) != len(images) or len(set(source_ids)) != len(source_ids):
        raise ValueError("source_ids must be unique and aligned")
    count = len(model.class_names)
    if any(isinstance(y, (bool, np.bool_)) or not isinstance(y, (int, np.integer)) or not 0 <= y < count for y in labels):
        raise ValueError("Baseline requires a valid ground-truth index for every image")
    matrix = np.zeros((count, count), dtype=np.int64)
    records, eligible = [], []
    start = time.perf_counter()
    if progress:
        progress(0, len(images))
    for image, label, source_id in zip(images, labels, source_ids):
        if cancelled and cancelled():
            raise EvaluationCancelled(len(records))
        t0 = time.perf_counter()
        p = check_probabilities(model.predict(image), count)  # Errors fail evaluation; never silently drop rows.
        pred = int(p.argmax())
        matrix[label, pred] += 1
        if pred == label:
            eligible.append(source_id)
        records.append({"source_image_id": source_id, "ground_truth": int(label), "prediction": pred,
                        "confidence": float(p.max()), "correct": pred == label,
                        "latency_ms": (time.perf_counter() - t0) * 1000})
        if progress:
            progress(len(records), len(images))
    if cancelled and cancelled():
        raise EvaluationCancelled(len(records))
    per_class = []
    for index, name in enumerate(model.class_names):
        tp = int(matrix[index, index])
        support, predicted = int(matrix[index].sum()), int(matrix[:, index].sum())
        precision = tp / predicted if predicted else 0.0
        recall = tp / support if support else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class.append({"class_index": index, "class_name": name, "support": support,
                          "precision": precision, "recall": recall, "f1": f1})
    return {"model_id": model.model_id, "model_sha256": model.model_sha256,
            "class_names": list(model.class_names), "count": len(images), "inference_queries": len(images),
            "accuracy": float(np.trace(matrix) / len(images)),
            "macro_precision": float(np.mean([c["precision"] for c in per_class])),
            "macro_recall": float(np.mean([c["recall"] for c in per_class])),
            "macro_f1": float(np.mean([c["f1"] for c in per_class])),
            "zero_division_policy": "0; macro includes all declared classes, including absent classes",
            "confusion_matrix": matrix.tolist(), "per_class": per_class,
            "eligible_source_ids": eligible, "baseline_incorrect": len(images) - len(eligible),
            "runtime_seconds": time.perf_counter() - start, "records": records}
