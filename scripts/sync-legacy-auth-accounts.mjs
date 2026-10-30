#!/usr/bin/env node
/**
 * scripts/sync-legacy-auth-accounts.mjs
 * Kịch bản di chuyển & đồng bộ dữ liệu tài khoản cũ (1 lần) giữa hai hệ bảng: accounts và users.
 * 
 * Quy tắc an toàn:
 * - Chế độ MẶC ĐỊNH: Dry-run (CHỈ XEM, KHÔNG GHI).
 * - Cờ --apply: Thực hiện đồng bộ trong Transaction SQLite nguyên tử.
 * - Che giấu PII (email dạng q***s@domain.com).
 * - Tuyệt đối KHÔNG xóa (DROP), KHÔNG ghi đè dữ liệu đang có.
 * 
 * Cách chạy:
 *   node scripts/sync-legacy-auth-accounts.mjs           # Kiểm tra trước (Dry-run)
 *   node scripts/sync-legacy-auth-accounts.mjs --apply   # Áp dụng đồng bộ thực tế
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[KHÔNG CÓ EMAIL]'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visibleLen = Math.min(2, local.length)
  const maskedLocal = local.slice(0, visibleLen) + '***' + (local.length > 3 ? local.slice(-1) : '')
  return `${maskedLocal}@${domain}`
}

function maskId(id) {
  if (!id) return '[NULL]'
  const str = String(id)
  if (str.length <= 8) return str
  return `${str.slice(0, 4)}...${str.slice(-4)}`
}

const isApply = process.argv.includes('--apply')
const dataDir = path.resolve(__dirname, '../server/data')
const dbPath = process.env.ACCOUNT_DB_FILE || path.resolve(dataDir, 'accounts.db')

if (!fs.existsSync(dbPath)) {
  console.log(`ℹ️ Không tìm thấy database tại ${dbPath}. Dừng kịch bản.`)
  process.exit(0)
}

const db = new Database(dbPath, { readonly: !isApply })
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

console.log('='.repeat(70))
console.log(`🔄 KỊCH BẢN ĐỒNG BỘ TÀI KHOẢN CŨ QUANNGUYENS (CHẾ ĐỘ: ${isApply ? '⚡ ÁP DỤNG THỰC TẾ (--apply)' : '🔍 KIỂM TRA TRƯỚC (DRY-RUN)'})`)
console.log(`📁 Cơ sở dữ liệu: ${dbPath}`)
console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)
console.log('='.repeat(70))

try {
  // 1. Tìm các tài khoản có trong users nhưng chưa có trong accounts
  const missingInAccounts = db.prepare(`
    SELECT u.*
    FROM users u
    LEFT JOIN accounts a ON LOWER(u.email) = LOWER(a.email) OR u.id = a.id
    WHERE a.id IS NULL AND u.email IS NOT NULL
  `).all()

  console.log(`\n📋 1. Tài khoản có trong 'users' nhưng thiếu trong 'accounts': ${missingInAccounts.length} tài khoản`)
  missingInAccounts.forEach((u, i) => {
    console.log(`   ${i + 1}. ID: ${maskId(u.id)} | Email: ${maskEmail(u.email)} | Họ tên: ${u.full_name}`)
  })

  // 2. Tìm các tài khoản có trong accounts nhưng chưa có trong users
  const missingInUsers = db.prepare(`
    SELECT a.*
    FROM accounts a
    LEFT JOIN users u ON LOWER(a.email) = LOWER(u.email) OR a.id = u.id
    WHERE u.id IS NULL AND a.email IS NOT NULL AND a.id != 'system'
  `).all()

  console.log(`\n📋 2. Tài khoản có trong 'accounts' nhưng thiếu trong 'users': ${missingInUsers.length} tài khoản`)
  missingInUsers.forEach((a, i) => {
    console.log(`   ${i + 1}. ID: ${maskId(a.id)} | Email: ${maskEmail(a.email)} | Provider: ${a.method}`)
  })

  if (!isApply) {
    console.log('\n' + '='.repeat(70))
    console.log('💡 GHI CHÚ CHẾ ĐỘ DRY-RUN:')
    console.log('   - Cơ sở dữ liệu hoàn toàn KHÔNG bị thay đổi.')
    console.log('   - Để thực hiện đồng bộ thực tế vào database, hãy chạy:')
    console.log('     node scripts/sync-legacy-auth-accounts.mjs --apply')
    console.log('='.repeat(70))
  } else {
    // THỰC HIỆN ĐỒNG BỘ TRONG TRANSACTION
    const syncTransaction = db.transaction(() => {
      let insertedAccounts = 0
      let insertedUsers = 0
      const now = new Date().toISOString()

      // Insert vào accounts
      const insAccount = db.prepare(`
        INSERT OR IGNORE INTO accounts (
          id, method, email, phone, full_name, avatar_url, verified, marketing_email_opt_in, status, created_at, updated_at
        ) VALUES (?, 'local', ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `)

      for (const u of missingInAccounts) {
        insAccount.run(
          u.id,
          u.email.toLowerCase().trim(),
          u.phone || null,
          u.full_name || 'Quý khách',
          u.avatar_url || null,
          u.verified ? 1 : 0,
          u.marketing_email_opt_in ? 1 : 0,
          u.created_at || now,
          now
        )
        insertedAccounts++
      }

      // Insert vào users
      const insUser = db.prepare(`
        INSERT OR IGNORE INTO users (
          id, email, full_name, avatar_url, phone, role, status, verified, marketing_email_opt_in, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'customer', 'active', ?, ?, ?, ?)
      `)

      for (const a of missingInUsers) {
        insUser.run(
          a.id,
          a.email.toLowerCase().trim(),
          a.full_name || 'Quý khách',
          a.avatar_url || null,
          a.phone || null,
          a.verified ? 1 : 0,
          a.marketing_email_opt_in ? 1 : 0,
          a.created_at || now,
          now
        )
        insertedUsers++
      }

      return { insertedAccounts, insertedUsers }
    })

    const result = syncTransaction()
    console.log('\n' + '='.repeat(70))
    console.log('🎉 ĐỒNG BỘ THÀNH CÔNG (--apply):')
    console.log(`   - Đã đồng bộ sang 'accounts': ${result.insertedAccounts} bản ghi`)
    console.log(`   - Đã đồng bộ sang 'users':    ${result.insertedUsers} bản ghi`)
    console.log('='.repeat(70))
  }
} catch (err) {
  console.error('❌ Lỗi khi thực hiện đồng bộ:', err.message)
} finally {
  db.close()
}

