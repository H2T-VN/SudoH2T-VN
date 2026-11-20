import {
  cancelMockRun,
  createMockRun,
  getMockRun,
} from "../mocks/runtime";
import {
  mockDatasets,
  mockHealth,
  mockModels,
  mockPlaygroundResponses,
} from "../mocks/data";
import type {
  ApiError,
  ApiMeta,
  ApiResult,
  DatasetRecord,
  HealthData,
  HuntConfig,
  HuntResults,
  HuntRun,
  ModelRecord,
} from "./types";

const DEFAULT_API_URL = "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 8_000;

export const isMockEnabled = import.meta.env.VITE_USE_MOCK === "true";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
}

function mockResult<T>(data: T, fallbackReason?: ApiError): ApiResult<T> {
  return {
    ok: true,
    data,
    source: "mock",
    meta: { status: null, durationMs: 0, fallbackReason },
  };
}

function errorResult<T>(error: ApiError, source: "api" | "mock" = "api", meta?: ApiMeta): ApiResult<T> {
  return { ok: false, error, source, meta };
}

function makeError(code: string, message: string, hint: string): ApiError {
  return { code, message, hint };
}

function classifyStatus(status: number): ApiError {
  if (status >= 400 && status < 500) {
    return makeError(`HTTP_${status}`, `Backend từ chối yêu cầu (HTTP ${status}).`, "Kiểm tra dữ liệu gửi lên và hợp đồng endpoint.");
  }

  return makeError(`HTTP_${status}`, `Backend gặp lỗi khi xử lý yêu cầu (HTTP ${status}).`, "Kiểm tra log backend hoặc thử lại sau.");
}

function normalizeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}, fallback?: T): Promise<ApiResult<T>> {
  if (isMockEnabled) {
    return mockResult(fallback as T);
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  const body = normalizeBody(options.body);

  if (body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers,
      body,
      signal: controller.signal,
    });
    const responseBody = await readResponseBody(response);
    const meta: ApiMeta = { status: response.status, durationMs: Math.round(performance.now() - startedAt) };

    if (!response.ok) {
      return errorResult(classifyStatus(response.status), "api", meta);
    }

    return { ok: true, data: responseBody as T, source: "api", meta };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    const apiError = timedOut
      ? makeError("TIMEOUT", "Backend không phản hồi trong 8 giây.", "Kiểm tra cold start, URL API và trạng thái service rồi thử lại.")
      : makeError("NETWORK_ERROR", "Không thể kết nối tới backend.", "Kiểm tra VITE_API_URL, CORS và service FastAPI rồi thử lại.");
    const meta: ApiMeta = { status: null, durationMs: Math.round(performance.now() - startedAt) };

    if (fallback !== undefined) {
      meta.fallbackReason = apiError;
      return mockResult(fallback, apiError);
    }

    return errorResult(apiError, "api", meta);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function invalidResponse<T>(endpoint: string, source: "api" | "mock", meta?: ApiMeta): ApiResult<T> {
  return errorResult(
    makeError("INVALID_RESPONSE", `Dữ liệu trả về từ ${endpoint} không đúng hình dạng mong đợi.`, "Đối chiếu response với contract API rồi thử lại."),
    source,
    meta,
  );
}

function extractItems<T>(result: ApiResult<unknown>, endpoint: string): ApiResult<T[]> {
  if (!result.ok) {
    return result as ApiResult<T[]>;
  }

  if (Array.isArray(result.data)) {
    return { ...result, data: result.data as T[] };
  }

  if (result.data && typeof result.data === "object" && Array.isArray((result.data as { items?: unknown }).items)) {
    return { ...result, data: (result.data as { items: T[] }).items };
  }

  return invalidResponse<T[]>(endpoint, result.source, result.meta);
}

export async function getHealth(): Promise<ApiResult<HealthData>> {
  return request<HealthData>("/health", {}, mockHealth);
}

export async function getModels(): Promise<ApiResult<ModelRecord[]>> {
  const result = await request<unknown>("/api/models", {}, { items: mockModels });
  return extractItems<ModelRecord>(result, "/api/models");
}

export async function createModel(body: unknown): Promise<ApiResult<ModelRecord>> {
  return request<ModelRecord>("/api/models", { method: "POST", body }, mockModels[0]);
}

export async function getDatasets(): Promise<ApiResult<DatasetRecord[]>> {
  const result = await request<unknown>("/api/datasets", {}, { items: mockDatasets });
  return extractItems<DatasetRecord>(result, "/api/datasets");
}

export async function createDataset(body: FormData): Promise<ApiResult<DatasetRecord>> {
  return request<DatasetRecord>("/api/datasets", { method: "POST", body }, mockDatasets[0]);
}

export async function createHunt(body: HuntConfig): Promise<ApiResult<HuntRun>> {
  return request<HuntRun>("/api/hunts", { method: "POST", body }, createMockRun(body));
}

export async function getHunt(runId: string): Promise<ApiResult<HuntRun>> {
  return request<HuntRun>(`/api/hunts/${encodeURIComponent(runId)}`, {}, getMockRun(runId));
}

export async function cancelHunt(runId: string): Promise<ApiResult<HuntRun>> {
  return request<HuntRun>(`/api/hunts/${encodeURIComponent(runId)}/cancel`, { method: "POST" }, cancelMockRun(runId));
}

export async function getHuntResults(runId: string): Promise<ApiResult<HuntResults>> {
  return request<HuntResults>(`/api/hunts/${encodeURIComponent(runId)}/results`, {}, { run_id: runId, statuses: {}, failures: [] });
}

export async function getHuntExport(runId: string): Promise<ApiResult<unknown>> {
  return request<unknown>(`/api/hunts/${encodeURIComponent(runId)}/export`, {}, {});
}

export async function listHunts(): Promise<ApiResult<unknown[]>> {
  const result = await request<unknown>("/api/hunts", {}, { items: [] });
  return extractItems<unknown>(result, "/api/hunts");
}

export async function getHuntBaseline(runId: string): Promise<ApiResult<unknown>> {
  return request<unknown>(`/api/hunts/${encodeURIComponent(runId)}/baseline`, {}, {});
}

export async function runRegression(body: unknown): Promise<ApiResult<unknown>> {
  return request<unknown>("/api/regressions/run", { method: "POST", body }, {});
}

export async function requestApi(endpoint: string, method: string, body?: unknown): Promise<ApiResult<unknown>> {
  const fallback = mockPlaygroundResponses[endpoint] ?? {};
  return request<unknown>(endpoint, { method, body }, fallback);
}
