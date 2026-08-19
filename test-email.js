import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { getTransporter } from './server/lib/emailConfig.js'

async function runTestEmail() {
  console.log('🔄 Đang kiểm tra kết nối Gmail...')
  console.log(`- GMAIL_USER: ${process.env.GMAIL_USER || 'Chưa cấu hình'}`)
  console.log(`- OWNER_EMAIL: ${process.env.OWNER_EMAIL || 'Chưa cấu hình'}`)

  try {
    const transporter = getTransporter()
    await transporter.verify()
    console.log('✅ Kết nối SMTP Gmail thành công!')

    const targetEmail = process.env.OWNER_EMAIL || process.env.GMAIL_USER
    console.log(`📬 Đang gửi thử email test tới: ${targetEmail}...`)

    const info = await transporter.sendMail({
      from: `"QuanNguyenS Test" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: '🧪 [TEST] Kiểm tra kết nối Email tự động QuanNguyenS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #C9A87C; max-width: 500px; margin: auto;">
          <h2 style="color: #631521; margin-top: 0;">QuanNguyenS Automation System</h2>
          <p>Xin chào Quân,</p>
          <p>Email này được gửi tự động để kiểm tra cấu hình <strong>GMAIL_APP_PASSWORD</strong> trên website.</p>
          <p style="background: #E8F5E9; color: #2E7D32; padding: 10px; border-radius: 4px; font-weight: bold;">
            ✅ Kết nối Gmail thành công 100%!
          </p>
          <p style="font-size: 12px; color: #888;">Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `,
    })

    console.log(`🎉 Gửi email test thành công! Message ID: ${info.messageId}`)
    console.log(`👉 Vui lòng mở hộp thư ${targetEmail} để kiểm tra!`)
  } catch (error) {
    console.error('❌ Gửi email test thất bại:', error.message)
    console.log('\n💡 Hướng dẫn sửa:')
    console.log('1. Đảm bảo GMAIL_USER=ducquan16102006@gmail.com')
    console.log('2. Đảm bảo GMAIL_APP_PASSWORD là Mật khẩu ứng dụng 16 ký tự (Google App Password), không phải mật khẩu đăng nhập bình thường.')
    console.log('3. Điền vào file .env.local trong thư mục dự án.')
  }
}

runTestEmail()
