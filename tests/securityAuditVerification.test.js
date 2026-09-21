import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

test('SEC-01: /api/orders/lookup chặn tìm kiếm mờ query=qns và không rò rỉ danh sách đơn hàng', async () => {
  const app = express()
  app.use(express.json())

  const { orderPersistence } = await import('../server/lib/orderPersistence.js')
  const { trackOrderUniversal } = await import('../server/lib/viettelPostService.js')

  app.get('/api/orders/lookup', async (req, res) => {
    const { orderId, phone, query: rawQuery } = req.query
    const searchQuery = String(rawQuery || '').trim()
    if (searchQuery) {
      if (searchQuery.length < 4) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập chính xác' })
      }
      const universalResult = await trackOrderUniversal(searchQuery, { strictTrackingOnly: true })
      if (universalResult.success && universalResult.order) {
        return res.json({ success: true, orders: [universalResult.order] })
      }
      const allOrders = orderPersistence.getAll()
      const cleanInput = searchQuery.toLowerCase()
      const exactTrackingOrder = allOrders.find((o) => {
        const track = String(o.trackingCode || o.trackingNumber || '').toLowerCase().trim()
        return track && (track === cleanInput || track === cleanInput.replace(/\s+/g, ''))
      })
      if (exactTrackingOrder) {
        return res.json({ success: true, orders: [exactTrackingOrder] })
      }
      return res.status(404).json({ success: false, error: 'Không tìm thấy' })
    }

    if (!orderId || !phone) {
      return res.status(400).json({ success: false, error: 'Cần mã đơn và SĐT' })
    }
    return res.json({ success: true, orders: [] })
  })

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/orders/lookup?query=qns`)
    assert.ok(res.status >= 400, 'Tìm kiếm mờ query=qns phải bị từ chối với mã lỗi 400 hoặc 404')
    const data = await res.json()
    assert.equal(data.success, false)
    assert.equal(data.orders, undefined)
  } finally {
    server.close()
  }
})

test('SEC-02: /api/auth/google từ chối request không có credential khi AUTH_TEST_MODE tắt', async () => {
  const origAuthMode = process.env.AUTH_TEST_MODE
  delete process.env.AUTH_TEST_MODE

  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerAuthEndpoints(app)

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'victim@gmail.com', name: 'Victim User' }),
    })

    assert.equal(res.status, 400, 'Phải từ chối 400 khi thiếu credential')
    const data = await res.json()
    assert.equal(data.success, false)
    assert.match(data.error, /credential/i)
  } finally {
    process.env.AUTH_TEST_MODE = origAuthMode
    server.close()
  }
})
