import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { hashOtpCode, generateSalt, verifyOtpCode, hashSessionToken, hashClientMetadata } from './authCrypto.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu trữ database độc lập cho tài khoản & voucher
const dataDir = path.resolve(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.ACCOUNT_DB_FILE) ||
  process.argv.some((arg) => typeof arg === 'string' && (arg.includes('node:test') || arg.includes('tests/') || arg.includes('verify-all')))

const dbPath = process.env.ACCOUNT_DB_FILE || (isTestEnv ? path.resolve(dataDir, 'accounts.test.db') : path.resolve(dataDir, 'accounts.db'))
let db = null

export function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema(db)
    migrateSchema(db)
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

  // 2. Bảng mã xác minh OTP cũ (tương thích backward)
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

  // Seed system campaign voucher QNS10 if not present for persistent tracking
  const qns10 = database.prepare('SELECT id FROM vouchers WHERE UPPER(code) = ?').get('QNS10')
  if (!qns10) {
    const sysAccount = database.prepare('SELECT id FROM accounts WHERE id = ?').get('system')
    if (!sysAccount) {
      database.prepare(`
        INSERT INTO accounts (id, method, full_name, verified, created_at)
        VALUES ('system', 'system', 'System Promotion', 1, ?)
      `).run(new Date().toISOString())
    }
    database.prepare(`
      INSERT INTO vouchers (id, account_id, code, discount_percent, free_shipping, used, created_at)
      VALUES ('vouch_qns10_campaign', 'system', 'QNS10', 10, 0, 0, ?)
    `).run(new Date().toISOString())
  }

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

/**
 * Migration an toàn, idempotent, không xóa dữ liệu cũ
 */
