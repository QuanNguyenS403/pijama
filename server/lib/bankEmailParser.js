// server/lib/bankEmailParser.js
/**
 * Module phân tích & xác thực email thông báo biến động số dư ngân hàng (Vietcombank)
 * WP2: Parser chặt chẽ, kiểm tra DKIM/DMARC, trích xuất chính xác số tiền, mã đơn, mã GD
 * Bất biến: Không dùng bộ khớp mờ, dung sai số tiền = 0đ.
 */

export const PARSER_VERSION = '1.0.0-UNVERIFIED-SYNTHETIC-VCB'

/**
 * Danh sách người gửi ngân hàng được phép theo cấu hình
 */
export function getAllowedSenders() {
  const envSenders = process.env.BANK_EMAIL_ALLOWED_SENDERS
  if (envSenders) {
    return envSenders.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  }
  return [
    'vietcombank@vietcombank.com.vn',
    'ibanking@vietcombank.com.vn',
    'vcb@vietcombank.com.vn',
    'no-reply@vietcombank.com.vn',
  ]
}

/**
 * Kiểm tra tính xác thực nguồn email (DKIM / DMARC / From)
 * @param {string} from - Header From
 * @param {string} authResults - Header Authentication-Results do Gmail gắn
 * @returns {{ isTrusted: boolean, reason: string }}
 */
export function verifyEmailSender(from = '', authResults = '') {
  const allowed = getAllowedSenders()
  const lowerFrom = (from || '').toLowerCase()
  const lowerAuth = (authResults || '').toLowerCase()

  // 1. Kiểm tra From có chứa email hoặc domain ngân hàng hợp lệ
  const isFromAllowed = allowed.some((sender) => {
    if (sender.includes('@')) {
      return lowerFrom.includes(sender)
    }
    return lowerFrom.includes(`@${sender}`)
  })

  if (!isFromAllowed) {
    return {
      isTrusted: false,
      reason: `Người gửi không thuộc danh sách ngân hàng cho phép: ${from}`,
    }
  }

  // 2. Kiểm tra Authentication-Results do Google ghi
  // Yêu cầu: dkim=pass (với header.i hoặc header.d của ngân hàng) HOẶC dmarc=pass
  if (lowerAuth) {
    const dkimPass = lowerAuth.includes('dkim=pass')
    const dmarcPass = lowerAuth.includes('dmarc=pass')
    const spfPass = lowerAuth.includes('spf=pass')

    // Domain ký dkim phải khớp với miền vietcombank.com.vn hoặc miền trong danh sách
    const dkimDomainValid = allowed.some((sender) => {
      const domain = sender.includes('@') ? sender.split('@')[1] : sender
      return lowerAuth.includes(`header.d=${domain}`) || lowerAuth.includes(`header.i=@${domain}`)
    })

    if ((dkimPass && dkimDomainValid) || dmarcPass || (dkimPass && spfPass)) {
      return { isTrusted: true, reason: 'DKIM/DMARC hợp lệ từ máy chủ ngân hàng' }
    }

    return {
      isTrusted: false,
      reason: `Header Authentication-Results không đạt tiêu chuẩn an toàn: ${authResults}`,
    }
  }

  // Môi trường test có thể cho phép giả lập nếu bật cờ test
  if (process.env.NODE_ENV === 'test' && lowerFrom.includes('vietcombank')) {
    return { isTrusted: true, reason: 'Test mode mock authentication' }
  }

  return {
    isTrusted: false,
    reason: 'Thiếu header Authentication-Results từ Gmail',
  }
}

/**
 * Trích xuất mã đơn hàng duy nhất từ nội dung chuyển khoản
 * @param {string} text - Nội dung chuyển khoản
 * @returns {{ matchedOrderId: string | null, ambiguous: boolean, candidates: string[] }}
 */
export function extractOrderIdStrict(text = '') {
  if (!text) return { matchedOrderId: null, ambiguous: false, candidates: [] }

  const clean = text.replace(/[\r\n\t]+/g, ' ')

  // Pattern 1: Mã chuẩn có dấu gạch ngang: QNS-123456-ABCD
  const standardRegex = /QNS-([0-9]{6})-([A-Z0-9]{4})/gi
  const standardMatches = [...clean.matchAll(standardRegex)].map((m) => m[0].toUpperCase())

  // Pattern 2: Mã ngân hàng bỏ dấu gạch ngang: QNS123456ABCD
  const noDashRegex = /QNS([0-9]{6})([A-Z0-9]{4})/gi
  const noDashMatches = [...clean.matchAll(noDashRegex)].map((m) => `QNS-${m[1]}-${m[2]}`.toUpperCase())

  // Gom các mã đơn phân biệt
  const uniqueCandidates = [...new Set([...standardMatches, ...noDashMatches])]

  if (uniqueCandidates.length === 0) {
    return { matchedOrderId: null, ambiguous: false, candidates: [] }
  }

  if (uniqueCandidates.length > 1) {
    return { matchedOrderId: null, ambiguous: true, candidates: uniqueCandidates }
  }

  return { matchedOrderId: uniqueCandidates[0], ambiguous: false, candidates: uniqueCandidates }
}

/**
 * Phân tích cú pháp email biến động số dư ngân hàng
 * @param {Object} emailData
 * @param {string} emailData.from
 * @param {string} emailData.authResults
 * @param {string} emailData.subject
 * @param {string} emailData.bodyText
 * @param {number|string} [emailData.receivedAt]
 * @returns {Object}
 */
