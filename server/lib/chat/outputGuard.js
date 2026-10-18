/**
 * Output Guard Module — Bộ kiểm duyệt đầu ra bắt buộc
 * Chạy trên MỌI câu trả lời trước khi gửi về client:
 * 1. Chặn mã voucher bịa đặt (chỉ cho phép mã có trong activeVouchers).
 * 2. Chặn giá tiền bịa đặt (chỉ cho phép mức giá thật của sản phẩm, phí ship, ngưỡng freeship).
 * 3. Chặn khẳng định cấm: tâm linh/chữa bệnh/tài lộc, khan hiếm giả ("chỉ còn 2 cái"), đếm ngược giả ("hết hôm nay").
 * 4. Chặn nhận vờ là người thật (phải trung thực là trợ lý ảo khi được hỏi).
 */

import { LIVE_CONSTANTS } from './liveFacts.js'

// Các từ viết tắt / từ viết hoa hợp lệ KHÔNG phải là mã voucher
const ALLOWED_UPPERCASE_TOKENS = new Set([
  'VIETQR', 'COD', 'VCB', 'ZALO', 'QNS', 'SIZE', 'HOTLINE', 'PREORDER',
  'OEKO', 'TEX', 'GSM', 'VNĐ', 'VND', 'SPX', 'GHTK', 'GHN', 'HTTP', 'HTTPS',
  'THE', 'DAYBREAK', 'STILLWATER', 'HEARTH', 'SET', 'S', 'M', 'L', 'XL'
])

// Danh sách các cụm từ cấm tuyệt đối
const FORBIDDEN_PHRASES = [
  /chữa\s+bệnh/i,
  /trị\s+bệnh/i,
  /hút\s+tài\s+lộc/i,
  /mang\s+lại\s+tài\s+lộc/i,
  /cam\s+kết\s+may\s+mắn/i,
  /đổi\s+vận/i,
  /100%\s+không\s+bao\s+giờ/i,
  /chỉ\s+còn\s+[1-9]\s+(?:chiếc|cái|bộ|sản\s+phẩm)/i,
  /duy\s+nhất\s+hôm\s+nay/i,
  /hết\s+hạn\s+hôm\s+nay/i,
  /hết\s+ưu\s+đãi\s+trong\s+ngày\s+hôm\s+nay/i,
  /em\s+là\s+người\s+thật/i,
  /tôi\s+là\s+người\s+thật/i,
  /không\s+phải\s+trợ\s+lý\s+ảo/i,
  /không\s+phải\s+(?:bot|ai)/i,
]

// Tập hợp các mức giá hợp lệ trong hệ thống
const VALID_PRICES = new Set([
  390000, 490000, 550000, 750000, 500000, 30000, 351000, 495000, 675000
])

/**
 * Trích xuất các số tiền được đề cập trong câu (dạng 390.000đ, 390k, 500.000 VNĐ...)
 */
function extractMentionedPrices(text) {
  const prices = []
  // Dạng 390.000đ, 500.000 VNĐ, 30.000 đ
  const fullPriceMatches = text.match(/\b\d{1,3}(?:\.\d{3})+\s*(?:đ|vnđ|vnd)\b/gi) || []
  for (const m of fullPriceMatches) {
    const num = parseInt(m.replace(/[^\d]/g, ''), 10)
    if (!isNaN(num)) prices.push(num)
  }

  // Dạng 390k, 500k, 30k
  const kMatches = text.match(/\b(\d{2,4})\s*k\b/gi) || []
  for (const m of kMatches) {
    const rawNum = parseInt(m.replace(/[^\d]/g, ''), 10)
    if (!isNaN(rawNum)) prices.push(rawNum * 1000)
  }

  return prices
}

/**
 * Trích xuất các mã token có vẻ là Voucher trong câu
 */
function extractPotentialVoucherCodes(text) {
  const codes = []
  // Bắt mẫu có chữ "mã", "code", "voucher", "nhập mã" đứng trước
  const explicitMatches = text.matchAll(/(?:mã(?:\s+ưu\s+đãi|\s+giảm\s+giá)?|voucher|code)\s+["'«]?([A-Z0-9_-]{4,20})["'»]?/gi)
  for (const match of explicitMatches) {
    if (match[1]) codes.push(match[1].toUpperCase())
  }

  // Bắt các từ viết HOA có cả chữ và số (ví dụ DISCOUNT50, SALE90, QNS10)
  const standaloneMatches = text.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,15}\b/g) || []
  for (const token of standaloneMatches) {
    const upper = token.toUpperCase()
    if (!ALLOWED_UPPERCASE_TOKENS.has(upper)) {
      codes.push(upper)
    }
  }

  return [...new Set(codes)]
}

