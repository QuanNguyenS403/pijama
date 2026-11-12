import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { loadEnvironment } from './envCheck.js'
import {
  isAutomatedTestEnvironment,
  isNodeTestRunner,
  isEmailDeliveryDisabled,
  isSyntheticTestEmail,
  extractEmailAddress,
  normalizeRecipients,
  checkEmailDeliverability,
  partitionRecipients,
  UNDELIVERABLE_EMAIL_MESSAGE,
} from './emailRecipientGuard.js'
import {
  getDb,
  isEmailBounceSuppressed,
  isSyntheticAccountEmail,
} from './accountDb.js'

let localTransporter = null
let customTestTransport = null

const DEFAULT_ALERT_COOLDOWN_MS = 15 * 60 * 1000
const alertCooldownMap = new Map() // key -> lastLoggedMs

function getAlertCooldownMs() {
  const parsed = Number.parseInt(String(process.env.EMAIL_ALERT_COOLDOWN_MS || ''), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_ALERT_COOLDOWN_MS
}

function logAlertWithCooldown(key, message) {
  const now = Date.now()
  const cooldownMs = getAlertCooldownMs()
  const last = alertCooldownMap.get(key) || 0
  if (now - last >= cooldownMs) {
    alertCooldownMap.set(key, now)
    console.error(`🚨 [EMAIL ALERT:${key}] ${message}`)
    return true
  }
  return false
}

export function __resetEmailAlertCooldownsForTests() {
  alertCooldownMap.clear()
}

/**
 * Xác định chính sách gửi email từ biến môi trường & execArgv (WP-1.1 / WP-1.2).
 * - Khóa cứng sandbox khi NODE_ENV==='test' hoặc NODE_TEST_CONTEXT / --test có mặt.
 * - Ngoài production mặc định sandbox, chỉ gửi thật khi EMAIL_REAL_SEND==='true'.
 */
export function resolveSendPolicy(env = process.env, execArgv = process.execArgv) {
  const nodeEnv = String(env?.NODE_ENV || '').trim().toLowerCase()
  const inTestRunner = isNodeTestRunner(env, execArgv)
  const inAutoTest = isAutomatedTestEnvironment(env, execArgv)
  const isProduction = nodeEnv === 'production'
  const emailRealSend = String(env?.EMAIL_REAL_SEND || '').trim().toLowerCase() === 'true'
  const deliveryDisabled = String(env?.EMAIL_DELIVERY_DISABLED || '').trim().toLowerCase() === 'true'

  if (inAutoTest) {
    return { mode: 'test_mock', allowRealSend: false, inTestRunner, isProduction, reason: 'AUTOMATED_TEST_ENV' }
  }
  if (isProduction && inTestRunner) {
    return { mode: 'test_mock', allowRealSend: false, inTestRunner, isProduction, reason: 'NODE_TEST_RUNNER_LOCKED' }
  }
  if (deliveryDisabled) {
    return { mode: 'disabled_mock', allowRealSend: false, inTestRunner, isProduction, reason: 'EMAIL_DELIVERY_DISABLED' }
  }
  if (!isProduction && !emailRealSend) {
    return { mode: 'sandbox', allowRealSend: false, inTestRunner, isProduction, reason: 'NON_PROD_DEFAULT_SANDBOX' }
  }
  return {
    mode: 'live',
    allowRealSend: true,
    inTestRunner,
    isProduction,
    reason: isProduction ? 'PRODUCTION_LIVE' : 'DEV_EMAIL_REAL_SEND',
  }
}

/**
 * Điểm tiêm mock transport dùng riêng cho kiểm thử tự động (WP-B / WP-E)
 * Chỉ có hiệu lực khi đang chạy trong môi trường test tự động
 */
export function setEmailTransportForTests(transportFn) {
  if (isAutomatedTestEnvironment() || isNodeTestRunner()) {
    customTestTransport = transportFn
  } else {
    console.warn('⚠️ [EMAIL TRANSPORT] setEmailTransportForTests bị từ chối vì không nằm trong môi trường test.')
  }
}

function getLocalDevTransporter() {
  const user = (process.env.GMAIL_USER || '').trim()
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (!user || !pass) return null

  if (!localTransporter) {
    localTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })
  }
  return localTransporter
}

