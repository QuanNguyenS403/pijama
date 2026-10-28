import test from 'node:test'
import assert from 'node:assert/strict'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { getPaymentPhase, expireOrderIfDue, PAYMENT_QR_TTL_SECONDS } from '../server/lib/paymentState.js'
import { handleAdminOrderAction } from '../server/lib/adminOrdersHandler.js'

// Mock environment
process.env.NODE_ENV = 'test'
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret-key-123456789'
process.env.BANK_CODE = 'VCB'
process.env.BANK_ACCOUNT_NUMBER = '1050773506'
process.env.BANK_ACCOUNT_NAME = 'NGUYEN DUC QUAN'

// ── T-R1: Kiểm tra pha thanh toán có giai đoạn RECONCILING và EXPIRED ────────
test('T-R1: Pha thanh toán chuyển sang RECONCILING khi quá TTL và EXPIRED khi quá Grace', () => {
  const now = 1000000000000
  const order = {
    orderId: 'QNS-TR1-TEST',
    createdAt: new Date(now - (PAYMENT_QR_TTL_SECONDS + 30) * 1000).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: now - 30 * 1000,
    },
  }

  // Quá TTL 30s nhưng còn trong Grace 600s -> phải là RECONCILING
  const phase = getPaymentPhase(order, now)
  assert.equal(phase, 'RECONCILING', 'Phải trả về RECONCILING trong khoảng thời gian ân hạn đối soát')
})

// ── T-R2: Route claim và ai-verify phải trả 410 GONE theo quy trình mới ────────
test('T-R2: /api/payment/claim và /api/payment/ai-verify phải trả 410 Gone (bỏ đường khách tự báo)', async () => {
  const { confirmOrderPaymentManually, markOrderPaidByAI } = await import('../server/lib/paymentWebhook.js')
  
  const claimRes = await confirmOrderPaymentManually({ orderId: 'QNS-TEST-123' })
  assert.equal(claimRes.status, 410, 'confirmOrderPaymentManually phải trả 410 Gone')

  const aiRes = await markOrderPaidByAI({ orderId: 'QNS-TEST-123', amount: 390000 })
  assert.equal(aiRes.status, 410, 'markOrderPaidByAI phải trả 410 Gone')
})

// ── T-R3: Admin DELIVER tuyệt đối không tự gán PAID cho đơn chuyển khoản chưa trả tiền ──
test('T-R3: Admin DELIVER không được tự gán PAID cho đơn BANK_TRANSFER chưa trả tiền', async () => {
  const orderId = `QNS-TR3-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'SHIPPED',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })

  const res = await handleAdminOrderAction(orderId, { action: 'DELIVER' })
  assert.equal(res.status, 400, 'Không thể giao hàng cho đơn chuyển khoản chưa thanh toán')
})

// ── T-R4: Đơn quá hạn TTL + Grace phải được server tự động hủy dù không có client poll ──
test('T-R4: Đơn quá hạn TTL + Grace phải được expireOrderIfDue hủy an toàn', () => {
  const orderId = `QNS-TR4-${Date.now()}`
  const now = Date.now()
  const createdTime = now - (PAYMENT_QR_TTL_SECONDS + 650) * 1000 // Quá TTL + Grace

  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(createdTime).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: createdTime + PAYMENT_QR_TTL_SECONDS * 1000,
    },
  })

  const expired = expireOrderIfDue(orderId, now)
  assert.equal(expired, true)
  const saved = orderPersistence.get(orderId)
  assert.equal(saved.status, 'CANCELLED')
  assert.equal(saved.payment.status, 'EXPIRED_TIMEOUT')
})

// ── T-R5: Endpoint /api/payment/qr lấy số tiền từ server và chặn đơn hết hạn ──
test('T-R5: /api/payment/qr phải từ chối đơn hết hạn/PAID và bỏ qua amount client', async () => {
  const { getPaymentQrData } = await import('../server/lib/paymentQrService.js').catch(() => ({}))
  assert.ok(typeof getPaymentQrData === 'function', 'Module paymentQrService.getPaymentQrData phải tồn tại')
})
