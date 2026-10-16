/**
 * ==============================================================================
 * HỆ THỐNG TẠO MÃ QR TỰ ĐỘNG HÓA BẰNG AI QUA NAPAS 247 (MIỄN PHÍ VĨNH VIỄN)
 * Architecture: QuanNguyenS Ecommerce System - High Reliability & Zero-Fee
 * ==============================================================================
 * - Tiêu chuẩn: EMVCo QRCPS Merchant-Presented Mode (MPM) do Ngân hàng Nhà nước & NAPAS ban hành.
 * - Mạng lưới: Chuyển nhanh Napas 24/7 liên ngân hàng thời gian thực.
 * - Chi phí: 100% MIỄN PHÍ sử dụng (0đ phí cổng trung gian, 0đ duy trì hàng tháng).
 * - Tự động hóa AI:
 *   1. Tạo mã QR động nội bộ độ nét cao (Data URL / SVG), tự sinh TLV + CRC16 offline không phụ thuộc bên thứ 3.
 *   2. Chuẩn hóa cú pháp nội dung chuyển khoản thông minh chống gian lận & chống nhầm lẫn.
 *   3. AI Smart Matcher: Tự động phân tích SMS/thông báo biến động số dư Vietcombank để đối soát và tự động duyệt đơn.
 * ==============================================================================
 */

import QRCode from 'qrcode'

// ── Bảng tra cứu mã BIN chuẩn NAPAS 247 cho các ngân hàng Việt Nam ──────────
export const NAPAS_BANK_BIN = {
  VCB: '970436',          // Vietcombank
  VIETCOMBANK: '970436',
  970436: '970436',
  ICB: '970415',          // VietinBank
  CTG: '970415',
  VIETINBANK: '970415',
  970415: '970415',
  BIDV: '970418',         // BIDV
  970418: '970418',
  AGR: '970405',          // Agribank
  AGRIBANK: '970405',
  970405: '970405',
  MB: '970422',           // Quân Đội MBBank
  MBBANK: '970422',
  970422: '970422',
  TCB: '970407',          // Techcombank
  TECHCOMBANK: '970407',
  970407: '970407',
  ACB: '970416',          // Á Châu ACB
  970416: '970416',
  VPB: '970432',          // VPBank
  VPBANK: '970432',
  970432: '970432',
  TPB: '970423',          // TPBank
  TPBANK: '970423',
  970423: '970423',
  STB: '970403',          // Sacombank
  SACOMBANK: '970403',
  970403: '970403',
  HDB: '970437',          // HDBank
  HDBANK: '970437',
  970437: '970437',
  VIB: '970441',          // VIB
  970441: '970441',
  SHB: '970443',          // SHB
  970443: '970443',
  OCB: '970448',          // OCB
  MSB: '970426',          // MSB
  LPB: '970449',          // LPBank
}

/**
 * Tính mã kiểm tra CRC16-CCITT (chuẩn EMVCo, init 0xFFFF, poly 0x1021)
 * @param {string} str
 * @returns {string} 4 ký tự hex viết hoa
 */
