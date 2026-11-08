// 🔒 CẤU HÌNH GỬI EMAIL CHUẨN HTTPS CỔNG 443 — CHỐNG CHẶN SMTP RENDER
import { sendEmailViaHttps, getEmailServiceStatus } from './httpsEmailService.js'

/**
 * Lấy Transporter tương thích ngược với API Nodemailer
 * Toàn bộ lệnh gửi mail sẽ tự động chuyển hướng qua HTTPS Port 443 (Google Apps Script / Resend)
 */
export const getTransporter = () => {
  return {
    sendMail: async (mailOptions) => {
      const fromName = mailOptions.from
        ? mailOptions.from.replace(/<.*>/, '').replace(/"/g, '').trim()
        : 'QuanNguyenS'

      return await sendEmailViaHttps({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        from: mailOptions.from,
        fromName,
      })
    },
    verify: async () => {
      const status = getEmailServiceStatus()
      if (!status.ready) {
        throw new Error('Chưa cấu hình biến môi trường GAS_EMAIL_WEBHOOK_URL hoặc RESEND_API_KEY')
      }
      return true
    },
  }
}

/**
 * Kiểm tra trạng thái hệ thống email
 */
export const verifyTransporter = async () => {
  try {
    const status = getEmailServiceStatus()
    if (status.ready) {
      const activeTransports = []
      if (status.gasConfigured) activeTransports.push('Google Apps Script HTTPS Bridge')
      if (status.resendConfigured) activeTransports.push('Resend HTTP API')
      console.log(`✅ [EMAIL READY] Email service (HTTPS Port 443) sẵn sàng qua: ${activeTransports.join(' & ')}`)
      return { success: true, transports: activeTransports }
    }

    // Nếu ở local dev và có SMTP fallback
    const user = (process.env.GMAIL_USER || '').trim()
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
    if (!status.isRender && user && pass) {
      console.log('ℹ️ [EMAIL NOTICE] Chưa có HTTPS Bridge, đang dùng tạm SMTP Localhost cho Development')
      return { success: true, transports: ['Localhost SMTP (Dev Only)'] }
    }

    console.warn('⚠️ [EMAIL WARNING] Chưa cấu hình biến môi trường gửi email HTTPS (GAS_EMAIL_WEBHOOK_URL / RESEND_API_KEY)')
    return {
      success: false,
      error: 'Chưa cấu hình GAS_EMAIL_WEBHOOK_URL hoặc RESEND_API_KEY',
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const transporter = {
  sendMail: (...args) => getTransporter().sendMail(...args),
}

export default { getTransporter, verifyTransporter, transporter }
