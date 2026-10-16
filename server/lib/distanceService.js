// server/lib/distanceService.js
// Dịch vụ tính toán khoảng cách địa chỉ và kiểm tra điều kiện Ship COD bằng AI Multi-Agent Engine (0đ phí Google Maps)

import { calculateShippingDistanceAI, SHOP_ORIGIN } from './aiGeoDistanceService.js'

export { SHOP_ORIGIN }

/**
 * Tính toán khoảng cách và kiểm tra điều kiện COD bằng hệ thống AI Multi-Agent
 * Tự động hóa hoàn toàn, thay thế Google Maps API.
 * @param {Object} params { address, ward, district, city }
 * @returns {Promise<Object>}
 */
export async function calculateShippingDistance({ address = '', ward = '', district = '', city = 'Hà Nội' }) {
  return calculateShippingDistanceAI({ address, ward, district, city })
}
