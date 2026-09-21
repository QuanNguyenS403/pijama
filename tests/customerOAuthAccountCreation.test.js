import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {
  getDb,
  findAccountById,
  findAccountByGoogleId,
  findAccountByFacebookId,
  findAccountByEmail,
  getVoucherByAccountId,
} from '../server/lib/accountDb.js'
import { customerSessionMiddleware, COOKIE_NAME, parseCookies } from '../server/lib/customerSessionMiddleware.js'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'

// Enable test mode
process.env.AUTH_TEST_MODE = 'true'

async function createAuthTestServer() {
  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerAuthEndpoints(app)

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => server.close(),
  }
}

test('Google OAuth: Tạo tài khoản riêng trên website và đặt tên theo tên Google', async () => {
  const server = await createAuthTestServer()
  try {
    const uniqueSub = `google-sub-${Date.now()}`
    const testEmail = `googleuser-${Date.now()}@gmail.com`
    const mockToken = `mock-google-token:${uniqueSub}:${testEmail}`

    const res = await fetch(`${server.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockToken }),
    })

    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.success, true)
    assert.equal(data.authenticated, true)

    // Kiểm tra tài khoản trong database
    assert.ok(data.account?.id)
    const dbAccount = findAccountById(data.account.id)
    assert.ok(dbAccount, 'Tài khoản riêng phải tồn tại trong cơ sở dữ liệu accounts.db')

    // Tên tài khoản phải được đặt theo tên Google (trong test double là "Google Test User")
    assert.equal(dbAccount.full_name, 'Google Test User')
    assert.equal(data.account.fullName, 'Google Test User')
    assert.equal(dbAccount.email, testEmail)
    assert.equal(dbAccount.google_id, uniqueSub)
    assert.equal(dbAccount.verified, true)

    // Kiểm tra voucher chào mừng 10% + Freeship
    assert.ok(data.voucher?.code)
    assert.equal(data.voucher.discountPercent, 10)
    assert.equal(data.voucher.freeShipping, true)

    const dbVoucher = getVoucherByAccountId(dbAccount.id)
    assert.ok(dbVoucher)
    assert.equal(dbVoucher.code, data.voucher.code)

    // Kiểm tra HttpOnly Cookie được gửi
    const setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie, 'Phải có Set-Cookie header')
    assert.ok(setCookie.includes('qns_session='))
    assert.ok(setCookie.toLowerCase().includes('httponly'))

    // Trích xuất session cookie và kiểm tra khôi phục phiên qua /api/auth/me
    const cookieToken = setCookie.split(';')[0]
    const meRes = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieToken },
    })
    const meData = await meRes.json()
    assert.equal(meData.authenticated, true)
    assert.equal(meData.account.fullName, 'Google Test User')
    assert.equal(meData.account.email, testEmail)
  } finally {
    server.close()
  }
})

test('Facebook OAuth: Tạo tài khoản riêng trên website và đặt tên theo tên Facebook', async () => {
  const server = await createAuthTestServer()
  try {
    const uniqueSub = `fb-sub-${Date.now()}`
    const testEmail = `fbuser-${Date.now()}@example.com`
    const mockToken = `mock-fb-token:${uniqueSub}:${testEmail}`

    const res = await fetch(`${server.baseUrl}/api/auth/facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: mockToken }),
    })

    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.success, true)
    assert.equal(data.authenticated, true)

    // Kiểm tra tài khoản trong database
    assert.ok(data.account?.id)
    const dbAccount = findAccountById(data.account.id)
    assert.ok(dbAccount, 'Tài khoản riêng phải tồn tại trong cơ sở dữ liệu accounts.db')

    // Tên tài khoản phải được đặt theo tên Facebook (trong test double là "Facebook Test User")
    assert.equal(dbAccount.full_name, 'Facebook Test User')
    assert.equal(data.account.fullName, 'Facebook Test User')
    assert.equal(dbAccount.facebook_id, uniqueSub)
    assert.equal(dbAccount.verified, true)

    // Kiểm tra voucher chào mừng
    assert.ok(data.voucher?.code)
    assert.equal(data.voucher.discountPercent, 10)
    assert.equal(data.voucher.freeShipping, true)
  } finally {
    server.close()
  }
})

test('OAuth Fallback: Cho phép tạo tài khoản với họ tên Google/Facebook tùy chỉnh từ người dùng', async () => {
  const server = await createAuthTestServer()
  try {
    const customName = 'Nguyễn Đức Quân'
    const customEmail = `quannguyen-${Date.now()}@gmail.com`

    const res = await fetch(`${server.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: customName,
        email: customEmail,
        marketingOptIn: true,
      }),
    })

    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.success, true)
    assert.equal(data.authenticated, true)
    assert.equal(data.account.fullName, customName)
    assert.equal(data.account.email, customEmail)

    // Kiểm tra lưu đúng vào database
    const dbAccount = findAccountById(data.account.id)
    assert.equal(dbAccount.full_name, customName)
    assert.equal(dbAccount.marketing_email_opt_in, true)

    // Đăng nhập lại với tên mới cập nhật
    const updatedName = 'Nguyễn Đức Quân VIP'
    const updateRes = await fetch(`${server.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: updatedName,
        email: customEmail,
      }),
    })
    const updateData = await updateRes.json()
    assert.equal(updateData.account.fullName, updatedName)

    const recheckDb = findAccountById(data.account.id)
    assert.equal(recheckDb.full_name, updatedName, 'Tên tài khoản phải được cập nhật theo tên mới')
  } finally {
    server.close()
  }
})
