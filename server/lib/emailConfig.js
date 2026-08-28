// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Chỉ chỉnh sửa khi có yêu cầu rõ ràng, cụ thể nhắm đúng vào nội dung file này.
import nodemailer from 'nodemailer'

export const getTransporter = () => {
  const user = (process.env.GMAIL_USER || '').trim()
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

  if (!user || !pass) {
    throw new Error('Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong .env / .env.local')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass, // Google App Password (16 ký tự viết liền, không dấu cách)
    },
  })
}

// Khởi tạo và kiểm tra kết nối nếu có cấu hình
export const verifyTransporter = async () => {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    console.log('✅ Email server (Gmail) sẵn sàng hoạt động')
    return { success: true }
  } catch (error) {
    const user = (process.env.GMAIL_USER || '').trim()
    const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')

    console.error(`
================================================================================
⚠️ CẢNH BÁO: HỆ THỐNG GMAIL CHƯA HOẠT ĐỘNG!
TOÀN BỘ EMAIL XÁC NHẬN ĐƠN HÀNG SẼ KHÔNG GỬI ĐƯỢC CHO ĐẾN KHI SỬA XONG.
--------------------------------------------------------------------------------
❌ Chi tiết lỗi: ${error.message}
📌 Cấu hình hiện tại:
   - GMAIL_USER: ${user || '(Chưa cấu hình)'}
   - GMAIL_APP_PASSWORD: ${pass ? `(Đã cấu hình - độ dài ${pass.length} ký tự)` : '(Chưa cấu hình)'}
--------------------------------------------------------------------------------
👉 3 BƯỚC KIỂM TRA & KHẮC PHỤC NHANH:
1. Vào https://myaccount.google.com/security → Xác nhận 'Xác minh 2 bước' (2FA) đang BẬT.
2. Tạo App Password mới (16 ký tự) tại https://myaccount.google.com/apppasswords
3. Điền vào file .env.local (hoặc .env) ở thư mục gốc dự án:
   GMAIL_USER=${user || 'ducquan16102006@gmail.com'}
   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx (16 ký tự viết liền không dấu cách)
   OWNER_EMAIL=${process.env.OWNER_EMAIL || user || 'ducquan16102006@gmail.com'}

👉 Kiểm tra kết nối độc lập bằng lệnh: node test-email.js
================================================================================
`)
    return { success: false, error: error.message }
  }
}

export const transporter = {
  sendMail: (...args) => getTransporter().sendMail(...args),
}

export default { getTransporter, verifyTransporter, transporter }

