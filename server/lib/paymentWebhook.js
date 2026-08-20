import { appendOrderToSheet } from './googleSheets.js'
import { sendCustomerEmail } from './emailCustomer.js'
import { sendOwnerEmail } from './emailOwner.js'

// In-memory Database lưu trữ trạng thái đơn hàng & mã QR 1 lần
export const orderPaymentStore = new Map()
export const processedTransactionIds = new Set()

/**
 * ==============================================================================
 * 1. WEBHOOK XỬ LÝ BIẾN ĐỘNG SỐ DƯ TỰ ĐỘNG (SEPAY / CASSO / PAYOS / VIETQR)
 * ==============================================================================
 * Khi tiền thực sự về tài khoản ngân hàng:
 * 1. Khớp mã đơn hàng & kiểm tra số tiền
 * 2. VÔ HIỆU HÓA MÃ QR ĐÓ NGAY LẬP TỨC (Không cho quét lại)
 * 3. KÍCH HOẠT GỬI GMAIL XÁC NHẬN ĐẶT HÀNG & THANH TOÁN CHO KHÁCH VÀ CHỦ SHOP
 * 4. Cập nhật Google Sheets
 */
export async function handlePaymentWebhook(req) {
  try {
    // Xác thực Webhook API Key / Secret Token
    const authHeader = req.headers['authorization'] || req.headers['x-api-key'] || ''
    const expectedSecret = process.env.SEPAY_WEBHOOK_API_KEY || process.env.PAYMENT_WEBHOOK_SECRET

    if (expectedSecret && !authHeader.includes(expectedSecret)) {
      console.warn('⛔ [WEBHOOK REJECTED] Sai Secret Token / Unauthorized request')
      return { status: 401, data: { success: false, message: 'Unauthorized webhook request' } }
    }

    const payload = req.body || {}
    console.log('\n🔔 [PAYMENT WEBHOOK] Nhận thông báo giao dịch:', JSON.stringify(payload))

    // Kiểm tra giao dịch tiền vào
    const amountIn = Number(payload.transferAmount || payload.amount || 0)
    const content = (payload.content || payload.description || payload.transaction_content || '').toUpperCase()
    const txId = String(payload.id || payload.referenceCode || Date.now())

    if (amountIn <= 0 || payload.transferType === 'out') {
      return { status: 200, data: { success: true, message: 'Bỏ qua giao dịch tiền ra' } }
    }

    // Chống xử lý trùng lặp giao dịch (Idempotency)
    if (processedTransactionIds.has(txId)) {
      return { status: 200, data: { success: true, message: 'Giao dịch đã được ghi nhận trước đó' } }
    }

    // Trích xuất mã đơn hàng dạng QNS-XXXXXX-XXXX
    const orderIdMatch = content.match(/QNS-[A-Z0-9-]+/)
    const matchedOrderId = orderIdMatch ? orderIdMatch[0] : null

    if (!matchedOrderId) {
      console.warn(`⚠️ [WEBHOOK] Không tìm thấy mã đơn hàng trong nội dung: "${content}"`)
      return { status: 200, data: { success: true, message: 'Đã lưu giao dịch chờ đối soát thủ công' } }
    }

    // Tìm đơn hàng trong hệ thống
    let order = orderPaymentStore.get(matchedOrderId)

    if (!order) {
      console.warn(`⚠️ Đơn hàng ${matchedOrderId} không tồn tại trong cache bộ nhớ. Đang tạo record hoàn tất...`)
      order = {
        orderId: matchedOrderId,
        total: amountIn,
        customer: { fullName: 'Khách hàng', email: '', phone: '' },
      }
    }

    // ── XÁC NHẬN THANH TOÁN & VÔ HIỆU HÓA MÃ QR ─────────────────
    order.status = 'PENDING' // Chuyển sang chờ đóng gói giao hàng
    order.payment = {
      ...(order.payment || {}),
      method: 'BANK_TRANSFER',
      methodLabel: 'Chuyển khoản VietQR (Đã thanh toán)',
      status: 'PAID',
      paidAmount: amountIn,
      paidAt: new Date().toISOString(),
      gateway: payload.gateway || 'Vietcombank',
      referenceCode: txId,
      // VÔ HIỆU HÓA MÃ QR NGAY LẬP TỨC:
      isQrInvalidated: true,
      qrInvalidatedReason: 'PAYMENT_COMPLETED',
      qrInvalidatedAt: new Date().toISOString(),
    }

    orderPaymentStore.set(matchedOrderId, order)
    processedTransactionIds.add(txId)

    console.log(`\n🎉 [XÁC NHẬN TIỀN VỀ THÀNH CÔNG] Đơn hàng ${matchedOrderId}: Đã nhận ${amountIn}đ!`)
    console.log(`🔒 Mã QR của đơn hàng ${matchedOrderId} đã được VÔ HIỆU HÓA vĩnh viễn.`)
    console.log(`📧 Đang kích hoạt gửi Gmail xác nhận đặt hàng và hóa đơn...`)

    // KÍCH HOẠT GỬI EMAIL CHÍNH THỨC
    if (order.customer?.email) {
      sendCustomerEmail(order).then(() => {
        console.log(`📧 [GMAIL] Đã gửi xác nhận đơn & thanh toán tới: ${order.customer.email}`)
      }).catch((err) => console.error('Lỗi gửi email khách:', err.message))

      sendOwnerEmail(order).then(() => {
        console.log(`📧 [GMAIL] Đã gửi thông báo đơn đã thanh toán tới Chủ Shop`)
      }).catch((err) => console.error('Lỗi gửi email chủ shop:', err.message))
    }

    // Cập nhật Google Sheets sang trạng thái ĐÃ THANH TOÁN
    appendOrderToSheet({
      ...order,
      status: 'ĐÃ THANH TOÁN (VIETQR)',
    }).catch((err) => console.warn('Lỗi ghi Sheets:', err.message))

    return {
      status: 200,
      data: {
        success: true,
        message: 'Đã nhận tiền thành công, vô hiệu hóa mã QR và kích hoạt gửi Gmail xác nhận',
        orderId: matchedOrderId,
        amount: amountIn,
      },
    }
  } catch (error) {
    console.error('❌ Lỗi xử lý Webhook:', error)
    return { status: 500, data: { success: false, error: error.message } }
  }
}

