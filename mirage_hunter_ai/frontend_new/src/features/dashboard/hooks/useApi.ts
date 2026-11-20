import { useCallback, useEffect, useState } from "react";

import type { ApiError, ApiMeta, ApiResult, ApiSource } from "../services/types";

export interface UseApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  isMock: boolean;
  source: ApiSource | null;
  meta?: ApiMeta;
  retry: () => void;
}

export function useApi<T>(requester: () => Promise<ApiResult<T>>): UseApiState<T> {
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ApiSource | null>(null);
  const [meta, setMeta] = useState<ApiMeta | undefined>();

  useEffect(() => {
    let active = true;

    void requester().then((result) => {
      if (!active) return;
      setLoading(false);
      setSource(result.source);
      setMeta(result.meta);
      if (result.ok) {
        setData(result.data ?? null);
        setError(null);
      } else {
        setError(result.error ?? { code: "UNKNOWN_ERROR", message: "Không nhận được dữ liệu từ backend.", hint: "Thử lại hoặc kiểm tra contract API." });
      }
    });

    return () => {
      active = false;
    };
  }, [reloadKey, requester]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }, []);

  return { data, error, loading, isMock: source === "mock", source, meta, retry };
}
