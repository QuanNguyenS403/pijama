import crypto from 'crypto'
import { getDb } from './accountDb.js'
import { hashClientMetadata } from './authCrypto.js'

/**
 * Ghi nhật ký bảo mật (Security Audit Log) có cấu trúc vào database
 * @param {Object} params
 * @param {string} [params.userId] - ID người dùng liên quan
 * @param {string} params.action - Tên hành vi (e.g. 'LOGIN_SUCCESS', 'REGISTER', 'AUTH_FAILURE', 'PASSWORD_RESET', 'TOKEN_REFRESH')
 * @param {'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'WARNING'} params.status - Trạng thái
 * @param {string} [params.ip] - Địa chỉ IP client
 * @param {string} [params.userAgent] - Header User-Agent
 * @param {Object|string} [params.details] - Thông tin bổ sung (không lưu mật khẩu hay PII nhạy cảm)
 */
export function logSecurityAudit({ userId = null, action, status, ip = '', userAgent = '', details = null }) {
  try {
    const db = getDb()
    const id = `audit_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
    const { ipHash, uaHash } = hashClientMetadata(ip, userAgent)
    const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null
    const createdAt = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO security_audit_logs (id, user_id, action, status, ip_hash, user_agent_hash, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, userId, action, status, ipHash, uaHash, detailsStr, createdAt)

    // In thông báo màu theo mức độ cảnh báo nếu thất bại / bị chặn
    if (status === 'FAILURE' || status === 'BLOCKED') {
      console.warn(`🔒 [SECURITY AUDIT] ${action} (${status}) - User: ${userId || 'anonymous'} | IP Hash: ${ipHash}`)
    }
  } catch (err) {
    console.error('Failed to write security audit log:', err.message)
  }
}
