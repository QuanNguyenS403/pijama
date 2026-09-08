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

async function resetAllOrders() {
  console.log('====================================================================')
  console.log('🔄 BẮT ĐẦU RESET TOÀN BỘ ĐƠN HÀNG VỀ 0 (QuanNguyenS)')
  console.log('   Thời gian thực hiện:', new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }))
  console.log('====================================================================\n')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dataDir = path.join(rootDir, 'server/data')
  const backupDir = path.join(dataDir, 'backups')
  const storeFile = path.join(dataDir, 'orders_store.json')
  const txFile = path.join(dataDir, 'processed_tx.json')

  // Tạo thư mục backup an toàn
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  // ─────────────────────────────────────────────────────────────────
  // BƯỚC 1: SAO LƯU (BACKUP) TOÀN BỘ DỮ LIỆU CŨ TRƯỚC KHI RESET
  // ─────────────────────────────────────────────────────────────────
  console.log('📦 BƯỚC 1: Đang sao lưu dữ liệu hiện tại trước khi reset...')

  let localOrdersCount = 0
  if (fs.existsSync(storeFile)) {
    const raw = fs.readFileSync(storeFile, 'utf-8')
    const localBackupPath = path.join(backupDir, `orders_store_${timestamp}.json`)
    fs.writeFileSync(localBackupPath, raw, 'utf-8')
    try {
      const parsed = JSON.parse(raw)
      localOrdersCount = Array.isArray(parsed) ? parsed.length : 0
    } catch (e) {}
    console.log(`   ✅ Đã backup ${localOrdersCount} đơn từ orders_store.json -> ${path.basename(localBackupPath)}`)
  }

  if (fs.existsSync(txFile)) {
    const rawTx = fs.readFileSync(txFile, 'utf-8')
    const txBackupPath = path.join(backupDir, `processed_tx_${timestamp}.json`)
    fs.writeFileSync(txBackupPath, rawTx, 'utf-8')
    console.log(`   ✅ Đã backup processed_tx.json -> ${path.basename(txBackupPath)}`)
  }

  // ─────────────────────────────────────────────────────────────────
  // BƯỚC 2: SAO LƯU & XOÁ DỮ LIỆU TRÊN GOOGLE SHEETS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n📊 BƯỚC 2: Xử lý Google Sheets Cloud Database...')
  const sheetId = process.env.GOOGLE_SHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (sheetId && clientEmail && privateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    // Đọc và backup toàn bộ dữ liệu Google Sheets
    try {
      const donHangRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Đơn Hàng'!A:Z`,
      })
      const chiTietRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'Chi Tiết SP'!A:I`,
      })

      const sheetBackup = {
        timestamp: new Date().toISOString(),
        donHang: donHangRes.data.values || [],
        chiTietSP: chiTietRes.data.values || [],
      }

      const sheetBackupPath = path.join(backupDir, `sheets_data_${timestamp}.json`)
      fs.writeFileSync(sheetBackupPath, JSON.stringify(sheetBackup, null, 2), 'utf-8')
      console.log(`   ✅ Đã backup toàn bộ dữ liệu Google Sheets -> ${path.basename(sheetBackupPath)}`)

      // Xoá các dòng dữ liệu, GIỮ NGUYÊN dòng Header (A1:Z1 và A1:I1)
      console.log('   ⏳ Đang dọn dẹp các dòng dữ liệu trên Google Sheets (giữ nguyên hàng tiêu đề A1)...')
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `'Đơn Hàng'!A2:Z`,
      })
      console.log('   ✅ Đã xoá toàn bộ dòng dữ liệu trong tab "Đơn Hàng" (Hàng tiêu đề A1 được giữ nguyên)')

      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `'Chi Tiết SP'!A2:I`,
      })
      console.log('   ✅ Đã xoá toàn bộ dòng dữ liệu trong tab "Chi Tiết SP" (Hàng tiêu đề A1 được giữ nguyên)')
    } catch (sheetErr) {
      console.warn('   ⚠️ Lỗi khi xử lý Google Sheets:', sheetErr.message)
    }
  } else {
    console.log('   ℹ️ Bỏ qua bước Google Sheets vì không đủ credentials.')
  }

  // ─────────────────────────────────────────────────────────────────
  // BƯỚC 3: RESET FILE LOCAL STORE (orders_store.json) VỀ []
  // ─────────────────────────────────────────────────────────────────
  console.log('\n💾 BƯỚC 3: Đặt lại kho lưu trữ cục bộ về 0 đơn...')
  fs.writeFileSync(storeFile, '[]\n', 'utf-8')
  console.log('   ✅ Đã ghi đè orders_store.json thành mảng rỗng []')

  if (fs.existsSync(txFile)) {
    fs.writeFileSync(txFile, '[]\n', 'utf-8')
    console.log('   ✅ Đã làm mới processed_tx.json thành []')
  }

  // ─────────────────────────────────────────────────────────────────
  // BƯỚC 4: XÁC THỰC LẠI KẾT QUẢ
  // ─────────────────────────────────────────────────────────────────
  console.log('\n🔍 BƯỚC 4: Kiểm tra xác nhận kết quả sau khi reset...')
  const verifyLocal = JSON.parse(fs.readFileSync(storeFile, 'utf-8'))
  console.log(`   - Tổng số đơn trong orders_store.json: ${verifyLocal.length} đơn`)

  if (sheetId && clientEmail && privateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    const checkDonHang = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'Đơn Hàng'!A:A`,
    })
    const checkChiTiet = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'Chi Tiết SP'!A:A`,
    })

    const donHangRows = checkDonHang.data.values?.length || 0
    const chiTietRows = checkChiTiet.data.values?.length || 0

    console.log(`   - Dòng trên tab "Đơn Hàng": ${donHangRows} dòng (chỉ còn 1 dòng tiêu đề A1)`)
    console.log(`   - Dòng trên tab "Chi Tiết SP": ${chiTietRows} dòng (chỉ còn 1 dòng tiêu đề A1)`)
  }

  console.log('\n====================================================================')
  console.log('🎉 RESET THÀNH CÔNG! TỔNG SỐ ĐƠN HÀNG ĐÃ ĐƯỢC ĐƯA VỀ 0 ĐƠN.')
  console.log(`📁 File dự phòng đã được lưu an toàn tại thư mục: server/data/backups/`)
  console.log('====================================================================\n')
}

resetAllOrders().catch((err) => {
  console.error('\n❌ Lỗi trong quá trình reset:', err)
  process.exit(1)
})