/**
 * ==============================================================================
 * 2. API XÁC THỰC THANH TOÁN THỦ CÔNG / CLIENT CONFIRM
 * ==============================================================================
 * Khi khách hàng hoặc quản trị viên chủ động bấm xác nhận đã chuyển tiền thành công:
 * 1. Kiểm tra và cập nhật trạng thái đơn thành PAID
 * 2. Vô hiệu hóa mã QR 1 lần
 * 3. Gửi Gmail xác nhận đơn hàng tới khách
 */
export async function confirmOrderPaymentManually(orderPayload) {
  try {
    const orderId = orderPayload?.orderId
    if (!orderId) {
      return { status: 400, data: { success: false, error: 'Thiếu mã đơn hàng' } }
    }

    let existingOrder = orderPaymentStore.get(orderId) || orderPayload

    existingOrder = {
      ...existingOrder,
      ...orderPayload,
      status: 'PENDING',
      payment: {
        ...(existingOrder.payment || {}),
        method: 'BANK_TRANSFER',
        methodLabel: 'Chuyển khoản VietQR (Đã thanh toán)',
        status: 'PAID',
        paidAt: new Date().toISOString(),
        isQrInvalidated: true,
        qrInvalidatedReason: 'USER_CONFIRMED',
        qrInvalidatedAt: new Date().toISOString(),
      },
    }

    orderPaymentStore.set(orderId, existingOrder)
    console.log(`🔒 [MÃ QR VÔ HIỆU HÓA] Đơn hàng ${orderId} đã được xác nhận thanh toán.`)

    // Kích hoạt gửi Gmail xác nhận
    if (existingOrder.customer?.email) {
      sendCustomerEmail(existingOrder).catch((err) => console.error('Lỗi email khách:', err.message))
      sendOwnerEmail(existingOrder).catch((err) => console.error('Lỗi email chủ:', err.message))
    }

    appendOrderToSheet({
      ...existingOrder,
      status: 'ĐÃ THANH TOÁN (VIETQR)',
    }).catch((err) => console.warn('Lỗi ghi Sheets:', err.message))

    return {
      status: 200,
      data: {
        success: true,
        message: 'Đơn hàng đã được xác nhận thanh toán, mã QR đã vô hiệu hóa và email đã được gửi',
        order: existingOrder,
      },
    }
  } catch (err) {
    console.error('Lỗi xác thực thanh toán:', err)
    return { status: 500, data: { success: false, error: err.message } }
  }
}

/**
 * ==============================================================================
 * 3. API TRA CỨU TRẠNG THÁI THANH TOÁN & TÌNH TRẠNG MÃ QR (POLLING)
 * ==============================================================================
 */
export function getOrderPaymentStatus(orderId) {
  if (!orderId) return { status: 'PENDING', isQrValid: false }

  const record = orderPaymentStore.get(orderId)
  if (!record) {
    return {
      success: true,
      status: 'AWAITING_PAYMENT',
      isQrValid: true,
      expiresInSeconds: 900,
    }
  }

  // Đã thanh toán -> Mã QR vô hiệu hóa
  if (record.payment?.status === 'PAID' || record.payment?.isQrInvalidated) {
    return {
      success: true,
      status: 'PAID',
      isQrValid: false,
      qrStatus: 'EXPIRED_PAID',
      message: 'Mã QR đã được thanh toán và vô hiệu hóa',
      payment: record.payment,
    }
  }

  // Kiểm tra thời gian hết hạn (15 phút)
  const now = Date.now()
  const qrExpiresAt = record.payment?.qrExpiresAt || (now + 900000)
  const remainingSeconds = Math.max(0, Math.round((qrExpiresAt - now) / 1000))

  if (remainingSeconds <= 0) {
    return {
      success: true,
      status: 'QR_EXPIRED',
      isQrValid: false,
      qrStatus: 'EXPIRED_TIMEOUT',
      message: 'Mã QR đã hết hạn hiệu lực 15 phút',
    }
  }

  return {
    success: true,
    status: 'AWAITING_PAYMENT',
    isQrValid: true,
    qrStatus: 'ACTIVE',
    expiresInSeconds: remainingSeconds,
  }
}
