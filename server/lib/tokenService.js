import * as jose from 'jose'
import crypto from 'crypto'
import { getDb } from './accountDb.js'
import { hashClientMetadata } from './authCrypto.js'
import { logSecurityAudit } from './auditLogger.js'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Lấy khóa bí mật JWT an toàn theo cơ chế Fail-Closed ở Production
 */
export function getJwtSecretKey() {
  const secretStr = (process.env.JWT_SECRET || process.env.CUSTOMER_AUTH_SECRET || '').trim()
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    if (!secretStr || secretStr.length < 32) {
      throw new Error(
        '⛔ [CRITICAL SECURITY] JWT_SECRET hoặc CUSTOMER_AUTH_SECRET phải được cấu hình tối thiểu 32 ký tự ngẫu nhiên trong môi trường production!'
      )
    }
    return new TextEncoder().encode(secretStr)
  }

  return new TextEncoder().encode(secretStr || 'qns-dev-jwt-super-secret-key-at-least-32-chars-long')
}

const ACCESS_TOKEN_EXPIRY = '15m' // 15 phút
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 ngày
export const REFRESH_COOKIE_NAME = 'qns_refresh_token'

/**
 * Sinh Access Token JWT ngắn hạn (15 phút)
 */
export async function createAccessToken(user) {
  const secret = getJwtSecretKey()
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'customer',
    fullName: user.full_name || '',
    avatarUrl: user.avatar_url || null,
    jti: crypto.randomUUID(),
  }

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret)

  return jwt
}

/**
 * Xác minh Access Token
 */
export async function verifyAccessToken(token) {
  if (!token) return null
  try {
    const secret = getJwtSecretKey()
    const { payload } = await jose.jwtVerify(token, secret)
    return payload
  } catch (err) {
    return null
  }
}

/**
 * Băm refresh token bằng SHA-256 để lưu an toàn trong database
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

/**
 * Khởi tạo phiên mới và cấp Refresh Token (Session Family)
 */
export async function createSessionAndTokens(user, { ip = '', userAgent = '' } = {}) {
  const db = getDb()
  const rawRefreshToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashRefreshToken(rawRefreshToken)
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  const familyId = `fam_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  const { ipHash, uaHash } = hashClientMetadata(ip, userAgent)
  const now = new Date().toISOString()
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL_MS

  db.prepare(`
    INSERT INTO enterprise_sessions (
      id, user_id, refresh_token_hash, family_id, is_revoked, ip_hash, user_agent_hash, expires_at, created_at, last_used_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(sessionId, user.id, tokenHash, familyId, ipHash, uaHash, expiresAt, now, now)

  const accessToken = await createAccessToken(user)

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: 15 * 60, // 15 phút (giây)
  }
}

/**
 * Xoay vòng Refresh Token (Token Rotation) với cơ chế Token Reuse Detection
 */
export async function rotateRefreshToken(rawRefreshToken, { ip = '', userAgent = '' } = {}) {
  if (!rawRefreshToken) {
    return { success: false, error: 'Thiếu Refresh Token' }
  }

  const db = getDb()
  const tokenHash = hashRefreshToken(rawRefreshToken)

  const session = db.prepare(`
    SELECT s.*, u.id as u_id, u.email as u_email, u.full_name, u.role, u.avatar_url, u.status as u_status
    FROM enterprise_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.refresh_token_hash = ?
  `).get(tokenHash)

  if (!session) {
    logSecurityAudit({
      action: 'REFRESH_TOKEN_NOT_FOUND',
      status: 'FAILURE',
      ip,
      userAgent,
      details: 'Refresh token không tồn tại trong hệ thống',
    })
    return { success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' }
  }

  // ── PHÁT HIỆN TÁI SỬ DỤNG TOKEN ĐÃ THU HỒI (TOKEN REUSE ATTACK) ──
  if (session.is_revoked === 1) {
    // Thu hồi toàn bộ family_id ngay lập tức để bảo vệ tài khoản nạn nhân!
    db.prepare(`
      UPDATE enterprise_sessions
      SET is_revoked = 1, revoked_at = ?
      WHERE family_id = ?
    `).run(new Date().toISOString(), session.family_id)

    logSecurityAudit({
      userId: session.user_id,
      action: 'TOKEN_REUSE_DETECTED',
      status: 'BLOCKED',
      ip,
      userAgent,
      details: `Phát hiện tái sử dụng Refresh Token đã bị thu hồi trong family ${session.family_id}! Đã vô hiệu hóa toàn bộ phiên.`,
    })

    return {
      success: false,
      error: 'Phát hiện truy cập bất thường. Vì lý do bảo mật, phiên đăng nhập của bạn đã bị hủy. Vui lòng đăng nhập lại.',
    }
  }

  // Kiểm tra hạn dùng
  if (session.expires_at < Date.now()) {
    db.prepare('UPDATE enterprise_sessions SET is_revoked = 1, revoked_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      session.id
    )
    return { success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
  }

  if (session.u_status !== 'active') {
    return { success: false, error: 'Tài khoản người dùng đã bị tạm khóa' }
  }

  // ── ROTATION: Thu hồi token hiện tại và cấp token mới trong cùng family ──
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE enterprise_sessions
    SET is_revoked = 1, revoked_at = ?
    WHERE id = ?
  `).run(now, session.id)

  const newRawRefreshToken = crypto.randomBytes(32).toString('hex')
  const newTokenHash = hashRefreshToken(newRawRefreshToken)
  const newSessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  const { ipHash, uaHash } = hashClientMetadata(ip, userAgent)
  const newExpiresAt = Date.now() + REFRESH_TOKEN_TTL_MS

  db.prepare(`
    INSERT INTO enterprise_sessions (
      id, user_id, refresh_token_hash, family_id, is_revoked, ip_hash, user_agent_hash, expires_at, created_at, last_used_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `).run(newSessionId, session.user_id, newTokenHash, session.family_id, ipHash, uaHash, newExpiresAt, now, now)

  const user = {
    id: session.u_id,
    email: session.u_email,
    full_name: session.full_name,
    role: session.role,
    avatar_url: session.avatar_url,
  }

  const newAccessToken = await createAccessToken(user)

  logSecurityAudit({
    userId: user.id,
    action: 'TOKEN_ROTATION_SUCCESS',
    status: 'SUCCESS',
    ip,
    userAgent,
  })

  return {
    success: true,
    user,
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    expiresIn: 15 * 60,
  }
}

/**
 * Thu hồi session khi đăng xuất
 */
export function revokeSessionByToken(rawRefreshToken) {
  if (!rawRefreshToken) return
  const db = getDb()
  const tokenHash = hashRefreshToken(rawRefreshToken)
  db.prepare(`
    UPDATE enterprise_sessions
    SET is_revoked = 1, revoked_at = ?
    WHERE refresh_token_hash = ?
  `).run(new Date().toISOString(), tokenHash)
}

/**
 * Cấu hình HttpOnly Cookie cho Refresh Token
 */
export function setRefreshTokenCookie(res, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production'
  const maxAgeSeconds = 30 * 24 * 60 * 60 // 30 ngày
  const flags = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'Path=/api/auth',
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

/**
 * Xóa Refresh Token Cookie
 */
export function clearRefreshTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production'
  const flags = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/api/auth',
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
