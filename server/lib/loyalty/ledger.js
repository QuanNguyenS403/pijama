// server/lib/loyalty/ledger.js
import crypto from 'crypto'
import { getLoyaltyDb, getMemberById, createAlert } from './loyaltyDb.js'
import { LOYALTY_RULES } from './loyaltyConfig.js'

function generateId(prefix = 'led') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

/**
 * Ghi một bản ghi vào Sổ cái Loyalty (loyalty_ledger).
 * BẮT BUỘC idempotent: Nếu idempotencyKey đã tồn tại, trả về bản ghi cũ mà không ghi đúp.
 * Sổ cái chỉ thêm, tuyệt đối không có UPDATE hoặc DELETE.
 */
export function recordLedgerEntry({
  memberId,
  type,
  pointsDelta,
  spendDelta = 0,
  orderId = null,
  idempotencyKey,
  reason,
  actor = 'system',
  createdAt = new Date().toISOString(),
  meta = null,
}) {
  if (!memberId || !type || pointsDelta === undefined || !idempotencyKey || !reason) {
    throw new Error('Thiếu tham số bắt buộc để ghi sổ cái loyalty_ledger')
  }

  const db = getLoyaltyDb()

  // 1. Kiểm tra idempotency trước
  const existing = db.prepare('SELECT * FROM loyalty_ledger WHERE idempotency_key = ?').get(idempotencyKey)
  if (existing) {
    return {
      success: true,
      duplicated: true,
      entry: existing,
    }
  }

  const id = generateId('led')
  const metaStr = meta ? (typeof meta === 'object' ? JSON.stringify(meta) : String(meta)) : null

  // 2. Ghi bản ghi mới
  try {
    db.prepare(`
      INSERT INTO loyalty_ledger (
        id, member_id, type, points_delta, spend_delta, order_id,
        idempotency_key, reason, actor, created_at, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      memberId,
      type,
      Math.round(pointsDelta),
      Math.round(spendDelta || 0),
      orderId || null,
      idempotencyKey,
      reason,
      actor,
      createdAt,
      metaStr
    )

    const created = db.prepare('SELECT * FROM loyalty_ledger WHERE id = ?').get(id)
    return {
      success: true,
      duplicated: false,
      entry: created,
    }
  } catch (err) {
    // Trường hợp chạy song song chạm UNIQUE constraint trên idempotency_key
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      const concurrentEntry = db.prepare('SELECT * FROM loyalty_ledger WHERE idempotency_key = ?').get(idempotencyKey)
      if (concurrentEntry) {
        return {
          success: true,
          duplicated: true,
          entry: concurrentEntry,
        }
      }
    }
    throw err
  }
}

/**
 * Tính số dư điểm thưởng khả dụng từ toàn bộ lịch sử sổ cái.
 */
export function getMemberPointsBalance(memberId) {
  if (!memberId) return 0
  const db = getLoyaltyDb()
  const row = db.prepare(`
    SELECT COALESCE(SUM(points_delta), 0) AS balance 
    FROM loyalty_ledger 
    WHERE member_id = ?
  `).get(memberId)
  return row ? Math.max(0, Number(row.balance)) : 0
}

/**
 * Tính tổng chi tiêu thực tế trong cửa sổ trượt 365 ngày (hoặc số ngày cấu hình).
 * Nhận tham số 'now' để dễ dàng test các mốc thời gian khác nhau.
 */
export function getMemberRollingSpend(memberId, now = new Date()) {
  if (!memberId) return 0
  const db = getLoyaltyDb()
  const nowDate = now instanceof Date ? now : new Date(now)
  const windowStart = new Date(nowDate.getTime() - LOYALTY_RULES.TIER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const row = db.prepare(`
    SELECT COALESCE(SUM(spend_delta), 0) AS rolling_spend
    FROM loyalty_ledger
    WHERE member_id = ? AND type = 'EARN' AND created_at >= ?
  `).get(memberId, windowStart)

  return row ? Math.max(0, Number(row.rolling_spend)) : 0
}

/**
 * Lấy đơn hàng hoàn tất tích điểm (EARN) gần nhất của hội viên.
 */
export function getLastQualifyingEarn(memberId) {
  if (!memberId) return null
  const db = getLoyaltyDb()
  return (
    db.prepare(`
      SELECT * FROM loyalty_ledger 
      WHERE member_id = ? AND type = 'EARN'
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(memberId) || null
  )
}

/**
 * Lấy lịch sử biến động sổ cái của một hội viên.
 */
export function getMemberLedgerHistory(memberId, { limit = 50, offset = 0 } = {}) {
  if (!memberId) return []
  const db = getLoyaltyDb()
  return db.prepare(`
    SELECT * FROM loyalty_ledger
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(memberId, limit, offset)
}

/**
 * Đối soát số dư sổ cái với thông tin hội viên.
 */
export function reconcileMemberBalance(memberId) {
  const member = getMemberById(memberId)
  if (!member) {
    return { ok: false, error: 'Không tìm thấy hội viên' }
  }

  const computedBalance = getMemberPointsBalance(memberId)
  const rollingSpend = getMemberRollingSpend(memberId)
  const lastEarn = getLastQualifyingEarn(memberId)

  return {
    ok: true,
    memberId,
    phone: member.phone,
    tier: member.tier,
    computedBalance,
    rollingSpend,
    lastEarnDate: lastEarn ? lastEarn.created_at : null,
  }
}

/**
 * Điều chỉnh điểm thủ công bởi Quản trị viên (Admin).
 * Tuân thủ Q8: Tối đa 20 điểm/lần, bắt buộc lý do, ghi nhật ký bảo mật.
 */
export function recordAdminPointsAdjustment({
  memberId,
  pointsDelta,
  reason,
  adminId = 'unknown',
  overrideMaxLimit = false,
}) {
  const delta = Math.round(Number(pointsDelta) || 0)
  if (delta === 0) {
    throw new Error('Số điểm điều chỉnh phải khác 0')
  }

  if (!reason || !reason.trim()) {
    throw new Error('Bắt buộc phải nhập lý do điều chỉnh điểm')
  }

  const maxLimit = LOYALTY_RULES.ADMIN_MAX_MANUAL_POINTS_ADJUST
  if (!overrideMaxLimit && Math.abs(delta) > maxLimit) {
    throw new Error(`Admin chỉ được điều chỉnh tối đa ±${maxLimit} điểm/lần. Cần xác nhận mật khẩu cấp cao cho mức cao hơn.`)
  }

  const currentBalance = getMemberPointsBalance(memberId)
  if (currentBalance + delta < 0) {
    throw new Error(`Không thể giảm điểm vì số dư hiện tại (${currentBalance}) không đủ trừ ${Math.abs(delta)} điểm`)
  }

  const idempotencyKey = `adj:${memberId}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`

  const result = recordLedgerEntry({
    memberId,
    type: 'ADJUST',
    pointsDelta: delta,
    spendDelta: 0,
    idempotencyKey,
    reason: `Admin điều chỉnh: ${reason.trim()}`,
    actor: `admin:${adminId}`,
  })

  // Ghi nhật ký cảnh báo an toàn
  createAlert({
    type: 'ADMIN_ACTION',
    memberId,
    severity: Math.abs(delta) > 10 ? 'warning' : 'info',
    title: `Admin [${adminId}] điều chỉnh ${delta > 0 ? '+' : ''}${delta} điểm`,
    details: { reason, delta, newBalance: currentBalance + delta },
  })

  return result
}
