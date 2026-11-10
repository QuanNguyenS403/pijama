import dns from 'dns'
import { domainToASCII } from 'url'

/**
 * 🛡️ EMAIL RECIPIENT GUARD
 *
 * Chặn việc gửi email THẬT trong các tình huống gây hại cho uy tín hộp thư gửi (quannguyens403@gmail.com):
 *  1. Môi trường test tự động (NODE_ENV=test / NODE_TEST_CONTEXT / --test trong execArgv / AUTH_TEST_MODE)
 *     -> luôn giả lập sandbox, không chạm mạng thật.
 *  2. Địa chỉ tổng hợp do test sinh ra trên tên miền thuộc shop (ent_user_*, otp_register_*, ...) -> chặn ở MỌI môi trường.
 *  3. Địa chỉ nhận không thể nhận thư (domain dành riêng, không có bản ghi MX, null MX "0 .", sai cú pháp)
 *     -> từ chối sớm theo nguyên tắc strict MX-required (không fallback sang bản ghi A/AAAA mặc định).
 */

// RFC 2606 / RFC 6761: các TLD & domain dành riêng, không bao giờ nhận thư
const RESERVED_TLDS = new Set(['test', 'example', 'invalid', 'localhost', 'local', 'internal'])
const RESERVED_DOMAINS = new Set(['example.com', 'example.net', 'example.org'])

const DEFAULT_OWN_DOMAINS = ['quannguyens.com', 'quannguyens.vn']
const DEFAULT_SYNTHETIC_LOCAL_PATTERN =
  '^(?:ent_user|otp_register|otp_test|forgot|test_review|unsub_test|quannguyen(?:_probe|_?[0-9])|(?:test|smoke|verify|qa|e2e|ci|dummy|fake)_)'

const MX_POSITIVE_CACHE_TTL_MS = 60 * 60 * 1000 // 1 giờ (ngắn hơn cache âm)
const MX_NEGATIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // Tối thiểu 6 giờ cho domain không có MX / null MX
const DEFAULT_MX_LOOKUP_TIMEOUT_MS = 4000
const DEFAULT_DNS_FAIL_OPEN_MAX_PER_HOUR = 20

const mxCache = new Map() // domain -> { deliverable: boolean, reason?: string, implicitMx?: boolean, expiresAt: number }
let dnsFailOpenTimestamps = [] // epoch ms trong cửa sổ 1 giờ gần nhất
let customDnsResolver = null

function getMxLookupTimeoutMs() {
  const parsed = Number.parseInt(String(process.env.MX_LOOKUP_TIMEOUT_MS || ''), 10)
  if (Number.isFinite(parsed) && parsed >= 200 && parsed <= 15000) return parsed
  return DEFAULT_MX_LOOKUP_TIMEOUT_MS
}

function getDnsFailOpenCapPerHour() {
  const parsed = Number.parseInt(String(process.env.MX_DNS_FAIL_OPEN_MAX_PER_HOUR || ''), 10)
  if (Number.isFinite(parsed) && parsed >= 0) return parsed
  return DEFAULT_DNS_FAIL_OPEN_MAX_PER_HOUR
}

/**
 * Đang chạy trong Node.js test runner (`node --test`, `NODE_ENV=test`, hoặc `NODE_TEST_CONTEXT`)?
 * Lưu ý: KHÔNG kiểm tra chuỗi "test" trong `process.argv` (E4) để tránh đường dẫn như `latest-site/`
 * hay script `test-email.js` bị hiểu nhầm là automated test runner.
 */
export function isNodeTestRunner(env = process.env, execArgv = process.execArgv) {
  const nodeEnv = String(env?.NODE_ENV || '').trim().toLowerCase()
  const hasTestContext = Boolean(String(env?.NODE_TEST_CONTEXT || '').trim())
  const hasTestExecArg =
    Array.isArray(execArgv) &&
    execArgv.some((arg) => arg === '--test' || String(arg).startsWith('--test-'))
  return nodeEnv === 'test' || hasTestContext || hasTestExecArg
}

