import { google } from 'googleapis'

/**
 * Xác thực Google Identity Services ID Token chính thức qua googleapis
 * Kiểm tra chữ ký số mật mã, audience (Client ID), issuer, expiry và email_verified
 * Tuyệt đối không fallback, không tin access token thiếu audience, không tin payload tự khai
 */
export async function verifyGoogleIdToken(idToken, { clientIdOverride = null } = {}) {
  const isProduction = process.env.NODE_ENV === 'production'
  const isTestMode = process.env.AUTH_TEST_MODE === 'true' && !isProduction

  const clientId = (clientIdOverride || process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim()

  if (!clientId && isProduction) {
    throw new Error('GOOGLE_CLIENT_ID chưa được cấu hình trên máy chủ')
  }

  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Xác thực Google ID token thất bại: Mã Google ID token không hợp lệ')
  }

  // 1. Chế độ test double chuyên biệt (TUYỆT ĐỐI CẤM Ở PRODUCTION)
  const isMockToken = idToken.startsWith('mock-google-token:') || idToken.startsWith('dev-google-token:')
  if (isMockToken) {
    if (isProduction || !isTestMode) {
      throw new Error('Chế độ mock token Google bị từ chối hoàn toàn')
    }
    const parts = idToken.split(':')
    const sub = parts[1] || 'google-sub-mock-123'
    const email = (parts[2] || '').toLowerCase().trim()
    if (!email) {
      throw new Error('Mock token thiếu địa chỉ email')
    }
    const name = parts[3] ? decodeURIComponent(parts[3]) : 'Google Test User'
    return {
      provider: 'google',
      sub,
      email,
      name,
      picture: 'https://lh3.googleusercontent.com/a/default-user',
      emailVerified: true,
    }
  }

  // 2. Từ chối Access Token (ya29... hoặc không có 3 phần JWT).
  // Yêu cầu bắt buộc phải là Google ID Token có chữ ký số và aud khớp Client ID.
  if (idToken.startsWith('ya29.') || idToken.split('.').length !== 3) {
    throw new Error('Xác thực Google ID token thất bại: Chỉ chấp nhận Google ID Token hợp lệ (JWT 3 phần). Không chấp nhận Access Token không kiểm audience.')
  }

  // 3. Xác thực Google ID Token chính thức qua googleapis OAuth2Client
  const client = new google.auth.OAuth2(clientId)
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId || undefined,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      throw new Error('Payload token từ Google rỗng')
    }

    if (!payload.sub) {
      throw new Error('Token Google không chứa claim sub định danh người dùng')
    }

    if (!payload.email) {
      throw new Error('Token Google không chứa thông tin email người dùng')
    }

    if (!payload.email_verified) {
      throw new Error('Email tài khoản Google này chưa được xác thực (email_verified: false)')
    }

    // Kiểm tra issuer
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com']
    if (payload.iss && !validIssuers.includes(payload.iss)) {
      throw new Error(`Issuer không hợp lệ từ token Google: ${payload.iss}`)
    }

    return {
      provider: 'google',
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || 'Quý khách Google',
      picture: payload.picture || null,
      emailVerified: true,
    }
  } catch (err) {
    // Fail-Closed: Tuyệt đối không decode giải mã dự phòng JWT không chữ ký
    throw new Error(`Xác thực Google ID token thất bại: ${err.message}`)
  }
}

/**
 * Xác thực Meta / Facebook User Access Token qua Graph API debug_token
 * Kiểm tra app_id, is_valid, user_id và hạn dùng
 */
export async function verifyFacebookAccessToken(accessToken, { appIdOverride = null, appSecretOverride = null } = {}) {
  const isProduction = process.env.NODE_ENV === 'production'
  const appId = (appIdOverride || process.env.FACEBOOK_APP_ID || '').trim()
  const appSecret = (appSecretOverride || process.env.FACEBOOK_APP_SECRET || '').trim()

  if ((!appId || !appSecret) && isProduction) {
    throw new Error('FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET chưa được cấu hình trên máy chủ')
  }

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Facebook Access Token không hợp lệ')
  }

  // Chế độ test double có kiểm soát khi chạy test tự động
  if (process.env.AUTH_TEST_MODE === 'true' && !isProduction && accessToken.startsWith('mock-fb-token:')) {
    const parts = accessToken.split(':')
    const sub = parts[1] || 'fb-sub-mock-123'
    const email = parts[2] === 'no-email' ? null : (parts[2] || 'test-fb@example.com')
    return {
      provider: 'facebook',
      sub,
      email,
      name: 'Facebook Test User',
      picture: 'https://example.com/fb.jpg',
      requiresPhone: !email,
    }
  }

  // 1. Kiểm tra tính hợp lệ của token qua debug_token endpoint chính thức của Meta
  const appAccessToken = `${appId}|${appSecret}`
  const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`

  const debugRes = await fetch(debugUrl)
  if (!debugRes.ok) {
    throw new Error('Không thể kết nối tới Meta Graph API để kiểm tra token')
  }

  const debugData = await debugRes.json()
  const tokenInfo = debugData?.data

  if (!tokenInfo || !tokenInfo.is_valid) {
    throw new Error(tokenInfo?.error?.message || 'Access token Facebook không hợp lệ hoặc đã hết hạn')
  }

  // Kiểm tra token có đúng được cấp cho App của QuanNguyenS hay không
  if (String(tokenInfo.app_id) !== String(appId)) {
    throw new Error('Access token Facebook không thuộc về ứng dụng của QuanNguyenS')
  }

  const userId = tokenInfo.user_id

  // 2. Lấy profile chính thức từ server sau khi token hợp lệ
  const profileUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(userId)}?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`
  const profileRes = await fetch(profileUrl)
  if (!profileRes.ok) {
    throw new Error('Không thể lấy thông tin profile người dùng từ Facebook')
  }

  const profile = await profileRes.json()
  const email = profile.email ? profile.email.trim().toLowerCase() : null

  return {
    provider: 'facebook',
    sub: String(profile.id),
    email,
    name: profile.name || 'Quý khách',
    picture: profile.picture?.data?.url || null,
    requiresPhone: !email,
  }
}
