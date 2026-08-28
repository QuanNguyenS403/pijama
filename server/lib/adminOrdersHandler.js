// server/lib/adminOrdersHandler.js
import { orderPersistence } from './orderPersistence.js'
import { searchOrdersFromSheet, updateOrderStatusInSheet } from './googleSheets.js'
import { sendConfirmedEmail, sendShippedEmail, sendCancelledEmail } from './emailStatusUpdates.js'
import { broadcastOrderUpdate } from './orderEvents.js'

export const VALID_TRANSITIONS = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['DELIVERED'],
  DELIVERED:        [],
  CANCELLED:        [],
}

/**
 * Format order to uniform Admin structure
 */
export function formatAdminOrder(order) {
  if (!order) return null
  const id = order.orderId || order.id || order.orderNumber
  const paymentMethod = order.payment?.method || order.paymentMethod || 'COD'

  // Default: BANK_TRANSFER -> PAID, COD -> UNPAID unless explicitly toggled
  let paymentStatus = order.payment?.status || order.paymentStatus
  if (!paymentStatus) {
    paymentStatus = paymentMethod === 'BANK_TRANSFER' ? 'PAID' : 'UNPAID'
  }

  // Ensure fixed createdAt timestamp never jumps
  const fixedCreatedAt = order.createdAt || order.orderDate || (order.raw && order.raw.createdAt) || '2026-08-26T00:00:00.000Z'

  return {
    id,
    orderNumber: id,
    orderId: id,
    customerName: order.customer?.fullName || order.customerName || 'Khách hàng',
    customerPhone: order.customer?.phone || order.customerPhone || '',
    customerEmail: order.customer?.email || order.customerEmail || '',
    shippingAddress: order.shipping?.fullAddress || order.shippingAddress || '',
    shipping: order.shipping || {},
    customer: order.customer || {},
    customerNote: order.customerNote || order.note || '',
    adminNote: order.adminNote || '',
    items: (order.items || []).map((item, idx) => ({
      id: item.id || idx,
      productName: item.productName || item.product?.name || item.name || 'Bộ Pijama Thiết Kế',
      colorLabel: item.color || item.colorLabel || item.variant || '',
      size: item.size || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice || item.price) || 0,
      totalPrice: Number(item.totalPrice) || ((Number(item.unitPrice || item.price) || 0) * (Number(item.quantity) || 1)),
      image: item.image || '',
    })),
    subtotal: Number(order.subtotal) || 0,
    shippingFee: Number(order.shippingFee) || 0,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    paymentMethod,
    paymentStatus,
    status: order.status || 'PENDING',
    trackingNumber: order.trackingCode || order.trackingNumber || '',
    trackingCode: order.trackingCode || order.trackingNumber || '',
    carrier: order.carrier || 'GHN',
    note: order.note || '',
    cancelReason: order.cancelReason || '',
    cancelledAt: order.cancelledAt || null,
    createdAt: fixedCreatedAt,
    orderDateVN: order.orderDateVN || '',
    raw: order,
  }
}

/**
 * Get Admin order detail by ID
 */
export async function getAdminOrderDetail(orderId) {
  if (!orderId) return null
  let order = orderPersistence.get(orderId)
  if (!order) {
    try {
      const sheetOrders = await searchOrdersFromSheet(orderId)
      order = sheetOrders.find((o) => (o.orderId || o.id) === orderId) || null
    } catch (e) {
      // Ignore
    }
  }
  return order ? formatAdminOrder(order) : null
}

/**
 * Xử lý đồng bộ hàng loạt đơn hàng tối ưu:
 * 1. Đọc nhanh từ orderPersistence (RAM/Disk)
 * 2. Nếu có đơn chưa có trong bộ nhớ, chỉ gọi Google Sheets duy nhất 1 lần (qua Cache) cho toàn bộ missing IDs
 * 3. Tự động cập nhật vào persistence
 */
