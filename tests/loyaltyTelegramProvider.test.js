// pijama/tests/loyaltyTelegramProvider.test.js
import test, { describe, it, before, after, beforeEach } from 'node:test'
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
  syncTelegramWebhook,
  validateTelegramBotToken,
  validateTelegramWebhookSecret,
  validateTelegramOwnerChatId,
  sendTelegramOwnerNotification,
  getTelegramConfigDiagnostics,
  __resetTelegramOwnerWarningCache,
} from '../server/lib/loyalty/otpProviders/telegramProvider.js'
import { validateEnvironment } from '../server/lib/envCheck.js'
import { sendLoyaltyOtp, verifyLoyaltyOtp } from '../server/lib/loyalty/phoneVerifier.js'
import { registerLoyaltyEndpoints } from '../server/lib/loyaltyEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'
import { generateAdminSessionToken } from '../server/lib/adminAuth.js'

const DUMMY_BOT_TOKEN = '1234567890:TEST_DUMMY_BOT_TOKEN_FOR_UNIT_TESTS_ONLY'
const DUMMY_WEBHOOK_SECRET = 'test_webhook_secret_token_9eF3C3lj5K_valid'

let server
let baseUrl
let originalFetch
let telegramApiCalls = []
let mockGetWebhookInfoResult = {
  url: 'https://www.quannguyens.com/api/telegram/webhook',
  pending_update_count: 0,
  allowed_updates: ['message', 'callback_query'],
}
let mockSetWebhookOk = true

const ENV_KEYS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_OWNER_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_WEBHOOK_URL',
]
const savedEnv = {}

function makeJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

before(async () => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k]
  }

  process.env.TELEGRAM_BOT_TOKEN = DUMMY_BOT_TOKEN
  process.env.TELEGRAM_BOT_USERNAME = 'QuanNguyenSbot'
  process.env.TELEGRAM_OWNER_CHAT_ID = '987654321'
  delete process.env.TELEGRAM_WEBHOOK_SECRET
  process.env.TELEGRAM_WEBHOOK_URL = 'https://www.quannguyens.com/api/telegram/webhook'

  originalFetch = globalThis.fetch
  globalThis.fetch = async function mockedTelegramFetch(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : (input instanceof URL ? input.href : input?.url || '')
    if (rawUrl.startsWith('https://api.telegram.org/')) {
      const parsedBody = init?.body ? JSON.parse(init.body) : null
      telegramApiCalls.push({ url: rawUrl, method: init?.method || 'GET', body: parsedBody })

      if (rawUrl.endsWith('/getMe')) {
        return makeJsonResponse({
          ok: true,
          result: { id: 1234567890, is_bot: true, first_name: 'QuanNguyenS', username: 'QuanNguyenSbot' },
        })
      }
      if (rawUrl.endsWith('/getWebhookInfo')) {
        return makeJsonResponse({ ok: true, result: mockGetWebhookInfoResult })
      }
      if (rawUrl.endsWith('/setWebhook')) {
        return makeJsonResponse(
          mockSetWebhookOk
            ? { ok: true, result: true, description: 'Webhook was set' }
            : { ok: false, error_code: 400, description: 'Bad Request: mock error' },
          mockSetWebhookOk ? 200 : 400
        )
      }
      if (rawUrl.endsWith('/sendMessage')) {
        return makeJsonResponse({
          ok: true,
          result: { message_id: 101, chat: { id: parsedBody?.chat_id }, text: parsedBody?.text },
        })
      }
      return makeJsonResponse({ ok: true, result: {} })
    }
    return originalFetch.call(this, input, init)
  }

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

beforeEach(() => {
  telegramApiCalls = []
  mockSetWebhookOk = true
  mockGetWebhookInfoResult = {
    url: 'https://www.quannguyens.com/api/telegram/webhook',
    pending_update_count: 0,
    allowed_updates: ['message', 'callback_query'],
  }
  process.env.TELEGRAM_BOT_TOKEN = DUMMY_BOT_TOKEN
  process.env.TELEGRAM_BOT_USERNAME = 'QuanNguyenSbot'
  process.env.TELEGRAM_OWNER_CHAT_ID = '987654321'
  delete process.env.TELEGRAM_WEBHOOK_SECRET
  process.env.TELEGRAM_WEBHOOK_URL = 'https://www.quannguyens.com/api/telegram/webhook'
  __resetTelegramOwnerWarningCache()
})

