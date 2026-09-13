// server/lib/adminAuth.js
import crypto from 'crypto'
import { createRateLimiter } from './rateLimiter.js'

/**
 * Rate limiter cho route Admin Login:
 * Tối đa 5 lần thử trong vòng 15 phút trên mỗi IP
 */
export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
})

const revokedTokens = new Set()
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'qns-admin-session-secret-key-2026'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 giờ

/**
 * Tạo signed admin session token
 */
export function generateAdminSessionToken() {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + SESSION_TTL_MS
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = `${issuedAt}:${expiresAt}:${nonce}`
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('hex')
  return `${payload}.${signature}`
}

/**
 * Xác thực admin session token
 */
export function verifyAdminSessionToken(token) {
  if (!token || typeof token !== 'string') return { isValid: false, error: 'Thiếu admin session token' }
  if (revokedTokens.has(token)) return { isValid: false, error: 'Phiên làm việc đã bị thu hồi' }

  const parts = token.split('.')
  if (parts.length !== 2) return { isValid: false, error: 'Định dạng token không hợp lệ' }

  const [payload, signature] = parts
  const expectedSignature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('hex')

  if (expectedSignature.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
    return { isValid: false, error: 'Chữ ký token quản trị viên không hợp lệ' }
  }

  const [issuedAtStr, expiresAtStr] = payload.split(':')
  const expiresAt = Number(expiresAtStr)

  if (Date.now() > expiresAt) {
    return { isValid: false, error: 'Phiên làm việc quản trị viên đã hết hạn' }
  }

  return { isValid: true, expiresAt }
}

/**
 * Middleware bảo vệ các route quản trị
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  let token = ''

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim()
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim()
  }

  const result = verifyAdminSessionToken(token)
  if (!result.isValid) {
    console.warn(`⛔ [SEC-001 BLOCKED] Truy cập trái phép route Admin: ${req.method} ${req.originalUrl || req.url} từ IP ${req.ip}. Lý do: ${result.error}`)
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Yêu cầu quyền quản trị viên',
      code: 'ADMIN_AUTH_REQUIRED',
    })
  }

  req.adminSession = { token, expiresAt: result.expiresAt }
  next()
}

/**
 * Thu hồi session
 */
export function revokeAdminToken(token) {
  if (token) {
    revokedTokens.add(token)
  }
}

/**
 * Xác thực mật khẩu Admin:
 * - Chỉ sử dụng process.env.ADMIN_PASSWORD chuẩn.
 * - Fail-closed: Nếu chưa cấu hình ADMIN_PASSWORD, từ chối mọi đăng nhập và trả lỗi 500.
 * - Phát hành session token có thể kiểm chứng độc lập.
 */
export function verifyAdminLogin(password) {
  const configuredPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : ''

  if (!configuredPassword) {
    console.error('⛔ [CRITICAL] Chưa cấu hình biến môi trường ADMIN_PASSWORD trên máy chủ.')
    return {
      status: 500,
      data: {
        success: false,
        error: 'Hệ thống chưa cấu hình mật khẩu quản trị',
      },
    }
  }

  const inputPass = String(password || '').trim()

  if (!inputPass || inputPass.length !== configuredPassword.length || !crypto.timingSafeEqual(Buffer.from(inputPass), Buffer.from(configuredPassword))) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Sai mật khẩu quản trị',
      },
    }
  }

  const token = generateAdminSessionToken()
  console.log(`🔐 [ADMIN AUTH] Đăng nhập quản trị thành công. Đã phát hành session token.`)

  return {
    status: 200,
    data: {
      success: true,
      token,
      expiresIn: SESSION_TTL_MS / 1000,
    },
  }
}
