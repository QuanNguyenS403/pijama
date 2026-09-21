import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { handleOrderSubmit } from './apiHandler.js'
import { initializeSheet } from './lib/googleSheets.js'
import { verifyTransporter } from './lib/emailConfig.js'
import { generateVietQRQuickLink, generateSePayQR } from './lib/paymentQrService.js'
import { handlePaymentWebhook, getOrderPaymentStatus } from './lib/paymentWebhook.js'
import { createRateLimiter } from './lib/rateLimiter.js'
import { addSseClient } from './lib/orderEvents.js'
import { verifyAdminLogin, adminLoginLimiter, requireAdminAuth } from './lib/adminAuth.js'
import { registerAuthEndpoints } from './lib/authEndpoints.js'
import { verifyTrackingToken } from './lib/orderTokenService.js'
import { normalizeVietnamesePhone } from './lib/smsService.js'
import { customerSessionMiddleware } from './lib/customerSessionMiddleware.js'
import { releaseVoucher } from './lib/voucherValidator.js'
import { calculateShippingDistance } from './lib/distanceService.js'
import { trackOrderUniversal, queryViettelPostTracking } from './lib/viettelPostService.js'

// Load environment variables from .env or .env.local
dotenv.config({ path: '.env.local' })
dotenv.config() // Fallback to .env

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ── P0-5: Cấu hình CORS chặt chẽ ───────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (ví dụ mobile app, curl, server-to-server webhook)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true)
      }
      return callback(new Error('Chặn bởi chính sách bảo mật CORS của QuanNguyenS'))
    },
    credentials: true,
  })
)

app.use(express.json())
app.use(customerSessionMiddleware)

// ── P0-5: Rate Limiters cho từng nhóm API nhạy cảm ─────────────
const submitOrderLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 15, // Tối đa 15 đơn hàng / 15 phút / IP
  message: 'Bạn đã đặt đơn quá nhiều lần liên tiếp. Vui lòng chờ ít phút hoặc gọi hotline 0981 753 082.',
})

const generateQrLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Yêu cầu tạo mã QR quá nhanh. Vui lòng thử lại sau giây lát.',
})

const lookupLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Yêu cầu tra cứu quá thường xuyên. Vui lòng thử lại sau 1 phút.',
})

// Readiness & Liveness Tracking
let isServerReady = false
let sheetStatus = { ready: false, error: null }
let emailStatus = { ready: false, error: null }

// Liveness check endpoint
app.get('/livez', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() })
})

// Readiness check endpoint
app.get('/readyz', (req, res) => {
  if (!isServerReady) {
    return res.status(503).json({
      status: 'not_ready',
      sheet: sheetStatus,
      email: emailStatus,
      timestamp: new Date().toISOString(),
    })
  }
  return res.status(200).json({
    status: 'ready',
    sheet: sheetStatus,
    email: emailStatus,
    timestamp: new Date().toISOString(),
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ready: isServerReady,
    service: 'QuanNguyenS Order & Payment Server',
    sheet: sheetStatus,
    email: emailStatus,
    timestamp: new Date().toISOString(),
  })
})

// ── 0. Chẩn đoán trạng thái kết nối Gmail độc lập ─────────────
app.get('/api/health/email', async (req, res) => {
  try {
    const result = await verifyTransporter()
    if (result && result.success) {
      return res.json({
        emailReady: true,
        user: (process.env.GMAIL_USER || '').trim() || null,
        ownerEmail: (process.env.OWNER_EMAIL || '').trim() || null,
        message: 'Kết nối SMTP Gmail sẵn sàng hoạt động!',
      })
    } else {
      return res.status(500).json({
        emailReady: false,
        error: result?.error || 'Không thể kết nối tới Gmail SMTP',
        user: (process.env.GMAIL_USER || '').trim() || null,
        ownerEmail: (process.env.OWNER_EMAIL || '').trim() || null,
        instructions: [
          '1. Vào Google Account kiểm tra "Xác minh 2 bước" (2FA) đang BẬT',
          '2. Tạo App Password mới 16 ký tự tại https://myaccount.google.com/apppasswords',
          '3. Cập nhật GMAIL_APP_PASSWORD trong file .env.local (viết liền không dấu cách)',
          '4. Chạy lệnh `node test-email.js` trên terminal để kiểm tra trực tiếp',
        ],
      })
    }
  } catch (err) {
    return res.status(500).json({
      emailReady: false,
      error: err.message,
    })
  }
})