export function calculateCRC16CCITT(str) {
  let crc = 0xffff
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Đóng gói TLV (Tag - Length - Value) theo chuẩn EMVCo
 * @param {string} tag Mã trường (2 chữ số)
 * @param {string} value Dữ liệu trường
 * @returns {string} Chuỗi TLV
 */
export function formatTLV(tag, value) {
  const strVal = String(value || '')
  const len = String(strVal.length).padStart(2, '0')
  return `${tag}${len}${strVal}`
}

/**
 * 1. TẠO CHUỖI PAYLOAD EMVCO NAPAS 247 CHUẨN QUỐC GIA
 * @param {Object} options
 * @param {string} [options.bankCode='VCB'] Mã ngân hàng hoặc BIN (Mặc định: Vietcombank 970436)
 * @param {string} [options.accountNumber='1050773506'] Số tài khoản Vietcombank
 * @param {number} options.amount Số tiền thanh toán (VND)
 * @param {string} options.description Nội dung chuyển khoản (chứa mã đơn hàng QNS)
 * @returns {string} Chuỗi EMVCo Napas 247 hoàn chỉnh kèm CRC16
 */
export function buildNapas247Payload({
  bankCode = process.env.BANK_CODE || 'VCB',
  accountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506',
  amount = 0,
  description = '',
}) {
  const cleanBank = String(bankCode).trim().toUpperCase()
  const bin = NAPAS_BANK_BIN[cleanBank] || '970436' // Mặc định Vietcombank BIN: 970436
  const cleanAccount = String(accountNumber).trim()
  const cleanAmount = Math.max(0, Math.round(Number(amount) || 0))
  const cleanDesc = String(description || '').trim()

  // Tag 38: Thông tin người thụ hưởng Napas
  // - Subtag 00: GUID Napas ('A000000727')
  // - Subtag 01: Tổ chức thụ hưởng (Tag 00: BIN ngân hàng + Tag 01: STK)
  // - Subtag 02: Mã dịch vụ ('QRIBFTTA' - Chuyển nhanh liên ngân hàng Napas 247 tới STK)
  const subOrg = formatTLV('00', bin) + formatTLV('01', cleanAccount)
  const tag38 =
    formatTLV('00', 'A000000727') +
    formatTLV('01', subOrg) +
    formatTLV('02', 'QRIBFTTA')

  // Bắt đầu lắp ráp Payload EMVCo
  let raw = ''
  // 00: Payload Format Indicator ('01')
  raw += formatTLV('00', '01')
  // 01: Point of Initiation Method ('12' - QR động có chỉ định số tiền; '11' - QR tĩnh)
  raw += formatTLV('01', cleanAmount > 0 ? '12' : '11')
  // 38: Napas Merchant Account Information
  raw += formatTLV('38', tag38)
  // 53: Transaction Currency Code ('704' = VND)
  raw += formatTLV('53', '704')
  // 54: Transaction Amount
  if (cleanAmount > 0) {
    raw += formatTLV('54', String(cleanAmount))
  }
  // 58: Country Code ('VN')
  raw += formatTLV('58', 'VN')
  // 62: Additional Data Field Template (Tag 08: Nội dung chuyển khoản / Mã đơn)
  if (cleanDesc) {
    const tag62 = formatTLV('08', cleanDesc)
    raw += formatTLV('62', tag62)
  }
  // 63: CRC16 Checksum (Đặt tag 63 và length 04 trước khi tính CRC)
  raw += '6304'

  const crc = calculateCRC16CCITT(raw)
  return raw + crc
}

/**
 * 2. TẠO TOÀN BỘ DỮ LIỆU QR NAPAS 247 (DATA URL NỘI BỘ, SVG, VÀ CDN FALLBACK)
 * Hoạt động 100% offline, miễn phí vĩnh viễn, không cần API Key bên ngoài.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function generateAiNapasQR({
  bankCode = process.env.BANK_CODE || 'VCB',
  accountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506',
  accountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN',
  amount,
  description,
  orderId,
}) {
  const sanitizedAmount = Math.max(0, Math.round(Number(amount) || 0))
  
  // Tự động hóa AI chuẩn hóa nội dung chuyển khoản: QNS [MÃ ĐƠN HÀNG]
  let cleanDesc = description || ''
  if (!cleanDesc && orderId) {
    cleanDesc = `QNS ${orderId}`
  }
  if (!cleanDesc) {
    cleanDesc = `QNS ${Date.now().toString().slice(-6)}`
  }

  // 1. Tạo chuỗi chuẩn EMVCo NAPAS 247
  const emvcoPayload = buildNapas247Payload({
    bankCode,
    accountNumber,
    amount: sanitizedAmount,
    description: cleanDesc,
  })

  // 2. Tự sinh ảnh QR Code nội bộ chất lượng cao (Data URL Base64) - 0ms độ trễ, không phụ thuộc mạng
  let qrDataUrl = ''
  let qrSvg = ''
  try {
    qrDataUrl = await QRCode.toDataURL(emvcoPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: {
        dark: '#0f172a', // Luxury Navy Dark Tone
        light: '#ffffff',
      },
    })
    qrSvg = await QRCode.toString(emvcoPayload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('⚠️ [AI NAPAS QR] Lỗi sinh ảnh QR nội bộ:', err.message)
  }

  // 3. Link ảnh CDN VietQR dự phòng
  const encodedDesc = encodeURIComponent(cleanDesc)
  const encodedName = encodeURIComponent(accountName)
  const vietQrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${sanitizedAmount}&addInfo=${encodedDesc}&accountName=${encodedName}`

  return {
    success: true,
    provider: 'NAPAS_247',
    standard: 'EMVCo QRCPS Napas 24/7',
    cost: '0 VND (Miễn phí vĩnh viễn)',
    qrDataUrl,      // Ảnh QR Base64 PNG nội bộ trực tiếp
    qrSvg,          // Định dạng vector SVG
    vietQrUrl,      // Link CDN dự phòng
    emvcoPayload,   // Chuỗi mã thô chuẩn liên ngân hàng
    paymentDetails: {
      bankCode,
      bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
      accountNumber,
      accountName,
      amount: sanitizedAmount,
      description: cleanDesc,
      napasService: 'QRIBFTTA (Chuyển khoản nhanh Napas 247)',
    },
  }
}

/**
 * 3. AI TRANSACTION MATCHER (TRỢ LÝ ĐỐI SOÁT GIAO DỊCH TỰ ĐỘNG THÔNG MINH)
 * Tự động phân tích SMS Banking / Thông báo biến động số dư / Sao kê Vietcombank
 * để trích xuất số tiền, mã đơn hàng và tự động đối soát không cần cổng thanh toán trả phí.
 *
 * @param {string} rawText Nội dung tin nhắn SMS hoặc thông báo biến động số dư
 * @param {Object} [expectedOrder] Dữ liệu đơn hàng cần so khớp (nếu có)
 * @returns {Object} Kết quả phân tích và đánh giá độ khớp (Confidence Score)
 */
export function parseAndMatchTransactionAI(rawText, expectedOrder = null) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Thiếu dữ liệu nội dung giao dịch' }
  }

  const text = rawText.toUpperCase()

  // 1. AI Trích xuất Số tiền (Amount): Tìm các mẫu như +350,000VND, GD: 350.000D, SO TIEN: 350000
  let extractedAmount = 0
  const amountPatterns = [
    /(?:\+|\bSO TIEN:?|\bGD:?|\bTIEN:?)\s*([0-9.,]+)\s*(?:VND|D|Đ|\b)/i,
    /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:VND|D|Đ|\b)/i,
    /(?:\+|\b)([0-9]{5,9})\s*(?:VND|D|Đ|\b)/i,
  ]

  for (const regex of amountPatterns) {
    const match = rawText.match(regex)
    if (match && match[1]) {
      const cleanNum = match[1].replace(/[.,]/g, '')
      const num = parseInt(cleanNum, 10)
      if (num >= 1000) {
        extractedAmount = num
        break
      }
    }
  }

  // 2. AI Trích xuất Mã đơn hàng (Order ID / Code): Nhận diện QNS-xxxxxx, QNS xxxxxx, QNSxxxxxx
  let extractedOrderId = null
  const orderPatterns = [
    /\bQNS\s*[-_]?\s*([A-Z0-9_-]{3,32})\b/i,
    /\bDH\s*[-_]?\s*([A-Z0-9_-]{3,32})\b/i,
    /\b([0-9]{10,15})\b/, // Timestamp ID đơn hàng
  ]

  for (const regex of orderPatterns) {
    const match = rawText.match(regex)
    if (match && match[1]) {
      extractedOrderId = match[1].replace(/[-_\s]/g, '')
      break
    }
  }

  // 3. AI Trích xuất Mã giao dịch ngân hàng (Ref / Trace No)
  let refNumber = null
  const refMatch = rawText.match(/(?:REF|SO GD|MA GD|TRACE|FT)[.:\s]*([A-Z0-9]{6,20})/i)
  if (refMatch && refMatch[1]) {
    refNumber = refMatch[1].trim()
  }

  // 4. Đánh giá so khớp nếu có thông tin đơn hàng dự kiến
  let isMatched = false
  let confidence = 0
  let reason = ''

  if (expectedOrder) {
    const expTotal = Math.round(Number(expectedOrder.total) || 0)
    const expId = String(expectedOrder.orderId || expectedOrder.id || '').replace(/[-_\s]/g, '').toUpperCase()

    const amountMatches = Math.abs(extractedAmount - expTotal) < 100 // Dung sai 100đ
    const cleanText = text.replace(/[-_\s]/g, '')
    const idMatches = (
      (extractedOrderId && (expId.includes(extractedOrderId) || extractedOrderId.includes(expId))) ||
      (expId && (text.includes(expId) || cleanText.includes(expId)))
    )

    if (amountMatches && idMatches) {
      isMatched = true
      confidence = 1.0 // 100% Khớp tuyệt đối
      reason = 'Khớp 100% cả mã đơn hàng và số tiền thanh toán'
    } else if (amountMatches && !extractedOrderId) {
      confidence = 0.7
      reason = 'Khớp số tiền nhưng tin nhắn không chứa rõ mã đơn hàng (cần xác nhận thủ công)'
    } else if (idMatches && !amountMatches) {
      confidence = 0.5
      reason = `Tìm thấy mã đơn nhưng số tiền không khớp (Chuyển: ${extractedAmount}đ, Đơn: ${expTotal}đ)`
    } else {
      confidence = 0.1
      reason = 'Không tìm thấy dữ liệu trùng khớp với đơn hàng'
    }
  }

  return {
    success: true,
    parsed: {
      extractedAmount,
      extractedOrderId,
      refNumber,
      rawSnippet: rawText.slice(0, 200),
    },
    verification: {
      isMatched,
      confidence,
      reason,
    },
  }
}