/**
 * Che dấu địa chỉ email để bảo vệ thông tin cá nhân trong nhật ký (ab***@gmail.com)
 */
export function maskEmail(email) {
  if (Array.isArray(email)) {
    return email.map((e) => maskEmail(e)).join(', ')
  }
  const str = String(email || '').trim()
  if (str.includes(',') || str.includes(';')) {
    return str
      .split(/[,;]/)
      .map((part) => maskEmail(part))
      .filter(Boolean)
      .join(', ')
  }
  const angle = str.match(/<([^>]+)>/)
  const clean = (angle ? angle[1] : str).trim()
  const at = clean.indexOf('@')
  if (at === -1) return '***'
  if (at <= 2) return '***' + clean.slice(at)
  return clean.slice(0, 2) + '***' + clean.slice(at)
}

/**
 * Ghi nhận nhật ký trạng thái gửi thư vào bảng email_outbox (Self-healing & Non-blocking)
 */
export function recordEmailOutbox({ id, purpose = 'TRANSACTIONAL', recipient, status, transport = null, errorCode = null }) {
  try {
    const db = getDb()
    if (!db) return
    const repRaw = Array.isArray(recipient) ? recipient.join(', ') : String(recipient || '')
    const masked = maskEmail(repRaw)
    const recHash = crypto.createHash('sha256').update(repRaw.trim().toLowerCase()).digest('hex')
    const now = Date.now()

    db.prepare(`
      INSERT INTO email_outbox (id, purpose, recipient_hash, recipient_masked, status, transport, error_code, attempts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        transport = excluded.transport,
        error_code = excluded.error_code,
        attempts = email_outbox.attempts + 1,
        updated_at = excluded.updated_at
    `).run(id, purpose, recHash, masked, status, transport, errorCode, now, now)
  } catch (err) {
    // Non-blocking outbox error
  }
}

/**
 * Kiểm tra EMAIL_REPLY_TO và RESEND_FROM_EMAIL qua hàm kiểm tra MX (WP-4.1).
 * Nếu tên miền không có MX => cảnh báo rõ và bỏ qua trường đó (không mặc định support@quannguyens.com).
 */
export async function validateEmailSenderHeaders(env = process.env) {
  const rawReplyTo = String(env?.EMAIL_REPLY_TO || '').trim()
  const rawResendFrom = String(env?.RESEND_FROM_EMAIL || '').trim()

  let replyTo = null
  let replyToReason = null
  const isProdEnv = String(env?.NODE_ENV || '').trim().toLowerCase() === 'production'
  if (rawReplyTo) {
    const cleanReplyTo = extractEmailAddress(rawReplyTo)
    const check = await checkEmailDeliverability(cleanReplyTo)
    const validForHeader =
      check.deliverable &&
      !check.dnsUnavailable &&
      !check.implicitMx &&
      (!isProdEnv || check.reason !== 'TEST_ENV_SKIPPED')
    if (validForHeader) {
      replyTo = cleanReplyTo
    } else {
      replyToReason = check.reason || (check.dnsUnavailable ? 'DNS_UNAVAILABLE' : 'NO_MX_RECORD')
      console.error(
        `🚨 [EMAIL HEADER GUARD] EMAIL_REPLY_TO="${maskEmail(cleanReplyTo)}" không đạt kiểm tra MX (${replyToReason}). Bỏ qua Reply-To tùy biến để tránh mất thư phản hồi của khách.`
      )
    }
  }

  let resendFrom = null
  let resendFromReason = null
  if (rawResendFrom) {
    const cleanFromAddr = extractEmailAddress(rawResendFrom)
    const check = await checkEmailDeliverability(cleanFromAddr)
    const validForHeader =
      check.deliverable &&
      !check.dnsUnavailable &&
      !check.implicitMx &&
      (!isProdEnv || check.reason !== 'TEST_ENV_SKIPPED')
    if (validForHeader) {
      resendFrom = rawResendFrom
    } else {
      resendFromReason = check.reason || (check.dnsUnavailable ? 'DNS_UNAVAILABLE' : 'NO_MX_RECORD')
      console.error(
        `🚨 [EMAIL HEADER GUARD] RESEND_FROM_EMAIL="${maskEmail(cleanFromAddr)}" không đạt kiểm tra MX (${resendFromReason}). Bỏ qua địa chỉ gửi Resend chưa sẵn sàng nhận/xác thực thư.`
      )
    }
  }

  return {
    replyTo,
    replyToConfigured: Boolean(rawReplyTo),
    replyToValid: Boolean(replyTo),
    replyToReason,
    resendFrom,
    resendFromConfigured: Boolean(rawResendFrom),
    resendFromValid: Boolean(resendFrom),
    resendFromReason,
  }
}

