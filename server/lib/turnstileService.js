/**
 * Dịch vụ xác thực Cloudflare Turnstile Captcha
 */
export async function verifyTurnstileToken(token, clientIp = '') {
  const secretKey = (process.env.TURNSTILE_SECRET_KEY || '').trim()
  const isEnforced = process.env.TURNSTILE_ENFORCE === 'true'
  const isProd = process.env.NODE_ENV === 'production'

  // Token mock cho automated testing (tuyệt đối không áp dụng trên production)
  if (!isProd && (token === 'mock-turnstile-token-valid' || (process.env.AUTH_TEST_MODE === 'true' && !token))) {
    return { success: true, mocked: true }
  }

  // Bỏ qua kiểm tra nếu chưa cấu hình secret
  if (!secretKey) {
    if (isProd) {
      console.warn('⚠️ [SECURITY] TURNSTILE_SECRET_KEY chưa được cấu hình trong production. Tạm thời bỏ qua.')
    }
    return { success: true, bypassed: true }
  }

  // Nếu client không gửi token (vì giao diện không hiển thị Captcha hoặc cấu hình tùy chọn)
  if (!token) {
    if (isEnforced) {
      return { success: false, error: 'Vui lòng hoàn thành xác minh bảo mật Captcha' }
    }
    // Mặc định cho phép đi qua đối với đăng ký/đăng nhập thông thường (Rate limiting & Argon2id đã bảo vệ an ninh)
    return { success: true, optional: true }
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (clientIp) formData.append('remoteip', clientIp)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await response.json()
    if (data.success) {
      return { success: true }
    } else {
      return {
        success: false,
        error: 'Xác minh bảo mật Captcha không thành công. Vui lòng thử lại.',
        codes: data['error-codes'],
      }
    }
  } catch (err) {
    console.error('Turnstile verification error:', err.message)
    // Fail-open có kiểm soát khi mạng kết nối Cloudflare trục trặc để không chặn khách hàng mua hàng
    return { success: true, fallback: true }
  }
}
