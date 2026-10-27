import { google } from 'googleapis'
import { orderPersistence } from './orderPersistence.js'

// ── Auth với Google Service Account ─────────────────────
const getAuth = () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Thiếu cấu hình GOOGLE_SERVICE_ACCOUNT_EMAIL hoặc GOOGLE_PRIVATE_KEY trong .env')
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ── Tên các sheet tabs trong file Google Sheets ─────────────────
export const SHEET_TABS = {
  ORDERS: 'Đơn Hàng', // Tab chính — mỗi đơn 1 dòng
  PRODUCTS: 'Chi Tiết SP', // Tab chi tiết sản phẩm trong đơn
  CATALOG: 'Chi Tiết SP Pyjama', // Tab danh mục chi tiết các bộ pyjama của shop
  SUMMARY: 'Tổng Quan',
}

// ── Header row cho sheet ORDERS (26 cột A -> Z) ─────────────────────────
export const ORDER_HEADERS = [
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
  'Tên Sản Phẩm', // L (join nhiều SP bằng " | ")
  'Biến Thể', // M (join)
  'Số Lượng', // N (join)
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

// ── Header row cho sheet PRODUCTS (9 cột A -> I) ───────────────────────
export const PRODUCT_HEADERS = [
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

// ── Header row cho sheet CATALOG (17 cột A -> Q) ───────────────────────
export const CATALOG_HEADERS = [
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

// Chống Formula Injection (CSV/Spreadsheet Formula Injection)
export const sanitizeSheetValue = (val) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (/^[=+@\-\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

// ── Đảm bảo các sheet tabs tồn tại, nếu chưa có thì tự tạo ────────────
export const ensureSheetsExist = async (sheets, spreadsheetId) => {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const existingTitles = (meta.data.sheets || []).map((s) => s.properties?.title)

    const requests = []
    if (!existingTitles.includes(SHEET_TABS.ORDERS)) {
      requests.push({
        addSheet: {
          properties: { title: SHEET_TABS.ORDERS },
        },
      })
    }
    if (!existingTitles.includes(SHEET_TABS.PRODUCTS)) {
      requests.push({
        addSheet: {
          properties: { title: SHEET_TABS.PRODUCTS },
        },
      })
    }
    if (!existingTitles.includes(SHEET_TABS.CATALOG)) {
      requests.push({
        addSheet: {
          properties: { title: SHEET_TABS.CATALOG },
        },
      })
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      })
      console.log(`✅ Đã tự động tạo các tab Google Sheet: ${requests.map(r => r.addSheet.properties.title).join(', ')}`)
    }
  } catch (err) {
    console.warn('⚠️ Lỗi kiểm tra/tạo tab Sheet:', err.message)
  }
}

// ── Khởi tạo sheet (tự động tạo tabs và headers nếu chưa có) ───────────────────
export const initializeSheet = async () => {
  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      throw new Error('Thiếu GOOGLE_SHEET_ID trong file .env')
    }

    // Đảm bảo tab tồn tại
    await ensureSheetsExist(sheets, spreadsheetId)

    // Kiểm tra header sheet ORDERS
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.ORDERS}!A1:Z1`,
    })

    if (!ordersRes.data.values || ordersRes.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_TABS.ORDERS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [ORDER_HEADERS] },
      })
      console.log(`✅ Đã tạo Header cho tab "${SHEET_TABS.ORDERS}"`)
    }

    // Kiểm tra header sheet PRODUCTS
    const productsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.PRODUCTS}!A1:I1`,
    })

    if (!productsRes.data.values || productsRes.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_TABS.PRODUCTS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [PRODUCT_HEADERS] },
      })
      console.log(`✅ Đã tạo Header cho tab "${SHEET_TABS.PRODUCTS}"`)
    }

    // Kiểm tra header sheet CATALOG
    const catalogRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TABS.CATALOG}'!A1:Q1`,
    })

    if (!catalogRes.data.values || catalogRes.data.values.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${SHEET_TABS.CATALOG}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [CATALOG_HEADERS] },
      })
      console.log(`✅ Đã tạo Header cho tab "${SHEET_TABS.CATALOG}"`)
    }
  } catch (error) {
    console.warn('⚠️ Google Sheets initializeSheet note:', error.message)
    throw error
  }
}