function migrateSchema(database) {
  // A. Bổ sung các cột mới vào bảng accounts nếu chưa có
  const accountCols = database.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name)

  if (!accountCols.includes('status')) {
    database.exec("ALTER TABLE accounts ADD COLUMN status TEXT DEFAULT 'active'")
  }
  if (!accountCols.includes('verified_at')) {
    database.exec('ALTER TABLE accounts ADD COLUMN verified_at TEXT')
  }
  if (!accountCols.includes('last_login_at')) {
    database.exec('ALTER TABLE accounts ADD COLUMN last_login_at TEXT')
  }
  if (!accountCols.includes('marketing_email_opt_in')) {
    database.exec('ALTER TABLE accounts ADD COLUMN marketing_email_opt_in INTEGER DEFAULT 0')
  }
  if (!accountCols.includes('marketing_opt_in_at')) {
    database.exec('ALTER TABLE accounts ADD COLUMN marketing_opt_in_at TEXT')
  }
  if (!accountCols.includes('marketing_opt_out_at')) {
    database.exec('ALTER TABLE accounts ADD COLUMN marketing_opt_out_at TEXT')
  }
  if (!accountCols.includes('suppressed')) {
    database.exec('ALTER TABLE accounts ADD COLUMN suppressed INTEGER DEFAULT 0')
  }

  // B. Bảng mapping identity liên kết đa phương thức (Google, Facebook, Phone)
  database.exec(`
    CREATE TABLE IF NOT EXISTS account_identities (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(provider, provider_subject),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_identities_lookup ON account_identities(provider, provider_subject);
    CREATE INDEX IF NOT EXISTS idx_identities_account ON account_identities(account_id);
  `)

  // C. Bảng challenge OTP bảo mật mới (Lưu hash, salt, constant-time compare)
  database.exec(`
    CREATE TABLE IF NOT EXISTS verification_challenges (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      purpose TEXT NOT NULL DEFAULT 'auth',
      channel TEXT NOT NULL,
      target TEXT NOT NULL,
      target_type TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      consumed INTEGER NOT NULL DEFAULT 0,
      cooldown_until INTEGER NOT NULL DEFAULT 0,
      ip_hash TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_vchallenge_target ON verification_challenges(target, consumed, expires_at);
    CREATE INDEX IF NOT EXISTS idx_vchallenge_account ON verification_challenges(account_id, consumed, expires_at);
  `)

  // D. Bảng Customer Sessions (HttpOnly Cookie, session hash)
  database.exec(`
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id TEXT PRIMARY KEY,
      session_hash TEXT UNIQUE NOT NULL,
      account_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      ip_hash TEXT,
      user_agent_hash TEXT,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cust_sessions_hash ON customer_sessions(session_hash);
    CREATE INDEX IF NOT EXISTS idx_cust_sessions_account ON customer_sessions(account_id);
  `)

  // E. Bổ sung các cột vào bảng vouchers nếu thiếu
  const voucherCols = database.prepare('PRAGMA table_info(vouchers)').all().map((c) => c.name)
  if (!voucherCols.includes('status')) {
    database.exec("ALTER TABLE vouchers ADD COLUMN status TEXT DEFAULT 'active'")
  }
  if (!voucherCols.includes('reserved_order_id')) {
    database.exec('ALTER TABLE vouchers ADD COLUMN reserved_order_id TEXT')
  }
  if (!voucherCols.includes('reserved_at')) {
    database.exec('ALTER TABLE vouchers ADD COLUMN reserved_at TEXT')
  }

  // F. Bảng danh sách hủy đăng ký marketing
  database.exec(`
    CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
      id TEXT PRIMARY KEY,
      token_hash TEXT,
      email TEXT NOT NULL,
      account_id TEXT,
      unsubscribed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_unsub_email ON marketing_unsubscribes(email);
  `)

  // G. Backfill existing account identities if not already mapped
  const unmappedAccounts = database.prepare(`
    SELECT a.id, a.method, a.google_id, a.facebook_id, a.phone, a.email, a.created_at
    FROM accounts a
    LEFT JOIN account_identities i ON a.id = i.account_id
    WHERE i.id IS NULL AND a.id != 'system'
  `).all()

  const insertIdentity = database.prepare(`
    INSERT OR IGNORE INTO account_identities (id, account_id, provider, provider_subject, email, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  for (const acc of unmappedAccounts) {
    if (acc.google_id) {
      insertIdentity.run(generateId('iden'), acc.id, 'google', acc.google_id, acc.email, acc.created_at)
    } else if (acc.facebook_id) {
      insertIdentity.run(generateId('iden'), acc.id, 'facebook', acc.facebook_id, acc.email, acc.created_at)
    } else if (acc.phone) {
      insertIdentity.run(generateId('iden'), acc.id, 'phone', acc.phone, acc.email, acc.created_at)
    }
  }
}

// Helper: Sinh ID an toàn bằng randomBytes
export function generateId(prefix = 'acc') {
  const ts = Date.now().toString(36)
  const rand = crypto.randomBytes(4).toString('hex')
  return `${prefix}_${ts}_${rand}`
}

// ── CRUD Accounts & Identities ────────────────────────────────

export function createAccount({
  method,
  google_id = null,
  facebook_id = null,
  phone = null,
  email = null,
  full_name = null,
  avatar_url = null,
  verified = 0,
  marketing_email_opt_in = 0,
}) {
  const database = getDb()
  const id = generateId('acc')
  const now = new Date().toISOString()

  const optInVal = marketing_email_opt_in ? 1 : 0
  const optInAt = optInVal ? now : null
  const verifiedVal = verified ? 1 : 0
  const verifiedAt = verifiedVal ? now : null

  database.prepare(`
    INSERT INTO accounts (
      id, method, google_id, facebook_id, phone, email, full_name, avatar_url, 
      verified, verified_at, marketing_email_opt_in, marketing_opt_in_at, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(
    id, method, google_id, facebook_id, phone, email, full_name, avatar_url,
    verifiedVal, verifiedAt, optInVal, optInAt, now
  )

  // Lưu identity mapping
  if (google_id) {
    linkIdentityToAccount({ accountId: id, provider: 'google', subject: google_id, email })
  }
  if (facebook_id) {
    linkIdentityToAccount({ accountId: id, provider: 'facebook', subject: facebook_id, email })
  }
  if (phone) {
    linkIdentityToAccount({ accountId: id, provider: 'phone', subject: phone, email })
  }

  return findAccountById(id)
}

export function linkIdentityToAccount({ accountId, provider, subject, email = null }) {
  if (!accountId || !provider || !subject) return false
  const database = getDb()
  const id = generateId('iden')
  const now = new Date().toISOString()
  try {
    const result = database.prepare(`
      INSERT OR IGNORE INTO account_identities (id, account_id, provider, provider_subject, email, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, accountId, provider, String(subject), email, now)
    return result.changes > 0
  } catch (err) {
    console.warn('Identity linking error:', err.message)
    return false
  }
}

export function findAccountByIdentity(provider, subject) {
  if (!provider || !subject) return null
  const database = getDb()
  const row = database.prepare(`
    SELECT a.* FROM accounts a
    JOIN account_identities i ON a.id = i.account_id
    WHERE i.provider = ? AND i.provider_subject = ?
  `).get(provider, String(subject))
  if (!row) return null
  return formatAccountRow(row)
}

function formatAccountRow(row) {
  if (!row) return null
  return {
    ...row,
    fullName: row.full_name || '',
    avatarUrl: row.avatar_url || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    verified: Boolean(row.verified),
    marketing_email_opt_in: Boolean(row.marketing_email_opt_in),
    suppressed: Boolean(row.suppressed),
  }
}

export function findAccountById(id) {
  if (!id) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
  return formatAccountRow(row)
}

export function findAccountByGoogleId(google_id) {
  if (!google_id) return null
  const byIdentity = findAccountByIdentity('google', google_id)
  if (byIdentity) return byIdentity
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE google_id = ?').get(google_id)
  return formatAccountRow(row)
}

export function findAccountByFacebookId(facebook_id) {
  if (!facebook_id) return null
  const byIdentity = findAccountByIdentity('facebook', facebook_id)
  if (byIdentity) return byIdentity
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE facebook_id = ?').get(facebook_id)
  return formatAccountRow(row)
}

export function findAccountByPhone(phone) {
  if (!phone) return null
  const byIdentity = findAccountByIdentity('phone', phone)
  if (byIdentity) return byIdentity
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE phone = ?').get(phone)
  return formatAccountRow(row)
}

export function findAccountByEmail(email) {
  if (!email) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM accounts WHERE LOWER(email) = LOWER(?)').get(email)
  return formatAccountRow(row)
}

export function markAccountVerified(id, { marketingOptIn = null } = {}) {
  const database = getDb()
  const now = new Date().toISOString()

  let query = 'UPDATE accounts SET verified = 1, verified_at = COALESCE(verified_at, ?), updated_at = ?'
  const params = [now, now]

  if (marketingOptIn !== null) {
    if (marketingOptIn) {
      query += ', marketing_email_opt_in = 1, marketing_opt_in_at = COALESCE(marketing_opt_in_at, ?)'
      params.push(now)
    } else {
      query += ', marketing_email_opt_in = 0, marketing_opt_out_at = COALESCE(marketing_opt_out_at, ?)'
      params.push(now)
    }
  }

  query += ' WHERE id = ?'
  params.push(id)

  database.prepare(query).run(...params)
  return findAccountById(id)
}

export function updateAccountEmail(id, email) {
  if (!id || !email) return null
  const database = getDb()
  const now = new Date().toISOString()
  database.prepare('UPDATE accounts SET email = ?, updated_at = ? WHERE id = ?').run(email, now, id)
  return findAccountById(id)
}

export function updateAccountProfile(id, { fullName = null, avatarUrl = null, email = null } = {}) {
  if (!id) return null
  const database = getDb()
  const now = new Date().toISOString()
  const updates = []
  const params = []

  if (fullName !== null && fullName !== undefined && String(fullName).trim() !== '') {
    updates.push('full_name = ?')
    params.push(String(fullName).trim())
  }
  if (avatarUrl !== null && avatarUrl !== undefined && String(avatarUrl).trim() !== '') {
    updates.push('avatar_url = ?')
    params.push(String(avatarUrl).trim())
  }
  if (email !== null && email !== undefined && String(email).trim() !== '') {
    updates.push('email = ?')
    params.push(String(email).trim().toLowerCase())
  }

  if (updates.length === 0) return findAccountById(id)

  updates.push('updated_at = ?')
  params.push(now)
  params.push(id)

  database.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  return findAccountById(id)
}

export function updateMarketingPreferences(accountId, optIn) {
  if (!accountId) return null
  const database = getDb()
  const now = new Date().toISOString()
  if (optIn) {
    database.prepare(`
      UPDATE accounts 
      SET marketing_email_opt_in = 1, marketing_opt_in_at = ?, suppressed = 0, updated_at = ?
      WHERE id = ?
    `).run(now, now, accountId)
  } else {
    database.prepare(`
      UPDATE accounts 
      SET marketing_email_opt_in = 0, marketing_opt_out_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, accountId)
  }
  return findAccountById(accountId)
}

export function unsubscribeAccount(email, accountId = null, tokenHash = null) {
  if (!email) return false
  const database = getDb()
  const now = new Date().toISOString()
  const cleanEmail = email.trim().toLowerCase()

  // Ghi nhận vào marketing_unsubscribes
  const unsubId = generateId('unsub')
  database.prepare(`
    INSERT INTO marketing_unsubscribes (id, token_hash, email, account_id, unsubscribed_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(unsubId, tokenHash, cleanEmail, accountId, now)

  // Cập nhật opt-out ngay lập tức cho account nếu có
  database.prepare(`
    UPDATE accounts 
    SET marketing_email_opt_in = 0, marketing_opt_out_at = ?, suppressed = 1, updated_at = ?
    WHERE LOWER(email) = ?
  `).run(now, now, cleanEmail)

  return true
}

export function getAllVerifiedAccounts() {
  const database = getDb()
  const rows = database.prepare("SELECT * FROM accounts WHERE verified = 1 AND email IS NOT NULL AND email != ''").all()
  return rows.map(formatAccountRow)
}

/**
 * Lấy danh sách người nhận email marketing hợp lệ theo đúng quy định:
 * verified = 1, email có sẵn, marketing_email_opt_in = 1, suppressed = 0
 */
export function getMarketingAudience() {
  const database = getDb()
  const rows = database.prepare(`
    SELECT a.* FROM accounts a
    WHERE a.verified = 1 
      AND a.email IS NOT NULL 
      AND a.email != ''
      AND a.marketing_email_opt_in = 1
      AND (a.suppressed IS NULL OR a.suppressed = 0)
      AND LOWER(a.email) NOT IN (SELECT LOWER(email) FROM marketing_unsubscribes)
  `).all()
  return rows.map(formatAccountRow)
}

export function getAccountStats() {
  const database = getDb()
  const totalAccounts = database.prepare('SELECT COUNT(*) as count FROM accounts').get().count
  const verifiedAccounts = database.prepare('SELECT COUNT(*) as count FROM accounts WHERE verified = 1').get().count
  const verifiedWithEmail = database.prepare("SELECT COUNT(*) as count FROM accounts WHERE verified = 1 AND email IS NOT NULL AND email != ''").get().count
  const marketingSubscribers = database.prepare(`
    SELECT COUNT(*) as count FROM accounts 
    WHERE verified = 1 AND email IS NOT NULL AND email != '' AND marketing_email_opt_in = 1 AND suppressed = 0
  `).get().count
  const totalVouchers = database.prepare('SELECT COUNT(*) as count FROM vouchers').get().count
  const usedVouchers = database.prepare("SELECT COUNT(*) as count FROM vouchers WHERE used = 1 OR status = 'used'").get().count

  return {
    totalAccounts,
    verifiedAccounts,
    verifiedWithEmail,
    marketingSubscribers,
    totalVouchers,
    usedVouchers,
  }
}

// ── CRUD Verification Challenges (OTP CSPRNG + SHA-256 Hash) ──

export function createChallenge({
  accountId = null,
  purpose = 'auth',
  channel,
  target,
  targetType,
  code,
  ttlMinutes = 10,
  ip = '',
}) {
  const database = getDb()
  const id = generateId('vchal')
  const now = Date.now()
  const expiresAt = now + ttlMinutes * 60 * 1000
  const cooldownUntil = now + 60 * 1000 // Cooldown 60s
  const salt = generateSalt()
  const codeHash = hashOtpCode(code, salt)
  const { ipHash } = hashClientMetadata(ip, '')

  // Vô hiệu hóa các challenge đang hoạt động trước đó của target này
  database.prepare(`
    UPDATE verification_challenges 
    SET consumed = 1 
    WHERE target = ? AND consumed = 0
  `).run(target)

  database.prepare(`
    INSERT INTO verification_challenges (
      id, account_id, purpose, channel, target, target_type, code_hash, salt,
      expires_at, attempts, max_attempts, consumed, cooldown_until, ip_hash, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 5, 0, ?, ?, ?)
  `).run(
    id, accountId, purpose, channel, target, targetType, codeHash, salt,
    expiresAt, cooldownUntil, ipHash, new Date(now).toISOString()
  )

  return {
    id,
    target,
    targetType,
    expiresAt,
    cooldownUntil,
  }
}

export function findActiveChallenge(target) {
  if (!target) return null
  const database = getDb()
  const now = Date.now()
  const row = database.prepare(`
    SELECT * FROM verification_challenges
    WHERE target = ? AND consumed = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
  `).get(target, now)
  return row || null
}

export function findActiveChallengeByAccountId(accountId) {
  if (!accountId) return null
  const database = getDb()
  const now = Date.now()
  const row = database.prepare(`
    SELECT * FROM verification_challenges
    WHERE account_id = ? AND consumed = 0 AND expires_at > ?
    ORDER BY expires_at DESC LIMIT 1
  `).get(accountId, now)
  return row || null
}

export function verifyChallengeAttempt(challengeId, inputCode) {
  const database = getDb()
  const challenge = database.prepare('SELECT * FROM verification_challenges WHERE id = ?').get(challengeId)
  if (!challenge) {
    return { valid: false, error: 'Mã xác minh không tồn tại hoặc đã hết hạn.' }
  }

  if (challenge.consumed) {
    return { valid: false, error: 'Mã xác minh này đã được sử dụng.' }
  }

  if (Date.now() > challenge.expires_at) {
    return { valid: false, error: 'Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới.' }
  }

  if (challenge.attempts >= challenge.max_attempts) {
    return { valid: false, error: 'Bạn đã nhập sai quá số lần cho phép (5 lần). Mã đã bị vô hiệu hóa.' }
  }

  // So sánh constant-time
  const isMatch = verifyOtpCode(inputCode, challenge.salt, challenge.code_hash)
  if (!isMatch) {
    const nextAttempts = challenge.attempts + 1
    database.prepare('UPDATE verification_challenges SET attempts = ? WHERE id = ?').run(nextAttempts, challengeId)
    const remaining = Math.max(0, challenge.max_attempts - nextAttempts)
    const errorMsg = remaining === 0
      ? 'Bạn đã nhập sai quá số lần cho phép (5 lần). Mã đã bị vô hiệu hóa.'
      : `Mã xác minh không chính xác. Còn lại ${remaining} lần thử.`
    return {
      valid: false,
      remainingAttempts: remaining,
      error: errorMsg,
    }
  }

  // Đánh dấu mã đã sử dụng (single-use)
  database.prepare('UPDATE verification_challenges SET consumed = 1 WHERE id = ?').run(challengeId)
  return { valid: true, challenge }
}

// ── CRUD Verification Codes (Backward Compatibility) ──────────

export function createVerificationCode({ account_id, code, target, target_type, ttlMinutes = 10 }) {
  const database = getDb()
  const id = generateId('vcode')
  const now = Date.now()
  const expires_at = now + ttlMinutes * 60 * 1000

  database.prepare('UPDATE verification_codes SET used = 1 WHERE account_id = ? AND used = 0').run(account_id)

  const stmt = database.prepare(`
    INSERT INTO verification_codes (id, account_id, code, target, target_type, expires_at, attempts, used, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `)
  stmt.run(id, account_id, code, target, target_type, expires_at, new Date(now).toISOString())

  // Đồng thời tạo challenge an toàn
  createChallenge({
    accountId: account_id,
    purpose: 'auth',
    channel: target_type === 'sms' ? 'sms' : 'email',
    target,
    targetType: target_type,
    code,
    ttlMinutes,
  })

  return { id, account_id, code, target, target_type, expires_at, attempts: 0, used: 0 }
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

// ── CRUD Customer Sessions (Opaque Token & Hash) ──────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function createCustomerSession({ accountId, token, ip = '', userAgent = '' }) {
  if (!accountId || !token) return null
  const database = getDb()
  const id = generateId('sess')
  const sessionHash = hashSessionToken(token)
  const now = Date.now()
  const expiresAt = now + THIRTY_DAYS_MS
  const { ipHash, uaHash } = hashClientMetadata(ip, userAgent)

  database.prepare(`
    INSERT INTO customer_sessions (
      id, session_hash, account_id, created_at, last_seen_at, expires_at, ip_hash, user_agent_hash
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionHash, accountId, now, now, expiresAt, ipHash, uaHash)

  // Cập nhật last_login_at của account
  database.prepare('UPDATE accounts SET last_login_at = ? WHERE id = ?').run(new Date(now).toISOString(), accountId)

  return { id, accountId, expiresAt }
}

export function findCustomerSessionByToken(token) {
  if (!token) return null
  const database = getDb()
  const sessionHash = hashSessionToken(token)
  const now = Date.now()

  const session = database.prepare(`
    SELECT s.*, a.status as account_status
    FROM customer_sessions s
    JOIN accounts a ON s.account_id = a.id
    WHERE s.session_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).get(sessionHash, now)

  if (!session) return null

  // Kiểm tra idle timeout (7 ngày kể từ last_seen_at)
  if (now - session.last_seen_at > SEVEN_DAYS_MS) {
    revokeCustomerSession(token)
    return null
  }

  // Cập nhật last_seen_at
  database.prepare('UPDATE customer_sessions SET last_seen_at = ? WHERE id = ?').run(now, session.id)

  const account = findAccountById(session.account_id)
  return { session, account }
}

export function revokeCustomerSession(token) {
  if (!token) return false
  const database = getDb()
  const sessionHash = hashSessionToken(token)
  const now = Date.now()
  const res = database.prepare('UPDATE customer_sessions SET revoked_at = ? WHERE session_hash = ?').run(now, sessionHash)
  return res.changes > 0
}

export function revokeAllAccountSessions(accountId) {
  if (!accountId) return false
  const database = getDb()
  const now = Date.now()
  const res = database.prepare('UPDATE customer_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL').run(now, accountId)
  return res.changes > 0
}

// ── CRUD Vouchers ─────────────────────────────────────────────

export function generateWelcomeVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let rand = ''
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, chars.length)
    rand += chars.charAt(idx)
  }
  return `WELCOME-${rand}`
}

export function createWelcomeVoucher(account_id) {
  const database = getDb()

  // Mỗi tài khoản chỉ có tối đa một voucher chào mừng
  const existing = database.prepare('SELECT * FROM vouchers WHERE account_id = ?').get(account_id)
  if (existing) {
    return formatVoucherRow(existing)
  }

  let code = generateWelcomeVoucherCode()
  while (database.prepare('SELECT id FROM vouchers WHERE code = ?').get(code)) {
    code = generateWelcomeVoucherCode()
  }

  const id = generateId('vouch')
  const now = new Date().toISOString()

  database.prepare(`
    INSERT INTO vouchers (id, account_id, code, discount_percent, free_shipping, used, status, created_at)
    VALUES (?, ?, ?, 10, 1, 0, 'active', ?)
  `).run(id, account_id, code, now)

  const created = database.prepare('SELECT * FROM vouchers WHERE id = ?').get(id)
  return formatVoucherRow(created)
}

function formatVoucherRow(row) {
  if (!row) return null
  const isUsed = Number(row.used) === 1
  return {
    ...row,
    free_shipping: Boolean(row.free_shipping),
    used: isUsed,
    status: isUsed ? 'used' : (row.status === 'reserved' ? 'reserved' : 'active'),
  }
}

export function getVoucherByCode(code) {
  if (!code) return null
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()
  const row = database.prepare('SELECT * FROM vouchers WHERE UPPER(code) = ?').get(cleanCode)
  return formatVoucherRow(row)
}

export function getVoucherByAccountId(account_id) {
  if (!account_id) return null
  const database = getDb()
  const row = database.prepare('SELECT * FROM vouchers WHERE account_id = ?').get(account_id)
  return formatVoucherRow(row)
}

export function isFirstOrderEligible(accountId) {
  if (!accountId || accountId === 'system') return false
  const database = getDb()
  // Kiểm tra voucher chào mừng của account này đã used chưa
  const voucher = database.prepare('SELECT * FROM vouchers WHERE account_id = ?').get(accountId)
  if (!voucher) return true
  if (voucher.used === 1 || voucher.status === 'used') return false
  return true
}

export function reserveVoucher(code, accountId, orderId) {
  if (!code) return false
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()
  const now = new Date().toISOString()

  const voucher = getVoucherByCode(cleanCode)
  if (!voucher || voucher.used || voucher.status === 'used') return false
  if (voucher.account_id !== 'system' && voucher.account_id !== accountId) return false

  const result = database.prepare(`
    UPDATE vouchers 
    SET status = 'reserved', reserved_order_id = ?, reserved_at = ?
    WHERE UPPER(code) = ? AND (status = 'active' OR status IS NULL) AND used = 0
  `).run(orderId, now, cleanCode)

  return result.changes > 0
}

export function releaseVoucher(code, orderId) {
  if (!code) return false
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()

  const result = database.prepare(`
    UPDATE vouchers 
    SET status = 'active', reserved_order_id = NULL, reserved_at = NULL
    WHERE UPPER(code) = ? AND reserved_order_id = ? AND used = 0
  `).run(cleanCode, orderId)

  return result.changes > 0
}

export function markVoucherUsed(code, order_id) {
  if (!code) return false
  const database = getDb()
  const cleanCode = String(code).trim().toUpperCase()
  const now = new Date().toISOString()
  const result = database.prepare(`
    UPDATE vouchers 
    SET used = 1, status = 'used', used_at = ?, order_id = ?
    WHERE UPPER(code) = ? AND used = 0
  `).run(now, order_id || null, cleanCode)

  return result.changes > 0
}

// ── CRUD Broadcast Logs ───────────────────────────────────────

export function createBroadcastLog({ subject, content, recipients_count, broadcast_type = 'promotion' }) {
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

export { generateSessionToken } from './authCrypto.js'

