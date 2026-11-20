import { useCallback, useState, type ReactNode } from "react";

import { DashboardStateContext, STORAGE_KEYS } from "./dashboardStateContext";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readBoolean(key: string): boolean {
  return readStorage(key) === "true";
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Client-side state vẫn hoạt động khi storage bị khóa.
  }
}

export function DashboardStateProvider({ children }: { children: ReactNode }) {
  const [selectedModelId, setSelectedModel] = useState<string | null>(() => readStorage(STORAGE_KEYS.model));
  const [selectedDatasetId, setSelectedDataset] = useState<string | null>(() => readStorage(STORAGE_KEYS.dataset));
  const [runId, setRun] = useState<string | null>(() => readStorage(STORAGE_KEYS.run));
  const [publicModelUploadAllowed, setPublicUpload] = useState(() => readBoolean(STORAGE_KEYS.publicUpload));

  const setSelectedModelId = useCallback((id: string | null) => {
    setSelectedModel(id);
    writeStorage(STORAGE_KEYS.model, id);
  }, []);
  const setSelectedDatasetId = useCallback((id: string | null) => {
    setSelectedDataset(id);
    writeStorage(STORAGE_KEYS.dataset, id);
  }, []);
  const setRunId = useCallback((id: string | null) => {
    setRun(id);
    writeStorage(STORAGE_KEYS.run, id);
  }, []);
  const setPublicModelUploadAllowed = useCallback((allowed: boolean) => {
    setPublicUpload(allowed);
    writeStorage(STORAGE_KEYS.publicUpload, String(allowed));
  }, []);

  return (
    <DashboardStateContext.Provider value={{ selectedModelId, selectedDatasetId, runId, publicModelUploadAllowed, setSelectedModelId, setSelectedDatasetId, setRunId, setPublicModelUploadAllowed }}>
      {children}
    </DashboardStateContext.Provider>
  );
}
