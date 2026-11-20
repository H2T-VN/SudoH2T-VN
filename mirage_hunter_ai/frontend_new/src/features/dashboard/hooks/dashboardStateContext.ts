import { createContext } from "react";

export interface DashboardState {
  selectedModelId: string | null;
  selectedDatasetId: string | null;
  runId: string | null;
  publicModelUploadAllowed: boolean;
  setSelectedModelId: (id: string | null) => void;
  setSelectedDatasetId: (id: string | null) => void;
  setRunId: (id: string | null) => void;
  setPublicModelUploadAllowed: (allowed: boolean) => void;
}

export const STORAGE_KEYS = {
  model: "miragehunter.selected-model",
  dataset: "miragehunter.selected-dataset",
  run: "miragehunter.run-id",
  publicUpload: "miragehunter.public-model-upload",
};

export const DashboardStateContext = createContext<DashboardState | null>(null);
