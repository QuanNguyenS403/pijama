// pijama/tests/loyaltyTelegramProvider.test.js
import test, { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {
  initLoyaltySchema,
  getLoyaltyDb,
  getPendingOtpByVerificationId,
  getPendingOtpByPhone,
  saveTelegramUser,
  getTelegramUserByPhone,
  attachTelegramChatIdToVerification,
} from '../server/lib/loyalty/loyaltyDb.js'
import {
  isTelegramConfigured,
  getTelegramBotUsername,
  sendTelegramOtp,
  handleTelegramWebhookUpdate,
  stopTelegramPolling,
} from '../server/lib/loyalty/otpProviders/telegramProvider.js'
import { sendLoyaltyOtp, verifyLoyaltyOtp } from '../server/lib/loyalty/phoneVerifier.js'
import { registerLoyaltyEndpoints } from '../server/lib/loyaltyEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

let server
let baseUrl

before(async () => {
  process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8835206174:AAG5kNxe-v5kB6Jjhxz0Rls7efQVkvn5LNk'
  process.env.TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'QuanNguyenSbot'
  initLoyaltySchema()

  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerLoyaltyEndpoints(app)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

after(async () => {
  stopTelegramPolling()
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
})

describe('Hệ Thống Xác Thực Ưu Đãi Hội Viên Qua Telegram (Telegram OTP Suite)', () => {
  it('1. Cấu hình Telegram Bot: Token và Username hợp lệ', () => {
    assert.equal(isTelegramConfigured(), true)
    const botUser = getTelegramBotUsername()
    assert.equal(botUser, 'QuanNguyenSbot')
  })

  it('2. Lưu trữ OTP bảo mật và hỗ trợ truy xuất theo Verification ID', async () => {
    const testPhone = '0979888999'
    const sendRes = await sendLoyaltyOtp({
      phone: testPhone,
      fullName: 'Khách Hàng Test Telegram',
      purpose: 'enrollment',
    })

    assert.equal(sendRes.success, true)
    assert.ok(sendRes.verificationId, 'Phải trả về verificationId')
    assert.ok(sendRes.telegramUrl, 'Phải sinh ra đường dẫn Telegram')

    // Kiểm tra trong DB
    const pending = getPendingOtpByVerificationId(sendRes.verificationId)
    assert.ok(pending, 'Bản ghi OTP phải tồn tại trong DB')
    assert.equal(pending.phone, testPhone)
    assert.ok(pending.raw_code_temp, 'Phải lưu mã tạm thời để Bot có thể đọc gửi cho khách')
    assert.equal(pending.verified, 0)
  })

  it('3. Webhook Telegram: Xử lý lệnh /start otp_<verificationId> gửi mã cho khách', async () => {
    const testPhone = '0971223344'
    const sendRes = await sendLoyaltyOtp({
      phone: testPhone,
      fullName: 'Khách Test DeepLink',
      purpose: 'enrollment',
    })

    const verificationId = sendRes.verificationId
    assert.ok(verificationId)

    // Giả lập Telegram gửi webhook khi khách click nút "Mở Telegram Lấy Mã Ngay"
    const fakeUpdate = {
      update_id: 10001,
      message: {
        message_id: 1,
        chat: { id: 123456789 },
        from: {
          id: 123456789,
          is_bot: false,
          first_name: 'Duc',
          last_name: 'Quan',
          username: 'ducquan_test',
        },
        text: `/start otp_${verificationId}`,
      },
    }

    const webhookResult = await handleTelegramWebhookUpdate(fakeUpdate)
    assert.equal(webhookResult.ok, true)
    assert.equal(webhookResult.handled, 'otp_sent_via_deeplink')
    assert.equal(webhookResult.phone, testPhone)

    // Kiểm tra DB đã được cập nhật chat_id
    const updatedPending = getPendingOtpByVerificationId(verificationId)
    assert.equal(updatedPending.telegram_chat_id, '123456789')

    // Kiểm tra bảng loyalty_telegram_users đã lưu liên kết
    const tgUser = getTelegramUserByPhone(testPhone)
    assert.ok(tgUser)
    assert.equal(tgUser.telegram_id, '123456789')
  })

  it('4. Xác minh thành công: Tự động dọn sạch mã tạm raw_code_temp (Single-Use)', async () => {
    const testPhone = '0975667788'
    const sendRes = await sendLoyaltyOtp({
      phone: testPhone,
      fullName: 'Khách Test Dọn Mã',
      purpose: 'enrollment',
    })

    const pending = getPendingOtpByVerificationId(sendRes.verificationId)
    const rawOtp = pending.raw_code_temp
    assert.ok(rawOtp)

    // Thực hiện verify mã
    const verifyRes = verifyLoyaltyOtp({
      phone: testPhone,
      code: rawOtp,
      purpose: 'enrollment',
    })

    assert.equal(verifyRes.success, true)

    // Kiểm tra trong DB: raw_code_temp phải là NULL sau khi xác minh thành công
    const db = getLoyaltyDb()
    const recordAfter = db.prepare('SELECT * FROM loyalty_phone_verifications WHERE id = ?').get(sendRes.verificationId)
    assert.equal(recordAfter.verified, 1)
    assert.equal(recordAfter.raw_code_temp, null, 'raw_code_temp phải bị xóa để chống rò rỉ mã')
  })

  it('5. HTTP Endpoint: /api/loyalty/phone/status trả về đúng trạng thái kiểm tra', async () => {
    const testPhone = '0978999888'
    const sendRes = await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
    })

    const statusRes = await fetch(`${baseUrl}/api/loyalty/phone/status?v=${sendRes.verificationId}`)
    assert.equal(statusRes.status, 200)

    const statusData = await statusRes.json()
    assert.equal(statusData.success, true)
    assert.equal(statusData.verified, false)
    assert.ok(statusData.expiresInSeconds > 0)
  })

  it('6. HTTP Endpoint: POST /api/telegram/webhook chấp nhận và phản hồi HTTP 200', async () => {
    const webhookRes = await fetch(`${baseUrl}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 99999,
        message: {
          chat: { id: 999 },
          text: 'Xin chào bot',
        },
      }),
    })

    assert.equal(webhookRes.status, 200)
    const data = await webhookRes.json()
    assert.equal(data.ok, true)
  })
})