// ── 1. API Tạo Mã QR Thanh Toán Động (VietQR / SePay) ──────────
app.post('/api/payment/generate-qr', generateQrLimiter, (req, res) => {
  try {
    const { amount, description, bankCode, accountNumber, accountName, provider = 'VietQR' } = req.body
    if (!amount) {
      return res.status(400).json({ success: false, error: 'Thiếu số tiền thanh toán (amount)' })
    }

    if (provider === 'SePay') {
      const result = generateSePayQR({ amount, description, accountNumber, bankName: bankCode || 'Vietcombank' })
      return res.json(result)
    }

    const result = generateVietQRQuickLink({
      amount,
      description,
      bankCode: bankCode || 'VCB',
      accountNumber: accountNumber || '1050773506',
      accountName: accountName || 'NGUYEN DUC QUAN',
    })
    return res.json(result)
  } catch (err) {
    console.error('Error generating QR:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 2. Webhook Lắng Nghe Biến Động Số Dư (SePay / Bank) ───────
app.post('/api/payment/webhook', async (req, res) => {
  const result = await handlePaymentWebhook(req)
  return res.status(result.status).json(result.data)
})

// ── 3. API Polling Trạng Thái Thanh Toán ─────────────────────
app.get('/api/orders/status', (req, res) => {
  const { orderId } = req.query
  const result = getOrderPaymentStatus(orderId)
  return res.json(result)
})

// ── 4. API Xác Nhận Thanh Toán & Kích Hoạt Gmail (Admin Only - G-13) ─────────────
app.post('/api/payment/confirm', requireAdminAuth, submitOrderLimiter, async (req, res) => {
  const { confirmOrderPaymentManually } = await import('./lib/paymentWebhook.js')
  const result = await confirmOrderPaymentManually(req.body)
  return res.status(result.status).json(result.data)
})

// ── 5. Xử lý Đơn Hàng ─────────────────────────────────────────
const orderSubmitHandler = async (req, res) => {
  try {
    const result = await handleOrderSubmit(req.body, {
      customerAccount: req.customerAccount,
      fromHttpRequest: true,
    })
    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('Server error on /api/orders/submit:', error)
    return res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi xử lý đơn hàng. Vui lòng liên hệ: 0981 753 082',
    })
  }
}
app.post('/api/orders/submit', submitOrderLimiter, orderSubmitHandler)
app.post('/api/orders', submitOrderLimiter, orderSubmitHandler)

// ── 6. Tra Cứu Thông Tin Vận Đơn (Tracking API) — SEC-002 / G-04 ─────────────
app.get('/api/orders/tracking', async (req, res) => {
  try {
    const { orderId, token, phone } = req.query
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' })
    }

    const { orderPersistence } = await import('./lib/orderPersistence.js')
    const { searchOrdersFromSheet } = await import('./lib/googleSheets.js')
    
    let order = orderPersistence.get(orderId)

    if (!order) {
      const sheetOrders = await searchOrdersFromSheet(orderId)
      order = sheetOrders.find((o) => o.orderId === orderId) || null
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
    }

    // G-04: Xác thực quyền sở hữu (Proof of Ownership)
    const customerPhone = order.customer?.phone || ''
    const cleanCustomerPhone = normalizeVietnamesePhone(customerPhone)
    const cleanInputPhone = normalizeVietnamesePhone(phone || '')

    let isAuthorized = false
    if (token && verifyTrackingToken(orderId, customerPhone, String(token))) {
      isAuthorized = true
    } else if (cleanInputPhone && (cleanInputPhone === cleanCustomerPhone || cleanCustomerPhone.endsWith(cleanInputPhone))) {
      isAuthorized = true
    }

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Cần trackingToken hoặc số điện thoại người nhận để tra cứu thông tin đơn',
        code: 'OWNERSHIP_PROOF_REQUIRED',
      })
    }

    const carrier = order.carrier || 'Viettel Post'
    const trackingCode = order.trackingCode || null
    let trackingUrl = null

    if (trackingCode) {
      if (carrier === 'VIETTEL' || carrier.includes('Viettel') || carrier === 'VIETTEL_POST') {
        trackingUrl = `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang/?order_number=${trackingCode}`
      } else if (carrier === 'GHN' || carrier.includes('Giao Hàng Nhanh')) {
        trackingUrl = `https://tracking.ghn.vn/?order_code=${trackingCode}`
      } else if (carrier === 'GHTK' || carrier.includes('Tiết Kiệm')) {
        trackingUrl = `https://i.ghtk.vn/${trackingCode}`
      } else if (carrier === 'SPX' || carrier.includes('Shopee')) {
        trackingUrl = `https://spx.vn/track?bill_no=${trackingCode}`
      } else {
        trackingUrl = `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang/?order_number=${trackingCode}`
      }
    }

    // G-04: Chỉ trả về projection an toàn, TUYỆT ĐỐI không trả PII, email, địa chỉ, adminNote
    return res.json({
      success: true,
      orderId: order.orderId,
      status: order.status || 'PENDING',
      paymentStatus: order.payment?.status || 'AWAITING_PAYMENT',
      carrier,
      trackingCode,
      trackingUrl,
      total: order.total,
      itemsCount: Array.isArray(order.items) ? order.items.length : 1,
      orderDate: order.orderDate || order.createdAt,
    })
  } catch (err) {
    console.error('Tracking API error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// Helper định dạng nội dung đơn hàng cho khách tra cứu (hỗ trợ che giấu PII an toàn)
function maskFullName(name) {
  if (!name) return 'Khách hàng'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return `${parts[0].slice(0, 1)}***`
  return `${parts[0]} ${parts.slice(1).map((p) => `${p[0]}***`).join(' ')}`
}

function maskPhone(phone) {
  if (!phone) return ''
  const clean = String(phone).replace(/[^0-9]/g, '')
  if (clean.length < 7) return phone
  return `${clean.slice(0, 3)}***${clean.slice(-3)}`
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [user, domain] = email.split('@')
  const maskedUser = user.length <= 3 ? `${user[0]}***` : `${user.slice(0, 2)}***${user.slice(-1)}`
  return `${maskedUser}@${domain}`
}

function maskAddress(addr) {
  if (!addr) return ''
  const parts = String(addr).split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 2) return addr
  return `***, ${parts.slice(-2).join(', ')}`
}

function formatCustomerOrderLookup(order, isRedacted = false) {
  if (!order) return null
  const id = order.orderId || order.id || order.orderNumber
  const rawName = order.customer?.fullName || order.customerName || 'Khách hàng'
  const rawPhone = order.customer?.phone || order.customerPhone || ''
  const rawEmail = order.customer?.email || order.customerEmail || ''
  const rawAddress = order.shipping?.fullAddress || order.shippingAddress || ''

  return {
    orderId: id,
    id,
    status: order.status || 'PENDING',
    isDelivered: order.status === 'DELIVERED',
    deliveredAt: order.deliveredAt || (order.status === 'DELIVERED' ? (order.updatedAt || new Date().toISOString()) : null),
    paymentStatus: order.payment?.status || order.paymentStatus || (order.payment?.method === 'BANK_TRANSFER' ? 'PAID' : 'UNPAID'),
    payment: order.payment || {
      method: order.paymentMethod || 'COD',
      status: order.paymentStatus || 'UNPAID',
    },
    items: (order.items || []).map((item, idx) => ({
      id: item.id || idx,
      productName: item.productName || item.product?.name || item.name || 'Bộ Pijama Thiết Kế',
      color: item.color || item.colorLabel || item.variant || '',
      variant: item.variant || item.color || '',
      size: item.size || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice || item.price) || 0,
      totalPrice: Number(item.totalPrice) || ((Number(item.unitPrice || item.price) || 0) * (Number(item.quantity) || 1)),
      image: item.image || '',
    })),
    customer: {
      fullName: isRedacted ? maskFullName(rawName) : rawName,
      phone: isRedacted ? maskPhone(rawPhone) : rawPhone,
      email: isRedacted ? maskEmail(rawEmail) : rawEmail,
    },
    shipping: {
      fullAddress: isRedacted ? maskAddress(rawAddress) : rawAddress,
      carrier: order.carrier || 'Viettel Post',
    },
    subtotal: Number(order.subtotal) || 0,
    shippingFee: Number(order.shippingFee) || 0,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    carrier: order.carrier || 'Viettel Post',
    trackingCode: order.trackingCode || order.trackingNumber || '',
    createdAt: order.createdAt || order.orderDate || '',
    orderDateVN: order.orderDateVN || '',
    cancelReason: order.cancelReason || '',
  }
}