/**
 * Đang chạy trong môi trường test tự động (cần giả lập gửi thư)?
 * Trong production tường minh (`NODE_ENV === 'production'`), trả `false` để fail-closed kiểm cấu hình hoạt động đúng;
 * đồng thời `sendEmailViaHttps` vẫn khóa cứng mạng khi `isNodeTestRunner()` là `true`.
 */
export function isAutomatedTestEnvironment(env = process.env, execArgv = process.execArgv) {
  const nodeEnv = String(env?.NODE_ENV || '').trim().toLowerCase()
  if (nodeEnv === 'production') return false
  return (
    isNodeTestRunner(env, execArgv) ||
    String(env?.AUTH_TEST_MODE || '').trim().toLowerCase() === 'true'
  )
}

/**
 * Cho phép tắt hoàn toàn việc gửi email thật (ví dụ khi bảo trì)
 */
export function isEmailDeliveryDisabled() {
  return String(process.env.EMAIL_DELIVERY_DISABLED || '').trim().toLowerCase() === 'true'
}

export function getConfiguredOwnDomains() {
  const raw = String(process.env.OWN_DOMAINS || '').trim()
  const list = raw
    ? raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_OWN_DOMAINS
  return new Set(list)
}

export function getConfiguredAllowImplicitMxDomains() {
  const raw = String(process.env.EMAIL_ALLOW_IMPLICIT_MX_DOMAINS || '').trim()
  if (!raw) return new Set()
  return new Set(raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean))
}

function isOwnDomain(domain) {
  const clean = String(domain || '').trim().toLowerCase().replace(/\.+$/, '')
  if (!clean) return false
  const ownDomains = getConfiguredOwnDomains()
  for (const own of ownDomains) {
    const cleanOwn = own.replace(/\.+$/, '')
    if (clean === cleanOwn || clean.endsWith(`.${cleanOwn}`)) {
      return true
    }
  }
  return false
}

function getSyntheticMatchers() {
  const raw = String(process.env.EMAIL_SYNTHETIC_PATTERNS || '').trim()
  const patterns = raw
    ? raw.split(',').map((p) => p.trim()).filter(Boolean)
    : [DEFAULT_SYNTHETIC_LOCAL_PATTERN]

  const matchers = []
  for (const pat of patterns) {
    try {
      matchers.push({ regex: new RegExp(pat, 'i'), includesDomain: pat.includes('@') })
    } catch (_) {
      // Bỏ qua regex lỗi cấu hình, giữ mặc định an toàn
    }
  }
  if (matchers.length === 0) {
    matchers.push({ regex: new RegExp(DEFAULT_SYNTHETIC_LOCAL_PATTERN, 'i'), includesDomain: false })
  }
  return matchers
}

export function extractEmailAddress(raw) {
  const str = String(raw || '').trim()
  if (!str || /[\r\n\x00-\x1f]/.test(str)) return ''
  const angle = str.match(/<([^>]+)>/)
  return (angle ? angle[1] : str).trim().normalize('NFC').toLowerCase()
}

function splitRecipientHeader(raw) {
  const str = String(raw || '')
  const parts = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i]
    if (ch === '"' && str[i - 1] !== '\\') {
      inQuotes = !inQuotes
      current += ch
    } else if (!inQuotes && (ch === ',' || ch === ';')) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

export function normalizeRecipients(to) {
  const items = Array.isArray(to) ? to : [to]
  const out = []
  for (const item of items) {
    for (const part of splitRecipientHeader(item)) {
      const extracted = extractEmailAddress(part)
      if (extracted) out.push(extracted)
    }
  }
  return out
}

export function getEmailDomain(address) {
  const clean = extractEmailAddress(address)
  const at = clean.lastIndexOf('@')
  return at > 0 ? clean.slice(at + 1) : ''
}

/**
 * Kiểm tra địa chỉ có khớp mẫu địa chỉ tổng hợp do test sinh ra trên tên miền shop hay không.
 * Chặn ở MỌI môi trường (kể cả production, dev, test).
 */
