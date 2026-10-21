import { getTransporter } from './emailConfig.js'
import { generateUnsubscribeToken } from './authCrypto.js'

const SHOP_NAME = process.env.SHOP_NAME || 'QuanNguyenS'
const SHOP_PHONE = process.env.SHOP_PHONE || '0981 753 082'
const SHOP_ADDRESS = process.env.SHOP_ADDRESS || 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội'
const APP_URL = process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000'

/**
 * Gửi mã xác minh 6 số (chống tài khoản rác cho Google / Facebook / Email)
 */
export async function sendVerificationCodeEmail({ to, code, name = 'Quý khách' }) {
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã Xác Minh Tài Khoản — QuanNguyenS</title>
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
                    QuanNguyenS
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    Dressed for Life. Even at Home.
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${name}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Cảm ơn bạn đã quan tâm và khởi tạo tài khoản thành viên tại <strong>QuanNguyenS</strong>. Để bảo mật tài khoản và nhận ngay <strong>Voucher giảm 10% + Miễn phí vận chuyển cho đơn hàng đầu tiên</strong>, vui lòng nhập mã xác minh dưới đây:
                  </p>

                  <!-- 6-digit Code Box -->
                  <div style="margin: 28px 0; padding: 22px 16px; background-color: #FFFFFF; border: 1.5px dashed #D4AF37; border-radius: 4px; text-align: center;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C7E74; margin-bottom: 8px; font-weight: 600;">
                      MÃ XÁC MINH CỦA BẠN
                    </span>
                    <span style="font-family: 'Georgia', monospace, sans-serif; font-size: 34px; font-weight: bold; letter-spacing: 10px; color: #631521; display: inline-block;">
                      ${code}
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
                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay hotline <strong>${SHOP_PHONE}</strong> để được hỗ trợ.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${SHOP_NAME} — Lụa Tơ Tằm & Pyjama Cao Cấp
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${SHOP_PHONE} · Email: ${user}
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #8C7E74;">
                    ${SHOP_ADDRESS}
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

  return transporter.sendMail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `[${SHOP_NAME}] Mã xác minh tài khoản của bạn: ${code}`,
    html,
  })
}

/**
 * Gửi email chúc mừng & tặng mã Voucher chào mừng 10% + Freeship
 */
