// server/lib/bridgeHealth.js
/**
 * Giám sát sức khỏe cầu nối Google Apps Script -> Server (WP9)
 * Ghi nhận heartbeat và cảnh báo khi script im lặng quá 5 phút trong khi có đơn chờ
 */

import { orderPersistence } from './orderPersistence.js'
import { sendOwnerEmail } from './emailOwner.js'
import { getPaymentPhase } from './paymentState.js'

let lastBridgeRunAt = null
let outageAlertSent = false

/**
 * Ghi nhận thời điểm nhận tín hiệu gần nhất từ Apps Script
 */
export function recordBridgeHeartbeat(timestamp = new Date().toISOString()) {
  lastBridgeRunAt = timestamp
  if (outageAlertSent) {
    console.log('✅ [BRIDGE RECOVERED] Cầu nối Gmail đã hoạt động trở lại bình thường.')
    outageAlertSent = false
  }
}

/**
 * Lấy thời gian gần nhất cầu nối gửi dữ liệu
 */
export function getLastBridgeRunAt() {
  return lastBridgeRunAt
}

/**
 * Đánh giá trạng thái sức khỏe cầu nối
 * @param {number} [now=Date.now()]
 * @returns {{ status: 'GREEN' | 'YELLOW' | 'RED', minutesAgo: number | null, healthy: boolean, lastRunAt: string | null }}
 */
export function getBridgeHealth(now = Date.now()) {
  if (!lastBridgeRunAt) {
    return {
      status: 'RED',
      minutesAgo: null,
      healthy: false,
      lastRunAt: null,
    }
  }

  const lastMs = new Date(lastBridgeRunAt).getTime()
  const minutesAgo = Math.max(0, Math.round((now - lastMs) / 60000))

  if (minutesAgo < 3) {
    return {
      status: 'GREEN',
      minutesAgo,
      healthy: true,
      lastRunAt: lastBridgeRunAt,
    }
  }

  if (minutesAgo <= 5) {
    return {
      status: 'YELLOW',
      minutesAgo,
      healthy: true,
      lastRunAt: lastBridgeRunAt,
    }
  }

  return {
    status: 'RED',
    minutesAgo,
    healthy: false,
    lastRunAt: lastBridgeRunAt,
  }
}

/**
 * Kiểm tra sức khỏe cầu nối và gửi email cảnh báo chủ shop khi có đơn chờ mà cầu nối im > 5 phút (WP9)
 */
export async function checkBridgeHealthAndAlert(now = Date.now()) {
  const health = getBridgeHealth(now)
  if (health.healthy || outageAlertSent) {
    return { alertSent: false, health }
  }

  // Kiểm tra xem có đơn hàng nào đang trong trạng thái chờ thanh toán hoặc đối soát không
  const orders = orderPersistence.getAll()
  const hasPendingOrders = orders.some((order) => {
    const phase = getPaymentPhase(order, now)
    return phase === 'AWAITING' || phase === 'RECONCILING'
  })

  if (!hasPendingOrders) {
    return { alertSent: false, health }
  }

  outageAlertSent = true
  const minutesText = health.minutesAgo !== null ? `${health.minutesAgo} phút` : 'lâu hơn 5 phút'
  console.warn(`🚨 [BRIDGE ALERT] Cầu nối Gmail im lặng ${minutesText} trong khi có đơn hàng đang chờ thanh toán!`)

  try {
    await sendOwnerEmail({
      orderId: 'BRIDGE-ALERT',
      notes: `[CẢNH BÁO CẦU NỐI GMAIL] Cầu nối Google Apps Script đã ngừng gửi dữ liệu trong ${minutesText}. Hiện có đơn hàng đang chờ thanh toán nhưng hệ thống không nhận được email ngân hàng. Vui lòng kiểm tra lại trigger Apps Script trên Google Drive hoặc thực hiện đối soát thủ công!`,
    })
  } catch (err) {
    console.error('Lỗi gửi email cảnh báo bridge:', err.message)
  }

  return { alertSent: true, health }
}
