import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { registerEnterpriseAuthEndpoints } from '../server/lib/enterpriseAuthEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'
import { sendVerificationCodeEmail, escapeHtml } from '../server/lib/emailAccount.js'
import { setEmailTransportForTests, sendEmailViaHttps } from '../server/lib/httpsEmailService.js'
import { getDb } from '../server/lib/accountDb.js'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHA 5: TẤN CÔNG ĐỐI KHÁNG TỰ THÂN (ADVERSARIAL ATTACK SUITE)
 * Đóng vai kẻ tấn công thực thi 9 vector xâm nhập, kiểm tra tính bọc thép của hệ thống
 * ═══════════════════════════════════════════════════════════════════════════
 */

const codeGsContent = fs.readFileSync(path.resolve(process.cwd(), 'integrations/gmail-bridge/Code.gs'), 'utf8')

function createAppsScriptVm(options = {}) {
  const {
    scriptProperties = { QNS_SEND_SECRET: 'super_secret_auth_key_12345' },
    quotaRemaining = 100,
    sendEmailError = null,
    cacheStore = {},
  } = options

  const logs = []
  const sentEmails = []

  const sandbox = {
    Logger: { log: (...args) => logs.push(args.join(' ')) },
    Utilities: {
      sleep: () => {},
      base64Encode: (str) => Buffer.from(str).toString('base64'),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => scriptProperties[k] || null,
        getProperties: () => ({ ...scriptProperties }),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => cacheStore[k] || null,
        put: (k, v, ttl) => { cacheStore[k] = v },
      }),
    },
    MailApp: {
      getRemainingDailyQuota: () => quotaRemaining,
    },
    GmailApp: {
      sendEmail: (to, subject, body, opt) => {
        if (sendEmailError) throw sendEmailError
        sentEmails.push({ to, subject, body, opt })
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content) => ({
        content,
        setMimeType: function () { return this },
        getContent: () => content,
      }),
    },
    console,
  }

  const context = vm.createContext(sandbox)
  vm.runInContext(codeGsContent, context)

  return {
    context,
    sentEmails,
    logs,
    doPost: (e) => {
      const out = context.doPost(e)
      const raw = out.getContent ? out.getContent() : out.content
      return JSON.parse(raw)
    },
  }
}

