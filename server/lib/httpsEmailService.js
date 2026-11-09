import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { loadEnvironment } from './envCheck.js'
import {
  isAutomatedTestEnvironment,
  isEmailDeliveryDisabled,
  partitionRecipients,
  UNDELIVERABLE_EMAIL_MESSAGE,
} from './emailRecipientGuard.js'
import { getDb } from './accountDb.js'

let localTransporter = null
let customTestTransport = null

/**
 * Điểm tiêm mock transport dùng riêng cho kiểm thử tự động (WP-B / WP-E)
 * Chỉ có hiệu lực khi đang chạy trong môi trường test tự động (isAutomatedTestEnvironment = true)
 */
export function setEmailTransportForTests(transportFn) {
  if (isAutomatedTestEnvironment()) {
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
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    })
  }
  return localTransporter
}

/**
 * Che dấu địa chỉ email để bảo vệ thông tin cá nhân trong nhật ký (ab***@gmail.com)
 */
export function maskEmail(email) {
  const str = String(email || '').trim()
  const at = str.indexOf('@')
  if (at === -1) return '***'
  if (at <= 2) return '***' + str.slice(at)
  return str.slice(0, 2) + '***' + str.slice(at)
}

/**
 * Ghi nhận nhật ký trạng thái gửi thư vào bảng email_outbox (Self-healing & Non-blocking)
 */
