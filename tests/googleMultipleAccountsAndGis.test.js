import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {
  findAccountById,
  findAccountByGoogleId,
  findAccountByEmail,
  getVoucherByAccountId,
  getDb,
} from '../server/lib/accountDb.js'
import { customerSessionMiddleware, COOKIE_NAME } from '../server/lib/customerSessionMiddleware.js'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'

// Bật test double mode an toàn cho test suite
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

test('GIS & Multiple Accounts Suite: /api/auth/config cấu hình sẵn sàng cho Google Identity', async () => {
  const server = await createAuthTestServer()
  try {
    const res = await fetch(`${server.baseUrl}/api/auth/config`)
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.equal(data.success, true)
    assert.equal(data.googleEnabled, true)
    assert.ok(data.googleClientId, 'Phải có Google Client ID được cấu hình')
  } finally {
    server.close()
  }
})

test('GIS & Multiple Accounts Suite: Khách hàng có 2 tài khoản Google khác nhau và chọn tài khoản mong muốn', async () => {
  const server = await createAuthTestServer()
  try {
    const timestamp = Date.now()
    
    // ── TÀI KHOẢN GOOGLE 1 (Ví dụ: Email cá nhân) ──
    const sub1 = `google-sub-personal-${timestamp}`
    const email1 = `customer.personal.${timestamp}@example.com`
    const name1 = 'Nguyễn Thị Hoa (Cá Nhân)'
    const token1 = `mock-google-token:${sub1}:${email1}:${encodeURIComponent(name1)}`

    const res1 = await fetch(`${server.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: token1 }),
    })

    const data1 = await res1.json()
    assert.equal(res1.status, 200)
    assert.equal(data1.success, true)
    assert.equal(data1.account.email, email1)
    assert.equal(data1.account.fullName, name1)
    
    const cookie1 = res1.headers.get('set-cookie')?.split(';')[0]
    assert.ok(cookie1, 'Phải cấp session cookie cho tài khoản Google 1')

    // Kiểm tra DB tài khoản 1
    const dbAccount1 = findAccountById(data1.account.id)
    assert.ok(dbAccount1)
    assert.equal(dbAccount1.email, email1)
    assert.equal(dbAccount1.google_id, sub1)
    assert.equal(dbAccount1.full_name, name1)

    // ── TÀI KHOẢN GOOGLE 2 (Ví dụ: Email công việc / tài khoản phụ) ──
    const sub2 = `google-sub-work-${timestamp}`
    const email2 = `customer.work.${timestamp}@example.com`
    const name2 = 'Nguyễn Thị Hoa (Công Việc)'
    const token2 = `mock-google-token:${sub2}:${email2}:${encodeURIComponent(name2)}`

    const res2 = await fetch(`${server.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: token2 }),
    })

    const data2 = await res2.json()
    assert.equal(res2.status, 200)
    assert.equal(data2.success, true)
    assert.equal(data2.account.email, email2)
    assert.equal(data2.account.fullName, name2)

    const cookie2 = res2.headers.get('set-cookie')?.split(';')[0]
    assert.ok(cookie2, 'Phải cấp session cookie riêng cho tài khoản Google 2')

    // ── KIỂM CHỨNG TÍNH PHÂN LẬP & KHÔNG NHẦM LẪN GIỮA 2 TÀI KHOẢN GOOGLE ──
    assert.notEqual(data1.account.id, data2.account.id, 'Hai tài khoản Google phải có 2 Account ID hoàn toàn riêng biệt')
    assert.notEqual(cookie1, cookie2, 'Session tokens giữa 2 tài khoản Google phải độc lập tuyệt đối')

    // Kiểm tra /api/auth/me với Cookie 1 -> Phải ra đúng danh tính 1
    const me1 = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie1 },
    })
    const meData1 = await me1.json()
    assert.equal(meData1.authenticated, true)
    assert.equal(meData1.account.email, email1)
    assert.equal(meData1.account.fullName, name1)

    // Kiểm tra /api/auth/me với Cookie 2 -> Phải ra đúng danh tính 2
    const me2 = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie2 },
    })
    const meData2 = await me2.json()
    assert.equal(meData2.authenticated, true)
    assert.equal(meData2.account.email, email2)
    assert.equal(meData2.account.fullName, name2)

    // ── KIỂM CHỨNG ĐĂNG XUẤT TÀI KHOẢN 1 VÀ CHUYỂN SANG TÀI KHOẢN 2 ──
    const logoutRes = await fetch(`${server.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
    })
    assert.equal(logoutRes.status, 200)

    // Cookie 1 phải bị vô hiệu hóa
    const me1AfterLogout = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie1 },
    })
    const me1AfterLogoutData = await me1AfterLogout.json()
    assert.equal(me1AfterLogoutData.authenticated, false, 'Phiên của tài khoản 1 phải hết hiệu lực sau khi đăng xuất')

    // Cookie 2 vẫn giữ nguyên trạng thái hoạt động độc lập
    const me2StillActive = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie2 },
    })
    const me2StillActiveData = await me2StillActive.json()
    assert.equal(me2StillActiveData.authenticated, true, 'Phiên của tài khoản 2 không bị ảnh hưởng khi tài khoản 1 đăng xuất')
  } finally {
    server.close()
  }
})
