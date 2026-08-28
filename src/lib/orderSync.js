// src/lib/orderSync.js
// Quản lý đồng bộ trạng thái đơn hàng thời gian thực giữa Admin và Khách hàng

let eventSourceInstance = null
let broadcastChannelInstance = null
let isInitialized = false

/**
 * Cập nhật đơn hàng cục bộ vào localStorage và sessionStorage
 * @param {object} updatedOrder Dữ liệu đơn hàng mới nhất từ Server hoặc Admin
 */
export function applyOrderUpdateLocally(updatedOrder) {
  if (!updatedOrder) return null
  const orderId = updatedOrder.orderId || updatedOrder.id
  if (!orderId) return null

  try {
    // 1. Cập nhật mảng pijama_orders trong localStorage
    const stored = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
    let foundIndex = stored.findIndex((o) => (o.orderId || o.id) === orderId)

    let mergedOrder = updatedOrder
    if (foundIndex >= 0) {
      // Merge giữ lại các thông tin chi tiết của client nếu server trả về tóm tắt
      const existing = stored[foundIndex]
      mergedOrder = {
        ...existing,
        ...updatedOrder,
        status: updatedOrder.status || existing.status,
        trackingCode: updatedOrder.trackingCode || updatedOrder.trackingNumber || existing.trackingCode || existing.trackingNumber || '',
        trackingNumber: updatedOrder.trackingCode || updatedOrder.trackingNumber || existing.trackingCode || existing.trackingNumber || '',
        carrier: updatedOrder.carrier || existing.carrier || 'GHN',
        paymentStatus: updatedOrder.paymentStatus || existing.paymentStatus,
        payment: {
          ...(existing.payment || {}),
          ...(updatedOrder.payment || {}),
          status: updatedOrder.paymentStatus || updatedOrder.payment?.status || existing.payment?.status,
        },
        cancelReason: updatedOrder.cancelReason || existing.cancelReason || '',
        adminNote: updatedOrder.adminNote || existing.adminNote || '',
        updatedAt: updatedOrder.updatedAt || new Date().toISOString(),
      }
      stored[foundIndex] = mergedOrder
    } else {
      stored.unshift(updatedOrder)
    }

    localStorage.setItem('pijama_orders', JSON.stringify(stored.slice(0, 50)))

    // 2. Cập nhật sessionStorage nếu đúng đơn hàng vừa xem
    try {
      const latestOrder = JSON.parse(sessionStorage.getItem('latest_order') || 'null')
      if (latestOrder && (latestOrder.orderId || latestOrder.id) === orderId) {
        sessionStorage.setItem('latest_order', JSON.stringify(mergedOrder))
      }

      const specificOrder = JSON.parse(sessionStorage.getItem(`last_order_${orderId}`) || 'null')
      if (specificOrder) {
        sessionStorage.setItem(`last_order_${orderId}`, JSON.stringify(mergedOrder))
      }
    } catch (e) {
      // Bỏ qua lỗi sessionStorage
    }

    // 3. Bắn CustomEvent để React components tự re-render ngay lập tức
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated', { detail: mergedOrder }))
    }

    return mergedOrder
  } catch (err) {
    console.error('Lỗi khi áp dụng cập nhật đơn hàng cục bộ:', err)
    return null
  }
}

/**
 * Phát sự kiện đồng bộ qua BroadcastChannel cho các tab khác trong cùng trình duyệt
 */
export function broadcastOrderUpdateClient(order) {
  if (!order) return
  applyOrderUpdateLocally(order)

  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (!broadcastChannelInstance) {
        broadcastChannelInstance = new BroadcastChannel('pijama_order_sync')
      }
      broadcastChannelInstance.postMessage({ type: 'ORDER_UPDATED', order })
    }
  } catch (e) {
    console.warn('Lỗi BroadcastChannel:', e)
  }
}

// Throttling: Giãn cách tối thiểu giữa các lần auto-sync nền là 5 phút
const BATCH_SYNC_THROTTLE_MS = 5 * 60 * 1000
let lastBatchSyncTime = 0

/**
 * Gửi yêu cầu kiểm tra và đồng bộ trạng thái mới nhất cho danh sách mã đơn hàng
 * @param {Array<string>} orderIds Danh sách mã đơn
 * @param {object} options Cấu hình (force: ép buộc đồng bộ không qua throttle)
 */
export async function syncBatchOrders(orderIds, { force = false } = {}) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return []

  const now = Date.now()
  if (!force && now - lastBatchSyncTime < BATCH_SYNC_THROTTLE_MS) {
    // Đã đồng bộ gần đây, tránh gọi lại lặp đi lặp lại
    return []
  }

  try {
    const cleanIds = Array.from(new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))).slice(0, 50)
    if (cleanIds.length === 0) return []

    const res = await fetch('/api/orders/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: cleanIds }),
    })

    if (!res.ok) return []
    const data = await res.json()

    lastBatchSyncTime = Date.now()

    if (data.success && Array.isArray(data.orders)) {
      data.orders.forEach((order) => {
        applyOrderUpdateLocally(order)
      })
      return data.orders
    }
  } catch (err) {
    console.warn('Không thể đồng bộ hàng loạt đơn hàng:', err.message)
  }
  return []
}

/**
 * Khởi tạo listener thời gian thực toàn ứng dụng (SSE + BroadcastChannel + Storage)
 */
export function initOrderSync() {
  if (typeof window === 'undefined' || isInitialized) return

  isInitialized = true

  // 1. Lắng nghe BroadcastChannel đa tab
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannelInstance = new BroadcastChannel('pijama_order_sync')
      broadcastChannelInstance.onmessage = (event) => {
        if (event.data?.type === 'ORDER_UPDATED' && event.data?.order) {
          applyOrderUpdateLocally(event.data.order)
        }
      }
    }
  } catch (err) {
    console.warn('Không thể khởi tạo BroadcastChannel:', err)
  }

  // 2. Kết nối Server-Sent Events (SSE) để nhận sự kiện real-time tức thì từ Admin
  const connectSSE = () => {
    try {
      if (eventSourceInstance) {
        eventSourceInstance.close()
      }

      eventSourceInstance = new EventSource('/api/orders/events')

      eventSourceInstance.addEventListener('order_updated', (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload?.order) {
            applyOrderUpdateLocally(payload.order)
          }
        } catch (parseErr) {
          console.warn('Lỗi parse SSE order_updated:', parseErr)
        }
      })

      eventSourceInstance.onerror = () => {
        // EventSource tự động reconnect theo retry time
      }
    } catch (sseErr) {
      console.warn('Không thể kết nối SSE:', sseErr.message)
    }
  }

  connectSSE()

  // 3. Đồng bộ một lần có kiểm soát throttle khi mở ứng dụng
  try {
    const localOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
    const ids = localOrders.map((o) => o.orderId || o.id).filter(Boolean)
    if (ids.length > 0) {
      syncBatchOrders(ids, { force: false })
    }
  } catch (e) {}
}
