/**
 * ==============================================================================
 * MODULE TẠO MÃ QR THANH TOÁN ĐỘNG (VIETQR / SEPAY / PAYOS)
 * Senior Backend Architecture - QuanNguyenS Ecommerce System
 * ==============================================================================
 */

/**
 * 1. VIETQR GENERATOR (Chuẩn Napas247 - Quick Link & API)
 * @param {Object} params
 * @param {string} params.bankCode Mã ngân hàng (VD: 'VCB', 'ICB', 'MB', 'ACB' hoặc mã BIN 970436)
 * @param {string} params.accountNumber Số tài khoản thụ hưởng
 * @param {string} params.accountName Tên chủ tài khoản
 * @param {number} params.amount Số tiền thanh toán (VND)
 * @param {string} params.description Nội dung chuyển khoản (chứa mã đơn hàng để đối soát)
 * @param {string} [params.template='compact2'] Giao diện khung QR ('compact', 'compact2', 'qr_only', 'print')
 * @returns {Object} QR Data chứa link ảnh, raw payload và link thanh toán
 */
export function generateVietQRQuickLink({
  bankCode = 'VCB',
  accountNumber = '1050773506',
  accountName = 'NGUYEN DUC QUAN',
  amount,
  description,
  template = 'compact2',
  includeAddInfo = false,
}) {
  const sanitizedAmount = Math.round(Number(amount) || 0)
  const encodedDesc = encodeURIComponent(description || '')
  const encodedName = encodeURIComponent(accountName || '')

  // Link ảnh VietQR động chuẩn CDN Napas VietQR.io (không kèm addInfo theo yêu cầu)
  const addInfoParam = (includeAddInfo && encodedDesc) ? `&addInfo=${encodedDesc}` : ''
  const qrImageUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?amount=${sanitizedAmount}${addInfoParam}&accountName=${encodedName}`

  // Link Deeplink mở trực tiếp App ngân hàng hỗ trợ VietQR
  const deeplink = `https://api.vietqr.io/${bankCode}/${accountNumber}/${sanitizedAmount}/${encodedDesc}/vietqr.jpg`

  return {
    success: true,
    provider: 'VietQR',
    qrImageUrl,
    deeplink,
    paymentDetails: {
      bankCode,
      accountNumber,
      accountName,
      amount: sanitizedAmount,
      description,
    },
  }
}

/**
 * 2. SEPAY QR & GATEWAY GENERATOR (Cổng SePay Tự Động Đối Soát Biến Động Số Dư)
 * @param {Object} params
 * @param {string} params.accountNumber Số tài khoản ngân hàng đã liên kết SePay
 * @param {string} params.bankName Tên ngân hàng (Vietcombank, MBBank, Techcombank,...)
 * @param {number} params.amount Số tiền cần thanh toán
 * @param {string} params.description Nội dung chuyển khoản (VD: QNS-123456)
 * @returns {Object}
 */
export function generateSePayQR({
  accountNumber = '1050773506',
  bankName = 'Vietcombank',
  amount,
  description,
}) {
  const sanitizedAmount = Math.round(Number(amount) || 0)
  const encodedDesc = encodeURIComponent(description || '')

  // SePay QR Code API
  const qrImageUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${encodeURIComponent(bankName)}&amount=${sanitizedAmount}&des=${encodedDesc}`

  return {
    success: true,
    provider: 'SePay',
    qrImageUrl,
    paymentDetails: {
      accountNumber,
      bankName,
      amount: sanitizedAmount,
      description,
    },
  }
}
