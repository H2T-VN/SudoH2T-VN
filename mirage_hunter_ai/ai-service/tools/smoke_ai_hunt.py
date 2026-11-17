"""Small CPU library integration smoke; training/heavy benchmarks remain on Kaggle."""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.evaluation.fingerprint import replay_case
from app.hunter.runner import run_hunt
from app.models.contracts import HuntConfig
from app.models.onnx_classifier import OnnxClassifier


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", required=True, help="Trusted ONNX deployment bundle")
    parser.add_argument("--case", required=True, help="Saved labelled case with original.png and fingerprint.json")
    parser.add_argument("--output", required=True, help="New output directory")
    parser.add_argument("--queries", type=int, choices=range(1, 31), default=3, metavar="1..30")
    args = parser.parse_args(argv)
    model = OnnxClassifier(args.artifacts)
    record = replay_case(args.case, model)
    label = record["ground_truth"]
    if label is None:
        parser.error("Library integration smoke requires a trusted ground-truth label")
    with Image.open(Path(args.case) / "original.png") as image:
        original = np.asarray(image.convert("RGB")).copy()
    progress_events = []
    config = HuntConfig(model_id=model.model_id, dataset_id="imagenette-kaggle-saved-case",
                        strategy="hybrid", seed=42, max_queries=args.queries)
    result = run_hunt([original], [label], model, config, args.output,
                      source_ids=[record["source_image_id"]],
                      progress=lambda done, total: progress_events.append({"done": done, "total": total}))
    if result.status != "completed" or result.actual_queries != args.queries:
        raise RuntimeError("Library smoke did not complete the requested budget")
    report = {"scope": "local CPU library integration smoke; not an HTTP or production deployment test",
              "replayed_case": str(args.case), "replay_passed": True,
              "model_sha256": model.model_sha256, "providers": model.session.get_providers(),
              "config": config.model_dump(), "result": result.model_dump(),
              "progress_events": progress_events}
    (Path(args.output) / "smoke_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"status": result.status, "actual_queries": result.actual_queries,
                      "baseline_queries": result.baseline_queries, "replay_passed": True,
                      "providers": report["providers"], "report": str(Path(args.output) / "smoke_report.json")}))
    return report


if __name__ == "__main__":
    main()