export async function sendWelcomeVoucherEmail({ to, code, name = 'Quý khách' }) {
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()

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
                      <li>Chọn bộ Pyjama yêu thích vào giỏ hàng.</li>
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
                    ${SHOP_NAME} — Dressed for Life. Even at Home.
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

  return transporter.sendMail({
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
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()

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
                    ${SHOP_NAME} — Lụa Tơ Tằm & Pyjama Thiết Kế
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

  return transporter.sendMail({
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
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()
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
                    Dressed for Life · Even at Home
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
                    ${SHOP_NAME} — Lụa Tơ Tằm & Pyjama Thiết Kế Cao Cấp
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

  return transporter.sendMail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `🎉 [${SHOP_NAME}] Chúc mừng bạn đã đăng ký tài khoản Google thành công — Nhận Voucher 10%`,
    html,
  })
}

/**
 * Gửi email thông báo Đăng nhập tài khoản Google thành công cho Khách hàng (Security Notice)
 */
export async function sendGoogleLoginNotificationEmail({
  to,
  name = 'Quý khách',
  timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  ip = 'Không xác định',
  userAgent = '',
}) {
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()
  const initialLetter = (name || to || 'Q').trim()[0].toUpperCase()

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Theo dõi dữ liệu trong Tài khoản Google của bạn</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #202124;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 24px 12px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #DADCE0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(60,64,67,0.08);">
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  
                  <!-- Google G Logo -->
                  <div style="text-align: center; margin-bottom: 16px;">
                    <svg width="40" height="40" viewBox="0 0 48 48" style="display: inline-block;">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  </div>

                  <!-- Header Title -->
                  <h1 style="margin: 0 0 14px 0; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 22px; font-weight: 400; color: #202124; text-align: center; line-height: 1.35;">
                    Theo dõi dữ liệu trong Tài khoản Google của bạn
                  </h1>

                  <!-- User Account Badge -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; font-family: Roboto, Arial, sans-serif; font-size: 14px; font-weight: 500; color: #3C4043;">
                      <span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: #E37400; color: #FFFFFF; font-size: 13px; font-weight: bold; line-height: 24px; text-align: center; margin-right: 8px;">
                        ${initialLetter}
                      </span>
                      <span>${to}</span>
                    </span>
                  </div>

                  <hr style="border: 0; border-top: 1px solid #E0E0E0; margin: 0 0 28px 0;" />

                  <!-- Google Center Illustration -->
                  <div style="text-align: center; margin-bottom: 28px;">
                    <svg width="180" height="110" viewBox="0 0 240 140" fill="none" style="display: inline-block;">
                      <!-- Device Body -->
                      <rect x="85" y="15" width="70" height="110" rx="14" fill="#FFFFFF" stroke="#3C4043" stroke-width="2"/>
                      <circle cx="120" cy="24" r="2.5" fill="#3C4043"/>
                      
                      <!-- Profile Avatar on Device -->
                      <circle cx="120" cy="56" r="18" fill="#E8F0FE"/>
                      <circle cx="120" cy="52" r="6" fill="#1A73E8"/>
                      <path d="M109 68 C109 62, 131 62, 131 68" fill="#1A73E8"/>

                      <!-- Share Outgoing Icon -->
                      <circle cx="148" cy="28" r="10" fill="#D2E3FC"/>
                      <path d="M148 24 L148 31 M145 27 L148 24 L151 27" stroke="#1A73E8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

                      <!-- Mail Envelope with Bell Badge -->
                      <rect x="42" y="58" width="46" height="32" rx="4" fill="#FFFFFF" stroke="#3C4043" stroke-width="1.8"/>
                      <path d="M42 60 L65 76 L88 60" stroke="#3C4043" stroke-width="1.8" stroke-linejoin="round"/>
                      <circle cx="40" cy="56" r="11" fill="#1A73E8"/>
                      <path d="M37 54 C37 51, 43 51, 43 54 L44 58 L36 58 Z M39 59 C39 60.5, 41 60.5, 41 59" fill="#FFFFFF"/>

                      <!-- Connection / Data Toggles -->
                      <rect x="144" y="66" width="34" height="18" rx="9" fill="#F1F3F4" stroke="#3C4043" stroke-width="1.5"/>
                      <circle cx="153" cy="75" r="5" fill="#3C4043"/>
                      <circle cx="170" cy="98" r="9" fill="#34A853"/>
                      <path d="M170 94 L175 101 L165 101 Z" fill="#FFFFFF"/>
                      <circle cx="140" cy="100" r="10" fill="#202124"/>
                      <path d="M140 94 A6 6 0 1 1 134 100" stroke="#FFFFFF" stroke-width="1.8" fill="none"/>
                    </svg>
                  </div>

                  <!-- Blue Info Box -->
                  <div style="background-color: #E8F0FE; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; text-align: left;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="32" valign="top" style="padding-right: 12px;">
                          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #1A73E8; color: #FFFFFF; font-size: 13px; font-weight: bold; font-family: Arial, sans-serif; text-align: center; line-height: 22px;">i</div>
                        </td>
                        <td valign="top" style="font-family: Roboto, Arial, sans-serif; font-size: 13.5px; line-height: 1.5; color: #202124;">
                          <p style="margin: 0 0 10px 0;">
                            Chúng tôi gửi cho bạn email này vì bạn đã dùng tính năng Đăng nhập bằng Google để đăng nhập vào <strong>QuanNguyenS</strong> vào ngày <strong>${timeStr}</strong>.
                          </p>
                          <p style="margin: 0; color: #3C4043;">
                            Email này tóm tắt thông tin mà bạn đã chia sẻ. Bạn không cần làm gì vào lúc này.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Profile Data Received Box -->
                  <div style="background-color: #F8F9FA; border-radius: 12px; padding: 20px 22px; margin-bottom: 24px; text-align: left;">
                    <h3 style="margin: 0 0 18px 0; font-family: Roboto, Arial, sans-serif; font-size: 15px; font-weight: 500; color: #202124;">
                      QuanNguyenS đã nhận được thông tin hồ sơ này
                    </h3>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px;">
                      <tr>
                        <td width="36" valign="middle" style="padding-right: 12px;">
                          <div style="width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #5F6368; text-align: center; line-height: 28px; font-size: 14px; color: #5F6368;">
                            👤
                          </div>
                        </td>
                        <td valign="middle" style="font-family: Roboto, Arial, sans-serif;">
                          <div style="font-size: 14px; font-weight: 500; color: #202124;">${name}</div>
                          <div style="font-size: 12px; color: #5F6368;">Tên và ảnh hồ sơ</div>
                        </td>
                      </tr>
                    </table>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                      <tr>
                        <td width="36" valign="middle" style="padding-right: 12px;">
                          <div style="width: 28px; height: 28px; border-radius: 4px; border: 1.5px solid #5F6368; text-align: center; line-height: 28px; font-size: 14px; color: #5F6368;">
                            ✉️
                          </div>
                        </td>
                        <td valign="middle" style="font-family: Roboto, Arial, sans-serif;">
                          <div style="font-size: 14px; font-weight: 500; color: #202124;">${to}</div>
                          <div style="font-size: 12px; color: #5F6368;">Địa chỉ email</div>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top: 1px solid #E0E0E0; padding-top: 14px; font-family: Roboto, Arial, sans-serif; font-size: 12.5px; color: #5F6368;">
                      Email này cho biết thông tin bạn đã chia sẻ vào ngày <strong>${timeStr}</strong>
                    </div>
                  </div>

                  <!-- Account Disconnect Notice -->
                  <p style="margin: 0 0 18px 0; font-family: Roboto, Arial, sans-serif; font-size: 13.5px; line-height: 1.55; color: #3C4043; text-align: left;">
                    Nếu bạn muốn ngừng sử dụng tính năng Đăng nhập bằng Google với QuanNguyenS, hãy truy cập Tài khoản Google của bạn.
                  </p>

                  <!-- Google Account CTA Button -->
                  <div style="text-align: center; margin: 22px 0 26px 0;">
                    <a href="https://myaccount.google.com/connections" target="_blank" style="display: inline-block; background-color: #0B57D0; color: #FFFFFF; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-family: 'Google Sans', Roboto, Arial, sans-serif;">
                      Truy cập Tài khoản Google
                    </a>
                  </div>

                  <!-- Policies Links -->
                  <p style="margin: 0 0 14px 0; font-family: Roboto, Arial, sans-serif; font-size: 13px; line-height: 1.55; color: #3C4043; text-align: left;">
                    Xem <a href="${APP_URL}/chinh-sach" target="_blank" style="color: #0B57D0; text-decoration: underline;">Chính sách quyền riêng tư</a> và <a href="${APP_URL}/chinh-sach" target="_blank" style="color: #0B57D0; text-decoration: underline;">Điều khoản dịch vụ</a> của QuanNguyenS để hiểu cách QuanNguyenS sẽ xử lý và bảo vệ dữ liệu của bạn.
                  </p>

                  <!-- Data Deletion Link -->
                  <p style="margin: 0 0 24px 0; font-family: Roboto, Arial, sans-serif; font-size: 13px; line-height: 1.55; color: #3C4043; text-align: left;">
                    Nếu bạn muốn xoá dữ liệu mà bạn đã chia sẻ với QuanNguyenS, hãy truy cập <a href="${APP_URL}/tai-khoan" target="_blank" style="color: #0B57D0; text-decoration: underline;">QuanNguyenS</a>.
                  </p>

                  <!-- Google Security Box -->
                  <div style="border: 1px solid #DADCE0; border-radius: 8px; padding: 14px 18px; margin-bottom: 26px; text-align: left;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="36" valign="top" style="padding-right: 12px;">
                          <div style="width: 24px; height: 24px; line-height: 24px; font-size: 20px;">🛡️</div>
                        </td>
                        <td valign="top" style="font-family: Roboto, Arial, sans-serif;">
                          <div style="font-size: 14px; font-weight: 600; color: #202124; margin-bottom: 3px;">
                            An toàn hơn với Google
                          </div>
                          <div style="font-size: 12px; line-height: 1.5; color: #5F6368;">
                            Tài khoản Google bảo vệ quyền riêng tư của bạn bằng tính năng bảo mật nâng cao được thiết kế để giữ an toàn cho dữ liệu của bạn
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Footer -->
                  <div style="font-family: Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.6; color: #5F6368; text-align: center; padding-top: 18px; border-top: 1px solid #E8EAED;">
                    <p style="margin: 0 0 6px 0;">
                      Chúng tôi gửi cho bạn email này để thông báo về những thay đổi quan trọng đối với Tài khoản Google và các dịch vụ bạn sử dụng.
                    </p>
                    <p style="margin: 0 0 6px 0;">
                      Nếu không muốn nhận những email này, bạn có thể <a href="${APP_URL}/unsubscribe" target="_blank" style="color: #0B57D0; text-decoration: underline;">huỷ đăng ký</a>. Ngay cả khi huỷ đăng ký nhận những email này, bạn vẫn sẽ tiếp tục nhận được cảnh báo bảo mật.
                    </p>
                    <p style="margin: 8px 0 0 0; color: #80868B;">
                      © 2026 Google LLC 1600 Amphitheatre Parkway, Mountain View, CA 94043 · Đối tác dịch vụ: QuanNguyenS Luxury (${SHOP_PHONE})
                    </p>
                  </div>

                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return transporter.sendMail({
    from: `"${SHOP_NAME}" <${user}>`,
    to,
    subject: `Theo dõi dữ liệu trong Tài khoản Google của bạn`,
    html,
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
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()
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

  return transporter.sendMail({
    from: `"${SHOP_NAME} Hệ Thống" <${user}>`,
    to: ownerEmail,
    subject,
    html,
  })
}
