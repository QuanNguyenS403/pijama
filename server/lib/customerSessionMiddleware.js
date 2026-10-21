import { findCustomerSessionByToken, findAccountById, getDb } from './accountDb.js'
import { hashRefreshToken, verifyAccessToken } from './tokenService.js'

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

  const cookieStr = flags.join('; ')
  if (typeof res.append === 'function') {
    res.append('Set-Cookie', cookieStr)
  } else {
    const existing = res.getHeader('Set-Cookie')
    if (!existing) {
      res.setHeader('Set-Cookie', [cookieStr])
    } else if (Array.isArray(existing)) {
      res.setHeader('Set-Cookie', [...existing, cookieStr])
    } else {
      res.setHeader('Set-Cookie', [existing, cookieStr])
    }
  }
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

  const cookieStr = flags.join('; ')
  if (typeof res.append === 'function') {
    res.append('Set-Cookie', cookieStr)
  } else {
    const existing = res.getHeader('Set-Cookie')
    if (!existing) {
      res.setHeader('Set-Cookie', [cookieStr])
    } else if (Array.isArray(existing)) {
      res.setHeader('Set-Cookie', [...existing, cookieStr])
    } else {
      res.setHeader('Set-Cookie', [existing, cookieStr])
    }
  }
}

/**
 * Middleware phân tích phiên đăng nhập khách hàng từ HttpOnly Cookie
 */
export async function customerSessionMiddleware(req, res, next) {
  req.customerAccount = null
  req.customerSession = null

  try {
    const cookieHeader = req.headers.cookie
    const cookies = cookieHeader ? parseCookies(cookieHeader) : {}
    const sessionCookie = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME] || cookies['qns_session']
    const refreshCookie = cookies['qns_refresh_token'] || cookies['refreshToken']

    // 1. Kiểm tra bảng customer_sessions qua session cookie
    if (sessionCookie) {
      const sessionData = findCustomerSessionByToken(sessionCookie)
      if (sessionData && sessionData.account && (sessionData.account.status === 'active' || !sessionData.account.status)) {
        req.customerAccount = sessionData.account
        req.customerSession = sessionData.session
      }
    }

    // 2. Kiểm tra bảng enterprise_sessions qua refresh token cookie nếu chưa có session
    const candidateRefreshToken = refreshCookie || (!req.customerAccount ? sessionCookie : null)
    if (!req.customerAccount && candidateRefreshToken) {
      const db = getDb()
      const tokenHash = hashRefreshToken(candidateRefreshToken)
      const entSession = db.prepare(`
        SELECT s.*, u.id as u_id, u.email as u_email, u.full_name, u.role, u.avatar_url, u.status as u_status, u.verified, u.marketing_email_opt_in, u.phone as u_phone
        FROM enterprise_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token_hash = ? AND s.is_revoked = 0 AND s.expires_at > ?
      `).get(tokenHash, Date.now())

      if (entSession && (entSession.u_status === 'active' || !entSession.u_status)) {
        req.customerAccount = {
          id: entSession.u_id,
          email: entSession.u_email,
          fullName: entSession.full_name,
          full_name: entSession.full_name,
          role: entSession.role,
          avatarUrl: entSession.avatar_url,
          avatar_url: entSession.avatar_url,
          phone: entSession.u_phone || '',
          status: entSession.u_status,
          verified: Boolean(entSession.verified),
          marketing_email_opt_in: Boolean(entSession.marketing_email_opt_in),
        }
        req.customerSession = entSession
      }
    }

    // 3. Kiểm tra Header Authorization: Bearer <accessToken>
    const authHeader = req.headers.authorization
    if (!req.customerAccount && authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim()
      const payload = await verifyAccessToken(bearerToken)
      if (payload && payload.sub) {
        const acc = findAccountById(payload.sub)
        if (acc && (acc.status === 'active' || !acc.status)) {
          req.customerAccount = acc
        }
      }
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
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://quannguyens.com',
        'https://www.quannguyens.com',
        'https://quannguyens.vn',
        'https://www.quannguyens.vn',
      ]

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
