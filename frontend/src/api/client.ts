import axios, { type InternalAxiosRequestConfig } from 'axios'

/**
 * Leave empty in .env to use Vite dev proxy → http://localhost:8000 (see vite.config.ts).
 * Set VITE_API_BASE_URL=http://localhost:8000 only for production builds without a proxy.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

let tokenGetter: (() => Promise<string | null>) | null = null

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter
}

async function attachAuthHeader(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  if (tokenGetter) {
    const token = await tokenGetter()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
}

api.interceptors.request.use(attachAuthHeader)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && original && !original._retry && tokenGetter) {
      original._retry = true
      const token = await tokenGetter()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api.request(original)
      }
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return Promise.reject(
        new Error(
          'Network error — is the FastAPI server running at http://localhost:8000? Start it with: uvicorn app.main:app --reload --port 8000',
        ),
      )
    }

    const message =
      error.response?.data?.detail ?? error.message ?? 'An unexpected error occurred'
    return Promise.reject(
      typeof message === 'string' ? new Error(message) : new Error(JSON.stringify(message)),
    )
  },
)

export async function checkApiHealth(): Promise<boolean> {
  try {
    const url = API_BASE_URL ? `${API_BASE_URL}/health` : '/health'
    const { data } = await axios.get<{ status: string }>(url, { timeout: 5000 })
    return data.status === 'ok'
  } catch {
    return false
  }
}