/**
 * Kiểm duyệt và làm sạch câu trả lời của Chatbot
 * @param {string} rawReply - Nội dung câu trả lời từ model hoặc rule
 * @param {Object} options
 * @param {Array<string>} options.activeVoucherCodes - Danh sách mã hợp lệ
 * @returns {{ isValid: boolean, sanitizedReply: string, violations: Array<string> }}
 */
export function guardOutput(rawReply, { activeVoucherCodes = ['QNS10'] } = {}) {
  if (!rawReply || typeof rawReply !== 'string') {
    return {
      isValid: false,
      sanitizedReply: 'Dạ, em sẵn sàng hỗ trợ anh/chị chọn size, xem mẫu hoặc kết nối ngay cùng chủ shop ạ!',
      violations: ['empty_reply'],
    }
  }

  const violations = []
  let text = rawReply.trim()

  // 1. Kiểm tra từ cấm / khẳng định cấm
  for (const pattern of FORBIDDEN_PHRASES) {
    if (pattern.test(text)) {
      violations.push(`forbidden_phrase: ${pattern.source}`)
      // Xóa bỏ hoặc thay thế cụm từ cấm
      text = text.replace(pattern, '')
    }
  }

  // 2. Kiểm tra mã voucher hợp lệ
  const upperActive = (activeVoucherCodes || []).map((c) => String(c).toUpperCase())
  const mentionedCodes = extractPotentialVoucherCodes(text)

  for (const code of mentionedCodes) {
    if (!ALLOWED_UPPERCASE_TOKENS.has(code) && !upperActive.includes(code)) {
      violations.push(`invalid_voucher_code: ${code}`)
      // Loại bỏ mã bịa khỏi câu trả lời để không lừa khách
      const codeRegex = new RegExp(`\\b${code}\\b`, 'g')
      text = text.replace(codeRegex, '[Mã ưu đãi không hợp lệ]')
    }
  }

  // 3. Kiểm tra các mức giá được nêu trong câu
  const prices = extractMentionedPrices(text)
  for (const p of prices) {
    // Nếu giá không khớp bất kỳ mức giá chuẩn nào và > 0
    if (!VALID_PRICES.has(p) && p > 0) {
      // Cho phép một số phép tính giảm 10% phổ biến nếu khách hỏi
      const isCalculatedValid = [
        351000, // 390k - 10%
        495000, // 550k - 10%
        675000, // 750k - 10%
      ].includes(p)

      if (!isCalculatedValid) {
        violations.push(`unverified_price: ${p}`)
      }
    }
  }

  // 4. Nếu vi phạm nghiêm trọng (bịa mã giảm giá hoặc bịa giá sai lệch), fallback sang câu trả lời an toàn
  if (violations.some((v) => v.startsWith('invalid_voucher_code') || v.startsWith('unverified_price'))) {
    return {
      isValid: false,
      sanitizedReply:
        'Dạ hiện tại QuanNguyenS có chương trình ưu đãi giảm 10% cho đơn chuyển khoản VietQR, và miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ. Để biết thêm mã ưu đãi riêng hoặc tư vấn chi tiết, anh/chị có thể nhắn trực tiếp qua Zalo chủ shop (0981 753 082) nhé!',
      violations,
    }
  }

  // 5. Chuẩn hóa độ dài: tránh phản hồi quá dài (> 200 từ) trừ khi khách hỏi bảng size chi tiết
  const words = text.split(/\s+/)
  if (words.length > 250 && !text.includes('Bảng size')) {
    text = words.slice(0, 200).join(' ') + '...\n\n(Dạ em tóm tắt ý chính, nếu cần tư vấn kỹ hơn anh/chị cứ nhắn em nhé ạ!)'
  }

  return {
    isValid: violations.length === 0,
    sanitizedReply: text,
    violations,
  }
}
