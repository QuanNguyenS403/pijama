import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env.local') })
dotenv.config({ path: path.join(rootDir, '.env') })

async function runDatabaseDiagnostics() {
  console.log('====================================================================')
  console.log('🔍 BÁO CÁO KIỂM TRA TOÀN DIỆN HỆ THỐNG CƠ SỞ DỮ LIỆU (QuanNguyenS)')
  console.log('   Thời gian thực hiện:', new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }))
  console.log('====================================================================\n')

  const results = {
    localPersistence: { status: 'UNKNOWN' },
    googleSheets: { status: 'UNKNOWN' },
    supabasePostgres: { status: 'UNKNOWN' },
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. KIỂM TRA LOCAL PERSISTENT STORE (orders_store.json)
  // ─────────────────────────────────────────────────────────────────
  console.log('📦 1. HỆ THỐNG LƯU TRỮ CỤC BỘ (Local JSON Store & RAM Map):')
  const dataDir = path.join(rootDir, 'server/data')
  const storeFile = path.join(dataDir, 'orders_store.json')
  const txFile = path.join(dataDir, 'processed_tx.json')

  try {
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Thư mục ${dataDir} không tồn tại.`)
    }

    if (!fs.existsSync(storeFile)) {
      results.localPersistence = {
        status: 'WARNING',
        message: 'File orders_store.json chưa được tạo trên đĩa (sẽ tự động tạo khi có đơn đầu tiên).',
      }
      console.log('   ⚠️ orders_store.json chưa có trên đĩa.')
    } else {
      const stats = fs.statSync(storeFile)
      const rawContent = fs.readFileSync(storeFile, 'utf-8')
      const orders = JSON.parse(rawContent)

      if (!Array.isArray(orders)) {
        throw new Error('orders_store.json không phải định dạng Array hợp lệ.')
      }

      // Thống kê đơn hàng
      const statusCounts = {}
      const paymentStatusCounts = {}
      let totalRevenue = 0
      let latestOrder = null

      orders.forEach((o) => {
        const s = o.status || 'UNKNOWN'
        statusCounts[s] = (statusCounts[s] || 0) + 1

        const ps = o.payment?.status || o.paymentStatus || 'UNKNOWN'
        paymentStatusCounts[ps] = (paymentStatusCounts[ps] || 0) + 1

        if (o.status !== 'CANCELLED') {
          totalRevenue += Number(o.total || 0)
        }

        if (!latestOrder || new Date(o.createdAt || o.orderDate || 0) > new Date(latestOrder.createdAt || latestOrder.orderDate || 0)) {
          latestOrder = o
        }
      })

      // Test write integrity
      const tempTest = path.join(dataDir, '.db_test_write.tmp')
      fs.writeFileSync(tempTest, 'health-check', 'utf-8')
      fs.unlinkSync(tempTest)

      results.localPersistence = {
        status: 'HEALTHY',
        filePath: storeFile,
        fileSizeBytes: stats.size,
        totalOrders: orders.length,
        statusCounts,
        paymentStatusCounts,
        activeRevenue: totalRevenue,
        latestOrderId: latestOrder?.orderId || null,
        latestOrderDate: latestOrder?.orderDateVN || latestOrder?.createdAt || null,
        writeAccess: 'OK',
      }

      console.log('   ✅ Trạng thái: HOẠT ĐỘNG TỐT (HEALTHY)')
      console.log(`   - Đường dẫn file: ${storeFile}`)
      console.log(`   - Kích thước: ${(stats.size / 1024).toFixed(2)} KB`)
      console.log(`   - Tổng số đơn lưu trữ: ${orders.length} đơn`)
      console.log(`   - Phân loại đơn:`, statusCounts)
      console.log(`   - Trạng thái thanh toán:`, paymentStatusCounts)
      console.log(`   - Đơn gần nhất: ${latestOrder?.orderId || 'N/A'} (${latestOrder?.orderDateVN || latestOrder?.createdAt || 'N/A'})`)
      console.log(`   - Quyền ghi đĩa (Read/Write): Hoàn toàn bình thường`)
    }

    if (fs.existsSync(txFile)) {
      const txs = JSON.parse(fs.readFileSync(txFile, 'utf-8') || '[]')
      console.log(`   - Giao dịch thanh toán SePay đã xử lý (processed_tx.json): ${txs.length} giao dịch`)
    }
  } catch (err) {
    results.localPersistence = {
      status: 'ERROR',
      error: err.message,
    }
    console.log(`   ❌ LỖI Local Store: ${err.message}`)
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. KIỂM TRA GOOGLE SHEETS CLOUD DATABASE
  // ─────────────────────────────────────────────────────────────────
  console.log('\n📊 2. HỆ THỐNG CLOUD SPREADSHEET DATABASE (Google Sheets):')
  const sheetId = process.env.GOOGLE_SHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !clientEmail || !privateKey) {
    results.googleSheets = {
      status: 'CONFIG_MISSING',
      error: 'Thiếu cấu hình GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY trong .env',
    }
    console.log('   ❌ Thiếu cấu hình Google Sheets trong .env!')
  } else {
    console.log(`   - Sheet ID: ${sheetId}`)
    console.log(`   - Service Account: ${clientEmail}`)
    console.log(`   - Khóa chứng thực: Đã cung cấp (${privateKey.length} ký tự)`)

    try {
      console.log('   ⏳ Đang gửi yêu cầu xác thực và kết nối tới Google Sheets API v4...')
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })

      const sheets = google.sheets({ version: 'v4', auth })

      // 1. Get metadata
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
      const spreadsheetTitle = meta.data.properties?.title
      const tabs = (meta.data.sheets || []).map((s) => ({
        title: s.properties?.title,
        sheetId: s.properties?.sheetId,
        rowCount: s.properties?.gridProperties?.rowCount,
        columnCount: s.properties?.gridProperties?.columnCount,
      }))

      // 2. Read tab Đơn Hàng
      const ordersRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Đơn Hàng'!A1:Z50`,
      })
      const orderRows = ordersRes.data.values || []
      const orderHeaders = orderRows[0] || []
      const orderDataCount = Math.max(0, orderRows.length - 1)

      // 3. Read tab Chi Tiết SP
      const productsRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Chi Tiết SP'!A1:I50`,
      })
      const productRows = productsRes.data.values || []
      const productHeaders = productRows[0] || []
      const productDataCount = Math.max(0, productRows.length - 1)

      results.googleSheets = {
        status: 'HEALTHY',
        spreadsheetTitle,
        tabs: tabs.map((t) => t.title),
        ordersTab: {
          headersOk: orderHeaders.length >= 20,
          headerCount: orderHeaders.length,
          sampleRowCount: orderDataCount,
        },
        productsTab: {
          headersOk: productHeaders.length >= 8,
          headerCount: productHeaders.length,
          sampleRowCount: productDataCount,
        },
      }

      console.log('   ✅ Trạng thái: HOẠT ĐỘNG HOÀN HẢO (HEALTHY)')
      console.log(`   - Tên Google Sheet: "${spreadsheetTitle}"`)
      console.log(`   - Các tab hiện có: ${tabs.map((t) => `"${t.title}"`).join(', ')}`)
      console.log(`   - Tab "Đơn Hàng": ${orderHeaders.length} cột Header chuẩn, đọc được dữ liệu đơn`)
      console.log(`   - Tab "Chi Tiết SP": ${productHeaders.length} cột Header chuẩn, đọc được dữ liệu sản phẩm`)
    } catch (sheetErr) {
      results.googleSheets = {
        status: 'ERROR',
        error: sheetErr.message,
        code: sheetErr.code,
      }
      console.log(`   ❌ LỖI kết nối Google Sheets: ${sheetErr.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. KIỂM TRA CẤU HÌNH SUPABASE / POSTGRESQL (Nếu có)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n🐘 3. KIỂM TRA CẤU HÌNH POSTGRESQL / SUPABASE:')
  const dbUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_URL
  const isPlaceholder = dbUrl && (dbUrl.includes('[password]') || dbUrl.includes('[project]'))

  results.supabasePostgres = {
    configured: Boolean(dbUrl),
    isPlaceholder: Boolean(isPlaceholder),
    supabaseUrl: supabaseUrl || null,
    inActiveUse: false,
  }

  if (isPlaceholder) {
    console.log('   ℹ️ Biến DATABASE_URL / SUPABASE_URL trong .env hiện là mẫu (Placeholder).')
    console.log('   ℹ️ Ghi chú: Hệ thống QuanNguyenS hiện đang vận hành chuẩn theo mô hình:')
    console.log('      • Database chính (Cloud): Google Sheets (Đồng bộ thời gian thực cho vận hành & kế toán)')
    console.log('      • Database thứ cấp (Local): orders_store.json (Đảm bảo độ trễ 0ms khi tra cứu, thanh toán, admin)')
    console.log('      • Supabase/PostgreSQL: Chưa kích hoạt trong code backend, không ảnh hưởng tới hoạt động của web.')
  } else if (!dbUrl) {
    console.log('   ℹ️ Không có cấu hình DATABASE_URL.')
  } else {
    console.log('   ℹ️ Cấu hình DATABASE_URL đã được điền thông số thật.')
  }

  console.log('\n====================================================================')
  console.log('🎯 KẾT LUẬN TỔNG QUAN:')
  const isLocalOk = results.localPersistence.status === 'HEALTHY'
  const isSheetOk = results.googleSheets.status === 'HEALTHY'

  if (isLocalOk && isSheetOk) {
    console.log('🎉 TOÀN BỘ HỆ THỐNG DATABASE ĐANG HOẠT ĐỘNG HOÀN TOÀN BÌNH THƯỜNG & ỔN ĐỊNH!')
  } else {
    console.log('⚠️ Cần kiểm tra lại các cảnh báo hoặc lỗi nêu trên.')
  }
  console.log('====================================================================\n')
}

runDatabaseDiagnostics()
