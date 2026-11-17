import { apiClient } from './http'
import type { HealthResponse } from '../types/api'

export const healthService = {
  getBackendHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health')
    return response.data
  },
  getAiHealth: async (): Promise<HealthResponse> => {
    const response = await apiClient.get<HealthResponse>('/health/ai')
    return response.data
  },
}
