"""Small real-model worker-call smoke; no HTTP server, training or heavy benchmark."""
import argparse
from pathlib import Path

from app.pipelines.classification import run_classification
from app.evaluation.fingerprint import replay_case, write_json
from app.models.configurable_classifier import load_classifier


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--trusted-local-model", action="store_true")
    parser.add_argument("--queries", type=int, choices=range(1, 31), default=3)
    args = parser.parse_args()
    events = []
    report = run_classification(args.artifacts, args.dataset, args.output,
                                trusted_local=args.trusted_local_model, queries=args.queries,
                                dataset_id="imagenette-selected-compatibility-smoke", progress=events.append,
                                cancelled=lambda: False)
    root = Path(args.output)
    model = load_classifier(args.artifacts, trusted_local=args.trusted_local_model)
    import json
    hunt = json.loads((root / "hunt/result.json").read_text(encoding="utf-8"))
    replayed = 0
    for trial in hunt["trials"]:
        if "artifact_path" in trial:
            replay_case(root / "hunt" / trial["artifact_path"], model)
            replayed += 1
    if report["status"] != "completed" or replayed != args.queries:
        raise RuntimeError("Smoke did not complete/replay the requested query budget")
    result = {"evidence_kind": "executed_local_library_smoke", "http_verified": False,
              "not_an_accuracy_benchmark": True, "not_a_new_training_run": True,
              "providers": model.session.get_providers(), "report": report,
              "progress_events": events, "replayed_trials": replayed,
              "replay_inferences_included_in_workflow_total": False,
              "note": "Replay performs additional inference outside the workflow report's budget."}
    write_json(root / "integration_smoke.json", result)
    print(f"{report['status']}: {len(events)} progress events; {replayed} replays; {root / 'integration_smoke.json'}")


if __name__ == "__main__":
    main()
