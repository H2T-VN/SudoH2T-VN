import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.evaluation.fingerprint import environment, write_json
from app.hunter.runner import run_hunt
from app.models.contracts import HuntConfig
from app.models.onnx_classifier import OnnxClassifier, sha256_file
from experiments.scripts.common import find_dataset, require_kaggle


def benchmark(artifact_dir, config, dataset_root=None):
    require_kaggle()
    import resource
    root = find_dataset(dataset_root)
    artifact_dir = Path(artifact_dir)
    model = OnnxClassifier(artifact_dir)
    split_path = artifact_dir / "split_manifest.json"
    if sha256_file(split_path) != model.manifest["sha256"]["split_manifest.json"]:
        raise ValueError("Split manifest hash mismatch")
    split = json.loads(split_path.read_text())
    # Independent fixed subset selected once; all strategies/seeds see exactly these images.
    entries = split["test"]
    rng = np.random.default_rng(2026)
    chosen = sorted(rng.choice(len(entries), min(config["max_images"], len(entries)), replace=False).tolist())
    selected = [entries[index] for index in chosen]
    images = []
    for entry in selected:
        path = root / entry["id"]
        if sha256_file(path) != entry["sha256"]:
            raise ValueError(f"Dataset content mismatch: {entry['id']}")
        with Image.open(path) as image:
            images.append(np.asarray(image.convert("RGB")).copy())
    labels, ids = [entry["label"] for entry in selected], [entry["id"] for entry in selected]
    output = Path(config["output_dir"])
    output.mkdir(parents=True, exist_ok=False)
    write_json(output / "config.json", config)
    write_json(output / "environment.json", environment())
    write_json(output / "selected_test_images.json", selected)
    rows = []
    for seed in config["seeds"]:
        for strategy in config["strategies"]:
            hunt_config = HuntConfig(model_id=model.model_id, dataset_id="imagenette-held-out",
                                     strategy=strategy, seed=seed, max_queries=config["max_queries"],
                                     startup_trials=config["startup_trials"],
                                     minimization_budget=config.get("minimization_budget", 0))
            result = run_hunt(images, labels, model, hunt_config, output / f"{strategy}-{seed}", source_ids=ids)
            fields = ("confirmed_failures", "candidate_failures", "unique_confirmed_failures", "unique_candidate_failures",
                      "queries_to_first_failure", "queries_to_first_candidate", "actual_queries", "baseline_queries",
                      "total_target_inferences", "invalid_rate", "runtime_seconds", "baseline_accuracy")
            row = {"strategy": strategy, "seed": seed, "model_sha256": model.model_sha256,
                   **{field: result.summary[field] for field in fields},
                   # Linux ru_maxrss is KB; cumulative process high-water, not isolated per-strategy RAM.
                   "process_peak_ram_mb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024}
            rows.append(row)
    with (output / "benchmark.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    aggregates = {}
    for strategy in config["strategies"]:
        aggregates[strategy] = {}
        for metric in ("confirmed_failures", "candidate_failures", "unique_candidate_failures", "runtime_seconds"):
            values = np.array([r[metric] for r in rows if r["strategy"] == strategy], dtype=float)
            aggregates[strategy][metric] = {"mean": float(values.mean()),
                                          "std": float(values.std(ddof=1)) if len(values) > 1 else None,
                                          "n": len(values)}
    write_json(output / "aggregate.json", aggregates)
    import matplotlib.pyplot as plt
    strategies = config["strategies"]
    values = [aggregates[s]["unique_candidate_failures"] for s in strategies]
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.bar(strategies, [v["mean"] for v in values], yerr=[v["std"] or 0 for v in values], capsize=5)
    ax.set_ylabel("Unique candidate failures (automatic screen only)")
    ax.set_title("Measured held-out benchmark; mean and sample SD across seeds")
    fig.tight_layout()
    fig.savefig(output / "candidate_benchmark.png", dpi=160)
    plt.close(fig)
    return output


if __name__ == "__main__":
    import yaml
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--dataset-root")
    args = parser.parse_args()
    benchmark(args.artifacts, yaml.safe_load(Path(args.config).read_text()), args.dataset_root)
