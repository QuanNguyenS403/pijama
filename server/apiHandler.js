import { appendOrderToSheet } from './lib/googleSheets.js'
import { sendCustomerEmail } from './lib/emailCustomer.js'
import { sendOwnerEmail } from './lib/emailOwner.js'
import { orderPaymentStore } from './lib/paymentWebhook.js'
import { validateOrderPricing } from './lib/pricingValidator.js'
import { validateOrderStock } from './lib/stockValidator.js'

/**
 * Controller xử lý submit đơn hàng:
 * 1. Validate payload cơ bản
 * 2. Validate ĐƠN GIÁ & TỔNG TIỀN độc lập từ catalog server (P0-1)
 * 3. Validate TỒN KHO THỰC TẾ (P0-4)
 * 4. Phân loại luồng theo Phương thức thanh toán:
 *    - COD: Ghi Sheet + Gửi Email xác nhận đặt hàng ngay lập tức.
 *    - BANK_TRANSFER / MOMO: Ghi Sheet ở trạng thái CHỜ THANH TOÁN, Lưu trữ mã QR 1 lần.
 *      TUYỆT ĐỐI CHƯA gửi email xác nhận thanh toán cho đến khi tiền thực sự về tài khoản (qua Webhook có secret).
 */
export async function handleOrderSubmit(order) {
  // 1. Validate tối thiểu
  if (!order || !order.orderId || !order.customer?.email || !order.items?.length) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Dữ liệu đơn hàng không hợp lệ (thiếu mã đơn, email hoặc sản phẩm)',
      },
    }
  }

  // 2. Kiểm tra tính toàn vẹn giá (P0-1)
  const pricingCheck = validateOrderPricing(order)
  if (!pricingCheck.isValid) {
    console.warn(`⛔ [PRICING REJECTED] Đơn hàng ${order.orderId} bị từ chối: ${pricingCheck.error}`)
    return {
      status: 400,
      data: {
        success: false,
        error: pricingCheck.error || 'Giá sản phẩm hoặc tổng tiền không hợp lệ',
      },
    }
  }

  // 3. Kiểm tra tồn kho khả dụng (P0-4)
  const stockCheck = validateOrderStock(order)
  if (!stockCheck.isValid) {
    console.warn(`⛔ [STOCK REJECTED] Đơn hàng ${order.orderId} bị từ chối: ${stockCheck.error}`)
    return {
      status: 400,
      data: {
        success: false,
        error: stockCheck.error || 'Sản phẩm đã hết hàng trong kho',
      },
    }
  }

  const isBankTransfer = order.payment?.method === 'BANK_TRANSFER'
  const now = Date.now()

  // Gán lại các giá trị đã được server xác thực chuẩn xác 100%
  const validatedSummary = pricingCheck.summary
  const createdDate = order.createdAt || new Date().toISOString()
  const orderRecord = {
    ...order,
    items: validatedSummary.items,
    subtotal: validatedSummary.subtotal,
    shippingFee: validatedSummary.shippingFee,
    discount: validatedSummary.discount,
    total: validatedSummary.total,
    status: isBankTransfer ? 'AWAITING_PAYMENT' : 'PENDING',
    payment: {
      ...(order.payment || {}),
      status: isBankTransfer ? 'PAID' : 'UNPAID',
      qrGeneratedAt: now,
      qrExpiresAt: now + 15 * 60 * 1000, // 15 phút hiệu lực
      isQrInvalidated: false,
    },
    createdAt: createdDate,
    orderDate: order.orderDate || createdDate,
    orderDateVN: order.orderDateVN || new Date(createdDate).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
  }

  console.log(`\n📦 [ORDER VALIDATED] Đang tiếp nhận đơn hàng: ${order.orderId}`)
  console.log(`👤 Khách hàng: ${order.customer?.fullName} (${order.customer?.phone} | ${order.customer?.email})`)
  console.log(`💰 Tổng tiền xác thực: ${orderRecord.total}đ (Tạm tính: ${orderRecord.subtotal}đ, Giảm: ${orderRecord.discount}đ, Ship: ${orderRecord.shippingFee}đ) | Phương thức: ${order.payment?.methodLabel || order.payment?.method}`)

  orderPaymentStore.set(order.orderId, orderRecord)

  if (isBankTransfer) {
    // ── LUỒNG CHUYỂN KHOẢN NGÂN HÀNG (VIETQR) ─────────────────
    // 1. Chỉ ghi nhận vào Google Sheets với trạng thái Chờ thanh toán
    // 2. KHÔNG gửi Gmail xác nhận đặt hàng lúc này (chờ tiền vào tài khoản)
    console.log(`⏳ Đơn hàng ${order.orderId} chọn VietQR: Đang chờ khách quét mã thanh toán... (Chưa gửi Gmail xác nhận)`)

    appendOrderToSheet({
      ...orderRecord,
      status: 'CHỜ CHUYỂN KHOẢN (VIETQR)',
    }).catch((err) => {
      console.warn('⚠️ Ghi Google Sheets lỗi/chưa cấu hình:', err.message)
    })

    return {
      status: 200,
      data: {
        success: true,
        orderId: order.orderId,
        status: 'AWAITING_PAYMENT',
        message: 'Đơn hàng đã được khởi tạo. Đang chờ chuyển khoản để kích hoạt email xác nhận.',
        qrExpiresAt: orderRecord.payment.qrExpiresAt,
      },
    }
  } else {
    // ── LUỒNG COD (THANH TOÁN KHI NHẬN HÀNG) ────────────────────
    // Ghi Sheet + Gửi Gmail xác nhận đặt hàng ngay
    const tasks = [
      appendOrderToSheet(orderRecord).catch((err) => {
        console.warn('⚠️ Ghi Google Sheets lỗi:', err.message)
        return { status: 'rejected', reason: err.message }
      }),
      sendCustomerEmail(orderRecord).catch((err) => {
        console.warn('⚠️ Gửi email khách lỗi:', err.message)
        return { status: 'rejected', reason: err.message }
      }),
      sendOwnerEmail(orderRecord).catch((err) => {
        console.warn('⚠️ Gửi email chủ shop lỗi:', err.message)
        return { status: 'rejected', reason: err.message }
      }),
    ]

    const results = await Promise.allSettled(tasks)
    const [sheetResult, customerEmailResult, ownerEmailResult] = results

    console.log(`📊 Kết quả tự động hóa COD cho đơn ${order.orderId}:`)
    console.log(`  - Google Sheets : ${sheetResult.status === 'fulfilled' ? '✅ Thành công' : '⚠️ ' + (sheetResult.reason || 'Bỏ qua')}`)
    console.log(`  - Email Khách   : ${customerEmailResult.status === 'fulfilled' ? '✅ Đã gửi' : '⚠️ ' + (customerEmailResult.reason || 'Bỏ qua')}`)
    console.log(`  - Email Chủ Shop: ${ownerEmailResult.status === 'fulfilled' ? '✅ Đã gửi' : '⚠️ ' + (ownerEmailResult.reason || 'Bỏ qua')}`)

    return {
      status: 200,
      data: {
        success: true,
        orderId: order.orderId,
        status: 'PENDING',
        message: 'Đơn hàng COD đã được xác nhận thành công',
        details: {
          sheet: sheetResult.status,
          customerEmail: customerEmailResult.status,
          ownerEmail: ownerEmailResult.status,
        },
      },
    }
  }
}
