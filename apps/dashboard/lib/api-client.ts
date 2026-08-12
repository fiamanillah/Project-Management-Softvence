export class ApiError extends Error {
  public status: number
  public errorData?: unknown

  constructor(message: string, status: number, errorData?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorData = errorData
  }
}

interface FetchOptions extends RequestInit {
  _isRetry?: boolean
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

let isRefreshing = false
let refreshSubscribers: ((success: boolean) => void)[] = []

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success))
  refreshSubscribers = []
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { _isRetry = false, headers, ...customConfig } = options

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${BASE_URL}${cleanEndpoint}`

  const config: RequestInit = {
    method: customConfig.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    ...customConfig,
  }

  let response: Response
  try {
    response = await fetch(url, config)
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : 'Network request failed',
      0
    )
  }

  // Handle 401 Unauthorized for silent token refresh retry
  const isAuthEndpoint = cleanEndpoint.startsWith('/auth/login') || cleanEndpoint.startsWith('/auth/refresh')
  if (response.status === 401 && !isAuthEndpoint && !_isRetry) {
    if (!isRefreshing) {
      isRefreshing = true
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        const refreshData = await refreshRes.json().catch(() => null)
        const refreshSuccess = refreshRes.ok && refreshData?.success !== false

        isRefreshing = false
        onRefreshed(refreshSuccess)

        if (!refreshSuccess) {
          throw new ApiError('Session expired', 401)
        }
      } catch (err) {
        isRefreshing = false
        onRefreshed(false)
        throw new ApiError('Session expired', 401, err)
      }
    } else {
      // Wait for ongoing refresh to complete
      const refreshSuccess = await new Promise<boolean>((resolve) => {
        subscribeTokenRefresh(resolve)
      })

      if (!refreshSuccess) {
        throw new ApiError('Session expired', 401)
      }
    }

    // Retry original request once after successful refresh
    return request<T>(endpoint, { ...options, _isRetry: true })
  }

  let payload: { success?: boolean; data?: T; error?: string } | null = null
  try {
    payload = await response.json()
  } catch {
    // Empty body or non-JSON payload
  }

  if (!response.ok || payload?.success === false) {
    const errorMessage = payload?.error || response.statusText || 'An API error occurred'
    throw new ApiError(errorMessage, response.status, payload)
  }

  return payload?.data !== undefined ? (payload.data as T) : (payload as unknown as T)
}

export const apiClient = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}
