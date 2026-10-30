/**
 * Google Identity Services (GIS) Client Helper cho QuanNguyenS
 * Chuẩn hóa tích hợp Google Identity Services (Sign In With Google & ID Token)
 * Tuân thủ bảo mật, không dùng access token ya29..., timeout an toàn 20 giây.
 */

let cachedConfig = null

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
 * Lấy Google Client ID một cách đồng bộ
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
  getGoogleAuthConfig().catch(() => { })
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
 * Đăng nhập Google qua One-Tap Prompt với Timeout 20 giây và dọn dẹp an toàn
 */
export function loginWithGoogle({ onSuccess, onError, onFallbackNeeded, timeoutMs = 20000 } = {}) {
  const clientId = getGoogleClientIdSync()

  if (typeof window === 'undefined' || !window.google?.accounts?.id) {
    if (onFallbackNeeded) {
      onFallbackNeeded('sdk_not_loaded')
    } else if (onError) {
      onError('Google Identity Services chưa sẵn sàng hoặc bị chặn bởi trình duyệt.')
    }
    return false
  }

  let completed = false
  let timerId = null

  const cleanup = () => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  // Khởi tạo timeout 20s phòng ngừa popup/prompt bị treo hoặc không gửi callback
  timerId = setTimeout(() => {
    if (completed) return
    completed = true
    cleanup()
    if (onError) {
      onError('Thời gian chờ xác thực Google đã quá hạn (20 giây). Vui lòng thử lại hoặc đăng nhập bằng Email.')
    }
  }, timeoutMs)

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (completed) return
        completed = true
        cleanup()

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

    window.google.accounts.id.prompt((notification) => {
      if (completed) return

      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason()
        console.warn('GIS prompt not displayed:', reason)
        if (reason === 'suppressed_by_user' || reason === 'opt_out_or_no_session') {
          // One-tap bị tắt hoặc không có session, chuyển về fallback
          completed = true
          cleanup()
          if (onFallbackNeeded) onFallbackNeeded('prompt_suppressed')
          else if (onError) onError('Vui lòng sử dụng nút đăng nhập Google bên dưới hoặc đăng nhập bằng Email.')
        }
      } else if (notification.isSkippedMoment()) {
        console.warn('GIS prompt skipped:', notification.getSkippedReason())
      } else if (notification.isDismissedMoment()) {
        const dismissReason = notification.getDismissedReason()
        if (dismissReason === 'credential_returned') {
          // Đã chọn tài khoản, callback sẽ được gọi
          return
        }
        completed = true
        cleanup()
        if (dismissReason !== 'tap_outside') {
          if (onError) onError(null) // Người dùng chủ động đóng, không báo lỗi
        }
      }
    })

    return true
  } catch (err) {
    cleanup()
    console.warn('Lỗi gọi Google Identity Services:', err)
    if (onError) onError(err.message || 'Đăng nhập Google thất bại.')
    return false
  }
}

/**
 * Gắn nút Google Sign-In chính thức của Google vào container DOM.
 * ĐÂY LÀ PHƯƠNG PHÁP CHUẨN NHẤT CỦA GOOGLE:
 * - Google tự tạo iframe nội bộ, xử lý click trực tiếp.
 * - Không bao giờ bị chặn popup bởi trình duyệt.
 * - Trả về Google ID Token (JWT) chuẩn bảo mật.
 */
export async function setupGoogleSignInButton(
  containerElement,
  { onSuccess, onError, text = 'continue_with', theme = 'outline', width } = {}
) {
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
