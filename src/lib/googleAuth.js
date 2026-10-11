/**
 * Google Identity Services (GIS) Client Helper cho QuanNguyenS
 * Tích hợp chuẩn Google OAuth 2.0 theo khuyến nghị của Google
 */

let cachedConfig = null

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
    googleEnabled: false,
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || null,
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
 * Khởi tạo và gắn nút Google Sign-In chính thức vào DOM container
 */
export async function setupGoogleSignInButton(containerElement, { onSuccess, onError, text = 'continue_with' } = {}) {
  if (!containerElement) return

  const config = await getGoogleAuthConfig()
  const clientId = config?.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!clientId) {
    return {
      success: false,
      error: 'GOOGLE_CLIENT_ID chưa được cấu hình trong file .env',
    }
  }

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
