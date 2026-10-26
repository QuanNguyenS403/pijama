// server/lib/loyalty/benefits.js
import { LOYALTY_TIERS, LOYALTY_RULES, TIER_ORDER } from './loyaltyConfig.js'
import { getMemberById, getMemberByPhone, getLoyaltyDb } from './loyaltyDb.js'
import { getMemberPointsBalance, getMemberRollingSpend } from './ledger.js'
import { getNextTierInfo, evaluateMemberTierState } from './tierEngine.js'
import { validateVoucher, calculateVoucherBenefits } from '../voucherValidator.js'

/**
 * Lấy hồ sơ ưu đãi tổng quan của hội viên (/api/loyalty/me)
 */
export function getMemberBenefitsOverview(memberId, now = new Date()) {
  const member = getMemberById(memberId)
  if (!member) return null

  const db = getLoyaltyDb()
  const nowDate = now instanceof Date ? now : new Date(now)

  const balance = getMemberPointsBalance(memberId)
  const rollingSpend = getMemberRollingSpend(memberId, nowDate)
  const nextTierInfo = getNextTierInfo(member.tier, rollingSpend)

  const earnEntries = db
    .prepare("SELECT * FROM loyalty_ledger WHERE member_id = ? AND type = 'EARN' ORDER BY created_at ASC")
    .all(memberId)
  const tierState = evaluateMemberTierState(member, earnEntries, nowDate)

  // Danh sách voucher khả dụng của hội viên
  const vouchers = db
    .prepare(`
      SELECT code, kind, discount_percent, discount_amount, free_shipping, min_subtotal, expires_at, source, status, created_at
      FROM vouchers
      WHERE member_id = ? AND used = 0 AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC
    `)
    .all(memberId, nowDate.toISOString())

  const tierConfig = LOYALTY_TIERS[member.tier] || LOYALTY_TIERS.MEMBER

  return {
    member: {
      id: member.id,
      phone: member.phone,
      fullName: member.full_name,
      email: member.email,
      birthDay: member.birth_day,
      birthMonth: member.birth_month,
      tier: member.tier,
      tierName: tierConfig.name,
      tierColor: tierConfig.badgeColor,
      tierBg: tierConfig.badgeBg,
      tierChangedAt: member.tier_changed_at,
      status: member.status,
      createdAt: member.created_at,
    },
    points: {
      balance,
      valueVnd: balance * 5000, // 10 điểm = 50.000đ -> 1 điểm tương đương 5.000đ
      rollingSpend365d: rollingSpend,
      daysSinceActivity: tierState.daysSinceActivity,
      daysUntilExpiry: tierState.daysUntilExpiry,
      isExpiringSoon: tierState.isExpiringSoon,
    },
    tierProgress: nextTierInfo,
    perks: tierConfig.perks,
    tierDiscountPercent: tierConfig.discountPercent,
    vouchers: vouchers.map((v) => ({
      code: v.code,
      kind: v.kind || 'percent',
      discountAmount: v.discount_amount || 0,
      discountPercent: v.discount_percent || 0,
      freeShipping: Boolean(v.free_shipping),
      minSubtotal: v.min_subtotal || 0,
      expiresAt: v.expires_at,
      source: v.source,
      status: v.status,
    })),
  }
}

/**
 * Xem trước các ưu đãi áp dụng được và chưa áp dụng được cho giỏ hàng (/api/loyalty/checkout-preview)
 * Trả về danh sách ưu đãi minh bạch kèm thông điệp tiếng Việt thân thiện (A9, 5.6).
 */
