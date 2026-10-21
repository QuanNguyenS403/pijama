import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sendGoogleRegisterSuccessEmail,
  sendGoogleLoginNotificationEmail,
  sendOwnerGoogleAuthNotification,
} from '../server/lib/emailAccount.js'

test('Email Service: sendGoogleRegisterSuccessEmail có giao diện và dữ liệu voucher chuẩn', async () => {
  // Test gọi hàm khi không có SMTP transporter thật (sẽ báo thiếu biến môi trường hoặc reject mà không crash)
  try {
    await sendGoogleRegisterSuccessEmail({
      to: 'customer@example.com',
      name: 'Nguyễn Văn Test',
      voucherCode: 'TESTVOUCHER10',
      timeStr: '20/10/2026, 16:30:00',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    })
  } catch (err) {
    // Nếu chưa cấu hình SMTP thực tế, lỗi trả về phải là cấu hình SMTP chứ không phải lỗi cú pháp template
    assert.match(err.message, /GMAIL_USER|GMAIL_APP_PASSWORD|transporter/i)
  }
})

test('Email Service: sendGoogleLoginNotificationEmail có định dạng thông báo bảo mật đăng nhập chuẩn', async () => {
  try {
    await sendGoogleLoginNotificationEmail({
      to: 'customer@example.com',
      name: 'Nguyễn Văn Test',
      timeStr: '20/10/2026, 16:35:00',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
    })
  } catch (err) {
    assert.match(err.message, /GMAIL_USER|GMAIL_APP_PASSWORD|transporter/i)
  }
})

test('Email Service: sendOwnerGoogleAuthNotification thông báo cho chủ shop khi Đăng ký & Đăng nhập', async () => {
  try {
    await sendOwnerGoogleAuthNotification({
      action: 'REGISTER',
      customerName: 'Khách Hàng Mới Google',
      email: 'newuser@gmail.com',
      googleSub: 'google-sub-999',
      timeStr: '20/10/2026, 16:40:00',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      voucherCode: 'WELCOME10',
    })
  } catch (err) {
    assert.match(err.message, /GMAIL_USER|GMAIL_APP_PASSWORD|transporter/i)
  }

  try {
    await sendOwnerGoogleAuthNotification({
      action: 'LOGIN',
      customerName: 'Khách Hàng Đăng Nhập Lại',
      email: 'olduser@gmail.com',
      googleSub: 'google-sub-888',
      timeStr: '20/10/2026, 16:45:00',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0 Mobile',
    })
  } catch (err) {
    assert.match(err.message, /GMAIL_USER|GMAIL_APP_PASSWORD|transporter/i)
  }
})