// ── Hàm chính: Ghi đơn hàng vào sheet ─────────────────
export const appendOrderToSheet = async (order) => {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = process.env.GOOGLE_SHEET_ID

  if (!spreadsheetId) {
    throw new Error('Thiếu GOOGLE_SHEET_ID trong .env')
  }

  // Tự động kiểm tra / tạo tabs và header nếu chưa có
  try {
    await initializeSheet()
  } catch (initErr) {
    console.warn('⚠️ Google Sheets init check warning:', initErr.message)
  }

  // Tách ngày và giờ theo múi giờ Việt Nam
  const orderDateTime = new Date(order.createdAt || order.orderDate || Date.now())
  const dateStr = orderDateTime.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  const timeStr = orderDateTime.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Join nhiều sản phẩm thành chuỗi cho sheet ORDERS
  const items = Array.isArray(order.items) ? order.items : []
  const itemNames = items.map((i) => i.productName || i.name || 'Sleepwear QuanNguyenS').join(' | ')
  const itemVariants = items.map((i) => i.variant || [i.color || i.colorLabel, i.size].filter(Boolean).join(' - ')).join(' | ')
  const itemQtys = items.map((i) => i.quantity || 1).join(' | ')

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

  // ── Dòng cho sheet ORDERS (1 đơn = 1 dòng tổng hợp 26 cột A -> Z) ──
  const orderRow = [
    order.orderId || order.id || '', // A: Mã Đơn
    dateStr, // B: Ngày Đặt
    timeStr, // C: Giờ Đặt
    customerName, // D: Tên Khách
    phone, // E: Số ĐT
    email, // F: Email
    address, // G: Địa Chỉ
    ward, // H: Phường/Xã
    district, // I: Quận/Huyện
    city, // J: Tỉnh/TP
    fullAddress, // K: Địa Chỉ Đầy Đủ
    itemNames, // L: Tên SP
    itemVariants, // M: Biến Thể
    itemQtys, // N: Số Lượng
    order.subtotal || order.total || 0, // O: Tạm Tính (số)
    order.shippingFee || 0, // P: Phí Ship (số)
    order.discount || 0, // Q: Giảm Giá (số)
    order.voucherCode || '', // R: Mã Voucher
    order.total || 0, // S: Tổng Cộng (số)
    order.payment?.methodLabel || order.payment?.method || order.paymentMethod || 'COD', // T: Phương Thức TT
    order.payment?.status || order.paymentStatus || 'UNPAID', // U: Trạng Thái TT
    order.note || order.adminNote || '', // V: Ghi Chú
    order.status || 'PENDING', // W: Trạng Thái ĐH
    order.source || 'website', // X: Nguồn
    order.trackingCode || order.trackingNumber || '', // Y: Mã Vận Đơn
    order.carrier || '', // Z: Đơn Vị Vận Chuyển
  ]

  // Ghi vào sheet ORDERS
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TABS.ORDERS}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderRow.map(sanitizeSheetValue)] },
  })

  // ── Dòng cho sheet PRODUCTS (1 SP = 1 dòng riêng) ────
  const productRows = items.map((item) => {
    const pName = item.productName || item.name || 'Sleepwear QuanNguyenS'
    const color = item.color || item.colorLabel || (item.variant ? item.variant.split(' - ')[0] : '')
    const size = item.size || (item.variant ? item.variant.split(' - ')[1] : '')
    const qty = Number(item.quantity) || 1
    const unitPrice = Number(item.unitPrice || item.price || 0)
    const totalPrice = Number(item.totalPrice || item.total || unitPrice * qty)

    return [
      order.orderId || order.id || '', // A: Mã Đơn
      dateStr, // B: Ngày Đặt
      customerName, // C: Tên Khách
      pName, // D: Tên SP
      color, // E: Màu Sắc
      size, // F: Size
      qty, // G: Số Lượng
      unitPrice, // H: Đơn Giá
      totalPrice, // I: Thành Tiền
    ]
  })

  if (productRows.length > 0) {
    // Ghi vào sheet PRODUCTS
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TABS.PRODUCTS}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: productRows.map((r) => r.map(sanitizeSheetValue)) },
    })
  }

  // Xóa cache để các truy vấn sau nhận được đơn mới ngay
  invalidateSheetOrdersCache()

  console.log(`✅ Order ${order.orderId || order.id} written to Google Sheets`)
  return { success: true, orderId: order.orderId || order.id }
}

