import { generateUnsubscribeToken } from './authCrypto.js'
import crypto from 'crypto'
import { loadEnvironment } from './envCheck.js'
import { sendEmailViaHttps } from './httpsEmailService.js'

const SHOP_NAME = process.env.SHOP_NAME || 'QuanNguyenS'
const SHOP_PHONE = process.env.SHOP_PHONE || '0973 486 218'
const SHOP_ADDRESS = process.env.SHOP_ADDRESS || 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội'
const APP_URL = process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000'

function getSenderEmail() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      loadEnvironment()
    }
  } catch (_) {}
  return (process.env.GMAIL_USER || 'quannguyens403@gmail.com').trim()
}

/**
 * Helper an toàn escape HTML chống tấn công Stored XSS / HTML Injection qua tên khách hàng
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Bộ phát email bọc thép (Multi-Transport Resilient Email Dispatcher)
 * Tự động gửi qua HTTPS Port 443 (Google Apps Script Webhook / Resend API)
 * Vượt 100% tường lửa chặn SMTP Render
 * Chuyển tiếp text, headers và purpose (WP-B B7)
 */
async function dispatchEmail(mailOptions) {
  const fromName = mailOptions.from
    ? mailOptions.from.replace(/<.*>/, '').replace(/"/g, '').trim()
    : SHOP_NAME

  return await sendEmailViaHttps({
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
    text: mailOptions.text,
    from: mailOptions.from,
    fromName,
    headers: mailOptions.headers,
    purpose: mailOptions.purpose,
  })
}


/**
 * Gửi mã xác minh 6 số (chống tài khoản rác cho Google / Facebook / Email)
 * Tuân thủ WP-B B5: escape HTML, không đưa OTP vào subject, có text thuần
 */
export async function sendVerificationCodeEmail({ to, code, name = 'Quý khách' }) {
  const cleanCode = String(code || '').trim()
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Mã OTP xác thực không đúng định dạng 6 chữ số')
  }

  const user = getSenderEmail()
  const safeName = escapeHtml(name)
  const safeCode = escapeHtml(cleanCode)

  const text = `Kính gửi ${name},

Cảm ơn bạn đã quan tâm và khởi tạo tài khoản thành viên tại ${SHOP_NAME}.
Mã xác minh của bạn: ${cleanCode}
(Hiệu lực trong 10 phút, tối đa 5 lần thử)

Lưu ý bảo mật: Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.

${SHOP_NAME} — Style to be lived in
Hotline: ${SHOP_PHONE} · Email: ${user}
`

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã Xác Minh Tài Khoản — ${escapeHtml(SHOP_NAME)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    ${escapeHtml(SHOP_NAME)}
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Style to be lived in
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${safeName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Cảm ơn bạn đã quan tâm và khởi tạo tài khoản thành viên tại <strong>${escapeHtml(SHOP_NAME)}</strong>. Để bảo mật tài khoản và nhận ngay <strong>Voucher giảm 10% + Miễn phí vận chuyển cho đơn hàng đầu tiên</strong>, vui lòng nhập mã xác minh dưới đây:
                  </p>

                  <!-- 6-digit Code Box -->
                  <div style="margin: 28px 0; padding: 22px 16px; background-color: #FFFFFF; border: 1.5px dashed #D4AF37; border-radius: 4px; text-align: center;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C7E74; margin-bottom: 8px; font-weight: 600;">
                      MÃ XÁC MINH CỦA BẠN
                    </span>
                    <span style="font-family: 'Georgia', monospace, sans-serif; font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #631521; display: inline-block;">
                      ${safeCode}
                    </span>
                    <span style="display: block; font-size: 12px; color: #8C7E74; margin-top: 10px;">
                      ⏱ Hiệu lực trong <strong>10 phút</strong> · Tối đa 5 lần thử
                    </span>
                  </div>

                  <!-- Notes -->
                  <div style="background-color: #FAF5F0; border-left: 3px solid #631521; padding: 12px 14px; border-radius: 2px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #631521;">
                      🔒 <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên chăm sóc khách hàng.
                    </p>
                  </div>

                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #4A3F38;">
                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay hotline <strong>${escapeHtml(SHOP_PHONE)}</strong> để được hỗ trợ.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${escapeHtml(SHOP_NAME)} — Style to be lived in
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${escapeHtml(SHOP_PHONE)} · Email: ${escapeHtml(user)}
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    ${escapeHtml(SHOP_ADDRESS)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `[${SHOP_NAME}] Mã xác thực đăng ký tài khoản`,
    html,
    text,
    purpose: 'REGISTER_OTP',
  })
}

/**
 * Gửi email chúc mừng & tặng mã Voucher chào mừng 10% + Freeship
 */
export async function sendWelcomeVoucherEmail({ to, code, name = 'Quý khách' }) {
  // Đã chuyển sang getResilientSmtpTransporter() và HTTPS Bridge bên trong dispatchEmail
  const user = getSenderEmail()

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Voucher Chào Mừng Thành Viên — QuanNguyenS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    QuanNguyenS
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Đặc Quyền Thành Viên Mới
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <h2 style="font-family: 'Georgia', serif; font-size: 20px; color: #631521; margin: 0 0 14px 0; text-align: center;">
                    🎉 Chúc Mừng Bạn Đã Kích Hoạt Tài Khoản Thành Công!
                  </h2>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A3F38; text-align: center;">
                    Chào mừng <strong>${name}</strong> gia nhập cùng QuanNguyenS. Dưới đây là món quà chào mừng dành riêng cho đơn hàng đầu tiên của bạn:
                  </p>

                  <!-- Luxury Voucher Card -->
                  <div style="margin: 28px 0; padding: 24px; background: linear-gradient(135deg, #FFFDF9 0%, #FAF2E8 100%); border: 2px solid #D4AF37; border-radius: 4px; text-align: center; box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.15);">
                    <div style="display: inline-block; background-color: #631521; color: #FAF8F5; font-size: 10px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; padding: 4px 12px; border-radius: 2px; margin-bottom: 12px;">
                      ƯU ĐÃI ĐỘC QUYỀN
                    </div>
                    <span style="display: block; font-family: 'Georgia', serif; font-size: 28px; font-weight: bold; color: #631521; letter-spacing: 2px; margin-bottom: 8px;">
                      ${code}
                    </span>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #2E7D32;">
                      ✓ Giảm 10% toàn bộ đơn hàng · Miễn phí vận chuyển toàn quốc
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #8C7E74;">
                      Áp dụng duy nhất 01 lần cho đơn hàng đầu tiên của tài khoản này
                    </p>
                  </div>

                  <!-- How to use -->
                  <div style="background-color: #FAF8F5; border: 1px solid #E8DFD5; padding: 16px; border-radius: 2px; margin-bottom: 24px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #4A3F38;">
                      Cách sử dụng ưu đãi:
                    </p>
                    <ol style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #631521;">
                      <li>Chọn bộ Sleepwear yêu thích vào giỏ hàng.</li>
                      <li>Ở bước giỏ hàng hoặc thanh toán, nhập mã <strong style="font-family: monospace;">${code}</strong>.</li>
                      <li>Hệ thống sẽ tự động trừ 10% và miễn phí tiền ship!</li>
                    </ol>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${SHOP_NAME} — Style to be lived in
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    Hotline tư vấn chọn size & chất liệu: ${SHOP_PHONE}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `🎁 [${SHOP_NAME}] Chúc mừng bạn nhận Voucher Chào Mừng 10% + Miễn Phí Vận Chuyển (${code})`,
    html,
  })
}