/**
 * Thống kê outbox 24 giờ gần nhất (WP-6.1 — không chứa email đầy đủ)
 */
export function getEmailOutboxStats24h(database = null, now = Date.now()) {
  const stats = {
    windowHours: 24,
    total: 0,
    sent: 0,
    sentUnverifiedDomain: 0,
    blockedMx: 0,
    blockedSynthetic: 0,
    suppressed: 0,
    sandboxed: 0,
    unknown: 0,
    failed: 0,
    other: 0,
  }
  let activeSuppressions = 0

  try {
    const db = database || getDb()
    if (!db) return { metrics24h: stats, activeSuppressions }

    const sinceMs = now - 24 * 60 * 60 * 1000
    const rows = db
      .prepare('SELECT status, COUNT(*) AS cnt FROM email_outbox WHERE created_at >= ? GROUP BY status')
      .all(sinceMs)

    for (const row of rows) {
      const count = Number(row.cnt) || 0
      stats.total += count
      switch (row.status) {
        case 'sent':
          stats.sent += count
          break
        case 'sent_unverified_domain':
          stats.sentUnverifiedDomain += count
          break
        case 'blocked_mx':
          stats.blockedMx += count
          break
        case 'blocked_synthetic':
          stats.blockedSynthetic += count
          break
        case 'suppressed':
          stats.suppressed += count
          break
        case 'sandboxed':
          stats.sandboxed += count
          break
        case 'unknown':
          stats.unknown += count
          break
        case 'failed':
          stats.failed += count
          break
        default:
          stats.other += count
          break
      }
    }

    try {
      const supRow = db.prepare('SELECT COUNT(*) AS cnt FROM email_suppressions WHERE is_active = 1').get()
      activeSuppressions = Number(supRow?.cnt) || 0
    } catch (_) {}
  } catch (_) {}

  return { metrics24h: stats, activeSuppressions }
}

function checkAndAlertEmailAnomalies(isProduction) {
  if (!isProduction) return
  try {
    const { metrics24h } = getEmailOutboxStats24h()
    if (metrics24h.sandboxed > 0) {
      logAlertWithCooldown(
        'SANDBOXED_IN_PROD',
        `Phát hiện ${metrics24h.sandboxed} thư ở trạng thái sandboxed trong 24h tại Production! Kiểm tra EMAIL_DELIVERY_DISABLED / NODE_ENV.`
      )
    }
    const blockedCount = metrics24h.blockedMx + metrics24h.blockedSynthetic + metrics24h.suppressed
    if (metrics24h.total >= 10 && blockedCount / metrics24h.total >= 0.3) {
      logAlertWithCooldown(
        'HIGH_BLOCK_RATE',
        `Tỷ lệ chặn email 24h tăng bất thường: ${blockedCount}/${metrics24h.total} (MX=${metrics24h.blockedMx}, Synthetic=${metrics24h.blockedSynthetic}, Suppressed=${metrics24h.suppressed}).`
      )
    }
  } catch (_) {}
}

