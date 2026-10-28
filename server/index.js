import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { handleOrderSubmit } from './apiHandler.js'
import { initializeSheet } from './lib/googleSheets.js'
import { verifyTransporter } from './lib/emailConfig.js'
import { handlePaymentWebhook, getOrderPaymentStatus } from './lib/paymentWebhook.js'
import { createRateLimiter } from './lib/rateLimiter.js'
import { addSseClient } from './lib/orderEvents.js'
import { verifyAdminLogin, adminLoginLimiter, requireAdminAuth } from './lib/adminAuth.js'
import { registerAuthEndpoints } from './lib/authEndpoints.js'
import { registerReviewEndpoints } from './lib/reviewEndpoints.js'
import { registerLoyaltyEndpoints } from './lib/loyaltyEndpoints.js'
import { verifyTrackingToken } from './lib/orderTokenService.js'
import { normalizeVietnamesePhone } from './lib/smsService.js'
import { customerSessionMiddleware } from './lib/customerSessionMiddleware.js'
import { releaseVoucher } from './lib/voucherValidator.js'
import { calculateShippingDistance } from './lib/distanceService.js'
import { trackOrderUniversal, queryViettelPostTracking } from './lib/viettelPostService.js'
import { validateEnvironment, printEnvReport, loadEnvironment } from './lib/envCheck.js'

// Nạp toàn bộ biến môi trường từ .env / .env.development / .env.local
loadEnvironment()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Hỗ trợ nhận diện đúng IP và giao thức HTTPS phía sau Nginx Reverse Proxy
app.set('trust proxy', 1)

// ── P0-5: Cấu hình CORS chặt chẽ ───────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://quannguyens.com',
      'https://www.quannguyens.com',
      'https://quannguyens.vn',
      'https://www.quannguyens.vn',
    ]

if (process.env.RENDER_EXTERNAL_URL && !allowedOrigins.includes(process.env.RENDER_EXTERNAL_URL)) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL)
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (ví dụ mobile app, curl, server-to-server webhook)
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true)
      }
      return callback(new Error('Chặn bởi chính sách bảo mật CORS của QuanNguyenS'))
    },
    credentials: true,
  })
)

// ── BƯỚC 8: Gia cố an ninh toàn diện với Helmet ───────────────────
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://challenges.cloudflare.com'],
              frameSrc: ["'self'", 'https://accounts.google.com', 'https://challenges.cloudflare.com'],
              connectSrc: [
                "'self'",
                'https://accounts.google.com',
                'https://www.googleapis.com',
                'https://challenges.cloudflare.com',
                'https://graph.facebook.com',
              ],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
  })
)

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf ? buf.toString('utf8') : ''
    },
  })
)
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

// ── 1. API Lấy Mã QR Thanh Toán VietQR Theo Đơn Hàng (WP4 - Server-Authoritative) ──
app.get('/api/payment/qr', async (req, res) => {
  try {
    const { orderId } = req.query
    const { getPaymentQrData } = await import('./lib/paymentQrService.js')
    const result = await getPaymentQrData(orderId)
    if (!result.ok) {
      return res.status(result.status).json({ success: false, error: result.error, code: result.code })
    }
    return res.status(200).json(result.data)
  } catch (err) {
    console.error('Lỗi API /api/payment/qr:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 1b. Endpoints Tạo QR Cũ Đã Ngừng Hoạt Động (B13 / WP4 - Trả 410 Gone) ─────────
app.post('/api/payment/generate-qr', generateQrLimiter, (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'ENDPOINT_DEPRECATED',
    error: 'Endpoint này đã ngừng hoạt động để bảo vệ an toàn giao dịch. Vui lòng sử dụng GET /api/payment/qr?orderId=...',
  })
})

app.get('/api/payment/napas-qr', (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'ENDPOINT_DEPRECATED',
    error: 'Endpoint này đã ngừng hoạt động. Vui lòng sử dụng GET /api/payment/qr?orderId=...',
  })
})