export function previewCheckoutBenefits({
  memberId = null,
  phone = null,
  subtotal = 0,
  paymentMethod = 'COD',
  voucherCode = null,
  originalShippingFee = 30000,
}) {
  let member = null
  if (memberId) {
    member = getMemberById(memberId)
  } else if (phone) {
    member = getMemberByPhone(phone)
  }

  const validSubtotal = Math.max(0, Number(subtotal) || 0)
  const isMember = Boolean(member && member.status === 'active')
  const currentTier = isMember ? member.tier : 'MEMBER'
  const tierConfig = LOYALTY_TIERS[currentTier] || LOYALTY_TIERS.MEMBER

  const benefitsList = []

  // 1. Ưu đãi chiết khấu theo Hạng Hội Viên (A9)
  const tierDiscountPercent = tierConfig.discountPercent || 0
  let tierDiscountAmount = 0

  if (isMember && tierDiscountPercent > 0) {
    tierDiscountAmount = Math.round(validSubtotal * (tierDiscountPercent / 100))
    benefitsList.push({
      id: 'tier_discount',
      title: `Ưu đãi hạng ${tierConfig.name} (−${tierDiscountPercent}%)`,
      type: 'TIER_DISCOUNT',
      applicable: true,
      amount: tierDiscountAmount,
      percent: tierDiscountPercent,
      message: `Tự động giảm ${tierDiscountPercent}% (${tierDiscountAmount.toLocaleString('vi-VN')}đ) cho hội viên ${tierConfig.name}`,
    })
  } else if (isMember) {
    benefitsList.push({
      id: 'tier_discount',
      title: `Ưu đãi hạng ${tierConfig.name}`,
      type: 'TIER_DISCOUNT',
      applicable: false,
      amount: 0,
      reasonCode: 'TIER_NO_DISCOUNT',
      message: 'Hạng Thân Thiết tích điểm 100k = 1 điểm. Mua thêm để thăng hạng Bạc giảm 5% mọi đơn hàng.',
    })
  }

  // 2. Ưu đãi đổi điểm (Redeem Points)
  if (isMember) {
    const pointsBalance = getMemberPointsBalance(member.id)
    if (pointsBalance >= LOYALTY_RULES.POINTS_PER_VOUCHER) {
      benefitsList.push({
        id: 'redeem_points',
        title: 'Đổi 10 điểm thưởng lấy Voucher 50.000đ',
        type: 'POINTS_REDEEM',
        applicable: true,
        pointsRequired: 10,
        currentPoints: pointsBalance,
        discountAmount: LOYALTY_RULES.VOUCHER_AMOUNT_PER_REDEEM,
        message: `Bạn đang có ${pointsBalance} điểm khả dụng. Có thể đổi 10 điểm để giảm 50.000đ cho đơn này.`,
      })
    } else {
      const needed = LOYALTY_RULES.POINTS_PER_VOUCHER - pointsBalance
      benefitsList.push({
        id: 'redeem_points',
        title: 'Đổi điểm nhận Voucher 50.000đ',
        type: 'POINTS_REDEEM',
        applicable: false,
        pointsRequired: 10,
        currentPoints: pointsBalance,
        reasonCode: 'INSUFFICIENT_POINTS',
        message: `Bạn đang có ${pointsBalance} điểm (còn thiếu ${needed} điểm để đổi voucher 50.000đ).`,
      })
    }
  }

  // 3. Ưu đãi VietQR / Chuyển khoản ngân hàng (-10%)
  const isBankTransfer = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'VIETQR'
  let vietQrDiscountAmount = 0
  if (isBankTransfer) {
    vietQrDiscountAmount = Math.round(validSubtotal * 0.1)
    benefitsList.push({
      id: 'vietqr_discount',
      title: 'Chiết khấu VietQR / Chuyển khoản (−10%)',
      type: 'PAYMENT_DISCOUNT',
      applicable: true,
      amount: vietQrDiscountAmount,
      percent: 10,
      message: `Giảm trực tiếp 10% (${vietQrDiscountAmount.toLocaleString('vi-VN')}đ) khi thanh toán chuyển khoản`,
    })
  }

  // 4. Ưu đãi Voucher áp dụng
  let voucherDiscountAmount = 0
  let isFreeShipping = validSubtotal >= 500000 // Freeship từ 500k mặc định

  if (voucherCode) {
    const voucherRes = validateVoucher(voucherCode, {
      memberId: member ? member.id : null,
      subtotal: validSubtotal,
    })

    if (voucherRes.isValid) {
      const vBenefits = calculateVoucherBenefits(voucherRes.voucher, validSubtotal, originalShippingFee)
      voucherDiscountAmount = vBenefits.discountAmount
      if (vBenefits.freeShipping) isFreeShipping = true

      benefitsList.push({
        id: 'voucher_applied',
        title: `Mã ưu đãi: ${voucherRes.voucher.code}`,
        type: 'VOUCHER',
        applicable: true,
        code: voucherRes.voucher.code,
        amount: voucherDiscountAmount,
        message: `Áp dụng thành công mã ${voucherRes.voucher.code}: Giảm ${voucherDiscountAmount.toLocaleString('vi-VN')}đ`,
      })
    } else {
      benefitsList.push({
        id: 'voucher_applied',
        title: `Mã ưu đãi: ${voucherCode}`,
        type: 'VOUCHER',
        applicable: false,
        code: voucherCode,
        amount: 0,
        reasonCode: 'VOUCHER_INVALID',
        message: voucherRes.error || 'Mã ưu đãi không hợp lệ',
      })
    }
  }

  // 5. Miễn phí vận chuyển
  const shippingFee = isFreeShipping ? 0 : originalShippingFee
  if (isFreeShipping) {
    benefitsList.push({
      id: 'shipping_perk',
      title: 'Miễn phí vận chuyển toàn quốc',
      type: 'SHIPPING',
      applicable: true,
      amount: originalShippingFee,
      message: validSubtotal >= 500000 ? 'Đơn hàng từ 500.000đ được Freeship tự động' : 'Được miễn phí vận chuyển theo mã ưu đãi',
    })
  }

  // Tổng hợp số tiền tính theo server
  const totalDiscount = tierDiscountAmount + vietQrDiscountAmount + voucherDiscountAmount
  const expectedTotal = Math.max(0, validSubtotal - totalDiscount) + shippingFee

  // Dự tính điểm sẽ nhận được khi đơn giao thành công (A1, A2)
  const qualifyingSpend = Math.max(0, validSubtotal - totalDiscount)
  const estimatedPointsToEarn = isMember ? Math.floor(qualifyingSpend / LOYALTY_RULES.SPEND_PER_POINT) : 0

  return {
    isMember,
    currentTier,
    benefitsList,
    pricingPreview: {
      subtotal: validSubtotal,
      tierDiscountAmount,
      vietQrDiscountAmount,
      voucherDiscountAmount,
      totalDiscount,
      shippingFee,
      expectedTotal,
      estimatedPointsToEarn,
    },
  }
}
