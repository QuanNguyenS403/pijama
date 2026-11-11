// server/lib/loyalty/loyaltyPricing.js
import { LOYALTY_TIERS } from './loyaltyConfig.js'
import { getMemberById, getMemberByPhone } from './loyaltyDb.js'
import { validateVoucher } from '../voucherValidator.js'
import { calculateOrderTotals } from '../../../src/lib/pricingCalculator.js'

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
  let memberTier = 'MEMBER'

  if (member && member.status === 'active') {
    memberTier = member.tier || 'MEMBER'
    const tierConfig = LOYALTY_TIERS[memberTier] || LOYALTY_TIERS.MEMBER
    tierDiscountPercent = tierConfig.discountPercent || 0
  }

  // Voucher tính toán (tối đa 01 mã)
  let validatedVoucher = null
  if (voucherCode) {
    const trimmed = String(voucherCode).trim()
    if (!trimmed.includes(',') && !trimmed.includes(';')) {
      const vRes = validateVoucher(trimmed, {
        memberId: member ? member.id : null,
        subtotal: validSubtotal,
      })
      if (vRes.isValid) {
        validatedVoucher = vRes.voucher
      }
    }
  }

  // Chiết khấu lũy tiến tuần tự: Hạng -> Voucher -> VietQR 10%
  const totals = calculateOrderTotals({
    subtotal: validSubtotal,
    tierDiscountPercent,
    voucher: validatedVoucher,
    paymentMethod,
  })

  return {
    isMember: Boolean(member),
    memberId: member ? member.id : null,
    memberTier,
    tierDiscountPercent: totals.tierDiscountPercent,
    tierDiscountAmount: totals.tierDiscountAmount,
    voucherCode: validatedVoucher ? validatedVoucher.code : null,
    voucherKind: validatedVoucher ? validatedVoucher.kind : null,
    voucherAmount: totals.voucherDiscount,
    voucherFreeShipping: totals.isFreeShippingFromVoucher,
    bankDiscountAmount: totals.bankTransferDiscount,
    totalDiscount: totals.totalDiscount,
    merchandiseTotalAfterDiscounts: totals.afterBankTransfer,
  }
}
