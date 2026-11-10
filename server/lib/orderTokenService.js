import crypto from 'crypto'

function getOrderTokenSecret() {
  const isProd = process.env.NODE_ENV === 'production'
  const secret = process.env.ORDER_TOKEN_SECRET || (isProd ? null : (process.env.JWT_SECRET || 'qns-order-token-secret-fallback-key-2026'))
  if (!secret) {
    throw new Error('[CRITICAL_SECURITY] ORDER_TOKEN_SECRET bắt buộc phải được cấu hình trong môi trường production!')
  }
  return secret
}

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
    if (process.env.NODE_ENV === 'production') throw err
    return false
  }
  const bufExpected = Buffer.from(expectedToken, 'utf8')
  const bufActual = Buffer.from(String(token), 'utf8')
  if (!expectedToken || bufExpected.length !== bufActual.length) return false
  return crypto.timingSafeEqual(bufExpected, bufActual)
}

