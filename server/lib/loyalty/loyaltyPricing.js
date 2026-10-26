// server/lib/loyalty/loyaltyPricing.js
import { LOYALTY_TIERS } from './loyaltyConfig.js'
import { getMemberById, getMemberByPhone } from './loyaltyDb.js'
import { validateVoucher, calculateVoucherBenefits } from '../voucherValidator.js'

/**
 * Tính toán các khoản điều chỉnh giá trị đơn hàng cho Hội viên (Loyalty Adjustments).
 * Đây là nguồn tính toán duy nhất ở server để áp dụng cho kiểm tra giá.
 */
export function calculateLoyaltyAdjustments({
  memberId = null,
  phone = null,
  subtotal = 0,
  voucherCode = null,
  paymentMethod = 'COD',
}) {
  let member = null
  if (memberId) {
    member = getMemberById(memberId)
  } else if (phone) {
    member = getMemberByPhone(phone)
  }

  const validSubtotal = Math.max(0, Math.floor(Number(subtotal) || 0))
  let tierDiscountPercent = 0
  let tierDiscountAmount = 0
  let memberTier = 'MEMBER'

  if (member && member.status === 'active') {
    memberTier = member.tier || 'MEMBER'
    const tierConfig = LOYALTY_TIERS[memberTier] || LOYALTY_TIERS.MEMBER
    tierDiscountPercent = tierConfig.discountPercent || 0
    tierDiscountAmount = Math.round(validSubtotal * (tierDiscountPercent / 100))
  }

  // Voucher tính toán
  let voucherAmount = 0
  let voucherFreeShipping = false
  let validatedVoucher = null

  if (voucherCode) {
    const vRes = validateVoucher(voucherCode, {
      memberId: member ? member.id : null,
      subtotal: validSubtotal,
    })

    if (vRes.isValid) {
      validatedVoucher = vRes.voucher
      const vBenefits = calculateVoucherBenefits(validatedVoucher, validSubtotal, 30000)
      voucherAmount = vBenefits.discountAmount
      voucherFreeShipping = vBenefits.freeShipping
    }
  }

  // Chiết khấu thanh toán VietQR (-10%)
  const isBankTransfer = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'VIETQR'
  const bankDiscountAmount = isBankTransfer ? Math.round(validSubtotal * 0.1) : 0

  const totalDiscount = tierDiscountAmount + voucherAmount + bankDiscountAmount

  return {
    isMember: Boolean(member),
    memberId: member ? member.id : null,
    memberTier,
    tierDiscountPercent,
    tierDiscountAmount,
    voucherCode: validatedVoucher ? validatedVoucher.code : null,
    voucherKind: validatedVoucher ? validatedVoucher.kind : null,
    voucherAmount,
    voucherFreeShipping,
    bankDiscountAmount,
    totalDiscount,
    merchandiseTotalAfterDiscounts: Math.max(0, validSubtotal - totalDiscount),
  }
}