// ── In-Memory Cache & Request Deduplication Cho Sheet Orders ─────────
const SHEET_CACHE_TTL_MS = 60 * 1000 // Cache 60 giây
let sheetOrdersCache = {
  data: null,
  timestamp: 0,
}
let inFlightSheetFetchPromise = null

export const invalidateSheetOrdersCache = () => {
  sheetOrdersCache = { data: null, timestamp: 0 }
}

/**
 * Đọc toàn bộ danh sách đơn hàng từ Google Sheet với cơ chế Cache & Deduplication:
 * - Nếu còn trong TTL (60s): Trả về ngay từ RAM (0 gọi Google Sheets API).
 * - Nếu có nhiều request đồng thời lúc hết hạn cache: Chỉ 1 request duy nhất gọi Google Sheets, các request khác cùng chờ Promise này.
 * - Tự động đồng bộ các đơn mới tìm thấy vào orderPersistence.
 */
export const fetchAllOrdersFromSheetCached = async ({ forceRefresh = false } = {}) => {
  const now = Date.now()
  if (!forceRefresh && sheetOrdersCache.data && now - sheetOrdersCache.timestamp < SHEET_CACHE_TTL_MS) {
    return sheetOrdersCache.data
  }

  if (inFlightSheetFetchPromise) {
    return inFlightSheetFetchPromise
  }

  inFlightSheetFetchPromise = (async () => {
    try {
      const auth = getAuth()
      const sheets = google.sheets({ version: 'v4', auth })
      const spreadsheetId = process.env.GOOGLE_SHEET_ID
      if (!spreadsheetId) return []

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_TABS.ORDERS}!A2:Z`,
      })

      const rows = res.data.values || []
      const parsedOrders = rows
        .filter((r) => r && r[0])
        .map((r) => {
          const orderId = String(r[0]).trim()
          const itemNames = (r[11] || '').split(' | ').map((s) => s.trim()).filter(Boolean)
          const itemVariants = (r[12] || '').split(' | ').map((s) => s.trim())
          const itemQtys = (r[13] || '').split(' | ').map((s) => s.trim())
          const reconstructedItems = itemNames.map((name, idx) => ({
            productName: name,
            variant: itemVariants[idx] || '',
            quantity: Number(itemQtys[idx]) || 1,
          }))

          return {
            orderId,
            id: orderId,
            orderNumber: orderId,
            orderDateVN: `${r[1] || ''} ${r[2] || ''}`.trim(),
            customer: { fullName: r[3] || '', phone: r[4] || '', email: r[5] || '' },
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
            items: reconstructedItems,
            subtotal: Number(r[14]) || 0,
            shippingFee: Number(r[15]) || 0,
            discount: Number(r[16]) || 0,
            voucherCode: r[17] || '',
            total: Number(r[18]) || 0,
            payment: { methodLabel: r[19] || 'COD', status: r[20] || 'UNPAID' },
            paymentMethod: r[19] || 'COD',
            paymentStatus: r[20] || 'UNPAID',
            note: r[21] || '',
            status: r[22] || 'PENDING',
            source: r[23] || 'website',
            trackingCode: r[24] || null,
            trackingNumber: r[24] || null,
            carrier: r[25] || null,
          }
        })

      sheetOrdersCache = {
        data: parsedOrders,
        timestamp: Date.now(),
      }

      // Backfill tự động vào orderPersistence
      const newOrdersToPersist = parsedOrders.filter((o) => !orderPersistence.has(o.orderId))
      if (newOrdersToPersist.length > 0) {
        orderPersistence.setBatch(newOrdersToPersist)
      }

      return parsedOrders
    } catch (err) {
      console.warn('⚠️ Google Sheets fetchAllOrdersFromSheetCached error:', err.message)
      return sheetOrdersCache.data || []
    } finally {
      inFlightSheetFetchPromise = null
    }
  })()

  return inFlightSheetFetchPromise
}

// ── Tra cứu đơn hàng từ Google Sheet theo Mã Đơn hoặc SĐT (Dùng Cache RAM) ──
export const searchOrdersFromSheet = async (query) => {
  const allOrders = await fetchAllOrdersFromSheetCached()
  if (!query || !String(query).trim()) return allOrders

  const q = String(query).trim().toLowerCase()
  const cleanPhone = q.replace(/[^0-9]/g, '')

  return allOrders.filter((order) => {
    const orderId = (order.orderId || '').toLowerCase()
    const phone = (order.customer?.phone || '').replace(/[^0-9]/g, '')
    const name = (order.customer?.fullName || '').toLowerCase()
    return orderId.includes(q) || (cleanPhone && phone.includes(cleanPhone)) || name.includes(q)
  })
}

// ── Lấy danh sách nhiều đơn hàng cùng lúc theo mảng Order IDs (Đọc Sheet 1 lần) ──
export const searchOrdersByIdsFromSheet = async (orderIds = []) => {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return []
  const idSet = new Set(orderIds.map((id) => String(id).trim()).filter(Boolean))
  if (idSet.size === 0) return []

  const allOrders = await fetchAllOrdersFromSheetCached()
  return allOrders.filter((o) => idSet.has(o.orderId) || idSet.has(o.id))
}

// ── Cập nhật trạng thái đơn hàng trên Google Sheet ───────────────
export const updateOrderStatusInSheet = async (orderId, newStatus, note = '', trackingCode = '', carrier = '') => {
  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    if (!spreadsheetId) return

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_TABS.ORDERS}!A:A`,
    })
    const rows = response.data.values || []
    const rowIndex = rows.findIndex((r) => r[0] === orderId)
    if (rowIndex === -1) {
      console.warn(`Sheet: không tìm thấy đơn ${orderId} để cập nhật trạng thái`)
      return
    }

    const rowNumber = rowIndex + 1
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

    const updates = [
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_TABS.ORDERS}!W${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newStatus]] },
      }),
    ]

    if (note) {
      updates.push(
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TABS.ORDERS}!V${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[`${now}: ${note}`]] },
        })
      )
    }

    if (trackingCode) {
      updates.push(
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TABS.ORDERS}!Y${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[trackingCode]] },
        })
      )
    }

    if (carrier) {
      updates.push(
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_TABS.ORDERS}!Z${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[carrier]] },
        })
      )
    }

    const results = await Promise.allSettled(updates)
    const rejected = results.filter((r) => r.status === 'rejected')

    if (rejected.length > 0) {
      const errMsgs = rejected.map((r) => r.reason?.message || 'Lỗi không xác định').join('; ')
      console.error(`❌ [SHEET ERROR] Cập nhật ô cho đơn ${orderId} thất bại:`, errMsgs)
      return { success: false, error: errMsgs }
    }

    invalidateSheetOrdersCache()
    console.log(`✅ Sheet: đơn ${orderId} → ${newStatus}`)
    return { success: true }
  } catch (err) {
    console.error('updateOrderStatusInSheet lỗi:', err.message)
    return { success: false, error: err.message }
  }
}

