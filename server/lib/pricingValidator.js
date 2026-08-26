import { products } from '../../src/data/products.js'

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

    const quantity = parseInt(item.quantity, 10)
    if (isNaN(quantity) || quantity <= 0) {
      return {
        isValid: false,
        error: `Số lượng sản phẩm "${catalogProduct.name}" không hợp lệ (${item.quantity})`,
      }
    }

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

  // 2. Tính phí vận chuyển (Freeship từ 500.000đ, dưới 500.000đ phí 30.000đ)
  const calculatedShippingFee = calculatedSubtotal >= 500000 ? 0 : 30000

  // 3. Tính giảm giá theo phương thức thanh toán
  const paymentMethod = order.payment?.method || 'COD'
  let calculatedDiscount = 0

  if (paymentMethod === 'BANK_TRANSFER') {
    // Giảm 10% trực tiếp trên tạm tính
    calculatedDiscount = Math.round(calculatedSubtotal * 0.10)
  }

  // 4. Tính tổng thanh toán cuối cùng
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedShippingFee - calculatedDiscount)

  // 5. Đối chiếu subtotal và total client gửi lên
  const clientSubtotal = Number(order.subtotal)
  const clientTotal = Number(order.total)

  if (!isNaN(clientSubtotal) && Math.abs(clientSubtotal - calculatedSubtotal) > 100) {
    return {
      isValid: false,
      error: `Tạm tính không hợp lệ (Server: ${calculatedSubtotal}đ, Client: ${clientSubtotal}đ)`,
    }
  }

  if (!isNaN(clientTotal) && Math.abs(clientTotal - calculatedTotal) > 100) {
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
      total: calculatedTotal,
      items: validatedItems,
    },
  }
}
