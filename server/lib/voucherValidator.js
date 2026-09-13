import { getVoucherByCode, markVoucherUsed } from './accountDb.js'

/**
 * Server-side Voucher Validator:
 * Xác thực toàn vẹn mã giảm giá từ SQLite database.
 * Tuyệt đối không tin tưởng client, đảm bảo voucher chỉ dùng được 1 lần duy nhất.
 */
export function validateVoucher(code, context = {}) {
  if (!code || typeof code !== 'string') {
    return {
      isValid: false,
      error: 'Vui lòng nhập mã ưu đãi',
    }
  }

  const cleanCode = code.trim().toUpperCase()

  // 1. Tra cứu voucher trong SQLite database
  const voucher = getVoucherByCode(cleanCode)

  if (voucher) {
    // Kiểm tra trạng thái đã sử dụng
    if (voucher.used) {
      return {
        isValid: false,
        error: 'Mã ưu đãi này đã được sử dụng cho một đơn hàng trước đó',
      }
    }

    // Nếu có truyền accountId, kiểm tra tính sở hữu (nếu muốn khoá chặt)
    if (context.accountId && voucher.account_id && voucher.account_id !== context.accountId) {
      return {
        isValid: false,
        error: 'Mã ưu đãi này không thuộc tài khoản hiện tại của bạn',
      }
    }

    return {
      isValid: true,
      voucher: {
        code: voucher.code,
        discountPercent: voucher.discount_percent || 10,
        freeShipping: Boolean(voucher.free_shipping),
        accountId: voucher.account_id,
        isWelcomeVoucher: voucher.account_id !== 'system',
      },
    }
  }

  return {
    isValid: false,
    error: 'Mã ưu đãi không tồn tại hoặc đã hết hạn',
  }
}

/**
 * Tính toán quyền lợi giảm giá và phí ship từ voucher
 */
export function calculateVoucherBenefits(voucher, subtotal, originalShippingFee) {
  if (!voucher) {
    return {
      discountAmount: 0,
      shippingFee: originalShippingFee,
      freeShipping: false,
    }
  }

  const discountPercent = Number(voucher.discountPercent) || 0
  const discountAmount = Math.round(subtotal * (discountPercent / 100))
  const freeShipping = Boolean(voucher.freeShipping)
  const shippingFee = freeShipping ? 0 : originalShippingFee

  return {
    discountAmount,
    shippingFee,
    freeShipping,
  }
}

/**
 * Đánh dấu mã voucher đã sử dụng sau khi đơn hàng submit thành công
 */
export function redeemVoucher(code, orderId) {
  if (!code) return false
  const cleanCode = String(code).trim().toUpperCase()

  const success = markVoucherUsed(cleanCode, orderId)
  if (success) {
    console.log(`🎫 [VOUCHER REDEEMED] Mã ${cleanCode} đã được kích hoạt thành công cho đơn hàng: ${orderId}`)
  } else {
    console.warn(`⚠️ [VOUCHER WARNING] Không thể đánh dấu used cho mã ${cleanCode} (có thể đã used hoặc không tìm thấy)`)
  }
  return success
}
