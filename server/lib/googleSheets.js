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
  const orderDateTime = new Date(order.orderDate || Date.now())
  const dateStr = orderDateTime.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  const timeStr = orderDateTime.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Join nhiều sản phẩm thành chuỗi cho sheet ORDERS
  const itemNames = (order.items || []).map((i) => i.productName).join(' | ')
  const itemVariants = (order.items || []).map((i) => i.variant).join(' | ')
  const itemQtys = (order.items || []).map((i) => i.quantity).join(' | ')

  // ── Dòng cho sheet ORDERS (1 đơn = 1 dòng tổng hợp 26 cột A -> Z) ──
  const orderRow = [
    order.orderId, // A: Mã Đơn
    dateStr, // B: Ngày Đặt
    timeStr, // C: Giờ Đặt
    order.customer?.fullName || '', // D: Tên Khách
    order.customer?.phone || '', // E: Số ĐT
    order.customer?.email || '', // F: Email
    order.shipping?.address || '', // G: Địa Chỉ
    order.shipping?.ward || '', // H: Phường/Xã
    order.shipping?.district || '', // I: Quận/Huyện
    order.shipping?.city || '', // J: Tỉnh/TP
    order.shipping?.fullAddress || '', // K: Địa Chỉ Đầy Đủ
    itemNames, // L: Tên SP
    itemVariants, // M: Biến Thể
    itemQtys, // N: Số Lượng
    order.subtotal || 0, // O: Tạm Tính (số)
    order.shippingFee || 0, // P: Phí Ship (số)
    order.discount || 0, // Q: Giảm Giá (số)
    order.voucherCode || '', // R: Mã Voucher
    order.total || 0, // S: Tổng Cộng (số)
    order.payment?.methodLabel || order.payment?.method || '', // T: Phương Thức TT
    order.payment?.status || 'UNPAID', // U: Trạng Thái TT
    order.note || '', // V: Ghi Chú
    order.status || 'PENDING', // W: Trạng Thái ĐH
    order.source || 'website', // X: Nguồn
    order.trackingCode || '', // Y: Mã Vận Đơn
    order.carrier || '', // Z: Đơn Vị Vận Chuyển
  ]

  // Ghi vào sheet ORDERS
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TABS.ORDERS}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderRow] },
  })

  // ── Dòng cho sheet PRODUCTS (1 SP = 1 dòng riêng) ────
  const productRows = (order.items || []).map((item) => [
    order.orderId, // A: Mã Đơn
    dateStr, // B: Ngày Đặt
    order.customer?.fullName || '', // C: Tên Khách
    item.productName, // D: Tên SP
    item.color || '', // E: Màu Sắc
    item.size || '', // F: Size
    item.quantity, // G: Số Lượng
    item.unitPrice, // H: Đơn Giá
    item.totalPrice, // I: Thành Tiền
  ])

  if (productRows.length > 0) {
    // Ghi vào sheet PRODUCTS
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TABS.PRODUCTS}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: productRows },
    })
  }

  // Xóa cache để các truy vấn sau nhận được đơn mới ngay
  invalidateSheetOrdersCache()

  console.log(`✅ Order ${order.orderId} written to Google Sheets`)
  return { success: true, orderId: order.orderId }
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

    await Promise.allSettled(updates)
    invalidateSheetOrdersCache()
    console.log(`✅ Sheet: đơn ${orderId} → ${newStatus}`)
  } catch (err) {
    console.error('updateOrderStatusInSheet lỗi:', err.message)
  }
}

