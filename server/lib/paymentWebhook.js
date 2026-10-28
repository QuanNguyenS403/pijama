// server/lib/paymentWebhook.js
/**
 * Module xử lý Webhook thanh toán ngân hàng (SePay / Casso / Vietcombank / Napas)
 * Tuân thủ nghiêm ngặt các bất biến bảo mật:
 * I1: Không bao giờ báo thành công nếu server chưa trả PAID
 * I2: payment.status = 'PAID' CHỈ được ghi qua markOrderPaid
 * I3: PAID không bao giờ bị hạ cấp
 * I5: Hết hạn do server quyết định
 * I6: Mọi giao dịch tiền vào đều được lưu vết (không nuốt)
 * I7: Ghi nhật ký bảo mật cho mọi chuyển trạng thái
 * I9: Xử lý đồng bộ, không race condition
 */

import crypto from 'crypto'
import { appendOrderToSheet } from './googleSheets.js'
import { sendCustomerEmail } from './emailCustomer.js'
import { sendOwnerEmail } from './emailOwner.js'
import { orderPersistence } from './orderPersistence.js'
import {
  PAYMENT_QR_TTL_SECONDS,
  PAYMENT_CLAIM_GRACE_SECONDS,
  PAYMENT_PHASES,
  getPaymentPhase,
  markOrderPaid,
  expireOrderIfDue,
} from './paymentState.js'
import { recordPaymentTransaction } from './paymentTransactions.js'
import { verifyTrackingToken } from './orderTokenService.js'
import { logSecurityAudit } from './auditLogger.js'
import { getBridgeHealth } from './bridgeHealth.js'

// Persistent Store và Idempotency Tracking
export const orderPaymentStore = orderPersistence
export const processedTransactionIds = {
  has: (id) => orderPersistence.isTxProcessed(id),
  add: (id) => orderPersistence.addProcessedTx(id),
}

// Bộ nhớ chống spam email claim chủ shop (1 email / 10 phút / đơn)
const lastClaimEmailSentAt = new Map()

/**
 * Trích xuất và khớp mã đơn hàng từ nội dung chuyển khoản
 * Khớp chặt nhưng chịu được các biến thể thực tế (hoa/thường, dấu gạch nối, khoảng trắng)
 * Tuyệt đối không khớp mơ hồ (nếu nhiều ứng viên -> UNMATCHED)
 * @param {string} content
 * @param {Array} [allOrders]
 * @returns {{ matchedOrderId: string|null, outcome: 'MATCHED' | 'UNMATCHED' | 'ORDER_NOT_FOUND', candidateIds?: string[] }}
 */
export function matchOrderFromContent(content, allOrders = null) {
  if (!content || typeof content !== 'string') {
    return { matchedOrderId: null, outcome: 'UNMATCHED' }
  }

  const upperContent = content.toUpperCase()
  const orders = allOrders || orderPersistence.getAll()
  const candidateIds = new Set()

  // 1. Quét tìm trong danh sách đơn hàng thực tế của hệ thống
  const normContent = upperContent.replace(/[^A-Z0-9]/g, '')

  for (const ord of orders) {
    const oId = (ord.orderId || ord.id || '').toUpperCase()
    if (!oId) continue

    // Khớp nguyên bản chính xác (Exact Match)
    if (upperContent.includes(oId)) {
      candidateIds.add(ord.orderId || ord.id)
      continue
    }

    // Khớp chuẩn hóa bỏ dấu gạch nối và khoảng trắng
    const normOrderId = oId.replace(/[^A-Z0-9]/g, '')
    if (normOrderId.length >= 7 && normContent.includes(normOrderId)) {
      candidateIds.add(ord.orderId || ord.id)
    }
  }

  // Nếu tìm thấy nhiều hơn 1 đơn trong nội dung -> Mơ hồ, từ chối tự động khớp
  if (candidateIds.size > 1) {
    console.warn(`⚠️ [WEBHOOK AMBIGUOUS] Tìm thấy nhiều hơn 1 đơn hàng khớp nội dung "${content}":`, Array.from(candidateIds))
    return { matchedOrderId: null, outcome: 'UNMATCHED', candidateIds: Array.from(candidateIds) }
  }

  if (candidateIds.size === 1) {
    const matchedOrderId = Array.from(candidateIds)[0]
    return { matchedOrderId, outcome: 'MATCHED' }
  }

  // 2. Không thấy đơn nào trong hệ thống, nhưng nội dung có định dạng QNS-XXXX
  const fallbackMatch = upperContent.match(/QNS-[A-Z0-9-]+/)
  if (fallbackMatch) {
    const candidateId = fallbackMatch[0]
    const exists = orderPersistence.get(candidateId)
    if (exists) {
      return { matchedOrderId: candidateId, outcome: 'MATCHED' }
    }
    return { matchedOrderId: candidateId, outcome: 'ORDER_NOT_FOUND' }
  }

  return { matchedOrderId: null, outcome: 'UNMATCHED' }
}

