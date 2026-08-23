import { google } from 'googleapis'

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

  console.log(`✅ Order ${order.orderId} written to Google Sheets`)
  return { success: true, orderId: order.orderId }
}

// ── Tra cứu đơn hàng từ Google Sheet theo Mã Đơn hoặc SĐT ──
export const searchOrdersFromSheet = async (query) => {
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
    const q = String(query).trim().toLowerCase()
    const cleanPhone = q.replace(/[^0-9]/g, '')

    const matched = rows.filter((row) => {
      const orderId = (row[0] || '').toLowerCase()
      const phone = (row[4] || '').replace(/[^0-9]/g, '')
      const name = (row[3] || '').toLowerCase()
      return orderId.includes(q) || (cleanPhone && phone.includes(cleanPhone)) || name.includes(q)
    })

    return matched.map((r) => ({
      orderId: r[0],
      orderDateVN: `${r[1]} ${r[2]}`.trim(),
      customer: { fullName: r[3], phone: r[4], email: r[5] },
      shipping: { fullAddress: r[10] },
      subtotal: Number(r[14]) || 0,
      shippingFee: Number(r[15]) || 0,
      discount: Number(r[16]) || 0,
      total: Number(r[18]) || 0,
      payment: { methodLabel: r[19], status: r[20] },
      note: r[21],
      status: r[22] || 'PENDING',
      trackingCode: r[24] || null,
      carrier: r[25] || null,
    }))
  } catch (err) {
    console.warn('searchOrdersFromSheet error:', err.message)
    return []
  }
}
