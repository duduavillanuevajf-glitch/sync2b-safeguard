import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api/v2'

export const api = axios.create({
  baseURL: BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const isAuthEndpoint = original.url?.startsWith('/auth/')
    if (err.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/token/refresh`, { refreshToken: refresh })
          const tokens = data.data
          localStorage.setItem('access_token', tokens.accessToken)
          localStorage.setItem('refresh_token', tokens.refreshToken)
          original.headers.Authorization = `Bearer ${tokens.accessToken}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