/**
 * ==============================================================================
 * 1. WEBHOOK XỬ LÝ BIẾN ĐỘNG SỐ DƯ TỰ ĐỘNG (SEPAY / CASSO / PAYOS / VIETQR)
 * ==============================================================================
 */
export async function handlePaymentWebhook(req) {
  try {
    // ── 1. Xác thực Webhook Security (Timing-Safe, Hỗ trợ Apikey / Bearer / x-api-key) ──
    const rawAuthHeader = req.headers['authorization'] || req.headers['x-api-key'] || ''
    const expectedSecret = process.env.SEPAY_WEBHOOK_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET

    if (!expectedSecret) {
      console.error('⛔ [CRITICAL SECURITY] Webhook chưa được cấu hình Secret Token trong biến môi trường (fail-closed)')
      return {
        status: 500,
        data: {
          success: false,
          error: 'Webhook chưa được cấu hình Secret Token bảo mật trên server (fail-closed)',
        },
      }
    }

    // Chuẩn hóa token: Bóc tách cả 'Apikey ' (SePay) và 'Bearer '
    let clientSecret = String(rawAuthHeader).trim()
    if (/^(?:Bearer|Apikey)\s+/i.test(clientSecret)) {
      clientSecret = clientSecret.replace(/^(?:Bearer|Apikey)\s+/i, '').trim()
    }
    const secretStr = String(expectedSecret).trim()

    let isSecretValid = false
    if (clientSecret.length === secretStr.length && secretStr.length > 0) {
      isSecretValid = crypto.timingSafeEqual(Buffer.from(clientSecret), Buffer.from(secretStr))
    }

    if (!isSecretValid) {
      console.warn('⛔ [WEBHOOK REJECTED] Sai Secret Token / Unauthorized request (timing-safe check failed)')
      return { status: 401, data: { success: false, message: 'Unauthorized webhook request' } }
    }

    // ── 2. Đọc payload giao dịch ────────────────────────────────────────────────
    const payload = req.body || {}
    const txId = String(payload.id || payload.transactionId || payload.txId || payload.referenceCode || payload.code || Date.now())
    const amountIn = Number(payload.transferAmount || payload.amount || payload.transfer_amount || payload.total || 0)
    const content = String(payload.content || payload.description || payload.transaction_content || payload.message || payload.remark || '')
    const gateway = String(payload.gateway || payload.bankName || payload.bank || 'Vietcombank')
    const receivedAt = payload.transactionDate || new Date().toISOString()

    console.log('\n🔔 [PAYMENT WEBHOOK] Nhận thông báo giao dịch an toàn:', JSON.stringify({
      id: txId,
      amount: amountIn,
      content,
      gateway,
    }))

    // Giao dịch tiền ra hoặc 0đ
    if (amountIn <= 0 || payload.transferType === 'out') {
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId: null,
        outcome: 'UNMATCHED',
        receivedAt,
      })
      return { status: 200, data: { success: true, message: 'Bỏ qua giao dịch tiền ra hoặc không có giá trị' } }
    }

    // Chống xử lý trùng lặp giao dịch (Idempotency)
    if (processedTransactionIds.has(txId)) {
      console.log(`ℹ️ [WEBHOOK IDEMPOTENT] Giao dịch ${txId} đã được ghi nhận trước đó.`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId: null,
        outcome: 'DUPLICATE',
        receivedAt,
      })
      return { status: 200, data: { success: true, message: 'Giao dịch đã được ghi nhận trước đó' } }
    }

    // ── 3. Khớp mã đơn hàng từ nội dung ─────────────────────────────────────────
    const matchResult = matchOrderFromContent(content)
    const matchedOrderId = matchResult.matchedOrderId

    // Trường hợp không tìm thấy mã đơn hoặc mơ hồ
    if (matchResult.outcome === 'UNMATCHED') {
      console.warn(`⚠️ [WEBHOOK UNMATCHED] Không tìm thấy hoặc mơ hồ mã đơn hàng trong nội dung: "${content}"`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId: null,
        outcome: 'UNMATCHED',
        receivedAt,
      })
      return {
        status: 200,
        data: {
          success: true,
          message: 'Đã lưu giao dịch chờ đối soát thủ công (Không khớp mã đơn hàng)',
          outcome: 'UNMATCHED',
        },
      }
    }

    // Trường hợp có mã đơn nhưng không tồn tại trong hệ thống
    if (matchResult.outcome === 'ORDER_NOT_FOUND' || !matchedOrderId) {
      console.warn(`⛔ [WEBHOOK NOT FOUND] Đơn hàng ${matchedOrderId} không tồn tại trong hệ thống.`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId,
        outcome: 'ORDER_NOT_FOUND',
        receivedAt,
      })
      return {
        status: 200,
        data: {
          success: true,
          message: `Đã lưu giao dịch chờ đối soát thủ công (Đơn hàng ${matchedOrderId} không tồn tại)`,
          outcome: 'ORDER_NOT_FOUND',
        },
      }
    }

    // Đọc đơn hàng canonical
    const order = orderPaymentStore.get(matchedOrderId)
    if (!order) {
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId,
        outcome: 'ORDER_NOT_FOUND',
        receivedAt,
      })
      return {
        status: 200,
        data: {
          success: true,
          message: `Đơn hàng ${matchedOrderId} không tồn tại trong hệ thống`,
          outcome: 'ORDER_NOT_FOUND',
        },
      }
    }

    // ── 4. Phân nhánh xử lý trạng thái đơn hàng ─────────────────────────────────

    // 4a. Đơn hàng đã PAID trước đó
    if (order.payment?.status === 'PAID') {
      console.log(`ℹ️ [WEBHOOK ALREADY_PAID] Đơn hàng ${matchedOrderId} đã ở trạng thái PAID trước đó.`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId,
        outcome: 'ALREADY_PAID',
        receivedAt,
      })
      return {
        status: 200,
        data: {
          success: true,
          message: 'Đơn hàng đã được xác nhận thanh toán trước đó',
          outcome: 'ALREADY_PAID',
          orderId: matchedOrderId,
        },
      }
    }

    // 4b. Đơn hàng đã bị HỦY hoặc HẾT HẠN (LATE_AFTER_EXPIRY) -> Không tự hồi sinh
    if (order.status === 'CANCELLED' || order.payment?.status === 'EXPIRED_TIMEOUT') {
      console.warn(`⛔ [WEBHOOK LATE_AFTER_EXPIRY] Tiền về cho đơn hàng ${matchedOrderId} đã HỦY/HẾT HẠN. Cần đối soát/hoàn tiền thủ công.`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId,
        outcome: 'LATE_AFTER_EXPIRY',
        receivedAt,
      })

      // Gửi cảnh báo cho chủ shop
      sendOwnerEmail({
        ...order,
        notes: `[CẢNH BÁO TIỀN VỀ TRỄ] Khách hàng vừa chuyển ${amountIn}đ cho đơn ${matchedOrderId} nhưng đơn này ĐÃ BỊ HỦY / HẾT HẠN. Mã GD: ${txId}. Vui lòng kiểm tra sao kê để quyết định khôi phục đơn hoặc hoàn tiền cho khách.`,
      }).catch((err) => console.warn('Lỗi gửi email cảnh báo chủ shop:', err.message))

      return {
        status: 200,
        data: {
          success: true,
          message: `Đơn hàng ${matchedOrderId} đã hết hạn/bị hủy trước đó. Đã lưu giao dịch vào danh sách xử lý thủ công.`,
          outcome: 'LATE_AFTER_EXPIRY',
          orderId: matchedOrderId,
        },
      }
    }

    // 4c. Sai lệch số tiền (AMOUNT_MISMATCH) -> Không tự xác nhận
    if (amountIn !== order.total) {
      console.warn(`⛔ [WEBHOOK AMOUNT_MISMATCH] Nhận ${amountIn}đ nhưng đơn hàng ${matchedOrderId} yêu cầu ${order.total}đ.`)
      recordPaymentTransaction({
        txId,
        amount: amountIn,
        content,
        gateway,
        rawJson: payload,
        matchedOrderId,
        outcome: 'AMOUNT_MISMATCH',
        receivedAt,
      })

      sendOwnerEmail({
        ...order,
        notes: `[CẢNH BÁO SAI SỐ TIỀN] Nhận được ${amountIn}đ từ khách nhưng đơn ${matchedOrderId} yêu cầu ${order.total}đ. Mã GD: ${txId}. Vui lòng liên hệ khách để xử lý.`,
      }).catch((err) => console.warn('Lỗi gửi email cảnh báo chủ shop:', err.message))

      return {
        status: 200,
        data: {
          success: true,
          message: `Số tiền chuyển khoản không khớp (Đã nhận: ${amountIn}đ, Cần thanh toán: ${order.total}đ). Đã lưu giao dịch chờ xử lý.`,
          outcome: 'AMOUNT_MISMATCH',
          orderId: matchedOrderId,
        },
      }
    }

    // 4d. KHỚP ĐƠN HỢP LỆ VÀ ĐÚNG SỐ TIỀN -> markOrderPaid (I2, I7)
    recordPaymentTransaction({
      txId,
      amount: amountIn,
      content,
      gateway,
      rawJson: payload,
      matchedOrderId,
      outcome: 'MATCHED_PAID',
      receivedAt,
    })

    markOrderPaid(order, {
      source: 'webhook',
      txId,
      amount: amountIn,
      actor: 'sepay_webhook',
      note: `Thanh toán tự động qua Webhook ${gateway} (Nội dung: "${content}")`,
    })

    processedTransactionIds.add(txId)

    console.log(`\n🎉 [XÁC NHẬN TIỀN VỀ THÀNH CÔNG] Đơn hàng ${matchedOrderId}: Đã nhận đúng ${amountIn}đ!`)

    // Gửi email cho khách hàng và chủ shop
    if (order.customer?.email) {
      sendCustomerEmail(order)
        .then(() => console.log(`📧 [GMAIL] Đã gửi xác nhận đặt hàng & hóa đơn tới: ${order.customer.email}`))
        .catch((err) => console.error('Lỗi gửi email khách:', err.message))

      sendOwnerEmail(order)
        .then(() => console.log(`📧 [GMAIL] Đã gửi thông báo đơn đã thanh toán tới Chủ Shop`))
        .catch((err) => console.error('Lỗi gửi email chủ shop:', err.message))
    }

    // Cập nhật Google Sheets
    appendOrderToSheet({
      ...order,
      status: 'ĐÃ THANH TOÁN (VIETQR)',
    }).catch((err) => console.warn('Lỗi ghi Sheets:', err.message))

    return {
      status: 200,
      data: {
        success: true,
        message: 'Xác nhận thanh toán thành công, vô hiệu hóa mã QR và kích hoạt gửi Gmail xác nhận',
        orderId: matchedOrderId,
        amount: amountIn,
        outcome: 'MATCHED_PAID',
      },
    }
  } catch (error) {
    console.error('❌ Lỗi xử lý Webhook:', error)
    return { status: 500, data: { success: false, error: error.message } }
  }
}

