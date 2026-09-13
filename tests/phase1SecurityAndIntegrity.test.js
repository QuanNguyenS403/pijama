import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { verifyAdminLogin, requireAdminAuth, verifyAdminSessionToken } from '../server/lib/adminAuth.js'
import { handlePaymentWebhook, getOrderPaymentStatus, confirmOrderPaymentManually } from '../server/lib/paymentWebhook.js'
import { validateOrderStock } from '../server/lib/stockValidator.js'
import { generateTrackingToken, verifyTrackingToken } from '../server/lib/orderTokenService.js'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { handleOrderSubmit } from '../server/apiHandler.js'

// Setup environment for testing
process.env.ADMIN_PASSWORD = 'TestAdminPassword123!'
process.env.SEPAY_WEBHOOK_API_KEY = 'valid-test-webhook-secret-key'

// Helper to launch test server
async function createTestApp() {
  const app = express()
  app.use((req, res, next) => {
    res.set('Connection', 'close')
    next()
  })
  app.use(express.json())

  // Admin routes
  app.post('/api/admin/login', (req, res) => {
    const result = verifyAdminLogin(req.body?.password)
    return res.status(result.status).json(result.data)
  })

  app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
    return res.json({ success: true, orders: [] })
  })

  app.patch('/api/admin/orders/:id', requireAdminAuth, (req, res) => {
    return res.json({ success: true, orderId: req.params.id })
  })

  app.post('/api/payment/confirm', requireAdminAuth, async (req, res) => {
    const result = await confirmOrderPaymentManually(req.body)
    return res.status(result.status).json(result.data)
  })

  // Public webhook
  app.post('/api/payment/webhook', async (req, res) => {
    const result = await handlePaymentWebhook(req)
    return res.status(result.status).json(result.data)
  })

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => {
          if (server.closeAllConnections) server.closeAllConnections()
          server.close()
        },
      })
    })
  })
}

test('P0 / G-01 & G-02 & G-03: SEC-001 Admin Auth Protection', async (t) => {
  const app = await createTestApp()
  t.after(() => app.close())

  // 1. Unauthenticated GET /api/admin/orders must return 401
  const unauthGet = await fetch(`${app.baseUrl}/api/admin/orders`)
  assert.equal(unauthGet.status, 401)
  const unauthGetData = await unauthGet.json()
  assert.equal(unauthGetData.success, false)
  assert.equal(unauthGetData.code, 'ADMIN_AUTH_REQUIRED')

  // 2. Unauthenticated PATCH /api/admin/orders/:id must return 401
  const unauthPatch = await fetch(`${app.baseUrl}/api/admin/orders/QNS-TEST-123`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'NOTE', note: 'hack' }),
  })
  assert.equal(unauthPatch.status, 401)

  // 3. Login with correct password generates valid signed token
  const loginRes = await fetch(`${app.baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'TestAdminPassword123!' }),
  })
  assert.equal(loginRes.status, 200)
  const loginData = await loginRes.json()
  assert.equal(loginData.success, true)
  assert.ok(loginData.token)

  const tokenVerification = verifyAdminSessionToken(loginData.token)
  assert.equal(tokenVerification.isValid, true)

  // 4. Authenticated request with Bearer token succeeds
  const authGet = await fetch(`${app.baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  })
  assert.equal(authGet.status, 200)
  const authGetData = await authGet.json()
  assert.equal(authGetData.success, true)

  // 5. Tampered token returns 401
  const tamperedGet = await fetch(`${app.baseUrl}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${loginData.token}tampered` },
  })
  assert.equal(tamperedGet.status, 401)
})

