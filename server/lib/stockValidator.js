// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Đã được xác nhận bởi Quan: Khắc phục lỗi P0 INV-001 và Gate G-16.
import { products } from '../../src/data/products.js'
import { orderPersistence } from './orderPersistence.js'

/**
 * Server-side Stock Validator (G-16 / INV-001):
 * 1. Tổng hợp (Aggregate) số lượng theo từng (productId + color + size) trước khi kiểm tra (chống tách dòng vượt kho).
 * 2. Từ chối biến thể màu hoặc kích thước không tồn tại trong catalog (chống fallback 99).
 * 3. Bỏ hoàn toàn việc tin tưởng cờ client-side `isPreOrder`.
 * 4. Đối chiếu tồn kho thực tế từ catalog trừ đi các đơn đang hoạt động (reserved stock).
 */
export function validateOrderStock(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return { isValid: false, error: 'Đơn hàng không có sản phẩm để kiểm tra tồn kho' }
  }

  // 1. Tính tổng số lượng đã được đặt từ các đơn đang hoạt động (trừ đơn CANCELLED)
  const activeOrders = orderPersistence.getAll().filter((o) => o.status !== 'CANCELLED')
  const reservedStockMap = new Map()

  for (const actOrder of activeOrders) {
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

  // 2. Gộp (Aggregate) tất cả các dòng cùng SKU trong đơn hàng mới (INV-001)
  const aggregatedOrderMap = new Map()

  for (const item of order.items) {
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

    const colorName = String(item.color?.name || item.color || '').trim()
    const size = String(item.size || '').trim()
    const qty = parseInt(item.quantity, 10)

    if (isNaN(qty) || qty <= 0) {
      return {
        isValid: false,
        error: `Số lượng sản phẩm "${catalogProduct.name}" không hợp lệ (${item.quantity})`,
      }
    }

    // Xác thực biến thể màu và kích cỡ hợp lệ từ catalog gốc (INV-001)
    const colorObj = catalogProduct.colors?.find(
      (c) => c.name?.toLowerCase() === colorName.toLowerCase() || c.label?.toLowerCase() === colorName.toLowerCase()
    )

    if (!colorObj) {
      return {
        isValid: false,
        error: `Màu sắc "${colorName || 'Mặc định'}" không tồn tại cho sản phẩm "${catalogProduct.name}"`,
      }
    }

    if (size && Array.isArray(catalogProduct.sizes) && !catalogProduct.sizes.includes(size)) {
      return {
        isValid: false,
        error: `Kích thước "${size}" không tồn tại cho sản phẩm "${catalogProduct.name}"`,
      }
    }

    const key = `${catalogProduct.id}_${colorName}_${size}`.toLowerCase()
    const existing = aggregatedOrderMap.get(key) || {
      product: catalogProduct,
      colorObj,
      colorName,
      size,
      totalQuantity: 0,
    }

    existing.totalQuantity += qty
    aggregatedOrderMap.set(key, existing)
  }

  // 3. Kiểm tra tồn kho dựa trên tổng số lượng gộp của từng SKU
  for (const [key, aggregate] of aggregatedOrderMap.entries()) {
    const { product: catalogProduct, colorObj, colorName, size, totalQuantity } = aggregate

    let baselineStock = 0
    if (colorObj && colorObj.stock && size) {
      if (colorObj.stock[size] !== undefined) {
        baselineStock = colorObj.stock[size]
      }
    }

    const reservedQty = reservedStockMap.get(key) || 0
    const availableStock = Math.max(0, baselineStock - reservedQty)

    if (totalQuantity > availableStock) {
      return {
        isValid: false,
        error: `Sản phẩm "${catalogProduct.name}" (${colorName || 'Mặc định'} - Size ${size || 'Chuẩn'}) chỉ còn ${availableStock} sản phẩm trong kho (bạn đặt ${totalQuantity} sản phẩm).`,
        availableStock,
        requestedQuantity: totalQuantity,
      }
    }
  }

  return { isValid: true }
}
