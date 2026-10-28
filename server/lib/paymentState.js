// server/lib/paymentState.js
/**
 * Module quản lý trạng thái thanh toán và máy trạng thái (Payment State Machine)
 * Single Source of Truth cho các đơn hàng thanh toán chuyển khoản VietQR.
 * Bất biến: Chỉ có máy chủ mới có quyền quyết định trạng thái thanh toán.
 */

import { orderPersistence } from './orderPersistence.js'
import { releaseVoucher } from './voucherValidator.js'
import { updateOrderStatusInSheet } from './googleSheets.js'
import { logSecurityAudit } from './auditLogger.js'
import { sendOwnerEmail } from './emailOwner.js'
import { sendCustomerEmail } from './emailCustomer.js'
import { sendConfirmedEmail } from './emailStatusUpdates.js'

// ==============================================================================
// 1. CẤU HÌNH & HẰNG SỐ THANH TOÁN (DUY NHẤT - I11)
// ==============================================================================
export const PAYMENT_QR_TTL_SECONDS = 600 // 10 phút cố định (không ghi đè qua env)
export const PAYMENT_DETECTION_GRACE_SECONDS = 600 // 10 phút ân hạn chờ email biến động số dư
export const PAYMENT_CLAIM_GRACE_SECONDS = 120 // 120 giây ân hạn (legacy)
export const PAYMENT_CLOCK_TOLERANCE_SECONDS = 60 // 60 giây dung sai đồng hồ ngân hàng
export const PAYMENT_CLAIM_REVIEW_HOURS = 24 // 24 giờ đối soát đơn cũ

// Các pha thanh toán chuẩn hoá
export const PAYMENT_PHASES = {
  AWAITING: 'AWAITING',
  RECONCILING: 'RECONCILING',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
}

/**
 * Xác định pha hiện tại của đơn hàng (Pure function)
 * @param {Object} order - Đơn hàng canonical
 * @param {number} [now=Date.now()] - Timestamp tiêm vào để kiểm thử
 * @returns {'AWAITING' | 'RECONCILING' | 'PAID' | 'EXPIRED' | 'CANCELLED'}
 */
export function getPaymentPhase(order, now = Date.now()) {
  if (!order) return PAYMENT_PHASES.AWAITING

  const paymentStatus = order.payment?.status || order.paymentStatus
  const orderStatus = order.status

  // 1. Nếu đã xác thực thanh toán -> PAID (I3: One-way ratchet)
  if (paymentStatus === 'PAID') {
    return PAYMENT_PHASES.PAID
  }

  // 2. Nếu đã hết hạn hoặc bị hủy do quá hạn
  if (paymentStatus === 'EXPIRED_TIMEOUT') {
    return PAYMENT_PHASES.EXPIRED
  }

  if (orderStatus === 'CANCELLED') {
    if (order.cancelReason && order.cancelReason.includes('Hết hạn thanh toán')) {
      return PAYMENT_PHASES.EXPIRED
    }
    return PAYMENT_PHASES.CANCELLED
  }

  // 3. Đối với đơn BANK_TRANSFER: kiểm tra TTL và Grace Period
  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method === 'BANK_TRANSFER') {
    const createdAtMs = order.createdAt ? new Date(order.createdAt).getTime() : now
    const expiresAt = order.payment?.qrExpiresAt
      ? new Date(order.payment.qrExpiresAt).getTime()
      : createdAtMs + PAYMENT_QR_TTL_SECONDS * 1000

    const graceExpiresAt = expiresAt + PAYMENT_DETECTION_GRACE_SECONDS * 1000

    // Trong hạn 10 phút đầu -> AWAITING
    if (now <= expiresAt) {
      return PAYMENT_PHASES.AWAITING
    }

    // Quá 10 phút nhưng còn trong khoảng ân hạn 10 phút đối soát -> RECONCILING
    if (now > expiresAt && now <= graceExpiresAt) {
      return PAYMENT_PHASES.RECONCILING
    }

    // Quá thời gian ân hạn -> EXPIRED
    return PAYMENT_PHASES.EXPIRED
  }

  // 4. Đối với COD hoặc phương thức khác
  if (orderStatus === 'DELIVERED') {
    return PAYMENT_PHASES.PAID
  }

  return PAYMENT_PHASES.AWAITING
}

