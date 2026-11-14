import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sendGoogleRegisterSuccessEmail,
  sendGoogleLoginNotificationEmail,
  sendOwnerGoogleAuthNotification,
  sendVerificationCodeEmail,
  sendPasswordResetOtpEmail,
  sendWelcomeVoucherEmail,
  sendPasswordResetSuccessEmail,
} from '../server/lib/emailAccount.js'
import { setEmailTransportForTests } from '../server/lib/httpsEmailService.js'

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

test('Email Service: sendVerificationCodeEmail gửi mã OTP 6 số xác thực khi khách đăng ký thủ công', async () => {
  // 1. Kiểm tra từ chối mã không hợp lệ
  await assert.rejects(
    () => sendVerificationCodeEmail({ to: 'user@example.com', code: '123' }),
    /6 chữ số/i
  )

  // 2. Kiểm tra gọi mã hợp lệ 6 số (trong test runner chạy qua email sandbox)
  const res = await sendVerificationCodeEmail({
    to: 'customer@example.com',
    code: '123456',
    name: 'Nguyễn Văn Test',
  })
  assert.ok(res, 'Phải trả về kết quả dispatch email')
})

test('Email Service: sendPasswordResetOtpEmail gửi mã xác minh 6 số khi khách quên mật khẩu', async () => {
  await assert.rejects(
    () => sendPasswordResetOtpEmail({ to: 'user@example.com', code: 'abc' }),
    /6 chữ số/i
  )

  const res = await sendPasswordResetOtpEmail({
    to: 'customer@example.com',
    code: '888999',
    name: 'Nguyễn Văn Quên Mật Khẩu',
  })
  assert.ok(res, 'Phải trả về kết quả dispatch email')
})

test('Email Service: sendWelcomeVoucherEmail và sendPasswordResetSuccessEmail hoạt động chuẩn', async () => {
  const welcomeRes = await sendWelcomeVoucherEmail({
    to: 'customer@example.com',
    code: 'WELCOME10',
    name: 'Khách Hàng Mới',
  })
  assert.ok(welcomeRes)

  const resetSuccessRes = await sendPasswordResetSuccessEmail({
    to: 'customer@example.com',
    name: 'Khách Hàng',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  })
  assert.ok(resetSuccessRes)
})

test('Email Service: sendGoogleLoginNotificationEmail và sendOwnerGoogleAuthNotification không chứa emoji lỗi hoặc Địa chỉ IP', async () => {
  const sentEmails = []
  setEmailTransportForTests(async (mail) => {
    sentEmails.push(mail)
    return { transport: 'custom_test_mock', messageId: `mock_${sentEmails.length}` }
  })

  try {
    await sendGoogleLoginNotificationEmail({
      to: 'customer@example.com',
      name: 'QuanNguyenS',
      timeStr: '16:11:57 13/11/2026',
      ip: '10.29.117.13',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    })

    await sendOwnerGoogleAuthNotification({
      action: 'REGISTER',
      customerName: 'Khách Hàng Mới',
      email: 'newcustomer@example.com',
      googleSub: 'sub-1',
      timeStr: '16:11:57 13/11/2026',
      ip: '10.29.117.13',
      userAgent: 'Mozilla/5.0',
      voucherCode: 'WELCOME10',
    })

    await sendOwnerGoogleAuthNotification({
      action: 'LOGIN',
      customerName: 'Khách Hàng Cũ',
      email: 'oldcustomer@example.com',
      googleSub: 'sub-2',
      timeStr: '16:11:57 13/11/2026',
      ip: '10.29.117.13',
      userAgent: 'Mozilla/5.0',
    })

    assert.equal(sentEmails.length, 3)

    const customerMail = sentEmails[0]
    assert.ok(customerMail.html.includes('Thông Báo Bảo Mật Đăng Nhập'))
    assert.ok(!customerMail.html.includes('🛡️'))
    assert.ok(!customerMail.html.includes('🌐'))
    assert.ok(!customerMail.html.includes('Địa chỉ IP'))
    assert.ok(!customerMail.html.includes('10.29.117.13'))
    assert.ok(!customerMail.text.includes('Địa chỉ IP'))
    assert.ok(!customerMail.text.includes('10.29.117.13'))

    for (const adminMail of [sentEmails[1], sentEmails[2]]) {
      assert.ok(!adminMail.subject.includes('👤'))
      assert.ok(!adminMail.subject.includes('🔐'))
      assert.ok(!adminMail.html.includes('👤'))
      assert.ok(!adminMail.html.includes('🔐'))
    }
  } finally {
    setEmailTransportForTests(null)
  }
})
