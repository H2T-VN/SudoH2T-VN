"""Local controlled-model workflow; no public upload service or execution sandbox."""
import argparse
from pathlib import Path

from app.evaluation.baseline import EvaluationCancelled, evaluate_baseline
from app.evaluation.fingerprint import environment, write_json
from app.evaluation.labelled_dataset import load_labelled_dataset
from app.hunter.runner import run_hunt
from app.models.configurable_classifier import load_classifier
from app.models.contracts import HuntConfig


def run_classification(artifacts, dataset, output, *, trusted_local=False, strategy="hybrid", queries=20, seed=42,
                       dataset_id="local-labelled-csv", progress=None, cancelled=None):
    """Small reviewed-model workflow; callbacks are supplied by the worker, not a browser.

    progress receives {phase, completed, total, unit}; all counters are phase-local.
    EvaluationCancelled during preparation/baseline means no completed report exists.
    Cancellation during hunting returns a partial report with status='cancelled'.
    """
    if not 0 <= queries <= 30:
        raise ValueError("Local workflow accepts 0..30 queries; heavy benchmark runs on Kaggle")
    config = HuntConfig(dataset_id=dataset_id, strategy=strategy, seed=seed, max_queries=queries)

    def emit(phase, completed, total, unit):
        if progress:
            progress({"phase": phase, "completed": completed, "total": total, "unit": unit})

    def check_preparing_cancelled():
        if cancelled and cancelled():
            raise EvaluationCancelled(0, phase="preparing")

    check_preparing_cancelled()
    emit("preparing", 0, 2, "steps")
    model = load_classifier(artifacts, trusted_local=trusted_local)
    config = config.model_copy(update={"model_id": model.model_id})
    check_preparing_cancelled()
    emit("preparing", 1, 2, "steps")
    check_preparing_cancelled()
    data = load_labelled_dataset(dataset, model.class_names)
    check_preparing_cancelled()
    emit("preparing", 2, 2, "steps")
    root = Path(output)
    root.mkdir(parents=True, exist_ok=False)
    write_json(root / "dataset_manifest.json", data.manifest)
    write_json(root / "environment.json", environment())
    baseline = evaluate_baseline(data.images, data.labels, model, data.source_ids,
                                 progress=lambda done, total: emit("baseline", done, total, "images"),
                                 cancelled=cancelled)
    write_json(root / "baseline.json", baseline)
    result = run_hunt(data.images, data.labels, model, config, root / "hunt", source_ids=data.source_ids,
                      baseline_progress=lambda done, total: emit("hunt_baseline", done, total, "images"),
                      progress=lambda done, total: emit("hunting", done, total, "queries"), cancelled=cancelled)
    report = {"scope": "local controlled image classification; no HTTP/public upload",
              "status": result.status, "run_id": result.run_id, "dataset_id": dataset_id,
              "model_id": model.model_id, "model_sha256": model.model_sha256,
              "baseline": baseline, "hunt_summary": result.summary,
              "hunt_result": "hunt/result.json", "baseline_evaluation_queries": baseline["inference_queries"],
              "hunt_inferences_including_baseline": result.total_target_inferences,
              "total_target_inferences": baseline["inference_queries"] + result.total_target_inferences,
              "note": "Clean evaluation and hunt baseline are separate passes; both are included in total cost."}
    write_json(root / "report.json", report)
    emit("finished", 1, 1, "steps")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--trusted-local-model", action="store_true", help="Operator has reviewed this custom model")
    parser.add_argument("--strategy", choices=["random", "tpe_only", "linucb_only", "hybrid"], default="hybrid")
    parser.add_argument("--queries", type=int, default=20)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dataset-id", default="local-labelled-csv")
    args = parser.parse_args()
    report = run_classification(args.artifacts, args.dataset, args.output,
                                trusted_local=args.trusted_local_model, strategy=args.strategy,
                                queries=args.queries, seed=args.seed, dataset_id=args.dataset_id)
    print(f"{report['status']}: {report['model_id']}; report: {Path(args.output) / 'report.json'}")


if __name__ == "__main__":
    main()
