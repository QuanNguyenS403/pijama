import crypto from 'crypto'

const HMAC_SECRET = process.env.CUSTOMER_AUTH_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'qns-customer-auth-internal-secret-salt-2026'

/**
 * Sinh mã OTP 6 chữ số ngẫu nhiên bằng CSPRNG (crypto.randomInt)
 */
export function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

/**
 * Sinh salt ngẫu nhiên cho việc băm OTP
 */
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Băm mã OTP kèm salt bằng SHA-256
 */
export function hashOtpCode(code, salt) {
  const cleanCode = String(code).trim()
  return crypto.createHash('sha256').update(`${salt}:${cleanCode}`).digest('hex')
}

/**
 * So khớp mã OTP với hash trong cơ sở dữ liệu bằng Constant-time comparison
 */
export function verifyOtpCode(inputCode, salt, storedHash) {
  if (!inputCode || !salt || !storedHash) return false
  const inputHash = hashOtpCode(inputCode, salt)
  const bufA = Buffer.from(inputHash, 'utf8')
  const bufB = Buffer.from(storedHash, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Sinh opaque session token (32 bytes ngẫu nhiên an toàn)
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Băm session token bằng SHA-256 để lưu trữ server-side
 */
export function hashSessionToken(token) {
  if (!token) return ''
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

/**
 * Băm IP và User-Agent để kiểm tra lạm dụng / bảo mật phiên mà không lưu PII thô
 */
export function hashClientMetadata(ip, userAgent) {
  const ipHash = crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 16)
  const uaHash = crypto.createHash('sha256').update(String(userAgent || '')).digest('hex').slice(0, 16)
  return { ipHash, uaHash }
}

/**
 * Sinh token hủy đăng ký marketing an toàn (Signed token với HMAC-SHA256)
 */
export function generateUnsubscribeToken(email, accountId) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const payload = `${accountId || 'guest'}:${cleanEmail}:${Date.now()}`
  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

/**
 * Xác thực token hủy đăng ký marketing
 */
export function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { isValid: false, error: 'Token hủy đăng ký không đúng định dạng' }
  }

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return { isValid: false, error: 'Token hủy đăng ký không hợp lệ' }
  }

  const expectedSignature = crypto.createHmac('sha256', HMAC_SECRET).update(encodedPayload).digest('base64url')
  const bufExpected = Buffer.from(expectedSignature, 'utf8')
  const bufActual = Buffer.from(signature, 'utf8')

  if (bufExpected.length !== bufActual.length || !crypto.timingSafeEqual(bufExpected, bufActual)) {
    return { isValid: false, error: 'Chữ ký token hủy đăng ký không hợp lệ' }
  }

  try {
    const rawPayload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
    const [accountId, email, timestamp] = rawPayload.split(':')
    return {
      isValid: true,
      accountId: accountId === 'guest' ? null : accountId,
      email,
      timestamp: Number(timestamp),
    }
  } catch {
    return { isValid: false, error: 'Không thể giải mã nội dung token' }
  }
}