test('P0 / G-09: PAY-001 Bank Transfer Initial Status is AWAITING_PAYMENT', async () => {
  const testOrderId = `QNS-BANK-TEST-${Date.now()}`
  const orderPayload = {
    orderId: testOrderId,
    customer: {
      fullName: 'Nguyễn Văn A',
      phone: '0981753082',
      email: 'customer@example.com',
    },
    items: [
      {
        productId: 'the-classic-set',
        color: { name: 'Pink Stripe' },
        size: 'S',
        quantity: 1,
        unitPrice: 390000,
      },
    ],
    subtotal: 390000,
    shippingFee: 30000,
    discount: 39000,
    total: 381000,
    payment: {
      method: 'BANK_TRANSFER',
    },
  }

  const submitRes = await handleOrderSubmit(orderPayload)
  assert.equal(submitRes.status, 200)
  assert.equal(submitRes.data.status, 'AWAITING_PAYMENT')

  const storedOrder = orderPersistence.get(testOrderId)
  assert.ok(storedOrder)
  assert.equal(storedOrder.status, 'AWAITING_PAYMENT')
  assert.equal(storedOrder.payment.status, 'AWAITING_PAYMENT')

  const pollingStatus = getOrderPaymentStatus(testOrderId)
  assert.equal(pollingStatus.status, 'AWAITING_PAYMENT')
  assert.equal(pollingStatus.isQrValid, true)
})

test('P0 / G-10 & G-11 & G-12: PAY-002 Webhook Validation, Unknown Order Reject & Idempotency', async (t) => {
  const app = await createTestApp()
  t.after(() => app.close())

  const validOrderId = `QNS-WH-TEST-${Date.now()}`
  const testOrder = {
    orderId: validOrderId,
    total: 381000,
    status: 'AWAITING_PAYMENT',
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
    },
    customer: { email: 'wh-customer@example.com', phone: '0981753082' },
  }
  orderPersistence.set(validOrderId, testOrder)

  // 1. Reject invalid / substring secret
  const badSecretRes = await fetch(`${app.baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer substring-not-valid',
    },
    body: JSON.stringify({ amount: 381000, content: `QNS ${validOrderId}` }),
  })
  assert.equal(badSecretRes.status, 401)

  // 2. Reject webhook when orderId does NOT exist (must NOT auto-create order)
  const unknownOrderRes = await fetch(`${app.baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-test-webhook-secret-key',
    },
    body: JSON.stringify({
      id: `tx-unknown-${Date.now()}`,
      amount: 500000,
      content: 'QNS-UNKNOWN-999999',
    }),
  })
  assert.equal(unknownOrderRes.status, 404)
  assert.equal(orderPersistence.get('QNS-UNKNOWN-999999'), null)

  // 3. Reject webhook when amount is incorrect (e.g. sends 1đ instead of 381000đ)
  const wrongAmountRes = await fetch(`${app.baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-test-webhook-secret-key',
    },
    body: JSON.stringify({
      id: `tx-wrong-amt-${Date.now()}`,
      amount: 1,
      content: `Thanh toan don ${validOrderId}`,
    }),
  })
  assert.equal(wrongAmountRes.status, 400)
  const orderAfterWrongAmount = orderPersistence.get(validOrderId)
  assert.equal(orderAfterWrongAmount.payment.status, 'AWAITING_PAYMENT')

  // 4. Valid webhook with exact amount marks order CONFIRMED and payment PAID
  const txId = `tx-valid-${Date.now()}`
  const validWebhookRes = await fetch(`${app.baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-test-webhook-secret-key',
    },
    body: JSON.stringify({
      id: txId,
      amount: 381000,
      content: `Thanh toan cho don ${validOrderId}`,
    }),
  })
  assert.equal(validWebhookRes.status, 200)
  const orderAfterValid = orderPersistence.get(validOrderId)
  assert.equal(orderAfterValid.status, 'CONFIRMED')
  assert.equal(orderAfterValid.payment.status, 'PAID')

  // 5. Idempotent retry with same transaction ID returns 200 without duplicate processing
  const retryWebhookRes = await fetch(`${app.baseUrl}/api/payment/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer valid-test-webhook-secret-key',
    },
    body: JSON.stringify({
      id: txId,
      amount: 381000,
      content: `Thanh toan cho don ${validOrderId}`,
    }),
  })
  assert.equal(retryWebhookRes.status, 200)
})

test('P0 / G-13: PAY-003 Manual Confirm Protected and Requires Canonical Order', async (t) => {
  const app = await createTestApp()
  t.after(() => app.close())

  // 1. Unauthenticated client cannot call /api/payment/confirm
  const unauthConfirm = await fetch(`${app.baseUrl}/api/payment/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: 'QNS-CLIENT-FABRICATED' }),
  })
  assert.equal(unauthConfirm.status, 401)

  // 2. Admin cannot confirm an order that does not exist
  const loginRes = await fetch(`${app.baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'TestAdminPassword123!' }),
  })
  const { token } = await loginRes.json()

  const adminConfirmNonExistent = await fetch(`${app.baseUrl}/api/payment/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId: 'QNS-NON-EXISTENT-XYZ' }),
  })
  assert.equal(adminConfirmNonExistent.status, 404)
  assert.equal(orderPersistence.get('QNS-NON-EXISTENT-XYZ'), null)
})