export async function handleSyncBatchOrders(orderIds = []) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { success: true, orders: [] }
  }

  const cleanIds = Array.from(new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))).slice(0, 50)
  if (cleanIds.length === 0) {
    return { success: true, orders: [] }
  }

  const resultOrders = []
  const missingIds = []

  for (const id of cleanIds) {
    const localOrder = orderPersistence.get(id)
    if (localOrder) {
      resultOrders.push(formatAdminOrder(localOrder))
    } else {
      missingIds.push(id)
    }
  }

  if (missingIds.length > 0) {
    try {
      const { searchOrdersByIdsFromSheet } = await import('./googleSheets.js')
      const sheetOrders = await searchOrdersByIdsFromSheet(missingIds)
      for (const order of sheetOrders) {
        if (order && (order.orderId || order.id)) {
          const formatted = formatAdminOrder(order)
          resultOrders.push(formatted)
        }
      }
    } catch (err) {
      console.warn('handleSyncBatchOrders sheet lookup error:', err.message)
    }
  }

  return {
    success: true,
    orders: resultOrders,
  }
}

/**
 * Fetch and filter orders for Admin
 */
export async function getAdminOrders(params = {}) {
  const {
    page = 1,
    limit = 20,
    status = '',
    payment = '',
    search = '',
    date = '',
    from = '',
    to = '',
  } = params

  // 1. Get all local orders
  const localOrders = orderPersistence.getAll()
  const ordersMap = new Map()

  localOrders.forEach((o) => {
    if (o && (o.orderId || o.id)) {
      ordersMap.set(o.orderId || o.id, o)
    }
  })

  // 2. Fetch from Google Sheets if needed
  try {
    const sheetOrders = await searchOrdersFromSheet('')
    if (Array.isArray(sheetOrders)) {
      sheetOrders.forEach((o) => {
        if (o && (o.orderId || o.id) && !ordersMap.has(o.orderId || o.id)) {
          ordersMap.set(o.orderId || o.id, o)
        }
      })
    }
  } catch (err) {
    // Ignore Google Sheets fetch errors in admin list
  }

  let list = Array.from(ordersMap.values()).map(formatAdminOrder)

  // Sort newest first: newest order appears at the top
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Apply filters
  if (status) {
    list = list.filter((o) => o.status === status)
  }

  if (payment) {
    list = list.filter((o) => o.paymentMethod === payment)
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      (o) =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.orderId || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').toLowerCase().includes(q) ||
        (o.customerEmail || '').toLowerCase().includes(q)
    )
  }

  if (date) {
    // date in YYYY-MM-DD format
    list = list.filter((o) => {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : ''
      return d === date
    })
  }

  if (from) {
    list = list.filter((o) => {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : ''
      return d >= from
    })
  }

  if (to) {
    list = list.filter((o) => {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : ''
      return d <= to
    })
  }

  const total = list.length
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const pageSize = Math.max(1, parseInt(limit, 10) || 20)
  const startIndex = (pageNum - 1) * pageSize
  const paginatedOrders = list.slice(startIndex, startIndex + pageSize)

  return {
    success: true,
    orders: paginatedOrders,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

/**
 * Handle Admin order actions (CONFIRM, PROCESSING, SHIP, DELIVER, CANCEL, TOGGLE_PAYMENT, NOTE)
 */
export async function handleAdminOrderAction(orderId, payload = {}) {
  if (!orderId) {
    return { status: 400, data: { success: false, error: 'Thiếu mã đơn hàng' } }
  }

  let order = orderPersistence.get(orderId)

  if (!order) {
    try {
      const sheetOrders = await searchOrdersFromSheet(orderId)
      order = sheetOrders.find((o) => (o.orderId || o.id) === orderId) || null
    } catch (e) {
      // Ignore
    }
  }

  if (!order) {
    return { status: 404, data: { success: false, error: 'Không tìm thấy đơn hàng trong hệ thống' } }
  }

  const { action, note, trackingNumber, carrier = 'GHN', reason } = payload

  // 1. Action NOTE
  if (action === 'NOTE') {
    order.adminNote = note || ''
    order.updatedAt = new Date().toISOString()
    orderPersistence.set(orderId, order)
    const formatted = formatAdminOrder(order)
    broadcastOrderUpdate(formatted)
    return {
      status: 200,
      data: {
        success: true,
        message: '📝 Ghi chú đã được lưu thành công!',
        order: formatted,
      },
    }
  }

  // 2. Action TOGGLE_PAYMENT
  if (action === 'TOGGLE_PAYMENT') {
    if (!order.payment) order.payment = {}
    const defaultMethod = order.payment.method || order.paymentMethod || 'COD'
    const current = order.payment.status || (defaultMethod === 'BANK_TRANSFER' ? 'PAID' : 'UNPAID')
    const nextStatus = current === 'PAID' ? 'UNPAID' : 'PAID'
    order.payment.status = nextStatus
    order.paymentStatus = nextStatus
    order.updatedAt = new Date().toISOString()
    orderPersistence.set(orderId, order)
    const formatted = formatAdminOrder(order)
    broadcastOrderUpdate(formatted)
    return {
      status: 200,
      data: {
        success: true,
        message: `💳 Đã đổi trạng thái thanh toán thành "${nextStatus === 'PAID' ? 'Đã TT' : 'Chưa TT'}"`,
        order: formatted,
      },
    }
  }

  // 3. Status transition mapping
  const actionToStatus = {
    CONFIRM:    'CONFIRMED',
    PROCESSING: 'PROCESSING',
    SHIP:       'SHIPPED',
    DELIVER:    'DELIVERED',
    CANCEL:     'CANCELLED',
  }

  const newStatus = actionToStatus[action]
  if (!newStatus) {
    return { status: 400, data: { success: false, error: `Hành động không hợp lệ: ${action}` } }
  }

  const currentStatus = order.status || 'PENDING'
  const allowed = VALID_TRANSITIONS[currentStatus] || []

  // Check valid transition
  if (!allowed.includes(newStatus)) {
    return {
      status: 400,
      data: {
        success: false,
        error: `Không thể chuyển trạng thái từ "${currentStatus}" sang "${newStatus}"`,
      },
    }
  }

  if (action === 'CANCEL' && (!reason || reason.trim().length < 5)) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Vui lòng nhập lý do hủy đơn (tối thiểu 5 ký tự)',
      },
    }
  }

  // Apply updates
  order.status = newStatus
  if (note) order.adminNote = note

  if (action === 'SHIP') {
    order.trackingCode = trackingNumber || ''
    order.trackingNumber = trackingNumber || ''
    order.carrier = carrier || 'GHN'
  }

  if (action === 'DELIVER') {
    if (!order.payment) order.payment = {}
    order.payment.status = 'PAID'
    order.paymentStatus = 'PAID'
  }

  if (action === 'CANCEL') {
    order.cancelReason = reason || 'Admin hủy đơn'
    order.cancelledAt = new Date().toISOString()
  }

  order.updatedAt = new Date().toISOString()
  orderPersistence.set(orderId, order)

  const formattedOrder = formatAdminOrder(order)
  // Phát sự kiện realtime đến tất cả các tab khách hàng đang mở
  broadcastOrderUpdate(formattedOrder)

  // Asynchronous Notification & Sheet Sync (Non-blocking errors)
  Promise.allSettled([
    action === 'CONFIRM' ? sendConfirmedEmail(order) : Promise.resolve(),
    action === 'SHIP' ? sendShippedEmail(order, { trackingNumber: order.trackingCode || order.trackingNumber }) : Promise.resolve(),
    action === 'CANCEL' ? sendCancelledEmail(order, { reason: order.cancelReason }) : Promise.resolve(),
    updateOrderStatusInSheet(
      orderId,
      newStatus,
      reason || note || '',
      order.trackingCode || order.trackingNumber || '',
      order.carrier || ''
    ),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`⚠️ Admin order action notify step ${i} failed:`, r.reason?.message)
      }
    })
  })

  const messages = {
    CONFIRM: '✅ Đơn hàng đã được xác nhận thành công & gửi email cho khách!',
    PROCESSING: '📦 Đơn hàng đã chuyển sang khâu đóng gói!',
    SHIP: '🚚 Đơn hàng đã bàn giao cho đơn vị vận chuyển & gửi mã bưu tá!',
    DELIVER: '🎉 Đơn hàng đã giao thành công & hoàn tất!',
    CANCEL: '❌ Đơn hàng đã được hủy & gửi thông báo cho khách!',
  }

  return {
    status: 200,
    data: {
      success: true,
      message: messages[action] || `Đã cập nhật đơn hàng #${orderId} thành công!`,
      order: formattedOrder,
    },
  }
}

// Alias for compatibility
export const performOrderAction = handleAdminOrderAction