// ── 7. Tra Cứu Đơn Hàng & Theo Dõi Hành Trình Viettel Post — SEC-002 / G-05 ───────
app.get('/api/orders/lookup', lookupLimiter, async (req, res) => {
  try {
    const { orderId, phone, query: rawQuery } = req.query
    const { orderPersistence } = await import('./lib/orderPersistence.js')
    const { searchOrdersFromSheet } = await import('./lib/googleSheets.js')

    // 1. Trường hợp tìm bằng ô tra cứu đơn năng (query)
    const searchQuery = String(rawQuery || '').trim()
    if (searchQuery) {
      if (searchQuery.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng nhập chính xác Mã vận đơn Viettel Post hoặc Mã đơn hàng kèm Số điện thoại.',
        })
      }

      // 1.1 Thử tra cứu hành trình Viettel Post theo chính xác mã tracking
      const universalResult = await trackOrderUniversal(searchQuery, { strictTrackingOnly: true })
      if (universalResult.success && universalResult.order) {
        return res.json({
          success: true,
          orders: [formatCustomerOrderLookup(universalResult.order, true)],
          tracking: universalResult,
        })
      }

      // 1.2 Tìm trong bộ nhớ persistence theo CHÍNH XÁC mã vận đơn trackingCode
      const allOrders = orderPersistence.getAll()
      const cleanInput = searchQuery.toLowerCase()

      const exactTrackingOrder = allOrders.find((o) => {
        const track = String(o.trackingCode || o.trackingNumber || '').toLowerCase().trim()
        return track && (track === cleanInput || track === cleanInput.replace(/\s+/g, ''))
      })

      if (exactTrackingOrder) {
        return res.json({
          success: true,
          orders: [formatCustomerOrderLookup(exactTrackingOrder, true)],
        })
      }

      // 1.3 Nếu không phải trackingCode chính xác: CHẶN tìm kiếm mờ (includes) để chống rò rỉ PII
      return res.status(404).json({
        success: false,
        error: 'Mã vận đơn này chưa được cấp hoặc không khớp với đơn hàng nào. Để tra cứu theo mã đơn hàng, vui lòng cung cấp thêm số điện thoại đặt hàng.',
      })
    }

    // 2. Trường hợp tìm truyền thống bằng cả orderId và phone (yêu cầu Proof of Ownership)
    if (!orderId || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ cả Mã đơn hàng và Số điện thoại đặt hàng để tra cứu',
      })
    }

    const cleanInputPhone = normalizeVietnamesePhone(phone)
    if (!cleanInputPhone || cleanInputPhone.length < 9) {
      return res.status(400).json({ success: false, error: 'Số điện thoại tra cứu không hợp lệ' })
    }

    let order = orderPersistence.get(orderId)
    if (!order) {
      const sheetOrders = await searchOrdersFromSheet(orderId)
      order = sheetOrders.find((o) => o.orderId === orderId) || null
    }

    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng phù hợp' })
    }

    const cleanCustomerPhone = normalizeVietnamesePhone(order.customer?.phone || '')
    if (cleanCustomerPhone !== cleanInputPhone && !cleanCustomerPhone.endsWith(cleanInputPhone)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng phù hợp' })
    }

    // Khách hàng đã chứng minh sở hữu (nhập đúng cả mã đơn và SĐT) -> Trả về dữ liệu đơn hàng
    return res.json({
      success: true,
      orders: [formatCustomerOrderLookup(order, false)],
    })
  } catch (err) {
    console.error('Order lookup error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 7.01 API Kiểm Tra Cự Ly & Điều Kiện Ship COD (Bán Kính 30km từ Amber Riverside) ──
const checkCodHandler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body }
    const { address = '', ward = '', district = '', city = 'Hà Nội' } = params
    const result = await calculateShippingDistance({ address, ward, district, city })
    const responseData = {
      ...result,
      codAllowed: result.isCodAllowed,
      fallbackMethod: result.isCodAllowed ? null : 'BANK_TRANSFER',
    }
    return res.json(responseData)
  } catch (err) {
    console.error('Check COD distance error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
app.get('/api/shipping/check-cod', checkCodHandler)
app.post('/api/shipping/check-cod', checkCodHandler)

// ── 7.02 API Theo Dõi Hành Trình Đơn Hàng Trực Tiếp Qua Viettel Post ──
app.get('/api/shipping/viettelpost/track', lookupLimiter, async (req, res) => {
  try {
    const { trackingCode, query, strictTrackingOnly } = req.query
    const targetCode = trackingCode || query
    if (!targetCode) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp chính xác mã vận đơn Viettel Post đã được cấp tại mục "Đơn hàng của bạn".',
      })
    }

    const isStrict = strictTrackingOnly !== 'false'
    const result = await trackOrderUniversal(targetCode, { strictTrackingOnly: isStrict })
    return res.json(result)
  } catch (err) {
    console.error('Viettel Post track API error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 7.1 Server-Sent Events (SSE) Stream Real-time Biến Động Đơn Hàng — SEC-003 / G-07 ──────
app.get('/api/orders/events', (req, res) => {
  addSseClient(req, res)
})

// ── 7.2 API Đồng Bộ Hàng Loạt Trạng Thái Đơn Hàng Của Khách ───────────────
app.post('/api/orders/sync-batch', lookupLimiter, async (req, res) => {
  try {
    const { handleSyncBatchOrders } = await import('./lib/adminOrdersHandler.js')
    const result = await handleSyncBatchOrders(req.body?.orderIds)
    return res.json(result)
  } catch (err) {
    console.error('Sync batch error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 8. Yêu Cầu Hủy Đơn Hàng — SEC-002 / G-06 ──────
app.post('/api/orders/cancel-request', async (req, res) => {
  try {
    const { orderId, token, phone, reason = 'Khách yêu cầu hủy đơn' } = req.body
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' })
    }

    const { orderPersistence } = await import('./lib/orderPersistence.js')
    const order = orderPersistence.get(orderId)

    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
    }

    // G-06: Xác thực quyền hủy đơn
    const customerPhone = order.customer?.phone || ''
    const cleanCustomerPhone = normalizeVietnamesePhone(customerPhone)
    const cleanInputPhone = normalizeVietnamesePhone(phone || '')

    let isAuthorized = false
    if (token && verifyTrackingToken(orderId, customerPhone, String(token))) {
      isAuthorized = true
    } else if (cleanInputPhone && (cleanInputPhone === cleanCustomerPhone || cleanCustomerPhone.endsWith(cleanInputPhone))) {
      isAuthorized = true
    }

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Cần trackingToken hoặc số điện thoại đặt hàng để hủy đơn',
      })
    }

    // G-06: Chỉ cho phép hủy khi ở trạng thái PENDING hoặc AWAITING_PAYMENT
    if (order.status !== 'PENDING' && order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({
        success: false,
        error: `Đơn hàng đang ở trạng thái ${order.status}, không thể hủy tự động. Vui lòng liên hệ hotline 0981 753 082.`,
      })
    }

    order.status = 'CANCELLED'
    order.cancelReason = reason
    order.cancelledAt = new Date().toISOString()
    orderPersistence.set(orderId, order)

    if (order.voucherCode) {
      releaseVoucher(order.voucherCode, orderId)
    }

    const { sendCancelledEmail } = await import('./lib/emailStatusUpdates.js')
    const { updateOrderStatusInSheet } = await import('./lib/googleSheets.js')

    Promise.allSettled([
      sendCancelledEmail(order, { reason }),
      updateOrderStatusInSheet(orderId, 'CANCELLED', reason),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`Cancel-request notify ${i} lỗi:`, r.reason?.message)
      })
    })

    return res.json({
      success: true,
      orderId,
      message: 'Yêu cầu hủy đơn đã được tiếp nhận thành công.',
    })
  } catch (err) {
    console.error('Cancel request error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 9. Quản Lý Đơn Hàng Admin & Xác Thực — SEC-001 / G-01 / G-02 / G-03 ────────────────────────
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const result = verifyAdminLogin(req.body?.password)
  return res.status(result.status).json(result.data)
})

app.get('/api/admin/orders', requireAdminAuth, async (req, res) => {
  try {
    const { getAdminOrders } = await import('./lib/adminOrdersHandler.js')
    const result = await getAdminOrders(req.query)
    return res.json(result)
  } catch (err) {
    console.error('Admin get orders error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/admin/orders/:orderId', requireAdminAuth, async (req, res) => {
  try {
    const { orderId } = req.params
    const { getAdminOrderDetail } = await import('./lib/adminOrdersHandler.js')
    const order = await getAdminOrderDetail(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
    }
    return res.json(order)
  } catch (err) {
    console.error('Admin get order detail error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/admin/orders/:orderId', requireAdminAuth, async (req, res) => {
  try {
    const { orderId } = req.params
    const { handleAdminOrderAction } = await import('./lib/adminOrdersHandler.js')
    const result = await handleAdminOrderAction(orderId, req.body)
    return res.status(result.status).json(result.data)
  } catch (err) {
    console.error('Admin order action error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 9.1 Đồng Bộ Tự Động Hành Trình Viettel Post Cho Admin ─────────────────────────
app.post('/api/admin/orders/sync-viettelpost', requireAdminAuth, async (req, res) => {
  try {
    const { syncAllShippedOrdersWithViettelPost } = await import('./lib/viettelPostService.js')
    const result = await syncAllShippedOrdersWithViettelPost()
    return res.json(result)
  } catch (err) {
    console.error('Admin sync Viettel Post error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/admin/orders/:orderId/sync-viettelpost', requireAdminAuth, async (req, res) => {
  try {
    const { orderId } = req.params
    const { forceDeliver = false } = req.body || {}
    const { syncSingleOrderWithViettelPost } = await import('./lib/viettelPostService.js')
    const result = await syncSingleOrderWithViettelPost(orderId, { forceDeliver })
    return res.json(result)
  } catch (err) {
    console.error('Admin single order sync Viettel Post error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 9.2 Viettel Post Webhook Receiver (Tự động cập nhật khi bưu tá phát thành công) ───
app.post('/api/shipping/viettelpost/webhook', async (req, res) => {
  try {
    const rawAuthHeader = req.headers['authorization'] || req.headers['x-api-key'] || req.query.token || ''
    const expectedSecret = process.env.VIETTELPOST_WEBHOOK_SECRET

    if (expectedSecret) {
      const authHeader = String(rawAuthHeader).replace(/^Bearer\s+/i, '').trim()
      const secretStr = String(expectedSecret).trim()
      let isSecretValid = false
      if (authHeader.length === secretStr.length && secretStr.length > 0) {
        const crypto = await import('crypto')
        isSecretValid = crypto.default.timingSafeEqual(Buffer.from(authHeader), Buffer.from(secretStr))
      }
      if (!isSecretValid) {
        console.warn('⛔ [VIETTEL POST WEBHOOK REJECTED] Sai Secret Token / Unauthorized request')
        return res.status(401).json({ success: false, message: 'Unauthorized webhook request' })
      }
    }

    const payload = req.body || {}
    const trackingCode = String(payload.ORDER_NUMBER || payload.order_number || payload.trackingCode || payload.orderId || '').trim()
    const statusCode = String(payload.ORDER_STATUS || payload.status || payload.STATUS_ID || '')
    const statusName = String(payload.STATUS_NAME || payload.status_name || payload.note || '').toLowerCase()

    console.log(`📦 [VIETTEL POST WEBHOOK] Nhận tín hiệu từ Viettel Post: Mã ${trackingCode} — Trạng thái: ${statusCode} (${statusName})`)

    const isDelivered =
      statusCode === '501' ||
      statusCode === '504' ||
      statusCode === '104' ||
      statusName.includes('thành công') ||
      statusName.includes('đã nhận') ||
      statusName.includes('ký nhận') ||
      statusName.includes('hoàn tất')

    if (trackingCode) {
      const { orderPersistence } = await import('./lib/orderPersistence.js')
      const allOrders = orderPersistence.getAll()
      const matchedOrder = allOrders.find(
        (o) =>
          (o.trackingCode && o.trackingCode.toLowerCase() === trackingCode.toLowerCase()) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase() === trackingCode.toLowerCase()) ||
          (o.orderId && o.orderId.toLowerCase() === trackingCode.toLowerCase())
      )

      if (matchedOrder) {
        if (isDelivered) {
          const { handleAdminOrderAction } = await import('./lib/adminOrdersHandler.js')
          await handleAdminOrderAction(matchedOrder.orderId, {
            action: 'DELIVER',
            note: `Viettel Post Webhook: Đã giao hàng thành công (${statusName || 'Bưu tá đã phát'})`,
          })
          console.log(`✅ [VIETTEL POST WEBHOOK] Đơn #${matchedOrder.orderId} đã tự động chuyển sang DELIVERED!`)
        } else {
          matchedOrder.viettelPostStatus = payload.STATUS_NAME || payload.status_name || 'Đang vận chuyển'
          matchedOrder.viettelPostLastSync = new Date().toISOString()
          orderPersistence.set(matchedOrder.orderId, matchedOrder)
          const { broadcastOrderUpdate } = await import('./lib/orderEvents.js')
          const { formatAdminOrder } = await import('./lib/adminOrdersHandler.js')
          broadcastOrderUpdate(formatAdminOrder(matchedOrder))
        }
      }
    }

    return res.json({ success: true, message: 'Viettel Post Webhook processed successfully' })
  } catch (err) {
    console.error('Viettel Post webhook error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 10. Hệ Thống Tài Khoản Khách Hàng, Voucher & Broadcast ──────
registerAuthEndpoints(app)

// ── P1-2: Phục vụ Frontend SPA trong môi trường Production ─────
const distPath = path.resolve(__dirname, '../dist')
if (process.env.NODE_ENV === 'production') {
  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error('❌ [CRITICAL ERROR] Không tìm thấy thư mục dist/ hoặc dist/index.html!')
    console.error('Vui lòng chạy `npm run build` trước khi chạy `npm start` trong môi trường production.')
    process.exit(1)
  }
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Khởi chạy server
const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`)
  console.log(`🚀 QuanNguyenS Order Server đang chạy tại: http://localhost:${PORT}`)
  console.log(`======================================================`)

  // Kiểm tra Sheet (chế độ degraded an toàn nếu thiếu credentials)
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID) {
      await initializeSheet()
      sheetStatus = { ready: true, error: null }
      console.log('✅ Google Sheets kết nối thành công.')
    } else {
      sheetStatus = { ready: false, error: 'Chưa cấu hình Google Service Account trong .env (đơn hàng lưu tại local disk storage)' }
      console.warn('⚠️ [DEGRADED MODE] Google Service Account chưa được cấu hình. Đơn hàng lưu tại local persistence storage.')
    }
  } catch (sheetErr) {
    sheetStatus = { ready: false, error: sheetErr.message }
    console.warn('⚠️ [DEGRADED MODE] Google Sheets init warning:', sheetErr.message)
  }

  // Kiểm tra Email Transporter
  try {
    const emailRes = await verifyTransporter()
    if (emailRes?.success) {
      emailStatus = { ready: true, error: null }
      console.log('✅ SMTP Email kết nối thành công.')
    } else {
      emailStatus = { ready: false, error: emailRes?.error || 'Chưa cấu hình App Password' }
      console.warn('⚠️ SMTP Email chưa sẵn sàng:', emailRes?.error)
    }
  } catch (emailErr) {
    emailStatus = { ready: false, error: emailErr.message }
    console.warn('⚠️ SMTP Email warning:', emailErr.message)
  }

  isServerReady = true

  // ── Khởi động tiến trình tự động đồng bộ hành trình Viettel Post định kỳ (mỗi 2 phút) ──
  const VIETTEL_SYNC_INTERVAL_MS = 2 * 60 * 1000
  const viettelSyncTimer = setInterval(async () => {
    try {
      const { syncAllShippedOrdersWithViettelPost } = await import('./lib/viettelPostService.js')
      const syncRes = await syncAllShippedOrdersWithViettelPost()
      if (syncRes.deliveredCount > 0) {
        console.log(`🚚 [VIETTEL POST AUTO-SYNC] Đã tự động cập nhật ${syncRes.deliveredCount} đơn hàng sang "Đã giao" (DELIVERED).`)
      }
    } catch (err) {
      console.warn('⚠️ Lỗi chu kỳ đồng bộ Viettel Post:', err.message)
    }
  }, VIETTEL_SYNC_INTERVAL_MS)

  // Chạy đồng bộ lần đầu tiên sau 5 giây khởi động server
  setTimeout(async () => {
    try {
      const { syncAllShippedOrdersWithViettelPost } = await import('./lib/viettelPostService.js')
      await syncAllShippedOrdersWithViettelPost()
    } catch (e) {}
  }, 5000)

  // Lưu reference để cleanup khi shutdown
  server.viettelSyncTimer = viettelSyncTimer
})

// Graceful shutdown (OPS-002)
const shutdown = (signal) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang đóng server an toàn...`)
  isServerReady = false
  if (server.viettelSyncTimer) {
    clearInterval(server.viettelSyncTimer)
  }
  server.close(() => {
    console.log('🔒 Server đã dừng nhận kết nối. Tiến trình kết thúc an toàn.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))


