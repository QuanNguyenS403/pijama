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
import { releaseVoucher } from './voucherValidator.js'

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
 * Kiểm tra đơn VietQR bị bỏ dở (chưa tải ảnh chứng từ, chưa bấm "Thanh toán", chưa thanh toán).
 * RÀNG BUỘC BẮT BUỘC (G6): Đơn đã có proofImageUrl hoặc submittedAt (PENDING_ADMIN_CONFIRMATION)
 * TUYỆT ĐỐI KHÔNG bao giờ bị coi là đơn bỏ dở — luôn chờ Admin duyệt thủ công.
 */
export function isAbandonedUnpaidQrOrder(order) {
  if (!order || typeof order !== 'object') return false
  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method !== 'BANK_TRANSFER') return false
  if (order.status !== 'AWAITING_PAYMENT') return false

  const paymentStatus = order.payment?.status || order.paymentStatus || 'AWAITING_PAYMENT'
  if (
    paymentStatus === 'PAID' ||
    paymentStatus === 'PENDING_ADMIN_CONFIRMATION' ||
    paymentStatus === 'CUSTOMER_CLAIMED_PAID'
  ) {
    return false
  }

  const hasProof = Boolean(order.payment?.proofImageUrl || order.paymentProof?.imageUrl)
  const hasSubmitted = Boolean(order.payment?.submittedAt || order.payment?.claimedAt)
  if (hasProof || hasSubmitted) return false

  return true
}

function getOrderTimestampMs(order) {
  if (Number.isFinite(order?.payment?.qrGeneratedAt) && order.payment.qrGeneratedAt > 0) {
    return order.payment.qrGeneratedAt
  }
  const parsed = Date.parse(order?.createdAt || order?.orderDate || '')
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Thống kê lượng đơn VietQR chưa thanh toán đang giữ tồn kho để cảnh báo cho Admin (G6).
 */
export function getAbandonedQrBacklogMetrics(nowMs = Date.now()) {
  let unpaidWithoutProofTotal = 0
  let unpaidWithoutProofOver1h = 0
  let unpaidWithoutProofOver24h = 0
  let waitingAdminConfirmationCount = 0

  for (const order of orderPersistence.values()) {
    if (!order || order.status === 'CANCELLED') continue
    const method = order.payment?.method || order.paymentMethod || 'COD'
    if (method !== 'BANK_TRANSFER') continue

    const phase = getPaymentPhase(order)
    if (phase === PAYMENT_PHASES.WAITING_CONFIRMATION) {
      waitingAdminConfirmationCount += 1
      continue
    }

    if (isAbandonedUnpaidQrOrder(order)) {
      unpaidWithoutProofTotal += 1
      const createdMs = getOrderTimestampMs(order)
      if (createdMs > 0) {
        const ageMs = nowMs - createdMs
        if (ageMs >= 60 * 60 * 1000) unpaidWithoutProofOver1h += 1
        if (ageMs >= 24 * 60 * 60 * 1000) unpaidWithoutProofOver24h += 1
      }
    }
  }

  const rawHours = Number.parseFloat(String(process.env.UNPAID_QR_AUTOCANCEL_HOURS || '0'))
  const autoCancelHours = Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 0

  return {
    unpaidWithoutProofTotal,
    unpaidWithoutProofOver1h,
    unpaidWithoutProofOver24h,
    waitingAdminConfirmationCount,
    autoCancelHours,
    warning:
      unpaidWithoutProofOver1h >= 3 && autoCancelHours === 0
        ? `Đang có ${unpaidWithoutProofOver1h} đơn VietQR bỏ dở (>1 giờ, chưa tải ảnh CK) đang giữ tồn kho SKU. Hãy hủy đơn rác hoặc đặt UNPAID_QR_AUTOCANCEL_HOURS=24.`
        : null,
  }
}

/**
 * Cơ chế hết hạn QR tự động mặc định tắt (UNPAID_QR_AUTOCANCEL_HOURS=0) để giữ nguyên hành vi thủ công.
 * Khi Quan bật UNPAID_QR_AUTOCANCEL_HOURS > 0 (ví dụ 24 giờ), hệ thống chỉ tự hủy các đơn
 * AWAITING_PAYMENT CHƯA tải ảnh chứng từ và CHƯA bấm đã thanh toán để nhả tồn kho & voucher (G6).
 */
export function expireOrderIfDue(order, options = {}) {
  const rawHours =
    options.maxAgeHours !== undefined
      ? Number(options.maxAgeHours)
      : Number.parseFloat(String(process.env.UNPAID_QR_AUTOCANCEL_HOURS || '0'))
  if (!Number.isFinite(rawHours) || rawHours <= 0) return false
  if (!isAbandonedUnpaidQrOrder(order)) return false

  const createdMs = getOrderTimestampMs(order)
  if (!createdMs) return false
  const nowMs = options.nowMs || Date.now()
  if (nowMs - createdMs < rawHours * 60 * 60 * 1000) return false

  const orderId = order.orderId || order.id
  const nowIso = new Date(nowMs).toISOString()
  order.status = 'CANCELLED'
  order.cancelReason = `Tự động hủy đơn VietQR bỏ dở quá ${rawHours} giờ (chưa tải ảnh chứng từ)`
  order.cancelledAt = nowIso
  order.updatedAt = nowIso
  if (!order.payment) order.payment = {}
  order.payment.status = 'EXPIRED_TIMEOUT'
  order.paymentStatus = 'EXPIRED_TIMEOUT'

  if (order.voucherCode && orderId) {
    try {
      releaseVoucher(order.voucherCode, orderId)
    } catch (_) {}
  }

  if (orderId) {
    orderPersistence.set(orderId, order)
    logSecurityAudit({
      action: 'ABANDONED_QR_ORDER_AUTOCANCELLED',
      status: 'SUCCESS',
      details: { orderId, maxAgeHours: rawHours },
    })
    updateOrderStatusInSheet(orderId, 'CANCELLED', order.cancelReason).catch(() => {})
  }
  return true
}

export function sweepExpiredOrders(options = {}) {
  const rawHours =
    options.maxAgeHours !== undefined
      ? Number(options.maxAgeHours)
      : Number.parseFloat(String(process.env.UNPAID_QR_AUTOCANCEL_HOURS || '0'))
  const nowMs = options.nowMs || Date.now()

  if (!Number.isFinite(rawHours) || rawHours <= 0) {
    const backlog = getAbandonedQrBacklogMetrics(nowMs)
    if (backlog.unpaidWithoutProofOver24h > 0) {
      console.warn(
        `⚠️ [QR STOCK BACKLOG] Có ${backlog.unpaidWithoutProofOver24h} đơn VietQR bỏ dở > 24h chưa có ảnh chứng từ đang giữ tồn kho. Đặt UNPAID_QR_AUTOCANCEL_HOURS=24 để tự động nhả kho.`
      )
    }
    return { expiredCount: 0, autoCancelEnabled: false, backlog }
  }

  let expiredCount = 0
  const cancelledOrderIds = []
  for (const order of orderPersistence.values()) {
    if (expireOrderIfDue(order, { maxAgeHours: rawHours, nowMs })) {
      expiredCount += 1
      cancelledOrderIds.push(order.orderId || order.id)
    }
  }

  if (expiredCount > 0) {
    console.log(`🧹 [QR AUTO-SWEEP] Đã tự động hủy ${expiredCount} đơn VietQR bỏ dở quá ${rawHours}h và nhả tồn kho/voucher.`)
  }

  return {
    expiredCount,
    cancelledOrderIds,
    autoCancelEnabled: true,
    maxAgeHours: rawHours,
  }
}
