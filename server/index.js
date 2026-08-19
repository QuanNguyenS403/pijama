import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { handleOrderSubmit } from './apiHandler.js'
import { initializeSheet } from './lib/googleSheets.js'
import { verifyTransporter } from './lib/emailConfig.js'

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
    service: 'QuanNguyenS Order Automation Server',
    timestamp: new Date().toISOString(),
  })
})

// ── BƯỚC 1 -> 5: Xử lý Đơn Hàng ─────────────────────────────
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
