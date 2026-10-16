import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'http'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

describe('Enterprise Authentication Suite (8-Step Architecture)', () => {
  let server
  let port
  let baseUrl

  before(async () => {
    process.env.AUTH_TEST_MODE = 'true'
    const app = express()
    app.use(express.json())
    app.use(customerSessionMiddleware)
    registerAuthEndpoints(app)

    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, resolve))
    port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  const testEmail = `ent_user_${Date.now()}@quannguyens.com`
  const testPassword = 'Password@123'
  let currentAccessToken = ''
  let currentRefreshToken = ''
  let refreshCookie = ''

  it('Bước 1, 2, 3: Đăng ký tài khoản mới bằng Email + Argon2id mật khẩu', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'Khách Hàng Doanh Nghiệp',
        marketingOptIn: true,
      }),
    })

    const data = await res.json()
    assert.equal(res.status, 201, `Status phải là 201 Created: ${JSON.stringify(data)}`)
    assert.equal(data.success, true)
    assert.ok(data.accessToken, 'Phải trả về JWT Access Token')
    assert.equal(data.user.email, testEmail)
    assert.match(data.user.voucherCode, /^WELCOME/)

    currentAccessToken = data.accessToken
    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']
    const foundCookie = cookies.find((c) => c.includes('qns_refresh_token=')) || ''
    assert.ok(foundCookie.includes('qns_refresh_token='), 'Phải set HttpOnly cookie qns_refresh_token')
    refreshCookie = foundCookie
  })

  it('Bước 3: Từ chối đăng ký khi email trùng lặp', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'Trùng Lặp',
      }),
    })

    assert.equal(res.status, 409, 'Phải trả về 409 Conflict')
    const data = await res.json()
    assert.equal(data.success, false)
  })

  it('Bước 3: Từ chối đăng nhập khi sai mật khẩu', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123',
      }),
    })

    assert.equal(res.status, 401, 'Phải trả về 401 Unauthorized khi sai pass')
    const data = await res.json()
    assert.equal(data.success, false)
  })

  it('Bước 2 & 3: Đăng nhập thành công với Argon2id mật khẩu đúng', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.ok(data.accessToken)
    currentAccessToken = data.accessToken

    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']
    const foundCookie = cookies.find((c) => c.includes('qns_refresh_token=')) || ''
    assert.ok(foundCookie.includes('qns_refresh_token='))
    refreshCookie = foundCookie
  })

  it('Bước 4: Token Rotation hoạt động chính xác khi gọi /api/auth/refresh', async () => {
    // Trích xuất cookie value
    const match = refreshCookie.match(/qns_refresh_token=([^;]+)/)
    assert.ok(match, 'Tìm thấy qns_refresh_token trong cookie')
    const initialRefreshToken = decodeURIComponent(match[1])

    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `qns_refresh_token=${initialRefreshToken}`,
      },
    })

    assert.equal(res.status, 200, 'Refresh phải trả về 200 OK')
    const data = await res.json()
    assert.equal(data.success, true)
    assert.ok(data.accessToken, 'Phải có new access token')
    assert.notEqual(data.accessToken, currentAccessToken, 'Access token mới phải khác token cũ')

    const newCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || '']
    const newCookieHeader = newCookies.find((c) => c.includes('qns_refresh_token=')) || ''
    assert.ok(newCookieHeader.includes('qns_refresh_token='))
    const newMatch = newCookieHeader.match(/qns_refresh_token=([^;]+)/)
    const newRefreshToken = decodeURIComponent(newMatch[1])
    assert.notEqual(newRefreshToken, initialRefreshToken, 'Refresh token mới phải khác refresh token cũ (Rotation)')

    // ── KIỂM TRA PHÁT HIỆN TÁI SỬ DỤNG TOKEN (TOKEN REUSE ATTACK) ──
    const reuseRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `qns_refresh_token=${initialRefreshToken}`, // Cố tình dùng lại token cũ đã bị rotate
      },
    })

    assert.equal(reuseRes.status, 401, 'Tái sử dụng token cũ phải bị chặn ngay lập tức với 401')
    const reuseData = await reuseRes.json()
    assert.equal(reuseData.success, false)
  })

  it('Bước 2 & 3: Gửi và Xác minh OTP qua Cache Service', async () => {
    const otpEmail = `otp_test_${Date.now()}@quannguyens.com`

    // 1. Gửi OTP
    const sendRes = await fetch(`${baseUrl}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otpEmail,
        purpose: 'verify_email',
      }),
    })

    assert.equal(sendRes.status, 200)
    const sendData = await sendRes.json()
    assert.equal(sendData.success, true)

    // Lấy OTP từ cache để test verify
    const { cacheGet } = await import('../server/lib/cacheService.js')
    const storedCode = await cacheGet(`otp:verify_email:${otpEmail}`)
    assert.ok(storedCode, 'Mã OTP phải có trong cache')

    // 2. Xác minh OTP sai
    const wrongVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otpEmail,
        code: '000000',
        purpose: 'verify_email',
      }),
    })
    assert.equal(wrongVerify.status, 400)

    // 3. Xác minh OTP đúng
    const correctVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: otpEmail,
        code: storedCode,
        purpose: 'verify_email',
      }),
    })
    assert.equal(correctVerify.status, 200)
    const verifyData = await correctVerify.json()
    assert.equal(verifyData.success, true)
  })

  it('Bước 5: Đăng nhập Google OAuth tự động liên kết danh tính và cấp Token Rotation', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sub: `google_oauth_ent_${Date.now()}`,
        email: `google_user_${Date.now()}@gmail.com`,
        fullName: 'Google Enterprise Customer',
        marketingOptIn: true,
      }),
    })

    assert.equal(res.status, 200)
    const data = await res.json()
    assert.equal(data.success, true)
    assert.ok(data.accessToken, 'Google login phải cấp JWT Access Token')
    assert.ok(res.headers.get('set-cookie').includes('qns_refresh_token='), 'Google login phải set Refresh Token Cookie')
  })
})
