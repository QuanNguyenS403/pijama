/**
 * Google Identity Services (GIS) Client Helper cho QuanNguyenS
 * Tích hợp chuẩn Google OAuth 2.0 theo khuyến nghị của Google
 */

let cachedConfig = null

const DEFAULT_CLIENT_ID = '745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com'

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

/**
 * Đợi SDK Google Identity Services tải xong
 */
function waitForGoogleSdk(timeoutMs = 4000) {
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
    }, 100)
  })
}

/**
 * Đăng nhập Google kích hoạt bằng sự kiện Click của người dùng:
 * 1. Mở popup Google Account Chooser chính thức qua Google Identity Services (OAuth2 Token Client).
 * 2. Lấy thông tin tài khoản (email, name, picture, sub) và gọi onSuccess.
 * 3. Nếu popup bị chặn hoặc origin chưa được cấp phép trên Google Cloud, kích hoạt onFallbackNeeded.
 */
export async function loginWithGoogle({ onSuccess, onError, onFallbackNeeded } = {}) {
  const config = await getGoogleAuthConfig()
  const clientId = config?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID

  const isSdkReady = await waitForGoogleSdk(1500)

  // 1. Thử Google Identity Services OAuth 2.0 Token Client (Mở popup chuẩn Google)
  if (isSdkReady && window.google?.accounts?.oauth2?.initTokenClient) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            console.warn('Google token error:', tokenResponse.error)
            if (onFallbackNeeded) onFallbackNeeded(tokenResponse.error)
            else if (onError) onError('Google từ chối: ' + tokenResponse.error)
            return
          }
          if (tokenResponse?.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              })
              const userInfo = await res.json()
              if (userInfo?.email) {
                if (onSuccess) {
                  await onSuccess({
                    credential: tokenResponse.access_token,
                    accessToken: tokenResponse.access_token,
                    email: userInfo.email,
                    fullName: userInfo.name || 'Quý khách Google',
                    picture: userInfo.picture,
                    sub: userInfo.sub,
                  })
                }
                return
              }
            } catch (fetchErr) {
              console.warn('Lỗi lấy userinfo Google:', fetchErr)
              if (onFallbackNeeded) onFallbackNeeded(fetchErr.message)
            }
          }
        },
        error_callback: (error) => {
          console.warn('Google OAuth error:', error)
          if (onFallbackNeeded) onFallbackNeeded(error?.message || 'Lỗi kết nối')
        },
      })

      client.requestAccessToken({ prompt: 'select_account' })
      return true
    } catch (err) {
      console.warn('Lỗi initTokenClient:', err)
      if (onFallbackNeeded) onFallbackNeeded(err.message)
      return false
    }
  }

  // 2. Kích hoạt Google One-Tap nếu có
  if (isSdkReady && window.google?.accounts?.id) {
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
    } catch (e) {
      console.warn('GIS prompt error:', e)
    }
  }

  // 3. Nếu Google SDK không tải được hoặc bị trình duyệt chặn (Adblock, Brave, etc.)
  if (onFallbackNeeded) {
    onFallbackNeeded('Google SDK chưa được nạp hoặc bị chặn bởi trình duyệt.')
  } else if (onError) {
    onError('Không thể kết nối đến máy chủ Google.')
  }
  return false
}

/**
 * Kích hoạt trực tiếp Google One-Tap / Prompt khi người dùng click nút
 */
export async function triggerGooglePrompt({ onSuccess, onError } = {}) {
  const config = await getGoogleAuthConfig()
  const clientId = config?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID

  const isSdkReady = await waitForGoogleSdk(2000)
  if (!isSdkReady) {
    if (onError) onError('Google Identity Services SDK chưa sẵn sàng hoặc bị trình duyệt chặn.')
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

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.warn('Google One-Tap notification status:', notification.getNotDisplayedReason?.() || 'skipped')
      }
    })
    return true
  } catch (err) {
    if (onError) onError(err.message)
    return false
  }
}

/**
 * Khởi tạo và gắn nút Google Sign-In chính thức vào DOM container
 */
export async function setupGoogleSignInButton(containerElement, { onSuccess, onError, text = 'continue_with' } = {}) {
  if (!containerElement) return

  const config = await getGoogleAuthConfig()
  const clientId = config?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID

  const isSdkReady = await waitForGoogleSdk()
  if (!isSdkReady) {
    return {
      success: false,
      error: 'Không thể tải Google Identity Services SDK (kiểm tra kết nối mạng hoặc chặn quảng cáo)',
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
          if (onSuccess) {
            await onSuccess(response.credential)
          }
        } catch (err) {
          if (onError) onError(err.message || 'Lỗi xử lý tài khoản Google')
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    containerElement.innerHTML = ''
    window.google.accounts.id.renderButton(containerElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width: containerElement.offsetWidth || 320,
      locale: 'vi',
    })

    return { success: true }
  } catch (err) {
    if (onError) onError(err.message)
    return { success: false, error: err.message }
  }
}
