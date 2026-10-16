import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { runEnterpriseMigrations } from '../server/lib/schemaMigration.js'
import { registerEnterpriseAuthEndpoints } from '../server/lib/enterpriseAuthEndpoints.js'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'
import { getDb } from '../server/lib/accountDb.js'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { validateVoucher } from '../server/lib/voucherValidator.js'
import { getSavedOrders } from '../src/lib/orderSync.js'

describe('Account Data Partitioning & Isolation Test Suite (SEC-ISOLATION)', () => {
  let app
  let server
  let baseUrl

  before(async () => {
    process.env.AUTH_TEST_MODE = 'true'
    const db = getDb()
    runEnterpriseMigrations(db)

    app = express()
    app.use(express.json())
    app.use(customerSessionMiddleware)

    registerEnterpriseAuthEndpoints(app)
    registerAuthEndpoints(app)

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  it('1. Đăng ký 2 tài khoản riêng biệt (User A và User B) và kiểm tra tính phân lập dữ liệu', async () => {
    const timestamp = Date.now()
    const emailA = `test.user.a.${timestamp}@example.com`
    const emailB = `test.user.b.${timestamp}@example.com`

    // Đăng ký User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.1' },
      body: JSON.stringify({
        email: emailA,
        password: 'PasswordA@12345',
        fullName: 'Nguyễn Văn A',
        marketingOptIn: true,
      }),
    })
    const dataA = await resA.json()
    assert.equal(resA.status, 201)
    assert.ok(dataA.success)
    assert.ok(dataA.user.id)
    assert.equal(dataA.user.email, emailA)
    assert.ok(dataA.accessToken)

    // Đăng ký User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.1.1.2' },
      body: JSON.stringify({
        email: emailB,
        password: 'PasswordB@12345',
        fullName: 'Trần Thị B',
        marketingOptIn: false,
      }),
    })
    const dataB = await resB.json()
    assert.equal(resB.status, 201)
    assert.ok(dataB.success)
    assert.ok(dataB.user.id)
    assert.equal(dataB.user.email, emailB)
    assert.ok(dataB.accessToken)

    // Khẳng định 2 ID hoàn toàn khác nhau
    assert.notEqual(dataA.user.id, dataB.user.id)

    // Kiểm tra trong DB: Cả hai đều có bản ghi riêng trong users và accounts
    const db = getDb()
    const userRowA = db.prepare('SELECT * FROM users WHERE id = ?').get(dataA.user.id)
    const userRowB = db.prepare('SELECT * FROM users WHERE id = ?').get(dataB.user.id)
    assert.ok(userRowA)
    assert.ok(userRowB)
    assert.notEqual(userRowA.password_hash, userRowB.password_hash)

    const accRowA = db.prepare('SELECT * FROM accounts WHERE id = ?').get(dataA.user.id)
    const accRowB = db.prepare('SELECT * FROM accounts WHERE id = ?').get(dataB.user.id)
    assert.ok(accRowA)
    assert.ok(accRowB)
    assert.equal(accRowA.full_name, 'Nguyễn Văn A')
    assert.equal(accRowB.full_name, 'Trần Thị B')
  })

  it('2. Voucher của User A được bảo vệ nghiêm ngặt, User B tuyệt đối không thể sử dụng', async () => {
    const timestamp = Date.now() + 10
    const emailA = `vouch.user.a.${timestamp}@example.com`
    const emailB = `vouch.user.b.${timestamp}@example.com`

    // Đăng ký User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.2.1.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123', fullName: 'User A' }),
    })
    const dataA = await resA.json()
    const voucherA = dataA.user.voucherCode

    // Đăng ký User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.2.1.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123', fullName: 'User B' }),
    })
    const dataB = await resB.json()

    // Xác thực voucher của A dưới ngữ cảnh tài khoản A: HỢP LỆ
    const valForA = validateVoucher(voucherA, { accountId: dataA.user.id, subtotal: 300000 })
    assert.equal(valForA.isValid, true)

    // User B cố tình dùng mã voucher của User A: BỊ CHẶN TUYỆT ĐỐI
    const valForB = validateVoucher(voucherA, { accountId: dataB.user.id, subtotal: 300000 })
    assert.equal(valForB.isValid, false)
    assert.match(valForB.error, /không thuộc tài khoản/)

    // Khách vãng lai cố tình dùng mã voucher của User A: BỊ CHẶN
    const valForGuest = validateVoucher(voucherA, { accountId: null, subtotal: 300000 })
    assert.equal(valForGuest.isValid, false)
    assert.match(valForGuest.error, /yêu cầu đăng nhập/)
  })

  it('3. Đăng nhập đồng thời: Session của User A và User B độc lập, /api/auth/me trả về đúng danh tính', async () => {
    const timestamp = Date.now() + 20
    const emailA = `sess.user.a.${timestamp}@example.com`
    const emailB = `sess.user.b.${timestamp}@example.com`

    // Đăng ký User A & B
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.3.1.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123', fullName: 'Chủ sở hữu A' }),
    })
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.3.1.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123', fullName: 'Chủ sở hữu B' }),
    })

    // Đăng nhập A
    const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.3.2.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123' }),
    })
    const loginDataA = await loginResA.json()
    assert.ok(loginDataA.success, 'Login A must succeed')
    const rawCookiesA = loginResA.headers.getSetCookie ? loginResA.headers.getSetCookie() : [loginResA.headers.get('set-cookie') || '']
    const cookieA = rawCookiesA.map((c) => c.split(';')[0]).join('; ')

    // Đăng nhập B
    const loginResB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.3.2.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123' }),
    })
    const loginDataB = await loginResB.json()
    assert.ok(loginDataB.success, 'Login B must succeed')
    const rawCookiesB = loginResB.headers.getSetCookie ? loginResB.headers.getSetCookie() : [loginResB.headers.get('set-cookie') || '']
    const cookieB = rawCookiesB.map((c) => c.split(';')[0]).join('; ')

    // Gọi /api/auth/me với Cookie A -> Trả về đúng User A
    const meResA = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieA },
    })
    const meDataA = await meResA.json()
    assert.equal(meDataA.authenticated, true)
    assert.equal(meDataA.account.email, emailA)
    assert.equal(meDataA.account.fullName, 'Chủ sở hữu A')

    // Gọi /api/auth/me với Cookie B -> Trả về đúng User B
    const meResB = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieB },
    })
    const meDataB = await meResB.json()
    assert.equal(meDataB.authenticated, true)
    assert.equal(meDataB.account.email, emailB)
    assert.equal(meDataB.account.fullName, 'Chủ sở hữu B')

    // Gọi /api/auth/me với Bearer Token A -> Trả về đúng User A
    const meBearerA = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginDataA.accessToken}` },
    })
    const meBearerDataA = await meBearerA.json()
    assert.equal(meBearerDataA.account.email, emailA)

    // Gọi /api/auth/me với Bearer Token B -> Trả về đúng User B
    const meBearerB = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginDataB.accessToken}` },
    })
    const meBearerDataB = await meBearerB.json()
    assert.equal(meBearerDataB.account.email, emailB)
  })

  it('4. Phân lập đơn hàng tuyệt đối (/api/auth/my-orders): Đơn của A không bao giờ xuất hiện ở B', async () => {
    const timestamp = Date.now() + 30
    const emailA = `order.user.a.${timestamp}@example.com`
    const emailB = `order.user.b.${timestamp}@example.com`

    // Đăng ký A & B
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.4.1.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123', fullName: 'Khách A' }),
    })
    const userA = (await regResA.json()).user

    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.4.1.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123', fullName: 'Khách B' }),
    })
    const userB = (await regResB.json()).user

    // Đăng nhập A và B để lấy cookie
    const loginA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.4.2.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123' }),
    })
    const rawCookiesA = loginA.headers.getSetCookie ? loginA.headers.getSetCookie() : [loginA.headers.get('set-cookie') || '']
    const cookieA = rawCookiesA.map((c) => c.split(';')[0]).join('; ')

    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.4.2.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123' }),
    })
    const rawCookiesB = loginB.headers.getSetCookie ? loginB.headers.getSetCookie() : [loginB.headers.get('set-cookie') || '']
    const cookieB = rawCookiesB.map((c) => c.split(';')[0]).join('; ')

    // Giả lập lưu trữ đơn hàng: Đơn 1 của A, Đơn 2 của B
    const orderIdA = `QNS-ISO-A-${Date.now()}`
    const orderIdB = `QNS-ISO-B-${Date.now()}`

    orderPersistence.set(orderIdA, {
      orderId: orderIdA,
      customer: {
        accountId: userA.id,
        email: emailA,
        fullName: 'Khách A',
        phone: '0981111111',
      },
      items: [{ id: 'sp-1', name: 'Pijama Lụa A', price: 350000, quantity: 1 }],
      total: 350000,
      subtotal: 350000,
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
    })

    orderPersistence.set(orderIdB, {
      orderId: orderIdB,
      customer: {
        accountId: userB.id,
        email: emailB,
        fullName: 'Khách B',
        // Người này vô tình có cùng SĐT gia đình
        phone: '0981111111',
      },
      items: [{ id: 'sp-2', name: 'Pijama Ren B', price: 420000, quantity: 1 }],
      total: 420000,
      subtotal: 420000,
      status: 'SHIPPED',
      createdAt: new Date().toISOString(),
    })

    // User A truy vấn /api/auth/my-orders: CHỈ thấy orderIdA, TUYỆT ĐỐI không thấy orderIdB
    const ordersResA = await fetch(`${baseUrl}/api/auth/my-orders`, {
      headers: { Cookie: cookieA },
    })
    const ordersDataA = await ordersResA.json()
    assert.equal(ordersDataA.success, true)
    const idsA = ordersDataA.orders.map((o) => o.orderId)
    assert.ok(idsA.includes(orderIdA), 'User A must see orderIdA')
    assert.ok(!idsA.includes(orderIdB), 'User A must NOT see orderIdB')

    // User B truy vấn /api/auth/my-orders: CHỈ thấy orderIdB, TUYỆT ĐỐI không thấy orderIdA
    const ordersResB = await fetch(`${baseUrl}/api/auth/my-orders`, {
      headers: { Cookie: cookieB },
    })
    const ordersDataB = await ordersResB.json()
    assert.equal(ordersDataB.success, true)
    const idsB = ordersDataB.orders.map((o) => o.orderId)
    assert.ok(idsB.includes(orderIdB), 'User B must see orderIdB')
    assert.ok(!idsB.includes(orderIdA), 'User B must NOT see orderIdA')
  })

  it('5. Đăng xuất: Vô hiệu hóa session trong DB, tài khoản B không bị ảnh hưởng', async () => {
    const timestamp = Date.now() + 40
    const emailA = `logout.user.a.${timestamp}@example.com`
    const emailB = `logout.user.b.${timestamp}@example.com`

    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.5.1.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123', fullName: 'User A' }),
    })
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.5.1.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123', fullName: 'User B' }),
    })

    const loginA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.5.2.1' },
      body: JSON.stringify({ email: emailA, password: 'PasswordA@123' }),
    })
    const rawCookiesA = loginA.headers.getSetCookie ? loginA.headers.getSetCookie() : [loginA.headers.get('set-cookie') || '']
    const cookieA = rawCookiesA.map((c) => c.split(';')[0]).join('; ')

    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.5.2.2' },
      body: JSON.stringify({ email: emailB, password: 'PasswordB@123' }),
    })
    const rawCookiesB = loginB.headers.getSetCookie ? loginB.headers.getSetCookie() : [loginB.headers.get('set-cookie') || '']
    const cookieB = rawCookiesB.map((c) => c.split(';')[0]).join('; ')

    // User A đăng xuất
    const logoutResA = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookieA },
    })
    assert.equal(logoutResA.status, 200)

    // Session của User A gọi lại /api/auth/me -> authenticated = false
    const meAfterA = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieA },
    })
    const meDataAfterA = await meAfterA.json()
    assert.equal(meDataAfterA.authenticated, false)

    // Session của User B vẫn ACTIVE bình thường
    const meAfterB = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieB },
    })
    const meDataAfterB = await meAfterB.json()
    assert.equal(meDataAfterB.authenticated, true)
    assert.equal(meDataAfterB.account.email, emailB)
  })

  it('6. Client-Side Isolation: Đơn hàng tài khoản không rò rỉ cho khách vãng lai và dọn sạch khi đăng xuất', () => {
    // Giả lập môi trường trình duyệt với localStorage
    const storage = new Map()
    global.window = { dispatchEvent: () => {} }
    global.localStorage = {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    }
    global.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }

    const mockOrders = [
      {
        orderId: 'ORD-GUEST-01',
        customer: { fullName: 'Khách Vãng Lai' },
        items: [{ id: 'p1', name: 'Pijama Khách' }],
      },
      {
        orderId: 'ORD-USER-A-01',
        customer: { accountId: 'acc_user_a', fullName: 'User A' },
        items: [{ id: 'p2', name: 'Pijama User A' }],
      },
    ]

    localStorage.setItem('pijama_orders', JSON.stringify(mockOrders))

    // 1. Khi ở chế độ Guest (excludeAccountOrders: true): Chỉ thấy đơn của khách, không thấy đơn của User A
    const guestOrders = getSavedOrders({ excludeAccountOrders: true })
    assert.equal(guestOrders.length, 1)
    assert.equal(guestOrders[0].orderId, 'ORD-GUEST-01')

    // 2. Khi lọc theo User A: Chỉ thấy đơn của User A
    const userAOrders = getSavedOrders({ filterAccountId: 'acc_user_a' })
    assert.equal(userAOrders.length, 1)
    assert.equal(userAOrders[0].orderId, 'ORD-USER-A-01')

    // 3. Khi lọc theo User B: Không thấy đơn nào
    const userBOrders = getSavedOrders({ filterAccountId: 'acc_user_b' })
    assert.equal(userBOrders.length, 0)
  })
})