after(async () => {
  stopTelegramPolling()
  if (originalFetch) {
    globalThis.fetch = originalFetch
  }
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
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

  it('6. HTTP Endpoint: POST /api/telegram/webhook chấp nhận và phản hồi HTTP 200 khi không đặt secret', async () => {
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

  it('7. Validators: Bắt lỗi chính xác placeholder <BOT_TOKEN>, <secret> có ngoặc nhọn, @QuanNguyenSbot và trùng Bot ID', () => {
    // Token validation
    assert.equal(validateTelegramBotToken('').code, 'MISSING')
    assert.equal(validateTelegramBotToken('<BOT_TOKEN>').code, 'PLACEHOLDER')
    assert.equal(validateTelegramBotToken('not-a-valid-token').code, 'INVALID_FORMAT')
    const okToken = validateTelegramBotToken(DUMMY_BOT_TOKEN)
    assert.equal(okToken.valid, true)
    assert.equal(okToken.botId, '1234567890')

    // Webhook secret validation
    assert.equal(validateTelegramWebhookSecret('').valid, true)
    assert.equal(validateTelegramWebhookSecret('').configured, false)
    assert.equal(
      validateTelegramWebhookSecret('<9eF3C3lj5K-e62lth9IPyccVTiVBbxA9g-6YcccoKPg>').code,
      'INVALID_SECRET_CHARS'
    )
    assert.equal(validateTelegramWebhookSecret('abc def').code, 'INVALID_SECRET_CHARS')
    const okSecret = validateTelegramWebhookSecret(DUMMY_WEBHOOK_SECRET)
    assert.equal(okSecret.valid, true)
    assert.equal(okSecret.configured, true)

    // Owner Chat ID validation
    assert.equal(validateTelegramOwnerChatId('', DUMMY_BOT_TOKEN).code, 'MISSING')
    assert.equal(validateTelegramOwnerChatId('<CHAT_ID>', DUMMY_BOT_TOKEN).code, 'PLACEHOLDER')
    assert.equal(validateTelegramOwnerChatId('@QuanNguyenSbot', DUMMY_BOT_TOKEN).code, 'USERNAME_NOT_ALLOWED')
    assert.equal(validateTelegramOwnerChatId('1234567890', DUMMY_BOT_TOKEN).code, 'EQUALS_BOT_ID')
    assert.equal(validateTelegramOwnerChatId('abc_xyz', DUMMY_BOT_TOKEN).code, 'INVALID_FORMAT')
    assert.equal(validateTelegramOwnerChatId('987654321', DUMMY_BOT_TOKEN).valid, true)
    assert.equal(validateTelegramOwnerChatId('-100123456789', DUMMY_BOT_TOKEN).valid, true)
  })

  it('8. Lệnh /myid và /id trả về đúng Chat ID số nguyên để chủ shop điền vào TELEGRAM_OWNER_CHAT_ID', async () => {
    const res1 = await handleTelegramWebhookUpdate({
      update_id: 20001,
      message: {
        chat: { id: 555666777 },
        from: { id: 555666777, username: 'quannguyen' },
        text: '/myid',
      },
    })
    assert.equal(res1.handled, 'myid_sent')
    assert.equal(res1.chatId, '555666777')

    const msgCall = telegramApiCalls.find((c) => c.url.endsWith('/sendMessage'))
    assert.ok(msgCall)
    assert.equal(msgCall.body.chat_id, 555666777)
    assert.ok(msgCall.body.text.includes('555666777'))
    assert.ok(msgCall.body.text.includes('TELEGRAM_OWNER_CHAT_ID'))

    telegramApiCalls = []
    const res2 = await handleTelegramWebhookUpdate({
      update_id: 20002,
      message: {
        chat: { id: 555666777 },
        from: { id: 555666777 },
        text: '/id@QuanNguyenSbot',
      },
    })
    assert.equal(res2.handled, 'myid_sent')
  })

  it('9. Bảo mật POST /api/telegram/webhook: Chặn 401 khi thiếu secret hoặc gửi sai (kể cả bọc < >), cho qua 200 khi khớp', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = DUMMY_WEBHOOK_SECRET

    // Thiếu header
    const noHeaderRes = await fetch(`${baseUrl}/api/telegram/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_id: 30001, message: { chat: { id: 1 }, text: 'hi' } }),
    })
    assert.equal(noHeaderRes.status, 401)

    // Gửi nhầm kèm ngoặc nhọn <secret>
    const bracketRes = await fetch(`${baseUrl}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': `<${DUMMY_WEBHOOK_SECRET}>`,
      },
      body: JSON.stringify({ update_id: 30002, message: { chat: { id: 1 }, text: 'hi' } }),
    })
    assert.equal(bracketRes.status, 401)

    // Gửi đúng secret
    const validRes = await fetch(`${baseUrl}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': DUMMY_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ update_id: 30003, message: { chat: { id: 1 }, text: '/myid' } }),
    })
    assert.equal(validRes.status, 200)
    const validData = await validRes.json()
    assert.equal(validData.ok, true)
    assert.equal(validData.result.handled, 'myid_sent')
  })

  it('10. syncTelegramWebhook: Vẫn đồng bộ setWebhook khi có secret dù URL khớp, và chặn khi secret có < >', async () => {
    // 10a. Khi có TELEGRAM_WEBHOOK_SECRET hợp lệ: vẫn gọi setWebhook kèm secret_token dù getWebhookInfo đã đúng URL
    process.env.TELEGRAM_WEBHOOK_SECRET = DUMMY_WEBHOOK_SECRET
    const syncRes = await syncTelegramWebhook({ allowInTest: true })
    assert.equal(syncRes.ok, true)
    assert.equal(syncRes.action, 'synced')
    const setCall = telegramApiCalls.find((c) => c.url.endsWith('/setWebhook'))
    assert.ok(setCall, 'Phải gọi setWebhook để đồng bộ secret_token')
    assert.equal(setCall.body.url, 'https://www.quannguyens.com/api/telegram/webhook')
    assert.equal(setCall.body.secret_token, DUMMY_WEBHOOK_SECRET)

    // 10b. Khi secret bọc < >: từ chối trước khi gọi Telegram API
    telegramApiCalls = []
    process.env.TELEGRAM_WEBHOOK_SECRET = `<${DUMMY_WEBHOOK_SECRET}>`
    const badRes = await syncTelegramWebhook({ allowInTest: true })
    assert.equal(badRes.ok, false)
    assert.equal(badRes.reason, 'INVALID_WEBHOOK_SECRET')
    assert.equal(telegramApiCalls.length, 0)
  })

  it('11. sendTelegramOwnerNotification: Bỏ qua an toàn khi cấu hình @QuanNguyenSbot/BotID, gửi đúng khi dùng Chat ID cá nhân', async () => {
    process.env.TELEGRAM_OWNER_CHAT_ID = '@QuanNguyenSbot'
    const resUser = await sendTelegramOwnerNotification({ text: 'Test 1' })
    assert.equal(resUser.ok, false)
    assert.equal(resUser.skipped, true)
    assert.equal(resUser.code, 'USERNAME_NOT_ALLOWED')
    assert.equal(telegramApiCalls.length, 0)

    process.env.TELEGRAM_OWNER_CHAT_ID = '1234567890'
    const resBotId = await sendTelegramOwnerNotification({ text: 'Test 2' })
    assert.equal(resBotId.ok, false)
    assert.equal(resBotId.skipped, true)
    assert.equal(resBotId.code, 'EQUALS_BOT_ID')
    assert.equal(telegramApiCalls.length, 0)

    process.env.TELEGRAM_OWNER_CHAT_ID = '987654321'
    const resOk = await sendTelegramOwnerNotification({ text: '<b>Test OK</b>' })
    assert.equal(resOk.ok, true)
    assert.equal(telegramApiCalls.length, 1)
    assert.equal(telegramApiCalls[0].body.chat_id, '987654321')
  })

  it('12. envCheck & Diagnostics: Phát hiện chính xác @QuanNguyenSbot, BotID, <secret> và domain non-www', async () => {
    const envReport = validateEnvironment({
      NODE_ENV: 'production',
      PORT: '10000',
      ADMIN_PASSWORD: 'test-admin-password-hardening-2026',
      ADMIN_SESSION_SECRET: 'test-admin-session-secret-key-length-over-32-chars-a',
      ORDER_TOKEN_SECRET: 'test-order-token-secret-key-length-over-32-chars-b',
      CUSTOMER_AUTH_SECRET: 'test-customer-auth-secret-key-length-over-32-chars-c',
      JWT_SECRET: 'test-jwt-secret-key-distinct-length-over-32-chars-d',
      TELEGRAM_BOT_TOKEN: DUMMY_BOT_TOKEN,
      TELEGRAM_OWNER_CHAT_ID: '@QuanNguyenSbot',
      TELEGRAM_WEBHOOK_SECRET: `<${DUMMY_WEBHOOK_SECRET}>`,
      TELEGRAM_WEBHOOK_URL: 'https://quannguyens.com/api/telegram/webhook',
    })

    assert.ok(envReport.warnings.some((w) => w.includes('[TELEGRAM CONFIG]') && w.includes('TELEGRAM_OWNER_CHAT_ID')))
    assert.ok(envReport.warnings.some((w) => w.includes('[TELEGRAM CONFIG]') && w.includes('TELEGRAM_WEBHOOK_SECRET')))
    assert.ok(envReport.warnings.some((w) => w.includes('[TELEGRAM CONFIG]') && w.includes('TELEGRAM_WEBHOOK_URL')))

    // Kiểm tra thêm trường hợp trùng Bot ID
    const botIdReport = validateEnvironment({
      NODE_ENV: 'production',
      ADMIN_PASSWORD: 'test-admin-password-hardening-2026',
      ADMIN_SESSION_SECRET: 'test-admin-session-secret-key-length-over-32-chars-a',
      ORDER_TOKEN_SECRET: 'test-order-token-secret-key-length-over-32-chars-b',
      CUSTOMER_AUTH_SECRET: 'test-customer-auth-secret-key-length-over-32-chars-c',
      JWT_SECRET: 'test-jwt-secret-key-distinct-length-over-32-chars-d',
      TELEGRAM_BOT_TOKEN: DUMMY_BOT_TOKEN,
      TELEGRAM_OWNER_CHAT_ID: '1234567890',
    })
    assert.ok(botIdReport.warnings.some((w) => w.includes('[TELEGRAM CONFIG]') && w.includes('trùng với ID của chính Telegram Bot')))

    // Kiểm tra Admin endpoint /api/admin/telegram/status không rò rỉ token/secret
    process.env.TELEGRAM_WEBHOOK_SECRET = DUMMY_WEBHOOK_SECRET
    const unauthStatus = await fetch(`${baseUrl}/api/admin/telegram/status`)
    assert.equal(unauthStatus.status, 401)

    const adminToken = generateAdminSessionToken()
    const authStatus = await fetch(`${baseUrl}/api/admin/telegram/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert.equal(authStatus.status, 200)
    const rawBody = await authStatus.text()
    assert.equal(rawBody.includes(DUMMY_BOT_TOKEN), false, 'Không được làm lộ TELEGRAM_BOT_TOKEN')
    assert.equal(rawBody.includes(DUMMY_WEBHOOK_SECRET), false, 'Không được làm lộ TELEGRAM_WEBHOOK_SECRET')
    const parsed = JSON.parse(rawBody)
    assert.equal(parsed.success, true)
    assert.equal(parsed.liveTelegram.bot.username, 'QuanNguyenSbot')
    assert.equal(parsed.diagnostics.botToken.valid, true)
  })
})
