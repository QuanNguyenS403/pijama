import nodemailer from 'nodemailer'

export const getTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong .env')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Google App Password (16 ký tự)
    },
  })
}

// Khởi tạo và kiểm tra kết nối nếu có cấu hình
export const verifyTransporter = async () => {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    console.log('✅ Email server (Gmail) sẵn sàng hoạt động')
    return true
  } catch (error) {
    console.warn('⚠️ Nodemailer verify warning:', error.message)
    return false
  }
}

export const transporter = {
  sendMail: (...args) => getTransporter().sendMail(...args),
}

export default { getTransporter, verifyTransporter, transporter }