/**
 * Gửi email thông báo sản phẩm mới / Livestream / Ưu đãi (Marketing Broadcast)
 * Có cơ chế Unsubscribe bảo mật và tôn trọng opt-out theo luật bảo vệ dữ liệu
 */
export async function sendBroadcastEmail({ to, subject, contentHtml, broadcastType = 'Sản Phẩm Mới', accountId = null }) {
  // Đã chuyển sang getResilientSmtpTransporter() và HTTPS Bridge bên trong dispatchEmail
  const user = getSenderEmail()

  const unsubToken = generateUnsubscribeToken(to, accountId)
  const unsubscribeUrl = `${APP_URL}/huy-dang-ky?token=${encodeURIComponent(unsubToken)}`
  const directApiUnsubUrl = `${APP_URL}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject} — QuanNguyenS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 36px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    QuanNguyenS
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    ${broadcastType}
                  </span>
                </td>
              </tr>

              <!-- Broadcast Content -->
              <tr>
                <td style="padding: 36px 32px 28px 32px; font-size: 14px; line-height: 1.7; color: #3A3535;">
                  ${contentHtml}
                  
                  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E8DFD5; font-style: italic; color: #631521;">
                    Trân trọng,<br>
                    <strong>Quân Nguyễn</strong> — Sáng lập thương hiệu QuanNguyenS
                  </div>
                </td>
              </tr>

              <!-- Footer with Compliant Unsubscribe Link -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${SHOP_NAME} — Style to be lived in
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${SHOP_PHONE} · Địa chỉ: ${SHOP_ADDRESS}
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 10.5px; color: #A89F91; line-height: 1.5;">
                    Bạn nhận được thông báo này vì đã đồng ý nhận email marketing tại QuanNguyenS.<br>
                    Nếu không muốn nhận các thông báo này trong tương lai, bạn có thể 
                    <a href="${unsubscribeUrl}" style="color: #631521; text-decoration: underline; font-weight: 600;">
                      hủy đăng ký tại đây
                    </a>. Quyền lợi tài khoản và ưu đãi voucher của bạn vẫn được bảo lưu.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `[${SHOP_NAME}] ${subject}`,
    html,
    headers: {
      'List-Unsubscribe': `<${directApiUnsubUrl}>, <${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}

/**
 * Helper: Định dạng tên thiết bị & hệ điều hành từ User-Agent
 */
function formatDeviceName(userAgent = '') {
  if (!userAgent) return 'Trình duyệt Web'
  let os = 'Thiết bị khác'
  if (/Windows/i.test(userAgent)) os = 'Windows'
  else if (/iPhone/i.test(userAgent)) os = 'iPhone'
  else if (/iPad/i.test(userAgent)) os = 'iPad'
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'macOS'
  else if (/Android/i.test(userAgent)) os = 'Android'
  else if (/Linux/i.test(userAgent)) os = 'Linux'

  let browser = 'Trình duyệt'
  if (/Edg/i.test(userAgent)) browser = 'Microsoft Edge'
  else if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Google Chrome'
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Apple Safari'
  else if (/Firefox/i.test(userAgent)) browser = 'Mozilla Firefox'
  else if (/CocCoc/i.test(userAgent)) browser = 'Cốc Cốc'

  return `${browser} (${os})`
}

/**
 * Gửi email thông báo Đăng ký tài khoản Google thành công cho Khách hàng
 * Kèm mã Voucher chào mừng 10% + Miễn phí vận chuyển
 */
export async function sendGoogleRegisterSuccessEmail({
  to,
  name = 'Quý khách',
  voucherCode = 'QNSWELCOME10',
  timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  ip = 'Không xác định',
  userAgent = '',
}) {
  // Đã chuyển sang getResilientSmtpTransporter() và HTTPS Bridge bên trong dispatchEmail
  const user = getSenderEmail()
  const device = formatDeviceName(userAgent)

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chúc Mừng Đăng Ký Tài Khoản Google Thành Công — QuanNguyenS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 36px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    QuanNguyenS
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Style to be lived in
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #FAF5F0; border: 1px solid #D4AF37; font-size: 24px;">
                      🎉
                    </div>
                    <h2 style="font-family: 'Georgia', serif; font-size: 21px; color: #631521; margin: 14px 0 6px 0; font-weight: bold;">
                      Chào Mừng Bạn Đến Với QuanNguyenS
                    </h2>
                    <p style="margin: 0; font-size: 13px; color: #8C7E74;">
                      Tài khoản Google của bạn đã được kết nối & kích hoạt thành công
                    </p>
                  </div>

                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${name}</strong>,
                  </p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Cảm ơn bạn đã lựa chọn đăng ký tài khoản thành viên tại <strong>QuanNguyenS</strong> thông qua tài khoản Google (<strong style="color: #631521;">${to}</strong>). Từ nay, bạn có thể dễ dàng quản lý đơn hàng, theo dõi hành trình giao nhận và tận hưởng các đặc quyền dành riêng cho thành viên.
                  </p>

                  <!-- Luxury Voucher Card -->
                  <div style="margin: 24px 0; padding: 22px 20px; background: linear-gradient(135deg, #FFFDF9 0%, #FAF2E8 100%); border: 1.5px solid #D4AF37; border-radius: 4px; text-align: center; box-shadow: 0 2px 8px rgba(212, 175, 55, 0.1);">
                    <div style="display: inline-block; background-color: #631521; color: #FAF8F5; font-size: 10px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; padding: 3px 12px; border-radius: 2px; margin-bottom: 10px;">
                      MÓN QUÀ CHÀO MỪNG ĐẶC BIỆT
                    </div>
                    <span style="display: block; font-family: 'Georgia', serif; font-size: 28px; font-weight: bold; color: #631521; letter-spacing: 3px; margin-bottom: 6px;">
                      ${voucherCode}
                    </span>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #2E7D32;">
                      ✓ Giảm ngay 10% + Miễn phí vận chuyển toàn quốc
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #8C7E74;">
                      Áp dụng cho đơn hàng đầu tiên của bạn tại QuanNguyenS
                    </p>
                  </div>

                  <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #8C7E74; text-align: center;">
                    Nếu bạn có bất kỳ câu hỏi nào về sản phẩm hoặc kích cỡ, xin vui lòng gọi hotline <strong>${SHOP_PHONE}</strong> để được tư vấn tận tâm.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 22px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${SHOP_NAME} — Style to be lived in
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    ${SHOP_ADDRESS} · Hotline: ${SHOP_PHONE}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `🎉 [${SHOP_NAME}] Chúc mừng bạn đã đăng ký tài khoản Google thành công — Nhận Voucher 10%`,
    html,
  })
}

