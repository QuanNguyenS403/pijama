/**
 * scripts/audit-data/scan-db.mjs
 * Công cụ kiểm toán toàn vẹn & sức khỏe cơ sở dữ liệu SQLite (R4).
 * MẶC ĐỊNH CHỈ ĐỌC (readonly: true, --dry-run).
 * Không sửa dữ liệu trừ khi có đồng thời:
 *   CONFIRM_DB_CLEANUP=YES_CLEANUP_EXPIRED_ROWS node scripts/audit-data/scan-db.mjs --apply
 * Luôn tạo bản backup bằng db.backup() trước khi ghi.
 */
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const isApply = args.includes('--apply') && process.env.CONFIRM_DB_CLEANUP === 'YES_CLEANUP_EXPIRED_ROWS'
const targetDbArg = args.find((a) => a.startsWith('--db='))?.split('=')[1]
const csvOutArg = args.find((a) => a.startsWith('--csv='))?.split('=')[1]
const dbPath = targetDbArg
  ? path.resolve(targetDbArg)
  : process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR, 'accounts.db')
    : path.resolve(rootDir, 'server/data/accounts.db')

function maskEmail(email) {
  const s = String(email || '').trim()
  if (!s.includes('@')) return '***'
  const [u, d] = s.split('@')
  return `${u.slice(0, 2)}***@${d}`
}

function maskPhone(phone) {
  const clean = String(phone || '').replace(/\D/g, '')
  if (clean.length < 7) return '***'
  return `${clean.slice(0, 3)}***${clean.slice(-3)}`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getTables(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name)
}