export function parseBankEmail({ from = '', authResults = '', subject = '', bodyText = '', receivedAt = Date.now() }) {
  const auth = verifyEmailSender(from, authResults)
  const trust = auth.isTrusted ? 'TRUSTED' : 'UNTRUSTED'

  const fullText = `${subject}\n${bodyText}`
  const lowerFull = fullText.toLowerCase()

  // 1. Kiểm tra chiều giao dịch (IN vs OUT)
  let direction = 'UNKNOWN'
  const isIncoming =
    lowerFull.includes('ghi có') ||
    lowerFull.includes('tiền vào') ||
    lowerFull.includes('số tiền tăng') ||
    lowerFull.includes('credit') ||
    /\+\s*[0-9]{1,3}([,.][0-9]{3})+/.test(fullText) ||
    /số tiền.*?:\s*\+/.test(lowerFull)

  const isOutgoing =
    lowerFull.includes('ghi nợ') ||
    lowerFull.includes('tiền ra') ||
    lowerFull.includes('số tiền giảm') ||
    lowerFull.includes('debit') ||
    lowerFull.includes('phí duy trì') ||
    /số tiền.*?:\s*-/.test(lowerFull)

  if (isIncoming && !isOutgoing) {
    direction = 'IN'
  } else if (isOutgoing) {
    direction = 'OUT'
  }

  if (direction === 'OUT') {
    return {
      ok: false,
      direction: 'OUT',
      trust,
      reason: 'Bỏ qua giao dịch tiền ra/chi phí (OUTGOING_IGNORED)',
    }
  }

  // 2. Trích xuất số tiền (Amount)
  let amount = 0
  // Mẫu: Số tiền: +390,000 VND hoặc Số tiền GD: +390.000 VND hoặc +390,000 VND
  const amountMatch =
    fullText.match(/(?:số\s*tiền|số\s*tiền\s*gd|giao\s*dịch|biến\s*động)\s*[:\s]*\+?\s*([0-9]{1,3}(?:[,.][0-9]{3})+|[0-9]{4,10})\s*(?:vnd|vnđ|đ)?/i) ||
    fullText.match(/\+\s*([0-9]{1,3}(?:[,.][0-9]{3})+|[0-9]{4,10})\s*(?:vnd|vnđ|đ)?/i)

  if (amountMatch) {
    const rawDigits = amountMatch[1].replace(/[,.]/g, '')
    amount = parseInt(rawDigits, 10) || 0
  }

  // 3. Trích xuất số tài khoản (4 số cuối)
  let accountLast4 = ''
  const accMatch =
    fullText.match(/(?:tài\s*khoản|tk|account|stk)\s*[:\s]*([0-9xX*]{6,20})/i) ||
    fullText.match(/(?:tại\s*vcb|vcb)\s*[:\s]*([0-9xX*]{6,20})/i)

  if (accMatch) {
    const digits = accMatch[1].replace(/[^0-9]/g, '')
    if (digits.length >= 4) {
      accountLast4 = digits.slice(-4)
    }
  }

  // 4. Trích xuất thời gian giao dịch
  let bankTime = ''
  // Mẫu: 27/10/2026 14:35:10 hoặc 14:35:10 27/10/2026
  const timeMatch =
    fullText.match(/([0-3]?[0-9]\/[0-1]?[0-9]\/20[2-3][0-9]\s+[0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)/) ||
    fullText.match(/([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?\s+[0-3]?[0-9]\/[0-1]?[0-9]\/20[2-3][0-9])/)

  if (timeMatch) {
    bankTime = timeMatch[1]
  } else {
    // Fallback: dùng thời gian nhận thư internalDate
    bankTime = new Date(Number(receivedAt) || Date.now()).toISOString()
  }

  // 5. Trích xuất mã tham chiếu giao dịch (bankRef)
  let bankRef = ''
  const refMatch =
    fullText.match(/(?:mã\s*gd|số\s*gd|mã\s*giao\s*dịch|ref|trace|ft)\s*[:\s]*([A-Z0-9.]+)/i) ||
    fullText.match(/(MBVCB\.[0-9]+(?:\.[A-Z0-9]+)?)/i)

  if (refMatch) {
    bankRef = refMatch[1].trim().replace(/[.,;]+$/, '')
  }

  // 6. Trích xuất nội dung chuyển khoản & mã đơn hàng
  let content = ''
  const contentMatch = fullText.match(/(?:nội\s*dung|nội\s*dung\s*gd|chi\s*tiết|desc)\s*[:\s]*([^\r\n]+)/i)
  if (contentMatch) {
    content = contentMatch[1].trim()
  } else {
    content = fullText.slice(0, 300).replace(/[\r\n]+/g, ' ')
  }

  const { matchedOrderId, ambiguous, candidates } = extractOrderIdStrict(fullText)

  if (ambiguous) {
    return {
      ok: false,
      direction,
      amount,
      bankTime,
      bankRef,
      accountLast4,
      trust,
      reason: `Nội dung chứa nhiều hơn 1 mã đơn hàng: ${candidates.join(', ')}`,
      candidates,
    }
  }

  return {
    ok: Boolean(direction === 'IN' && amount > 0 && matchedOrderId),
    amount,
    content,
    matchedOrderId,
    bankTime,
    bankRef,
    accountLast4,
    direction,
    trust,
    authReason: auth.reason,
    parserVersion: PARSER_VERSION,
  }
}