/**
 * Gửi email thông báo Đăng nhập tài khoản Google thành công cho Khách hàng (Security Notice)
 * Tuân thủ WP-B B6: Thư chính thức mang nhận diện thương hiệu QuanNguyenS, tuyệt đối không giả dạng Google / Google LLC
 */
export async function sendGoogleLoginNotificationEmail({
  to,
  name = 'Quý khách',
  timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  ip = 'Không xác định',
  userAgent = '',
}) {
  const user = getSenderEmail()
  const safeName = escapeHtml(name)
  const safeTo = escapeHtml(to)
  const safeTimeStr = escapeHtml(timeStr)
  const safeIp = escapeHtml(ip)

  const text = `Kính gửi ${name},

Hệ thống ghi nhận tài khoản của bạn (${to}) vừa đăng nhập thành công vào website ${SHOP_NAME} bằng liên kết Google.
- Thời gian: ${timeStr}
- Địa chỉ IP: ${ip}

Nếu chính bạn vừa thực hiện đăng nhập, bạn có thể hoàn toàn yên tâm và không cần thao tác gì thêm.
Nếu bạn không thực hiện hành động này, vui lòng liên hệ ngay với chúng tôi qua hotline ${SHOP_PHONE} để khóa phiên và bảo vệ tài khoản.

${SHOP_NAME} — Style to be lived in
Hotline: ${SHOP_PHONE} · Email: ${user}
`

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thông Báo Đăng Nhập — ${escapeHtml(SHOP_NAME)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    ${escapeHtml(SHOP_NAME)}
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Style to be lived in
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #631521; font-weight: 600;">
                    🛡️ Thông Báo Bảo Mật Đăng Nhập
                  </h2>
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${safeName}</strong>,
                  </p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Hệ thống ghi nhận tài khoản <strong>${safeTo}</strong> vừa đăng nhập thành công vào website <strong>${escapeHtml(SHOP_NAME)}</strong> bằng tài khoản Google của bạn.
                  </p>

                  <!-- Session Details Box -->
                  <div style="background-color: #FAF5F0; border-left: 3px solid #631521; padding: 14px 16px; border-radius: 2px; margin-bottom: 24px; font-size: 13px; line-height: 1.6; color: #4A3F38;">
                    <div style="margin-bottom: 6px;">
                      <strong>⏱ Thời gian:</strong> ${safeTimeStr}
                    </div>
                    <div>
                      <strong>🌐 Địa chỉ IP:</strong> ${safeIp}
                    </div>
                  </div>

                  <p style="margin: 0 0 16px 0; font-size: 13.5px; line-height: 1.6; color: #4A3F38;">
                    Nếu đây chính là bạn, bạn có thể an tâm tiếp tục mua sắm mà không cần thực hiện thêm thao tác nào.
                  </p>
                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #8C7E74;">
                    Nếu bạn không thực hiện đăng nhập này, vui lòng liên hệ ngay với chúng tôi qua hotline <strong>${escapeHtml(SHOP_PHONE)}</strong> để được hỗ trợ khóa phiên và bảo vệ tài khoản.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${escapeHtml(SHOP_NAME)} — Style to be lived in
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${escapeHtml(SHOP_PHONE)} · Email: ${escapeHtml(user)}
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    ${escapeHtml(SHOP_ADDRESS)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `[${SHOP_NAME}] Thông báo đăng nhập thành công qua Google`,
    html,
    text,
    purpose: 'GOOGLE_LOGIN_ALERT',
  })
}

