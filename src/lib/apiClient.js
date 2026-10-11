/**
 * QuanNguyenS Enterprise API Client
 * Features:
 * - In-memory Access Token management (Anti-XSS token storage)
 * - Automatic Authorization Header injection
 * - Silent 401 Token Refresh with Concurrent Request Queuing (Mutex)
 * - Dispatches 'auth_state_changed' and 'auth_expired' custom events
 */

let memoryAccessToken = null
let isRefreshing = false
let refreshPromise = null

export function setAccessToken(token) {
  memoryAccessToken = token || null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { hasToken: Boolean(token) } }))
  }
}

export function getAccessToken() {
  return memoryAccessToken
}

export function clearAccessToken() {
  memoryAccessToken = null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { hasToken: false } }))
  }
}

/**
 * Thực hiện làm mới Access Token bằng HttpOnly Refresh Token Cookie
 */
async function refreshAccessToken() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!res.ok) {
        clearAccessToken()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth_expired'))
        }
        return null
      }

      const data = await res.json()
      if (data.success && data.accessToken) {
        setAccessToken(data.accessToken)
        return data.accessToken
      }

      clearAccessToken()
      return null
    } catch (err) {
      clearAccessToken()
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Fetch Wrapper có Interceptor tự động Refresh Token khi gặp HTTP 401
 */
export async function apiClient(url, options = {}) {
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }

  // Gắn Access Token nếu có trong bộ nhớ
  const token = getAccessToken()
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  try {
    let response = await fetch(url, config)

    // Nếu gặp 401 và chưa retry, tự động thử refresh token
    const isAuthRoute = url.includes('/api/auth/refresh') || url.includes('/api/auth/login') || url.includes('/api/auth/register')
    if (response.status === 401 && !options._retry && !isAuthRoute) {
      const newToken = await refreshAccessToken()

      if (newToken) {
        // Thử lại request gốc với token mới
        const retryConfig = {
          ...config,
          _retry: true,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          },
        }
        return await fetch(url, retryConfig)
      }
    }

    return response
  } catch (err) {
    throw err
  }
}

export async function apiGet(url, options = {}) {
  return apiClient(url, { ...options, method: 'GET' })
}

export async function apiPost(url, body, options = {}) {
  return apiClient(url, {
    ...options,
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

export async function apiPatch(url, body, options = {}) {
  return apiClient(url, {
    ...options,
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
