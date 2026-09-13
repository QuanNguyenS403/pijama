import crypto from 'crypto'

const TOKEN_SECRET = process.env.ORDER_TOKEN_SECRET || process.env.JWT_SECRET || 'qns-order-token-secret-fallback-key-2026'

/**
 * Generate a cryptographically secure tracking token for an order.
 * This token proves ownership without exposing PII.
 */
export function generateTrackingToken(orderId, phone = '') {
  if (!orderId) return ''
  const cleanPhone = String(phone || '').replace(/\D/g, '')
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${orderId}:${cleanPhone}`)
    .digest('hex')
    .slice(0, 32)
}

/**
 * Verify if provided token matches orderId and phone.
 */
export function verifyTrackingToken(orderId, phone = '', token = '') {
  if (!orderId || !token) return false
  const expectedToken = generateTrackingToken(orderId, phone)
  if (expectedToken.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(token))
}
