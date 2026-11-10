/**
 * Preload chặn kết nối mạng thật và SMTP ngoài loopback khi chạy bộ test (`npm test`).
 * Nạp qua `node --import ./tests/setup/no-real-network.mjs --test ...`.
 *
 * Lưu ý: Cho phép loopback (`127.0.0.1`, `localhost`, `::1`, `[::1]`) để các integration test
 * Express nội bộ trên ephemeral port hoạt động bình thường.
 */

import { createRequire } from 'node:module'

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', '0.0.0.0'])

function extractUrlString(input) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input && typeof input.url === 'string') return input.url
  return ''
}

function isAllowedTestUrl(rawUrl) {
  if (!rawUrl) return false
  try {
    const parsed = new URL(rawUrl, 'http://127.0.0.1')
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return true
    const host = String(parsed.hostname || '').toLowerCase()
    return LOOPBACK_HOSTS.has(host)
  } catch (_) {
    return false
  }
}

const nativeFetch = globalThis.fetch

if (typeof nativeFetch === 'function') {
  globalThis.fetch = async function guardedTestFetch(input, init) {
    const rawUrl = extractUrlString(input)
    if (!isAllowedTestUrl(rawUrl)) {
      let hostInfo = 'unknown-host'
      try {
        const parsed = new URL(rawUrl)
        hostInfo = parsed.host || parsed.protocol || 'unknown-host'
      } catch (_) {}
      const err = new Error(
        `[NO-REAL-NETWORK] Bị chặn: code test cố gọi fetch() ra mạng ngoài loopback tới "${hostInfo}". Hãy mock globalThis.fetch trong test.`
      )
      err.code = 'TEST_NETWORK_BLOCKED'
      throw err
    }
    return nativeFetch.call(this, input, init)
  }
}

function blockedCreateTransport() {
  const err = new Error(
    '[NO-REAL-NETWORK] Bị chặn: code test cố khởi tạo nodemailer.createTransport() (SMTP thật bị cấm).'
  )
  err.code = 'TEST_SMTP_BLOCKED'
  throw err
}

try {
  const require = createRequire(import.meta.url)
  const cjsNodemailer = require('nodemailer')
  if (cjsNodemailer && typeof cjsNodemailer === 'object') {
    cjsNodemailer.createTransport = blockedCreateTransport
  }
  const esmNodemailer = await import('nodemailer')
  if (esmNodemailer?.default && typeof esmNodemailer.default === 'object') {
    esmNodemailer.default.createTransport = blockedCreateTransport
  }
} catch (_) {
  // Nếu môi trường tối giản chưa cài nodemailer, giữ nguyên không làm hỏng quá trình nạp test
}

globalThis.__QNS_NO_REAL_NETWORK_INSTALLED__ = true