/**
 * Gửi email thông báo cho Chủ shop (OWNER_EMAIL) khi có khách Đăng ký / Đăng nhập qua Google
 */
export async function sendOwnerGoogleAuthNotification({
  action = 'LOGIN', // 'REGISTER' | 'LOGIN'
  customerName = 'Quý khách Google',
  email = '',
  googleSub = '',
  timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  ip = 'Không xác định',
  userAgent = '',
  voucherCode = '',
}) {
  // Đã chuyển sang getResilientSmtpTransporter() và HTTPS Bridge bên trong dispatchEmail
  const user = getSenderEmail()
  const ownerEmail = (process.env.OWNER_EMAIL || user || 'quannguyens403@gmail.com').trim()
  const device = formatDeviceName(userAgent)

  const isRegister = action === 'REGISTER'
  const badgeTitle = isRegister ? 'THÀNH VIÊN GOOGLE MỚI' : 'ĐĂNG NHẬP GOOGLE'
  const emoji = isRegister ? '👤' : '🔐'
  const subject = `${emoji} [${badgeTitle}] ${customerName} (${email || 'Không có email'})`

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .wrap { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
        .top-bar { background: #631521; padding: 18px 24px; border-bottom: 2px solid #D4AF37; }
        .top-bar h1 { color: #ffffff; font-size: 18px; margin: 0; }
        .top-bar p { color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0; }
        .body { padding: 24px; }
        .kv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .kv-table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .kv-label { color: #888888; font-weight: 500; width: 35%; }
        .kv-value { color: #111111; font-weight: 600; }
        .badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 3px; }
        .badge-register { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-login { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="top-bar">
          <h1>${emoji} ${badgeTitle} — QuanNguyenS</h1>
          <p>Thời gian: ${timeStr}</p>
        </div>
        <div class="body">
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #333;">
            Hệ thống website vừa ghi nhận một hoạt động tài khoản Google mới:
          </p>

          <table class="kv-table">
            <tr>
              <td class="kv-label">Loại hoạt động:</td>
              <td class="kv-value">
                <span class="badge ${isRegister ? 'badge-register' : 'badge-login'}">
                  ${isRegister ? 'Đăng ký thành viên mới' : 'Đăng nhập lại'}
                </span>
              </td>
            </tr>
            <tr>
              <td class="kv-label">Họ tên khách hàng:</td>
              <td class="kv-value" style="color: #631521; font-size: 14px;">${customerName}</td>
            </tr>
            <tr>
              <td class="kv-label">Email Google:</td>
              <td class="kv-value"><a href="mailto:${email}" style="color: #631521; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td class="kv-label">Google ID (Sub):</td>
              <td class="kv-value" style="font-family: monospace; font-size: 12px;">${googleSub || 'N/A'}</td>
            </tr>
            ${isRegister && voucherCode ? `
            <tr>
              <td class="kv-label">Voucher chào mừng:</td>
              <td class="kv-value" style="color: #2E7D32; font-family: monospace; font-size: 14px;">${voucherCode} (10% + Freeship)</td>
            </tr>
            ` : ''}
            <tr>
              <td class="kv-label">Thiết bị:</td>
              <td class="kv-value">${device}</td>
            </tr>
            <tr>
              <td class="kv-label">Địa chỉ IP:</td>
              <td class="kv-value">${ip}</td>
            </tr>
          </table>

          <p style="margin: 16px 0 0 0; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 12px;">
            ⚡ Thông báo tự động từ Hệ thống Quản trị & Xác thực Khách hàng QuanNguyenS.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME} Hệ Thống" <${user}>`,
    to: ownerEmail,
    subject,
    html,
  })
}

/**
 * Gửi mã OTP xác nhận đặt lại mật khẩu qua Gmail
 * Tuân thủ WP-B B5: escape HTML, không đưa OTP vào subject, có text thuần
 */
export async function sendPasswordResetOtpEmail({ to, code, name = 'Quý khách' }) {
  const cleanCode = String(code || '').trim()
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Mã OTP xác nhận đặt lại mật khẩu không đúng định dạng 6 chữ số')
  }

  const user = getSenderEmail()
  const safeName = escapeHtml(name)
  const safeTo = escapeHtml(to)
  const safeCode = escapeHtml(cleanCode)

  const text = `Kính gửi ${name},

Chúng tôi đã nhận được yêu cầu lấy lại mật khẩu cho tài khoản ${to} tại website ${SHOP_NAME}.
Mã xác nhận của bạn: ${cleanCode}
(Hiệu lực trong 10 phút, tối đa 5 lần nhập)

Lưu ý bảo mật: Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này.

${SHOP_NAME} — Style to be lived in
Hotline: ${SHOP_PHONE} · Email: ${user}
`

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã Xác Nhận Đặt Lại Mật Khẩu — ${escapeHtml(SHOP_NAME)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    ${escapeHtml(SHOP_NAME)}
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Style to be lived in
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${safeName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Chúng tôi đã nhận được yêu cầu lấy lại mật khẩu cho tài khoản <strong>${safeTo}</strong> tại website <strong>${escapeHtml(SHOP_NAME)}</strong>. Vui lòng sử dụng mã xác nhận gồm 6 chữ số dưới đây để tiến hành tạo mật khẩu mới:
                  </p>

                  <!-- 6-digit Code Box -->
                  <div style="margin: 28px 0; padding: 22px 16px; background-color: #FFFFFF; border: 1.5px dashed #D4AF37; border-radius: 4px; text-align: center;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C7E74; margin-bottom: 8px; font-weight: 600;">
                      MÃ XÁC NHẬN CỦA BẠN
                    </span>
                    <span style="font-family: 'Georgia', monospace, sans-serif; font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #631521; display: inline-block;">
                      ${safeCode}
                    </span>
                    <span style="display: block; font-size: 12px; color: #8C7E74; margin-top: 10px;">
                      ⏱ Hiệu lực trong <strong>10 phút</strong> · Tối đa 5 lần nhập
                    </span>
                  </div>

                  <!-- Security Note -->
                  <div style="background-color: #FAF5F0; border-left: 3px solid #631521; padding: 12px 14px; border-radius: 2px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #631521;">
                      🔒 <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này.
                    </p>
                  </div>

                  <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #4A3F38;">
                    Cần hỗ trợ trực tiếp? Quý khách vui lòng liên hệ Hotline <strong>${escapeHtml(SHOP_PHONE)}</strong>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${escapeHtml(SHOP_NAME)} — Style to be lived in
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${escapeHtml(SHOP_PHONE)} · Email: ${escapeHtml(user)}
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    ${escapeHtml(SHOP_ADDRESS)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return dispatchEmail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `[${SHOP_NAME}] Mã xác nhận đặt lại mật khẩu`,
    html,
    text,
    purpose: 'PASSWORD_RESET_OTP',
  })
}
