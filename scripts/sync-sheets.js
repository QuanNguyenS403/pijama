import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadEnvironment } from '../server/lib/envCheck.js'
import { products } from '../src/data/products.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 1. Nạp biến môi trường
loadEnvironment(rootDir)

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY

if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error('❌ Thiếu cấu hình Google Sheets trong .env!')
  process.exit(1)
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: SERVICE_ACCOUNT_EMAIL,
    private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

// Tiêu đề các Tab
const TAB_ORDERS = 'Đơn Hàng'
const TAB_ORDER_PRODUCTS = 'Chi Tiết SP'
const TAB_CATALOG = 'Chi Tiết SP Pyjama'

// Headers cho Tab Đơn Hàng (26 cột)
const ORDER_HEADERS = [
  'Mã Đơn', // A
  'Ngày Đặt', // B
  'Giờ Đặt', // C
  'Tên Khách', // D
  'Số Điện Thoại', // E
  'Email', // F
  'Địa Chỉ', // G
  'Phường/Xã', // H
  'Quận/Huyện', // I
  'Tỉnh/TP', // J
  'Địa Chỉ Đầy Đủ', // K
  'Tên Sản Phẩm', // L
  'Biến Thể', // M
  'Số Lượng', // N
  'Tạm Tính', // O
  'Phí Ship', // P
  'Giảm Giá', // Q
  'Mã Voucher', // R
  'Tổng Cộng', // S
  'Phương Thức TT', // T
  'Trạng Thái TT', // U
  'Ghi Chú', // V
  'Trạng Thái ĐH', // W
  'Nguồn', // X
  'Mã Vận Đơn', // Y
  'Đơn Vị Vận Chuyển', // Z
]

// Headers cho Tab Chi Tiết SP Trong Đơn (9 cột)
const ORDER_PRODUCT_HEADERS = [
  'Mã Đơn', // A
  'Ngày Đặt', // B
  'Tên Khách', // C
  'Tên Sản Phẩm', // D
  'Màu Sắc', // E
  'Size', // F
  'Số Lượng', // G
  'Đơn Giá', // H
  'Thành Tiền', // I
]

// Headers cho Tab Danh Mục Chi Tiết SP Pyjama Của Website (17 cột)
const CATALOG_HEADERS = [
  'Mã SP', // A
  'Tên Bộ Pyjama', // B
  'Phụ Đề / Phong Cách', // C
  'Bộ Sưu Tập', // D
  'Giá Bán (VNĐ)', // E
  'Giá Gốc (VNĐ)', // F
  'Giảm Giá (%)', // G
  'Màu Sắc & Họa Tiết', // H
  'Kích Cỡ Khả Dụng', // I
  'Tồn Kho Chi Tiết', // J
  'Tổng Tồn Kho', // K
  'Chất Liệu Vải', // L
  'Định Lượng GSM & Tiêu Chuẩn', // M
  'Bản Mệnh Ngũ Hành', // N
  'Đánh Giá (Sao)', // O
  'Số Lượng Đánh Giá', // P
  'Link Chi Tiết Website', // Q
]

