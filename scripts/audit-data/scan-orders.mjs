/**
 * scripts/audit-data/scan-orders.mjs
 * Công cụ kiểm toán & rà soát đơn hàng rác trên local JSON store (R1).
 * MẶC ĐỊNH CHỈ ĐỌC (--dry-run). Không sửa/xóa bất kỳ file nào trừ khi truyền đồng thời:
 *   CONFIRM_ORDER_CLEANUP=YES_ARCHIVE_JUNK node scripts/audit-data/scan-orders.mjs --apply
 * Mọi thông tin cá nhân (SĐT, email, tên) được che giấu tự động khi in báo cáo.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const isApply = args.includes('--apply') && process.env.CONFIRM_ORDER_CLEANUP === 'YES_ARCHIVE_JUNK'
const targetFileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1]
const storeFile = targetFileArg
  ? path.resolve(targetFileArg)
  : path.resolve(rootDir, 'server/data/orders_store.json')

function maskPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '')
  if (clean.length < 4) return '***'
  return `${clean.slice(0, 2)}******${clean.slice(-2)}`
}

function maskEmail(email) {
  if (!email || !String(email).includes('@')) return ''
  const [u, d] = String(email).split('@')
  return `${u.slice(0, 2)}***@${d}`
}

function maskName(name) {
  const s = String(name || '').trim()
  if (!s) return 'Khách'
  const parts = s.split(/\s+/)
  return parts.length === 1 ? `${parts[0][0]}***` : `${parts[0]} *** ${parts[parts.length - 1][0]}*`
}

function isTestOrder(order) {
  const id = String(order.orderId || order.id || '').toUpperCase()
  const email = String(order.customer?.email || order.customerEmail || '').toLowerCase()
  const name = String(order.customer?.fullName || order.customerName || '').toLowerCase()

  if (
    id.startsWith('QNS-ADV-') ||
    id.startsWith('TEST-') ||
    id.startsWith('QNS-VTTEST-') ||
    id.startsWith('QNS-OWNER-TEST-') ||
    id.includes('-TEST-')
  ) {
    return true
  }

  if (
    email.endsWith('@example.com') ||
    email.includes('probe_') ||
    email.includes('adversarial') ||
    name.includes('test user') ||
    name.includes('unittest')
  ) {
    return true
  }

  return false
}

function main() {
  console.log('====================================================================')
  console.log(`🔍 [R1 AUDIT ORDERS] Quét dữ liệu đơn hàng: ${storeFile}`)
  console.log(`   Chế độ: ${isApply ? '⚠️ APPLY (Sẽ sao lưu và lưu trữ tách riêng đơn test)' : '🔒 DRY-RUN (CHỈ ĐỌC)'}`)
  console.log('====================================================================\n')

  if (!fs.existsSync(storeFile)) {
    console.log('ℹ️ File store không tồn tại. Không có dữ liệu để quét.')
    return
  }

  const raw = fs.readFileSync(storeFile, 'utf-8').replace(/^\uFEFF/, '')
  let orders = []
  try {
    orders = JSON.parse(raw || '[]')
  } catch (err) {
    console.error('❌ Lỗi phân tích cú pháp JSON:', err.message)
    process.exit(1)
  }

  if (!Array.isArray(orders)) {
    console.error('❌ Dữ liệu orders_store.json không phải mảng JSON hợp lệ.')
    process.exit(1)
  }

  const now = Date.now()
  const testOrders = []
  const cancelledOrders = []
  const expiredOrders = []
  const staleUnpaidBankOrders = []
  const missingItemsOrders = []
  const validRealOrders = []

  for (const order of orders) {
    if (!order || !(order.orderId || order.id)) continue
    const status = String(order.status || 'PENDING').toUpperCase()
    const payStatus = String(order.paymentStatus || order.payment?.status || '').toUpperCase()
    const payMethod = String(order.paymentMethod || order.payment?.method || 'COD').toUpperCase()
    const createdMs = new Date(order.createdAt || order.orderDate || 0).getTime() || 0
    const ageHours = createdMs ? (now - createdMs) / (3600 * 1000) : 0

    if (isTestOrder(order)) {
      testOrders.push(order)
    } else if (status === 'CANCELLED') {
      cancelledOrders.push(order)
    } else if (payStatus === 'EXPIRED_TIMEOUT') {
      expiredOrders.push(order)
    } else {
      validRealOrders.push(order)
      if (payMethod === 'BANK_TRANSFER' && (payStatus === 'AWAITING_PAYMENT' || payStatus === 'RECONCILING') && ageHours > 24) {
        staleUnpaidBankOrders.push(order)
      }
      if (!Array.isArray(order.items) || order.items.length === 0) {
        missingItemsOrders.push(order)
      }
    }
  }

  console.log(`📊 TỔNG QUAN PHÂN LOẠI (${orders.length} bản ghi):`)
  console.log(`  ✅ Đơn hàng thật hợp lệ (active/completed): ${validRealOrders.length}`)
  console.log(`  🧪 Đơn hàng test (TEST/ADV/example.com)  : ${testOrders.length}`)
  console.log(`  🚫 Đơn đã hủy (CANCELLED)                : ${cancelledOrders.length}`)
  console.log(`  ⌛ Đơn hết hạn VietQR (EXPIRED_TIMEOUT)  : ${expiredOrders.length}`)
  console.log(`  ⚠️ Đơn CK chờ thanh toán quá 24h         : ${staleUnpaidBankOrders.length}`)
  console.log(`  ❗ Đơn thiếu danh sách sản phẩm (items)   : ${missingItemsOrders.length}`)

  if (testOrders.length > 0) {
    console.log('\n🧪 MẪU ĐƠN TEST PHÁT HIỆN (Tối đa 10 dòng đầu, đã che PII):')
    testOrders.slice(0, 10).forEach((o) => {
      console.log(
        `  - ${o.orderId} | ${o.status || 'N/A'} | ${maskName(o.customer?.fullName)} | ${maskPhone(o.customer?.phone)} | ${maskEmail(o.customer?.email)} | ${(o.total || 0).toLocaleString()}đ`
      )
    })
  }

  if (staleUnpaidBankOrders.length > 0) {
    console.log('\n⚠️ ĐƠN CHUYỂN KHOẢN TREO QUÁ 24H (Cần đối soát / rà soát):')
    staleUnpaidBankOrders.slice(0, 10).forEach((o) => {
      console.log(
        `  - ${o.orderId} | ${o.status} / ${o.paymentStatus || o.payment?.status} | ${maskPhone(o.customer?.phone)} | ${(o.total || 0).toLocaleString()}đ`
      )
    })
  }

  if (!isApply) {
    console.log('\n🔒 KẾT THÚC CHẾ ĐỘ CHỈ-ĐỌC (--dry-run). Không có dữ liệu nào bị thay đổi.')
    if (testOrders.length > 0) {
      console.log('💡 Để tách lưu trữ riêng đơn TEST (giữ nguyên toàn bộ đơn thật & đơn hủy lịch sử), chạy:')
      console.log('   CONFIRM_ORDER_CLEANUP=YES_ARCHIVE_JUNK node scripts/audit-data/scan-orders.mjs --apply')
    }
    return
  }

  // CHẾ ĐỘ APPLY: Sao lưu bắt buộc trước khi tách lưu trữ đơn test
  if (testOrders.length === 0) {
    console.log('\n✅ Không có đơn TEST nào cần dọn dẹp.')
    return
  }

  const backupDir = path.resolve(path.dirname(storeFile), 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `orders_store_pre_cleanup_${ts}.json`)
  const archiveTestPath = path.join(backupDir, `archived_test_orders_${ts}.json`)

  fs.writeFileSync(backupPath, raw, 'utf-8')
  fs.writeFileSync(archiveTestPath, JSON.stringify(testOrders, null, 2), 'utf-8')

  const testIds = new Set(testOrders.map((o) => o.orderId || o.id))
  const remainingOrders = orders.filter((o) => o && !testIds.has(o.orderId || o.id))

  const tmpTarget = `${storeFile}.${ts}.tmp`
  fs.writeFileSync(tmpTarget, JSON.stringify(remainingOrders, null, 2), 'utf-8')
  fs.renameSync(tmpTarget, storeFile)

  console.log(`\n✅ Đã sao lưu toàn bộ bản gốc tại: ${backupPath}`)
  console.log(`📦 Đã lưu trữ ${testOrders.length} đơn test tại: ${archiveTestPath}`)
  console.log(`💾 Số lượng đơn còn lại trong ${path.basename(storeFile)}: ${remainingOrders.length}`)
  console.log('ℹ️ Lưu ý: Bản ghi tương ứng (nếu có) trong bảng `orders` của SQLite (accounts.db) được giữ nguyên để đối chiếu; chỉ archival JSON store được tách.')
}

main()

