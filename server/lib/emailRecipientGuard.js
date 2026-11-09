import dns from 'dns'

/**
 * 🛡️ EMAIL RECIPIENT GUARD
 *
 * Chặn việc gửi email THẬT trong 2 tình huống gây hại cho uy tín hộp thư gửi (quannguyens403@gmail.com):
 *  1. Đang chạy bộ test tự động (node --test / NODE_ENV=test / AUTH_TEST_MODE) -> luôn giả lập, không gửi thật.
 *  2. Địa chỉ nhận không thể nhận thư (domain dành riêng cho test, domain không có bản ghi MX, null MX...)
 *     -> từ chối sớm thay vì để Gmail retry 48 giờ rồi trả về "Mail Delivery Subsystem" (bounce).
 *
 * Bounce rate cao khiến Google hạ điểm tin cậy tài khoản gửi, email OTP của khách thật dễ rơi vào Spam.
 */

// RFC 2606 / RFC 6761: các TLD & domain dành riêng, không bao giờ nhận thư
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local', 'internal'])
const RESERVED_DOMAINS = new Set(['example.com', 'example.net', 'example.org'])

const MX_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 giờ
const MX_LOOKUP_TIMEOUT_MS = 4000
const mxCache = new Map() // domain -> { deliverable: boolean, reason?: string, expiresAt: number }

/**
 * Đang chạy trong môi trường test tự động?
 * NODE_TEST_CONTEXT do chính Node test runner gắn vào tiến trình con -> không thể bị .env ghi đè.
 */
export function isAutomatedTestEnvironment() {
  if (process.env.NODE_ENV === 'production') return false
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.AUTH_TEST_MODE === 'true' ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.some((arg) => arg === '--test' || arg.startsWith('--test-'))
  )
}

/**
 * Cho phép tắt hoàn toàn việc gửi email thật (ví dụ khi chạy script thử nghiệm local)
 */
export function isEmailDeliveryDisabled() {
  return String(process.env.EMAIL_DELIVERY_DISABLED || '').trim().toLowerCase() === 'true'
}

function extractAddress(raw) {
  const str = String(raw || '').trim()
  const angle = str.match(/<([^>]+)>/)
  return (angle ? angle[1] : str).trim().toLowerCase()
}

export function normalizeRecipients(to) {
  const list = Array.isArray(to) ? to : String(to || '').split(',')
  return list.map(extractAddress).filter(Boolean)
}

function getDomain(address) {
  const at = address.lastIndexOf('@')
  return at > 0 ? address.slice(at + 1) : ''
}

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * Kiểm tra domain có nhận được thư không (dựa trên bản ghi MX).
 * - Không có MX / domain không tồn tại / null MX ("0 .") => KHÔNG nhận được thư.
 * - Lỗi mạng / DNS timeout => fail-open (cho phép gửi) để không chặn nhầm khách thật.
 */
export async function checkDomainDeliverability(domain) {
  const clean = String(domain || '').trim().toLowerCase()
  if (!clean || !clean.includes('.')) {
    return { deliverable: false, reason: 'INVALID_DOMAIN' }
  }

  const tld = clean.split('.').pop()
  if (RESERVED_TLDS.has(tld) || RESERVED_DOMAINS.has(clean)) {
    return { deliverable: false, reason: 'RESERVED_DOMAIN' }
  }

  const cached = mxCache.get(clean)
  if (cached && cached.expiresAt > Date.now()) {
    return { deliverable: cached.deliverable, reason: cached.reason }
  }

  let result
  try {
    const records = await withTimeout(dns.promises.resolveMx(clean), MX_LOOKUP_TIMEOUT_MS)
    const usable = (records || []).filter((r) => r && r.exchange && r.exchange !== '.')
    result = usable.length > 0
      ? { deliverable: true }
      : { deliverable: false, reason: 'NULL_MX' }
  } catch (err) {
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'NXDOMAIN')) {
      result = { deliverable: false, reason: 'NO_MX_RECORD' }
    } else {
      // Lỗi mạng tạm thời -> không cache lâu, cho phép gửi
      return { deliverable: true, reason: 'DNS_UNAVAILABLE' }
    }
  }

  mxCache.set(clean, { ...result, expiresAt: Date.now() + MX_CACHE_TTL_MS })
  return result
}

/**
 * Kiểm tra 1 địa chỉ email có thể nhận thư không.
 * Trong môi trường test luôn trả về deliverable=true (email sẽ được giả lập ở tầng gửi).
 */
export async function checkEmailDeliverability(email) {
  const address = extractAddress(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { deliverable: false, reason: 'INVALID_FORMAT', address }
  }
  if (isAutomatedTestEnvironment()) {
    return { deliverable: true, reason: 'TEST_ENV_SKIPPED', address }
  }
  const domainCheck = await checkDomainDeliverability(getDomain(address))
  return { ...domainCheck, address }
}

/**
 * Lọc danh sách người nhận, trả về { deliverable: [...], rejected: [{ address, reason }] }
 */
export async function partitionRecipients(to) {
  const recipients = normalizeRecipients(to)
  const deliverable = []
  const rejected = []
  for (const address of recipients) {
    const check = await checkEmailDeliverability(address)
    if (check.deliverable) deliverable.push(address)
    else rejected.push({ address, reason: check.reason })
  }
  return { deliverable, rejected }
}

export const UNDELIVERABLE_EMAIL_MESSAGE =
  'Địa chỉ email này không thể nhận thư (tên miền không tồn tại hoặc không có máy chủ nhận mail). Vui lòng kiểm tra lại chính tả email, ví dụ: tenban@gmail.com.'

export function __resetMxCacheForTests() {
  mxCache.clear()
}