// ── 1c. API Tiếp Nhận Email Biến Động Số Dư (Gmail + Apps Script Bridge - WP3) ──
app.post('/api/payment/bank-email', async (req, res) => {
  try {
    const { verifyBridgeHmac } = await import('./lib/gmailBridgeAuth.js')
    const auth = verifyBridgeHmac(req)
    if (!auth.valid) {
      return res.status(auth.status || 401).json({ success: false, error: auth.error })
    }

    const { recordBridgeHeartbeat } = await import('./lib/bridgeHealth.js')
    recordBridgeHeartbeat()

    const { parseBankEmail } = await import('./lib/bankEmailParser.js')
    const { settleBankTransaction } = await import('./lib/paymentTransactions.js')

    const { runId = `run_${Date.now()}`, sentAt = new Date().toISOString(), emails = [] } = req.body || {}

    // Heartbeat từ Apps Script (Lô rỗng)
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Heartbeat received successfully',
        runId,
        processed: 0,
        settled: 0,
      })
    }

    let settledCount = 0
    const results = []

    for (const emailItem of emails) {
      try {
        const parsed = parseBankEmail(emailItem)
        const settleResult = settleBankTransaction({
          messageId: emailItem.messageId,
          amount: parsed.amount,
          content: parsed.content,
          bankTime: parsed.bankTime,
          bankRef: parsed.bankRef,
          accountLast4: parsed.accountLast4,
          sender: emailItem.from,
          trust: parsed.trust,
          matchedOrderId: parsed.matchedOrderId,
          rawExtracted: parsed,
          receivedAt: emailItem.internalDate ? new Date(Number(emailItem.internalDate) || Date.now()).toISOString() : sentAt,
        })
        if (settleResult.paid) settledCount++
        results.push({ messageId: emailItem.messageId, outcome: settleResult.outcome })
      } catch (itemErr) {
        console.error(`Lỗi xử lý email ${emailItem.messageId}:`, itemErr.message)
        results.push({ messageId: emailItem.messageId, outcome: 'ERROR', error: itemErr.message })
      }
    }

    return res.status(200).json({
      success: true,
      runId,
      processed: emails.length,
      settled: settledCount,
      results,
    })
  } catch (err) {
    console.error('Lỗi tiếp nhận email biến động số dư:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 2. Webhook Lắng Nghe Biến Động Số Dư Phụ (SePay Gateway) ───────────
app.post('/api/payment/webhook', async (req, res) => {
  const result = await handlePaymentWebhook(req)
  return res.status(result.status).json(result.data)
})

// ── 3. API Polling Trạng Thái Thanh Toán (WP6 - Sanitize Contract) ───────────
app.get('/api/orders/status', (req, res) => {
  const { orderId } = req.query
  const result = getOrderPaymentStatus(orderId)
  return res.json(result)
})

// ── 4. API Xác Nhận Thanh Toán Thủ Công Có Lý Do (Admin Only - G-13 / WP9) ───
app.post('/api/payment/confirm', requireAdminAuth, submitOrderLimiter, async (req, res) => {
  const { orderId, reason, note } = req.body || {}
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' })
  }
  const { orderPersistence } = await import('./lib/orderPersistence.js')
  const order = orderPersistence.get(orderId)
  if (!order) {
    return res.status(404).json({ success: false, error: `Không tìm thấy đơn hàng ${orderId}` })
  }
  const adminNote = String(reason || note || '').trim()
  if (!adminNote || adminNote.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng nhập lý do/ghi chú đối soát hợp lệ (tối thiểu 10 ký tự)',
    })
  }

  const { markOrderPaid } = await import('./lib/paymentState.js')
  markOrderPaid(order, {
    source: 'admin',
    actor: 'admin_api',
    note: adminNote,
  })

  return res.status(200).json({
    success: true,
    message: `Đã xác nhận thanh toán đơn hàng ${orderId}`,
    orderId,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
  })
})

// ── 4b. Các Route Khách Báo Chuyển Khoản Thủ Công Bị Vô Hiệu Hóa (WP8 - Trả 410) ─
app.post('/api/payment/claim', (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'CLAIM_DISCONTINUED',
    error: 'Quy trình báo chuyển khoản thủ công đã được thay thế bằng tự động hóa qua email biến động số dư ngân hàng. Hệ thống tự xác nhận khi tiền vào tài khoản.',
  })
})

