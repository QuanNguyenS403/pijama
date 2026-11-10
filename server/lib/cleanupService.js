import { getDb } from './accountDb.js'

/**
 * Kiểm tra xem một bảng có tồn tại trong SQLite không
 */
function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName)
  return Boolean(row)
}

/**
 * Dọn dẹp định kỳ các dữ liệu tạm/hết hạn trong SQLite (D3).
 * Tuyệt đối KHÔNG xóa nhật ký an ninh (security_audit_logs), sổ cái loyalty (loyalty_ledger),
 * giao dịch ngân hàng (payment_transactions), hay đơn hàng (orders).
 *
 * @param {Object} [options]
 * @param {number} [options.now] - Timestamp ms hiện tại
 * @param {import('better-sqlite3').Database} [options.database]
 * @returns {Object} Thống kê số lượng bản ghi đã dọn dẹp theo từng bảng
 */
export function cleanupExpiredData({ now = Date.now(), database = null } = {}) {
  const db = database || getDb()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  const summary = {
    customerSessions: 0,
    enterpriseSessions: 0,
    verificationChallenges: 0,
    verificationCodes: 0,
    pendingRegistrations: 0,
    pendingPasswordResets: 0,
    activeResetTokens: 0,
    adminRevokedTokens: 0,
    loyaltyPhoneVerifications: 0,
    loyaltySessions: 0,
  }

  const runDelete = (table, sql, params) => {
    if (!tableExists(db, table)) return 0
    try {
      const info = db.prepare(sql).run(...params)
      return info.changes || 0
    } catch (err) {
      console.warn(`⚠️ [CLEANUP] Lỗi khi dọn dẹp bảng ${table}:`, err.message)
      return 0
    }
  }

  summary.customerSessions = runDelete(
    'customer_sessions',
    'DELETE FROM customer_sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)',
    [now, sevenDaysAgo]
  )

  summary.enterpriseSessions = runDelete(
    'enterprise_sessions',
    'DELETE FROM enterprise_sessions WHERE expires_at < ? OR (is_revoked = 1 AND expires_at < ?)',
    [now, now]
  )

  summary.verificationChallenges = runDelete(
    'verification_challenges',
    'DELETE FROM verification_challenges WHERE expires_at < ? OR (consumed = 1 AND expires_at < ?)',
    [oneDayAgo, now]
  )

  summary.verificationCodes = runDelete(
    'verification_codes',
    'DELETE FROM verification_codes WHERE expires_at < ? OR (used = 1 AND expires_at < ?)',
    [oneDayAgo, now]
  )

  summary.pendingRegistrations = runDelete(
    'pending_registrations',
    'DELETE FROM pending_registrations WHERE expires_at < ?',
    [now]
  )

  summary.pendingPasswordResets = runDelete(
    'pending_password_resets',
    'DELETE FROM pending_password_resets WHERE expires_at < ?',
    [now]
  )

  summary.activeResetTokens = runDelete(
    'active_reset_tokens',
    'DELETE FROM active_reset_tokens WHERE expires_at < ?',
    [now]
  )

  summary.adminRevokedTokens = runDelete(
    'admin_revoked_tokens',
    'DELETE FROM admin_revoked_tokens WHERE expires_at < ?',
    [now]
  )

  summary.loyaltyPhoneVerifications = runDelete(
    'loyalty_phone_verifications',
    'DELETE FROM loyalty_phone_verifications WHERE expires_at < ?',
    [oneDayAgo]
  )

  summary.loyaltySessions = runDelete(
    'loyalty_sessions',
    'DELETE FROM loyalty_sessions WHERE expires_at < ?',
    [now]
  )

  const totalDeleted = Object.values(summary).reduce((acc, v) => acc + v, 0)
  if (totalDeleted > 0) {
    console.log(`🧹 [CLEANUP SERVICE] Đã dọn dẹp ${totalDeleted} bản ghi phiên/OTP/token hết hạn:`, summary)
  }

  return summary
}

