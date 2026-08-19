import { appendOrderToSheet } from './lib/googleSheets.js'
import { sendCustomerEmail } from './lib/emailCustomer.js'
import { sendOwnerEmail } from './lib/emailOwner.js'

/**
 * Controller xử lý submit đơn hàng:
 * 1. Validate payload
 * 2. Ghi Google Sheets + Gửi email khách + Gửi email chủ shop SONG SONG (Promise.allSettled)
 * 3. Trả về kết quả
 */
export async function handleOrderSubmit(order) {
  // Validate tối thiểu
  if (!order || !order.orderId || !order.customer?.email || !order.items?.length) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Dữ liệu đơn hàng không hợp lệ (thiếu mã đơn, email hoặc sản phẩm)',
      },
    }
  }

  console.log(`\n📦 [ORDER AUTOMATION] Đang xử lý đơn hàng: ${order.orderId}`)
  console.log(`👤 Khách hàng: ${order.customer?.fullName} (${order.customer?.phone} | ${order.customer?.email})`)
  console.log(`💰 Tổng tiền: ${order.total}đ | Phương thức: ${order.payment?.methodLabel || order.payment?.method}`)

  // Chạy SONG SONG 3 tác vụ không blocking nhau
  const tasks = [
    appendOrderToSheet(order).catch((err) => {
      console.warn('⚠️ Ghi Google Sheets lỗi/chưa cấu hình:', err.message)
      return { status: 'rejected', reason: err.message }
    }),
    sendCustomerEmail(order).catch((err) => {
      console.warn('⚠️ Gửi email khách lỗi/chưa cấu hình:', err.message)
      return { status: 'rejected', reason: err.message }
    }),
    sendOwnerEmail(order).catch((err) => {
      console.warn('⚠️ Gửi email chủ shop lỗi/chưa cấu hình:', err.message)
      return { status: 'rejected', reason: err.message }
    }),
  ]

  const results = await Promise.allSettled(tasks)

  const [sheetResult, customerEmailResult, ownerEmailResult] = results
  console.log(`📊 Kết quả tự động hóa cho đơn ${order.orderId}:`)
  console.log(`  - Google Sheets : ${sheetResult.status === 'fulfilled' ? '✅ Thành công' : '⚠️ ' + (sheetResult.reason || 'Bỏ qua')}`)
  console.log(`  - Email Khách   : ${customerEmailResult.status === 'fulfilled' ? '✅ Đã gửi' : '⚠️ ' + (customerEmailResult.reason || 'Bỏ qua')}`)
  console.log(`  - Email Chủ Shop: ${ownerEmailResult.status === 'fulfilled' ? '✅ Đã gửi' : '⚠️ ' + (ownerEmailResult.reason || 'Bỏ qua')}`)

  return {
    status: 200,
    data: {
      success: true,
      orderId: order.orderId,
      message: 'Đơn hàng đã được ghi nhận thành công',
      details: {
        sheet: sheetResult.status,
        customerEmail: customerEmailResult.status,
        ownerEmail: ownerEmailResult.status,
      },
    },
  }
}