export function isSyntheticTestEmail(email) {
  const address = extractEmailAddress(email)
  if (!address) return false
  const at = address.lastIndexOf('@')
  if (at <= 0) return false
  const localPart = address.slice(0, at).replace(/^"+|"+$/g, '')
  const localBase = localPart.split('+')[0]
  const rawDomain = address.slice(at + 1).replace(/\.+$/, '')
  const asciiDomain = (domainToASCII(rawDomain) || rawDomain).replace(/\.+$/, '')

  const matchers = getSyntheticMatchers()
  const ownDomainMatched = isOwnDomain(rawDomain) || isOwnDomain(asciiDomain)

  for (const { regex, includesDomain } of matchers) {
    if (includesDomain) {
      if (regex.test(address)) return true
    } else if (ownDomainMatched) {
      if (regex.test(localPart) || regex.test(localBase)) return true
    }
  }
  return false
}

function withTimeout(promise, ms) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ]).finally(() => clearTimeout(timer))
}

function getActiveDnsPromises() {
  return customDnsResolver || dns.promises
}

export function __setDnsResolverForTests(resolver) {
  if (isAutomatedTestEnvironment() || isNodeTestRunner()) {
    customDnsResolver = resolver || null
  }
}

export function __resetDnsFailOpenHistoryForTests() {
  dnsFailOpenTimestamps = []
}

/**
 * Kiểm tra domain có nhận được thư không (bắt buộc phải có bản ghi MX hợp lệ).
 * - Tên miền không có MX (kể cả có A/AAAA) => từ chối (`NO_MX_RECORD`), trừ khi nằm trong
 *   `EMAIL_ALLOW_IMPLICIT_MX_DOMAINS` (và không thuộc `OWN_DOMAINS`).
 * - Null MX ("0 .", RFC 7505) => từ chối (`NULL_MX`).
 * - Lỗi DNS tạm thời => fail-open có trần số lần/giờ (`MX_DNS_FAIL_OPEN_MAX_PER_HOUR`).
 */
export async function checkDomainDeliverability(domain) {
  const rawClean = String(domain || '').trim().toLowerCase()
  if (!rawClean || !rawClean.includes('.') || rawClean.startsWith('.') || rawClean.endsWith('.') || rawClean.includes('..')) {
    return { deliverable: false, reason: 'INVALID_DOMAIN' }
  }

  const asciiDomain = domainToASCII(rawClean)
  if (!asciiDomain || !asciiDomain.includes('.')) {
    return { deliverable: false, reason: 'INVALID_DOMAIN' }
  }

  const tld = asciiDomain.split('.').pop()
  if (RESERVED_TLDS.has(tld) || RESERVED_DOMAINS.has(asciiDomain)) {
    return { deliverable: false, reason: 'RESERVED_DOMAIN' }
  }

  const cached = mxCache.get(asciiDomain)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      deliverable: cached.deliverable,
      reason: cached.reason,
      ...(cached.implicitMx ? { implicitMx: true } : {}),
    }
  }

  const timeoutMs = getMxLookupTimeoutMs()
  const resolver = getActiveDnsPromises()
  let result

  try {
    const records = await withTimeout(resolver.resolveMx(asciiDomain), timeoutMs)
    const usable = (records || []).filter(
      (r) => r && typeof r.exchange === 'string' && r.exchange.trim() !== '' && r.exchange.trim() !== '.'
    )
    if (usable.length > 0) {
      result = { deliverable: true }
    } else {
      // Null MX ("0 .", RFC 7505)
      result = { deliverable: false, reason: 'NULL_MX' }
    }
  } catch (err) {
    const code = err?.code
    if (code === 'ENODATA' || code === 'NO_DATA') {
      // Chỉ cho phép implicit MX (fallback bản ghi A) nếu domain được cấu hình tường minh và KHÔNG thuộc OWN_DOMAINS
      const allowList = getConfiguredAllowImplicitMxDomains()
      if (!isOwnDomain(asciiDomain) && allowList.has(asciiDomain)) {
        try {
          const aRecords = await withTimeout(resolver.resolve4(asciiDomain), timeoutMs)
          if (aRecords && aRecords.length > 0) {
            result = { deliverable: true, implicitMx: true }
          } else {
            result = { deliverable: false, reason: 'NO_MX_RECORD' }
          }
        } catch (_) {
          result = { deliverable: false, reason: 'NO_MX_RECORD' }
        }
      } else {
        result = { deliverable: false, reason: 'NO_MX_RECORD' }
      }
    } else if (code === 'ENOTFOUND' || code === 'NXDOMAIN') {
      result = { deliverable: false, reason: 'NO_MX_RECORD' }
    } else {
      // Lỗi mạng/DNS tạm thời -> fail-open có trần theo giờ, không cache
      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000
      dnsFailOpenTimestamps = dnsFailOpenTimestamps.filter((ts) => ts >= oneHourAgo)
      const cap = getDnsFailOpenCapPerHour()
      if (dnsFailOpenTimestamps.length >= cap) {
        console.error(
          `🚨 [DNS GUARD] Đã vượt ngưỡng fail-open DNS tạm thời (${cap}/giờ). Chuyển sang fail-closed cho domain ${asciiDomain}.`
        )
        return { deliverable: false, reason: 'DNS_UNAVAILABLE_CAP_EXCEEDED' }
      }
      dnsFailOpenTimestamps.push(now)
      return { deliverable: true, reason: 'DNS_UNAVAILABLE', dnsUnavailable: true }
    }
  }

  const ttl = result.deliverable ? MX_POSITIVE_CACHE_TTL_MS : MX_NEGATIVE_CACHE_TTL_MS
  mxCache.set(asciiDomain, { ...result, expiresAt: Date.now() + ttl })
  return result
}