async function main() {
  console.log('====================================================================')
  console.log(`🗄️ [R4 AUDIT SQLITE DB] Kiểm tra CSDL: ${dbPath}`)
  console.log(`   Chế độ: ${isApply ? '⚠️ APPLY (Sẽ backup và dọn các phiên/OTP/token hết hạn)' : '🔒 DRY-RUN (CHỈ ĐỌC - readonly: true)'}`)
  console.log('====================================================================\n')

  if (!fs.existsSync(dbPath)) {
    console.log('ℹ️ File DB chưa tồn tại. Không có dữ liệu để quét.')
    return
  }

  const stat = fs.statSync(dbPath)
  const walPath = `${dbPath}-wal`
  const walSize = fs.existsSync(walPath) ? fs.statSync(walPath).size : 0
  console.log(`📏 Kích thước DB: ${formatBytes(stat.size)}${walSize ? ` (+ WAL: ${formatBytes(walSize)})` : ''}`)

  const roDb = new Database(dbPath, { readonly: true, fileMustExist: true })

  try {
    // 1. Kiểm tra toàn vẹn cấu trúc B-Tree SQLite
    const integrityRows = roDb.pragma('quick_check')
    const integrityOk = integrityRows.length === 1 && integrityRows[0].quick_check === 'ok'
    console.log(`🛡️ Quick Integrity Check: ${integrityOk ? '✅ OK' : `❌ LỖI (${JSON.stringify(integrityRows)})`}`)

    // 2. Kiểm tra khóa ngoại treo (Dangling Foreign Keys)
    const fkViolations = roDb.pragma('foreign_key_check')
    console.log(`🔗 Foreign Key Violations: ${fkViolations.length === 0 ? '✅ Không phát hiện (0)' : `⚠️ Phát hiện ${fkViolations.length} vi phạm!`}`)
    if (fkViolations.length > 0) {
      fkViolations.slice(0, 10).forEach((v) => {
        console.log(`   - Bảng ${v.table} (rowid=${v.rowid}) -> tham chiếu bảng ${v.parent} (fkid=${v.fkid})`)
      })
    }

    // 3. Thống kê số lượng bản ghi theo bảng
    const tables = getTables(roDb)
    console.log(`\n📊 THỐNG KÊ BẢNG DỮ LIỆU (${tables.length} bảng):`)
    for (const t of tables) {
      try {
        const { count } = roDb.prepare(`SELECT COUNT(*) AS count FROM "${t}"`).get()
        console.log(`  - ${t.padEnd(32)}: ${count} bản ghi`)
      } catch (err) {
        console.log(`  - ${t.padEnd(32)}: Lỗi đọc (${err.message})`)
      }
    }

    // 4. Rà soát dữ liệu tạm / hết hạn (Rác dữ liệu)
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const countExpired = (table, whereSql, params = []) => {
      if (!tables.includes(table)) return null
      try {
        return roDb.prepare(`SELECT COUNT(*) AS c FROM "${table}" WHERE ${whereSql}`).get(...params).c
      } catch {
        return null
      }
    }

    console.log('\n🧹 RÀ SOÁT DỮ LIỆU HẾT HẠN / TẠM THỜI:')
    const expiredMetrics = [
      ['customer_sessions (hết hạn)', countExpired('customer_sessions', 'expires_at < ?', [now])],
      ['enterprise_sessions (hết hạn)', countExpired('enterprise_sessions', 'expires_at < ? OR (is_revoked = 1 AND expires_at < ?)', [now, now])],
      ['verification_challenges (>24h / đã dùng)', countExpired('verification_challenges', 'expires_at < ? OR (consumed = 1 AND expires_at < ?)', [oneDayAgo, now])],
      ['verification_codes (>24h / đã dùng)', countExpired('verification_codes', 'expires_at < ? OR (used = 1 AND expires_at < ?)', [oneDayAgo, now])],
      ['pending_registrations (hết hạn)', countExpired('pending_registrations', 'expires_at < ?', [now])],
      ['pending_password_resets (hết hạn)', countExpired('pending_password_resets', 'expires_at < ?', [now])],
      ['active_reset_tokens (hết hạn)', countExpired('active_reset_tokens', 'expires_at < ?', [now])],
      ['admin_revoked_tokens (hết hạn)', countExpired('admin_revoked_tokens', 'expires_at < ?', [now])],
    ]

    let totalCleanable = 0
    for (const [label, c] of expiredMetrics) {
      if (c !== null) {
        totalCleanable += c
        console.log(`  - ${label.padEnd(40)}: ${c}`)
      }
    }

    // 5. Kiểm tra tài khoản/review mẫu & tài khoản test (G9: ent_user_*, otp_*, test_*, unsub_test*, @example.*, 0900000*)
    const syntheticWhereSql = `
      LOWER(COALESCE(email, '')) LIKE 'ent_user_%'
      OR LOWER(COALESCE(email, '')) LIKE 'otp_%'
      OR LOWER(COALESCE(email, '')) LIKE 'test_%'
      OR LOWER(COALESCE(email, '')) LIKE 'unsub_test%'
      OR LOWER(COALESCE(email, '')) LIKE '%probe_%'
      OR LOWER(COALESCE(email, '')) LIKE '%adversarial%'
      OR LOWER(COALESCE(email, '')) LIKE '%@example.%'
      OR LOWER(COALESCE(email, '')) LIKE '%@test.%'
      OR COALESCE(phone, '') LIKE '0900000%'
    `
    const csvRows = ['table,id,masked_email,masked_phone,created_at,reason']

    for (const accTable of ['accounts', 'users']) {
      if (tables.includes(accTable)) {
        const rows = roDb
          .prepare(`SELECT id, email, phone, created_at FROM "${accTable}" WHERE ${syntheticWhereSql}`)
          .all()
        console.log(`\n🧪 Bảng ${accTable} — Bản ghi nghi ngờ dữ liệu thử nghiệm (synthetic): ${rows.length}`)
        rows.slice(0, 10).forEach((r) => {
          console.log(`  - [${accTable}] id=${r.id} | email=${maskEmail(r.email)} | phone=${maskPhone(r.phone)} | created=${r.created_at || ''}`)
        })
        rows.forEach((r) => {
          csvRows.push(`${accTable},${r.id},${maskEmail(r.email)},${maskPhone(r.phone)},${r.created_at || ''},SYNTHETIC_PATTERN`)
        })
      }
    }

    if (csvOutArg && csvRows.length > 1) {
      const csvPath = path.resolve(csvOutArg)
      fs.writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf-8')
      console.log(`\n📄 Đã xuất danh sách nghi ngờ (đã che PII) ra CSV: ${csvPath}`)
    }

    if (tables.includes('product_reviews')) {
      const reviewStats = roDb
        .prepare('SELECT source, verified_purchase, COUNT(*) AS c FROM product_reviews GROUP BY source, verified_purchase')
        .all()
      console.log('\n⭐ PHÂN PHỐI REVIEWS THEO NGUỒN:')
      reviewStats.forEach((r) => {
        console.log(`  - source=${r.source}, verified=${r.verified_purchase}: ${r.c}`)
      })
    }

    if (!isApply) {
      console.log('\n🔒 KẾT THÚC CHẾ ĐỘ CHỈ-ĐỌC (readonly: true). Không có ghi chép nào được thực hiện.')
      if (totalCleanable > 0) {
        console.log(`💡 Có ${totalCleanable} bản ghi hết hạn có thể dọn an toàn. Để chạy dọn dẹp:`)
        console.log('   CONFIRM_DB_CLEANUP=YES_CLEANUP_EXPIRED_ROWS node scripts/audit-data/scan-db.mjs --apply')
      }
      return
    }
  } finally {
    roDb.close()
  }

  // CHẾ ĐỘ APPLY: Sao lưu DB trước khi dọn các phiên/token hết hạn
  const rwDb = new Database(dbPath)
  rwDb.pragma('busy_timeout = 5000')
  rwDb.pragma('foreign_keys = ON')
  try {
    const backupDir = path.resolve(path.dirname(dbPath), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `${path.basename(dbPath, '.db')}_pre_cleanup_${ts}.db`)
    await rwDb.backup(backupFile)
    console.log(`\n📦 Đã sao lưu toàn bộ CSDL SQLite tại: ${backupFile}`)

    const { cleanupExpiredData } = await import('../../server/lib/cleanupService.js')
    const result = cleanupExpiredData({ database: rwDb })
    console.log('✅ Hoàn tất dọn dẹp dữ liệu hết hạn:', result)
  } finally {
    rwDb.close()
  }
}

main().catch((err) => {
  console.error('❌ Lỗi audit SQLite:', err)
  process.exit(1)
})

