#!/usr/bin/env node
/**
 * scripts/audit-auth-accounts.mjs
 * Script KIỂM TOÁN CHỈ ĐỌC (READ-ONLY) dữ liệu tài khoản khách hàng
 * Đối chiếu tính đồng bộ giữa hai hệ bảng: accounts và users (enterprise_accounts, identities, sessions)
 * Tuân thủ bảo mật: Che dấu PII (mask email), mở Database chế độ readonly = true, không sửa đổi dữ liệu.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Hàm che email an toàn: q***s@domain.com
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

const dataDir = path.resolve(__dirname, '../server/data')
const dbPath = process.env.ACCOUNT_DB_FILE || path.resolve(dataDir, 'accounts.db')

if (!fs.existsSync(dbPath)) {
  console.log(`ℹ️ Không tìm thấy database tại ${dbPath}. Bỏ qua kiểm toán.`)
  process.exit(0)
}

// MỞ DATABASE CHẾ ĐỘ CHỈ ĐỌC (READONLY = TRUE)
const db = new Database(dbPath, { readonly: true })

console.log('='.repeat(70))
console.log('🔍 BÁO CÁO KIỂM TOÁN HỆ THỐNG TÀI KHOẢN KHÁCH HÀNG (READ-ONLY AUDIT)')
console.log(`📁 Đường dẫn Database: ${dbPath}`)
console.log(`⏰ Thời điểm kiểm toán: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)
console.log('='.repeat(70))

try {
  // 1. Thống kê tổng quan số lượng bản ghi
  const countAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count
  let countUsers = 0
  let countEntAccounts = 0
  let countIdentities = 0
  let countEntSessions = 0
  let countCustomerSessions = 0

  try { countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count } catch (_) {}
  try { countEntAccounts = db.prepare('SELECT COUNT(*) as count FROM enterprise_accounts').get().count } catch (_) {}
  try { countIdentities = db.prepare('SELECT COUNT(*) as count FROM account_identities').get().count } catch (_) {}
  try { countEntSessions = db.prepare('SELECT COUNT(*) as count FROM enterprise_sessions WHERE is_revoked = 0').get().count } catch (_) {}
  try { countCustomerSessions = db.prepare('SELECT COUNT(*) as count FROM customer_sessions WHERE revoked_at IS NULL').get().count } catch (_) {}

  console.log('\n📊 1. THỐNG KÊ TỔNG QUAN:')
  console.log(`   - Bảng accounts (Cổ điển/Khách hàng):  ${countAccounts} bản ghi`)
  console.log(`   - Bảng users (Doanh nghiệp/Argon2id):    ${countUsers} bản ghi`)
  console.log(`   - Bảng enterprise_accounts (OAuth map):  ${countEntAccounts} bản ghi`)
  console.log(`   - Bảng account_identities (Identities):  ${countIdentities} bản ghi`)
  console.log(`   - Phiên hoạt động (enterprise_sessions): ${countEntSessions} phiên`)
  console.log(`   - Phiên hoạt động (customer_sessions):   ${countCustomerSessions} phiên`)

  // 2. Rà soát tài khoản chỉ có trong users mà chưa có trong accounts (H3)
  let missingInAccounts = []
  if (countUsers > 0) {
    missingInAccounts = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.created_at
      FROM users u
      LEFT JOIN accounts a ON LOWER(u.email) = LOWER(a.email) OR u.id = a.id
      WHERE a.id IS NULL AND u.email IS NOT NULL
    `).all()
  }

  console.log('\n🔎 2. ĐỐI CHIẾU USERS → ACCOUNTS (Nguy cơ H3):')
  if (missingInAccounts.length === 0) {
    console.log('   ✅ Toàn bộ tài khoản users đều có bản ghi tương ứng trong accounts.')
  } else {
    console.log(`   ⚠️ Tìm thấy ${missingInAccounts.length} tài khoản trong users chưa đồng bộ sang accounts:`)
    missingInAccounts.slice(0, 10).forEach((u, i) => {
      console.log(`      ${i + 1}. ID: ${maskId(u.id)} | Email: ${maskEmail(u.email)} | Tạo lúc: ${u.created_at}`)
    })
    if (missingInAccounts.length > 10) {
      console.log(`      ... và ${missingInAccounts.length - 10} tài khoản khác.`)
    }
  }

  // 3. Rà soát tài khoản chỉ có trong accounts mà chưa có trong users
  let missingInUsers = []
  if (countUsers > 0) {
    missingInUsers = db.prepare(`
      SELECT a.id, a.email, a.full_name, a.method, a.created_at
      FROM accounts a
      LEFT JOIN users u ON LOWER(a.email) = LOWER(u.email) OR a.id = u.id
      WHERE u.id IS NULL AND a.email IS NOT NULL AND a.id != 'system'
    `).all()
  }

  console.log('\n🔎 3. ĐỐI CHIẾU ACCOUNTS → USERS:')
  if (missingInUsers.length === 0) {
    console.log('   ✅ Toàn bộ tài khoản accounts đều có bản ghi tương ứng trong users.')
  } else {
    console.log(`   ⚠️ Tìm thấy ${missingInUsers.length} tài khoản trong accounts chưa đồng bộ sang users:`)
    missingInUsers.slice(0, 10).forEach((a, i) => {
      console.log(`      ${i + 1}. ID: ${maskId(a.id)} | Email: ${maskEmail(a.email)} | Provider: ${a.method}`)
    })
    if (missingInUsers.length > 10) {
      console.log(`      ... và ${missingInUsers.length - 10} tài khoản khác.`)
    }
  }

  // 4. Rà soát tài khoản Google / Facebook không có subject/identity
  const oauthWithoutSubject = db.prepare(`
    SELECT id, email, method, google_id, facebook_id
    FROM accounts
    WHERE (method = 'google' AND (google_id IS NULL OR google_id = ''))
       OR (method = 'facebook' AND (facebook_id IS NULL OR facebook_id = ''))
  `).all()

  console.log('\n🔎 4. TÀI KHOẢN OAUTH THIẾU SUBJECT ID:')
  if (oauthWithoutSubject.length === 0) {
    console.log('   ✅ Không có tài khoản OAuth nào bị thiếu Provider Subject ID.')
  } else {
    console.log(`   ⚠️ Tìm thấy ${oauthWithoutSubject.length} tài khoản OAuth thiếu ID:`)
    oauthWithoutSubject.forEach((a) => {
      console.log(`      - ID: ${maskId(a.id)} | Email: ${maskEmail(a.email)} | Method: ${a.method}`)
    })
  }

  // 5. Thống kê trạng thái xác minh email
  const unverifiedAccounts = db.prepare(`
    SELECT COUNT(*) as count FROM accounts WHERE verified = 0 AND email IS NOT NULL AND id != 'system'
  `).get().count

  console.log('\n🛡️ 5. TRẠNG THÁI XÁC THỰC EMAIL:')
  console.log(`   - Tài khoản đã xác minh: ${countAccounts - unverifiedAccounts}`)
  console.log(`   - Tài khoản chưa xác minh: ${unverifiedAccounts}`)

  console.log('\n' + '='.repeat(70))
  console.log('✅ HOÀN TẤT KIỂM TOÁN CHỈ ĐỌC (Không có thay đổi nào đối với cơ sở dữ liệu).')
  console.log('='.repeat(70))
} catch (err) {
  console.error('❌ Lỗi kiểm toán:', err.message)
} finally {
  db.close()
}

