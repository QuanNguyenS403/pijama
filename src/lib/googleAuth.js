/**
 * Google Identity Services (GIS) Client Helper cho QuanNguyenS
 * Chuẩn hóa tích hợp Google Identity Services (Sign In With Google & OAuth 2.0)
 * Tuân thủ nghiêm ngặt bảo mật và tương thích chặn popup của trình duyệt.
 */

let cachedConfig = null
let preloadedTokenClient = null
let currentSuccessCb = null
let currentErrorCb = null

const DEFAULT_CLIENT_ID = '745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com'

/**
 * Giải mã an toàn JWT Google ID Token ở phía Client
 */
export function decodeGoogleJwt(jwt) {
  try {
    const parts = String(jwt || '').split('.')
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    return null
  }
}

/**
 * Lấy Google Client ID một cách đồng bộ (không await để giữ user gesture context)
 */
export function getGoogleClientIdSync() {
  if (cachedConfig?.googleClientId) return cachedConfig.googleClientId
  if (typeof window !== 'undefined' && window.__GOOGLE_CLIENT_ID__) return window.__GOOGLE_CLIENT_ID__
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID
}

/**
 * Tải trước cấu hình từ server (chạy nền khi ứng dụng khởi động)
 */
export async function getGoogleAuthConfig() {
  if (cachedConfig) return cachedConfig
  try {
    const res = await fetch('/api/auth/config')
    if (res.ok) {
      const data = await res.json()
      cachedConfig = data
      return data
    }
  } catch (err) {
    console.warn('Không thể lấy cấu hình Google Auth từ server:', err)
  }
  return {
    googleEnabled: true,
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID,
  }
}

// Tự động tải trước cấu hình ở chế độ nền
if (typeof window !== 'undefined') {
  getGoogleAuthConfig().catch(() => {})
}

/**
 * Đợi SDK Google Identity Services tải xong
 */
export function waitForGoogleSdk(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      return resolve(true)
    }
    const start = Date.now()
    const timer = setInterval(() => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        clearInterval(timer)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, 50)
  })
}

/**
 * Khởi tạo hoặc lấy OAuth2 Token Client (dùng cho nút bấm custom nếu cần)
 */
function getOrCreateTokenClient(clientId) {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) return null
  if (preloadedTokenClient) return preloadedTokenClient

  try {
    preloadedTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse?.error) {
          console.warn('Google token callback error:', tokenResponse.error)
          if (tokenResponse.error === 'popup_closed_by_user') {
            if (currentErrorCb) currentErrorCb('cancelled')
            return
          }
          if (currentErrorCb) currentErrorCb(tokenResponse.error)
          return
        }

        if (tokenResponse?.access_token) {
          let userInfo = {}
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            })
            if (res.ok) {
              userInfo = await res.json()
            }
          } catch (fetchErr) {
            console.warn('Không thể lấy userinfo từ client (sẽ xác thực qua backend):', fetchErr.message)
          }

          if (currentSuccessCb) {
            await currentSuccessCb({
              credential: tokenResponse.access_token,
              accessToken: tokenResponse.access_token,
              email: userInfo.email,
              fullName: userInfo.name || 'Quý khách Google',
              picture: userInfo.picture,
              avatarUrl: userInfo.picture,
              avatar_url: userInfo.picture,
              sub: userInfo.sub,
            })
          }
        }
      },
      error_callback: (error) => {
        console.warn('Google OAuth error callback:', error)
        if (error?.type === 'popup_closed') {
          if (currentErrorCb) currentErrorCb('cancelled')
          return
        }
        if (error?.type === 'popup_failed_to_open') {
          if (currentErrorCb) currentErrorCb('popup_blocked')
          return
        }
        if (currentErrorCb) currentErrorCb(error?.message || 'popup_blocked')
      },
    })
  } catch (err) {
    console.warn('Không thể khởi tạo initTokenClient:', err)
  }

  return preloadedTokenClient
}

/**
 * Đăng nhập Google kích hoạt khi click nút custom.
 * ĐẶC BIỆT QUAN TRỌNG: Hàm này thực thi ĐỒNG BỘ (không await trước khi mở popup)
 * để trình duyệt không chặn popup theo chuẩn bảo mật User Activation.
 */