app.post('/api/payment/ai-verify', (req, res) => {
  return res.status(410).json({
    success: false,
    code: 'AI_VERIFY_DISCONTINUED',
    error: 'Quy trình đối soát SMS thủ công đã ngừng hoạt động. Hệ thống chuyển sang tự động hóa 100% qua email biến động số dư ngân hàng.',
  })
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
    } else if (cleanInputPhone && cleanCustomerPhone && cleanInputPhone.length >= 9 && (cleanInputPhone === cleanCustomerPhone || cleanCustomerPhone.endsWith(cleanInputPhone))) {
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
    paymentStatus: order.payment?.status || order.paymentStatus || (order.payment?.method === 'BANK_TRANSFER' ? 'AWAITING_PAYMENT' : 'UNPAID'),
    payment: order.payment || {
      method: order.paymentMethod || 'COD',
      status: order.paymentStatus || 'UNPAID',
    },
    items: (order.items || []).map((item, idx) => ({
      id: item.id || idx,
      productName: item.productName || item.product?.name || item.name || 'Bộ Sleepwear Thiết Kế',
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
    const errorMsg = process.env.NODE_ENV === 'production' ? 'Đã có lỗi xảy ra khi tra cứu vận đơn.' : err.message
    return res.status(500).json({ success: false, error: errorMsg })
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
    const errorMsg = process.env.NODE_ENV === 'production' ? 'Đã có lỗi xảy ra khi đồng bộ đơn hàng.' : err.message
    return res.status(500).json({ success: false, error: errorMsg })
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
    } else if (cleanInputPhone && cleanCustomerPhone && cleanInputPhone === cleanCustomerPhone) {
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

// ── 9.1c Quản lý Giao Dịch Ngân Hàng Cần Xử Lý (WP8) ──────────────────────────
app.get('/api/admin/bridge-health', requireAdminAuth, async (req, res) => {
  const { getBridgeHealth } = await import('./lib/bridgeHealth.js')
  return res.json({ success: true, health: getBridgeHealth() })
})

app.get('/api/admin/payment-transactions', requireAdminAuth, async (req, res) => {
  try {
    const { getUnresolvedPaymentTransactions } = await import('./lib/paymentTransactions.js')
    const transactions = getUnresolvedPaymentTransactions()
    return res.json({ success: true, transactions })
  } catch (err) {
    console.error('Lỗi lấy giao dịch ngân hàng:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/admin/payment-transactions/:txId/resolve', requireAdminAuth, async (req, res) => {
  try {
    const { txId } = req.params
    const { action, orderId, note } = req.body || {}
    const { resolvePaymentTransaction } = await import('./lib/paymentTransactions.js')

    if (action === 'ASSIGN_ORDER') {
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng để gán' })
      }
      const { assignTransactionToOrder } = await import('./lib/paymentTransactions.js')
      const adminUser = req.adminUser?.username || 'admin'
      const result = await assignTransactionToOrder(txId, orderId, adminUser, note)
      return res.status(result.status).json({ success: result.ok, message: result.message || result.error })
    }

    if (action === 'IGNORE' || action === 'REFUND') {
      const adminUser = req.adminUser?.username || 'admin'
      const resolutionNote = String(note || (action === 'REFUND' ? 'Đã hoàn tiền' : 'Bỏ qua giao dịch')).trim()
      resolvePaymentTransaction(txId, {
        resolvedBy: adminUser,
        resolutionNote,
        outcome: action === 'REFUND' ? 'REFUNDED' : 'IGNORED',
      })
      return res.json({ success: true, message: `Đã cập nhật trạng thái giao dịch ${txId}` })
    }

    return res.status(400).json({ success: false, error: 'Hành động không hợp lệ' })
  } catch (err) {
    console.error('Lỗi xử lý giao dịch ngân hàng:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 9.1b Đồng Bộ Toàn Bộ Dữ Liệu Website Lên Google Sheets (Đơn Hàng, Chi Tiết SP, Chi Tiết SP Pyjama) ──
app.post('/api/admin/sync-sheets', requireAdminAuth, async (req, res) => {
  try {
    const { syncAllToGoogleSheets } = await import('./lib/googleSheets.js')
    const result = await syncAllToGoogleSheets()
    return res.json({ success: true, ...result })
  } catch (err) {
    console.error('Admin sync Google Sheets error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 9.2 Viettel Post Webhook Receiver (Tự động cập nhật khi bưu tá phát thành công) ───
app.post('/api/shipping/viettelpost/webhook', async (req, res) => {
  try {
    const rawAuthHeader = req.headers['authorization'] || req.headers['x-api-key'] || req.query.token || ''
    const expectedSecret = process.env.VIETTELPOST_WEBHOOK_SECRET

    if (!expectedSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('⛔ [VIETTEL POST WEBHOOK REJECTED] VIETTELPOST_WEBHOOK_SECRET chưa được cấu hình ở production')
        return res.status(503).json({ success: false, message: 'Webhook endpoint is disabled until configured' })
      }
    } else {
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

// ── 10.1 Hệ Thống Đánh Giá Sản Phẩm Thật (Real Customer Reviews) ──
registerReviewEndpoints(app)

// ── 10.2 Hệ Thống Ưu Đãi Hội Viên & Điểm Thưởng (Loyalty Program) ──
registerLoyaltyEndpoints(app)

// Phục vụ thư mục ảnh uploads công khai
const publicUploadsPath = path.resolve(__dirname, '../public/uploads')
if (!fs.existsSync(publicUploadsPath)) {
  fs.mkdirSync(publicUploadsPath, { recursive: true })
}
app.use('/uploads', express.static(publicUploadsPath))

// ── 11. Hệ Thống Chatbot Trợ Lý Ảo QuanNguyenS (Chi phí 0đ) ────────
try {
  const { default: chatRouter } = await import('./lib/chat/chatRouter.js')
  app.use('/api/chat', chatRouter)
  console.log('🤖 [CHATBOT] Đã đăng ký các tuyến /api/chat và /api/chat/handoff.')
} catch (chatInitErr) {
  console.warn('⚠️ [CHATBOT WARNING] Không thể nạp chatRouter:', chatInitErr.message)
}

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

// ── Centralized Error Handling Middleware (API-01) ─────────────
app.use((err, req, res, next) => {
  console.error('🚨 [SERVER ERROR]:', err)
  if (res.headersSent) return next(err)
  const status = typeof err.status === 'number' ? err.status : 500
  const isProd = process.env.NODE_ENV === 'production'
  return res.status(status).json({
    success: false,
    error: isProd ? 'Đã có lỗi xảy ra trên hệ thống. Vui lòng liên hệ hotline: 0981 753 082' : (err.message || 'Lỗi máy chủ'),
  })
})

// Kiểm tra toàn vẹn cấu hình môi trường (Fail-Closed)
if (process.env.NODE_ENV !== 'test') {
  const envResults = validateEnvironment(process.env)
  printEnvReport(envResults)
  if (envResults.hasFatalErrors) {
    console.error('🛑 [CRITICAL ERROR] Thiếu biến môi trường bắt buộc ở chế độ Production. Dừng khởi động!')
    process.exit(1)
  }
}

// Khởi chạy server
const server = app.listen(PORT, '0.0.0.0', async () => {
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

  // ── Khởi động Background Job quét đơn hàng quá hạn thanh toán VietQR (WP4) ──
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { sweepExpiredOrders } = await import('./lib/paymentState.js')
      const { expiredCount } = sweepExpiredOrders()
      if (expiredCount > 0) {
        console.log(`🧹 [PAYMENT CLEANUP] Đã tự động dọn dẹp ${expiredCount} đơn hàng chuyển khoản quá hạn lúc khởi động.`)
      }
      const expiryInterval = setInterval(() => {
        try { sweepExpiredOrders() } catch (err) { console.error('Lỗi quét đơn hết hạn:', err.message) }
      }, 30000)
      if (expiryInterval.unref) expiryInterval.unref()
    } catch (jobErr) {
      console.warn('Lỗi khởi động Payment Expiry Job:', jobErr.message)
    }
  }

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
  // Khởi động sao lưu dự phòng định kỳ (DATA-01)
  import('./lib/backupService.js').then(({ performDatabaseBackup }) => {
    performDatabaseBackup().catch((e) => console.warn('Backup error on start:', e.message))
    const dailyBackupTimer = setInterval(() => {
      performDatabaseBackup().catch((e) => console.warn('Daily backup error:', e.message))
    }, 24 * 60 * 60 * 1000)
    server.dailyBackupTimer = dailyBackupTimer
  }).catch(() => {})
})

// Graceful shutdown (OPS-002)
const shutdown = (signal) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang đóng server an toàn...`)
  isServerReady = false
  if (server.viettelSyncTimer) {
    clearInterval(server.viettelSyncTimer)
  }
  if (server.dailyBackupTimer) {
    clearInterval(server.dailyBackupTimer)
  }
  server.close(() => {
    console.log('🔒 Server đã dừng nhận kết nối. Tiến trình kết thúc an toàn.')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))


