import { getTransporter } from './emailConfig.js'

const SHOP_NAME = process.env.SHOP_NAME || 'QuanNguyenS'
const SHOP_PHONE = process.env.SHOP_PHONE || '0981 753 082'
const SHOP_ADDRESS = process.env.SHOP_ADDRESS || 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội'

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
 * Gửi email thông báo sản phẩm mới / Livestream do Quân chủ động gửi (Broadcast)
 */
export async function sendBroadcastEmail({ to, subject, contentHtml, broadcastType = 'Sản Phẩm Mới' }) {
  const transporter = getTransporter()
  const user = (process.env.GMAIL_USER || '').trim()

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

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5EFE6; border-top: 1px solid #E8DFD5; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #631521; font-weight: 600;">
                    ${SHOP_NAME} — Lụa Tơ Tằm & Pyjama Thiết Kế
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #8C7E74;">
                    Hotline: ${SHOP_PHONE} · Địa chỉ: ${SHOP_ADDRESS}
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 10.5px; color: #A89F91;">
                    Bạn nhận được thông báo này vì đã đăng ký tài khoản thành viên tại website QuanNguyenS.
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
  })
}
