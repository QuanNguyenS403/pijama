import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu trữ database độc lập cho tài khoản & voucher
const dataDir = path.resolve(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.resolve(dataDir, 'accounts.db')
let db = null

export function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }
  return db
}

function initSchema(database) {
  // 1. Bảng tài khoản khách hàng
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      google_id TEXT,
      facebook_id TEXT,
      phone TEXT,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_accounts_google_id ON accounts(google_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_facebook_id ON accounts(facebook_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_phone ON accounts(phone);
    CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
    CREATE INDEX IF NOT EXISTS idx_accounts_verified ON accounts(verified);
  `)

  // 2. Bảng mã xác minh OTP (chống tài khoản rác cho cả Google / Facebook / SĐT)
  database.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      code TEXT NOT NULL,
      target TEXT NOT NULL,
      target_type TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_vcode_account_active ON verification_codes(account_id, used, expires_at);
    CREATE INDEX IF NOT EXISTS idx_vcode_target ON verification_codes(target);
  `)

  // 3. Bảng voucher chào mừng (10% + Freeship cho đơn hàng đầu tiên)
  database.exec(`
    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL DEFAULT 10,
      free_shipping INTEGER NOT NULL DEFAULT 1,
      used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      order_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
    CREATE INDEX IF NOT EXISTS idx_vouchers_account ON vouchers(account_id);
    CREATE INDEX IF NOT EXISTS idx_vouchers_used ON vouchers(used);
  `)

  // 4. Bảng nhật ký thông báo hàng loạt (Admin Broadcast)
  database.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_logs (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      recipients_count INTEGER NOT NULL,
      sent_at TEXT NOT NULL
    );
  `)
}

// Helper: Sinh ID ngắn gọn
export function generateId(prefix = 'acc') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  return `${prefix}_${ts}_${rand}`
}

// ── CRUD Accounts ─────────────────────────────────────────────

export function createAccount({ method, google_id = null, facebook_id = null, phone = null, email = null, full_name = null, avatar_url = null, verified = 0 }) {
  const database = getDb()
  const id = generateId('acc')
  const now = new Date().toISOString()

  const stmt = database.prepare(`
    INSERT INTO accounts (id, method, google_id, facebook_id, phone, email, full_name, avatar_url, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(id, method, google_id, facebook_id, phone, email, full_name, avatar_url, verified ? 1 : 0, now)

  return findAccountById(id)
}

export function findAccountById(id) {
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
  if (!row) return null
  return { ...row, verified: Boolean(row.verified) }
}

export function findAccountByGoogleId(google_id) {
  if (!google_id) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE google_id = ?').get(google_id)
  if (!row) return null
  return { ...row, verified: Boolean(row.verified) }
}

export function findAccountByFacebookId(facebook_id) {
  if (!facebook_id) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE facebook_id = ?').get(facebook_id)
  if (!row) return null
  return { ...row, verified: Boolean(row.verified) }
}

export function findAccountByPhone(phone) {
  if (!phone) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE phone = ?').get(phone)
  if (!row) return null
  return { ...row, verified: Boolean(row.verified) }
}

export function findAccountByEmail(email) {
  if (!email) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE LOWER(email) = LOWER(?)').get(email)
  if (!row) return null
  return { ...row, verified: Boolean(row.verified) }
}

export function markAccountVerified(id) {
  const database = getDb()
  const now = new Date().toISOString()
  database.prepare('UPDATE accounts SET verified = 1, updated_at = ? WHERE id = ?').run(now, id)
  return findAccountById(id)
}

export function getAllVerifiedAccounts() {
  const database = getDb()
  const rows = database.prepare("SELECT * FROM accounts WHERE verified = 1 AND email IS NOT NULL AND email != ''").all()
  return rows.map((r) => ({ ...r, verified: true }))
}

export function getAccountStats() {
  const database = getDb()
  const totalAccounts = database.prepare('SELECT COUNT(*) as count FROM accounts').get().count
  const verifiedAccounts = database.prepare('SELECT COUNT(*) as count FROM accounts WHERE verified = 1').get().count
  const verifiedWithEmail = database.prepare("SELECT COUNT(*) as count FROM accounts WHERE verified = 1 AND email IS NOT NULL AND email != ''").get().count
  const totalVouchers = database.prepare('SELECT COUNT(*) as count FROM vouchers').get().count
  const usedVouchers = database.prepare('SELECT COUNT(*) as count FROM vouchers WHERE used = 1').get().count

  return {
    totalAccounts,
    verifiedAccounts,
    verifiedWithEmail,
    totalVouchers,
    usedVouchers,
  }
}

// ── CRUD Verification Codes ───────────────────────────────────

export function createVerificationCode({ account_id, code, target, target_type, ttlMinutes = 10 }) {
  const database = getDb()
  const id = generateId('vcode')
  const now = Date.now()
  const expires_at = now + ttlMinutes * 60 * 1000

  // Hủy các mã chưa sử dụng trước đó của account này
  database.prepare('UPDATE verification_codes SET used = 1 WHERE account_id = ? AND used = 0').run(account_id)

  const stmt = database.prepare(`
    INSERT INTO verification_codes (id, account_id, code, target, target_type, expires_at, attempts, used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `)
  stmt.run(id, account_id, code, target, target_type, expires_at, new Date(now).toISOString())

  return {
    id,
    account_id,
    code,
    target,
    target_type,
    expires_at,
    attempts: 0,
    used: 0,
  }
}

export function findLatestActiveCode(account_id) {
  const database = getDb()
  const now = Date.now()
  const row = database.prepare(`
    SELECT * FROM verification_codes 
    WHERE account_id = ? AND used = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
  `).get(account_id, now)

  return row || null
}

export function incrementCodeAttempts(code_id) {
  const database = getDb()
  database.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(code_id)
  return database.prepare('SELECT attempts FROM verification_codes WHERE id = ?').get(code_id)?.attempts || 0
}

export function markCodeUsed(code_id) {
  const database = getDb()
  database.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(code_id)
}

// ── CRUD Vouchers ─────────────────────────────────────────────

export function generateWelcomeVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `WELCOME-${rand}`
}

export function createWelcomeVoucher(account_id) {
  const database = getDb()

  // Kiểm tra tài khoản đã có voucher chào mừng chưa
  const existing = database.prepare('SELECT * FROM vouchers WHERE account_id = ?').get(account_id)
  if (existing) {
    return {
      ...existing,
      free_shipping: Boolean(existing.free_shipping),
      used: Boolean(existing.used),
    }
  }

  let code = generateWelcomeVoucherCode()
  // Tránh trùng mã hiếm gặp
  while (database.prepare('SELECT id FROM vouchers WHERE code = ?').get(code)) {
    code = generateWelcomeVoucherCode()
  }

  const id = generateId('vouch')
  const now = new Date().toISOString()

  database.prepare(`
    INSERT INTO vouchers (id, account_id, code, discount_percent, free_shipping, used, created_at)
    VALUES (?, ?, ?, 10, 1, 0, ?)
  `).run(id, account_id, code, now)

  const created = database.prepare('SELECT * FROM vouchers WHERE id = ?').get(id)
  return {
    ...created,
    free_shipping: Boolean(created.free_shipping),
    used: Boolean(created.used),
  }
}

export function getVoucherByCode(code) {
  if (!code) return null
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()
  const row = database.prepare('SELECT * FROM vouchers WHERE UPPER(code) = ?').get(cleanCode)
  if (!row) return null
  return {
    ...row,
    free_shipping: Boolean(row.free_shipping),
    used: Boolean(row.used),
  }
}

export function getVoucherByAccountId(account_id) {
  if (!account_id) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM vouchers WHERE account_id = ?').get(account_id)
  if (!row) return null
  return {
    ...row,
    free_shipping: Boolean(row.free_shipping),
    used: Boolean(row.used),
  }
}

export function markVoucherUsed(code, order_id) {
  if (!code) return false
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()
  const now = new Date().toISOString()
  const result = database.prepare(`
    UPDATE vouchers 
    SET used = 1, used_at = ?, order_id = ?
    WHERE UPPER(code) = ? AND used = 0
  `).run(now, order_id || null, cleanCode)

  return result.changes > 0
}

// ── CRUD Broadcast Logs ───────────────────────────────────────

export function createBroadcastLog({ subject, content, recipients_count }) {
  const database = getDb()
  const id = generateId('bcast')
  const now = new Date().toISOString()
  database.prepare(`
    INSERT INTO broadcast_logs (id, subject, content, recipients_count, sent_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, subject, content, recipients_count, now)

  return { id, subject, content, recipients_count, sent_at: now }
}

export function getBroadcastLogs(limit = 20) {
  const database = getDb()
  return database.prepare('SELECT * FROM broadcast_logs ORDER BY sent_at DESC LIMIT ?').all(limit)
}
