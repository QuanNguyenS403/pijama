// server/lib/gmailBridgeAuth.js
/**
 * Module xác thực chữ ký HMAC-SHA256 cho kênh Google Apps Script -> Server
 * Mục 4: Bảo mật kênh Email -> Server (HMAC, timing-safe, chống phát lại, zero-downtime secret rotation)
 */

import crypto from 'crypto'

export const HMAC_TEST_VECTOR = {
  secret: 'test-bridge-secret-key-64-bytes-vector-1234567890',
  timestamp: 1700000000,
  rawBody: '{"test":"ping"}',
  expectedSignature: 'c53e3a8b93968c86638891d00da79b408e77fa3d3545026bc58951850e3aa055',
}

/**
 * Tính toán chữ ký HMAC-SHA256 chuẩn hóa cho Apps Script và Server
 * @param {string} rawBody - Chuỗi JSON thô
 * @param {string} secret - Khóa bí mật
 * @param {number} timestamp - Epoch seconds
 * @returns {string} Hex signature
 */
export function computeBridgeSignature(rawBody, secret, timestamp) {
  if (!secret) return ''
  const message = `${timestamp}.${rawBody}`
  return crypto.createHmac('sha256', secret).update(message).digest('hex')
}

/**
 * So sánh an toàn hằng số thời gian (Constant-time comparison) chống Timing Attack
 * @param {string} aHex
 * @param {string} bHex
 * @returns {boolean}
 */
export function safeTimingCompare(aHex, bHex) {
  if (!aHex || !bHex) return false
  const cleanA = aHex.trim().toLowerCase()
  const cleanB = bHex.trim().toLowerCase()
  if (cleanA.length !== cleanB.length) return false
  try {
    const bufA = Buffer.from(cleanA, 'hex')
    const bufB = Buffer.from(cleanB, 'hex')
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Xác thực request từ Apps Script gửi về /api/payment/bank-email
 * @param {import('express').Request} req
 * @returns {{ valid: boolean, status?: number, error?: string }}
 */
export function verifyBridgeHmac(req) {
  const tsHeader = req.headers['x-qns-timestamp']
  const sigHeader = req.headers['x-qns-signature']

  if (!tsHeader || !sigHeader) {
    return {
      valid: false,
      status: 401,
      error: 'Thiếu header xác thực chữ ký (X-QNS-Timestamp hoặc X-QNS-Signature)',
    }
  }

  const ts = parseInt(tsHeader, 10)
  if (isNaN(ts)) {
    return {
      valid: false,
      status: 401,
      error: 'Header X-QNS-Timestamp không hợp lệ (yêu cầu số nguyên Unix epoch)',
    }
  }

  // 1. Kiểm tra độ lệch đồng hồ (Skew limit: 300 giây = 5 phút)
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > 300) {
    return {
      valid: false,
      status: 401,
      error: 'Thời gian yêu cầu bị lệch quá 300 giây so với máy chủ',
    }
  }

  // 2. Kiểm tra cấu hình secret trên máy chủ (Fail-closed)
  const primarySecret = process.env.GMAIL_BRIDGE_SECRET
  const prevSecret = process.env.GMAIL_BRIDGE_SECRET_PREV

  if (!primarySecret && !prevSecret) {
    return {
      valid: false,
      status: 500,
      error: 'Hệ thống chưa được cấu hình biến môi trường GMAIL_BRIDGE_SECRET',
    }
  }

  // 3. Lấy body thô (giữ nguyên từng byte)
  const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}))

  // 4. Kiểm tra chữ ký với primary secret
  if (primarySecret) {
    const expectedSig = computeBridgeSignature(rawBody, primarySecret, ts)
    if (safeTimingCompare(sigHeader, expectedSig)) {
      return { valid: true }
    }
  }

  // 5. Hỗ trợ xoay khóa: kiểm tra với previous secret (nếu có)
  if (prevSecret) {
    const prevExpectedSig = computeBridgeSignature(rawBody, prevSecret, ts)
    if (safeTimingCompare(sigHeader, prevExpectedSig)) {
      return { valid: true, usingPreviousSecret: true }
    }
  }

  return {
    valid: false,
    status: 401,
    error: 'Chữ ký HMAC không khớp (Unauthorized request)',
  }
}
