import crypto from 'crypto'
import { isProductionEnv } from './shopConfig.js'

function getOrderTokenSecret() {
  const isProd = isProductionEnv()
  const secret = process.env.ORDER_TOKEN_SECRET || (isProd ? null : (process.env.JWT_SECRET || 'qns-order-token-secret-fallback-key-2026'))
  if (!secret) {
    throw new Error('[CRITICAL_SECURITY] ORDER_TOKEN_SECRET bắt buộc phải được cấu hình trong môi trường production!')
  }
  return secret
}

const PROOF_FILENAME_REGEX = /^proof_[a-f0-9]{16,64}\.(jpg|png|webp)$/i
const DEFAULT_PROOF_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày

/**
 * Generate a cryptographically secure tracking token for an order.
 * This token proves ownership without exposing PII.
 */
export function generateTrackingToken(orderId, phone = '') {
  if (!orderId) return ''
  const cleanPhone = String(phone || '').replace(/\D/g, '')
  const secret = getOrderTokenSecret()
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}:${cleanPhone}`)
    .digest('hex')
    .slice(0, 32)
}

/**
 * Verify if provided token matches orderId and phone.
 */
export function verifyTrackingToken(orderId, phone = '', token = '') {
  if (!orderId || !token) return false
  let expectedToken = ''
  try {
    expectedToken = generateTrackingToken(orderId, phone)
  } catch (err) {
    if (isProductionEnv()) throw err
    return false
  }
  const bufExpected = Buffer.from(expectedToken, 'utf8')
  const bufActual = Buffer.from(String(token), 'utf8')
  if (!expectedToken || bufExpected.length !== bufActual.length) return false
  return crypto.timingSafeEqual(bufExpected, bufActual)
}

/**
 * Loại bỏ query chữ ký (?exp=...&sig=...) để chỉ lưu đường dẫn chuẩn trong DB/JSON.
 */
export function stripProofUrlSignature(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl || null
  const [cleanPath] = rawUrl.split('?')
  return cleanPath
}

/**
 * Ký URL ảnh chứng từ thanh toán (/uploads/payment-proofs/proof_<hex>.<ext>?exp=...&sig=...)
 * Ngăn truy cập công khai trái phép vào thư mục chứng từ chuyển khoản (G4).
 */
export function createSignedProofUrl(rawUrl, options = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl || null
  const cleanPath = stripProofUrlSignature(rawUrl.trim())
  if (!cleanPath.includes('/uploads/payment-proofs/')) return rawUrl

  const filename = cleanPath.split('/').pop() || ''
  if (!PROOF_FILENAME_REGEX.test(filename)) return rawUrl

  try {
    const secret = getOrderTokenSecret()
    const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_PROOF_URL_TTL_MS
    const exp = Number.isFinite(options.exp) ? Math.floor(options.exp) : Date.now() + ttlMs
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`proof:${filename.toLowerCase()}:${exp}`)
      .digest('hex')
      .slice(0, 32)
    return `${cleanPath}?exp=${exp}&sig=${sig}`
  } catch (err) {
    if (isProductionEnv()) throw err
    return cleanPath
  }
}

/**
 * Xác minh chữ ký truy cập tệp ảnh chứng từ thanh toán.
 */
export function verifySignedProofRequest(filename = '', exp = '', sig = '') {
  const cleanName = String(filename || '').trim()
  const cleanSig = String(sig || '').trim()
  if (!PROOF_FILENAME_REGEX.test(cleanName) || !cleanSig) return false

  const expMs = Number.parseInt(String(exp || ''), 10)
  if (!Number.isFinite(expMs) || expMs <= Date.now()) return false

  try {
    const secret = getOrderTokenSecret()
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`proof:${cleanName.toLowerCase()}:${expMs}`)
      .digest('hex')
      .slice(0, 32)
    const bufExpected = Buffer.from(expectedSig, 'utf8')
    const bufActual = Buffer.from(cleanSig, 'utf8')
    if (bufExpected.length !== bufActual.length) return false
    return crypto.timingSafeEqual(bufExpected, bufActual)
  } catch (_) {
    return false
  }
}

/**
 * Trả về bản sao đơn hàng đã gắn chữ ký tạm thời cho URL ảnh chứng từ (dùng khi trả về cho Admin hoặc chủ đơn).
 */
export function signOrderProofUrls(order, options = {}) {
  if (!order || typeof order !== 'object') return order
  const hasPaymentProofUrl = Boolean(order.payment?.proofImageUrl)
  const hasLegacyProofUrl = Boolean(order.paymentProof?.imageUrl)
  if (!hasPaymentProofUrl && !hasLegacyProofUrl) return order

  const cloned = { ...order }
  if (hasPaymentProofUrl && cloned.payment) {
    cloned.payment = {
      ...cloned.payment,
      proofImageUrl: createSignedProofUrl(cloned.payment.proofImageUrl, options),
    }
  }
  if (hasLegacyProofUrl && cloned.paymentProof) {
    cloned.paymentProof = {
      ...cloned.paymentProof,
      imageUrl: createSignedProofUrl(cloned.paymentProof.imageUrl, options),
    }
  }
  return cloned
}


