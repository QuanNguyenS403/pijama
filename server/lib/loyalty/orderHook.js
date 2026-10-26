// server/lib/loyalty/orderHook.js
import { isLoyaltyEnabled, LOYALTY_RULES, LOYALTY_TIERS } from './loyaltyConfig.js'
import {
  getMemberById,
  getMemberByPhone,
  updateMember,
  getLoyaltyDb,
  createAlert,
  maskPhone,
} from './loyaltyDb.js'
import { recordLedgerEntry, getMemberRollingSpend, getMemberLedgerHistory } from './ledger.js'
import { calculatePointsFromSpend, evaluateMemberTierState } from './tierEngine.js'
import { normalizeVietnamesePhone } from '../smsService.js'
import { verifyLoyaltyOtp } from './phoneVerifier.js'

/**
 * Xử lý khi đơn hàng chuyển sang DELIVERED (Giao hàng thành công)
 * Được gọi từ orderPersistence.set / setBatch (nguồn duy nhất).
 */
export async function handleOrderDeliveredHook(order) {
  if (!isLoyaltyEnabled()) return { skipped: true, reason: 'LOYALTY_DISABLED' }
  if (!order || order.status !== 'DELIVERED') return { skipped: true, reason: 'NOT_DELIVERED' }

  const orderId = order.orderId || order.id
  if (!orderId) return { skipped: true, reason: 'NO_ORDER_ID' }

  // 1. Tính toán giá trị hàng thực trả (A1)
  // Tiền hàng thực trả = Tạm tính (subtotal) - Mọi giảm giá (discount) (không bao gồm phí ship)
  const subtotal = Math.max(0, Number(order.subtotal) || 0)
  const discount = Math.max(0, Number(order.discount) || 0)
  const qualifyingSpend = Math.max(0, subtotal - discount)
  const pointsDelta = calculatePointsFromSpend(qualifyingSpend)

  if (qualifyingSpend <= 0 || pointsDelta <= 0) {
    return { skipped: true, reason: 'ZERO_QUALIFYING_POINTS' }
  }

  // 2. Xác định chủ sở hữu đơn hàng
  const explicitMemberId = order.loyalty?.memberId || order.loyaltyMemberId
  let member = null

  if (explicitMemberId) {
    member = getMemberById(explicitMemberId)
  }

  // Nếu không có explicit memberId nhưng có SĐT:
  // Nếu lúc đặt KHÔNG có bằng chứng sở hữu (explicitMemberId), KHÔNG tự cộng (quy tắc 5.3)
  // để tránh cộng nhầm đơn hàng tặng/mua hộ. Khách có thể nhận điểm qua OTP trong 7 ngày.
  if (!member) {
    const rawPhone = order.customer?.phone || order.customerPhone || ''
    const cleanPhone = normalizeVietnamesePhone(rawPhone)
    const matchedMember = cleanPhone ? getMemberByPhone(cleanPhone) : null

    if (matchedMember) {
      console.log(`ℹ️ [LOYALTY] Đơn #${orderId} có SĐT khớp hội viên ${maskPhone(cleanPhone)} nhưng chưa xác minh lúc đặt. Chờ nhận điểm trong 7 ngày.`)
      return {
        success: true,
        pendingClaim: true,
        memberId: matchedMember.id,
        orderId,
      }
    }

    return { skipped: true, reason: 'NOT_LOYALTY_MEMBER' }
  }

  // 3. Ghi Sổ cái (Idempotent theo idempotency_key: earn:<orderId>)
  const idempotencyKey = `earn:${orderId}`
  const ledgerResult = recordLedgerEntry({
    memberId: member.id,
    type: 'EARN',
    pointsDelta,
    spendDelta: qualifyingSpend,
    orderId,
    idempotencyKey,
    reason: `Tích điểm đơn hàng #${orderId} hoàn tất giao hàng`,
    actor: 'system',
    meta: {
      subtotal,
      discount,
      qualifyingSpend,
    },
  })

  // Nếu bản ghi đã tồn tại trước đó -> Bỏ qua tính lại hạng để tránh trùng side-effects
  if (ledgerResult.duplicated) {
    return {
      success: true,
      duplicated: true,
      orderId,
      pointsEarned: pointsDelta,
    }
  }

  // 4. Đánh giá thăng hạng ngay lập tức (A4)
  const db = getLoyaltyDb()
  const earnEntries = db
    .prepare("SELECT * FROM loyalty_ledger WHERE member_id = ? AND type = 'EARN' ORDER BY created_at ASC")
    .all(member.id)

  const tierEvaluation = evaluateMemberTierState(member, earnEntries, new Date())

  if (tierEvaluation.action === 'UPGRADE') {
    const oldTier = member.tier
    const newTier = tierEvaluation.targetTier

    // Cập nhật hạng mới trong Database
    updateMember(member.id, {
      tier: newTier,
      tier_changed_at: new Date().toISOString(),
    })

    // Ghi lịch sử thăng hạng
    db.prepare(`
      INSERT INTO loyalty_tier_history (id, member_id, from_tier, to_tier, reason, actor, created_at)
      VALUES (?, ?, ?, ?, ?, 'system', ?)
    `).run(
      `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      member.id,
      oldTier,
      newTier,
      `Thăng hạng tự động từ chi tiêu đơn hàng #${orderId} (${qualifyingSpend.toLocaleString('vi-VN')}đ)`,
      new Date().toISOString()
    )

    console.log(`🎉 [LOYALTY UPGRADE] Hội viên ${maskPhone(member.phone)} đã được thăng hạng từ ${oldTier} -> ${newTier}!`)

    // Cấp voucher thăng hạng (nếu có và chưa cấp cho hạng này)
    issueUpgradeVoucherIfEligible(member.id, newTier)

    // Nếu thăng lên Hạng 4 (Kim Cương) -> Tạo nhiệm vụ Admin chăm sóc quà tặng (A13)
    if (newTier === 'DIAMOND') {
      createAlert({
        type: 'TIER_4_GIFT',
        memberId: member.id,
        severity: 'info',
        title: `Hội viên [${member.full_name}] đạt hạng Kim Cương!`,
        details: {
          phone: member.phone,
          fullName: member.full_name,
          email: member.email,
          actionRequired: 'Liên hệ khách mời tham dự Private Party & chuẩn bị bộ quà đặc biệt BST.',
        },
      })
    }
  }

  return {
    success: true,
    duplicated: false,
    orderId,
    memberId: member.id,
    pointsEarned: pointsDelta,
    qualifyingSpend,
    tierUpgraded: tierEvaluation.action === 'UPGRADE' ? tierEvaluation.targetTier : null,
  }
}

