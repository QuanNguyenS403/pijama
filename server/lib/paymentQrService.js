// server/lib/paymentQrService.js
/**
 * Module tạo mã QR VietQR theo đơn hàng (Server-authoritative)
 * WP4: Thay thế POST /api/payment/generate-qr và GET /api/payment/napas-qr
 * Bất biến: Số tiền và nội dung bắt buộc lấy từ đơn trong kho lưu trữ, bỏ qua dữ liệu từ client.
 */

import { orderPersistence } from './orderPersistence.js'
import { getPaymentPhase } from './paymentState.js'
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

  // 3. Cung cấp mã QR không giới hạn thời gian quét mã (chờ khách tải ảnh & bấm Thanh toán)
  // Số tiền và nội dung LẤY TỪ SERVER, KHÔNG TIN DỮ LIỆU CLIENT
  const canonicalBankCode = process.env.BANK_CODE || 'VCB'
  const canonicalAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506'
  const canonicalAccountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN'
  const description = orderId.startsWith('QNS') ? orderId : `QNS ${orderId}`

  let qrDataUrl = null
  let vietQrUrl = `https://img.vietqr.io/image/${canonicalBankCode.toLowerCase()}-${canonicalAccountNumber}-qr_only.png?amount=${order.total}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(canonicalAccountName)}`

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
      phase,
      isQrValid: true,
      serverNow: now,
    },
  }
}
