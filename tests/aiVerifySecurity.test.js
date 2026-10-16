import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { parseAndMatchTransactionAI } from '../server/lib/aiNapasQrService.js'
import { markOrderPaidByAI } from '../server/lib/paymentWebhook.js'

test('SEC-03 / L-2: POST /api/payment/ai-verify tuyệt đối không tự ý đổi đơn sang PAID hoặc CONFIRMED khi nhận SMS tự nhập', async () => {
  const testOrderId = `QNS-TEST-AIVERIFY-${Date.now()}`
  const initialOrder = {
    orderId: testOrderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
    },
    customer: {
      fullName: 'Khách Test AI',
      email: 'khachtest@gmail.com',
      phone: '0981753082',
    },
  }

  orderPersistence.set(testOrderId, initialOrder)

  const app = express()
  app.use(express.json())

  // Định nghĩa route mô phỏng server/index.js
  app.post('/api/payment/ai-verify', async (req, res) => {
    const { rawText, orderId } = req.body
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'Thiếu nội dung tin nhắn giao dịch' })
    }

    const order = orderId ? orderPersistence.get(orderId) : null
    const matchResult = parseAndMatchTransactionAI(rawText, order)

    const confirmResult = await markOrderPaidByAI({
      orderId,
      amount: matchResult.parsed?.extractedAmount,
      refNumber: matchResult.parsed?.refNumber,
      rawText,
    })

    return res.status(confirmResult.status).json({
      ...confirmResult.data,
      aiAnalysis: matchResult,
    })
  })

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  try {
    const fakeSms = `VCB: +390,000VND vao TK 1050773506. ND: ${testOrderId}. REF: FAKE-REF-99999`
    const res = await fetch(`http://127.0.0.1:${port}/api/payment/ai-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: fakeSms,
        orderId: testOrderId,
      }),
    })

    const data = await res.json()

    // 1. Phản hồi API không được trả về status: 'PAID'
    assert.notEqual(data.status, 'PAID', 'L-2: ai-verify không được tự xác nhận status PAID')

    // 2. Trạng thái trong database/persistence không được chuyển thành CONFIRMED hoặc PAID
    const savedOrder = orderPersistence.get(testOrderId)
    assert.notEqual(savedOrder.status, 'CONFIRMED', 'L-2: Đơn hàng không được chuyển thành CONFIRMED')
    assert.notEqual(savedOrder.payment?.status, 'PAID', 'L-2: Trạng thái thanh toán không được chuyển thành PAID')
  } finally {
    server.close()
  }
})
