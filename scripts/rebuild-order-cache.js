// scripts/rebuild-order-cache.js
// Tái tạo bộ đệm cục bộ server/data/orders_store.json từ Google Sheets (READ-ONLY)
// Tuyệt đối KHÔNG ghi/sửa bất kỳ dòng nào trên Google Sheets!

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'
import { isSupabaseConfigured, getSupabase } from '../server/lib/supabaseClient.js'
import { loadEnvironment } from '../server/lib/envCheck.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Nạp toàn bộ môi trường từ .env, .env.development, .env.local
loadEnvironment(rootDir)

async function rebuildOrderCache() {
  console.log('=============================================================================')
  console.log('🔄 BẮT ĐẦU TÁI TẠO BỘ ĐỆM ĐƠN HÀNG (REBUILD ORDER CACHE FROM GOOGLE SHEETS)')
  console.log('=============================================================================\n')

  const sheetId = process.env.GOOGLE_SHEET_ID
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !clientEmail || !privateKey) {
    console.error('❌ Thiếu cấu hình Google Sheets trong .env.local:')
    console.error(`   - GOOGLE_SHEET_ID: ${sheetId ? 'Đã có' : 'THIẾU'}`)
    console.error(`   - GOOGLE_SERVICE_ACCOUNT_EMAIL: ${clientEmail ? 'Đã có' : 'THIẾU'}`)
    console.error(`   - GOOGLE_PRIVATE_KEY: ${privateKey ? 'Đã có' : 'THIẾU'}`)
    console.error('\n👉 Vui lòng điền thông tin vào .env.local rồi chạy lại: node scripts/rebuild-order-cache.js')
    process.exit(1)
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  console.log(`📡 Đang kết nối tới Google Sheet ID: ${sheetId} (Chế độ CHỈ ĐỌC)...`)

  // 1. Đọc Tab Đơn Hàng (Orders)
  console.log('📖 Đang đọc dữ liệu từ tab "Đơn Hàng" (A2:Z)...')
  let orderRows = []
  try {
    const resOrders = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Đơn Hàng!A2:Z',
    })
    orderRows = resOrders.data.values || []
    console.log(`   Tìm thấy ${orderRows.length} dòng đơn hàng.`)
  } catch (err) {
    console.error('❌ Lỗi khi đọc tab "Đơn Hàng":', err.message)
    process.exit(1)
  }

  // 2. Đọc Tab Chi Tiết SP (Products)
  console.log('📖 Đang đọc dữ liệu từ tab "Chi Tiết SP" (A2:I)...')
  const productsByOrder = new Map()
  try {
    const resProducts = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Chi Tiết SP!A2:I',
    })
    const productRows = resProducts.data.values || []
    console.log(`   Tìm thấy ${productRows.length} dòng chi tiết sản phẩm.`)

    for (const pr of productRows) {
      if (!pr || !pr[0]) continue
      const orderId = String(pr[0]).trim()
      const item = {
        orderId,
        orderDateVN: pr[1] || '',
        customerName: pr[2] || '',
        productName: pr[3] || '',
        name: pr[3] || '',
        variant: pr[4] || '',
        color: pr[4] || '',
        size: pr[5] || '',
        quantity: Number(pr[6]) || 1,
        price: Number(pr[7]) || 0,
        total: Number(pr[8]) || 0,
      }
      if (!productsByOrder.has(orderId)) {
        productsByOrder.set(orderId, [])
      }
      productsByOrder.get(orderId).push(item)
    }
  } catch (err) {
    console.warn('⚠️ Cảnh báo: Không đọc được tab "Chi Tiết SP" (sẽ fallback phân tích từ cột L/M/N):', err.message)
  }

  // 3. Xây dựng danh sách đơn hàng chuẩn hóa (Canonical Orders)
  console.log('⚙️ Đang tái cấu trúc dữ liệu đơn hàng...')
  const canonicalOrders = []

  for (const r of orderRows) {
    if (!r || !r[0]) continue
    const orderId = String(r[0]).trim()

    // Lấy items từ tab Chi Tiết SP nếu có, ngược lại tách cột L, M, N
    let items = productsByOrder.get(orderId) || []
    if (items.length === 0) {
      const itemNames = (r[11] || '').split(' | ').map((s) => s.trim()).filter(Boolean)
      const itemVariants = (r[12] || '').split(' | ').map((s) => s.trim())
      const itemQtys = (r[13] || '').split(' | ').map((s) => s.trim())
      items = itemNames.map((name, idx) => ({
        productName: name,
        name: name,
        variant: itemVariants[idx] || '',
        quantity: Number(itemQtys[idx]) || 1,
      }))
    }

    const orderObj = {
      orderId,
      id: orderId,
      orderNumber: orderId,
      orderDateVN: `${r[1] || ''} ${r[2] || ''}`.trim(),
      customer: {
        fullName: r[3] || '',
        phone: r[4] || '',
        email: r[5] || '',
      },
      customerName: r[3] || '',
      customerPhone: r[4] || '',
      customerEmail: r[5] || '',
      shipping: {
        address: r[6] || '',
        ward: r[7] || '',
        district: r[8] || '',
        city: r[9] || '',
        fullAddress: r[10] || '',
      },
      shippingAddress: r[10] || '',
      items,
      subtotal: Number(r[14]) || 0,
      shippingFee: Number(r[15]) || 0,
      discount: Number(r[16]) || 0,
      discountAmount: Number(r[16]) || 0,
      voucherCode: r[17] || '',
      total: Number(r[18]) || 0,
      payment: {
        methodLabel: r[19] || 'COD',
        status: r[20] || 'UNPAID',
      },
      paymentMethod: r[19] || 'COD',
      paymentStatus: r[20] || 'UNPAID',
      notes: r[21] || '',
      note: r[21] || '',
      status: r[22] || 'PENDING',
      source: r[23] || 'website',
      trackingCode: r[24] || null,
      trackingNumber: r[24] || null,
      carrier: r[25] || null,
      rebuiltAt: new Date().toISOString(),
    }

    canonicalOrders.push(orderObj)
  }

  // 4. Ghi file an toàn (Atomic write qua file tạm)
  const dataDir = path.resolve(rootDir, 'server/data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const targetPath = path.resolve(dataDir, 'orders_store.json')
  const tempPath = path.resolve(dataDir, `orders_store.json.tmp.${Date.now()}`)

  fs.writeFileSync(tempPath, JSON.stringify(canonicalOrders, null, 2), 'utf-8')
  fs.renameSync(tempPath, targetPath)
  console.log(`\n💾 Đã ghi atomic thành công ${canonicalOrders.length} đơn hàng vào:`)
  console.log(`   ${targetPath}`)

  // 5. Đối chiếu số liệu
  console.log('\n📊 BÁO CÁO ĐỐI SOÁT:')
  console.log(`   - Số dòng đọc được trên Sheet (Đơn Hàng): ${orderRows.length}`)
  console.log(`   - Số đơn chuẩn hóa trong orders_store.json: ${canonicalOrders.length}`)

  // 6. Kiểm tra đối chiếu Supabase nếu có cấu hình
  if (isSupabaseConfigured()) {
    console.log('\n🔎 Đang đối chiếu với Supabase Cloud...')
    try {
      const client = getSupabase()
      const { data: supaOrders, error } = await client.from('orders').select('id, total, order_status')
      if (error) {
        console.warn('   ⚠️ Không thể truy vấn Supabase:', error.message)
      } else {
        const supaCount = supaOrders ? supaOrders.length : 0
        console.log(`   - Số đơn hiện có trên Supabase: ${supaCount}`)
        const supaIdSet = new Set((supaOrders || []).map((o) => o.id))
        const missingInSupabase = canonicalOrders.filter((o) => !supaIdSet.has(o.orderId))
        if (missingInSupabase.length > 0) {
          console.log(`   ⚠️ Có ${missingInSupabase.length} đơn có trên Sheet nhưng chưa có trên Supabase (chạy scripts/migrate-to-supabase.js để bù).`)
        } else {
          console.log('   ✅ Toàn bộ đơn hàng trên Sheet đã có trên Supabase.')
        }
      }
    } catch (supaErr) {
      console.warn('   ⚠️ Lỗi đối chiếu Supabase:', supaErr.message)
    }
  }

  console.log('\n=============================================================================')
  console.log('🎉 TÁI TẠO BỘ ĐỆM ĐƠN HÀNG THÀNH CÔNG!')
  console.log('=============================================================================\n')
}

rebuildOrderCache().catch((err) => {
  console.error('Lỗi nghiêm trọng khi tái tạo cache:', err)
  process.exit(1)
})