function buildSuppressedError(details = []) {
  const err = new Error(
    'Địa chỉ email này hiện không thể nhận thư từ hệ thống. Vui lòng kiểm tra lại hoặc dùng một địa chỉ email khác (ví dụ: tenban@gmail.com).'
  )
  err.status = 400
  err.code = 'RECIPIENT_SUPPRESSED'
  err.details = details
  return err
}

/**
 * Gửi email qua HTTPS Port 443 — Tầng vận chuyển bọc thép (WP-B + Hardening)
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Địa chỉ nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} [options.html] - Nội dung HTML
 * @param {string} [options.text] - Nội dung text thuần
 * @param {string} [options.from] - Địa chỉ hoặc tên người gửi
 * @param {string} [options.fromName] - Tên hiển thị người gửi
 * @param {string} [options.requestId] - Mã định danh yêu cầu chống trùng lặp (Idempotency)
 * @param {string} [options.purpose] - Mục đích gửi (REGISTER_OTP, PASSWORD_RESET_OTP, v.v.)
 * @param {Object} [options.headers] - HTTP/Email Headers tùy biến
 * @returns {Promise<{ ok: boolean, success: boolean, transport: string, messageId: string, requestId: string, code?: string, sandboxed?: boolean }>}
 */
export async function sendEmailViaHttps(options) {
  try {
    if (!isNodeTestRunner() && !isAutomatedTestEnvironment() && !process.env.__ENV_LOADED && !options?._skipEnvLoad) {
      loadEnvironment()
      process.env.__ENV_LOADED = 'true'
    }
  } catch (_) {}

  const {
    to: rawTo,
    subject,
    html,
    text,
    fromName = 'QuanNguyenS',
    from,
    purpose = 'TRANSACTIONAL',
    headers = {},
  } = options

  if (!rawTo) {
    throw new Error('Thiếu địa chỉ email người nhận (to)')
  }
  if (!subject) {
    throw new Error('Thiếu tiêu đề email (subject)')
  }
  if (!html && !text) {
    throw new Error('Thiếu nội dung email (html hoặc text)')
  }

  const requestId = String(options.requestId || crypto.randomUUID())
  const policy = resolveSendPolicy(process.env, process.execArgv)
  const isProduction = policy.isProduction

  // ─────────────────────────────────────────────────────────────
  // CHỐT CHẶN CỨNG Ở MỌI MÔI TRƯỜNG (WP-2.2): Địa chỉ mẫu tổng hợp thuộc tên miền shop
  // ─────────────────────────────────────────────────────────────
  const normalizedList = normalizeRecipients(rawTo)
  if (normalizedList.length === 0) {
    recordEmailOutbox({ id: requestId, purpose, recipient: rawTo, status: 'blocked_mx', errorCode: 'INVALID_FORMAT' })
    const formatErr = new Error(UNDELIVERABLE_EMAIL_MESSAGE)
    formatErr.status = 400
    formatErr.code = 'UNDELIVERABLE_RECIPIENT'
    throw formatErr
  }

  const syntheticFound = normalizedList.filter((addr) => isSyntheticTestEmail(addr))
  const nonSyntheticList = normalizedList.filter((addr) => !isSyntheticTestEmail(addr))
  if (syntheticFound.length > 0) {
    if (isProduction) {
      logAlertWithCooldown(
        'SYNTHETIC_IN_PROD',
        `Phát hiện cố gắng gửi thư tới địa chỉ tổng hợp tại Production (${maskEmail(syntheticFound)}, purpose=${purpose}). Đã chặn tuyệt đối.`
      )
    }
    if (nonSyntheticList.length === 0) {
      recordEmailOutbox({
        id: requestId,
        purpose,
        recipient: syntheticFound,
        status: 'blocked_synthetic',
        errorCode: 'SYNTHETIC_TEST_RECIPIENT',
      })
      checkAndAlertEmailAnomalies(isProduction)
      const synErr = new Error(UNDELIVERABLE_EMAIL_MESSAGE)
      synErr.status = 400
      synErr.code = 'UNDELIVERABLE_RECIPIENT'
      synErr.details = syntheticFound.map((address) => ({ address, reason: 'SYNTHETIC_TEST_RECIPIENT' }))
      throw synErr
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 1: Kiểm tra cấu hình môi trường (Fail-Closed ở Production trước khi xét test lock)
  // ─────────────────────────────────────────────────────────────
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim()
  const rawResendFrom = (process.env.RESEND_FROM_EMAIL || '').trim()
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID)

  const hasValidResendConfig = Boolean(
    resendApiKey &&
    rawResendFrom &&
    (!isProduction || !rawResendFrom.toLowerCase().includes('@resend.dev'))
  )
  const hasGmailSmtp = Boolean(
    (process.env.GMAIL_USER || '').trim() &&
    (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  )

  if (isProduction && !hasValidResendConfig && !hasGmailSmtp) {
    const errorMsg = 'Hệ thống gửi email chưa được cấu hình. Thiếu GMAIL_APP_PASSWORD hoặc RESEND_API_KEY + RESEND_FROM_EMAIL hợp lệ.'
    console.error(`❌ [EMAIL CONFIG ERROR] ${errorMsg}`)
    recordEmailOutbox({ id: requestId, purpose, recipient: nonSyntheticList, status: 'failed', errorCode: 'EMAIL_NOT_CONFIGURED' })

    const configErr = new Error('Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.')
    configErr.status = 502
    configErr.code = 'EMAIL_NOT_CONFIGURED'
    throw configErr
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 2: Kiểm tra danh sách chặn bounce (email_suppressions) & tài khoản synthetic
  // ─────────────────────────────────────────────────────────────
  const unsuppressedRecipients = []
  const suppressedRecipients = []
  const syntheticDbRejected = []

  for (const addr of nonSyntheticList) {
    if (isSyntheticAccountEmail(addr)) {
      syntheticDbRejected.push(addr)
      continue
    }
    if (isEmailBounceSuppressed(addr)) {
      suppressedRecipients.push(addr)
      continue
    }
    unsuppressedRecipients.push(addr)
  }

  if (syntheticDbRejected.length > 0 && unsuppressedRecipients.length === 0 && suppressedRecipients.length === 0) {
    recordEmailOutbox({
      id: requestId,
      purpose,
      recipient: syntheticDbRejected,
      status: 'blocked_synthetic',
      errorCode: 'SYNTHETIC_ACCOUNT',
    })
    checkAndAlertEmailAnomalies(isProduction)
    const synDbErr = new Error(UNDELIVERABLE_EMAIL_MESSAGE)
    synDbErr.status = 400
    synDbErr.code = 'UNDELIVERABLE_RECIPIENT'
    throw synDbErr
  }

  if (suppressedRecipients.length > 0) {
    console.warn(`🛑 [EMAIL SUPPRESSION] Bỏ qua gửi tới ${maskEmail(suppressedRecipients)} (nằm trong email_suppressions).`)
  }
  if (unsuppressedRecipients.length === 0) {
    recordEmailOutbox({
      id: requestId,
      purpose,
      recipient: suppressedRecipients,
      status: 'suppressed',
      errorCode: 'RECIPIENT_SUPPRESSED',
    })
    checkAndAlertEmailAnomalies(isProduction)
    throw buildSuppressedError(suppressedRecipients.map((address) => ({ address: maskEmail(address), reason: 'SUPPRESSED' })))
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 3: Kiểm tra MX bắt buộc của tên miền nhận (chặn A-only & domain lỗi)
  // ─────────────────────────────────────────────────────────────
  const { deliverable, rejected, unverifiedDomainRecipients } = await partitionRecipients(unsuppressedRecipients)
  if (rejected.length > 0) {
    console.warn(`🚫 [EMAIL GUARD] Bỏ qua địa chỉ không nhận được thư: ${rejected.map((r) => `${maskEmail(r.address)} (${r.reason})`).join(', ')}`)
  }
  if (deliverable.length === 0) {
    const primaryReason = rejected[0]?.reason || 'NO_MX_RECORD'
    const outboxStatus = primaryReason === 'SYNTHETIC_TEST_RECIPIENT' ? 'blocked_synthetic' : 'blocked_mx'
    recordEmailOutbox({
      id: requestId,
      purpose,
      recipient: unsuppressedRecipients,
      status: outboxStatus,
      errorCode: primaryReason,
    })
    checkAndAlertEmailAnomalies(isProduction)

    const guardError = new Error(UNDELIVERABLE_EMAIL_MESSAGE)
    guardError.status = 400
    guardError.code = 'UNDELIVERABLE_RECIPIENT'
    guardError.details = rejected
    throw guardError
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 4A (WP-1.2): Khóa cứng mạng thật trong Test Runner (kể cả NODE_ENV='production')
  // Chạy SAU bước kiểm tra suppression/synthetic DB & MX để test bao phủ trọn chuỗi guard.
  // ─────────────────────────────────────────────────────────────
  if (policy.mode === 'test_mock') {
    const targetTo = deliverable.length === 1 ? deliverable[0] : deliverable
    if (customTestTransport && typeof customTestTransport === 'function') {
      const customRes = await customTestTransport({ ...options, to: targetTo, requestId })
      recordEmailOutbox({
        id: requestId,
        purpose,
        recipient: deliverable,
        status: 'sandboxed',
        transport: customRes?.transport || 'custom_test_mock',
      })
      return {
        ok: true,
        success: true,
        transport: customRes?.transport || 'custom_test_mock',
        sandboxed: true,
        messageId: customRes?.messageId || `mock_${Date.now()}`,
        requestId,
      }
    }
    console.log(`🧪 [EMAIL SANDBOX] Bỏ qua gửi thật trong Test Runner tới ${maskEmail(deliverable)} (Subject: ${subject})`)
    recordEmailOutbox({ id: requestId, purpose, recipient: deliverable, status: 'sandboxed', transport: 'test_mock' })
    return {
      ok: true,
      success: true,
      transport: 'test_mock',
      sandboxed: true,
      messageId: `mock_${Date.now()}`,
      requestId,
    }
  }

  if (policy.mode === 'disabled_mock' || (!isNodeTestRunner() && !isAutomatedTestEnvironment() && isEmailDeliveryDisabled())) {
    if (isProduction) {
      logAlertWithCooldown(
        'SANDBOXED_IN_PROD',
        `EMAIL_DELIVERY_DISABLED=true đang được bật trên Production! Thư tới ${maskEmail(deliverable)} bị giả lập.`
      )
    }
    console.warn(`⛔ [EMAIL DELIVERY DISABLED] Thư KHÔNG được gửi thật tới ${maskEmail(deliverable)} vì EMAIL_DELIVERY_DISABLED=true.`)
    recordEmailOutbox({ id: requestId, purpose, recipient: deliverable, status: 'sandboxed', transport: 'disabled_mock' })
    return {
      ok: true,
      success: true,
      transport: 'disabled_mock',
      sandboxed: true,
      messageId: `disabled_${Date.now()}`,
      requestId,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 4B (WP-1.1): Ngoài Production, mặc định KHÔNG gửi thật (sandbox có cảnh báo + outbox)
  // ─────────────────────────────────────────────────────────────
  if (policy.mode === 'sandbox') {
    console.warn(
      `⚠️ [EMAIL SANDBOX] Thư KHÔNG được gửi thật tới ${maskEmail(deliverable)} vì NODE_ENV="${process.env.NODE_ENV || 'development'}" (không ở production) và EMAIL_REAL_SEND chưa đặt 'true'.`
    )
    recordEmailOutbox({
      id: requestId,
      purpose,
      recipient: deliverable,
      status: 'sandboxed',
      transport: 'sandbox',
    })
    return {
      ok: true,
      success: true,
      transport: 'sandbox',
      sandboxed: true,
      messageId: `sandbox_${Date.now()}`,
      requestId,
    }
  }

  // Khi EMAIL_REAL_SEND=true ở non-prod: vẫn phải có ít nhất 1 transport hợp lệ
  if (!hasValidResendConfig && !hasGmailSmtp) {
    const errorMsg = 'Hệ thống gửi email chưa được cấu hình. Thiếu GMAIL_APP_PASSWORD hoặc RESEND_API_KEY hợp lệ.'
    console.error(`❌ [EMAIL CONFIG ERROR] ${errorMsg}`)
    recordEmailOutbox({ id: requestId, purpose, recipient: deliverable, status: 'failed', errorCode: 'EMAIL_NOT_CONFIGURED' })

    const configErr = new Error('Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.')
    configErr.status = 502
    configErr.code = 'EMAIL_NOT_CONFIGURED'
    throw configErr
  }

  const headerValidation = await validateEmailSenderHeaders(process.env)
  const validatedReplyTo = headerValidation.replyTo
  const validatedResendFrom = headerValidation.resendFrom
  const hasUnverifiedDomain = unverifiedDomainRecipients.length > 0
  const sentStatus = hasUnverifiedDomain ? 'sent_unverified_domain' : 'sent'

  const to = deliverable.length === 1 ? deliverable[0] : deliverable
  const errors = []

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 2: Resend HTTP API (Port 443)
  // Chỉ kích hoạt khi chắc chắn chưa gửi được qua GAS và RESEND_FROM_EMAIL có MX hợp lệ
  // ─────────────────────────────────────────────────────────────
  if (hasValidResendConfig && validatedResendFrom) {
    try {
      console.log(`📡 [EMAIL TRANSPORT 2] Đang chuyển tiếp qua Resend API tới: ${maskEmail(to)}...`)
      const targetList = Array.isArray(to) ? to : [to]

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          from: validatedResendFrom,
          to: targetList,
          subject,
          html: html || text,
          text: text || undefined,
          ...(validatedReplyTo ? { reply_to: validatedReplyTo } : {}),
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }),
        signal: AbortSignal.timeout(15000),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.id) {
        console.log(`✅ [EMAIL TRANSPORT 2: RESEND] Gửi thành công tới ${maskEmail(to)} (MessageId: ${data.id})`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: sentStatus, transport: 'resend' })
        return {
          ok: true,
          success: true,
          transport: 'resend',
          messageId: data.id,
          requestId,
          code: 'OK',
        }
      }

      const resendErr = data?.message || data?.error || `HTTP ${res.status}`
      console.warn(`⚠️ [RESEND REJECTED]: ${resendErr}`)
      errors.push(`Resend API: ${resendErr}`)
      recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'failed', transport: 'resend', errorCode: 'RESEND_REJECTED' })
    } catch (resendErr) {
      console.warn(`⚠️ [RESEND EXCEPTION]: ${resendErr.message}`)
      errors.push(`Resend Exception: ${resendErr.message}`)
    }
  } else if (hasValidResendConfig && !validatedResendFrom) {
    errors.push('Resend API: Bỏ qua vì RESEND_FROM_EMAIL thuộc tên miền chưa có bản ghi MX hợp lệ')
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 3: Gmail SMTP (Chính thức qua Google Account / App Password)
  // Gửi trực tiếp qua smtp.gmail.com:465 SSL, hỗ trợ mọi môi trường (Local & Render)
  // ─────────────────────────────────────────────────────────────
  if (hasGmailSmtp) {
    const transporter = getLocalDevTransporter()
    if (transporter) {
      try {
        console.log(`📡 [EMAIL TRANSPORT GMAIL] Đang gửi qua Gmail SMTP tới: ${maskEmail(to)}...`)
        const user = (process.env.GMAIL_USER || 'quannguyens403@gmail.com').trim()
        const fromHeader = from || `"${fromName}" <${user}>`
        const info = await transporter.sendMail({
          from: fromHeader,
          to,
          subject,
          html,
          text,
          ...(validatedReplyTo ? { replyTo: validatedReplyTo } : {}),
        })
        console.log(`✅ [EMAIL TRANSPORT GMAIL: SMTP] Gửi thành công tới ${maskEmail(to)}`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: sentStatus, transport: 'gmail_smtp' })
        return {
          ok: true,
          success: true,
          transport: 'gmail_smtp',
          messageId: info.messageId || `smtp_${Date.now()}`,
          requestId,
          code: 'OK',
        }
      } catch (smtpErr) {
        console.warn(`⚠️ [GMAIL SMTP ERROR]: ${smtpErr.message}`)
        errors.push(`Gmail SMTP: ${smtpErr.message}`)
      }
    }
  }

  // Tất cả transport đều thất bại
  const errorDetails = errors.length > 0 ? errors.join('; ') : 'Tất cả các tầng gửi email đều thất bại'
  console.error(`❌ [EMAIL DISPATCH FAILED] Không thể gửi email tới ${maskEmail(to)}. Chi tiết: ${errorDetails}`)
  recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'failed', errorCode: 'ALL_TRANSPORTS_EXHAUSTED' })

  const publicError = new Error('Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.')
  publicError.status = 502
  publicError.code = 'EMAIL_DELIVERY_FAILED'
  publicError.details = errorDetails
  publicError.requestId = requestId
  throw publicError
}

