import { findCustomerSessionByToken } from './accountDb.js'

export const COOKIE_NAME = 'qns_session'
export const HOST_COOKIE_NAME = '__Host-qns_session'

export function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) return cookies
  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx < 0) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (!key) continue
    try {
      cookies[key] = decodeURIComponent(val)
    } catch {
      cookies[key] = val
    }
  }
  return cookies
}

export function setCustomerSessionCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = COOKIE_NAME
  const maxAgeSeconds = 30 * 24 * 60 * 60 // 30 ngày

  const flags = [
    `${cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (isProduction) {
    flags.push('Secure')
  }

  res.setHeader('Set-Cookie', flags.join('; '))
}

export function clearCustomerSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production'
  const flags = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]
  if (isProduction) flags.push('Secure')

  res.setHeader('Set-Cookie', flags.join('; '))
}

/**
 * Middleware phân tích phiên đăng nhập khách hàng từ HttpOnly Cookie
 */
export function customerSessionMiddleware(req, res, next) {
  req.customerAccount = null
  req.customerSession = null

  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return next()

  const cookies = parseCookies(cookieHeader)
  const token = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME]

  if (!token) return next()

  try {
    const sessionData = findCustomerSessionByToken(token)
    if (sessionData && sessionData.account && sessionData.account.status === 'active') {
      req.customerAccount = sessionData.account
      req.customerSession = sessionData.session
    }
  } catch (err) {
    console.warn('Session middleware check warning:', err.message)
  }

  next()
}

/**
 * Middleware CSRF / Origin Verification cho các request ghi dữ liệu có dùng session cookie
 */
export function verifyCsrfOrigin(req, res, next) {
  // Chỉ kiểm tra các phương thức ghi
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Nếu không có session cookie, là guest request -> bỏ qua CSRF cookie check
  if (!req.customerAccount) {
    return next()
  }

  // Kiểm tra Origin / Referer header
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']

  if (process.env.NODE_ENV === 'production') {
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Yêu cầu bị chặn bởi cơ chế chống tấn công CSRF',
        code: 'CSRF_ORIGIN_MISMATCH',
      })
    }
  }

  next()
}

/**
 * Middleware yêu cầu đăng nhập khách hàng (bắt buộc session hợp lệ)
 */
export function requireCustomerAuth(req, res, next) {
  if (!req.customerAccount) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Bạn cần đăng nhập để thực hiện thao tác này',
      code: 'CUSTOMER_AUTH_REQUIRED',
    })
  }
  next()
}
