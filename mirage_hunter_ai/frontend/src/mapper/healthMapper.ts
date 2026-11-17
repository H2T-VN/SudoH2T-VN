import type { ConnectionState, HealthResponse } from '../types/api'

export const mapHealthToConnection = (response: HealthResponse): ConnectionState => ({
  status: response.status.toUpperCase() === 'UP' ? 'UP' : 'DOWN',
  label: response.status.toUpperCase() === 'UP' ? 'Đã kết nối' : 'Không khả dụng',
  detail: response.service,
})

export const unavailableConnection = (message: string): ConnectionState => ({
  status: 'DOWN',
  label: 'Không khả dụng',
  detail: message,
})