/**
 * Kiểm tra điều kiện cho phép chuyển đơn sang các bước thực hiện tiếp theo (I4)
 * (CONFIRM / PROCESSING / SHIP / DELIVER)
 * @param {Object} order
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canAdvanceFulfilment(order) {
  if (!order) return { allowed: false, reason: 'Không tìm thấy thông tin đơn hàng' }

  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method === 'BANK_TRANSFER') {
    const isPaid = order.payment?.status === 'PAID'
    if (!isPaid) {
      return {
        allowed: false,
        reason: 'Đơn chuyển khoản chưa được xác nhận tiền về (PAID)',
      }
    }
  }

  return { allowed: true }
}

/**
 * Ghi nhận thanh toán thành công (I2, I3, I7, I10) - NGUỒN DUY NHẤT GÁN 'PAID' CHO BANK_TRANSFER
 * @param {Object} order - Đơn hàng cần cập nhật
 * @param {Object} params
 * @param {'bank-email' | 'webhook' | 'admin' | 'gateway' | 'MANUAL_ADMIN'} params.source
 * @param {string} [params.txId]
 * @param {number} [params.amount]
 * @param {string} [params.bankTime]
 * @param {string} [params.actor]
 * @param {string} [params.note]
 * @param {number} [now=Date.now()]
 * @returns {Object} Đơn hàng sau khi cập nhật
 */
export function markOrderPaid(
  order,
  {
    source = 'bank-email',
    txId = '',
    amount = 0,
    bankTime = '',
    actor = 'system',
    note = '',
  } = {},
  now = Date.now()
) {
  if (!order) return null
  const orderId = order.orderId || order.id

  const alreadyPaid = order.payment?.status === 'PAID'
  const nowIso = new Date(now).toISOString()

  if (!order.payment) order.payment = {}

  // I3: Nếu đã PAID rồi thì giữ nguyên tính toàn vẹn (Idempotent)
  if (alreadyPaid) {
    return {
      success: true,
      alreadyPaid: true,
      order,
    }
  }

  // Cập nhật trạng thái thanh toán chuẩn xác
  order.payment.status = 'PAID'
  order.payment.paidAt = nowIso
  order.payment.paidSource = source
  order.payment.txId = txId || `TX-${Date.now()}`
  order.payment.paidAmount = amount || order.total
  order.payment.bankTime = bankTime || nowIso
  order.payment.paidActor = actor
  order.payment.paidNote = note || ''
  order.payment.isQrInvalidated = true

  // Đồng bộ trạng thái đơn hàng sang CONFIRMED
  order.status = 'CONFIRMED'
  order.paymentStatus = 'PAID'
  order.updatedAt = nowIso

  // Lưu trữ đơn hàng an toàn (Persistence)
  orderPersistence.set(orderId, order)

  // Ghi nhật ký bảo mật (I7)
  logSecurityAudit({
    action: 'PAYMENT_STATE_PAID',
    status: 'SUCCESS',
    details: {
      orderId,
      source,
      txId: order.payment.txId,
      amount: order.payment.paidAmount,
      bankTime: order.payment.bankTime,
      actor,
      note,
      paidAt: nowIso,
    },
  })

  // I10: Gửi email xác nhận đúng MỘT lần duy nhất
  if (!order.emails) order.emails = {}
  if (!order.emails.confirmationSentAt) {
    order.emails.confirmationSentAt = nowIso
    orderPersistence.set(orderId, order)

    Promise.allSettled([
      sendConfirmedEmail(order),
      sendCustomerEmail(order),
      sendOwnerEmail({
        ...order,
        notes: `[TIỀN VỀ VIETQR] Nguồn: ${source} | GD: ${order.payment.txId} | Số tiền: ${order.payment.paidAmount}đ ${note ? '| ' + note : ''}`,
      }),
      updateOrderStatusInSheet(
        orderId,
        'CONFIRMED',
        `[PAID_${source.toUpperCase()}] Số tiền: ${order.payment.paidAmount}đ | Mã GD: ${order.payment.txId}`
      ),
    ]).catch((err) => {
      console.warn('⚠️ Lỗi gửi email hoặc cập nhật Sheet khi markOrderPaid:', err.message)
    })
  }

  return {
    success: true,
    alreadyPaid: false,
    order,
  }
}