/**
 * Kiểm tra trạng thái cấu hình và chỉ số vận hành 24 giờ của hệ thống Email HTTPS (WP-B B9 + WP-6)
 * Tuyệt đối không lộ secret hoặc email đầy đủ.
 */
export function getEmailServiceStatus() {
  try {
    if (!isNodeTestRunner() && !isAutomatedTestEnvironment()) {
      loadEnvironment()
    }
  } catch (_) {}

  const resendKey = (process.env.RESEND_API_KEY || '').trim()
  const resendFrom = (process.env.RESEND_FROM_EMAIL || '').trim()
  const policy = resolveSendPolicy(process.env, process.execArgv)
  const isProduction = policy.isProduction
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID)
  const smtpReady = Boolean((process.env.GMAIL_USER || '').trim() && (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''))
  const resendReady = Boolean(resendKey && resendFrom && (!isProduction || !resendFrom.toLowerCase().includes('@resend.dev')))

  const { metrics24h, activeSuppressions } = getEmailOutboxStats24h()
  checkAndAlertEmailAnomalies(isProduction)

  return {
    resendConfigured: Boolean(resendKey),
    resendDomainVerified: Boolean(resendFrom && !resendFrom.toLowerCase().includes('@resend.dev')),
    smtpConfigured: smtpReady,
    replyToConfigured: Boolean((process.env.EMAIL_REPLY_TO || '').trim()),
    sendMode: policy.mode,
    realSendAllowed: policy.allowRealSend,
    ready: Boolean(resendReady || smtpReady || policy.mode === 'test_mock'),
    isRender,
    metrics24h,
    activeSuppressions,
  }
}

export default {
  sendEmailViaHttps,
  getEmailServiceStatus,
  getEmailOutboxStats24h,
  validateEmailSenderHeaders,
  resolveSendPolicy,
  setEmailTransportForTests,
  maskEmail,
  recordEmailOutbox,
  __resetEmailAlertCooldownsForTests,
}