export function recordEmailOutbox({ id, purpose = 'TRANSACTIONAL', recipient, status, transport = null, errorCode = null }) {
  try {
    const db = getDb()
    if (!db) return
    const masked = maskEmail(recipient)
    const recHash = crypto.createHash('sha256').update(String(recipient).toLowerCase()).digest('hex')
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
 * Gửi email qua HTTPS Port 443 — Tầng vận chuyển bọc thép (WP-B)
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
 * @returns {Promise<{ ok: boolean, success: boolean, transport: string, messageId: string, requestId: string, code?: string }>}
 */
export async function sendEmailViaHttps(options) {
  try {
    if (!process.env.__ENV_LOADED && !options?._skipEnvLoad) {
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

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 0: Môi trường Test tự động
  // ─────────────────────────────────────────────────────────────
  if (isAutomatedTestEnvironment()) {
    if (customTestTransport && typeof customTestTransport === 'function') {
      const customRes = await customTestTransport({ ...options, requestId })
      return {
        ok: true,
        success: true,
        transport: customRes.transport || 'custom_test_mock',
        messageId: customRes.messageId || `mock_${Date.now()}`,
        requestId,
      }
    }

    console.log(`🧪 [EMAIL SANDBOX] Bỏ qua gửi thật tới ${rawTo} (Subject: ${subject})`)
    return {
      ok: true,
      success: true,
      transport: 'test_mock',
      messageId: `mock_${Date.now()}`,
      requestId,
    }
  }

  if (isEmailDeliveryDisabled()) {
    console.log(`⛔ [EMAIL DELIVERY DISABLED] Đã cấu hình tắt gửi email thật (To: ${rawTo})`)
    return {
      ok: true,
      success: true,
      transport: 'disabled_mock',
      messageId: `disabled_${Date.now()}`,
      requestId,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 1: Kiểm tra cấu hình môi trường (Fail-Closed ở Production)
  // ─────────────────────────────────────────────────────────────
  const gasUrl = (
    process.env.GAS_EMAIL_WEBHOOK_URL ||
    process.env.GMAIL_APP_SCRIPT_URL ||
    process.env.GMAIL_BRIDGE_WEBHOOK_URL ||
    ''
  ).trim()

  const gasSecret = (
    process.env.GAS_WEBHOOK_SECRET ||
    process.env.GMAIL_BRIDGE_SECRET ||
    ''
  ).trim()

  const resendApiKey = (process.env.RESEND_API_KEY || '').trim()
  const resendFrom = (process.env.RESEND_FROM_EMAIL || '').trim()
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID)
  const isProduction = process.env.NODE_ENV === 'production'

  // Kiểm tra tính sẵn sàng của transport
  const hasValidGas = Boolean(gasUrl && gasUrl.startsWith('https://') && gasSecret)
  const hasValidResend = Boolean(
    resendApiKey &&
    (!isProduction || (resendFrom && !resendFrom.includes('@resend.dev')))
  )
  const hasLocalSmtp = Boolean(!isRender && !isProduction && getLocalDevTransporter())

  if (!hasValidGas && !hasValidResend && !hasLocalSmtp) {
    const errorMsg = 'Hệ thống gửi email chưa được cấu hình. Thiếu GAS_EMAIL_WEBHOOK_URL + GAS_WEBHOOK_SECRET hoặc RESEND_API_KEY hợp lệ.'
    console.error(`❌ [EMAIL CONFIG ERROR] ${errorMsg}`)
    recordEmailOutbox({ id: requestId, purpose, recipient: rawTo, status: 'failed', errorCode: 'EMAIL_NOT_CONFIGURED' })

    const configErr = new Error('Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.')
    configErr.status = 502
    configErr.code = 'EMAIL_NOT_CONFIGURED'
    throw configErr
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 2: Kiểm tra khả năng nhận thư của địa chỉ nhận
  // ─────────────────────────────────────────────────────────────
  const { deliverable, rejected } = await partitionRecipients(rawTo)
  if (rejected.length > 0) {
    console.warn(`🚫 [EMAIL GUARD] Bỏ qua địa chỉ không nhận được thư: ${rejected.map((r) => `${r.address} (${r.reason})`).join(', ')}`)
  }
  if (deliverable.length === 0) {
    const guardError = new Error(UNDELIVERABLE_EMAIL_MESSAGE)
    guardError.status = 400
    guardError.code = 'UNDELIVERABLE_RECIPIENT'
    guardError.details = rejected
    recordEmailOutbox({ id: requestId, purpose, recipient: rawTo, status: 'failed', errorCode: 'UNDELIVERABLE_RECIPIENT' })
    throw guardError
  }
  const to = deliverable.length === 1 ? deliverable[0] : deliverable

  const errors = []

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 1: Google Apps Script HTTPS Bridge (Port 443)
  // ─────────────────────────────────────────────────────────────
  if (hasValidGas) {
    const gasTimeoutMs = parseInt(process.env.EMAIL_GAS_TIMEOUT_MS || '25000', 10)
    try {
      console.log(`📡 [EMAIL TRANSPORT 1] Đang gửi qua Google Apps Script Webhook tới: ${maskEmail(to)} (RequestId: ${requestId})...`)
      const payload = {
        action: 'SEND_EMAIL',
        secret: gasSecret,
        requestId,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: html || text,
        text: text || undefined,
        name: fromName,
        fromName,
        timestamp: Date.now(),
      }

      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: AbortSignal.timeout(gasTimeoutMs),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data && (data.success === true || data.status === 'success' || data.code === 'OK')) {
          console.log(`✅ [EMAIL TRANSPORT 1: GAS] Gửi thành công tới ${maskEmail(to)}`)
          recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'sent', transport: 'google_apps_script' })
          return {
            ok: true,
            success: true,
            transport: 'google_apps_script',
            messageId: data.messageId || `gas_${Date.now()}`,
            requestId,
            code: 'OK',
          }
        }

        const errCode = data?.code || 'GAS_REJECTED'
        const errMsg = data?.error || 'Google Apps Script trả về success=false'
        console.warn(`⚠️ [GAS REJECTED]: [${errCode}] ${errMsg}`)
        errors.push(`Google Apps Script: [${errCode}] ${errMsg}`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'failed', transport: 'google_apps_script', errorCode: errCode })
      } else {
        const statusText = `HTTP ${res.status} ${res.statusText}`
        console.warn(`⚠️ [GAS HTTP ERROR]: ${statusText}`)
        errors.push(`Google Apps Script HTTP: ${statusText}`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'failed', transport: 'google_apps_script', errorCode: `HTTP_${res.status}` })
      }
    } catch (gasErr) {
      console.warn(`⚠️ [GAS EXCEPTION]: ${gasErr.message}`)

      // WP-B B2: Phân loại lỗi KHÔNG RÕ (Timeout / Network abort sau khi đã gửi request)
      const isTimeout = gasErr.name === 'TimeoutError' || gasErr.name === 'AbortError' || /timeout|aborted/i.test(gasErr.message)
      if (isTimeout) {
        console.warn(`⚠️ [GAS UNKNOWN DELIVERY] Request gửi tới Apps Script đã timeout sau ${gasTimeoutMs}ms. Không thể chắc chắn thư đã đến Google hay chưa. Dừng gửi fallback để chống gửi trùng mã.`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'unknown', transport: 'google_apps_script', errorCode: 'TIMEOUT' })

        const unknownErr = new Error('Quá thời gian kết nối tới máy chủ gửi email. Yêu cầu đang được xử lý, quý khách vui lòng kiểm tra hòm thư sau ít phút.')
        unknownErr.status = 504
        unknownErr.code = 'UNKNOWN_DELIVERY'
        unknownErr.isUnknown = true
        unknownErr.requestId = requestId
        throw unknownErr
      }

      errors.push(`Google Apps Script Exception: ${gasErr.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 2: Resend HTTP API (Port 443)
  // Chỉ kích hoạt khi chắc chắn chưa gửi được qua GAS
  // ─────────────────────────────────────────────────────────────
  if (hasValidResend) {
    try {
      console.log(`📡 [EMAIL TRANSPORT 2] Đang chuyển tiếp qua Resend API tới: ${maskEmail(to)}...`)
      const senderFrom = resendFrom || 'QuanNguyenS <support@quannguyens.com>'
      const targetList = Array.isArray(to) ? to : [to]

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId,
        },
        body: JSON.stringify({
          from: senderFrom,
          to: targetList,
          subject,
          html: html || text,
          text: text || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }),
        signal: AbortSignal.timeout(15000),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.id) {
        console.log(`✅ [EMAIL TRANSPORT 2: RESEND] Gửi thành công tới ${maskEmail(to)} (MessageId: ${data.id})`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'sent', transport: 'resend' })
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
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 3: Fallback Localhost Dev SMTP (Chỉ khi dev local, không chạy trên Render)
  // ─────────────────────────────────────────────────────────────
  if (hasLocalSmtp) {
    const transporter = getLocalDevTransporter()
    if (transporter) {
      try {
        console.log(`📡 [EMAIL TRANSPORT 3] Thử gửi qua Local SMTP tới: ${maskEmail(to)}...`)
        const user = (process.env.GMAIL_USER || 'quannguyens403@gmail.com').trim()
        const fromHeader = from || `"${fromName}" <${user}>`
        const info = await transporter.sendMail({
          from: fromHeader,
          to,
          subject,
          html,
          text,
        })
        console.log(`✅ [EMAIL TRANSPORT 3: LOCAL SMTP] Gửi thành công tới ${maskEmail(to)}`)
        recordEmailOutbox({ id: requestId, purpose, recipient: to, status: 'sent', transport: 'local_smtp' })
        return {
          ok: true,
          success: true,
          transport: 'local_smtp',
          messageId: info.messageId || `smtp_${Date.now()}`,
          requestId,
          code: 'OK',
        }
      } catch (smtpErr) {
        console.warn(`⚠️ [LOCAL SMTP ERROR]: ${smtpErr.message}`)
        errors.push(`Local SMTP: ${smtpErr.message}`)
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
 * Kiểm tra trạng thái cấu hình của hệ thống Email HTTPS (WP-B B9: Tuyệt đối không lộ secret)
 */
export function getEmailServiceStatus() {
  try {
    loadEnvironment()
  } catch (_) {}

  const gasUrl = (
    process.env.GAS_EMAIL_WEBHOOK_URL ||
    process.env.GMAIL_APP_SCRIPT_URL ||
    process.env.GMAIL_BRIDGE_WEBHOOK_URL ||
    ''
  ).trim()

  const gasSecret = (
    process.env.GAS_WEBHOOK_SECRET ||
    process.env.GMAIL_BRIDGE_SECRET ||
    ''
  ).trim()

  const resendKey = (process.env.RESEND_API_KEY || '').trim()
  const resendFrom = (process.env.RESEND_FROM_EMAIL || '').trim()
  const isProduction = process.env.NODE_ENV === 'production'

  const gasReady = Boolean(gasUrl && gasUrl.startsWith('https://') && gasSecret)
  const resendReady = Boolean(resendKey && (!isProduction || (resendFrom && !resendFrom.includes('@resend.dev'))))

  return {
    gasConfigured: Boolean(gasUrl && gasUrl.startsWith('https://')),
    gasSecretConfigured: Boolean(gasSecret),
    resendConfigured: Boolean(resendKey),
    resendDomainVerified: Boolean(resendFrom && !resendFrom.includes('@resend.dev')),
    ready: Boolean(gasReady || resendReady || process.env.NODE_ENV === 'test'),
    isRender: Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID),
  }
}

export default {
  sendEmailViaHttps,
  getEmailServiceStatus,
  setEmailTransportForTests,
  maskEmail,
  recordEmailOutbox,
}