/**
 * Tự động hủy đơn hàng quá hạn thanh toán VietQR (I5, I8, I9)
 * Chỉ hủy khi đã vượt qua cả thời gian hiệu lực QR lẫn thời gian ân hạn đối soát (Grace Period)
 * Idempotent, không có await ở giữa lúc đọc và ghi để tránh race condition
 * @param {string} orderId
 * @param {number} [now=Date.now()]
 * @returns {boolean} True nếu đơn vừa được xử lý hết hạn thành công
 */
export function expireOrderIfDue(orderId, now = Date.now()) {
  if (!orderId) return false
  const order = orderPersistence.get(orderId)
  if (!order) return false

  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method !== 'BANK_TRANSFER') return false

  // I3: Tuyệt đối không hủy đơn đã PAID
  if (order.payment?.status === 'PAID') return false

  // Đã hủy trước đó
  if (order.status === 'CANCELLED' || order.payment?.status === 'EXPIRED_TIMEOUT') return false

  const createdAtMs = order.createdAt ? new Date(order.createdAt).getTime() : now
  const expiresAt = order.payment?.qrExpiresAt
    ? new Date(order.payment.qrExpiresAt).getTime()
    : createdAtMs + PAYMENT_QR_TTL_SECONDS * 1000

  const graceExpiresAt = expiresAt + PAYMENT_DETECTION_GRACE_SECONDS * 1000

  // Chưa hết thời gian ân hạn đối soát -> chưa được hủy đơn
  if (now <= graceExpiresAt) {
    return false
  }

  // Quá thời gian ân hạn -> HỦY ĐƠN VÀ ĐÁNH DẤU HẾT HẠN
  const nowIso = new Date(now).toISOString()
  order.status = 'CANCELLED'
  order.cancelReason = `Hết hạn thanh toán VietQR (${Math.round(PAYMENT_QR_TTL_SECONDS / 60)} phút + ${Math.round(PAYMENT_DETECTION_GRACE_SECONDS / 60)} phút ân hạn đối soát)`
  if (!order.payment) order.payment = {}
  order.payment.status = 'EXPIRED_TIMEOUT'
  order.payment.isQrInvalidated = true
  order.paymentStatus = 'EXPIRED_TIMEOUT'
  order.updatedAt = nowIso

  orderPersistence.set(orderId, order)

  // Nhả voucher nếu có (I8)
  if (order.voucherCode) {
    try {
      releaseVoucher(order.voucherCode, orderId)
    } catch (err) {
      console.warn('⚠️ [EXPIRE VOUCHER ERROR]', err.message)
    }
  }

  // Cập nhật Google Sheets
  try {
    updateOrderStatusInSheet(
      orderId,
      'CANCELLED',
      `Hết hạn thanh toán VietQR quá ${Math.round((PAYMENT_QR_TTL_SECONDS + PAYMENT_DETECTION_GRACE_SECONDS) / 60)} phút`
    ).catch(() => {})
  } catch {}

  // Ghi nhật ký bảo mật (I7)
  logSecurityAudit({
    action: 'PAYMENT_STATE_EXPIRED',
    status: 'SUCCESS',
    details: {
      orderId,
      reason: 'EXPIRED_TIMEOUT',
      expiredAt: nowIso,
    },
  })

  return true
}

/**
 * Quét toàn bộ hệ thống đơn hàng để hủy các đơn quá hạn (WP5)
 * @param {number} [now=Date.now()]
 * @returns {{ expiredCount: number }}
 */
export function sweepExpiredOrders(now = Date.now()) {
  const allOrders = orderPersistence.getAll()
  let expiredCount = 0

  for (const order of allOrders) {
    const orderId = order.orderId || order.id
    if (!orderId) continue

    const method = order.payment?.method || order.paymentMethod || 'COD'
    if (method !== 'BANK_TRANSFER') continue

    // Chỉ quét các đơn chưa hoàn tất thanh toán
    if (order.status === 'AWAITING_PAYMENT' || order.payment?.status === 'AWAITING_PAYMENT') {
      const didExpire = expireOrderIfDue(orderId, now)
      if (didExpire) {
        expiredCount++
      }
    }
  }

  return { expiredCount }
}
