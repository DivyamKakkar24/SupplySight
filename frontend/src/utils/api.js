import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors and retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // Handle 403 errors (forbidden)
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
      return Promise.reject(error)
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
      return Promise.reject(new Error('Network error. Please check your connection.'))
    }

    // Handle server errors (5xx)
    if (error.response.status >= 500) {
      console.error('Server error:', error.response.data)
      return Promise.reject(new Error('Server error. Please try again later.'))
    }

    return Promise.reject(error)
  }
)

// Helper function for API calls with better error handling
export const apiCall = async (method, url, data = null, options = {}) => {
  try {
    const response = await api({
      method,
      url,
      data,
      ...options
    })
    return response.data
  } catch (error) {
    // Re-throw with more descriptive error message
    const message = error.response?.data?.error || error.message || 'An error occurred'
    throw new Error(message)
  }
}

// Convenience methods
export const apiGet = (url, options = {}) => apiCall('GET', url, null, options)
export const apiPost = (url, data, options = {}) => apiCall('POST', url, data, options)
export const apiPut = (url, data, options = {}) => apiCall('PUT', url, data, options)
export const apiDelete = (url, options = {}) => apiCall('DELETE', url, null, options) 