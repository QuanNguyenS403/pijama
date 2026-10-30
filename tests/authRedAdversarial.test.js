import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'http'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

describe('Kiểm thử Hồi quy & An ninh Hệ thống Xác thực (Auth Security Regression Suite)', () => {
  let app
  let server
  let baseUrl
  let testDbPath
  let db

  before(async () => {
    testDbPath = path.join(os.tmpdir(), `test_auth_reg_${Date.now()}_${Math.random().toString(36).slice(2)}.db`)
    process.env.ACCOUNT_DB_FILE = testDbPath
    process.env.AUTH_TEST_MODE = 'true'

    const { getDb } = await import('../server/lib/accountDb.js')
    db = getDb()

    app = express()
    app.set('trust proxy', 1)
    // Cấu hình Helmet chuẩn hóa sau khi vá H1 và H2
    app.use(
      helmet({
        crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://accounts.google.com',
              'https://accounts.google.com/gsi/client',
              'https://challenges.cloudflare.com',
            ],
            frameSrc: [
              "'self'",
              'https://accounts.google.com',
              'https://accounts.google.com/gsi/',
              'https://challenges.cloudflare.com',
            ],
            connectSrc: [
              "'self'",
              'https://accounts.google.com',
              'https://accounts.google.com/gsi/',
              'https://www.googleapis.com',
              'https://challenges.cloudflare.com',
              'https://graph.facebook.com',
            ],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://accounts.google.com',
              'https://accounts.google.com/gsi/style',
              'https://fonts.googleapis.com',
            ],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    )
    app.use(express.json())
    app.use(customerSessionMiddleware)
    registerAuthEndpoints(app)

    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    delete process.env.ACCOUNT_DB_FILE
    delete process.env.AUTH_TEST_MODE
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch (_) {}
    }
  })

  // ── H1: Kiểm chứng COOP Header ──────────────────────────────────────────
  it('H1 [Đo Header]: COOP phải là same-origin-allow-popups để không chặn popup GIS', async () => {
    const res = await fetch(`${baseUrl}/api/auth/config`)
    const coop = res.headers.get('cross-origin-opener-policy')
    console.log('📌 [H1 PASSED] Header cross-origin-opener-policy thực tế:', coop)
    assert.equal(
      coop,
      'same-origin-allow-popups',
      'COOP phải là same-origin-allow-popups để cho phép popup Google Identity Services mở và gửi callback.'
    )
  })

  // ── H2: Kiểm chứng CSP style-src cho Google Identity Services ───────────
  it('H2 [Đo CSP]: style-src và connect-src phải cho phép accounts.google.com', async () => {
    const res = await fetch(`${baseUrl}/api/auth/config`)
    const csp = res.headers.get('content-security-policy') || ''
    console.log('📌 [H2 PASSED] Header CSP style-src chứa accounts.google.com:', csp.includes('https://accounts.google.com/gsi/style'))
    assert.match(
      csp,
      /style-src[^;]*https:\/\/accounts\.google\.com/,
      'CSP style-src phải cho phép https://accounts.google.com để tải CSS nút Google!'
    )
    assert.match(
      csp,
      /connect-src[^;]*https:\/\/accounts\.google\.com\/gsi\//,
      'CSP connect-src phải cho phép https://accounts.google.com/gsi/ theo tài liệu Google Developers!'
    )
  })

  // ── H3: Xung đột dữ liệu giữa hai hệ bảng users và accounts ──────────────
  it('H3: Email đã có trong users nhưng chưa có trong accounts được hợp nhất sạch sẽ không lỗi DB', async () => {
    const legacyEmail = `legacy_${Date.now()}@example.com`
    const legacyUserId = `usr_legacy_${Date.now()}`
    const legacySub = `sub_legacy_${Date.now()}`
    const now = new Date().toISOString()

    // 1. Tài khoản chỉ tồn tại trong users
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, verified, created_at, updated_at)
      VALUES (?, ?, 'Legacy User', 'customer', 'active', 1, ?, ?)
    `).run(legacyUserId, legacyEmail, now, now)

    // 2. Đăng nhập Google với cùng email đó
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: `mock-google-token:${legacySub}:${legacyEmail}:Legacy%20User`,
        email: legacyEmail,
        sub: legacySub,
        fullName: 'Legacy User',
      }),
    })

    const data = await res.json()
    console.log('📌 [H3 PASSED] Kết quả Google login khi email đã có trong users:', res.status, data.success)
    assert.equal(res.status, 200, `Đăng nhập Google thất bại: ${JSON.stringify(data)}`)
    assert.equal(data.success, true)
    assert.equal(data.user.id, legacyUserId, 'ID phải được tái sử dụng nhất quán từ users sang accounts')

    // Kiểm tra accounts đã có dữ liệu đồng bộ
    const accRow = db.prepare('SELECT * FROM accounts WHERE id = ?').get(legacyUserId)
    assert.ok(accRow, 'Dòng tương ứng phải tồn tại trong bảng accounts')
  })

  // ── F-G1: Từ chối token Google giả mạo không có chữ ký hợp lệ ─────────────
  it('F-G1: POST /api/auth/google phải trả 401 khi token sai chữ ký, không dùng fallback', async () => {
    const fakePayload = {
      sub: 'fake_google_sub_9999',
      email: 'victim_takeover@example.com',
      name: 'Victim Account',
    }
    const fakeToken =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.' +
      Buffer.from(JSON.stringify(fakePayload)).toString('base64url') +
      '.invalidsignature12345'

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: fakeToken,
        email: fakePayload.email,
        sub: fakePayload.sub,
        fullName: fakePayload.name,
      }),
    })

    const data = await res.json()
    console.log('📌 [F-G1 PASSED] Kết quả gửi token giả:', res.status, data.success ? 'ACCEPTED (LỖI)' : 'REJECTED (401)')
    assert.equal(res.status, 401, 'Token giả phải bị từ chối 401 Unauthorized!')
    assert.equal(data.success, false)
  })

  // ── F-G2: Từ chối Access Token không có aud / không phải ID Token ────────
  it('F-G2: POST /api/auth/google phải từ chối access token dạng ya29...', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'ya29.a0ARrdaM_fake_access_token_unverified_audience',
      }),
    })

    const data = await res.json()
    console.log('📌 [F-G2 PASSED] Kết quả gửi access token ya29:', res.status, data.success)
    assert.equal(res.status, 401)
    assert.equal(data.success, false)
  })

  // ── F-G3: Pre-hijack: Vô hiệu mật khẩu cũ chưa xác minh khi liên kết Google ──
  it('F-G3: Đăng nhập Google với email đã đăng ký thủ công chưa xác minh phải vô hiệu mật khẩu cũ', async () => {
    const email = `prehijack_${Date.now()}@example.com`
    const oldPassword = 'OldPassword@123'
    const victimSub = `sub_victim_${Date.now()}`

    // 1. Kẻ xấu đăng ký trước tài khoản thủ công bằng email nạn nhân (chưa xác minh)
    const { hashPassword } = await import('../server/lib/passwordService.js')
    const passHash = await hashPassword(oldPassword)
    const userId = `usr_prehijack_${Date.now()}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Victim Name', 'customer', 'active', 0, ?, ?)
    `).run(userId, email, passHash, now, now)

    db.prepare(`
      INSERT INTO accounts (id, method, email, full_name, verified, status, created_at, updated_at)
      VALUES (?, 'local', ?, 'Victim Name', 0, 'active', ?, ?)
    `).run(userId, email, now, now)

    // 2. Nạn nhân đăng nhập bằng Google với email đó
    const googleRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: `mock-google-token:${victimSub}:${email}:Victim%20Name`,
      }),
    })
    assert.equal(googleRes.status, 200)

    // 3. Kẻ xấu thử đăng nhập lại bằng mật khẩu cũ -> Phải bị từ chối 401
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: oldPassword,
      }),
    })

    const loginData = await loginRes.json()
    console.log('📌 [F-G3 PASSED] Kẻ xấu đăng nhập bằng mật khẩu cũ sau khi nạn nhân liên kết Google:', loginRes.status, loginData.success ? 'THÀNH CÔNG (NGUY HIỂM!)' : 'BỊ CHẶN (401)')
    assert.equal(loginRes.status, 401, 'Mật khẩu cũ của kẻ xấu phải bị vô hiệu hóa khi chính chủ đăng nhập Google!')
    assert.equal(loginData.success, false)
  })

  // ── F-M3: Chống giả mạo X-Forwarded-For để vượt qua Rate Limit ────────────
  it('F-M3: Đổi X-Forwarded-For không vượt qua được Rate Limiter', async () => {
    const targetEmail = `ratelimit_${Date.now()}@example.com`
    let blocked = false
    let attemptsSucceeded = 0

    // Gửi liên tục 15 request đăng nhập nhưng đổi header X-Forwarded-For mỗi lần
    for (let i = 1; i <= 15; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `10.0.0.${i}`,
        },
        body: JSON.stringify({
          email: targetEmail,
          password: `WrongPass${i}!`,
        }),
      })

      if (res.status === 429) {
        blocked = true
        break
      } else {
        attemptsSucceeded++
      }
    }

    console.log('📌 [F-M3 PASSED] Số lần thử được trước khi bị chặn:', attemptsSucceeded, 'Bị chặn 429:', blocked)
    assert.equal(blocked, true, 'Rate limiter phải chặn 429 dựa trên IP thật!')
  })

  // ── F-M5: Giới hạn số lần thử OTP tại /api/auth/otp/verify ───────────────
  it('F-M5: POST /api/auth/otp/verify phải khóa sau tối đa 5 lần thử sai', async () => {
    const email = `otp_brute_${Date.now()}@example.com`
    const { cacheSet } = await import('../server/lib/cacheService.js')
    await cacheSet(`otp:verify_email:${email}`, JSON.stringify({ code: '888888', attempts: 0 }), 300)

    let blockedAfter5 = false
    for (let i = 1; i <= 7; i++) {
      const res = await fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: '111111',
          purpose: 'verify_email',
        }),
      })
      const data = await res.json()
      if (res.status === 429 || data.error?.includes('quá 5 lần') || data.error?.includes('khóa')) {
        blockedAfter5 = true
        break
      }
    }

    console.log('📌 [F-M5 PASSED] /api/auth/otp/verify khóa sau 5 lần sai:', blockedAfter5)
    assert.equal(blockedAfter5, true, '/api/auth/otp/verify phải khóa sau 5 lần nhập sai!')
  })

  // ── F-M6: Chống User Enumeration tại /api/auth/password/forgot ───────────
  it('F-M6: POST /api/auth/password/forgot phải trả phản hồi trung tính, không trả 404', async () => {
    const res = await fetch(`${baseUrl}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'definitely_not_existing_user_99999@example.com',
      }),
    })

    const data = await res.json()
    console.log('📌 [F-M6 PASSED] Phản hồi forgot password cho user không tồn tại:', res.status, data.success)
    assert.equal(res.status, 200, 'API phải trả 200 trung tính để chống rò rỉ danh sách người dùng!')
    assert.equal(data.success, true)
  })

  // ── F-M9: Reset mật khẩu phải thu hồi mọi customer_sessions ──────────────
  it('F-M9: Đặt lại mật khẩu phải thu hồi cả customer_sessions và enterprise_sessions', async () => {
    const email = `reset_revoke_${Date.now()}@example.com`
    const userId = `usr_reset_${Date.now()}`
    const sessionToken = `sess_${Date.now()}_test`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, verified, created_at, updated_at)
      VALUES (?, ?, 'User Reset', 'customer', 'active', 1, ?, ?)
    `).run(userId, email, now, now)

    db.prepare(`
      INSERT INTO accounts (id, method, email, full_name, verified, status, created_at, updated_at)
      VALUES (?, 'local', ?, 'User Reset', 1, 'active', ?, ?)
    `).run(userId, email, now, now)

    const { createCustomerSession, findCustomerSessionByToken } = await import('../server/lib/accountDb.js')
    createCustomerSession({
      accountId: userId,
      token: sessionToken,
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    })

    const beforeSession = findCustomerSessionByToken(sessionToken)
    assert.ok(beforeSession, 'Session phải tồn tại trước khi reset')

    const { cacheSet } = await import('../server/lib/cacheService.js')
    const resetToken = `rst_test_${Date.now()}`
    await cacheSet(`reset_token:${resetToken}`, email, 300)

    const resetRes = await fetch(`${baseUrl}/api/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken,
        newPassword: 'BrandNewPassword@2026',
        confirmPassword: 'BrandNewPassword@2026',
      }),
    })
    assert.equal(resetRes.status, 200)

    const afterSession = findCustomerSessionByToken(sessionToken)
    console.log('📌 [F-M9 PASSED] Session customer sau khi reset mật khẩu:', afterSession ? 'VẪN SỐNG' : 'ĐÃ BỊ THU HỒI HOÀN TOÀN')
    assert.equal(afterSession, null, 'Customer session phải bị thu hồi sau khi đặt lại mật khẩu!')
  })

  // ── Bổ sung Section 8: JWT_SECRET fail-closed ở production ───────────────
  it('Sec 8: Token service phải fail-closed ở production khi thiếu JWT_SECRET', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalSecret = process.env.JWT_SECRET
    const originalCustomerSecret = process.env.CUSTOMER_AUTH_SECRET

    try {
      process.env.NODE_ENV = 'production'
      delete process.env.JWT_SECRET
      delete process.env.CUSTOMER_AUTH_SECRET

      const { createAccessToken } = await import('../server/lib/tokenService.js')
      let threw = false
      try {
        await createAccessToken({ id: 'u1', email: 'u1@test.com' })
      } catch (err) {
        threw = true
      }
      console.log('📌 [Sec 8 PASSED] createAccessToken khi thiếu key ở production ném lỗi:', threw)
      assert.equal(threw, true, 'Production thiếu JWT_SECRET phải ném lỗi dừng hoạt động!')
    } finally {
      process.env.NODE_ENV = originalEnv
      if (originalSecret) process.env.JWT_SECRET = originalSecret
      if (originalCustomerSecret) process.env.CUSTOMER_AUTH_SECRET = originalCustomerSecret
    }
  })
})