/**
 * Cấp voucher thăng hạng 1 lần duy nhất cho mỗi mốc hạng (A4)
 */
export function issueUpgradeVoucherIfEligible(memberId, tierKey) {
  const tierConfig = LOYALTY_TIERS[tierKey]
  if (!tierConfig || !tierConfig.upgradeVoucherAmount || tierConfig.upgradeVoucherAmount <= 0) {
    return null
  }

  const db = getLoyaltyDb()

  // Kiểm tra xem đã từng nhận voucher thăng hạng cho hạng này chưa
  const existingVoucher = db
    .prepare(`
      SELECT * FROM vouchers 
      WHERE member_id = ? AND source = 'upgrade' AND discount_amount = ?
    `)
    .get(memberId, tierConfig.upgradeVoucherAmount)

  if (existingVoucher) {
    return null // Đã từng cấp mốc này, không cấp lại khi rớt rồi lên lại (A4)
  }

  const member = getMemberById(memberId)
  if (!member) return null

  const voucherCode = `UP-${tierKey}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOYALTY_RULES.UPGRADE_VOUCHER_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const voucherId = `vouch_up_${Date.now()}`

  db.prepare(`
    INSERT INTO vouchers (
      id, account_id, code, kind, discount_percent, discount_amount,
      free_shipping, min_subtotal, expires_at, member_id, source, issued_by,
      used, status, created_at
    ) VALUES (
      ?, ?, ?, 'amount', 0, ?,
      0, 0, ?, ?, 'upgrade', 'system',
      0, 'active', ?
    )
  `).run(
    voucherId,
    member.account_id || 'system',
    voucherCode,
    tierConfig.upgradeVoucherAmount,
    expiresAt,
    memberId,
    now.toISOString()
  )

  console.log(`🎁 [UPGRADE VOUCHER] Đã cấp voucher ${voucherCode} (${tierConfig.upgradeVoucherAmount.toLocaleString('vi-VN')}đ) cho hội viên ${maskPhone(member.phone)}`)
  return voucherCode
}

/**
 * Xử lý khi đơn hàng bị CANCELLED
 * Hoàn lại điểm đã tiêu hoặc giải phóng voucher
 */
export function handleOrderCancelledHook(order) {
  if (!isLoyaltyEnabled()) return { skipped: true, reason: 'LOYALTY_DISABLED' }
  if (!order) return { skipped: true }

  const orderId = order.orderId || order.id
  if (!orderId) return { skipped: true }

  const db = getLoyaltyDb()

  // 1. Kiểm tra xem đơn hàng này có tiêu điểm (REDEEM) không
  const redeemEntry = db
    .prepare("SELECT * FROM loyalty_ledger WHERE order_id = ? AND type = 'REDEEM'")
    .get(orderId)

  if (redeemEntry) {
    const pointsToRefund = Math.abs(Number(redeemEntry.points_delta))
    const reversalKey = `reversal:${orderId}`

    recordLedgerEntry({
      memberId: redeemEntry.member_id,
      type: 'REVERSAL',
      pointsDelta: pointsToRefund,
      spendDelta: 0,
      orderId,
      idempotencyKey: reversalKey,
      reason: `Hoàn điểm do đơn hàng #${orderId} bị hủy`,
      actor: 'system',
    })

    console.log(`🔄 [LOYALTY REVERSAL] Đã hoàn ${pointsToRefund} điểm cho đơn hủy #${orderId}`)
  }

  // 2. Giải phóng voucher tạm giữ nếu có
  if (order.voucherCode) {
    db.prepare(`
      UPDATE vouchers 
      SET status = 'active', reserved_order_id = NULL, reserved_at = NULL
      WHERE UPPER(code) = ? AND reserved_order_id = ? AND used = 0
    `).run(order.voucherCode.trim().toUpperCase(), orderId)
  }

  return { success: true, orderId }
}

