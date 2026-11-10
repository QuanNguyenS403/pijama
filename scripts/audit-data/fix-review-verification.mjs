import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const dbArg = args.find((a) => a.startsWith('--db='))?.split('=')[1]
const dbPath = dbArg ? path.resolve(dbArg) : (process.env.ACCOUNT_DB_FILE || path.resolve(rootDir, 'server/data/accounts.db'))

const isApply = args.includes('--apply')
const confirmationVar = process.env.CONFIRM_APPLY_REVIEW_FIX

console.log('====================================================================')
console.log('🔍 RÀ SOÁT TÍNH XÁC THỰC MUA HÀNG TRONG ĐÁNH GIÁ (QuanNguyenS)')
console.log(`📁 Đường dẫn Database: ${dbPath}`)
console.log(`⚙️ Chế độ: ${isApply ? '⚠️ APPLY (GHI THẬT)' : '🛡️ DRY-RUN (CHỈ ĐỌC / MẶC ĐỊNH)'}`)
console.log('====================================================================\n')

async function main() {
  if (!fs.existsSync(dbPath)) {
    console.log(`ℹ️ Không tìm thấy database tại ${dbPath}. Thoát an toàn.`)
    process.exit(0)
  }

  if (isApply && confirmationVar !== 'I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE') {
    console.error('🛑 [TỪ CHỐI THỰC THI] Thiếu biến xác nhận CONFIRM_APPLY_REVIEW_FIX="I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE".')
    console.error('Hệ thống hủy thao tác trước khi mở DB chế độ ghi.')
    process.exit(1)
  }

  // Chỉ mở DB chế độ ghi khi ĐÃ có đủ cờ --apply VÀ biến xác nhận
  const db = new Database(dbPath, { readonly: !isApply })

  try {
    // Tìm các review có verified_purchase = 1 nhưng order_id IS NULL
    const violatingReviews = db.prepare(`
      SELECT id, product_id, display_name, rating, verified_purchase, order_id, source, consent_evidence, created_at
      FROM product_reviews
      WHERE verified_purchase = 1 AND (order_id IS NULL OR trim(order_id) = '')
    `).all()

    console.log(`📊 Tìm thấy ${violatingReviews.length} đánh giá có verified_purchase = 1 nhưng thiếu mã đơn hàng đối chiếu:\n`)

    violatingReviews.forEach((r, idx) => {
      console.log(`[#${idx + 1}] ID: ${r.id} | SP: ${r.product_id} | Người viết: ${r.display_name}`)
      console.log(`     Nguồn: ${r.source} | Bằng chứng: ${r.consent_evidence || 'KHÔNG CÓ'}`)
      console.log(`     Lý do vi phạm: order_id là NULL nhưng gắn cờ verified_purchase = 1`)
    })

    // Thống kê theo nguồn gốc
    const sourceStats = db.prepare(`
      SELECT source, 
             COUNT(1) as total,
             SUM(CASE WHEN verified_purchase = 1 THEN 1 ELSE 0 END) as verified_count,
             SUM(CASE WHEN order_id IS NOT NULL AND trim(order_id) != '' THEN 1 ELSE 0 END) as has_order_count,
             SUM(CASE WHEN consent_evidence IS NOT NULL AND trim(consent_evidence) != '' THEN 1 ELSE 0 END) as has_evidence_count
      FROM product_reviews
      GROUP BY source
    `).all()

    console.log('\n--------------------------------------------------------------------')
    console.log('📈 THỐNG KÊ TOÀN DIỆN NGUỒN GỐC ĐÁNH GIÁ (REVIEW PROVENANCE):')
    console.table(sourceStats)
    console.log('--------------------------------------------------------------------\n')

    if (!isApply) {
      console.log('💡 HƯỚNG DẪN CHO QUAN:')
      console.log('Đây là báo cáo mô phỏng (DRY-RUN). Chưa có dữ liệu nào bị thay đổi.')
      console.log('Nếu Quân muốn cập nhật các đánh giá trên về verified_purchase = 0 để đảm bảo tính chuẩn xác:')
      console.log('  1. Đặt biến xác nhận: $env:CONFIRM_APPLY_REVIEW_FIX="I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE"')
      console.log('  2. Chạy lệnh: node scripts/audit-data/fix-review-verification.mjs --apply')
    } else {
      if (confirmationVar !== 'I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE') {
        console.error('🛑 [TỪ CHỐI THỰC THI] Thiếu biến xác nhận CONFIRM_APPLY_REVIEW_FIX="I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE".')
        console.error('Hệ thống hủy thao tác để bảo vệ dữ liệu.')
        process.exit(1)
      }

      if (violatingReviews.length === 0) {
        console.log('✅ Không có dòng nào vi phạm. Không cần cập nhật.')
        process.exit(0)
      }

      // Tạo bản sao lưu WAL-safe bằng SQLite Online Backup API trước khi ghi
      const backupDir = path.resolve(path.dirname(dbPath), 'backups')
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
      const backupFile = path.resolve(backupDir, `accounts_pre_review_fix_${Date.now()}.db`)
      await db.backup(backupFile)
      console.log(`📦 Đã tạo bản sao lưu an toàn (db.backup) tại: ${backupFile}`)

      // Thực hiện cập nhật
      const info = db.prepare(`
        UPDATE product_reviews
        SET verified_purchase = 0
        WHERE verified_purchase = 1 AND (order_id IS NULL OR trim(order_id) = '')
      `).run()

      console.log(`\n🎉 [THÀNH CÔNG] Đã cập nhật ${info.changes} đánh giá về verified_purchase = 0!`)
    }
  } finally {
    db.close()
  }
}

main().catch((err) => {
  console.error('❌ Lỗi audit review verification:', err)
  process.exit(1)
})
