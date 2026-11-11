// src/lib/productUtils.js
// Nguồn chuẩn chung cho slug chuẩn, chuyển hướng URL cũ -> mới, màu sắc và nhận diện Pre-order

export const LEGACY_PRODUCT_SLUG_REDIRECTS = {
  'the-classic-set': 'the-daybreak-set',
  'the-cafe-look': 'the-stillwater-set',
  'the-evening-edit': 'the-hearth-set',
}

export const PREORDER_IDENTIFIERS = new Set([
  'the-evening-edit',
  'the-hearth-set',
])

/**
 * Chuyển đổi slug/id sản phẩm sang canonical slug mới nhất
 */
export function resolveCanonicalProductSlug(slugOrId) {
  if (!slugOrId) return ''
  const key = String(slugOrId).trim().toLowerCase()
  return LEGACY_PRODUCT_SLUG_REDIRECTS[key] || slugOrId
}

/**
 * Kiểm tra item hoặc sản phẩm có phải là hàng đặt trước (Pre-order) hay không
 */
export function isPreOrderItem(item) {
  if (!item) return false
  if (item.preOrder?.enabled || item.isPreOrder) return true
  const slug = String(item.slug || '').toLowerCase()
  const productId = String(item.productId || item.id || '').toLowerCase()
  return PREORDER_IDENTIFIERS.has(slug) || PREORDER_IDENTIFIERS.has(productId)
}

/**
 * Kiểm tra giỏ hàng có chứa đồng thời hàng có sẵn (In-stock) và hàng đặt trước (Pre-order) hay không
 */
export function analyzeCartFulfillment(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { hasPreOrder: false, hasInStock: false, isMixed: false, preOrderItems: [], inStockItems: [] }
  }
  const preOrderItems = []
  const inStockItems = []
  for (const item of items) {
    if (isPreOrderItem(item)) preOrderItems.push(item)
    else inStockItems.push(item)
  }
  const hasPreOrder = preOrderItems.length > 0
  const hasInStock = inStockItems.length > 0
  return {
    hasPreOrder,
    hasInStock,
    isMixed: hasPreOrder && hasInStock,
    preOrderItems,
    inStockItems,
  }
}

/**
 * Chuẩn hóa tên màu hiển thị cho khách hàng (loại bỏ nhãn cũ "Classic Red")
 */
export function getDisplayColorName(color) {
  if (!color) return ''
  if (typeof color === 'string') {
    return color.trim().toLowerCase() === 'classic red' ? 'Đỏ' : color.trim()
  }
  const label = color.label ? String(color.label).trim() : ''
  const name = color.name ? String(color.name).trim() : ''
  if (label) return label
  if (name.toLowerCase() === 'classic red') return 'Đỏ'
  return name
}
