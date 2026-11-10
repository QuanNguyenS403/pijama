import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// Đảm bảo test không tự động listen cổng 3001 khi import server/index.js
process.env.NO_AUTO_LISTEN = 'true'

// Cô lập hoàn toàn khỏi các biến dịch vụ thật trong quá trình test
for (const key of Object.keys(process.env)) {
  if (/^(GAS_|GMAIL|RESEND|SMTP|TURNSTILE|SUPABASE|GOOGLE_|VIETTELPOST_)/i.test(key)) {
    delete process.env[key]
  }
}

const TEST_ENV = {
  ADMIN_PASSWORD: 'test-admin-password-hardening-2026',
  ADMIN_SESSION_SECRET: 'test-admin-session-secret-key-length-over-32-chars-a',
  ORDER_TOKEN_SECRET: 'test-order-token-secret-key-length-over-32-chars-b',
  CUSTOMER_AUTH_SECRET: 'test-customer-auth-secret-key-length-over-32-chars-c',
  JWT_SECRET: 'test-jwt-secret-key-distinct-length-over-32-chars-d',
  GMAIL_BRIDGE_SECRET: 'test-gmail-bridge-secret-key-length-over-32-chars-e',
  GMAIL_USER: 'shop-test@example.invalid',
  OWNER_EMAIL: 'owner-test@example.invalid',
}

Object.assign(process.env, TEST_ENV)

import { generateTrackingToken, verifyTrackingToken } from '../server/lib/orderTokenService.js'
import { generateAdminSessionToken, verifyAdminSessionToken } from '../server/lib/adminAuth.js'
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '../server/lib/authCrypto.js'
import { validateEnvironment } from '../server/lib/envCheck.js'
import { getDb, isTokenRevokedDb } from '../server/lib/accountDb.js'
import { cleanupExpiredData } from '../server/lib/cleanupService.js'
import { computeBridgeSignature, verifyBridgeHmac, clearBridgeReplayCache } from '../server/lib/gmailBridgeAuth.js'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { recordPaymentTransaction } from '../server/lib/paymentTransactions.js'
import { getJwtSecretKey } from '../server/lib/tokenService.js'
import { verifyTurnstileToken } from '../server/lib/turnstileService.js'

const { app } = await import('../server/index.js')

function restoreTestEnv(snapshot) {
  for (const key of Object.keys(snapshot)) {
    if (snapshot[key] === undefined) delete process.env[key]
    else process.env[key] = snapshot[key]
  }
}

