// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Chỉ chỉnh sửa khi có yêu cầu rõ ràng, cụ thể nhắm đúng vào nội dung file này.
import { products } from '../../src/data/products.js'
import { validateVoucher } from './voucherValidator.js'
import { calculateOrderTotals } from '../../src/lib/pricingCalculator.js'
import { analyzeCartFulfillment, resolveCanonicalProductSlug } from '../../src/lib/productUtils.js'
import { LOYALTY_TIERS } from './loyalty/loyaltyConfig.js'

/**
 * Server-side Pricing Validator:
 * Đối chiếu và tính toán lại toàn bộ giá trị đơn hàng từ catalog gốc của server.
 * Tuyệt đối không tin tưởng các con số đơn giá do client gửi lên.
 */
export function validateOrderPricing(order, options = {}) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      isValid: false,
      error: 'Đơn hàng không có sản phẩm nào',
    }
  }

  // Giới hạn tối đa 01 mã giảm giá / đơn hàng
  if (
    (Array.isArray(order.voucherCodes) && order.voucherCodes.length > 1) ||
    (Array.isArray(order.voucherCode) && order.voucherCode.length > 1)
  ) {
    return {
      isValid: false,
      error: 'Mỗi đơn hàng chỉ được áp dụng tối đa 01 mã giảm giá (Voucher).',
    }
  }
  const rawVoucherCode = Array.isArray(order.voucherCode)
    ? String(order.voucherCode[0] || '').trim()
    : String(order.voucherCode || '').trim()
  if (rawVoucherCode.includes(',') || rawVoucherCode.includes(';')) {
    return {
      isValid: false,
      error: 'Mỗi đơn hàng chỉ được áp dụng tối đa 01 mã giảm giá (Voucher).',
    }
  }

  let calculatedSubtotal = 0
  const validatedItems = []
  const matchedProducts = []

  // 1. Kiểm tra từng sản phẩm
  for (const item of order.items) {
    // Tìm sản phẩm trong catalog gốc của server theo slug/id hoặc productName
    const rawIdOrSlug = String(item.productId || item.slug || '').trim()
    const canonicalSlug = resolveCanonicalProductSlug(rawIdOrSlug)
    const catalogProduct = products.find(
      (p) =>
        p.id === rawIdOrSlug ||
        p.slug === rawIdOrSlug ||
        p.slug === canonicalSlug ||
        p.name?.toLowerCase() === item.productName?.toLowerCase()
    )

    if (!catalogProduct) {
      return {
        isValid: false,
        error: `Sản phẩm "${item.productName || item.productId}" không tồn tại trong danh mục`,
      }
    }

    const rawQty = Number(item.quantity)
    if (!Number.isInteger(rawQty) || rawQty <= 0) {
      return {
        isValid: false,
        error: `Số lượng sản phẩm "${catalogProduct.name}" không hợp lệ (yêu cầu số nguyên dương, nhận: ${item.quantity})`,
      }
    }
    const quantity = rawQty

    const officialUnitPrice = catalogProduct.price
    const officialTotalPrice = officialUnitPrice * quantity
    calculatedSubtotal += officialTotalPrice

    // So khớp đơn giá client gửi lên
    if (item.unitPrice !== undefined && Number(item.unitPrice) !== officialUnitPrice) {
      return {
        isValid: false,
        error: `Đơn giá của "${catalogProduct.name}" không khớp (Server: ${officialUnitPrice}đ, Client: ${item.unitPrice}đ)`,
      }
    }

    matchedProducts.push(catalogProduct)
    validatedItems.push({
      ...item,
      productId: catalogProduct.id,
      slug: catalogProduct.slug,
      productName: catalogProduct.name,
      unitPrice: officialUnitPrice,
      totalPrice: officialTotalPrice,
      quantity,
    })
  }

  // 2. Xác định đơn hỗn hợp (Hàng có sẵn + Hàng Pre-order) & tùy chọn tách giao
  const { isMixed } = analyzeCartFulfillment(matchedProducts)
  const normalizedDeliveryOption =
    isMixed && order.deliveryOption === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED'

  // 3. Chiết khấu hạng hội viên (CHỈ tin cậy verified loyaltyMember từ server)
  const verifiedMember = options?.loyaltyMember || null
  const verifiedStatus = verifiedMember?.status ?? verifiedMember?.member_status
  const verifiedMemberId = verifiedMember?.member_id || verifiedMember?.id || null
  const tierConfig =
    verifiedMember && verifiedStatus === 'active'
      ? LOYALTY_TIERS[verifiedMember.tier || 'MEMBER'] || LOYALTY_TIERS.MEMBER
      : null
  const tierDiscountPercent = tierConfig?.discountPercent || 0

  // 4. Kiểm tra Voucher (nếu khách có áp dụng 01 mã ưu đãi)
  let validatedVoucherData = null
  if (rawVoucherCode) {
    const voucherRes = validateVoucher(rawVoucherCode, {
      accountId: options?.accountId || order.customer?.accountId || null,
      memberId: verifiedMemberId,
      subtotal: calculatedSubtotal,
    })

    if (!voucherRes.isValid) {
      return {
        isValid: false,
        error: voucherRes.error || 'Mã ưu đãi không hợp lệ hoặc đã được sử dụng',
      }
    }

    validatedVoucherData = voucherRes.voucher
  }

  // 5. Validate enum Phương thức thanh toán (COM-001)
  const paymentMethod = order.payment?.method
  if (!paymentMethod || !['COD', 'BANK_TRANSFER'].includes(paymentMethod)) {
    return {
      isValid: false,
      error: `Phương thức thanh toán không hợp lệ ("${paymentMethod}"). Chỉ chấp nhận COD hoặc BANK_TRANSFER.`,
    }
  }

  // 6. Tính toán tổng tiền theo công thức lũy tiến chuẩn hóa (Hạng -> Voucher -> VietQR 10%)
  const totals = calculateOrderTotals({
    subtotal: calculatedSubtotal,
    tierDiscountPercent,
    voucher: validatedVoucherData,
    paymentMethod,
    isMixedPreOrder: isMixed,
    deliveryOption: normalizedDeliveryOption,
  })

  // 7. Đối chiếu subtotal và total client gửi lên (PAY-005: Exact match 0đ tolerance)
  const clientSubtotal = Number(order.subtotal)
  const clientTotal = Number(order.total)

  if (!isNaN(clientSubtotal) && clientSubtotal !== totals.subtotal) {
    return {
      isValid: false,
      error: `Tạm tính không hợp lệ (Server: ${totals.subtotal}đ, Client: ${clientSubtotal}đ)`,
    }
  }

  if (!isNaN(clientTotal) && clientTotal !== totals.total) {
    return {
      isValid: false,
      error: `Tổng thanh toán không hợp lệ (Server: ${totals.total}đ, Client: ${clientTotal}đ)`,
    }
  }

  return {
    isValid: true,
    summary: {
      subtotal: totals.subtotal,
      tierDiscountPercent: totals.tierDiscountPercent,
      tierDiscountAmount: totals.tierDiscountAmount,
      baseShippingFee: totals.baseShippingFee,
      splitShippingFee: totals.splitShippingFee,
      shippingFee: totals.shippingFee,
      deliveryOption: totals.deliveryOption,
      isMixedPreOrder: isMixed,
      discount: totals.totalDiscount,
      bankTransferDiscount: totals.bankTransferDiscount,
      voucherDiscount: totals.voucherDiscount,
      voucherCode: validatedVoucherData ? validatedVoucherData.code : null,
      total: totals.total,
      items: validatedItems,
    },
  }
}