export function loginWithGoogle({ onSuccess, onError, onFallbackNeeded } = {}) {
  const clientId = getGoogleClientIdSync()

  currentSuccessCb = onSuccess
  currentErrorCb = (err) => {
    if (err === 'cancelled') {
      // Người dùng chủ động tắt popup đăng nhập -> Không hiển thị lỗi đỏ
      if (onError) onError(null)
      return
    }
    if (err === 'popup_blocked' || err?.includes?.('popup') || err?.includes?.('failed to open')) {
      if (onFallbackNeeded) onFallbackNeeded('popup_blocked')
      else if (onError) onError('Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup để tiếp tục.')
      return
    }
    if (onError) onError(typeof err === 'string' ? err : 'Đăng nhập Google thất bại.')
  }

  // 1. Thử gọi Token Client ngay trong luồng click đồng bộ
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    try {
      const client = getOrCreateTokenClient(clientId)
      if (client) {
        client.requestAccessToken({ prompt: 'select_account' })
        return true
      }
    } catch (err) {
      console.warn('Lỗi mở Google requestAccessToken:', err)
    }
  }

  // 2. Thử kích hoạt One-Tap nếu có
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (response?.credential && onSuccess) {
            await onSuccess(response.credential)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.prompt()
      return true
    } catch (e) {
      console.warn('GIS prompt error:', e)
    }
  }

  // 3. Nếu SDK chưa tải được hoặc bị chặn bởi AdBlock / Brave Shield
  if (onFallbackNeeded) {
    onFallbackNeeded('sdk_not_loaded')
  } else if (onError) {
    onError('Google Identity Services chưa sẵn sàng hoặc bị chặn bởi trình duyệt.')
  }
  return false
}

/**
 * Gắn nút Google Sign-In chính thức của Google vào container DOM.
 * ĐÂY LÀ PHƯƠNG PHÁP CHUẨN NHẤT CỦA GOOGLE:
 * - Google tự tạo iframe nội bộ, xử lý click trực tiếp.
 * - KHÔNG BAO GIỜ BỊ CHẶN POPUP bởi trình duyệt.
 * - Trả về Google ID Token (JWT) chuẩn bảo mật.
 */
export async function setupGoogleSignInButton(containerElement, { onSuccess, onError, text = 'continue_with', theme = 'outline', width } = {}) {
  if (!containerElement) return { success: false, error: 'Thiếu containerElement' }

  const clientId = getGoogleClientIdSync()
  const isSdkReady = await waitForGoogleSdk(3000)

  if (!isSdkReady) {
    return {
      success: false,
      error: 'Google SDK chưa được tải (vui lòng kiểm tra chặn quảng cáo/kết nối mạng)',
    }
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          if (!response?.credential) {
            throw new Error('Không nhận được token xác thực từ Google')
          }
          const decoded = decodeGoogleJwt(response.credential)
          if (onSuccess) {
            await onSuccess({
              credential: response.credential,
              sub: decoded?.sub,
              email: decoded?.email,
              fullName: decoded?.name || 'Quý khách Google',
              picture: decoded?.picture,
              avatarUrl: decoded?.picture,
              avatar_url: decoded?.picture,
            })
          }
        } catch (err) {
          if (onError) onError(err.message || 'Lỗi xử lý tài khoản Google')
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    containerElement.innerHTML = ''
    const containerWidth = width || Math.min(Math.max(containerElement.offsetWidth || 300, 240), 400)

    window.google.accounts.id.renderButton(containerElement, {
      type: 'standard',
      theme: theme,
      size: 'large',
      text: text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width: containerWidth,
      locale: 'vi',
    })

    return { success: true }
  } catch (err) {
    console.warn('Lỗi setupGoogleSignInButton:', err)
    if (onError) onError(err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Kích hoạt trực tiếp Google One-Tap / Prompt
 */
export async function triggerGooglePrompt({ onSuccess, onError } = {}) {
  const clientId = getGoogleClientIdSync()
  const isSdkReady = await waitForGoogleSdk(2000)
  if (!isSdkReady) {
    if (onError) onError('Google Identity Services SDK chưa sẵn sàng.')
    return false
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          if (!response?.credential) {
            throw new Error('Không nhận được token xác thực từ Google')
          }
          if (onSuccess) await onSuccess(response.credential)
        } catch (err) {
          if (onError) onError(err.message || 'Lỗi xử lý tài khoản Google')
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    window.google.accounts.id.prompt()
    return true
  } catch (err) {
    if (onError) onError(err.message)
    return false
  }
}