// ── Đồng bộ danh mục chi tiết sản phẩm Pyjama lên Google Sheet ─────────────────
export const syncProductCatalogToSheet = async () => {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId) throw new Error('Thiếu GOOGLE_SHEET_ID trong .env')

  await ensureSheetsExist(sheets, spreadsheetId)

  const { products } = await import('../../src/data/products.js')
  const catalogRows = [CATALOG_HEADERS]

  products.forEach((p) => {
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
      sanitizeSheetValue(p.id || p.slug),
      sanitizeSheetValue(p.name),
      sanitizeSheetValue(p.subtitle),
      sanitizeSheetValue(p.collection),
      Number(p.price) || 0,
      p.originalPrice ? Number(p.originalPrice) : '',
      p.discount ? Number(p.discount) : 0,
      sanitizeSheetValue(colorLabels),
      sanitizeSheetValue(sizes),
      sanitizeSheetValue(stockDetails.join(' | ')),
      Number(totalStock),
      sanitizeSheetValue(p.fabric),
      sanitizeSheetValue(p.fabricDetail),
      sanitizeSheetValue(p.fengShui?.element ? `${p.fengShui.element} (${p.fengShui.energyNote || ''})` : ''),
      Number(p.rating) || 5.0,
      Number(p.reviewCount) || 0,
      sanitizeSheetValue(link),
    ])
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TABS.CATALOG}'!A1:Q${catalogRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: catalogRows },
  })

  return { success: true, count: products.length }
}

