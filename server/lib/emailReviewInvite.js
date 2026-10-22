import crypto from 'crypto'
import { getTransporter } from './emailConfig.js'
import { generateUnsubscribeToken } from './authCrypto.js'
import { getDb } from './accountDb.js'
import { recordReviewInvite } from './reviewDb.js'

const SHOP_NAME = process.env.SHOP_NAME || 'QuanNguyenS'
const SHOP_PHONE = process.env.SHOP_PHONE || '0981 753 082'
const SHOP_ADDRESS = process.env.SHOP_ADDRESS || 'Amber Riverside, 622 Minh Khai, Hai Bà Trưng, Hà Nội'
const APP_URL = process.env.APP_URL || process.env.CLIENT_ORIGIN || 'https://quannguyens.com'

/**
 * Kiểm tra xem email đã hủy đăng ký nhận thư chưa
 */
export function isEmailSuppressed(email, database = getDb()) {
  if (!email) return true
  const cleanEmail = email.toLowerCase().trim()
  try {
    const unsub = database
      .prepare('SELECT 1 FROM marketing_unsubscribes WHERE LOWER(email) = ? LIMIT 1')
      .get(cleanEmail)
    return Boolean(unsub)
  } catch {
    return false
  }
}

/**
 * Gửi email mời đánh giá trải nghiệm sản phẩm thật
 * Ràng buộc: Mỗi đơn hàng mời tối đa 2 lần, tôn trọng hủy đăng ký (unsubscribe)
 */
