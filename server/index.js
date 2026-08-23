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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuanNguyenS Order & Payment Server',
    timestamp: new Date().toISOString(),
  })
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

// ── 4. API Xác Nhận Thanh Toán & Kích Hoạt Gmail ─────────────
app.post('/api/payment/confirm', submitOrderLimiter, async (req, res) => {
  const { confirmOrderPaymentManually } = await import('./lib/paymentWebhook.js')
  const result = await confirmOrderPaymentManually(req.body)
  return res.status(result.status).json(result.data)
})

// ── 5. Xử lý Đơn Hàng ─────────────────────────────────────────
app.post('/api/orders/submit', submitOrderLimiter, async (req, res) => {
  try {
    const result = await handleOrderSubmit(req.body)
    return res.status(result.status).json(result.data)
  } catch (error) {
    console.error('Server error on /api/orders/submit:', error)
    return res.status(500).json({
      success: false,
      error: 'Lỗi máy chủ khi xử lý đơn hàng. Vui lòng liên hệ: 0981 753 082',
    })
  }
})

// ── 6. Tra Cứu Thông Tin Vận Đơn (Tracking API) ─────────────
app.get('/api/orders/tracking', async (req, res) => {
  try {
    const { orderId } = req.query
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

    const carrier = order.carrier || 'GHN'
    const trackingCode = order.trackingCode || null
    let trackingUrl = null

    if (trackingCode) {
      if (carrier === 'GHN' || carrier.includes('Giao Hàng Nhanh')) {
        trackingUrl = `https://tracking.ghn.vn/?order_code=${trackingCode}`
      } else if (carrier === 'GHTK' || carrier.includes('Tiết Kiệm')) {
        trackingUrl = `https://i.ghtk.vn/${trackingCode}`
      } else if (carrier === 'VIETTEL' || carrier.includes('Viettel')) {
        trackingUrl = `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang/?order_number=${trackingCode}`
      } else if (carrier === 'SPX' || carrier.includes('Shopee')) {
        trackingUrl = `https://spx.vn/track?bill_no=${trackingCode}`
      } else {
        trackingUrl = `https://tracking.ghn.vn/?order_code=${trackingCode}`
      }
    }

    return res.json({
      success: true,
      orderId: order.orderId,
      status: order.status || 'PENDING',
      carrier,
      trackingCode,
      trackingUrl,
      order,
    })
  } catch (err) {
    console.error('Tracking API error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 7. Tra Cứu Đơn Hàng Bằng SĐT & Mã Đơn (Toàn Quốc) ───────
app.get('/api/orders/lookup', lookupLimiter, async (req, res) => {
  try {
    const query = req.query.query || req.query.phone || req.query.orderId || ''
    if (!query || String(query).trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tối thiểu 3 ký tự (Số điện thoại hoặc Mã đơn QNS-...)',
      })
    }

    const { orderPersistence } = await import('./lib/orderPersistence.js')
    const { searchOrdersFromSheet } = await import('./lib/googleSheets.js')

    const localMatches = orderPersistence.findByQuery(query)
    const sheetMatches = await searchOrdersFromSheet(query)

    // Merge without duplicates
    const combined = new Map()
    sheetMatches.forEach((o) => combined.set(o.orderId, o))
    localMatches.forEach((o) => combined.set(o.orderId, { ...combined.get(o.orderId), ...o }))

    const results = Array.from(combined.values())
    return res.json({
      success: true,
      query,
      count: results.length,
      orders: results,
    })
  } catch (err) {
    console.error('Order lookup error:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── 8. Yêu Cầu Hủy / Chỉnh Sửa Đơn Hàng COD Tự Phục Vụ ──────
app.post('/api/orders/cancel-request', async (req, res) => {
  try {
    const { orderId, reason = 'Khách yêu cầu hủy đơn' } = req.body
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng' })
    }

    const { orderPersistence } = await import('./lib/orderPersistence.js')
    const order = orderPersistence.get(orderId)

    if (order) {
      if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
        return res.status(400).json({
          success: false,
          error: 'Đơn hàng đang trên đường giao hoặc đã giao, không thể hủy tự động. Vui lòng liên hệ hotline 0981 753 082.',
        })
      }
      order.status = 'CANCELLED'
      order.cancelReason = reason
      order.cancelledAt = new Date().toISOString()
      orderPersistence.set(orderId, order)
    }

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

// ── P1-2: Phục vụ Frontend SPA trong môi trường Production ─────
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    // Không can thiệp nếu là request API
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Khởi chạy server
app.listen(PORT, async () => {
  console.log(`\n======================================================`)
  console.log(`🚀 QuanNguyenS Order Server đang chạy tại: http://localhost:${PORT}`)
  console.log(`======================================================`)

  // Kiểm tra Sheet & Email
  await initializeSheet()
  await verifyTransporter()
})

