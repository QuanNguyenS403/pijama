// server/lib/paymentQrService.js
/**
 * Module tạo mã QR VietQR theo đơn hàng (Server-authoritative)
 * WP4: Thay thế POST /api/payment/generate-qr và GET /api/payment/napas-qr
 * Bất biến: Số tiền và nội dung bắt buộc lấy từ đơn trong kho lưu trữ, bỏ qua dữ liệu từ client.
 */

import { orderPersistence } from './orderPersistence.js'
import { getPaymentPhase, PAYMENT_QR_TTL_SECONDS } from './paymentState.js'
import { generateAiNapasQR } from './aiNapasQrService.js'

/**
 * Lấy dữ liệu mã QR thanh toán chuẩn hóa cho một đơn hàng
 * @param {string} orderId
 * @param {number} [now=Date.now()]
 * @returns {Promise<{ ok: boolean, status: number, error?: string, code?: string, data?: Object }>}
 */
export async function getPaymentQrData(orderId, now = Date.now()) {
  if (!orderId) {
    return { ok: false, status: 400, error: 'Thiếu mã đơn hàng' }
  }

  const order = orderPersistence.get(orderId)
  if (!order) {
    return { ok: false, status: 404, error: 'Không tìm thấy đơn hàng trong hệ thống' }
  }

  const method = order.payment?.method || order.paymentMethod || 'COD'
  if (method !== 'BANK_TRANSFER') {
    return { ok: false, status: 400, error: 'Đơn hàng không sử dụng phương thức chuyển khoản VietQR' }
  }

  const phase = getPaymentPhase(order, now)

  // 1. Nếu đơn hàng đã thanh toán thành công -> 410 Gone
  if (phase === 'PAID') {
    return {
      ok: false,
      status: 410,
      code: 'ALREADY_PAID',
      error: 'Đơn hàng này đã được xác nhận thanh toán thành công.',
    }
  }

  // 2. Nếu đơn hàng đã hủy -> 410 Gone
  if (phase === 'CANCELLED') {
    return {
      ok: false,
      status: 410,
      code: 'ORDER_CANCELLED',
      error: 'Đơn hàng này đã bị hủy.',
    }
  }

  // 3. Nếu đơn hàng đã hết hạn -> 410 Gone
  if (phase === 'EXPIRED') {
    return {
      ok: false,
      status: 410,
      code: 'QR_EXPIRED',
      error: 'Mã QR thanh toán cho đơn hàng này đã hết hạn hiệu lực.',
    }
  }

  const createdAtMs = order.createdAt ? new Date(order.createdAt).getTime() : now
  const expiresAt = order.payment?.qrExpiresAt
    ? new Date(order.payment.qrExpiresAt).getTime()
    : createdAtMs + PAYMENT_QR_TTL_SECONDS * 1000

  // 4. Nếu đang trong giai đoạn đối soát (RECONCILING): ẩn QR, báo trạng thái
  if (phase === 'RECONCILING') {
    return {
      ok: true,
      status: 200,
      data: {
        success: true,
        orderId,
        phase: 'RECONCILING',
        isQrValid: false,
        total: order.total,
        expiresAt,
        serverNow: now,
        message: 'Mã QR đã hết hạn hiệu lực. Hệ thống đang kiểm tra sao kê ngân hàng đối soát giao dịch.',
      },
    }
  }

  // 5. Pha AWAITING: Cung cấp mã QR an toàn
  // Số tiền và nội dung LẤY TỪ SERVER, KHÔNG TIN DỮ LIỆU CLIENT
  const canonicalBankCode = process.env.BANK_CODE || 'VCB'
  const canonicalAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506'
  const canonicalAccountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN'
  const description = `QNS ${orderId}`

  let qrDataUrl = null
  let vietQrUrl = `https://img.vietqr.io/image/${canonicalBankCode.toLowerCase()}-${canonicalAccountNumber}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(canonicalAccountName)}`

  try {
    const aiQr = await generateAiNapasQR({
      amount: order.total,
      description,
      orderId,
      bankCode: canonicalBankCode,
      accountNumber: canonicalAccountNumber,
      accountName: canonicalAccountName,
    })
    if (aiQr && aiQr.qrDataUrl) {
      qrDataUrl = aiQr.qrDataUrl
      vietQrUrl = aiQr.vietQrUrl || vietQrUrl
    }
  } catch (err) {
    // Fallback sang vietQrUrl tĩnh nếu hàm tạo ảnh nội bộ gặp sự cố
  }

  return {
    ok: true,
    status: 200,
    data: {
      success: true,
      orderId,
      total: order.total,
      description,
      bankCode: canonicalBankCode,
      accountNumber: canonicalAccountNumber,
      accountName: canonicalAccountName,
      vietQrUrl,
      qrDataUrl,
      phase: 'AWAITING',
      isQrValid: true,
      expiresAt,
      serverNow: now,
    },
  }
}
