import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function requestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || (body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data })
        } catch (err) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data, parseError: err.message })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

const results = []
function record(item, name, passed, detail = '') {
  results.push({ item, name, passed, detail })
  const icon = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${icon} [Mục ${item}] ${name}${detail ? ` -> ${detail}` : ''}`)
}

async function runAudit() {
  console.log('=====================================================================')
  console.log('🔍 BẮT ĐẦU RÀ SOÁT TOÀN DIỆN 8 MỤC YÊU CẦU CỦA KHÁCH HÀNG')
  console.log('=====================================================================\n')

  const baseUrl = 'http://localhost:3001'

  // --- MỤC 1: ĐƠN VỊ GIAO HÀNG VIETTEL POST ---
  try {
    const configPath = path.join(rootDir, 'src', 'data', 'checkoutConfig.js')
    const configContent = fs.readFileSync(configPath, 'utf8')
    const hasDefaultViettelPost = configContent.includes('DEFAULT_CARRIER = "Viettel Post"')
    record(1, 'Cấu hình đơn vị vận chuyển mặc định là Viettel Post', hasDefaultViettelPost)
  } catch (err) {
    record(1, 'Cấu hình đơn vị vận chuyển mặc định', false, err.message)
  }

  // --- MỤC 2: BÁN KÍNH 30KM & CHUYỂN VIETQR & ĐỔI TÊN TAB ---
  try {
    // 2.1 Test gần (Hà Nội <= 30km)
    const nearRes = await requestJson(`${baseUrl}/api/shipping/check-cod`, { method: 'POST' }, {
      address: '622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
    })
    const isCodNear = nearRes.data?.isCodAllowed ?? nearRes.data?.codAllowed
    const nearPassed = nearRes.status === 200 && isCodNear === true && nearRes.data?.distanceKm <= 30
    record(2, 'Kiểm tra địa chỉ <= 30km Amber Riverside (COD Hợp lệ)', nearPassed, `Dist: ${nearRes.data?.distanceKm}km, COD: ${isCodNear}`)

    // 2.2 Test xa (Sài Gòn > 30km)
    const farRes = await requestJson(`${baseUrl}/api/shipping/check-cod`, { method: 'POST' }, {
      address: 'Phường Bến Nghé, Quận 1, TP Hồ Chí Minh',
    })
    const isCodFar = farRes.data?.isCodAllowed ?? farRes.data?.codAllowed
    const farPassed = farRes.status === 200 && isCodFar === false && (farRes.data?.fallbackMethod === 'BANK_TRANSFER' || farRes.data?.fallbackMethod === 'VIETQR')
    record(2, 'Kiểm tra địa chỉ > 30km (Từ chối COD, chuyển sang VietQR)', farPassed, `Dist: ${farRes.data?.distanceKm}km, COD: ${isCodFar}, Fallback: ${farRes.data?.fallbackMethod}`)

    // 2.3 Test chặn đặt hàng COD nếu > 30km từ server
    const badOrderRes = await requestJson(`${baseUrl}/api/orders/submit`, { method: 'POST' }, {
      orderId: `AUDIT-COD-${Date.now()}`,
      customer: {
        fullName: 'Khách Hàng Xa',
        phone: '0912345678',
        email: 'audit.khachxa@gmail.com',
        address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh',
      },
      shipping: {
        address: 'Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
        city: 'TP Hồ Chí Minh',
      },
      payment: { method: 'COD' },
      items: [{
        productId: 'the-classic-set',
        productName: 'THE DAYBREAK SET',
        unitPrice: 390000,
        price: 390000,
        quantity: 2,
        color: 'Sọc Hồng',
        size: 'M',
      }],
      subtotal: 780000,
      shippingFee: 0,
      total: 780000,
    })
    const badOrderBlocked = badOrderRes.status === 400 && badOrderRes.data?.code === 'COD_DISTANCE_EXCEEDED'
    record(2, 'Server chặn nghiêm ngặt đơn COD vượt bán kính 30km', badOrderBlocked, `Status: ${badOrderRes.status}, Error Code: ${badOrderRes.data?.code}`)

    // 2.4 Kiểm tra tên các mục UI
    const drawerPath = path.join(rootDir, 'src', 'components', 'ui', 'OrdersHistoryDrawer.jsx')
    const drawerContent = fs.readFileSync(drawerPath, 'utf8')
    const hasCorrectTabNames = drawerContent.includes('Đơn hàng của bạn') && drawerContent.includes('Theo dõi đơn hàng')
    record(2, 'Đổi tên "Đơn hàng của bạn" và "Theo dõi đơn hàng"', hasCorrectTabNames)
  } catch (err) {
    record(2, 'Bán kính 30km & Naming', false, err.message)
  }

  // --- MỤC 3: KHÔNG XÓA ĐƠN KHI ĐÃ GIAO (DELIVERED) ---
  try {
    const { orderPersistence } = await import('../server/lib/orderPersistence.js')
    const testOrderId = `TEST-AUDIT-${Date.now()}`
    orderPersistence.set(testOrderId, {
      id: testOrderId,
      orderCode: testOrderId,
      status: 'DELIVERED',
      items: [{ id: 'p-1', name: 'Pijama Test', quantity: 1, price: 300000 }],
      total: 300000,
      customer: { name: 'Audit User', phone: '0988888888' },
    })

    // Cố tình xóa
    const deleteAttempt = orderPersistence.delete(testOrderId)
    const orderAfterDelete = orderPersistence.get(testOrderId)
    const deletionBlocked = deleteAttempt === false && orderAfterDelete !== null && orderAfterDelete.status === 'DELIVERED'
    record(3, 'Cấm xóa đơn hàng đã giao thành công (DELIVERED)', deletionBlocked, `Delete result: ${deleteAttempt}, Còn trong store: ${Boolean(orderAfterDelete)}`)

    // Cố tình cập nhật với items rỗng
    orderPersistence.set(testOrderId, {
      id: testOrderId,
      status: 'DELIVERED',
      items: [], // trống
    })
    const preservedOrder = orderPersistence.get(testOrderId)
    const itemsPreserved = Array.isArray(preservedOrder.items) && preservedOrder.items.length > 0
    record(3, 'Bảo toàn nội dung sản phẩm của đơn khi có cập nhật', itemsPreserved, `Số sản phẩm còn: ${preservedOrder.items.length}`)
  } catch (err) {
    record(3, 'Bảo toàn đơn hàng DELIVERED', false, err.message)
  }

  // --- MỤC 4: TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI VIETTEL POST SANG ĐÃ GIAO ---
  try {
    const { syncSingleOrderWithViettelPost } = await import('../server/lib/viettelPostService.js')
    const { orderPersistence } = await import('../server/lib/orderPersistence.js')

    const syncOrderId = `TEST-SYNC-${Date.now()}`
    orderPersistence.set(syncOrderId, {
      id: syncOrderId,
      orderCode: syncOrderId,
      status: 'SHIPPED',
      trackingCode: 'VT999999DELIVERED',
      carrier: 'Viettel Post',
      items: [{ id: 'p-2', name: 'Pijama Lụa Xanh', quantity: 1, price: 450000 }],
      total: 450000,
      customer: { name: 'Người nhận ViettelPost', phone: '0977112233' },
    })

    const syncResult = await syncSingleOrderWithViettelPost(syncOrderId)
    const syncedOrder = orderPersistence.get(syncOrderId)
    const autoDelivered = syncedOrder.status === 'DELIVERED' && (syncResult.delivered === true || syncResult.status === 'DELIVERED')
    record(4, 'Admin tự động đồng bộ hành trình Viettel Post sang DELIVERED', autoDelivered, `Status: ${syncedOrder.status}, Delivered: ${syncResult.delivered}`)
  } catch (err) {
    record(4, 'Tự động đồng bộ Viettel Post', false, err.message)
  }

  // --- MỤC 5: MỤC ĐỊA CHỈ BÊN CẠNH MỤC SẢN PHẨM TRONG ADMIN ---
  try {
    const adminOrdersPath = path.join(rootDir, 'src', 'pages', 'admin', 'AdminOrdersPage.jsx')
    const adminOrdersContent = fs.readFileSync(adminOrdersPath, 'utf8')
    const productIdx = adminOrdersContent.indexOf('Sản phẩm')
    const addressIdx = adminOrdersContent.indexOf('Địa chỉ nhận')
    const isAdjacent = productIdx !== -1 && addressIdx !== -1 && addressIdx > productIdx && (addressIdx - productIdx < 300)
    record(5, 'Cột Địa chỉ nằm ngay bên cạnh cột Sản phẩm trong trang Quản lý đơn hàng Admin', isAdjacent, `Khoảng cách code: ${addressIdx - productIdx} chars`)
  } catch (err) {
    record(5, 'Cột Địa chỉ trong Admin', false, err.message)
  }

  // --- MỤC 6 & 7: DỌN DẸP CHỮ THỪA & VIETTEL POST TRACKER ---
  try {
    const trackerPath = path.join(rootDir, 'src', 'components', 'shipping', 'ViettelPostTracker.jsx')
    const trackerContent = fs.readFileSync(trackerPath, 'utf8')
    const drawerPath = path.join(rootDir, 'src', 'components', 'ui', 'OrdersHistoryDrawer.jsx')
    const drawerContent = fs.readFileSync(drawerPath, 'utf8')

    const hasViettelPostApiText = trackerContent.includes('Viettel Post API') || drawerContent.includes('Viettel Post API')
    const hasStrictOrderRequirement = drawerContent.includes('Mục này chỉ dành để tra cứu chính xác') && drawerContent.includes('Đơn hàng của bạn')
    record(6, 'Loại bỏ hoàn toàn chữ thừa "Viettel Post API" khỏi giao diện', !hasViettelPostApiText)
    record(7, 'Chỉ cho phép tra cứu mã tracking chính xác được cấp tại "Đơn hàng của bạn"', hasStrictOrderRequirement)
  } catch (err) {
    record(6, 'Dọn dẹp text & Tracker', false, err.message)
  }

  // --- MỤC 8: ĐĂNG NHẬP / ĐĂNG KÝ GOOGLE & FACEBOOK TẠO TÀI KHOẢN RIÊNG VỚI TÊN CHUẨN ---
  try {
    // 8.1 Google Auth
    const testGoogleEmail = `audit.google.${Date.now()}@gmail.com`
    const testGoogleName = 'Nguyễn Văn Google Test'
    const googleRes = await requestJson(`${baseUrl}/api/auth/google`, {}, {
      email: testGoogleEmail,
      name: testGoogleName,
      sub: `google-uid-${Date.now()}`,
      picture: 'https://lh3.googleusercontent.com/a/default-avatar',
    })
    const returnedGoogleName = googleRes.data?.account?.fullName || googleRes.data?.user?.fullName || googleRes.data?.account?.name || googleRes.data?.user?.name
    const googleAuthSuccess = googleRes.status === 200 && googleRes.data?.success === true && returnedGoogleName === testGoogleName
    record(8, 'Tạo tài khoản Google riêng trên hệ thống với đúng tên Google', googleAuthSuccess, `Tên: ${returnedGoogleName}`)

    // 8.2 Facebook Auth
    const testFbId = `fb-uid-${Date.now()}`
    const testFbName = 'Trần Thị Facebook Test'
    const fbRes = await requestJson(`${baseUrl}/api/auth/facebook`, {}, {
      id: testFbId,
      name: testFbName,
      email: `audit.fb.${Date.now()}@facebook.test`,
      picture: { data: { url: 'https://platform-lookaside.fbsbx.com/avatar' } },
    })
    const returnedFbName = fbRes.data?.account?.fullName || fbRes.data?.user?.fullName || fbRes.data?.account?.name || fbRes.data?.user?.name
    const fbAuthSuccess = fbRes.status === 200 && fbRes.data?.success === true && returnedFbName === testFbName
    record(8, 'Tạo tài khoản Facebook riêng trên hệ thống với đúng tên Facebook', fbAuthSuccess, `Tên: ${returnedFbName}`)

    // 8.3 Kiểm tra Database SQLite accounts.db có lưu chuẩn xác không
    const dbPath = path.join(rootDir, 'server', 'data', 'accounts.db')
    const db = new Database(dbPath)
    const googleUserInDb = db.prepare('SELECT * FROM accounts WHERE email = ?').get(testGoogleEmail)
    const hasVouchers = db.prepare('SELECT COUNT(*) as count FROM vouchers WHERE account_id = ?').get(googleUserInDb?.id)?.count > 0
    db.close()
    record(8, 'Lưu trữ tài khoản trong SQLite accounts.db và cấp Voucher 10% + Freeship', Boolean(googleUserInDb) && hasVouchers, `DB Name: ${googleUserInDb?.full_name}, Has Vouchers: ${hasVouchers}`)
  } catch (err) {
    record(8, 'Đăng nhập Google & Facebook', false, err.message)
  }

  console.log('\n=====================================================================')
  const total = results.length
  const passed = results.filter(r => r.passed).length
  console.log(`📊 TỔNG KẾT RÀ SOÁT: ${passed}/${total} MỤC ĐẠT CHUẨN HOÀN TOÀN (${Math.round(passed / total * 100)}%)`)
  console.log('=====================================================================')

  if (passed === total) {
    console.log('🎉 TOÀN BỘ HỆ THỐNG ĐÃ ĐẠT CHUẨN HOÀN HẢO THEO TẤT CẢ YÊU CẦU!')
    process.exit(0)
  } else {
    console.error('⚠️ PHÁT HIỆN VẤN ĐỀ CẦN ĐIỀU CHỈNH!')
    process.exit(1)
  }
}

runAudit().catch(err => {
  console.error('Lỗi khi chạy rà soát:', err)
  process.exit(1)
})