describe('PHA 5: TẤN CÔNG ĐỐI KHÁNG TỰ THÂN (ADVERSARIAL SECURITY SUITE)', () => {
  let app, server, baseUrl

  before(async () => {
    app = express()
    app.use(express.json())
    app.use(customerSessionMiddleware)
    registerEnterpriseAuthEndpoints(app)
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve))
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 1: Tấn công Open Relay vào Apps Script Webhook
  // ─────────────────────────────────────────────────────────────
  it('Attack 1: Gọi webhook không secret hoặc secret giả mạo => bị từ chối UNAUTHORIZED ngay lập tức', () => {
    const bridge = createAppsScriptVm()

    // Thử gửi không secret
    const resNoSecret = bridge.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'SEND_EMAIL',
          to: 'target@victim.com',
          subject: 'Phishing scam',
          html: '<p>Click here</p>',
        }),
      },
    })
    assert.equal(resNoSecret.success, false)
    assert.equal(resNoSecret.code, 'UNAUTHORIZED')

    // Thử gửi secret sai
    const resWrongSecret = bridge.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'SEND_EMAIL',
          secret: 'forged_fake_secret',
          to: 'target@victim.com',
          subject: 'Phishing scam',
          html: '<p>Click here</p>',
        }),
      },
    })
    assert.equal(resWrongSecret.success, false)
    assert.equal(resWrongSecret.code, 'UNAUTHORIZED')
    assert.equal(bridge.sentEmails.length, 0, 'Tuyệt đối không được gửi email khi sai secret')
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 2: Tấn công phát lại (Replay Attack) với cùng requestId
  // ─────────────────────────────────────────────────────────────
  it('Attack 2: Replay cùng requestId => Idempotent, không gửi bản thứ 2', () => {
    const bridge = createAppsScriptVm()
    const payload = {
      action: 'SEND_EMAIL',
      secret: 'super_secret_auth_key_12345',
      requestId: 'req_unique_001',
      to: 'buyer@example.com',
      subject: 'Mã xác minh đơn',
      text: 'Mã: 123456',
      html: '<p>Mã: 123456</p>',
    }

    // Gửi lần 1
    const res1 = bridge.doPost({ postData: { contents: JSON.stringify(payload) } })
    assert.equal(res1.success, true)
    assert.equal(bridge.sentEmails.length, 1)

    // Replay lần 2 với cùng requestId
    const res2 = bridge.doPost({ postData: { contents: JSON.stringify(payload) } })
    assert.equal(res2.success, true)
    assert.equal(bridge.sentEmails.length, 1, 'Lần 2 phải trả kết quả idempotent đã cache, KHÔNG gọi GmailApp lần thứ 2!')
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 3: Giả mạo IP bằng Header X-Forwarded-For ngẫu nhiên
  // ─────────────────────────────────────────────────────────────
  it('Attack 3: Giả mạo X-Forwarded-For để lách Rate Limit => Thất bại, máy chủ dùng req.ip tin cậy', async () => {
    const spamEmail = `spam_xff_${Date.now()}@gmail.com`

    // Gửi lần 1
    const res1 = await fetch(`${baseUrl}/api/auth/register/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.0.1',
      },
      body: JSON.stringify({
        email: spamEmail,
        password: 'Password@123',
        fullName: 'Spammer',
      }),
    })
    assert.equal(res1.status, 200)

    // Gửi lần 2 đổi X-Forwarded-For sang IP khác nhưng cùng email
    const res2 = await fetch(`${baseUrl}/api/auth/register/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.99',
      },
      body: JSON.stringify({
        email: spamEmail,
        password: 'Password@123',
        fullName: 'Spammer',
      }),
    })

    // Bị chặn 429 do Cooldown 60s theo Email
    assert.equal(res2.status, 429, 'Phải bị chặn 429 do rate limit theo email!')
    const data2 = await res2.json()
    assert.equal(data2.success, false)
    assert.ok(data2.cooldownSeconds > 0)
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 4: Chèn Stored XSS / HTML Injection vào fullName
  // ─────────────────────────────────────────────────────────────
  it('Attack 4: XSS / HTML Injection trong fullName => Ký tự độc hại được escape an toàn', async () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      '\'><svg/onload=confirm(document.cookie)>',
    ]

    for (const payload of xssPayloads) {
      const escaped = escapeHtml(payload)
      assert.doesNotMatch(escaped, /<script>/i)
      assert.doesNotMatch(escaped, /<img/i)
      assert.doesNotMatch(escaped, /<svg/i)
      assert.ok(escaped.includes('&lt;') || escaped.includes('&quot;') || escaped.includes('&#39;'))
    }
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 5: CRLF Injection trong Subject và FromName (Email Header Injection)
  // ─────────────────────────────────────────────────────────────
  it('Attack 5: CRLF Header Injection trong subject hoặc fromName => Bị từ chối HEADER_INJECTION_DETECTED', () => {
    const bridge = createAppsScriptVm()

    // Inject CRLF vào subject
    const resCrlfSubject = bridge.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'SEND_EMAIL',
          secret: 'super_secret_auth_key_12345',
          to: 'victim@example.com',
          subject: 'Tiêu đề\r\nBcc: evil_hacker@darkweb.org',
          html: '<p>Nội dung</p>',
        }),
      },
    })
    assert.equal(resCrlfSubject.success, false)
    assert.equal(resCrlfSubject.code, 'HEADER_INJECTION_DETECTED')

    // Inject CRLF vào fromName
    const resCrlfFromName = bridge.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'SEND_EMAIL',
          secret: 'super_secret_auth_key_12345',
          to: 'victim@example.com',
          subject: 'Tiêu đề an toàn',
          fromName: 'QuanNguyenS\nTo: hacked@target.com',
          html: '<p>Nội dung</p>',
        }),
      },
    })
    assert.equal(resCrlfFromName.success, false)
    assert.equal(resCrlfFromName.code, 'HEADER_INJECTION_DETECTED')
  })

  // ─────────────────────────────────────────────────────────────
  // ATTACK 6: Timing & Payload User Enumeration trên password/forgot
  // ─────────────────────────────────────────────────────────────
  it('Attack 6: Enumeration trên password/forgot => Cùng cấu trúc dữ liệu và không lộ registered: false', async () => {
    const existingEmail = `exist_user_${Date.now()}@gmail.com`
    const nonExistingEmail = `ghost_user_${Date.now()}@gmail.com`

    // Đăng ký trước 1 user
    const db = getDb()
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, verified, created_at, updated_at)
      VALUES (?, ?, 'fake_hash', 'Tồn tại', 'customer', 'active', 1, ?, ?)
    `).run(`usr_enum_${Date.now()}`, existingEmail, new Date().toISOString(), new Date().toISOString())

    // 1. Quên mật khẩu cho user TỒN TẠI
    const resExist = await fetch(`${baseUrl}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: existingEmail }),
    })
    const dataExist = await resExist.json()

    // 2. Quên mật khẩu cho user KHÔNG TỒN TẠI
    const resNonExist = await fetch(`${baseUrl}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nonExistingEmail }),
    })
    const dataNonExist = await resNonExist.json()

    // Cả 2 đều trả về status 200
    assert.equal(resExist.status, 200)
    assert.equal(resNonExist.status, 200)

    // Cả 2 đều có cấu trúc các key giống hệt nhau
    assert.deepEqual(Object.keys(dataExist).sort(), Object.keys(dataNonExist).sort())

    // Tuyệt đối không chứa trường registered: false
    assert.equal(dataExist.registered, undefined)
    assert.equal(dataNonExist.registered, undefined)

    // Thông điệp trả về trung tính giống nhau
    assert.ok(dataExist.message.includes('Nếu địa chỉ email'))
    assert.ok(dataNonExist.message.includes('Nếu địa chỉ email'))
  })
})

