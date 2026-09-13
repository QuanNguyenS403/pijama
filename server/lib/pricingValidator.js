// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Chỉ chỉnh sửa khi có yêu cầu rõ ràng, cụ thể nhắm đúng vào nội dung file này.
import { products } from '../../src/data/products.js'
import { validateVoucher } from './voucherValidator.js'

/**
 * Server-side Pricing Validator:
 * Đối chiếu và tính toán lại toàn bộ giá trị đơn hàng từ catalog gốc của server.
 * Tuyệt đối không tin tưởng các con số đơn giá do client gửi lên.
 */
export function validateOrderPricing(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return {
      isValid: false,
      error: 'Đơn hàng không có sản phẩm nào',
    }
  }

  let calculatedSubtotal = 0
  const validatedItems = []

  // 1. Kiểm tra từng sản phẩm
  for (const item of order.items) {
    // Tìm sản phẩm trong catalog gốc của server theo slug/id hoặc productName
    const catalogProduct = products.find(
      (p) =>
        p.id === item.productId ||
        p.slug === item.slug ||
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

    validatedItems.push({
      ...item,
      productId: catalogProduct.id,
      productName: catalogProduct.name,
      unitPrice: officialUnitPrice,
      totalPrice: officialTotalPrice,
      quantity,
    })
  }

  // 2. Kiểm tra Voucher (nếu khách có áp dụng mã ưu đãi)
  let voucherDiscount = 0
  let isFreeShippingFromVoucher = false
  let validatedVoucherData = null

  if (order.voucherCode && String(order.voucherCode).trim()) {
    const voucherRes = validateVoucher(order.voucherCode, {
      accountId: order.customer?.accountId,
      subtotal: calculatedSubtotal,
    })

    if (!voucherRes.isValid) {
      return {
        isValid: false,
        error: voucherRes.error || 'Mã ưu đãi không hợp lệ hoặc đã được sử dụng',
      }
    }

    validatedVoucherData = voucherRes.voucher
    const discountPercent = Number(validatedVoucherData.discountPercent) || 0
    voucherDiscount = Math.round(calculatedSubtotal * (discountPercent / 100))
    isFreeShippingFromVoucher = Boolean(validatedVoucherData.freeShipping)
  }

  // 3. Tính phí vận chuyển (Freeship từ 500.000đ, hoặc có Voucher Freeship, dưới 500.000đ phí 30.000đ)
  let calculatedShippingFee = calculatedSubtotal >= 500000 ? 0 : 30000
  if (isFreeShippingFromVoucher) {
    calculatedShippingFee = 0
  }

  // 4. Validate enum Phương thức thanh toán (COM-001)
  const paymentMethod = order.payment?.method
  if (!paymentMethod || !['COD', 'BANK_TRANSFER'].includes(paymentMethod)) {
    return {
      isValid: false,
      error: `Phương thức thanh toán không hợp lệ ("${paymentMethod}"). Chỉ chấp nhận COD hoặc BANK_TRANSFER.`,
    }
  }

  let bankTransferDiscount = 0
  if (paymentMethod === 'BANK_TRANSFER') {
    // Giảm 10% trực tiếp trên tạm tính cho chuyển khoản VietQR
    bankTransferDiscount = Math.round(calculatedSubtotal * 0.10)
  }

  const calculatedDiscount = bankTransferDiscount + voucherDiscount

  // 5. Tính tổng thanh toán cuối cùng
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedShippingFee - calculatedDiscount)

  // 6. Đối chiếu subtotal và total client gửi lên (PAY-005: Exact match 0đ tolerance)
  const clientSubtotal = Number(order.subtotal)
  const clientTotal = Number(order.total)

  if (!isNaN(clientSubtotal) && clientSubtotal !== calculatedSubtotal) {
    return {
      isValid: false,
      error: `Tạm tính không hợp lệ (Server: ${calculatedSubtotal}đ, Client: ${clientSubtotal}đ)`,
    }
  }

  if (!isNaN(clientTotal) && clientTotal !== calculatedTotal) {
    return {
      isValid: false,
      error: `Tổng thanh toán không hợp lệ (Server: ${calculatedTotal}đ, Client: ${clientTotal}đ)`,
    }
  }

  return {
    isValid: true,
    summary: {
      subtotal: calculatedSubtotal,
      shippingFee: calculatedShippingFee,
      discount: calculatedDiscount,
      bankTransferDiscount,
      voucherDiscount,
      voucherCode: validatedVoucherData ? validatedVoucherData.code : null,
      total: calculatedTotal,
      items: validatedItems,
    },
  }
}
