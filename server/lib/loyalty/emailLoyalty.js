// server/lib/loyalty/emailLoyalty.js
import { getTransporter } from '../emailConfig.js'
import { LOYALTY_TIERS } from './loyaltyConfig.js'

/**
 * Gửi email chào mừng Hội viên mới
 */
export async function sendLoyaltyWelcomeEmail({ to, fullName, phone, tier = 'MEMBER' }) {
  if (!to) return { success: false, reason: 'NO_EMAIL' }

  const tierConfig = LOYALTY_TIERS[tier] || LOYALTY_TIERS.MEMBER
  const subject = 'Chào mừng bạn gia nhập Hội viên QuanNguyenS — Khởi đầu đặc quyền'
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #27272a; background-color: #faf8f5;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #631521; margin: 0; font-size: 24px; letter-spacing: 2px;">QUANNGUYENS</h1>
        <p style="color: #71717a; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Chương Trình Ưu Đãi Hội Viên</p>
      </div>
      <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
        <p style="font-size: 16px; line-height: 1.6;">Kính chào <strong>${fullName || 'Quý khách'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Cảm ơn bạn đã chủ động đăng ký tham gia chương trình Hội viên thân thiết của QuanNguyenS với số điện thoại <strong>${phone}</strong>.</p>
        <div style="background: #faf8f5; border-left: 4px solid #631521; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #631521; font-size: 16px;">Hạng hiện tại: ${tierConfig.name}</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #52525b;">
            <li>Tích lũy 100.000đ = 1 điểm thưởng trên mọi đơn hàng hoàn tất.</li>
            <li>Đổi 10 điểm thưởng lấy ngay Voucher 50.000đ áp dụng từ 0đ.</li>
            <li>Voucher sinh nhật tri ân hàng năm.</li>
          </ul>
        </div>
        <p style="font-size: 14px; color: #71717a; line-height: 1.6;">Bạn có thể tra cứu quyền lợi và lịch sử điểm bất cứ lúc nào tại trang cá nhân.</p>
      </div>
    </div>
  `

  return sendEmailSafely({ to, subject, html })
}

/**
 * Gửi email chúc mừng Thăng hạng
 */
export async function sendLoyaltyUpgradeEmail({ to, fullName, oldTier, newTier, voucherCode, voucherAmount }) {
  if (!to) return { success: false, reason: 'NO_EMAIL' }

  const newTierConfig = LOYALTY_TIERS[newTier] || LOYALTY_TIERS.MEMBER
  const subject = `Chúc mừng bạn đã thăng hạng ${newTierConfig.name} — QuanNguyenS`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #27272a; background-color: #faf8f5;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #631521; margin: 0; font-size: 24px; letter-spacing: 2px;">QUANNGUYENS</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
        <h2 style="color: #631521; margin-top: 0;">🎉 Chúc mừng thăng hạng ${newTierConfig.name}!</h2>
        <p style="font-size: 15px; line-height: 1.6;">Xin chào <strong>${fullName || 'Quý khách'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Tổng chi tiêu của bạn trong 365 ngày qua đã đạt điều kiện để thăng hạng <strong>${newTierConfig.name}</strong> với ưu đãi giảm <strong>${newTierConfig.discountPercent}%</strong> mọi đơn hàng.</p>
        ${
          voucherCode && voucherAmount
            ? `
          <div style="background: #fef3c7; border: 1px dashed #d97706; padding: 16px; margin: 20px 0; border-radius: 6px; text-align: center;">
            <p style="margin: 0 0 6px 0; color: #92400e; font-size: 13px; font-weight: 600; text-transform: uppercase;">Quà tặng thăng hạng</p>
            <div style="font-size: 20px; font-weight: bold; color: #b45309; letter-spacing: 2px;">${voucherCode}</div>
            <p style="margin: 6px 0 0 0; color: #78350f; font-size: 14px;">Giảm ${voucherAmount.toLocaleString('vi-VN')}đ (Hạn dùng 90 ngày)</p>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `

  return sendEmailSafely({ to, subject, html })
}

/**
 * Gửi email cảnh báo điểm sắp hết hạn (trước 30 ngày)
 */
export async function sendLoyaltyPointsExpiringEmail({ to, fullName, pointsBalance, daysRemaining = 30 }) {
  if (!to) return { success: false, reason: 'NO_EMAIL' }

  const subject = `[Nhắc nhở] Điểm thưởng QuanNguyenS của bạn sẽ hết hạn sau ${daysRemaining} ngày`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #27272a; background-color: #faf8f5;">
      <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
        <h2 style="color: #dc2626; margin-top: 0;">⏳ Thông báo hạn sử dụng điểm thưởng</h2>
        <p style="font-size: 15px; line-height: 1.6;">Xin chào <strong>${fullName || 'Quý khách'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">Bạn hiện đang có <strong>${pointsBalance} điểm thưởng</strong> (tương đương ${(pointsBalance * 5000).toLocaleString('vi-VN')}đ ưu đãi). Theo chính sách duy trì điểm 365 ngày, số điểm này sẽ hết hạn sau <strong>${daysRemaining} ngày</strong> nếu không phát sinh đơn hàng mới.</p>
        <p style="font-size: 15px; line-height: 1.6;">Hãy truy cập website để đổi điểm thành voucher hoặc đặt đơn hàng mới để gia hạn điểm thưởng nhé!</p>
      </div>
    </div>
  `

  return sendEmailSafely({ to, subject, html })
}

async function sendEmailSafely({ to, subject, html }) {
  try {
    const transporter = getTransporter()
    const sender = process.env.GMAIL_USER || 'quannguyens403@gmail.com'
    const info = await transporter.sendMail({
      from: `"QuanNguyenS Loyalty" <${sender}>`,
      to,
      subject,
      html,
    })
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.warn(`⚠️ [LOYALTY EMAIL] Không thể gửi email tới ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}
