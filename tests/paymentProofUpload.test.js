process.env.NO_AUTO_LISTEN = 'true'

import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

import { orderPersistence } from '../server/lib/orderPersistence.js'
import { generateTrackingToken } from '../server/lib/orderTokenService.js'
import { detectImageExtension, resolveProofUploadsDir } from '../server/lib/paymentProofService.js'
import { getOrderPaymentStatus } from '../server/lib/paymentWebhook.js'
import { formatAdminOrder, handleAdminOrderAction } from '../server/lib/adminOrdersHandler.js'
import { getPaymentQrData } from '../server/lib/paymentQrService.js'
import { expireOrderIfDue, sweepExpiredOrders, getPaymentPhase } from '../server/lib/paymentState.js'
import { getDb } from '../server/lib/accountDb.js'

function startServer(expressApp) {
  return new Promise((resolve) => {
    const server = http.createServer(expressApp)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` })
    })
  })
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
}

// Minimal valid 1x1 PNG bytes
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

const VALID_JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

const cleanupOrderIds = []

after(() => {
  try {
    const db = getDb()
    for (const oid of cleanupOrderIds) {
      orderPersistence.delete(oid)
      db.prepare('DELETE FROM orders WHERE order_id = ?').run(oid)
    }
    const dir = resolveProofUploadsDir()
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch {}
})

describe('Manual QR Payment Flow: Upload Proof -> Submit Thanh Toan -> Waiting Page -> Admin Approve & Dual Emails', () => {
  it('detectImageExtension verifies real JPEG/PNG/WebP magic bytes and rejects spoofed files', () => {
    assert.equal(detectImageExtension(VALID_PNG_BUFFER), '.png')
    assert.equal(detectImageExtension(VALID_JPEG_HEADER), '.jpg')
    assert.equal(detectImageExtension(Buffer.from('RIFF1234WEBPVP8 ')), '.webp')
    assert.equal(detectImageExtension(Buffer.from('<script>alert(1)</script>')), null)
    assert.equal(detectImageExtension(Buffer.from('tiny')), null)
  })

  it('Enforces upload-before-submit, disables QR expiry & bank-email auto-reconcile, and dispatches customer+owner emails on Admin approval', async () => {
    const orderId = `QNS-PROOF-${Date.now()}`
    const phone = '0973486218'
    cleanupOrderIds.push(orderId)

    const now = Date.now()
    orderPersistence.set(orderId, {
      orderId,
      total: 495000,
      subtotal: 550000,
      discount: 55000,
      shippingFee: 0,
      status: 'AWAITING_PAYMENT',
      createdAt: new Date(now).toISOString(),
      orderDateVN: '11/11/2026 17:05',
      customer: { fullName: 'Khách Test CK', phone, email: 'qr-customer@example.com' },
      shipping: { fullAddress: '123 Phố Huế, Hai Bà Trưng, Hà Nội' },
      items: [{ productName: 'The Stillwater Set', variant: 'Caro Navy', size: 'S', quantity: 1, unitPrice: 550000, totalPrice: 550000 }],
      payment: {
        method: 'BANK_TRANSFER',
        methodLabel: 'Chuyển khoản VietQR',
        status: 'AWAITING_PAYMENT',
      },
    })

    const trackingToken = generateTrackingToken(orderId, phone)
    const { app } = await import('../server/index.js')
    const { server, baseUrl } = await startServer(app)

    try {
      // 0. Bank-email auto-reconciliation endpoint is disabled (410 Gone)
      const bankEmailRes = await fetch(`${baseUrl}/api/payment/bank-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [] }),
      })
      assert.equal(bankEmailRes.status, 410)

      // 1. Cannot click "Thanh toán" (submit-qr-payment) before uploading transfer proof
      const submitBeforeProofRes = await fetch(`${baseUrl}/api/orders/submit-qr-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingToken }),
      })
      assert.equal(submitBeforeProofRes.status, 400)
      const submitBeforeProofData = await submitBeforeProofRes.json()
      assert.equal(submitBeforeProofData.code, 'PAYMENT_PROOF_REQUIRED')

      // 2. Reject spoofed non-image buffer
      const badForm = new FormData()
      badForm.append('orderId', orderId)
      badForm.append('trackingToken', trackingToken)
      badForm.append('proofImage', new Blob([Buffer.from('not-a-real-png-at-all')], { type: 'image/png' }), 'fake.png')

      const badRes = await fetch(`${baseUrl}/api/orders/payment-proof`, { method: 'POST', body: badForm })
      assert.equal(badRes.status, 400)

      // 3. Reject unauthorized caller (wrong phone & no token)
      const unauthForm = new FormData()
      unauthForm.append('orderId', orderId)
      unauthForm.append('phone', '0900000000')
      unauthForm.append('proofImage', new Blob([VALID_PNG_BUFFER], { type: 'image/png' }), 'receipt.png')

      const unauthRes = await fetch(`${baseUrl}/api/orders/payment-proof`, { method: 'POST', body: unauthForm })
      assert.equal(unauthRes.status, 401)

      // 4. Upload valid image with valid trackingToken
      const okForm = new FormData()
      okForm.append('orderId', orderId)
      okForm.append('trackingToken', trackingToken)
      okForm.append('note', 'CK luc 17:05 ma GD 998877')
      okForm.append('proofImage', new Blob([VALID_PNG_BUFFER], { type: 'image/png' }), 'receipt.png')

      const okRes = await fetch(`${baseUrl}/api/orders/payment-proof`, { method: 'POST', body: okForm })
      assert.equal(okRes.status, 200)
      const okData = await okRes.json()
      assert.equal(okData.success, true)
      assert.ok(okData.paymentProof.imageUrl.startsWith('/uploads/payment-proofs/proof_'))
      assert.ok(okData.paymentProof.imageUrl.endsWith('.png'))

      const firstFilePath = path.join(resolveProofUploadsDir(), path.basename(okData.paymentProof.imageUrl))
      assert.equal(fs.existsSync(firstFilePath), true)

      // 5. Submit "Thanh toán" -> moves order to WAITING_CONFIRMATION / PENDING_ADMIN_CONFIRMATION
      const submitRes = await fetch(`${baseUrl}/api/orders/submit-qr-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingToken }),
      })
      assert.equal(submitRes.status, 200)
      const submitData = await submitRes.json()
      assert.equal(submitData.success, true)
      assert.equal(submitData.phase, 'WAITING_CONFIRMATION')
      assert.equal(submitData.paymentStatus, 'PENDING_ADMIN_CONFIRMATION')

      // 6. Polling status reflects WAITING_CONFIRMATION cleanly & does NOT leak proofImageUrl
      const poll = getOrderPaymentStatus(orderId)
      assert.equal(poll.phase, 'WAITING_CONFIRMATION')
      assert.equal(poll.status, 'WAITING_CONFIRMATION')
      assert.equal(poll.hasPaymentProof, true)
      assert.ok(poll.paymentSubmittedAt)
      assert.equal(poll.paymentProof, undefined)

      // 7. Authenticated GET /api/orders/payment-proof returns imageUrl; unauthenticated returns 401
      const noTokGet = await fetch(`${baseUrl}/api/orders/payment-proof?orderId=${encodeURIComponent(orderId)}`)
      assert.equal(noTokGet.status, 401)

      const tokGet = await fetch(`${baseUrl}/api/orders/payment-proof?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(trackingToken)}`)
      assert.equal(tokGet.status, 200)
      const tokGetData = await tokGet.json()
      assert.equal(tokGetData.paymentProof.imageUrl, okData.paymentProof.imageUrl)

      // 8. QR does NOT expire even 48 hours later
      const twoDaysLater = now + 48 * 3600 * 1000
      assert.equal(expireOrderIfDue(orderId, twoDaysLater), false)
      assert.deepEqual(sweepExpiredOrders(twoDaysLater), { expiredCount: 0 })
      assert.equal(getPaymentPhase(orderPersistence.get(orderId)), 'WAITING_CONFIRMATION')
      const qrRes = await getPaymentQrData(orderId, twoDaysLater)
      assert.equal(qrRes.ok, true)
      assert.equal(qrRes.data.isQrValid, true)

      // 9. Admin formatted order includes paymentProof & paymentSubmittedAt
      const adminOrder = formatAdminOrder(orderPersistence.get(orderId))
      assert.equal(adminOrder.paymentProof.imageUrl, okData.paymentProof.imageUrl)
      assert.equal(adminOrder.paymentStatus, 'PENDING_ADMIN_CONFIRMATION')
      assert.ok(adminOrder.paymentSubmittedAt)

      // 10. Admin manual approval marks PAID + CONFIRMED and sends confirmation emails to BOTH customer and admin
      const approveRes = await handleAdminOrderAction(orderId, {
        action: 'MARK_PAID',
        note: 'Đã kiểm tra ảnh chuyển khoản khách gửi và nhận đủ tiền',
      })
      assert.equal(approveRes.status, 200)
      assert.equal(approveRes.data.order.status, 'CONFIRMED')
      assert.equal(approveRes.data.order.paymentStatus, 'PAID')
      assert.equal(approveRes.data.emailDelivery.customerEmailSent, true)
      assert.equal(approveRes.data.emailDelivery.ownerEmailSent, true)
      assert.ok(orderPersistence.get(orderId).emails?.confirmationSentAt)

      // 11. After Admin approval, QR status is PAID
      const postApprovePoll = getOrderPaymentStatus(orderId)
      assert.equal(postApprovePoll.phase, 'PAID')
      assert.equal(postApprovePoll.status, 'PAID')
    } finally {
      await stopServer(server)
    }
  })

  it('POST /api/orders/submit-qr-payment rejects COD orders (waiting flow is QR-only)', async () => {
    const codOrderId = `QNS-COD-PROOF-${Date.now()}`
    const phone = '0973486218'
    cleanupOrderIds.push(codOrderId)

    orderPersistence.set(codOrderId, {
      orderId: codOrderId,
      total: 490000,
      status: 'PENDING',
      customer: { fullName: 'Khách COD', phone, email: 'cod@example.com' },
      payment: { method: 'COD', status: 'UNPAID' },
    })

    const trackingToken = generateTrackingToken(codOrderId, phone)
    const { app } = await import('../server/index.js')
    const { server, baseUrl } = await startServer(app)
    try {
      const res = await fetch(`${baseUrl}/api/orders/submit-qr-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: codOrderId, trackingToken }),
      })
      assert.equal(res.status, 400)
    } finally {
      await stopServer(server)
    }
  })
})
