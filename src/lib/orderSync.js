// src/lib/orderSync.js
// Quản lý đồng bộ trạng thái đơn hàng thời gian thực giữa Admin và Khách hàng
// NGUYÊN TẮC BẢO MẬT: Tuyệt đối không tự ý xóa nội dung đơn hàng (sản phẩm, giá tiền, địa chỉ) khi đơn hoàn tất hoặc nhận hàng thành công.

export const ACTIVE_ORDERS_KEY = 'pijama_orders'
export const PERMANENT_ORDERS_KEY = 'pijama_orders_archive'

let eventSourceInstance = null
let broadcastChannelInstance = null
let isInitialized = false

/**
 * Lấy toàn bộ danh sách đơn hàng đã lưu với cơ chế tự phục hồi từ kho lưu trữ vĩnh viễn
 */
export function getSavedOrders() {
  if (typeof window === 'undefined') return []
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_ORDERS_KEY) || '[]')
    const archive = JSON.parse(localStorage.getItem(PERMANENT_ORDERS_KEY) || '[]')

    const map = new Map()

    // 1. Nạp từ kho lưu trữ vĩnh viễn (đặc biệt là các đơn DELIVERED)
    if (Array.isArray(archive)) {
      archive.forEach((o) => {
        const id = o?.orderId || o?.id
        if (id) map.set(id, o)
      })
    }

    // 2. Nạp và đối chiếu với active orders
    if (Array.isArray(active)) {
      active.forEach((o) => {
        const id = o?.orderId || o?.id
        if (id) {
          const existing = map.get(id)
          if (existing) {
            // Bảo toàn items: Không để danh sách sản phẩm bị rỗng
            const items = (Array.isArray(o.items) && o.items.length > 0)
              ? o.items
              : (Array.isArray(existing.items) && existing.items.length > 0 ? existing.items : [])
            map.set(id, { ...existing, ...o, items })
          } else {
            map.set(id, o)
          }
        }
      })
    }

    const mergedList = Array.from(map.values())
    // Sắp xếp đơn mới nhất lên đầu
    mergedList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    return mergedList
  } catch (err) {
    console.error('Lỗi khi đọc danh sách đơn hàng đã lưu:', err)
    return []
  }
}

/**
 * Cập nhật đơn hàng cục bộ vào localStorage và sessionStorage
 * Đảm bảo khi khách hàng nhận hàng thành công (DELIVERED), toàn bộ nội dung đơn hàng KHÔNG BAO GIỜ bị xóa
 * @param {object} updatedOrder Dữ liệu đơn hàng mới nhất từ Server hoặc Admin
 */
