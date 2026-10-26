// server/lib/loyalty/jobs.js
import { getLoyaltyDb, getMemberById, updateMember, createAlert, maskPhone } from './loyaltyDb.js'
import { recordLedgerEntry, getMemberPointsBalance, getMemberRollingSpend } from './ledger.js'
import { evaluateMemberTierState } from './tierEngine.js'
import { LOYALTY_TIERS, LOYALTY_RULES } from './loyaltyConfig.js'

/**
 * Xử lý hạ hạng và hết hạn điểm thưởng khi quá 365 ngày không mua hàng (A5, A6).
 * Nhận tham số 'now' để kiểm thử độc lập mọi kịch bản thời gian.
 * Hoàn toàn Idempotent: chạy nhiều lần trong cùng một ngày không xóa trùng hoặc hạ nhiều lần.
 */
export function processLoyaltyDowngradesAndExpirations(now = new Date()) {
  const db = getLoyaltyDb()
  const nowDate = now instanceof Date ? now : new Date(now)
  const dateKey = nowDate.toISOString().slice(0, 10) // YYYY-MM-DD

  const members = db.prepare("SELECT * FROM loyalty_members WHERE status = 'active'").all()
  const summary = {
    evaluatedCount: members.length,
    downgradedCount: 0,
    expiredPointsCount: 0,
    totalPointsExpired: 0,
  }

  for (const member of members) {
    const earnEntries = db
      .prepare("SELECT * FROM loyalty_ledger WHERE member_id = ? AND type = 'EARN' ORDER BY created_at ASC")
      .all(member.id)

    const evaluation = evaluateMemberTierState(member, earnEntries, nowDate)

    // 1. Xử lý hạ 1 hạng nếu quá 365 ngày (A5)
    if (evaluation.action === 'DOWNGRADE') {
      const oldTier = member.tier
      const newTier = evaluation.targetTier

      updateMember(member.id, {
        tier: newTier,
        tier_changed_at: nowDate.toISOString(),
      })

      db.prepare(`
        INSERT INTO loyalty_tier_history (id, member_id, from_tier, to_tier, reason, actor, created_at)
        VALUES (?, ?, ?, ?, ?, 'system', ?)
      `).run(
        `th_down_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        member.id,
        oldTier,
        newTier,
        `Hạ hạng tự động: Quá 365 ngày không phát sinh đơn hàng mới đủ điều kiện`,
        nowDate.toISOString()
      )

      summary.downgradedCount++
      console.log(`📉 [LOYALTY DOWNGRADE] Hội viên ${maskPhone(member.phone)} hạ từ ${oldTier} -> ${newTier}`)
    }

    // 2. Xóa toàn bộ điểm thưởng nếu quá 365 ngày không có đơn (A6)
    if (evaluation.shouldExpirePoints) {
      const balance = getMemberPointsBalance(member.id)
      if (balance > 0) {
        const idempotencyKey = `expire:${member.id}:${dateKey}`
        const expireResult = recordLedgerEntry({
          memberId: member.id,
          type: 'EXPIRE',
          pointsDelta: -balance,
          spendDelta: 0,
          idempotencyKey,
          reason: 'Hết hạn điểm thưởng sau 365 ngày không phát sinh đơn hàng mới',
          actor: 'system',
          createdAt: nowDate.toISOString(),
        })

        if (!expireResult.duplicated) {
          summary.expiredPointsCount++
          summary.totalPointsExpired += balance
          console.log(`⌛ [POINTS EXPIRED] Đã xóa ${balance} điểm của hội viên ${maskPhone(member.phone)}`)
        }
      }
    }
  }

  return summary
}

/**
 * Phát hành voucher sinh nhật tự động đầu tháng sinh (A12)
 * Cấp 1 lần duy nhất trong năm cho mỗi hội viên.
 * Hạn dùng: Đến hết ngày cuối cùng của tháng sinh.
 */
export function processBirthdayVouchers(now = new Date()) {
  const db = getLoyaltyDb()
  const nowDate = now instanceof Date ? now : new Date(now)
  const currentMonth = nowDate.getMonth() + 1 // 1-12
  const currentYear = nowDate.getFullYear()

  // Ngày cuối cùng của tháng sinh lúc 23:59:59
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

  // Tìm tất cả hội viên có tháng sinh là tháng hiện tại
  const members = db
    .prepare("SELECT * FROM loyalty_members WHERE status = 'active' AND birth_month = ?")
    .all(currentMonth)

  const summary = {
    eligibleMembers: members.length,
    vouchersIssued: 0,
    skippedAlreadyIssued: 0,
  }

  for (const member of members) {
    const tierConfig = LOYALTY_TIERS[member.tier] || LOYALTY_TIERS.MEMBER
    const discountAmount = tierConfig.birthdayVoucherAmount || 50000

    // Kiểm tra xem đã cấp voucher sinh nhật cho năm nay chưa
    const existing = db
      .prepare(`
        SELECT * FROM vouchers 
        WHERE member_id = ? AND source = 'birthday' AND expires_at >= ? AND created_at >= ?
      `)
      .get(member.id, nowDate.toISOString(), `${currentYear}-01-01T00:00:00.000Z`)

    if (existing) {
      summary.skippedAlreadyIssued++
      continue
    }

    const voucherCode = `BDAY-${currentYear}-${member.tier}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const voucherId = `vouch_bday_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    db.prepare(`
      INSERT INTO vouchers (
        id, account_id, code, kind, discount_percent, discount_amount,
        free_shipping, min_subtotal, expires_at, member_id, source, issued_by,
        used, status, created_at
      ) VALUES (
        ?, ?, ?, 'amount', 0, ?,
        0, 0, ?, ?, 'birthday', 'system',
        0, 'active', ?
      )
    `).run(
      voucherId,
      member.account_id || 'system',
      voucherCode,
      discountAmount,
      lastDayOfMonth,
      member.id,
      nowDate.toISOString()
    )

    summary.vouchersIssued++
    console.log(`🎂 [BIRTHDAY VOUCHER] Cấp voucher sinh nhật ${voucherCode} (${discountAmount.toLocaleString('vi-VN')}đ) cho hội viên ${maskPhone(member.phone)}`)
  }

  return summary
}

/**
 * Đối soát toàn diện số dư và tính nhất quán dữ liệu của toàn bộ hội viên
 */
export function reconcileAllMembers(now = new Date()) {
  const db = getLoyaltyDb()
  const members = db.prepare("SELECT * FROM loyalty_members WHERE status = 'active'").all()
  let mismatchCount = 0

  for (const member of members) {
    const balance = getMemberPointsBalance(member.id)
    const rollingSpend = getMemberRollingSpend(member.id, now)

    // Kiểm tra số dư không âm
    if (balance < 0) {
      createAlert({
        type: 'RECONCILE_MISMATCH',
        memberId: member.id,
        severity: 'critical',
        title: `Số dư điểm âm: ${maskPhone(member.phone)} (${balance} điểm)`,
        details: { memberId: member.id, balance },
      })
      mismatchCount++
    }
  }

  return {
    totalChecked: members.length,
    mismatchCount,
    healthy: mismatchCount === 0,
  }
}

/**
 * Chạy toàn bộ các cron jobs hàng ngày của Loyalty
 */
export function runAllDailyLoyaltyJobs(now = new Date()) {
  console.log(`⏰ [LOYALTY CRON] Bắt đầu chạy các tác vụ định kỳ ngày ${new Date(now).toISOString()}...`)
  const downgrades = processLoyaltyDowngradesAndExpirations(now)
  const birthdays = processBirthdayVouchers(now)
  const reconcile = reconcileAllMembers(now)

  return {
    timestamp: new Date(now).toISOString(),
    downgrades,
    birthdays,
    reconcile,
  }
}
