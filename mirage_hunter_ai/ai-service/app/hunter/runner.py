import csv
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from pydantic import BaseModel

from app.evaluation.classification_oracle import CONFIDENCE_CHANGE_ATOL, classify_failure
from app.evaluation.fingerprint import environment, pixel_hash, save_case, write_json
from app.evaluation.metrics import summarize
from app.evaluation.validity import automatic_validity
from app.hunter.context import FEATURE_VERSION, extract_context
from app.hunter.hybrid import create_strategy
from app.minimization.minimizer import minimize_failure
from app.models.contracts import HuntConfig, check_probabilities
from app.transforms.image_corruptions import check_image, physical_parameters, transform_image


class HuntResult(BaseModel):
    run_id: str
    status: str
    model_id: str
    strategy: str
    seed: int
    max_queries: int
    actual_queries: int
    baseline_queries: int
    minimization_queries: int
    total_target_inferences: int
    confirmed_failures: int
    candidate_failures: int
    summary: dict
    failure_cases: list[dict]
    trials: list[dict]


def run_hunt(images, labels, model, config: HuntConfig, output_dir, *, source_ids=None,
             validity_policy=automatic_validity, progress=None, cancelled=None, baseline_progress=None):
    """One fresh strategy per run; output_dir must not exist. All inference attempts consume budget.

    Backend owns allowlists, queue, timeout/cancellation and storage. Review callbacks must be trusted
    server-side functions; never accept a browser-provided 'verified' boolean.
    Automatic quality screening yields candidate failures only. Confirmed failures require
    a trusted review of semantic label preservation for the exact transformed pixels.
    """
    if len(images) != len(labels) or not len(images):
        raise ValueError("Need equal non-empty images/labels")
    if model.model_id != config.model_id:
        raise ValueError("model_id does not match configured target")
    source_ids = list(source_ids) if source_ids is not None else [str(i) for i in range(len(images))]
    if len(source_ids) != len(images) or len(set(source_ids)) != len(source_ids):
        raise ValueError("source_ids must be unique and align with images")
    for image, label in zip(images, labels):
        check_image(image)
        if label is not None and (not isinstance(label, (int, np.integer)) or not 0 <= label < len(model.class_names)):
            raise ValueError("Ground truth must be a class index or None")
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=False)
    start = time.perf_counter()
    run_id = uuid.uuid4().hex
    write_json(root / "config.json", config.model_dump())
    write_json(root / "environment.json", environment())
    records, baselines, baseline_errors, eligible = [], {}, [], []
    baseline_queries = 0
    if baseline_progress:
        baseline_progress(0, len(images))
    for index, (image, label) in enumerate(zip(images, labels)):
        if cancelled and cancelled():
            break
        baseline_queries += 1
        try:
            p = check_probabilities(model.predict(image), len(model.class_names))
        except Exception as exc:
            baseline_errors.append({"source_image_id": source_ids[index], "error": str(exc)})
            if baseline_progress:
                baseline_progress(baseline_queries, len(images))
            continue
        baselines[index] = p
        if label is None or int(p.argmax()) == label:
            eligible.append(index)
        if baseline_progress:
            baseline_progress(baseline_queries, len(images))
    # Independent schedule RNG: strategy sampling never changes which image gets tested.
    schedule_rng = np.random.default_rng(config.seed)
    schedule = []
    while eligible and len(schedule) < config.max_queries:
        schedule.extend(schedule_rng.permutation(eligible).tolist())
    schedule = schedule[:config.max_queries]
    write_json(root / "schedule.json", [source_ids[i] for i in schedule])
    strategy = create_strategy(config)
    queries, min_queries = 0, 0
    cases, min_errors = [], []
    status = "cancelled" if cancelled and cancelled() else ("completed" if eligible else "no_eligible_sources")
    for trial_index, image_index in enumerate(schedule):
        if cancelled and cancelled():
            status = "cancelled"
            break
        original = images[image_index]
        label = labels[image_index]
        label = int(label) if label is not None else None
        baseline = baselines[image_index]
        context = extract_context(original, baseline)
        spec = strategy.suggest(context, trial_index)
        changed = transform_image(original, spec)
        validity = validity_policy(original, changed, spec)
        if validity.status not in ("verified", "provisionally_valid", "invalid"):
            raise ValueError("Unknown validity status")
        row = {"run_id": run_id, "trial_id": trial_index, "source_image_id": source_ids[image_index],
               "model_sha256": model.model_sha256, "model_id": model.model_id,
               "preprocessing": model.preprocessing, "class_names": model.class_names,
               "strategy": config.strategy, "action": spec.kind, "severity": spec.severity,
               "seed": spec.seed, "transform": spec.model_dump(), "physical_parameters": physical_parameters(spec),
               "ground_truth": label, "original_pred": int(baseline.argmax()),
               "original_conf": float(baseline.max()), "original_probabilities": baseline.tolist(),
               "context": context.tolist(), "feature_version": FEATURE_VERSION,
               "source_sha256": pixel_hash(original), "image_sha256": pixel_hash(changed),
               "validity_status": validity.status, "validity_reason": validity.reason,
               "timestamp": datetime.now(timezone.utc).isoformat()}
        t0 = time.perf_counter()
        queries += 1  # Includes rejected/failed target calls; never retry outside budget.
        try:
            p = check_probabilities(model.predict(changed), len(model.class_names))
        except Exception as exc:
            strategy.update(context, spec, 0, 0, False)
            row.update(failure_status="error", error=str(exc), query_index=queries,
                       latency_ms=(time.perf_counter() - t0) * 1000)
            records.append(row)
            if progress:
                progress(queries, config.max_queries)
            continue
        confidence_delta = float(p.max()) - float(baseline.max())
        confidence_changed = abs(confidence_delta) > CONFIDENCE_CHANGE_ATOL
        failure_status = classify_failure(label, int(baseline.argmax()), int(p.argmax()), validity,
                                          confidence_changed=confidence_changed)
        margin = float(np.max(np.delete(p, label)) - p[label]) if label is not None else None
        # Explicit proxy feedback on quality-screened labelled images. Proxies NEVER count as confirmed.
        usable = validity.status != "invalid" and label is not None
        reward = float(int(p.argmax()) != label) if usable else 0.0
        strategy.update(context, spec, reward, margin if margin is not None else 0, usable)
        row.update(transformed_pred=int(p.argmax()), transformed_conf=float(p.max()),
                   transformed_probabilities=p.tolist(), margin=margin, failure_status=failure_status,
                   confidence_delta=confidence_delta, confidence_changed=confidence_changed,
                   confidence_change_atol=CONFIDENCE_CHANGE_ATOL,
                   feedback_kind="verified" if validity.status == "verified" else "automatic_proxy",
                   query_index=queries, latency_ms=(time.perf_counter() - t0) * 1000)
        case_id = f"trial-{trial_index:06d}"
        row["artifact_path"] = case_id
        save_case(root / case_id, original, changed, row)
        records.append(row)
        if failure_status in ("confirmed_failure", "candidate") and (label is None or int(p.argmax()) != label):
            cases.append(row)
            remaining = config.minimization_budget - min_queries
            if remaining > 0:
                best, best_image, used, errors = minimize_failure(
                    original, row, model, validity_policy, remaining, cancelled=cancelled)
                min_queries += used
                min_errors.extend(errors)
                if best_image is not None:
                    best["artifact_path"] = case_id + "-minimized"
                    save_case(root / best["artifact_path"], original, best_image, best)
                    row["minimum_found"] = {"severity": best["severity"], "artifact_path": best["artifact_path"]}
        if progress:
            progress(queries, config.max_queries)
    if cancelled and cancelled():
        status = "cancelled"
    labelled = [i for i in baselines if labels[i] is not None]
    summary = {**summarize(records), "baseline_accuracy": (
        sum(int(baselines[i].argmax()) == labels[i] for i in labelled) / len(labelled) if labelled else None),
        "baseline_errors": baseline_errors, "eligible_sources": len(eligible),
        "baseline_incorrect_sources": sum(int(baselines[i].argmax()) != labels[i] for i in labelled),
        "baseline_labelled_evaluated": len(labelled), "runtime_seconds": time.perf_counter() - start,
        "actual_queries": queries, "baseline_queries": baseline_queries, "minimization_queries": min_queries,
        "total_target_inferences": queries + baseline_queries + min_queries,
        "minimization_errors": min_errors, "feedback_policy": "quality-screened proxy; confirmation requires review",
        "invalid_rate": sum(r["failure_status"] == "invalid" for r in records) / queries if queries else None}
    write_json(root / "summary.json", summary)
    with (root / "trial_log.csv").open("w", newline="", encoding="utf-8") as stream:
        fields = sorted({key for row in records for key in row})
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    with (root / "failure_cases.jsonl").open("w", encoding="utf-8") as stream:
        import json
        for case in cases:
            stream.write(json.dumps(case, allow_nan=False) + "\n")
    result = HuntResult(run_id=run_id, status=status, model_id=model.model_id, strategy=config.strategy,
                        seed=config.seed, max_queries=config.max_queries, actual_queries=queries,
                        baseline_queries=baseline_queries, minimization_queries=min_queries,
                        total_target_inferences=queries + baseline_queries + min_queries,
                        confirmed_failures=summary["confirmed_failures"],
                        candidate_failures=summary["candidate_failures"], summary=summary,
                        failure_cases=cases, trials=records)
    write_json(root / "result.json", result.model_dump())
    return result
