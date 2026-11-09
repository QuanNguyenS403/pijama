import nodemailer from 'nodemailer'
import { loadEnvironment } from './envCheck.js'
import {
  isAutomatedTestEnvironment,
  isEmailDeliveryDisabled,
  partitionRecipients,
  UNDELIVERABLE_EMAIL_MESSAGE,
} from './emailRecipientGuard.js'

let localTransporter = null

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
 * Gửi email qua HTTPS Port 443 — Cơ chế Dual-Transport siêu bền vững
 * Vượt 100% tường lửa chặn outbound SMTP (Port 25/465/587) của Render Free Tier
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Địa chỉ nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.html - Nội dung HTML
 * @param {string} [options.text] - Nội dung text thuần
 * @param {string} [options.from] - Địa chỉ hoặc tên người gửi
 * @param {string} [options.fromName] - Tên hiển thị người gửi
 * @returns {Promise<{ success: boolean, transport: string, messageId: string }>}
 */
export async function sendEmailViaHttps(options) {
  try {
    loadEnvironment()
  } catch (_) {}

  const { to: rawTo, subject, html, text, fromName = 'QuanNguyenS', from } = options
  if (!rawTo) {
    throw new Error('Thiếu địa chỉ email người nhận (to)')
  }
  if (!subject) {
    throw new Error('Thiếu tiêu đề email (subject)')
  }
  if (!html && !text) {
    throw new Error('Thiếu nội dung email (html hoặc text)')
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 0: Không bao giờ gửi email thật khi đang chạy test tự động
  // (trước đây `npm test` gửi OTP thật tới otp_register_xxx@quannguyens.com -> bounce)
  // ─────────────────────────────────────────────────────────────
  if (isAutomatedTestEnvironment() || isEmailDeliveryDisabled()) {
    console.log(`🧪 [EMAIL SANDBOX] Bỏ qua gửi thật tới ${rawTo} (Subject: ${subject})`)
    return {
      success: true,
      transport: 'test_mock',
      messageId: `mock_${Date.now()}`,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CHỐT AN TOÀN 1: Loại bỏ địa chỉ không thể nhận thư (domain test, không có MX...)
  // tránh bounce làm giảm uy tín hộp thư gửi
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
    throw guardError
  }
  const to = deliverable.length === 1 ? deliverable[0] : deliverable

  const errors = []

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 1: Google Apps Script HTTPS Bridge (Port 443)
  // Gửi từ quannguyens403@gmail.com qua Webhook script.google.com
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
    'QNS_WEBHOOK_SECRET_2026'
  ).trim()

  if (gasUrl && gasUrl.startsWith('https://')) {
    try {
      console.log(`📡 [EMAIL TRANSPORT 1] Đang gửi qua Google Apps Script HTTPS Webhook tới: ${to}...`)
      const payload = {
        action: 'SEND_EMAIL',
        secret: gasSecret,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: html || text,
        name: fromName,
      }

      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: AbortSignal.timeout(15000), // Timeout 15s chuẩn theo yêu cầu
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data && (data.success === true || data.status === 'success')) {
          console.log(`✅ [EMAIL TRANSPORT 1: GAS] Gửi thành công tới ${to} (MessageId: gas_${Date.now()})`)
          return {
            success: true,
            transport: 'google_apps_script',
            messageId: `gas_${Date.now()}`,
          }
        }
        const errMsg = data?.error || 'Google Apps Script trả về success=false'
        console.warn(`⚠️ [GAS REJECTED]: ${errMsg}`)
        errors.push(`Google Apps Script: ${errMsg}`)
      } else {
        const statusText = `HTTP ${res.status} ${res.statusText}`
        console.warn(`⚠️ [GAS HTTP ERROR]: ${statusText}`)
        errors.push(`Google Apps Script HTTP: ${statusText}`)
      }
    } catch (gasErr) {
      console.warn(`⚠️ [GAS EXCEPTION]: ${gasErr.message}`)
      errors.push(`Google Apps Script Exception: ${gasErr.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 2: Resend HTTP API (Port 443)
  // Gửi từ domain riêng qua https://api.resend.com/emails
  // ─────────────────────────────────────────────────────────────
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim()
  if (resendApiKey) {
    try {
      console.log(`📡 [EMAIL TRANSPORT 2] Đang gửi qua Resend HTTP API tới: ${to}...`)
      const resendFrom = (process.env.RESEND_FROM_EMAIL || 'QuanNguyenS <onboarding@resend.dev>').trim()
      const targetList = Array.isArray(to) ? to : [to]

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: targetList,
          subject,
          html: html || text,
          text: text || undefined,
        }),
        signal: AbortSignal.timeout(15000),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.id) {
        console.log(`✅ [EMAIL TRANSPORT 2: RESEND] Gửi thành công tới ${to} (MessageId: ${data.id})`)
        return {
          success: true,
          transport: 'resend',
          messageId: data.id,
        }
      }

      const resendErr = data?.message || data?.error || `HTTP ${res.status}`
      console.warn(`⚠️ [RESEND REJECTED]: ${resendErr}`)
      errors.push(`Resend API: ${resendErr}`)
    } catch (resendErr) {
      console.warn(`⚠️ [RESEND EXCEPTION]: ${resendErr.message}`)
      errors.push(`Resend Exception: ${resendErr.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ƯU TIÊN 3: Fallback Localhost Dev (Chỉ chạy khi không ở trên Render)
  // ─────────────────────────────────────────────────────────────
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID)
  if (!isRender && process.env.NODE_ENV !== 'production') {
    const transporter = getLocalDevTransporter()
    if (transporter) {
      try {
        console.log(`📡 [EMAIL TRANSPORT 3] Thử gửi qua Localhost SMTP tới: ${to}...`)
        const user = (process.env.GMAIL_USER || 'quannguyens403@gmail.com').trim()
        const fromHeader = from || `"${fromName}" <${user}>`
        const info = await transporter.sendMail({
          from: fromHeader,
          to,
          subject,
          html,
          text,
        })
        console.log(`✅ [EMAIL TRANSPORT 3: LOCAL SMTP] Gửi thành công tới ${to}`)
        return {
          success: true,
          transport: 'local_smtp',
          messageId: info.messageId || `smtp_${Date.now()}`,
        }
      } catch (smtpErr) {
        console.warn(`⚠️ [LOCAL SMTP ERROR]: ${smtpErr.message}`)
        errors.push(`Local SMTP: ${smtpErr.message}`)
      }
    }
  }

  // Chế độ Test tự động (AUTH_TEST_MODE)
  if (process.env.AUTH_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    console.log(`🧪 [TEST MODE MOCK EMAIL] Gửi mail giả lập tới ${to} (Subject: ${subject})`)
    return {
      success: true,
      transport: 'test_mock',
      messageId: `mock_${Date.now()}`,
    }
  }

  // Tất cả transport đều thất bại hoặc chưa cấu hình biến môi trường
  const errorDetails = errors.length > 0 ? errors.join('; ') : 'Chưa cấu hình biến môi trường GAS_EMAIL_WEBHOOK_URL hoặc RESEND_API_KEY'
  console.error(`❌ [EMAIL DISPATCH FAILED] Không thể gửi email tới ${to}. Chi tiết: ${errorDetails}`)

  const publicError = new Error('Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.')
  publicError.status = 502
  publicError.details = errorDetails
  throw publicError
}

/**
 * Kiểm tra trạng thái cấu hình của hệ thống Email HTTPS
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
  const resendKey = (process.env.RESEND_API_KEY || '').trim()

  return {
    gasConfigured: Boolean(gasUrl && gasUrl.startsWith('https://')),
    resendConfigured: Boolean(resendKey),
    ready: Boolean(gasUrl || resendKey || process.env.NODE_ENV === 'test'),
    isRender: Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID),
  }
}

export default {
  sendEmailViaHttps,
  getEmailServiceStatus,
}
