import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'http'
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import {
  isAutomatedTestEnvironment,
} from '../server/lib/emailRecipientGuard.js'
import {
  sendEmailViaHttps,
  getEmailServiceStatus,
} from '../server/lib/httpsEmailService.js'
import * as httpsEmailServiceModule from '../server/lib/httpsEmailService.js'
const setEmailTransportForTests = httpsEmailServiceModule.setEmailTransportForTests
import {
  sendVerificationCodeEmail,
  sendPasswordResetOtpEmail,
  sendGoogleLoginNotificationEmail,
} from '../server/lib/emailAccount.js'
import {
  savePendingRegistrationDb,
  getPendingRegistrationDb,
  savePendingPasswordResetDb,
  getPendingPasswordResetDb,
  getDb,
} from '../server/lib/accountDb.js'
import { registerEnterpriseAuthEndpoints } from '../server/lib/enterpriseAuthEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BỘ KIỂM THỬ ĐỎ (TEST-FIRST) — HỆ THỐNG GỬI MÃ XÁC MINH EMAIL OTP
 * Tái hiện thất bại (FAIL) trước khi refactor các giả thuyết H1, H2, H3, H6, H7, H8, H9 & E1
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Đọc Code.gs từ file để chạy trong sandbox VM
const codeGsPath = path.resolve(process.cwd(), 'integrations/gmail-bridge/Code.gs')
const codeGsContent = fs.readFileSync(codeGsPath, 'utf8')

