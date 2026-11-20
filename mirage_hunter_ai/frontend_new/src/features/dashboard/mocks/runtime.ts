import type { HuntConfig, HuntRun } from "../services/types";
import { mockHuntDefaults } from "./data";

const runs = new Map<string, HuntRun>();
const startedAt = new Map<string, number>();
let sequence = 1;

function createInitialRun(runId: string, config: HuntConfig): HuntRun {
  return {
    run_id: runId,
    status: "queued",
    progress: 0,
    inference_used: 0,
    inference_budget: config.budget,
    elapsed_s: 0,
    model_id: config.model_id,
    dataset_id: config.dataset_id,
    strategies: config.strategies,
    transforms: config.transforms,
    logs: [{ timestamp: "--:--:--", message: "Dữ liệu mẫu: run đã được tạo, chưa có inference thật.", level: "info" }],
    failures_over_inference: [],
    transform_priority: [],
    tpe_narrowing: [],
    new_failures: [],
  };
}

export function createMockRun(config: HuntConfig): HuntRun {
  const runId = `mock-run-${String(sequence).padStart(3, "0")}`;
  sequence += 1;
  const run = createInitialRun(runId, config);
  runs.set(runId, run);
  startedAt.set(runId, Date.now());
  return run;
}

export function getMockRun(runId: string): HuntRun {
  const existing = runs.get(runId);
  if (existing) {
    const elapsed = Math.max(0, Math.round((Date.now() - (startedAt.get(runId) ?? Date.now())) / 1000));
    const progress = Math.min(100, Math.max(existing.progress ?? 0, Math.floor(elapsed / 5 * 100)));
    existing.elapsed_s = progress > 0 ? elapsed : 0;
    existing.progress = progress;
    existing.inference_used = Math.round((existing.inference_budget ?? mockHuntDefaults.budget) * progress / 100);
    if (progress >= 100) {
      existing.status = "done";
    } else if (progress > 0) {
      existing.status = "running";
    }
    return existing;
  }

  const fallback = createInitialRun(runId, {
    model_id: "",
    dataset_id: "",
    strategies: [],
    transforms: [],
    budget: mockHuntDefaults.budget,
    seed: mockHuntDefaults.seed,
    timeout_s: mockHuntDefaults.timeout_s,
  });
  runs.set(runId, fallback);
  startedAt.set(runId, Date.now());
  return fallback;
}

export function cancelMockRun(runId: string): HuntRun {
  const run = getMockRun(runId);
  run.status = "cancelled";
  run.logs = [...run.logs, { timestamp: "--:--:--", message: "Dữ liệu mẫu: run đã được hủy ở giao diện.", level: "warning" }];
  return run;
}
