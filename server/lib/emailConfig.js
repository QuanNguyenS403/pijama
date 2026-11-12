// 🔒 CẤU HÌNH GỬI EMAIL GIAO DỊCH (GMAIL SMTP / RESEND HTTP API)
import { sendEmailViaHttps, getEmailServiceStatus } from './httpsEmailService.js'

/**
 * Lấy Transporter tương thích ngược với API Nodemailer
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
        throw new Error('Chưa cấu hình biến môi trường GMAIL_APP_PASSWORD hoặc RESEND_API_KEY')
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
      if (status.resendConfigured) activeTransports.push('Resend HTTP API')
      if (status.smtpConfigured) activeTransports.push('Gmail SMTP')
      console.log(`✅ [EMAIL READY] Email service sẵn sàng qua: ${activeTransports.join(' & ')}`)
      return { success: true, transports: activeTransports }
    }

    console.warn('⚠️ [EMAIL WARNING] Chưa cấu hình biến môi trường gửi email (GMAIL_APP_PASSWORD hoặc RESEND_API_KEY)')
    return {
      success: false,
      error: 'Chưa cấu hình GMAIL_APP_PASSWORD hoặc RESEND_API_KEY',
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export const transporter = {
  sendMail: (...args) => getTransporter().sendMail(...args),
}

export default { getTransporter, verifyTransporter, transporter }