export function applyOrderUpdateLocally(updatedOrder) {
  if (!updatedOrder) return null
  const orderId = updatedOrder.orderId || updatedOrder.id
  if (!orderId) return null

  try {
    // 1. Đọc kho lưu trữ hiện tại
    const stored = getSavedOrders()
    let foundIndex = stored.findIndex((o) => (o.orderId || o.id) === orderId)
    const existing = foundIndex >= 0 ? stored[foundIndex] : null

    // 2. Bảo tồn tuyệt đối nội dung đơn hàng (Items, Customer, Shipping, Totals)
    // ĐẶC BIỆT KHI KHÁCH NHẬN HÀNG THÀNH CÔNG (DELIVERED), KHÔNG BAO GIỜ ĐƯỢC XÓA SẢN PHẨM HOẶC BỎ TRỐNG
    const preservedItems = (Array.isArray(updatedOrder.items) && updatedOrder.items.length > 0)
      ? updatedOrder.items
      : (Array.isArray(existing?.items) && existing.items.length > 0 ? existing.items : [])

    const preservedCustomer = {
      ...(existing?.customer || {}),
      ...(updatedOrder.customer || {}),
      fullName: updatedOrder.customer?.fullName || updatedOrder.customerName || existing?.customer?.fullName || existing?.customerName || '',
      phone: updatedOrder.customer?.phone || updatedOrder.customerPhone || existing?.customer?.phone || existing?.customerPhone || '',
      email: updatedOrder.customer?.email || updatedOrder.customerEmail || existing?.customer?.email || existing?.customerEmail || '',
    }

    const preservedShipping = {
      ...(existing?.shipping || {}),
      ...(updatedOrder.shipping || {}),
      fullAddress: updatedOrder.shipping?.fullAddress || updatedOrder.shippingAddress || existing?.shipping?.fullAddress || existing?.shippingAddress || '',
      carrier: updatedOrder.carrier || updatedOrder.shipping?.carrier || existing?.carrier || existing?.shipping?.carrier || 'Viettel Post',
    }

    const finalStatus = updatedOrder.status || existing?.status || 'PENDING'
    const isDelivered = finalStatus === 'DELIVERED'

    const mergedOrder = {
      ...(existing || {}),
      ...updatedOrder,
      items: preservedItems,
      customer: preservedCustomer,
      shipping: preservedShipping,
      status: finalStatus,
      isDelivered: isDelivered || Boolean(existing?.isDelivered),
      deliveredAt: isDelivered ? (updatedOrder.deliveredAt || existing?.deliveredAt || new Date().toISOString()) : existing?.deliveredAt,
      // Đánh dấu cờ bảo vệ vĩnh viễn không được xóa
      isPermanentRetention: true,
      subtotal: updatedOrder.subtotal ?? existing?.subtotal ?? 0,
      total: updatedOrder.total ?? existing?.total ?? 0,
      discount: updatedOrder.discount ?? existing?.discount ?? 0,
      shippingFee: updatedOrder.shippingFee ?? existing?.shippingFee ?? 0,
      orderDateVN: updatedOrder.orderDateVN || existing?.orderDateVN || '',
      createdAt: updatedOrder.createdAt || existing?.createdAt || new Date().toISOString(),
      trackingCode: updatedOrder.trackingCode || updatedOrder.trackingNumber || existing?.trackingCode || existing?.trackingNumber || '',
      trackingNumber: updatedOrder.trackingCode || updatedOrder.trackingNumber || existing?.trackingCode || existing?.trackingNumber || '',
      carrier: updatedOrder.carrier || existing?.carrier || 'Viettel Post',
      paymentStatus: updatedOrder.paymentStatus || existing?.paymentStatus || (isDelivered ? 'PAID' : undefined),
      payment: {
        ...(existing?.payment || {}),
        ...(updatedOrder.payment || {}),
        status: updatedOrder.paymentStatus || updatedOrder.payment?.status || (isDelivered ? 'PAID' : existing?.payment?.status),
      },
      cancelReason: updatedOrder.cancelReason || existing?.cancelReason || '',
      adminNote: updatedOrder.adminNote || existing?.adminNote || '',
      updatedAt: updatedOrder.updatedAt || new Date().toISOString(),
    }

    if (foundIndex >= 0) {
      stored[foundIndex] = mergedOrder
    } else {
      stored.unshift(mergedOrder)
    }

    // 3. Ghi an toàn vào localStorage (cả ACTIVE và ARCHIVE vĩnh viễn)
    // Không cắt bỏ đơn hàng đã giao thành công
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(stored))

    // Cập nhật kho vĩnh viễn PERMANENT_ORDERS_KEY
    try {
      const archive = JSON.parse(localStorage.getItem(PERMANENT_ORDERS_KEY) || '[]')
      const aIdx = archive.findIndex((o) => (o.orderId || o.id) === orderId)
      if (aIdx >= 0) {
        archive[aIdx] = mergedOrder
      } else {
        archive.unshift(mergedOrder)
      }
      localStorage.setItem(PERMANENT_ORDERS_KEY, JSON.stringify(archive))
    } catch (archiveErr) {
      console.warn('Lỗi ghi vào kho vĩnh viễn:', archiveErr)
    }

    // 4. Cập nhật sessionStorage nếu đúng đơn hàng vừa xem
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

    // 5. Bắn CustomEvent để React components tự re-render ngay lập tức
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
  let sseRetryTimer = null
  let sseErrorCount = 0

  const connectSSE = () => {
    try {
      if (eventSourceInstance) {
        eventSourceInstance.close()
        eventSourceInstance = null
      }

      eventSourceInstance = new EventSource('/api/orders/events')

      eventSourceInstance.onopen = () => {
        sseErrorCount = 0
      }

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
        sseErrorCount++
        // Khi backend chưa chạy, ngắt SSE và thử lại sau 30 giây thay vì để trình duyệt retry liên tục mỗi 3 giây
        if (sseErrorCount >= 2) {
          if (eventSourceInstance) {
            eventSourceInstance.close()
            eventSourceInstance = null
          }
          if (sseRetryTimer) clearTimeout(sseRetryTimer)
          sseRetryTimer = setTimeout(() => {
            sseErrorCount = 0
            connectSSE()
          }, 30000)
        }
      }
    } catch (sseErr) {
      console.warn('Không thể kết nối SSE:', sseErr.message)
    }
  }

  connectSSE()

  // 3. Đồng bộ một lần có kiểm soát throttle khi mở ứng dụng
  try {
    const localOrders = getSavedOrders()
    const ids = localOrders.map((o) => o.orderId || o.id).filter(Boolean)
    if (ids.length > 0) {
      syncBatchOrders(ids, { force: false })
    }
  } catch (e) {}
}
