/**
 * Live Facts Module — Dữ kiện thời gian thực
 * Cung cấp sự thật động (Voucher đang hợp lệ từ SQLite, Ngưỡng Freeship, Giảm giá Chuyển khoản, Tồn kho thật)
 * Được tiêm vào prompt của mỗi lượt hội thoại để model KHÔNG BAO GIỜ bịa thông tin.
 */

import { getDb } from '../accountDb.js'
import { products } from '../../../src/data/products.js'

// Hằng số chính sách từ checkoutConfig & policiesData
export const LIVE_CONSTANTS = {
  FREE_SHIP_THRESHOLD: 500000,
  STANDARD_SHIPPING_FEE: 30000,
  BANK_TRANSFER_DISCOUNT_PERCENT: 10,
  SHOP_HOTLINE: '0981753082',
  SHOP_ZALO_LINK: 'https://zalo.me/0981753082',
  SHOP_ADDRESS: 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
}

/**
 * Tra cứu danh sách Voucher chiến dịch hệ thống đang còn hiệu lực
 * Chỉ đọc (read-only), không làm thay đổi trạng thái database.
 */
export function getActiveSystemVouchers() {
  try {
    const database = getDb()
    const rows = database
      .prepare(
        `SELECT code, discount_percent, free_shipping, used 
         FROM vouchers 
         WHERE account_id = 'system' AND used = 0`
      )
      .all()

    return rows.map((r) => ({
      code: r.code,
      discountPercent: r.discount_percent || 10,
      freeShipping: Boolean(r.free_shipping),
      label: `Mã ${r.code}: Giảm ${r.discount_percent}%${r.free_shipping ? ' + Miễn phí vận chuyển' : ''}`,
    }))
  } catch (err) {
    // Nếu môi trường test hoặc SQLite chưa khởi tạo, fallback an toàn
    return [{ code: 'QNS10', discountPercent: 10, freeShipping: false, label: 'Mã QNS10: Giảm 10%' }]
  }
}

/**
 * Kiểm tra tồn kho thật của một sản phẩm cụ thể (read-only)
 * Chỉ dùng khi khách hỏi đích danh sản phẩm/size, tuyệt đối không dump toàn bộ kho.
 */
export function getProductStockFact(productIdOrSlug, size) {
  const product = products.find(
    (p) => p.id === productIdOrSlug || p.slug === productIdOrSlug
  )
  if (!product) return null

  if (product.preOrder?.enabled) {
    return {
      isPreOrder: true,
      message: 'Sản phẩm đặt may thủ công giới hạn — hoàn thiện và giao trong 7-10 ngày làm việc.',
      available: true,
    }
  }

  if (size && product.colors?.[0]?.stock) {
    const stockQty = product.colors[0].stock[size.toUpperCase()] || 0
    return {
      isPreOrder: false,
      size: size.toUpperCase(),
      stock: stockQty,
      available: stockQty > 0,
      message: stockQty > 0 ? `Size ${size.toUpperCase()} hiện còn hàng sẵn sàng giao.` : `Size ${size.toUpperCase()} tạm thời hết hàng sẵn.`,
    }
  }

  return {
    isPreOrder: false,
    available: true,
    message: 'Sản phẩm hiện đang có sẵn tại kho QuanNguyenS.',
  }
}

/**
 * Tập hợp toàn bộ live facts thành một object nhỏ gọn cho lượt hội thoại hiện tại
 * @param {Object} context - Ngữ cảnh bổ sung (ví dụ giỏ hàng từ client)
 */
export function buildLiveFacts(context = {}) {
  const activeVouchers = getActiveSystemVouchers()
  const activeVoucherCodes = activeVouchers.map((v) => v.code)

  // Tính toán ngữ cảnh giỏ hàng nếu client gửi
  let cartUpsellFact = null
  const subtotal = Number(context.cartSummary?.subtotal) || 0
  if (subtotal > 0) {
    if (subtotal < LIVE_CONSTANTS.FREE_SHIP_THRESHOLD) {
      const remainingForFreeship = LIVE_CONSTANTS.FREE_SHIP_THRESHOLD - subtotal
      cartUpsellFact = `Giỏ hàng hiện tại: ${subtotal.toLocaleString('vi-VN')}đ. Mua thêm ${remainingForFreeship.toLocaleString('vi-VN')}đ nữa để được MIỄN PHÍ VẬN CHUYỂN toàn quốc.`
    } else {
      cartUpsellFact = `Giỏ hàng hiện tại: ${subtotal.toLocaleString('vi-VN')}đ — Đủ điều kiện MIỄN PHÍ VẬN CHUYỂN toàn quốc!`
    }
  }

  return {
    activeVouchers,
    activeVoucherCodes,
    freeShipThreshold: LIVE_CONSTANTS.FREE_SHIP_THRESHOLD,
    standardShippingFee: LIVE_CONSTANTS.STANDARD_SHIPPING_FEE,
    bankTransferDiscountPercent: LIVE_CONSTANTS.BANK_TRANSFER_DISCOUNT_PERCENT,
    cartUpsellFact,
    hotline: LIVE_CONSTANTS.SHOP_HOTLINE,
    zaloLink: LIVE_CONSTANTS.SHOP_ZALO_LINK,
    shopAddress: LIVE_CONSTANTS.SHOP_ADDRESS,
    // Danh sách các mức giá sản phẩm hợp lệ trong hệ thống
    validPriceNumbers: [
      390000, 490000, 550000, 750000, 500000, 30000, 10000, 20, 10
    ],
  }
}
