/**
 * Service gửi thông tin đơn hàng lên Backend API
 */
export async function submitOrder(orderPayload) {
  try {
    const response = await fetch('/api/orders/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(orderPayload),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      // If server returned an explicit error
      throw new Error(data.error || data.message || 'Lỗi xử lý đơn hàng từ máy chủ')
    }

    const enrichedOrder = {
      ...orderPayload,
      ...(data.trackingToken ? { trackingToken: data.trackingToken } : {}),
    }

    // Persist to local storage for instant customer history view
    try {
      const storedOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      const filtered = storedOrders.filter((o) => (o.orderId || o.id) !== enrichedOrder.orderId)
      filtered.unshift(enrichedOrder)
      localStorage.setItem('pijama_orders', JSON.stringify(filtered))

      // Bảo vệ vĩnh viễn trong kho lưu trữ archive
      try {
        const archive = JSON.parse(localStorage.getItem('pijama_orders_archive') || '[]')
        const filteredArchive = archive.filter((o) => (o.orderId || o.id) !== enrichedOrder.orderId)
        filteredArchive.unshift(enrichedOrder)
        localStorage.setItem('pijama_orders_archive', JSON.stringify(filteredArchive))
      } catch (archErr) {
        console.warn('Lỗi lưu kho vĩnh viễn:', archErr)
      }

      sessionStorage.setItem(`last_order_${enrichedOrder.orderId}`, JSON.stringify(enrichedOrder))
      sessionStorage.setItem('latest_order', JSON.stringify(enrichedOrder))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('orders_updated'))
      }
    } catch (e) {
      console.error('LocalStorage write error', e)
    }

    return {
      success: true,
      orderId: data.orderId || orderPayload.orderId,
      trackingToken: data.trackingToken || orderPayload.trackingToken || '',
      message: data.message || 'Đơn hàng đã được ghi nhận thành công',
      order: enrichedOrder,
    }
  } catch (error) {
    console.warn('Backend API submission failed:', error.message)

    return {
      success: false,
      orderId: orderPayload.orderId,
      error: error.message || 'Không thể kết nối đến máy chủ xử lý đơn hàng.',
      message: error.message || 'Không thể kết nối đến máy chủ xử lý đơn hàng. Vui lòng thử lại hoặc gọi Hotline 0973 486 218.',
      order: null,
      isOfflineFallback: false,
    }
  }
}

