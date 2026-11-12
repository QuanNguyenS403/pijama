// server/lib/paymentState.js
/**
 * Module quản lý trạng thái thanh toán và máy trạng thái (Payment State Machine)
 * Single Source of Truth cho các đơn hàng thanh toán chuyển khoản VietQR.
 * Bất biến: Chỉ có máy chủ mới có quyền quyết định trạng thái thanh toán.
 */

import { orderPersistence } from './orderPersistence.js'
import { updateOrderStatusInSheet } from './googleSheets.js'
import { logSecurityAudit } from './auditLogger.js'
import { sendOwnerEmail } from './emailOwner.js'
import { sendCustomerEmail } from './emailCustomer.js'

// ==============================================================================
// 1. CẤU HÌNH & HẰNG SỐ THANH TOÁN (DUY NHẤT - I11)
// ==============================================================================
export const PAYMENT_QR_TTL_SECONDS = 600 // Legacy export compatibility
export const PAYMENT_DETECTION_GRACE_SECONDS = 600
export const PAYMENT_CLAIM_GRACE_SECONDS = 120
export const PAYMENT_CLOCK_TOLERANCE_SECONDS = 60
export const PAYMENT_CLAIM_REVIEW_HOURS = 24

// Các pha thanh toán chuẩn hoá (Không còn hết hạn QR / tự đối soát ngân hàng)
export const PAYMENT_PHASES = {
  AWAITING: 'AWAITING',
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
}

/**
 * Xác định pha hiện tại của đơn hàng (Pure function)
 * @param {Object} order - Đơn hàng canonical
 * @returns {'AWAITING' | 'WAITING_CONFIRMATION' | 'PAID' | 'CANCELLED'}
 */
export function getPaymentPhase(order) {
  if (!order) return PAYMENT_PHASES.AWAITING

  const paymentStatus = order.payment?.status || order.paymentStatus
  const orderStatus = order.status

  // 1. Nếu đã xác thực thanh toán -> PAID (I3: One-way ratchet)
  if (paymentStatus === 'PAID') {
    return PAYMENT_PHASES.PAID
  }

  // 2. Nếu đơn đã bị hủy thủ công
  if (orderStatus === 'CANCELLED') {
    return PAYMENT_PHASES.CANCELLED
  }

  // 3. Đối với đơn BANK_TRANSFER: phân biệt đang ở trang quét QR vs đã bấm "Thanh toán" chờ Admin duyệt
  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method === 'BANK_TRANSFER') {
    if (
      paymentStatus === 'PENDING_ADMIN_CONFIRMATION' ||
      paymentStatus === 'CUSTOMER_CLAIMED_PAID' ||
      Boolean(order.payment?.submittedAt)
    ) {
      return PAYMENT_PHASES.WAITING_CONFIRMATION
    }
    return PAYMENT_PHASES.AWAITING
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
    source = 'admin',
    txId = '',
    amount = 0,
    bankTime = '',
    actor = 'admin',
    operator = '',
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
      emailPromise: Promise.resolve({ customerEmailSent: false, ownerEmailSent: false, alreadyPaid: true }),
    }
  }

  const effectiveActor = actor || operator || 'admin'

  // Cập nhật trạng thái thanh toán chuẩn xác
  order.payment.status = 'PAID'
  order.payment.paidAt = nowIso
  order.payment.paidSource = source
  order.payment.txId = txId || `TX-${Date.now()}`
  order.payment.paidAmount = amount || order.total
  order.payment.bankTime = bankTime || nowIso
  order.payment.paidActor = effectiveActor
  order.payment.paidNote = note || ''
  order.payment.isQrInvalidated = true

  // Đồng bộ trạng thái đơn hàng sang CONFIRMED
  order.status = 'CONFIRMED'
  order.paymentStatus = 'PAID'
  order.updatedAt = nowIso

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
      actor: effectiveActor,
      note,
      paidAt: nowIso,
    },
  })

  // Chuẩn hóa bản ghi an toàn để template email không bao giờ thiếu trường
  const safeEmailOrder = {
    ...order,
    orderId,
    orderDateVN: order.orderDateVN || new Date(order.createdAt || now).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
    items: Array.isArray(order.items) ? order.items : [],
    customer: {
      ...(order.customer || {}),
      fullName: order.customer?.fullName || order.customerName || 'Quý khách',
      phone: order.customer?.phone || order.customerPhone || '',
      email: order.customer?.email || order.customerEmail || '',
    },
    shipping: {
      ...(order.shipping || {}),
      fullAddress: order.shipping?.fullAddress || order.shippingAddress || 'Chưa cung cấp',
    },
    payment: {
      ...(order.payment || {}),
      methodLabel: order.payment?.methodLabel || 'Chuyển khoản VietQR',
    },
  }

  // I10: Gửi ngay lập tức email xác nhận đến CẢ khách hàng và admin đúng MỘT lần duy nhất
  if (!order.emails) order.emails = {}
  let emailPromise = Promise.resolve({ customerEmailSent: false, ownerEmailSent: false })

  if (!order.emails.confirmationSentAt) {
    order.emails.confirmationSentAt = nowIso
    orderPersistence.set(orderId, order)

    const customerTask = safeEmailOrder.customer.email
      ? sendCustomerEmail(safeEmailOrder)
      : Promise.resolve({ skipped: true })

    const ownerTask = sendOwnerEmail({
      ...safeEmailOrder,
      notes: `[ADMIN ĐÃ DUYỆT THANH TOÁN QR] Nguồn: ${source} | GD: ${order.payment.txId} | Số tiền: ${order.payment.paidAmount}đ${note ? ' | ' + note : ''}`,
    })

    const sheetTask = updateOrderStatusInSheet(
      orderId,
      'CONFIRMED',
      `[PAID_${String(source).toUpperCase()}] Số tiền: ${order.payment.paidAmount}đ | Mã GD: ${order.payment.txId}`
    )

    emailPromise = Promise.allSettled([customerTask, ownerTask, sheetTask]).then((results) => {
      const [custRes, ownerRes] = results
      if (custRes.status === 'rejected') {
        console.warn('⚠️ Lỗi gửi email xác nhận cho khách hàng:', custRes.reason?.message || custRes.reason)
      }
      if (ownerRes.status === 'rejected') {
        console.warn('⚠️ Lỗi gửi email xác nhận cho admin:', ownerRes.reason?.message || ownerRes.reason)
      }
      return {
        customerEmailSent: custRes.status === 'fulfilled' && !custRes.value?.skipped,
        ownerEmailSent: ownerRes.status === 'fulfilled',
      }
    })
  }

  return {
    success: true,
    alreadyPaid: false,
    order,
    emailPromise,
  }
}

/**
 * Cơ chế hết hạn QR tự động đã được loại bỏ theo quy trình duyệt thủ công.
 * Giữ lại chữ ký hàm trả về false để tương thích an toàn.
 */
export function expireOrderIfDue() {
  return false
}

export function sweepExpiredOrders() {
  return { expiredCount: 0 }
}