describe('Backend Security & Infrastructure Hardening Suite', () => {
  let server
  let baseUrl
  const createdOrderIds = []

  before(async () => {
    server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    if (createdOrderIds.length > 0) {
      orderPersistence.purgeOrdersByPattern((o) => createdOrderIds.includes(o.orderId))
    }
    const db = getDb()
    db.prepare("DELETE FROM payment_transactions WHERE tx_id LIKE 'TEST_TX_HARDEN_%'").run()
    db.prepare("DELETE FROM security_audit_logs WHERE details LIKE '%QNS-TEST-HARDEN-%' OR details LIKE '%AUDIT-KEEP-%'").run()
    clearBridgeReplayCache()
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  afterEach(() => {
    Object.assign(process.env, TEST_ENV)
    process.env.NODE_ENV = 'test'
    clearBridgeReplayCache()
  })

  it('[C1/C2] Fail-closed secrets trong production (không fallback cứng hoặc dùng chung JWT_SECRET)', () => {
    const snapshot = {
      NODE_ENV: process.env.NODE_ENV,
      ORDER_TOKEN_SECRET: process.env.ORDER_TOKEN_SECRET,
      CUSTOMER_AUTH_SECRET: process.env.CUSTOMER_AUTH_SECRET,
      ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
      JWT_SECRET: process.env.JWT_SECRET,
    }

    try {
      process.env.NODE_ENV = 'production'
      delete process.env.ORDER_TOKEN_SECRET
      delete process.env.CUSTOMER_AUTH_SECRET
      delete process.env.ADMIN_SESSION_SECRET
      // Kể cả khi JWT_SECRET vẫn còn -> vẫn PHẢI từ chối (tách khóa)
      process.env.JWT_SECRET = TEST_ENV.JWT_SECRET

      assert.throws(() => generateTrackingToken('QNS-001', '0981753082'), /ORDER_TOKEN_SECRET/)
      assert.throws(() => verifyTrackingToken('QNS-001', '0981753082', 'deadbeef'.repeat(4)), /ORDER_TOKEN_SECRET/)
      assert.throws(() => generateUnsubscribeToken('u@example.invalid', 'acc_1'), /CUSTOMER_AUTH_SECRET/)
      assert.equal(verifyUnsubscribeToken('abc.def').isValid, false)
      assert.throws(() => generateAdminSessionToken(), /ADMIN_SESSION_SECRET/)
      assert.equal(verifyAdminSessionToken('1.2.3').isValid, false)

      // Khi cấp đủ khóa tách biệt -> hoạt động chuẩn
      process.env.ORDER_TOKEN_SECRET = TEST_ENV.ORDER_TOKEN_SECRET
      process.env.CUSTOMER_AUTH_SECRET = TEST_ENV.CUSTOMER_AUTH_SECRET
      process.env.ADMIN_SESSION_SECRET = TEST_ENV.ADMIN_SESSION_SECRET

      const trackTok = generateTrackingToken('QNS-001', '0981753082')
      assert.equal(verifyTrackingToken('QNS-001', '0981753082', trackTok), true)
      assert.equal(verifyTrackingToken('QNS-001', '0900000000', trackTok), false)

      const unsubTok = generateUnsubscribeToken('u@example.invalid', 'acc_1')
      assert.equal(verifyUnsubscribeToken(unsubTok).isValid, true)

      const adminTok = generateAdminSessionToken()
      assert.equal(verifyAdminSessionToken(adminTok).isValid, true)
    } finally {
      restoreTestEnv(snapshot)
    }
  })

  it('[C4] envCheck: fail-closed khi thiếu khóa prod, tương thích Render GAS bridge & cảnh báo trùng khóa', () => {
    // 1. Thiếu khóa prod (CI tắt) -> hasFatalErrors = true
    const fatalRes = validateEnvironment({ NODE_ENV: 'production', PORT: '3001' })
    assert.equal(fatalRes.hasFatalErrors, true)
    assert.equal(fatalRes.isValid, false)

    // 2. Môi trường Render dùng HTTPS Apps Script Bridge, không cần SMTP hay Google Sheets
    const renderEnv = {
      NODE_ENV: 'production',
      PORT: '10000',
      RENDER_EXTERNAL_URL: 'https://qns-clothes.onrender.com',
      ADMIN_PASSWORD: TEST_ENV.ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET: TEST_ENV.ADMIN_SESSION_SECRET,
      ORDER_TOKEN_SECRET: TEST_ENV.ORDER_TOKEN_SECRET,
      CUSTOMER_AUTH_SECRET: TEST_ENV.CUSTOMER_AUTH_SECRET,
      JWT_SECRET: TEST_ENV.JWT_SECRET,
      GMAIL_USER: 'shop@example.invalid',
      OWNER_EMAIL: 'owner@example.invalid',
      BANK_CODE: 'VCB',
      BANK_ACCOUNT_NUMBER: '1050773506',
      BANK_ACCOUNT_NAME: 'NGUYEN DUC QUAN',
      SHOP_NAME: 'QuanNguyenS',
      SHOP_PHONE: '0981753082',
      SHOP_ADDRESS: 'Hà Nội',
      GAS_EMAIL_WEBHOOK_URL: 'https://script.google.com/macros/s/test/exec',
      GAS_WEBHOOK_SECRET: 'test-gas-webhook-secret-over-32-chars',
    }
    const okRes = validateEnvironment(renderEnv)
    assert.equal(okRes.hasFatalErrors, false, `Unexpected errors: ${okRes.errors.join('; ')}`)
    assert.equal(okRes.isValid, true)
    assert.ok(okRes.warnings.some((w) => w.includes('GMAIL_APP_PASSWORD')))
    assert.ok(okRes.warnings.some((w) => w.includes('Google Sheets')))

    // 3. Cảnh báo khi dùng chung ADMIN_SESSION_SECRET với JWT_SECRET
    const reuseRes = validateEnvironment({
      ...renderEnv,
      ADMIN_SESSION_SECRET: TEST_ENV.JWT_SECRET,
    })
    assert.ok(reuseRes.warnings.some((w) => w.includes('[TÁCH KHÓA]')))
  })

  it('[D2/D3] SQLite bật PRAGMA foreign_keys, lưu schema_migrations và cleanupExpiredData bảo toàn audit logs', () => {
    const db = getDb()
    const fkEnabled = db.pragma('foreign_keys', { simple: true })
    assert.equal(fkEnabled, 1)

    const migration = db
      .prepare("SELECT version FROM schema_migrations WHERE version = '2026_11_backend_hardening_v1'")
      .get()
    assert.ok(migration)

    const now = Date.now()
    const past = now - 60_000
    const future = now + 3_600_000

    db.prepare('INSERT OR REPLACE INTO admin_revoked_tokens (token, revoked_at, expires_at) VALUES (?, ?, ?)').run(
      'hash_expired_harden_test',
      past,
      past
    )
    db.prepare('INSERT OR REPLACE INTO admin_revoked_tokens (token, revoked_at, expires_at) VALUES (?, ?, ?)').run(
      'hash_active_harden_test',
      now,
      future
    )
    db.prepare(
      'INSERT OR REPLACE INTO pending_registrations (email, full_name, password_hash, code_hash, salt, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('expired-harden@example.invalid', 'Test', 'hash', 'chash', 'salt', past, past)

    db.prepare(
      'INSERT INTO security_audit_logs (id, user_id, action, status, ip_hash, user_agent_hash, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('audit_harden_keep_1', 'admin', 'TEST_KEEP', 'SUCCESS', 'ip', 'ua', 'AUDIT-KEEP-1', new Date(past - 90 * 86400_000).toISOString())

    const summary = cleanupExpiredData({ now, database: db })
    assert.ok(summary.adminRevokedTokens >= 1)
    assert.ok(summary.pendingRegistrations >= 1)

    assert.equal(
      db.prepare('SELECT 1 FROM admin_revoked_tokens WHERE token = ?').get('hash_expired_harden_test'),
      undefined
    )
    assert.ok(db.prepare('SELECT 1 FROM admin_revoked_tokens WHERE token = ?').get('hash_active_harden_test'))
    assert.ok(db.prepare("SELECT 1 FROM security_audit_logs WHERE id = 'audit_harden_keep_1'").get())

    db.prepare('DELETE FROM admin_revoked_tokens WHERE token = ?').run('hash_active_harden_test')
    db.prepare("DELETE FROM security_audit_logs WHERE id = 'audit_harden_keep_1'").run()
  })

  it('[P2-API-6] gmailBridgeAuth chống Replay Attack cùng chữ ký hợp lệ', () => {
    const ts = Math.floor(Date.now() / 1000)
    const rawBody = JSON.stringify({ runId: 'run_replay_1', emails: [] })
    const sig = computeBridgeSignature(rawBody, TEST_ENV.GMAIL_BRIDGE_SECRET, ts)

    const req = {
      headers: {
        'x-qns-timestamp': String(ts),
        'x-qns-signature': sig,
      },
      rawBody,
      body: { runId: 'run_replay_1', emails: [] },
    }

    const first = verifyBridgeHmac(req)
    assert.equal(first.valid, true)

    const replay = verifyBridgeHmac(req)
    assert.equal(replay.valid, false)
    assert.equal(replay.status, 401)
    assert.match(replay.error, /phát lại|replay/i)
  })

  it('[P1-API-1/AD1] GET /api/health/email khóa sau Admin Auth, che email; POST /api/admin/logout thu hồi token bền vững', async () => {
    // Unauthenticated -> 401
    const unauthRes = await fetch(`${baseUrl}/api/health/email`)
    assert.equal(unauthRes.status, 401)

    // Login -> get admin token
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: TEST_ENV.ADMIN_PASSWORD }),
    })
    assert.equal(loginRes.status, 200)
    const loginBody = await loginRes.json()
    assert.ok(loginBody.token)

    // Authenticated health/email -> masks user & ownerEmail, không trả instructions
    const authHealthRes = await fetch(`${baseUrl}/api/health/email`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    })
    assert.ok([200, 500].includes(authHealthRes.status))
    const authHealthBody = await authHealthRes.json()
    assert.equal(authHealthBody.instructions, undefined)
    if (authHealthBody.user) {
      assert.ok(!authHealthBody.user.includes('shop-test@example.invalid'))
    }

    // Logout -> revokes token persistently in DB
    const logoutRes = await fetch(`${baseUrl}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginBody.token}` },
    })
    assert.equal(logoutRes.status, 200)
    assert.equal(isTokenRevokedDb(loginBody.token), true)

    // Reusing logged-out token -> 401
    const afterLogoutRes = await fetch(`${baseUrl}/api/health/email`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    })
    assert.equal(afterLogoutRes.status, 401)
  })

  it('[P2-API-6 HTTP] POST /api/payment/bank-email chặn batch vượt quá 50 phần tử', async () => {
    const emails = Array.from({ length: 51 }, (_, idx) => ({
      messageId: `msg_${idx}`,
      from: 'VCBDigibank@info.vietcombank.com.vn',
      subject: 'Bien dong so du',
      bodyText: 'Test',
    }))
    const payload = { runId: 'run_oversize', emails }
    const rawBody = JSON.stringify(payload)
    const ts = Math.floor(Date.now() / 1000)
    const sig = computeBridgeSignature(rawBody, TEST_ENV.GMAIL_BRIDGE_SECRET, ts)

    const res = await fetch(`${baseUrl}/api/payment/bank-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-QNS-Timestamp': String(ts),
        'X-QNS-Signature': sig,
      },
      body: rawBody,
    })
    assert.equal(res.status, 400)
    const body = await res.json()
    assert.match(body.error, /50/)
  })

  it('[P1-API-3/P1-API-4/SSE] Tracking chống brute-force đuôi SĐT, Cancel-Request soft-delete giữ tx & SSE kiểm soát quyền chặt', async () => {
    const pendingOrderId = `QNS-TEST-HARDEN-PEND-${Date.now()}`
    const paidOrderId = `QNS-TEST-HARDEN-PAID-${Date.now()}`
    const phone = '0981753082'
    createdOrderIds.push(pendingOrderId, paidOrderId)

    const pendingToken = generateTrackingToken(pendingOrderId, phone)
    orderPersistence.set(pendingOrderId, {
      orderId: pendingOrderId,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      payment: { method: 'COD', status: 'UNPAID' },
      customer: { fullName: 'Khach Test', phone, email: '' },
      shipping: { fullAddress: 'Hà Nội', carrier: 'Viettel Post' },
      items: [{ productName: 'Set Test', variant: 'Đỏ / M', quantity: 1, unitPrice: 490000, totalPrice: 490000 }],
      subtotal: 490000,
      shippingFee: 30000,
      discount: 0,
      total: 520000,
      createdAt: new Date().toISOString(),
    })

    orderPersistence.set(paidOrderId, {
      orderId: paidOrderId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      payment: { method: 'BANK_TRANSFER', status: 'PAID' },
      customer: { fullName: 'Khach Paid', phone },
      items: [{ productName: 'Set Test', quantity: 1, unitPrice: 550000, totalPrice: 550000 }],
      total: 550000,
      createdAt: new Date().toISOString(),
    })

    // Ghi transaction mẫu gắn với đơn pendingOrderId để chứng minh không bị DELETE khi hủy
    const db = getDb()
    const recordedTx = recordPaymentTransaction({
      txId: `TEST_TX_HARDEN_${Date.now()}`,
      amount: 100000,
      content: pendingOrderId,
      gateway: 'VCB',
      matchedOrderId: pendingOrderId,
      outcome: 'AMOUNT_MISMATCH',
    })
    assert.ok(recordedTx && recordedTx.txId)

    // 1. Tracking trả 404 đồng nhất cho mã đơn không tồn tại hoặc SĐT chỉ khớp 4 số cuối
    const missingTrack = await fetch(`${baseUrl}/api/orders/tracking?orderId=QNS-NONEXISTENT-999&phone=${phone}`)
    const suffixTrack = await fetch(`${baseUrl}/api/orders/tracking?orderId=${pendingOrderId}&phone=3082`)
    assert.equal(missingTrack.status, 404)
    assert.equal(suffixTrack.status, 404)
    assert.equal((await missingTrack.json()).code, 'ORDER_NOT_FOUND')
    assert.equal((await suffixTrack.json()).code, 'ORDER_NOT_FOUND')

    // 2. Canonical +84 khớp chính xác 0981753082 -> 200
    const canonicalTrack = await fetch(
      `${baseUrl}/api/orders/tracking?orderId=${pendingOrderId}&phone=${encodeURIComponent('+84981753082')}`
    )
    assert.equal(canonicalTrack.status, 200)
    const canonicalBody = await canonicalTrack.json()
    assert.equal(canonicalBody.orderId, pendingOrderId)

    // 3. SSE: Thiếu token -> 401
    const sseNoTok = await fetch(`${baseUrl}/api/orders/events?orderId=${pendingOrderId}`)
    assert.equal(sseNoTok.status, 401)

    // 4. SSE: Khách có trackingToken hợp lệ (chỉ cần orderId & token, không cần phone) -> 200 SSE
    const acCustomer = new AbortController()
    const sseCustomer = await fetch(`${baseUrl}/api/orders/events?orderId=${pendingOrderId}&token=${pendingToken}`, {
      signal: acCustomer.signal,
    })
    assert.equal(sseCustomer.status, 200)
    assert.match(sseCustomer.headers.get('content-type') || '', /text\/event-stream/)
    acCustomer.abort()

    // 5. SSE Production: Không chấp nhận Admin token qua ?token= query param, chỉ nhận qua header
    const adminToken = generateAdminSessionToken()
    const origNodeEnv = process.env.NODE_ENV
    try {
      process.env.NODE_ENV = 'production'
      const sseQueryAdmin = await fetch(`${baseUrl}/api/orders/events?token=${encodeURIComponent(adminToken)}`)
      assert.notEqual(sseQueryAdmin.status, 200)

      const acAdmin = new AbortController()
      const sseHeaderAdmin = await fetch(`${baseUrl}/api/orders/events`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: acAdmin.signal,
      })
      assert.equal(sseHeaderAdmin.status, 200)
      acAdmin.abort()
    } finally {
      process.env.NODE_ENV = origNodeEnv
    }

    // 6. Cancel-request: Cấm hủy đơn PAID
    const cancelPaid = await fetch(`${baseUrl}/api/orders/cancel-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: paidOrderId, phone, reason: 'Thử hủy đơn đã trả tiền' }),
    })
    assert.equal(cancelPaid.status, 400)

    // 7. Cancel-request: Soft-delete đơn PENDING -> giữ nguyên record với status CANCELLED + giữ payment_transactions
    const cancelPending = await fetch(`${baseUrl}/api/orders/cancel-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: pendingOrderId, token: pendingToken, reason: 'Đổi size sản phẩm' }),
    })
    assert.equal(cancelPending.status, 200)
    const cancelBody = await cancelPending.json()
    assert.equal(cancelBody.status, 'CANCELLED')

    const preserved = orderPersistence.get(pendingOrderId)
    assert.ok(preserved)
    assert.equal(preserved.status, 'CANCELLED')

    const txCount = db
      .prepare('SELECT COUNT(*) as c FROM payment_transactions WHERE matched_order_id = ?')
      .get(pendingOrderId).c
    assert.equal(txCount, 1)

    const auditRow = db
      .prepare("SELECT action, status FROM security_audit_logs WHERE action = 'CUSTOMER_ORDER_CANCEL' AND details LIKE ?")
      .get(`%${pendingOrderId}%`)
    assert.ok(auditRow)
    assert.equal(auditRow.status, 'SUCCESS')
  })

  it('[DoS/UTF-8] timingSafeEqual không ném RangeError HTTP 500 khi nhận ký tự đa byte (é)', async () => {
    const multibyte64 = '\u00e9'.repeat(64)
    const multibyte32 = '\u00e9'.repeat(32)

    assert.equal(verifyAdminSessionToken(`1:${Date.now() + 60000}:nonce.${multibyte64}`).isValid, false)
    assert.equal(verifyTrackingToken('QNS-UTF8-TEST', '0981753082', multibyte32), false)

    const trackRes = await fetch(
      `${baseUrl}/api/orders/tracking?orderId=QNS-UTF8-TEST&token=${encodeURIComponent(multibyte32)}`
    )
    assert.equal(trackRes.status, 404)

    const sseRes = await fetch(
      `${baseUrl}/api/orders/events?orderId=QNS-UTF8-TEST&token=${encodeURIComponent(multibyte32)}`
    )
    assert.equal(sseRes.status, 401)
  })

  it('[C1/C4] tokenService, Turnstile enforced & bộ biến CI Smoke Test thỏa mãn validateEnvironment', async () => {
    const snapshot = {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      CUSTOMER_AUTH_SECRET: process.env.CUSTOMER_AUTH_SECRET,
      TURNSTILE_ENFORCE: process.env.TURNSTILE_ENFORCE,
      TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    }
    try {
      process.env.NODE_ENV = 'production'
      delete process.env.JWT_SECRET
      process.env.CUSTOMER_AUTH_SECRET = TEST_ENV.CUSTOMER_AUTH_SECRET
      assert.throws(() => getJwtSecretKey(), /JWT_SECRET/)

      process.env.TURNSTILE_ENFORCE = 'true'
      delete process.env.TURNSTILE_SECRET_KEY
      const turnRes = await verifyTurnstileToken('', '127.0.0.1')
      assert.equal(turnRes.success, false)

      // Bộ biến chính xác dùng cho bước Smoke Test Production Startup trong .github/workflows/ci.yml
      const ciSmokeEnv = {
        NODE_ENV: 'production',
        PORT: '3999',
        APP_URL: 'https://ci-smoke.example.invalid',
        ALLOWED_ORIGINS: 'https://ci-smoke.example.invalid',
        ADMIN_PASSWORD: 'ci-smoke-dummy-admin-password-32ch',
        ADMIN_SESSION_SECRET: 'ci-smoke-dummy-admin-session-secret-32c',
        ORDER_TOKEN_SECRET: 'ci-smoke-dummy-order-token-secret-32ch',
        CUSTOMER_AUTH_SECRET: 'ci-smoke-dummy-customer-auth-secret-32ch',
        JWT_SECRET: 'ci-smoke-dummy-jwt-secret-key-length-32ch',
        GMAIL_USER: 'ci-smoke@example.invalid',
        OWNER_EMAIL: 'owner-smoke@example.invalid',
        GAS_EMAIL_WEBHOOK_URL: 'https://script.google.com/macros/s/ci-smoke/exec',
        GAS_WEBHOOK_SECRET: 'ci-smoke-dummy-gas-webhook-secret-32ch',
        GMAIL_BRIDGE_SECRET: 'ci-smoke-dummy-gmail-bridge-secret-32c',
        SEPAY_WEBHOOK_API_KEY: 'ci-smoke-dummy-sepay-webhook-key-32chars',
        BANK_CODE: 'VCB',
        BANK_ACCOUNT_NUMBER: '1050773506',
        BANK_ACCOUNT_NAME: 'NGUYEN DUC QUAN',
        SHOP_NAME: 'QuanNguyenS',
        SHOP_PHONE: '0981753082',
        SHOP_ADDRESS: 'Amber Riverside, 622 Minh Khai, Vinh Tuy, Ha Noi',
      }
      const ciRes = validateEnvironment(ciSmokeEnv)
      assert.equal(ciRes.hasFatalErrors, false, `CI smoke env thiếu biến: ${ciRes.errors.join('; ')}`)
      assert.equal(ciRes.isValid, true)

      // Môi trường Render tối thiểu với 5 khóa bảo mật (chưa cấu hình GAS_WEBHOOK_SECRET / PORT / APP_URL) vẫn phải cho phép boot ở chế độ degraded
      const minimalRenderEnv = {
        NODE_ENV: 'production',
        RENDER: 'true',
        ADMIN_PASSWORD: TEST_ENV.ADMIN_PASSWORD,
        ADMIN_SESSION_SECRET: TEST_ENV.ADMIN_SESSION_SECRET,
        ORDER_TOKEN_SECRET: TEST_ENV.ORDER_TOKEN_SECRET,
        CUSTOMER_AUTH_SECRET: TEST_ENV.CUSTOMER_AUTH_SECRET,
        JWT_SECRET: TEST_ENV.JWT_SECRET,
        AUTH_TEST_MODE: 'false',
      }
      const minimalRes = validateEnvironment(minimalRenderEnv)
      assert.equal(minimalRes.hasFatalErrors, false, `Minimal Render env không nên chặn boot: ${minimalRes.errors.join('; ')}`)
      assert.ok(minimalRes.warnings.some((w) => w.includes('CHẾ ĐỘ DEGRADED')))
    } finally {
      restoreTestEnv(snapshot)
    }
  })

  it('[RENDER-DEPLOY] /livez phản hồi 200 OK nhanh không phụ thuộc middleware session', async () => {
    const res = await fetch(`${baseUrl}/livez`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.status, 'alive')
  })
})

