import { products } from '../../src/data/products.js'
import { orderPersistence } from './orderPersistence.js'

/**
 * Server-side Stock Validator:
 * Kiểm tra tồn kho thực tế của từng sản phẩm dựa trên catalog gốc
 * và trừ đi số lượng đã được đặt trong các đơn hàng chưa bị hủy.
 */
export function validateOrderStock(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return { isValid: false, error: 'Đơn hàng không có sản phẩm để kiểm tra tồn kho' }
  }

  // 1. Tính tổng số lượng đã được đặt theo từng (productId + color + size) từ các đơn đang hoạt động
  const activeOrders = orderPersistence.getAll().filter((o) => o.status !== 'CANCELLED')
  const reservedStockMap = new Map()

  for (const actOrder of activeOrders) {
    // Không tính chính đơn hàng hiện tại nếu đang cập nhật
    if (actOrder.orderId === order.orderId) continue

    if (Array.isArray(actOrder.items)) {
      for (const it of actOrder.items) {
        const pId = it.productId || it.slug || ''
        const color = String(it.color?.name || it.color || '').trim()
        const size = String(it.size || '').trim()
        const key = `${pId}_${color}_${size}`.toLowerCase()
        const currentQty = reservedStockMap.get(key) || 0
        reservedStockMap.set(key, currentQty + (parseInt(it.quantity, 10) || 1))
      }
    }
  }

  // 2. Kiểm tra từng mặt hàng trong đơn mới
  for (const item of order.items) {
    const catalogProduct = products.find(
      (p) =>
        p.id === item.productId ||
        p.slug === item.slug ||
        p.name?.toLowerCase() === item.productName?.toLowerCase()
    )

    if (!catalogProduct) continue

    const colorName = String(item.color?.name || item.color || '').trim()
    const size = String(item.size || '').trim()
    const reqQty = parseInt(item.quantity, 10) || 1

    // Tìm cấu hình stock trong catalog
    let baselineStock = 99 // Mặc định nếu không chỉ định
    const colorObj = catalogProduct.colors?.find(
      (c) => c.name?.toLowerCase() === colorName.toLowerCase() || c.label?.toLowerCase() === colorName.toLowerCase()
    )

    if (colorObj && colorObj.stock && size) {
      if (colorObj.stock[size] !== undefined) {
        baselineStock = colorObj.stock[size]
      }
    }

    const key = `${catalogProduct.id}_${colorName}_${size}`.toLowerCase()
    const reservedQty = reservedStockMap.get(key) || 0
    const availableStock = Math.max(0, baselineStock - reservedQty)

    if (reqQty > availableStock) {
      return {
        isValid: false,
        error: `Sản phẩm "${catalogProduct.name}" (${colorName || 'Mặc định'} - Size ${size || 'Chuẩn'}) chỉ còn ${availableStock} sản phẩm trong kho (bạn đặt ${reqQty} sản phẩm).`,
        availableStock,
      }
    }
  }

  return { isValid: true }
}
