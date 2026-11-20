export type ApiSource = "api" | "mock";

export interface ApiError {
  code: string;
  message: string;
  hint: string;
}

export interface ApiMeta {
  status: number | null;
  durationMs: number;
  fallbackReason?: ApiError;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
  source: ApiSource;
  meta?: ApiMeta;
}

export interface HealthData {
  status?: string;
  service?: string;
  onnx_runtime?: string;
  queue?: string;
  ram?: string;
  cpu?: string;
  version?: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  architecture: string;
  task: string;
  class_count: number | null;
  size_mb: number | null;
  approved: boolean;
  source: "demo" | "user";
  description: string;
  validation?: string;
}

export interface DatasetDistributionItem {
  label: string;
  count: number;
}

export interface DatasetRecord {
  id: string;
  name: string;
  format: string;
  image_count: number | null;
  class_count: number | null;
  classes: string[];
  distribution: DatasetDistributionItem[];
  preview_images: string[];
  source: "demo" | "user";
  validation_issues: string[];
  updated_at?: string;
}

export interface StrategyOption {
  id: string;
  label: string;
  description: string;
}

export interface HuntConfig {
  model_id: string;
  dataset_id: string;
  strategies: string[];
  transforms: string[];
  budget: number;
  seed: number;
  timeout_s: number;
}

export type HuntStatus = "queued" | "running" | "done" | "failed" | "cancelled" | "timeout";

export interface HuntLogEntry {
  timestamp: string;
  message: string;
  level?: "info" | "warning" | "error";
}

export interface HuntFailurePreview {
  id: string;
  label: string;
  transform: string;
  thumbnail?: string;
  state?: string;
}

export interface HuntRun {
  run_id: string;
  status: HuntStatus;
  progress: number | null;
  inference_used: number | null;
  inference_budget: number | null;
  elapsed_s: number | null;
  model_id?: string;
  dataset_id?: string;
  strategies?: string[];
  transforms?: string[];
  logs: HuntLogEntry[];
  failures_over_inference: number[];
  transform_priority: Array<{ transform: string; priority: number | null }>;
  tpe_narrowing: Array<{ step: string; strength: number | null }>;
  new_failures: HuntFailurePreview[];
}

export interface HuntResults {
  run_id: string;
  statuses: Record<string, number>;
  failures: HuntFailurePreview[];
}

export interface SmokeTestResult {
  logits?: number[];
  probabilities?: number[];
  elapsed_ms?: number;
}