/**
 * Khách hàng nhận điểm cho đơn hàng không gắn tài khoản lúc đặt (quy tắc 5.3)
 * Yêu cầu: Đơn hàng DELIVERED trong vòng 7 ngày, xác thực OTP chính xác.
 */
export async function claimOrderPointsWithOtp({ order, phone, otpCode }) {
  const cleanPhone = normalizeVietnamesePhone(phone)
  if (!order || order.status !== 'DELIVERED') {
    return { success: false, error: 'Chỉ có thể nhận điểm cho đơn hàng đã giao thành công' }
  }

  const orderPhone = normalizeVietnamesePhone(order.customer?.phone || order.customerPhone || '')
  if (orderPhone !== cleanPhone) {
    return { success: false, error: 'Số điện thoại không khớp với số điện thoại đặt hàng' }
  }

  const member = getMemberByPhone(cleanPhone)
  if (!member) {
    return { success: false, error: 'Số điện thoại này chưa đăng ký Hội viên' }
  }

  // Kiểm tra thời hạn 7 ngày
  const orderTime = new Date(order.created_at || order.createdAt || Date.now()).getTime()
  const daysDiff = (Date.now() - orderTime) / (24 * 60 * 60 * 1000)
  if (daysDiff > LOYALTY_RULES.CLAIM_PENDING_POINTS_DAYS) {
    return {
      success: false,
      error: `Đơn hàng đã quá hạn nhận điểm (${LOYALTY_RULES.CLAIM_PENDING_POINTS_DAYS} ngày kể từ khi đặt)`,
    }
  }

  // Xác thực OTP
  const otpRes = verifyLoyaltyOtp({
    phone: cleanPhone,
    code: otpCode,
    purpose: 'claim_points',
  })

  if (!otpRes.success) {
    return { success: false, error: otpRes.error }
  }

  // Gắn memberId và thực thi cộng điểm
  const updatedOrder = {
    ...order,
    loyalty: { memberId: member.id },
  }

  return handleOrderDeliveredHook(updatedOrder)
}
