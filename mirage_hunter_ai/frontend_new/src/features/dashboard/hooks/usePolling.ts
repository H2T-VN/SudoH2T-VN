import { useCallback, useEffect, useState } from "react";

import type { ApiError, ApiMeta, ApiResult, ApiSource } from "../services/types";

interface UsePollingOptions<T> {
  enabled: boolean;
  intervalMs: number;
  fetcher: () => Promise<ApiResult<T>>;
  isDone: (data: T) => boolean;
}

interface UsePollingState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  polling: boolean;
  isMock: boolean;
  source: ApiSource | null;
  meta?: ApiMeta;
  retry: () => void;
}

const MAX_BACKOFF_MS = 15_000;

export function usePolling<T>({ enabled, intervalMs, fetcher, isDone }: UsePollingOptions<T>): UsePollingState<T> {
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [polling, setPolling] = useState(enabled);
  const [source, setSource] = useState<ApiSource | null>(null);
  const [meta, setMeta] = useState<ApiMeta | undefined>();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let active = true;
    let timeoutId: number | undefined;
    let currentDelay = intervalMs;
    let requestInFlight = false;

    const schedule = (delay: number) => {
      if (active && document.visibilityState === "visible") {
        timeoutId = window.setTimeout(() => void tick(), delay);
      }
    };

    const tick = async () => {
      if (!active || requestInFlight || document.visibilityState !== "visible") return;
      requestInFlight = true;
      const result = await fetcher();
      requestInFlight = false;
      if (!active) return;

      setLoading(false);
      setSource(result.source);
      setMeta(result.meta);

      if (result.ok) {
        setData(result.data ?? null);
        setError(null);
        currentDelay = intervalMs;
        if (result.data && isDone(result.data)) {
          setPolling(false);
          return;
        }
      } else {
        setError(result.error ?? { code: "UNKNOWN_ERROR", message: "Không lấy được trạng thái run.", hint: "Thử lại hoặc kiểm tra backend." });
        currentDelay = Math.min(currentDelay * 2, MAX_BACKOFF_MS);
      }

      setPolling(true);
      schedule(currentDelay);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        currentDelay = intervalMs;
        void tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void tick();

    return () => {
      active = false;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, fetcher, intervalMs, isDone, retryKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setPolling(true);
    setRetryKey((current) => current + 1);
  }, []);

  return { data, error, loading: enabled && loading, polling: enabled && polling, isMock: source === "mock", source, meta, retry };
}
