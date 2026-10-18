/**
 * PII Scrubber Module:
 * Lọc sạch thông tin định danh cá nhân (Số điện thoại, Email, Địa chỉ, STK/CCCD)
 * trước khi gửi bất kỳ văn bản nào sang nhà cung cấp LLM miễn phí (Gemini / Groq / OpenRouter).
 * Đảm bảo 100% quyền riêng tư và tuân thủ chính sách dữ liệu.
 */

// Regex nhận diện số điện thoại Việt Nam (10 số, đầu số 03, 05, 07, 08, 09 hoặc +84)
const VN_PHONE_REGEX = /(?:\+84|84|0)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}\b/g

// Regex nhận diện email tiêu chuẩn
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g

// Regex nhận diện chuỗi số tài khoản ngân hàng hoặc CCCD (9 - 16 chữ số liên tiếp)
const BANK_ACCOUNT_OR_ID_REGEX = /\b(?:\d[\s.-]?){9,16}\b/g

// Regex nhận diện địa chỉ cụ thể dạng "số ... đường/phố/ngõ/ngách/hẻm/tổ/phường/quận..."
const ADDRESS_PATTERNS = [
  /(?:số|so|nhà\s+số|nha\s+so)\s+[\w\d/-]+(?:\s+(?:đường|duong|phố|pho|ngõ|ngo|ngách|ngach|hẻm|hem|tổ|to)[\w\s,.-]+){1,3}/gi,
  /(?:ngõ|ngo|ngách|ngach|hẻm|hem)\s+[\w\d/-]+(?:\s+[\w\s,.-]+){1,3}/gi,
  /(?:căn\s+hộ|chung\s+cư|tòa\s+nhà|toa\s+nha)\s+[\w\d\s,.-]+(?:\s+(?:phường|phuong|quận|quan|huyện|huyen)[\w\s,.-]+)/gi,
]

/**
 * Hàm lọc sạch PII trong chuỗi văn bản
 * @param {string} text - Văn bản gốc từ người dùng
 * @returns {string} - Văn bản đã được thay thế thông tin nhạy cảm bằng placeholder
 */
export function scrubPII(text) {
  if (!text || typeof text !== 'string') return ''

  let scrubbed = text

  // 1. Lọc Email
  scrubbed = scrubbed.replace(EMAIL_REGEX, '[EMAIL]')

  // 2. Lọc Số điện thoại Việt Nam
  scrubbed = scrubbed.replace(VN_PHONE_REGEX, '[SĐT]')

  // 3. Lọc Địa chỉ chi tiết
  for (const pattern of ADDRESS_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[ĐỊA CHỈ]')
  }

  // 4. Lọc dãy số dài (STK ngân hàng, CCCD) nhưng không xóa các con số giá tiền bình thường (ví dụ 390000, 500000)
  // Chỉ lọc khi chuỗi số có độ dài >= 9 ký tự và không có chữ "đ" hay "k" hay "vnd" đi kèm
  scrubbed = scrubbed.replace(BANK_ACCOUNT_OR_ID_REGEX, (match) => {
    const digitsOnly = match.replace(/[\s.-]/g, '')
    // Bỏ qua nếu có vẻ là giá tiền thông thường (390000, 500000, 750000)
    if (['390000', '490000', '500000', '550000', '750000', '30000', '100000'].includes(digitsOnly)) {
      return match
    }
    // Nếu là 9-16 chữ số (STK/CCCD/SĐT còn sót), ẩn đi
    if (digitsOnly.length >= 9 && digitsOnly.length <= 16) {
      return '[SỐ BẢO MẬT]'
    }
    return match
  })

  return scrubbed
}

/**
 * Kiểm tra xem chuỗi có chứa PII chưa được lọc hay không
 * @param {string} text
 * @returns {boolean}
 */
export function containsPII(text) {
  if (!text || typeof text !== 'string') return false
  return (
    VN_PHONE_REGEX.test(text) ||
    EMAIL_REGEX.test(text)
  )
}
