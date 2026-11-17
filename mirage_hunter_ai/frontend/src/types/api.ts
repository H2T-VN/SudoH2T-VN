export type HealthStatus = 'UP' | 'DOWN' | 'UNKNOWN'

export interface HealthResponse {
  status: HealthStatus | string
  service: string
}

export interface ConnectionState {
  status: HealthStatus
  label: string
  detail?: string
}
