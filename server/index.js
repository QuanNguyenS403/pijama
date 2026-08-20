import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { handleOrderSubmit } from './apiHandler.js'
import { initializeSheet } from './lib/googleSheets.js'
import { verifyTransporter } from './lib/emailConfig.js'
import { generateVietQRQuickLink, generateSePayQR } from './lib/paymentQrService.js'
import { handlePaymentWebhook, getOrderPaymentStatus } from './lib/paymentWebhook.js'

// Load environment variables from .env or .env.local
dotenv.config({ path: '.env.local' })
dotenv.config() // Fallback to .env

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuanNguyenS Order & Payment Server',
    timestamp: new Date().toISOString(),
  })
})

// ── 1. API Tạo Mã QR Thanh Toán Động (VietQR / SePay) ──────────
app.post('/api/payment/generate-qr', (req, res) => {
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
app.post('/api/payment/confirm', async (req, res) => {
  const { confirmOrderPaymentManually } = await import('./lib/paymentWebhook.js')
  const result = await confirmOrderPaymentManually(req.body)
  return res.status(result.status).json(result.data)
})

// ── 5. Xử lý Đơn Hàng ─────────────────────────────────────────
app.post('/api/orders/submit', async (req, res) => {
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

// Khởi chạy server
app.listen(PORT, async () => {
  console.log(`\n======================================================`)
  console.log(`🚀 QuanNguyenS Order Server đang chạy tại: http://localhost:${PORT}`)
  console.log(`======================================================`)

  // Kiểm tra Sheet & Email
  await initializeSheet()
  await verifyTransporter()
})
