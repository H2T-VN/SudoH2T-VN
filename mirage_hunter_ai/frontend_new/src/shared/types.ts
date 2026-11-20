export type ResultState =
  | "baseline_incorrect"
  | "candidate"
  | "confirmed_failure"
  | "not_failed"
  | "invalid";

export type HuntStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface ModelRecord {
  id: string;
  name: string;
  version: string;
  framework: string;
  status: "ready" | "warning" | "draft";
  inputShape: string;
  dtype: string;
  preprocessing: string;
  classes: string[];
  outputSchema: string;
  latency: string;
  description: string;
}

export interface DatasetRecord {
  id: string;
  name: string;
  version: string;
  imageCount: number;
  classCount: number;
  labels: string[];
  status: "ready" | "warning";
  updatedAt: string;
  imageSamples: string[];
}

export interface MetricSet {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface HuntRecord {
  id: string;
  name: string;
  modelId: string;
  datasetId: string;
  strategy: string;
  status: HuntStatus;
  progress: number;
  inferenceUsed: number;
  inferenceBudget: number;
  createdAt: string;
  confirmedFailures: number;
  firstFailureAt: number | null;
  errorMessage?: string;
}

export interface FailureCase {
  id: string;
  huntId: string;
  modelId: string;
  datasetId: string;
  groundTruth: string;
  beforePrediction: string;
  afterPrediction: string;
  beforeConfidence: number;
  afterConfidence: number;
  transform: string;
  transformValue: string;
  state: ResultState;
  seed: number;
  modelVersion: string;
  createdAt: string;
  imageVariant: "city" | "bird" | "flower" | "vehicle";
}

export interface RegressionTest {
  id: string;
  name: string;
  failureId: string;
  modelVersion: string;
  state: "ready" | "needs-review";
  updatedAt: string;
}
