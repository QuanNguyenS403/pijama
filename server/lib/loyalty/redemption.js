// server/lib/loyalty/redemption.js
import crypto from 'crypto'
import { getLoyaltyDb, getMemberById, maskPhone, createAlert } from './loyaltyDb.js'
import { recordLedgerEntry, getMemberPointsBalance } from './ledger.js'
import { LOYALTY_RULES } from './loyaltyConfig.js'
import { verifyLoyaltyOtp } from './phoneVerifier.js'

/**
 * Đổi 10 điểm thưởng lấy voucher 50.000đ (A7: hạn 90 ngày, áp dụng đơn từ 0đ).
 * Bắt buộc xác thực OTP bước nâng cao (Step-up OTP) gửi tới SĐT hội viên.
 * Thực thi an toàn trong Transaction để chống Race Conditions / Đua điều kiện song song.
 */
export function redeemPointsForVoucher({
  memberId,
  pointsToRedeem = LOYALTY_RULES.POINTS_PER_VOUCHER,
  orderId = null,
  phone = null,
  otpCode = null,
  stepUpVerified = false,
}) {
  const db = getLoyaltyDb()
  const member = getMemberById(memberId)
  if (!member || member.status !== 'active') {
    return { success: false, error: 'Hội viên không tồn tại hoặc tài khoản đang tạm khóa' }
  }

  // 1. Kiểm tra xác thực OTP bước nâng cao (nếu chưa được verify trước đó)
  if (!stepUpVerified) {
    if (!otpCode || !phone) {
      return {
        success: false,
        requiresOtp: true,
        error: 'Thao tác đổi điểm thành tiền yêu cầu xác thực mã OTP gửi về số điện thoại của bạn',
      }
    }

    const otpRes = verifyLoyaltyOtp({
      phone: member.phone,
      code: otpCode,
      purpose: 'step_up_checkout',
    })

    if (!otpRes.success) {
      return {
        success: false,
        error: otpRes.error,
        remainingAttempts: otpRes.remainingAttempts,
      }
    }
  }

  if (pointsToRedeem !== LOYALTY_RULES.POINTS_PER_VOUCHER) {
    return {
      success: false,
      error: `Chương trình hiện hỗ trợ gói đổi ${LOYALTY_RULES.POINTS_PER_VOUCHER} điểm = voucher ${LOYALTY_RULES.VOUCHER_AMOUNT_PER_REDEEM.toLocaleString('vi-VN')}đ`,
    }
  }

  // 2. Chạy trong Transaction IMMEDIATE để khóa chống race condition
  const executeRedeemTransaction = db.transaction(() => {
    // Kiểm tra số dư tức thời ngay trong transaction
    const balanceRow = db
      .prepare('SELECT COALESCE(SUM(points_delta), 0) AS balance FROM loyalty_ledger WHERE member_id = ?')
      .get(memberId)

    const currentBalance = balanceRow ? Number(balanceRow.balance) : 0
    if (currentBalance < pointsToRedeem) {
      throw new Error(`Số dư điểm không đủ để đổi voucher (Hiện có: ${currentBalance} điểm, cần: ${pointsToRedeem} điểm)`)
    }

    // Sinh mã voucher số tiền cố định
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase()
    const voucherCode = `PTS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`
    const voucherId = `vouch_pts_${Date.now()}_${randomSuffix}`

    const now = new Date()
    const expiresAt = new Date(now.getTime() + LOYALTY_RULES.VOUCHER_REDEEM_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const idempotencyKey = `redeem:${voucherCode}`

    // A. Ghi vào bảng vouchers
    db.prepare(`
      INSERT INTO vouchers (
        id, account_id, code, kind, discount_percent, discount_amount,
        free_shipping, min_subtotal, expires_at, member_id, source, issued_by,
        used, status, reserved_order_id, reserved_at, created_at
      ) VALUES (
        ?, ?, ?, 'amount', 0, ?,
        0, ?, ?, ?, 'points', 'member',
        0, ?, ?, ?, ?
      )
    `).run(
      voucherId,
      member.account_id || 'system',
      voucherCode,
      LOYALTY_RULES.VOUCHER_AMOUNT_PER_REDEEM,
      LOYALTY_RULES.VOUCHER_REDEEM_MIN_SUBTOTAL,
      expiresAt,
      memberId,
      orderId ? 'reserved' : 'active',
      orderId || null,
      orderId ? now.toISOString() : null,
      now.toISOString()
    )

    // B. Ghi vào Sổ cái loyalty_ledger
    const ledgerId = `led_${Date.now()}_${randomSuffix}`
    db.prepare(`
      INSERT INTO loyalty_ledger (
        id, member_id, type, points_delta, spend_delta, order_id,
        idempotency_key, reason, actor, created_at, meta
      ) VALUES (?, ?, 'REDEEM', ?, 0, ?, ?, ?, 'member', ?, ?)
    `).run(
      ledgerId,
      memberId,
      -pointsToRedeem,
      orderId || null,
      idempotencyKey,
      `Đổi ${pointsToRedeem} điểm lấy voucher ${LOYALTY_RULES.VOUCHER_AMOUNT_PER_REDEEM.toLocaleString('vi-VN')}đ`,
      now.toISOString(),
      JSON.stringify({ voucherCode, voucherId })
    )

    return {
      success: true,
      voucher: {
        code: voucherCode,
        kind: 'amount',
        discountAmount: LOYALTY_RULES.VOUCHER_AMOUNT_PER_REDEEM,
        expiresAt,
        reservedOrderId: orderId || null,
      },
      pointsDeducted: pointsToRedeem,
      remainingBalance: currentBalance - pointsToRedeem,
    }
  })

  try {
    const result = executeRedeemTransaction()
    console.log(`🎫 [LOYALTY REDEEM] Hội viên ${maskPhone(member.phone)} đã đổi 10 điểm thành voucher ${result.voucher.code}`)
    return result
  } catch (err) {
    return {
      success: false,
      error: err.message,
    }
  }
}
