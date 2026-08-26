import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { getTransporter } from './server/lib/emailConfig.js'

async function runTestEmail() {
  const user = (process.env.GMAIL_USER || '').trim()
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim() || user

  console.log('======================================================')
  console.log('🔄 Đang kiểm tra cấu hình kết nối Gmail SMTP...')
  console.log(`- GMAIL_USER: ${user || '❌ Chưa cấu hình'}`)
  console.log(`- GMAIL_APP_PASSWORD: ${pass ? `✅ Đã cấu hình (${pass.length} ký tự)` : '❌ Chưa cấu hình'}`)
  console.log(`- OWNER_EMAIL: ${ownerEmail || '❌ Chưa cấu hình'}`)
  console.log('======================================================')

  try {
    const transporter = getTransporter()
    console.log('⏳ Đang xác thực với máy chủ SMTP của Google...')
    await transporter.verify()
    console.log('✅ Kết nối SMTP Gmail thành công 100%!')

    console.log(`📬 Đang gửi thử 1 email test tới: ${ownerEmail}...`)

    const info = await transporter.sendMail({
      from: `"QuanNguyenS Test" <${user}>`,
      to: ownerEmail,
      subject: '🧪 [TEST] Kiểm tra kết nối Email tự động QuanNguyenS',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #C9A87C; max-width: 500px; margin: auto; border-radius: 8px;">
          <h2 style="color: #631521; margin-top: 0;">QuanNguyenS Automation System</h2>
          <p>Xin chào Quân,</p>
          <p>Email này được gửi tự động để kiểm tra cấu hình <strong>GMAIL_APP_PASSWORD</strong> trên website.</p>
          <div style="background: #E8F5E9; color: #2E7D32; padding: 12px; border-radius: 6px; font-weight: bold; margin: 16px 0;">
            ✅ Kết nối Gmail thành công 100%! Toàn bộ email xác nhận đơn hàng đã sẵn sàng.
          </div>
          <p style="font-size: 12px; color: #888;">Thời gian gửi: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      `,
    })

    console.log(`🎉 Gửi email test thành công! Message ID: ${info.messageId}`)
    console.log(`👉 Vui lòng mở hộp thư ${ownerEmail} để kiểm tra (nhớ kiểm tra cả mục Spam / Thư rác)!`)
  } catch (error) {
    console.error('\n❌ Gửi email test thất bại:', error.message)
    console.log('\n💡 HƯỚNG DẪN KHẮC PHỤC NHANH:')
    console.log('1. Vào https://myaccount.google.com/security → Đảm bảo "Xác minh 2 bước" (2FA) đang BẬT.')
    console.log('2. Tạo App Password mới (16 ký tự) tại https://myaccount.google.com/apppasswords')
    console.log('3. Mở file .env.local (hoặc .env) và cập nhật:')
    console.log('   GMAIL_USER=ducquan16102006@gmail.com')
    console.log('   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx (16 ký tự viết liền không dấu cách)')
    console.log('   OWNER_EMAIL=ducquan16102006@gmail.com')
    console.log('4. Chạy lại: node test-email.js\n')
  }
}

runTestEmail()