test('P0 / G-16: INV-001 Stock Validation Anti-Bypass, Aggregation & Variant Check', () => {
  // 1. Client attempts to bypass stock limit using client flag isPreOrder: true with qty 999
  const clientBypassOrder = {
    orderId: 'QNS-TEST-BYPASS-01',
    items: [
      {
        productId: 'the-classic-set',
        color: { name: 'Pink Stripe' },
        size: 'S', // stock is 10
        quantity: 999,
        isPreOrder: true,
      },
    ],
  }
  const bypassResult = validateOrderStock(clientBypassOrder)
  assert.equal(bypassResult.isValid, false)
  assert.match(bypassResult.error, /chỉ còn .* sản phẩm trong kho/i)

  // 2. Duplicate SKU lines aggregation: 2 lines of 6 each (total 12) exceeding stock 10
  const duplicateLinesOrder = {
    orderId: 'QNS-TEST-DUP-LINES-02',
    items: [
      {
        productId: 'the-classic-set',
        color: { name: 'Pink Stripe' },
        size: 'S',
        quantity: 6,
      },
      {
        productId: 'the-classic-set',
        color: { name: 'Pink Stripe' },
        size: 'S',
        quantity: 6,
      },
    ],
  }
  const dupResult = validateOrderStock(duplicateLinesOrder)
  assert.equal(dupResult.isValid, false)
  assert.equal(dupResult.requestedQuantity, 12)

  // 3. Invalid color variant rejection
  const invalidColorOrder = {
    orderId: 'QNS-TEST-INVALID-COLOR-03',
    items: [
      {
        productId: 'the-classic-set',
        color: { name: 'Neon Green' },
        size: 'S',
        quantity: 1,
      },
    ],
  }
  const invalidColorResult = validateOrderStock(invalidColorOrder)
  assert.equal(invalidColorResult.isValid, false)
  assert.match(invalidColorResult.error, /Màu sắc .* không tồn tại/i)

  // 4. Invalid size variant rejection
  const invalidSizeOrder = {
    orderId: 'QNS-TEST-INVALID-SIZE-04',
    items: [
      {
        productId: 'the-classic-set',
        color: { name: 'Pink Stripe' },
        size: 'XXL',
        quantity: 1,
      },
    ],
  }
  const invalidSizeResult = validateOrderStock(invalidSizeOrder)
  assert.equal(invalidSizeResult.isValid, false)
  assert.match(invalidSizeResult.error, /Kích thước .* không tồn tại/i)
})

test('P0 / G-04 & G-05 & G-06: SEC-002 Order Tracking, Lookup and Cancel Proof of Ownership', () => {
  const orderId = `QNS-OWNER-TEST-${Date.now()}`
  const phone = '0981753082'
  const trackingToken = generateTrackingToken(orderId, phone)

  assert.ok(trackingToken)
  assert.equal(verifyTrackingToken(orderId, phone, trackingToken), true)
  assert.equal(verifyTrackingToken(orderId, '0900000000', trackingToken), false)
  assert.equal(verifyTrackingToken('OTHER-ORDER', phone, trackingToken), false)
})