/**
 * Kiểm tra 1 địa chỉ email có thể nhận thư không.
 * - Mẫu địa chỉ tổng hợp trên tên miền shop -> từ chối ở MỌI môi trường.
 * - Trong môi trường test (đối với domain test như @example.com) -> bỏ qua tra DNS thật.
 */
export async function checkEmailDeliverability(email) {
  const address = extractEmailAddress(email)
  if (!address || address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { deliverable: false, reason: 'INVALID_FORMAT', address }
  }
  if (isSyntheticTestEmail(address)) {
    return { deliverable: false, reason: 'SYNTHETIC_TEST_RECIPIENT', address }
  }
  if (!customDnsResolver && (isAutomatedTestEnvironment() || isNodeTestRunner())) {
    return { deliverable: true, reason: 'TEST_ENV_SKIPPED', address }
  }
  const domainCheck = await checkDomainDeliverability(getEmailDomain(address))
  return { ...domainCheck, address }
}

/**
 * Lọc danh sách người nhận, trả về { deliverable, rejected, unverifiedDomainRecipients }
 */
export async function partitionRecipients(to) {
  const recipients = normalizeRecipients(to)
  const deliverable = []
  const rejected = []
  const unverifiedDomainRecipients = []

  if (recipients.length === 0) {
    rejected.push({ address: String(to || ''), reason: 'INVALID_FORMAT' })
    return { deliverable, rejected, unverifiedDomainRecipients }
  }

  for (const address of recipients) {
    const check = await checkEmailDeliverability(address)
    if (check.deliverable) {
      deliverable.push(check.address || address)
      if (check.dnsUnavailable) {
        unverifiedDomainRecipients.push(check.address || address)
      }
    } else {
      rejected.push({ address: check.address || address, reason: check.reason })
    }
  }
  return { deliverable, rejected, unverifiedDomainRecipients }
}

export const UNDELIVERABLE_EMAIL_MESSAGE =
  'Địa chỉ email này không thể nhận thư (tên miền không tồn tại hoặc không có máy chủ nhận mail). Vui lòng kiểm tra lại chính tả email, ví dụ: tenban@gmail.com.'

export function __resetMxCacheForTests() {
  mxCache.clear()
}

