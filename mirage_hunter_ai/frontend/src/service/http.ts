import axios, { AxiosError } from 'axios'

import { appConfig } from '../config/env'

export class ApiClientError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.apiTimeoutMs,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message
      ?? (error.code === 'ECONNABORTED' ? 'Yêu cầu hết thời gian chờ.' : 'Không thể kết nối tới backend.')
    return Promise.reject(new ApiClientError(message, error.response?.status))
  },
)
