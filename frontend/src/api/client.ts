import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Track if we're currently refreshing to prevent infinite loops
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

// Subscribe to token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

// Notify all subscribers with new token
function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((callback) => callback(newToken))
  refreshSubscribers = []
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 - try to refresh token (but only once per request)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true
      
      const authStore = useAuthStore.getState()
      
      // If we have a refresh token, try to refresh
      if (authStore.refreshToken) {
        // If already refreshing, queue this request
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(apiClient(originalRequest))
            })
          })
        }
        
        isRefreshing = true
        
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: authStore.refreshToken,
          })
          
          // Handle both response formats: { data: {...} } or direct {...}
          const responseData = response.data.data || response.data
          const { access_token, refresh_token } = responseData
          
          authStore.setTokens(access_token, refresh_token)
          
          // Notify all queued requests
          onTokenRefreshed(access_token)
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout
          authStore.logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // No refresh token, logout
        authStore.logout()
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient

// Helper function to handle API errors
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}