// ── Đồng bộ toàn diện: Cả danh mục Pyjama, Đơn Hàng và Chi Tiết SP ─────────────
export const syncAllToGoogleSheets = async () => {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!spreadsheetId) throw new Error('Thiếu GOOGLE_SHEET_ID trong .env')

  await ensureSheetsExist(sheets, spreadsheetId)

  // 1. Đồng bộ Catalog
  await syncProductCatalogToSheet()

  // 2. Đồng bộ Đơn Hàng & Chi Tiết SP
  const orders = orderPersistence.getAll() || []
  const orderRows = [ORDER_HEADERS]
  const productRows = [PRODUCT_HEADERS]

  orders.forEach((order) => {
    const orderId = order.orderId || order.id || ''
    if (!orderId) return

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

    const items = Array.isArray(order.items) ? order.items : []
    const itemNames = items.map((i) => i.productName || i.name || 'Sleepwear QuanNguyenS').join(' | ')
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

    orderRows.push([
      sanitizeSheetValue(orderId),
      sanitizeSheetValue(dateStr),
      sanitizeSheetValue(timeStr),
      sanitizeSheetValue(customerName),
      sanitizeSheetValue(phone),
      sanitizeSheetValue(email),
      sanitizeSheetValue(address),
      sanitizeSheetValue(ward),
      sanitizeSheetValue(district),
      sanitizeSheetValue(city),
      sanitizeSheetValue(fullAddress),
      sanitizeSheetValue(itemNames),
      sanitizeSheetValue(itemVariants),
      sanitizeSheetValue(itemQtys),
      subtotal,
      shippingFee,
      discount,
      sanitizeSheetValue(voucherCode),
      total,
      sanitizeSheetValue(paymentMethod),
      sanitizeSheetValue(paymentStatus),
      sanitizeSheetValue(note),
      sanitizeSheetValue(status),
      sanitizeSheetValue(source),
      sanitizeSheetValue(trackingCode),
      sanitizeSheetValue(carrier),
    ])

    if (items.length > 0) {
      items.forEach((item) => {
        const pName = item.productName || item.name || 'Sleepwear QuanNguyenS'
        const color = item.color || item.colorLabel || (item.variant ? item.variant.split(' - ')[0] : '')
        const size = item.size || (item.variant ? item.variant.split(' - ')[1] : '')
        const qty = Number(item.quantity) || 1
        const unitPrice = Number(item.unitPrice || item.price || 0)
        const totalPrice = Number(item.totalPrice || item.total || unitPrice * qty)

        productRows.push([
          sanitizeSheetValue(orderId),
          sanitizeSheetValue(dateStr),
          sanitizeSheetValue(customerName),
          sanitizeSheetValue(pName),
          sanitizeSheetValue(color),
          sanitizeSheetValue(size),
          qty,
          unitPrice,
          totalPrice,
        ])
      })
    } else {
      productRows.push([
        sanitizeSheetValue(orderId),
        sanitizeSheetValue(dateStr),
        sanitizeSheetValue(customerName),
        'Sleepwear Cao Cấp QuanNguyenS',
        '',
        '',
        1,
        total,
        total,
      ])
    }
  })

  // Cập nhật tab Đơn Hàng
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TABS.ORDERS}'!A1:Z${orderRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: orderRows },
  })

  // Cập nhật tab Chi Tiết SP
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TABS.PRODUCTS}'!A1:I${productRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: productRows },
  })

  invalidateSheetOrdersCache()

  return {
    success: true,
    ordersSynced: orderRows.length - 1,
    productsSynced: productRows.length - 1,
  }
}