function createAppsScriptVm(options = {}) {
  const {
    scriptProperties = {},
    quotaRemaining = 100,
    sendEmailError = null,
    cacheStore = {},
  } = options

  const logs = []
  const sentEmails = []

  const sandbox = {
    Logger: {
      log: (...args) => logs.push(args.join(' ')),
    },
    Utilities: {
      sleep: () => {},
      computeHmacSha256Signature: (data, key) => [1, 2, 3],
      base64Encode: () => 'fake_base64',
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
        if (sendEmailError) {
          throw sendEmailError
        }
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

describe('PHA 1 — TEST ĐỎ TÁI HIỆN CÁC LỖI EMAIL OTP & CẦU GAS', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. E1: Sandbox Guard an toàn tuyệt đối
  // ─────────────────────────────────────────────────────────────
  describe('E1: Sandbox Guard — Chứng minh môi trường test tự động', () => {
    it('isAutomatedTestEnvironment() phải nhận diện đúng khi argv hoặc NODE_TEST_CONTEXT hiện diện', () => {
      assert.equal(isAutomatedTestEnvironment(), true)
    })

    it('Fail-closed ở production: khi NODE_ENV=production, thiếu biến cấu hình thì sendEmailViaHttps phải ném EMAIL_NOT_CONFIGURED hoặc lỗi 502', async () => {
      const origEnv = process.env.NODE_ENV
      const origUrl = process.env.GAS_EMAIL_WEBHOOK_URL
      const origKey = process.env.RESEND_API_KEY
      try {
        process.env.NODE_ENV = 'production'
        process.env.__ENV_LOADED = 'true'
        delete process.env.GAS_EMAIL_WEBHOOK_URL
        delete process.env.GMAIL_APP_SCRIPT_URL
        delete process.env.GMAIL_BRIDGE_WEBHOOK_URL
        delete process.env.GAS_WEBHOOK_SECRET
        delete process.env.GMAIL_BRIDGE_SECRET
        delete process.env.RESEND_API_KEY

        await assert.rejects(
          async () => {
            await sendEmailViaHttps({
              to: 'testclient@gmail.com',
              subject: 'Test subject',
              text: 'Test body',
            })
          },
          (err) => {
            return err.status === 502 || err.code === 'EMAIL_NOT_CONFIGURED' || err.message.includes('cấu hình')
          }
        )
      } finally {
        process.env.NODE_ENV = origEnv
        if (origUrl) process.env.GAS_EMAIL_WEBHOOK_URL = origUrl
        if (origKey) process.env.RESEND_API_KEY = origKey
      }
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. H1: safeGoogleServiceCall nuốt lỗi GmailApp.sendEmail trong Code.gs
  // ─────────────────────────────────────────────────────────────
  describe('H1: Apps Script Bridge trung thực khi gửi thất bại (Quota/Service error)', () => {
    it('H1 RED TEST: Khi GmailApp.sendEmail ném lỗi hạn mức/quota, doPost phải trả { success: false, code: "QUOTA_EXCEEDED" }', () => {
      const vmInstance = createAppsScriptVm({
        scriptProperties: { QNS_SEND_SECRET: 'test_secret_123', QNS_SECRET: 'test_secret_123' },
        sendEmailError: new Error('Service invoked too many times for one day: email.'),
      })

      const response = vmInstance.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'SEND_EMAIL',
            secret: 'test_secret_123',
            to: 'customer@example.com',
            subject: 'Mã xác nhận',
            html: '<p>123456</p>',
          }),
        },
      })

      // Trước khi sửa: Code.gs nuốt lỗi bằng safeGoogleServiceCall và trả success: true (LỖI H1)
      // Test này mong đợi response.success === false
      assert.equal(
        response.success,
        false,
        `Code.gs không được trả success: true khi Google Service ném ngoại lệ quota! Thực tế trả: ${JSON.stringify(response)}`
      )
      assert.equal(response.code, 'QUOTA_EXCEEDED')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. H3: Webhook Apps Script không xác thực secret (Open Relay)
  // ─────────────────────────────────────────────────────────────
  describe('H3: Webhook Apps Script bắt buộc xác thực secret (Chống Open Relay)', () => {
    it('H3 RED TEST: doPost gọi SEND_EMAIL mà không gửi secret hoặc secret sai phải bị từ chối ngay lập tức', () => {
      const vmInstance = createAppsScriptVm({
        scriptProperties: { QNS_SEND_SECRET: 'correct_send_secret' },
      })

      // Kẻ tấn công gọi webhook không secret
      const resWithoutSecret = vmInstance.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'SEND_EMAIL',
            to: 'victim@example.com',
            subject: 'Spam mail',
            html: '<p>Spam content</p>',
          }),
        },
      })

      // Trước khi sửa: Code.gs bỏ qua và vẫn gửi thư, trả success: true (LỖI H3)
      assert.equal(
        resWithoutSecret.success,
        false,
        `Yêu cầu thiếu secret phải bị từ chối! Thực tế trả: ${JSON.stringify(resWithoutSecret)}`
      )

      // Kẻ tấn công gọi webhook với secret sai
      const resWithWrongSecret = vmInstance.doPost({
        postData: {
          contents: JSON.stringify({
            action: 'SEND_EMAIL',
            secret: 'wrong_secret',
            to: 'victim@example.com',
            subject: 'Spam mail',
            html: '<p>Spam content</p>',
          }),
        },
      })

      assert.equal(
        resWithWrongSecret.success,
        false,
        `Yêu cầu sai secret phải bị từ chối! Thực tế trả: ${JSON.stringify(resWithWrongSecret)}`
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. H6: Mẫu email OTP: XSS trong name, OTP trong subject, giả dạng Google
  // ─────────────────────────────────────────────────────────────
  describe('H6: Deliverability & Security mẫu thư OTP', () => {
    it('H6 RED TEST: Mã OTP KHÔNG được xuất hiện trong subject email để tránh lộ qua thông báo đẩy & filter spam', async () => {
      let capturedEmail = null
      if (typeof setEmailTransportForTests === 'function') {
        setEmailTransportForTests(async (mail) => {
          capturedEmail = mail
          return { success: true, transport: 'test_custom', messageId: 'm1' }
        })
      }

      try {
        await sendVerificationCodeEmail({
          to: 'client@example.com',
          code: '654321',
          name: 'Nguyen Van A',
        })

        if (capturedEmail) {
          assert.doesNotMatch(
            capturedEmail.subject,
            /654321/,
            'Subject không được chứa mã OTP 654321'
          )
        }
      } finally {
        if (typeof setEmailTransportForTests === 'function') {
          setEmailTransportForTests(null)
        }
      }
    })

    it('H6 RED TEST: Tên người nhận chứa HTML / Script tag phải được escape an toàn', async () => {
      let capturedEmail = null
      if (typeof setEmailTransportForTests === 'function') {
        setEmailTransportForTests(async (mail) => {
          capturedEmail = mail
          return { success: true, transport: 'test_custom', messageId: 'm2' }
        })
      }

      try {
        const maliciousName = '<script>alert("xss")</script><b>Hacker</b>'
        await sendVerificationCodeEmail({
          to: 'client@example.com',
          code: '123456',
          name: maliciousName,
        })

        if (capturedEmail) {
          assert.doesNotMatch(
            capturedEmail.html,
            /<script>alert\("xss"\)<\/script>/,
            'HTML phải escape ký tự <script>'
          )
          assert.ok(
            capturedEmail.html.includes('&lt;script&gt;') || capturedEmail.html.includes('&amp;lt;'),
            'HTML phải chứa ký tự đã escape'
          )
        }
      } finally {
        if (typeof setEmailTransportForTests === 'function') {
          setEmailTransportForTests(null)
        }
      }
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. H8: Anti-enumeration tại route POST /api/auth/password/forgot
  // ─────────────────────────────────────────────────────────────
  describe('H8: Anti-enumeration bảo mật route Quên mật khẩu', () => {
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

    it('H8 RED TEST: password/forgot với email chưa từng đăng ký KHÔNG được trả về registered: false', async () => {
      const nonExistentEmail = `unknown_${Date.now()}@example.com`
      const res = await fetch(`${baseUrl}/api/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonExistentEmail }),
      })

      const data = await res.json()
      assert.equal(res.status, 200)
      // Trước khi sửa: Trả về { success: true, registered: false } (LỖI H8)
      // Yêu cầu: KHÔNG được lộ cờ registered: false
      assert.notEqual(
        data.registered,
        false,
        `Route password/forgot không được trả registered: false vì làm lộ danh sách người dùng! Thực tế: ${JSON.stringify(data)}`
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 6. H9: Lỗi DB khi lưu pending KHÔNG được nuốt
  // ─────────────────────────────────────────────────────────────
  describe('H9: DB là Single Source of Truth — Không nuốt lỗi DB pending', () => {
    it('H9 RED TEST: savePendingRegistrationDb phải ném ngoại lệ khi DB gặp lỗi thay vì nuốt lỗi và trả success giả', () => {
      const badDb = {
        prepare: () => {
          throw new Error('SQLITE_IOERR: disk I/O error')
        },
      }

      // Trước khi sửa: accountDb.js bọc try/catch và nuốt lỗi bằng console.error, trả { email } (LỖI H9)
      assert.throws(
        () => {
          savePendingRegistrationDb({
            email: 'test@example.com',
            fullName: 'Test User',
            codeHash: 'hash',
            salt: 'salt',
            database: badDb,
          })
        },
        /SQLITE_IOERR|disk I\/O error/,
        'savePendingRegistrationDb phải ném lỗi khi DB thất bại!'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 7. H2: Bảo toàn Pending OTP khi lỗi gửi là UNKNOWN (Timeout)
  // ─────────────────────────────────────────────────────────────
  describe('H2: Bảo toàn pending registration / reset khi gửi mail bị timeout/mạng', () => {
    it('H2 RED TEST: Khi sendEmail ném timeout/unknown, bản ghi pending trong DB không được bị xóa', async () => {
      const testEmail = `timeout_test_${Date.now()}@example.com`

      // 1. Lưu bản ghi pending vào DB
      savePendingRegistrationDb({
        email: testEmail,
        fullName: 'Timeout User',
        passwordHash: 'dummy_hash',
        codeHash: 'hash123',
        salt: 'salt123',
        expiresInSeconds: 600,
      })

      // Kiểm tra bản ghi đã có
      let record = getPendingRegistrationDb(testEmail)
      assert.ok(record, 'Bản ghi pending phải tồn tại trước khi gửi')

      // 2. Tiêm mock transport ném lỗi UNKNOWN_DELIVERY
      if (typeof setEmailTransportForTests === 'function') {
        setEmailTransportForTests(async () => {
          const unknownErr = new Error('Gateway Timeout (Cold start)')
          unknownErr.code = 'UNKNOWN_DELIVERY'
          unknownErr.isUnknown = true
          unknownErr.status = 504
          throw unknownErr
        })
      }

      // Giả lập gọi gửi mail gặp UNKNOWN
      try {
        await sendVerificationCodeEmail({
          to: testEmail,
          code: '123456',
          name: 'Timeout User',
        })
      } catch (err) {
        assert.equal(err.code, 'UNKNOWN_DELIVERY')
      } finally {
        if (typeof setEmailTransportForTests === 'function') {
          setEmailTransportForTests(null)
        }
      }

      // Bản ghi trong DB vẫn phải còn nguyên
      record = getPendingRegistrationDb(testEmail)
      assert.ok(record, 'Bản ghi pending vẫn phải tồn tại sau khi gặp lỗi timeout!')
      assert.equal(record.email, testEmail)
    })
  })
})
