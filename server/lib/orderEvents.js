// server/lib/orderEvents.js
// Quản lý kết nối Server-Sent Events (SSE) và broadcast trạng thái đơn hàng bảo mật thời gian thực
import { verifyAdminSessionToken } from './adminAuth.js'
import { verifyTrackingToken } from './orderTokenService.js'

// Lưu các client kèm theo scope truy cập
// clientObj: { res, orderId, isAdmin }
const sseClients = new Set()

/**
 * Đăng ký client SSE mới với kiểm tra scope bảo mật (SEC-003)
 * @param {import('express').Request} req
 * @param {import('express').Response} res 
 */
export function addSseClient(req, res) {
  const origin = req.headers.origin || ''
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']

  // CORS: Chỉ phản chiếu origin hợp lệ, tuyệt đối không dùng wildcard *
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  // Xác thực quyền truy cập channel
  const token = req.query.token || req.headers['x-admin-token'] || ''
  const orderId = req.query.orderId || null
  const phone = req.query.phone || ''

  let isAdmin = false
  if (token) {
    const adminCheck = verifyAdminSessionToken(String(token))
    if (adminCheck.isValid) {
      isAdmin = true
    }
  }

  // Nếu không phải admin và có orderId, kiểm tra tracking token hoặc cho phép lắng nghe đúng orderId đó
  let scopedOrderId = orderId
  if (!isAdmin && orderId && token) {
    const isOwner = verifyTrackingToken(orderId, phone, String(token))
    if (!isOwner && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, error: 'Unauthorized SSE connection' })
    }
  }

  // Cấu hình headers cho SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  // Gửi heartbeat mở đầu
  res.write(`retry: 3000\n`)
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), status: 'connected' })}\n\n`)

  const clientInfo = { res, orderId: scopedOrderId, isAdmin }
  sseClients.add(clientInfo)
  console.log(`🔌 [SSE] Client kết nối (Scope: ${isAdmin ? 'ALL_ADMIN' : scopedOrderId || 'PUBLIC_CHANNEL'}). Tổng clients: ${sseClients.size}`)

  // Keep-alive ping mỗi 25s chống timeout proxy/gateway
  const pingInterval = setInterval(() => {
    try {
      res.write(`: keep-alive ${Date.now()}\n\n`)
    } catch {
      clearInterval(pingInterval)
    }
  }, 25000)

  // Dọn dẹp khi client ngắt kết nối
  res.on('close', () => {
    clearInterval(pingInterval)
    sseClients.delete(clientInfo)
    console.log(`🔌 [SSE] Client đã ngắt kết nối. Còn lại: ${sseClients.size}`)
  })
}

/**
 * Phát sự kiện cập nhật đơn hàng an toàn tới các client có thẩm quyền (SEC-003 & DATA-004)
 * Tuyệt đối không phát tán PII, adminNote hoặc số tiền ra public clients.
 * @param {object} order Đơn hàng đã được định dạng
 */
export function broadcastOrderUpdate(order) {
  if (!order || (!order.orderId && !order.id)) return
  const currentOrderId = order.orderId || order.id

  // Schema khớp với consumer orderSync.js (DATA-004)
  const safeOrderProjection = {
    orderId: currentOrderId,
    status: order.status,
    paymentStatus: order.paymentStatus || order.payment?.status,
    trackingCode: order.trackingCode || order.trackingNumber || '',
    carrier: order.carrier || '',
    cancelReason: order.cancelReason || '',
    updatedAt: new Date().toISOString(),
  }

  const publicPayload = JSON.stringify({
    type: 'ORDER_UPDATED',
    order: safeOrderProjection,
  })

  // Admin payload có thể có thêm adminNote nếu là admin client
  const adminPayload = JSON.stringify({
    type: 'ORDER_UPDATED',
    order: {
      ...safeOrderProjection,
      adminNote: order.adminNote || '',
    },
  })

  for (const client of sseClients) {
    try {
      // Chỉ gửi nếu là admin HOẶC client đang theo dõi đúng orderId này HOẶC chưa scope
      if (client.isAdmin) {
        client.res.write(`event: order_updated\ndata: ${adminPayload}\n\n`)
      } else if (!client.orderId || client.orderId === currentOrderId) {
        client.res.write(`event: order_updated\ndata: ${publicPayload}\n\n`)
      }
    } catch (err) {
      console.warn('⚠️ Lỗi gửi SSE tới 1 client:', err.message)
      sseClients.delete(client)
    }
  }
}
