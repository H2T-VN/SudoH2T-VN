const parseTimeout = (value: string | undefined): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000
}

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  apiTimeoutMs: parseTimeout(import.meta.env.VITE_API_TIMEOUT_MS),
  isMock: import.meta.env.VITE_IS_MOCK !== 'false',
} as const
