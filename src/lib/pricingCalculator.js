// src/lib/pricingCalculator.js
// Công thức tính giá & chiết khấu lũy tiến (Compounding) dùng chung giữa Client và Server

export const FREE_SHIP_THRESHOLD = 500000
export const STANDARD_SHIPPING_FEE = 30000
export const SPLIT_SHIPPING_EXTRA_FEE = 30000
export const BANK_TRANSFER_DISCOUNT_PERCENT = 10

/**
 * Tính toán chiết khấu tuần tự (lũy tiến) trên phần tiền còn lại sau mỗi tầng ưu đãi:
 *   1. Giảm giá Hạng Hội Viên (nếu có) -> tính trên Tạm tính
 *   2. Giảm giá Mã Voucher (tối đa 01 mã) -> tính trên Giá sau hạng
 *   3. Giảm giá Chuyển khoản VietQR 10% -> tính trên Giá sau Voucher
 * Đảm bảo tổng ưu đãi Voucher 10% + VietQR 10% = 19% (thay vì cộng thẳng 20% trên giá gốc).
 */
export function calculateOrderTotals({
  subtotal = 0,
  tierDiscountPercent = 0,
  voucher = null,
  paymentMethod = 'COD',
  isMixedPreOrder = false,
  deliveryOption = 'COMBINED',
} = {}) {
  const validSubtotal = Math.max(0, Math.round(Number(subtotal) || 0))
  const validTierPct = Math.max(0, Math.min(100, Number(tierDiscountPercent) || 0))

  // Tầng 1: Chiết khấu Hạng Hội Viên
  const tierDiscountAmount =
    validTierPct > 0 ? Math.round(validSubtotal * (validTierPct / 100)) : 0
  const afterTier = Math.max(0, validSubtotal - tierDiscountAmount)

  // Tầng 2: Chiết khấu Voucher (chỉ 01 voucher / đơn hàng)
  let voucherDiscount = 0
  let isFreeShippingFromVoucher = false

  if (voucher && typeof voucher === 'object') {
    isFreeShippingFromVoucher = Boolean(voucher.freeShipping ?? voucher.free_shipping)
    const fixedAmount = Number(voucher.discountAmount ?? voucher.discount_amount ?? 0)
    const pct = Number(voucher.discountPercent ?? voucher.discount_percent ?? 0)

    if (voucher.kind === 'amount' || (!pct && fixedAmount > 0)) {
      voucherDiscount = Math.min(afterTier, Math.max(0, Math.round(fixedAmount)))
    } else if (pct > 0) {
      const clampedPct = Math.max(0, Math.min(100, pct))
      voucherDiscount = Math.round(afterTier * (clampedPct / 100))
    }
  }
  const afterVoucher = Math.max(0, afterTier - voucherDiscount)

  // Tầng 3: Chiết khấu Chuyển khoản VietQR (-10% trên giá trị hàng sau giảm giá trước đó)
  const isBankTransfer = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'VIETQR'
  const bankTransferDiscount = isBankTransfer
    ? Math.round(afterVoucher * (BANK_TRANSFER_DISCOUNT_PERCENT / 100))
    : 0
  const afterBankTransfer = Math.max(0, afterVoucher - bankTransferDiscount)

  const totalDiscount = tierDiscountAmount + voucherDiscount + bankTransferDiscount

  // Phí vận chuyển cơ bản (Freeship từ 500.000đ tạm tính hoặc có Voucher Freeship)
  const isFreeBaseShipping = validSubtotal >= FREE_SHIP_THRESHOLD || isFreeShippingFromVoucher
  const baseShippingFee = isFreeBaseShipping ? 0 : STANDARD_SHIPPING_FEE

  // Phụ phí tách giao đợt 2 cho đơn hỗn hợp (Hàng có sẵn + Hàng Pre-order)
  const normalizedDeliveryOption =
    isMixedPreOrder && deliveryOption === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED'
  const splitShippingFee =
    normalizedDeliveryOption === 'SPLIT_SHIPPING' ? SPLIT_SHIPPING_EXTRA_FEE : 0

  const shippingFee = baseShippingFee + splitShippingFee
  const total = Math.max(0, afterBankTransfer + shippingFee)

  return {
    subtotal: validSubtotal,
    tierDiscountPercent: validTierPct,
    tierDiscountAmount,
    afterTier,
    voucherDiscount,
    isFreeShippingFromVoucher,
    afterVoucher,
    bankTransferDiscount,
    afterBankTransfer,
    totalDiscount,
    baseShippingFee,
    splitShippingFee,
    shippingFee,
    deliveryOption: normalizedDeliveryOption,
    total,
  }
}
