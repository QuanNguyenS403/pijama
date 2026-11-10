// server/lib/orderEvents.js
// Quản lý kết nối Server-Sent Events (SSE) và broadcast trạng thái đơn hàng bảo mật thời gian thực
import { verifyAdminSessionToken } from './adminAuth.js'
import { verifyTrackingToken } from './orderTokenService.js'
import { orderPersistence } from './orderPersistence.js'

// Lưu các client kèm theo scope truy cập
// clientObj: { res, orderId, isAdmin, ip }
const sseClients = new Set()
const ipConnectionCount = new Map()
const MAX_SSE_GLOBAL = 100
const MAX_SSE_PER_IP = 5

/**
 * Đăng ký client SSE mới với kiểm tra scope bảo mật (SEC-003 & P2-API-5)
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

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown'
  const currentIpCount = ipConnectionCount.get(clientIp) || 0

  if (sseClients.size >= MAX_SSE_GLOBAL) {
    return res.status(503).json({ success: false, error: 'Máy chủ tạm thời bận, số lượng kết nối SSE đã đạt giới hạn tối đa.' })
  }
  if (currentIpCount >= MAX_SSE_PER_IP) {
    return res.status(429).json({ success: false, error: 'Quá nhiều kết nối SSE đồng thời từ địa chỉ IP của bạn.' })
  }

  // Xác thực quyền truy cập channel
  const authHeader = req.headers['authorization'] || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const adminHeaderToken = req.headers['x-admin-token'] ? String(req.headers['x-admin-token']).trim() : ''
  const queryToken = req.query.token ? String(req.query.token).trim() : ''

  // Admin token ưu tiên từ header để tránh lộ trong access log
  const adminCandidate = adminHeaderToken || bearerToken || (process.env.NODE_ENV !== 'production' ? queryToken : '')
  let isAdmin = false
  if (adminCandidate) {
    const adminCheck = verifyAdminSessionToken(adminCandidate)
    if (adminCheck.isValid) {
      isAdmin = true
    }
  }

  const orderId = req.query.orderId ? String(req.query.orderId).trim() : null
  const phone = req.query.phone ? String(req.query.phone).trim() : ''
  const clientToken = queryToken || bearerToken

  // Khách hàng thường bắt buộc phải có orderId và tracking token hợp lệ
  if (!isAdmin) {
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Yêu cầu cung cấp orderId để lắng nghe trạng thái đơn hàng.' })
    }
    if (!clientToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Yêu cầu tracking token để kết nối SSE.', code: 'TOKEN_REQUIRED' })
    }
    let isOwner = false
    try {
      const existingOrder = orderPersistence.get(orderId)
      const orderPhone = existingOrder?.customer?.phone || existingOrder?.customerPhone || ''
      isOwner = existingOrder
        ? verifyTrackingToken(orderId, orderPhone, clientToken)
        : verifyTrackingToken(orderId, phone, clientToken)
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Hệ thống xác thực đơn hàng chưa sẵn sàng.' })
    }
    if (!isOwner) {
      return res.status(401).json({ success: false, error: 'Unauthorized SSE connection: Tracking token không hợp lệ.', code: 'INVALID_TOKEN' })
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

  const clientInfo = { res, orderId: isAdmin ? null : orderId, isAdmin, ip: clientIp }
  sseClients.add(clientInfo)
  ipConnectionCount.set(clientIp, currentIpCount + 1)
  console.log(`🔌 [SSE] Client kết nối (Scope: ${isAdmin ? 'ALL_ADMIN' : orderId}). Tổng clients: ${sseClients.size}`)

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
    const count = ipConnectionCount.get(clientIp) || 1
    if (count <= 1) {
      ipConnectionCount.delete(clientIp)
    } else {
      ipConnectionCount.set(clientIp, count - 1)
    }
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
      } else if (client.orderId && client.orderId === currentOrderId) {
        client.res.write(`event: order_updated\ndata: ${publicPayload}\n\n`)
      }
    } catch (err) {
      console.warn('⚠️ Lỗi gửi SSE tới 1 client:', err.message)
      sseClients.delete(client)
    }
  }
}
