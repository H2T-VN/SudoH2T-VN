from collections import Counter


def summarize(records):
    counts = Counter(r["failure_status"] for r in records)
    confirmed = [r for r in records if r["failure_status"] == "confirmed_failure"]
    candidates = [r for r in records if r["failure_status"] == "candidate"]
    valid = [r for r in records if r.get("validity_status") == "verified" and r["failure_status"] != "error"
             and r.get("ground_truth") is not None and r.get("original_pred") == r["ground_truth"]]
    first = next((r["query_index"] for r in confirmed), None)
    def minimum_by_action(rows):
        result = {}
        for row in rows:
            severity = row.get("minimum_found", {}).get("severity", row["severity"])
            result[row["action"]] = min(result.get(row["action"], 1.0), severity)
        return result
    return {"confirmed_failures": len(confirmed), "candidate_failures": len(candidates),
            "invalid_trials": counts["invalid"], "error_trials": counts["error"],
            "valid_queries": len(valid),
            "provisional_queries": sum(r.get("validity_status") == "provisionally_valid" for r in records),
            "confirmed_failure_rate": len(confirmed) / len(valid) if valid else None,
            "queries_to_first_failure": first,
            "queries_to_first_candidate": next((r["query_index"] for r in candidates), None),
            "unique_confirmed_failures": len({(r["source_image_id"], r["action"]) for r in confirmed}),
            "unique_candidate_failures": len({(r["source_image_id"], r["action"]) for r in candidates}),
            "minimum_confirmed_severity_by_action": minimum_by_action(confirmed),
            "minimum_candidate_severity_by_action": minimum_by_action(candidates)}