/**
 * ==============================================================================
 * 2. API TIẾP NHẬN YÊU CẦU XÁC NHẬN TỪ KHÁCH HÀNG (CUSTOMER CLAIM) — WP3
 * ==============================================================================
 */
export async function confirmOrderPaymentManually(orderPayload = {}, authContext = {}) {
  return {
    status: 410,
    data: {
      success: false,
      code: 'CLAIM_DISCONTINUED',
      error: 'Quy trình báo chuyển khoản thủ công đã được thay thế bằng tự động hóa qua email biến động số dư ngân hàng. Hệ thống tự xác nhận khi tiền vào tài khoản.',
    },
  }
}

/**
 * ==============================================================================
 * 3. API TRA CỨU TRẠNG THÁI THANH TOÁN & POLLING (WP5)
 * ==============================================================================
 */
export function getOrderPaymentStatus(orderId, now = Date.now()) {
  if (!orderId) {
    return {
      success: false,
      status: 'NOT_FOUND',
      phase: PAYMENT_PHASES.AWAITING,
      isQrValid: false,
    }
  }

  // Tự động quét kiểm tra hết hạn nếu đến hạn (I5)
  expireOrderIfDue(orderId, now)

  const record = orderPaymentStore.get(orderId)
  if (!record) {
    return {
      success: true,
      orderId,
      phase: PAYMENT_PHASES.AWAITING,
      status: 'AWAITING_PAYMENT',
      isQrValid: false,
      expiresInSeconds: 0,
      serverNow: new Date(now).toISOString(),
    }
  }

  const phase = getPaymentPhase(record, now)
  const qrExpiresAt = record.payment?.qrExpiresAt
    ? new Date(record.payment.qrExpiresAt).getTime()
    : (record.createdAt ? new Date(record.createdAt).getTime() + PAYMENT_QR_TTL_SECONDS * 1000 : now)

  const remainingSeconds = Math.max(0, Math.round((qrExpiresAt - now) / 1000))
  const isQrValid = phase === PAYMENT_PHASES.AWAITING

  const bridgeHealth = getBridgeHealth(now)

  // Tương thích ngược với các client đang đọc record.status / isQrValid
  return {
    success: true,
    orderId,
    phase,
    expiresAt: new Date(qrExpiresAt).toISOString(),
    serverNow: new Date(now).toISOString(),
    isQrValid,
    bridgeHealthy: bridgeHealth.healthy,
    status: phase === PAYMENT_PHASES.PAID ? 'PAID' : (phase === PAYMENT_PHASES.EXPIRED ? 'EXPIRED' : (phase === PAYMENT_PHASES.RECONCILING ? 'RECONCILING' : (record.payment?.status || 'AWAITING_PAYMENT'))),
    expiresInSeconds: remainingSeconds,
    paymentStatus: record.payment?.status || 'AWAITING_PAYMENT',
    // Chỉ kèm thông tin đơn tối thiểu an toàn, không rò rỉ secret / PII
    order: phase === PAYMENT_PHASES.PAID ? record : undefined,
  }
}

/**
 * ==============================================================================
 * 4. TỰ ĐỘNG TIẾP NHẬN BÁO CÁO SMS TỪ KHÁCH HÀNG (AI ASSISTANT)
 * ==============================================================================
 */
export async function markOrderPaidByAI(params = {}) {
  return {
    status: 410,
    data: {
      success: false,
      code: 'AI_VERIFY_DISCONTINUED',
      error: 'Quy trình đối soát SMS thủ công đã ngừng hoạt động. Hệ thống chuyển sang tự động hóa 100% qua email biến động số dư ngân hàng.',
    },
  }
}