export async function sendReviewInviteEmail(order, options = {}) {
  const customerEmail = order?.customer?.email || order?.customerEmail
  const orderId = order?.orderId || order?.id
  const customerName = order?.customer?.fullName || order?.customerName || 'Quý khách'

  if (!customerEmail || typeof customerEmail !== 'string') {
    console.warn(`[REVIEW INVITE] Đơn hàng #${orderId} không có địa chỉ email. Bỏ qua gửi thư mời.`)
    return { success: false, skipped: true, reason: 'missing_email' }
  }

  const cleanEmail = customerEmail.toLowerCase().trim()

  // 1. Kiểm tra trạng thái đơn hàng (chỉ gửi khi đơn đã DELIVERED)
  if (order.status !== 'DELIVERED') {
    console.warn(`[REVIEW INVITE] Đơn hàng #${orderId} ở trạng thái "${order.status}" (chưa DELIVERED). Bỏ qua gửi thư mời.`)
    return { success: false, skipped: true, reason: 'order_not_delivered' }
  }

  // 2. Tôn trọng người dùng đã hủy đăng ký
  if (isEmailSuppressed(cleanEmail)) {
    console.log(`[REVIEW INVITE] Email ${cleanEmail} đã hủy đăng ký. Tôn trọng quyền riêng tư, không gửi thư mời.`)
    return { success: false, skipped: true, reason: 'unsubscribed' }
  }

  // 3. Kiểm tra số lần mời (tối đa 2 lần cho mỗi đơn hàng)
  const database = getDb()
  const existingInvite = database.prepare('SELECT * FROM review_invites WHERE order_id = ?').get(orderId)
  if (existingInvite && existingInvite.invite_count >= 2) {
    console.log(`[REVIEW INVITE] Đơn hàng #${orderId} đã được gửi mời ${existingInvite.invite_count} lần. Dừng gửi theo quy định.`)
    return { success: false, skipped: true, reason: 'max_invites_reached' }
  }

  // 4. Sinh token mời bảo mật ngẫu nhiên
  const token = options.token || crypto.randomBytes(24).toString('hex')
  recordReviewInvite({ orderId, email: cleanEmail, token }, database)

  // 5. Xác định sản phẩm đầu tiên trong đơn để tạo đường dẫn review
  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null
  const productSlug = firstItem?.slug || firstItem?.productId || 'the-classic-set'
  const productName = firstItem?.name || firstItem?.productName || 'Trang phục pijama QuanNguyenS'

  const reviewUrl = `${APP_URL}/san-pham/${productSlug}?review_token=${token}&order_id=${encodeURIComponent(orderId)}#reviews`
  const unsubToken = generateUnsubscribeToken(cleanEmail, order.customer?.accountId || null)
  const unsubscribeUrl = `${APP_URL}/huy-dang-ky?token=${encodeURIComponent(unsubToken)}`
  const directApiUnsubUrl = `${APP_URL}/api/auth/unsubscribe?token=${encodeURIComponent(unsubToken)}`

  const user = (process.env.GMAIL_USER || '').trim()

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cảm nhận của bạn về ${productName} — QuanNguyenS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F5F0EB; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1614; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FAF8F5; border: 1px solid #D4AF37; border-radius: 4px; box-shadow: 0 4px 20px rgba(99, 21, 33, 0.08); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background: linear-gradient(180deg, #4A0D17 0%, #631521 100%); border-bottom: 2px solid #D4AF37;">
                  <span style="display: block; font-family: 'Georgia', serif; font-size: 24px; font-weight: bold; color: #FAF8F5; letter-spacing: 0.15em; text-transform: uppercase;">
                    QuanNguyenS
                  </span>
                  <span style="display: block; font-size: 11px; color: #D4AF37; letter-spacing: 0.25em; text-transform: uppercase; margin-top: 4px;">
                    European Casual Luxury
                  </span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px 32px;">
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Kính gửi <strong>${customerName}</strong>,
                  </p>
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    QuanNguyenS hy vọng bạn đang có những phút giây thư thái và trọn vẹn trong bộ trang phục <strong>${productName}</strong> (Đơn hàng <strong>#${orderId}</strong>).
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4A3F38;">
                    Mỗi bộ pijama của chúng tôi được may đo từ sự tỉ mỉ của thợ thủ công lành nghề. Chúng tôi rất mong được lắng nghe cảm nhận thực tế của bạn — dù là lời khen ngợi hay góp ý chân thành — để không ngừng hoàn thiện chất lượng phục vụ.
                  </p>

                  <!-- CTA Button -->
                  <div style="margin: 32px 0; text-align: center;">
                    <a href="${reviewUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #631521; color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 3px; box-shadow: 0 2px 8px rgba(99, 21, 33, 0.25);">
                      Viết Đánh Giá Của Bạn
                    </a>
                  </div>

                  <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #8C7E74; text-align: center;">
                    Liên kết trên đã được liên kết bảo mật với đơn hàng của bạn. Bạn không cần đăng nhập lại để gửi đánh giá.
                  </p>
                </td>
              </tr>

              <!-- Footer with Compliant Unsubscribe Link -->
              <tr>
                <td style="padding: 24px 32px; background-color: #F5F0EB; border-top: 1px solid #E8DFD5; text-align: center; font-size: 11px; color: #8C7E74; line-height: 1.6;">
                  <p style="margin: 0 0 8px 0; font-weight: 600; color: #631521;">
                    ${SHOP_NAME} — ${SHOP_ADDRESS}
                  </p>
                  <p style="margin: 0 0 8px 0;">
                    Hotline hỗ trợ: ${SHOP_PHONE} · Email: <a href="mailto:quannguyens403@gmail.com" style="color: #631521; text-decoration: none;">quannguyens403@gmail.com</a>
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 10px; color: #A89F91;">
                    Bạn nhận được email này vì đã mua hàng thành công tại QuanNguyenS. Nếu không muốn nhận thư mời đánh giá trong tương lai, bạn có thể 
                    <a href="${unsubscribeUrl}" style="color: #631521; text-decoration: underline; font-weight: 600;">Hủy đăng ký nhận thư tại đây</a>.
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

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `"${SHOP_NAME}" <${user || 'quannguyens403@gmail.com'}>`,
      to: cleanEmail,
      subject: `Chia sẻ cảm nhận về ${productName} — QuanNguyenS #${orderId}`,
      html,
      headers: {
        'List-Unsubscribe': `<${directApiUnsubUrl}>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    console.log(`✉️ [REVIEW INVITE] Đã gửi thư mời đánh giá tới ${cleanEmail} (Đơn #${orderId}, MessageID: ${info.messageId})`)
    return { success: true, messageId: info.messageId, token }
  } catch (err) {
    console.error(`🚨 [REVIEW INVITE ERROR] Không thể gửi email mời đánh giá tới ${cleanEmail} (Đơn #${orderId}):`, err.message)
    return { success: false, error: err.message, token }
  }
}
