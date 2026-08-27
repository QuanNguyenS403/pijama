// server/lib/orderEvents.js
// Quản lý kết nối Server-Sent Events (SSE) và broadcast trạng thái đơn hàng thời gian thực

const sseClients = new Set()

/**
 * Đăng ký client SSE mới
 * @param {import('express').Response} res 
 */
export function addSseClient(res) {
  // Cấu hình headers cho SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  })

  // Gửi heartbeat mở đầu
  res.write(`retry: 3000\n`)
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), status: 'connected' })}\n\n`)

  sseClients.add(res)
  console.log(`🔌 [SSE] Client kết nối nhận biến động đơn hàng. Tổng clients: ${sseClients.size}`)

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
    sseClients.delete(res)
    console.log(`🔌 [SSE] Client đã ngắt kết nối. Còn lại: ${sseClients.size}`)
  })
}

/**
 * Phát sự kiện cập nhật đơn hàng tới tất cả clients đang kết nối
 * @param {object} order Đơn hàng đã được định dạng
 */
export function broadcastOrderUpdate(order) {
  if (!order || (!order.orderId && !order.id)) return

  const payload = JSON.stringify({
    orderId: order.orderId || order.id,
    status: order.status,
    paymentStatus: order.paymentStatus || order.payment?.status,
    trackingCode: order.trackingCode || order.trackingNumber || '',
    carrier: order.carrier || '',
    cancelReason: order.cancelReason || '',
    adminNote: order.adminNote || '',
    order,
    updatedAt: new Date().toISOString(),
  })

  console.log(`📢 [SSE] Phát broadcast cập nhật đơn #${order.orderId || order.id} -> Trạng thái: ${order.status}`)

  for (const client of sseClients) {
    try {
      client.write(`event: order_updated\ndata: ${payload}\n\n`)
    } catch (err) {
      console.warn('⚠️ Lỗi gửi SSE tới 1 client:', err.message)
      sseClients.delete(client)
    }
  }
}