// Hàm sanitize chống Formula Injection
const sanitize = (val) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (/^[=+@\-\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

async function syncAll() {
  console.log('=============================================================================')
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ TOÀN DIỆN DỮ LIỆU WEBSITE LÊN GOOGLE SHEETS')
  console.log(`   - Spreadsheet ID: ${SHEET_ID}`)
  console.log(`   - Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)
  console.log('=============================================================================\n')

  // 1. Kiểm tra cấu trúc các Sheet trong Google Spreadsheet
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const existingSheets = meta.data.sheets || []
  const existingTitles = existingSheets.map((s) => s.properties?.title)
  console.log('📋 Các tab hiện có trên Google Sheet:', existingTitles)

  const requests = []

  // Đổi tên "Trang tính1" thành "Chi Tiết SP Pyjama" nếu có, hoặc tạo mới nếu chưa có
  const trangTinh1 = existingSheets.find((s) => s.properties?.title === 'Trang tính1')
  if (trangTinh1) {
    console.log('🔄 Đổi tên tab "Trang tính1" -> "Chi Tiết SP Pyjama"')
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: trangTinh1.properties?.sheetId,
          title: TAB_CATALOG,
        },
        fields: 'title',
      },
    })
  } else if (!existingTitles.includes(TAB_CATALOG)) {
    console.log(`➕ Tạo mới tab "${TAB_CATALOG}"`)
    requests.push({
      addSheet: {
        properties: { title: TAB_CATALOG },
      },
    })
  }

  // Đảm bảo tab Đơn Hàng tồn tại
  if (!existingTitles.includes(TAB_ORDERS)) {
    console.log(`➕ Tạo mới tab "${TAB_ORDERS}"`)
    requests.push({
      addSheet: {
        properties: { title: TAB_ORDERS },
      },
    })
  }

  // Đảm bảo tab Chi Tiết SP tồn tại
  if (!existingTitles.includes(TAB_ORDER_PRODUCTS)) {
    console.log(`➕ Tạo mới tab "${TAB_ORDER_PRODUCTS}"`)
    requests.push({
      addSheet: {
        properties: { title: TAB_ORDER_PRODUCTS },
      },
    })
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests },
    })
    console.log('✅ Hoàn tất thiết lập cấu trúc tabs!')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHẦN 1: ĐỒNG BỘ TRANG TÍNH CHI TIẾT SẢN PHẨM PYJAMA (CATALOG)
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n📦 1. Đang đồng bộ danh mục chi tiết sản phẩm Pyjama vào tab "${TAB_CATALOG}"...`)
  const catalogRows = [CATALOG_HEADERS]

  products.forEach((p) => {
    // Tính tồn kho
    let totalStock = 0
    const stockDetails = []
    ;(p.colors || []).forEach((c) => {
      const colorLabel = c.label || c.name || ''
      if (c.stock) {
        Object.entries(c.stock).forEach(([sz, qty]) => {
          totalStock += Number(qty) || 0
          stockDetails.push(`${colorLabel} (Size ${sz}): ${qty}`)
        })
      }
    })

    const colorLabels = (p.colors || []).map((c) => c.label || c.name).join(', ')
    const sizes = (p.sizes || []).join(', ')
    const link = `https://quannguyens.com/san-pham/${p.slug}`

    catalogRows.push([
      sanitize(p.id || p.slug),
      sanitize(p.name),
      sanitize(p.subtitle),
      sanitize(p.collection),
      Number(p.price) || 0,
      p.originalPrice ? Number(p.originalPrice) : '',
      p.discount ? Number(p.discount) : 0,
      sanitize(colorLabels),
      sanitize(sizes),
      sanitize(stockDetails.join(' | ')),
      Number(totalStock),
      sanitize(p.fabric),
      sanitize(p.fabricDetail),
      sanitize(p.fengShui?.element ? `${p.fengShui.element} (${p.fengShui.energyNote || ''})` : ''),
      Number(p.rating) || 5.0,
      Number(p.reviewCount) || 0,
      sanitize(link),
    ])
  })

  // Ghi đè tab Catalog
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB_CATALOG}'!A1:Q${catalogRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: catalogRows },
  })
  console.log(`   ✅ Đã cập nhật ${products.length} sản phẩm Pyjama cao cấp vào tab "${TAB_CATALOG}".`)

  // ─────────────────────────────────────────────────────────────────────────
  // PHẦN 2: ĐỒNG BỘ TRANG TÍNH ĐƠN HÀNG VÀ CHI TIẾT SP TRONG ĐƠN HÀNG
  // ─────────────────────────────────────────────────────────────────────────
  console.log(`\n📋 2. Đang đọc danh sách đơn hàng đã thu thập từ website...`)
  const ordersStorePath = path.resolve(rootDir, 'server/data/orders_store.json')
  let localOrders = []
  if (fs.existsSync(ordersStorePath)) {
    localOrders = JSON.parse(fs.readFileSync(ordersStorePath, 'utf-8') || '[]')
  }
  console.log(`   Tìm thấy ${localOrders.length} đơn hàng trong kho lưu trữ dữ liệu website.`)

  // Chuẩn bị dữ liệu cho Tab Đơn Hàng và Tab Chi Tiết SP
  const orderRows = [ORDER_HEADERS]
  const productRows = [ORDER_PRODUCT_HEADERS]

  localOrders.forEach((order) => {
    const orderId = order.orderId || order.id || ''
    if (!orderId) return

    // Ngày giờ
    let dateStr = ''
    let timeStr = ''
    try {
      const d = new Date(order.createdAt || order.orderDate || Date.now())
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
        timeStr = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })
      }
    } catch (_) {}

    if (!dateStr && order.orderDateVN) {
      const parts = order.orderDateVN.split(' ')
      dateStr = parts[0] || order.orderDateVN
      timeStr = parts[1] || ''
    }

    const customerName = order.customer?.fullName || order.customerName || ''
    const phone = order.customer?.phone || order.customerPhone || ''
    const email = order.customer?.email || order.customerEmail || ''

    const address = order.shipping?.address || order.shippingAddress || ''
    const ward = order.shipping?.ward || ''
    const district = order.shipping?.district || ''
    const city = order.shipping?.city || ''
    const fullAddress =
      order.shipping?.fullAddress ||
      order.shippingAddress ||
      [address, ward, district, city].filter(Boolean).join(', ')

    // Danh sách items
    const items = Array.isArray(order.items) ? order.items : []
    const itemNames = items.map((i) => i.productName || i.name || 'Pijama QuanNguyenS').join(' | ')
    const itemVariants = items.map((i) => i.variant || [i.color || i.colorLabel, i.size].filter(Boolean).join(' - ')).join(' | ')
    const itemQtys = items.map((i) => i.quantity || 1).join(' | ')

    const subtotal = Number(order.subtotal || order.total || 0)
    const shippingFee = Number(order.shippingFee || 0)
    const discount = Number(order.discount || 0)
    const voucherCode = order.voucherCode || ''
    const total = Number(order.total || 0)

    const paymentMethod =
      order.payment?.methodLabel ||
      order.payment?.method ||
      order.paymentMethod ||
      'COD'
    const paymentStatus =
      order.payment?.status ||
      order.paymentStatus ||
      'UNPAID'

    const note = order.note || order.adminNote || ''
    const status = order.status || 'PENDING'
    const source = order.source || 'website'
    const trackingCode = order.trackingCode || order.trackingNumber || ''
    const carrier = order.carrier || ''

    // Thêm vào Tab Đơn Hàng
    orderRows.push([
      sanitize(orderId),
      sanitize(dateStr),
      sanitize(timeStr),
      sanitize(customerName),
      sanitize(phone),
      sanitize(email),
      sanitize(address),
      sanitize(ward),
      sanitize(district),
      sanitize(city),
      sanitize(fullAddress),
      sanitize(itemNames),
      sanitize(itemVariants),
      sanitize(itemQtys),
      subtotal,
      shippingFee,
      discount,
      sanitize(voucherCode),
      total,
      sanitize(paymentMethod),
      sanitize(paymentStatus),
      sanitize(note),
      sanitize(status),
      sanitize(source),
      sanitize(trackingCode),
      sanitize(carrier),
    ])

    // Thêm vào Tab Chi Tiết SP
    if (items.length > 0) {
      items.forEach((item) => {
        const pName = item.productName || item.name || 'Pijama QuanNguyenS'
        const color = item.color || item.colorLabel || (item.variant ? item.variant.split(' - ')[0] : '')
        const size = item.size || (item.variant ? item.variant.split(' - ')[1] : '')
        const qty = Number(item.quantity) || 1
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const totalPrice = Number(item.totalPrice || item.total || unitPrice * qty)

        productRows.push([
          sanitize(orderId),
          sanitize(dateStr),
          sanitize(customerName),
          sanitize(pName),
          sanitize(color),
          sanitize(size),
          qty,
          unitPrice,
          totalPrice,
        ])
      })
    } else {
      // Đơn hàng chưa có mảng items chi tiết
      productRows.push([
        sanitize(orderId),
        sanitize(dateStr),
        sanitize(customerName),
        'Pijama Cao Cấp QuanNguyenS',
        '',
        '',
        1,
        total,
        total,
      ])
    }
  })

  // 3. Ghi dữ liệu vào Tab Đơn Hàng
  console.log(`\n📝 3. Đang ghi dữ liệu vào tab "${TAB_ORDERS}"...`)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB_ORDERS}'!A1:Z${orderRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: orderRows },
  })
  console.log(`   ✅ Đã đồng bộ thành công ${orderRows.length - 1} đơn hàng vào tab "${TAB_ORDERS}".`)

  // 4. Ghi dữ liệu vào Tab Chi Tiết SP
  console.log(`\n📝 4. Đang ghi dữ liệu vào tab "${TAB_ORDER_PRODUCTS}"...`)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB_ORDER_PRODUCTS}'!A1:I${productRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: productRows },
  })
  console.log(`   ✅ Đã đồng bộ thành công ${productRows.length - 1} dòng chi tiết SP vào tab "${TAB_ORDER_PRODUCTS}".`)

  // 5. Định dạng giao diện Sheet (Cố định dòng Header, làm đẹp)
  console.log(`\n🎨 5. Đang tối ưu định dạng giao diện chuyên nghiệp cho các Sheet...`)
  try {
    const freshMeta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const formatReqs = []

    freshMeta.data.sheets?.forEach((sheet) => {
      const sId = sheet.properties?.sheetId
      // Đóng băng (Freeze) hàng đầu tiên
      formatReqs.push({
        updateSheetProperties: {
          properties: {
            sheetId: sId,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      })
    })

    if (formatReqs.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: formatReqs },
      })
      console.log('   ✅ Đã cố định dòng tiêu đề (Freeze Header row) cho tất cả các tab.')
    }
  } catch (fmtErr) {
    console.warn('   ⚠️ Không thể định dạng thêm (bỏ qua):', fmtErr.message)
  }

  console.log('\n=============================================================================')
  console.log('🎉 ĐỒNG BỘ GOOGLE SHEETS HOÀN TẤT 100% THÀNH CÔNG!')
  console.log(`   1. Tab "${TAB_CATALOG}": ${products.length} mẫu pyjama thiết kế với đầy đủ thông số`)
  console.log(`   2. Tab "${TAB_ORDERS}": ${orderRows.length - 1} đơn hàng thu thập từ website`)
  console.log(`   3. Tab "${TAB_ORDER_PRODUCTS}": ${productRows.length - 1} sản phẩm pyjama trong đơn hàng`)
  console.log('=============================================================================')
}

syncAll().catch((err) => {
  console.error('❌ Lỗi đồng bộ Google Sheets:', err)
  process.exit(1)
})
