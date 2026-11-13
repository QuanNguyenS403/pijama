import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { hashOtpCode, generateSalt, verifyOtpCode, hashSessionToken, hashClientMetadata } from './authCrypto.js'
import { runEnterpriseMigrations } from './schemaMigration.js'
import { getSupabase, isSupabaseConfigured } from './supabaseClient.js'
import { isAutomatedTestEnvironment, isNodeTestRunner, extractEmailAddress } from './emailRecipientGuard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu trữ database độc lập cho tài khoản & voucher (hỗ trợ DATA_DIR cho Persistent Disk)
const defaultDataDir = path.resolve(__dirname, '../data')
const dataDir = String(process.env.DATA_DIR || '').trim()
  ? path.resolve(String(process.env.DATA_DIR).trim())
  : defaultDataDir

const isTestEnv = isNodeTestRunner() || isAutomatedTestEnvironment()

function resolveAccountDbPath() {
  const envDbRaw = String(process.env.ACCOUNT_DB_FILE || '').trim()
  if (isTestEnv) {
    if (envDbRaw) {
      const resolvedEnvDb = path.resolve(envDbRaw)
      const isInsideRealDataDir =
        resolvedEnvDb === dataDir ||
        resolvedEnvDb.startsWith(dataDir + path.sep) ||
        resolvedEnvDb === defaultDataDir ||
        resolvedEnvDb.startsWith(defaultDataDir + path.sep)
      if (!isInsideRealDataDir) {
        return resolvedEnvDb
      }
    }
    return path.join(os.tmpdir(), `qns-test-${process.pid}`, 'accounts.test.db')
  }
  return envDbRaw ? path.resolve(envDbRaw) : path.resolve(dataDir, 'accounts.db')
}

const dbPath = resolveAccountDbPath()
const dbParentDir = path.dirname(dbPath)
if (!fs.existsSync(dbParentDir)) {
  fs.mkdirSync(dbParentDir, { recursive: true })
}

let db = null

export function getAccountDbPath() {
  return dbPath
}

export function getDataDirPath() {
  return dataDir
}

export function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
    db.pragma('foreign_keys = ON')
    initSchema(db)
    migrateSchema(db)
    runEnterpriseMigrations(db)
  }
  return db
}

export function closeDb() {
  if (db) {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)')
    } catch (_) {}
    try {
      db.close()
    } catch (_) {}
    db = null
  }
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

  // G. Bảng lưu trữ đơn hàng khách hàng (đồng bộ Database chính thức)
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      total INTEGER DEFAULT 0,
      subtotal INTEGER DEFAULT 0,
      shipping_fee INTEGER DEFAULT 0,
      discount INTEGER DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT,
      status TEXT DEFAULT 'PENDING',
      tracking_code TEXT,
      items_json TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  `)

  // H. Bảng versioned schema migrations & admin revoked tokens (D2 & AD1)
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_revoked_tokens (
      token TEXT PRIMARY KEY,
      revoked_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_revoked_exp ON admin_revoked_tokens(expires_at);
  `)

  const applyMigration = (version, fn) => {
    const exists = database.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version)
    if (!exists) {
      fn()
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString())
    }
  }

  applyMigration('2026_11_backend_hardening_v1', () => {
    // Baseline idempotent migration tracking for foreign keys & admin revocations
  })

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
  if (row) return formatAccountRow(row)

  try {
    const userRow = database.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (userRow) {
      return {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        fullName: userRow.full_name || '',
        avatar_url: userRow.avatar_url || '',
        avatarUrl: userRow.avatar_url || '',
        phone: userRow.phone || '',
        role: userRow.role || 'customer',
        status: userRow.status || 'active',
        verified: Boolean(userRow.verified),
        marketing_email_opt_in: Boolean(userRow.marketing_email_opt_in),
        suppressed: false,
        created_at: userRow.created_at || '',
        updated_at: userRow.updated_at || '',
      }
    }
  } catch {}
  return null
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
  if (row) return formatAccountRow(row)

  try {
    const userRow = database.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email)
    if (userRow) {
      return {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        fullName: userRow.full_name || '',
        avatar_url: userRow.avatar_url || '',
        avatarUrl: userRow.avatar_url || '',
        phone: userRow.phone || '',
        role: userRow.role || 'customer',
        status: userRow.status || 'active',
        verified: Boolean(userRow.verified),
        marketing_email_opt_in: Boolean(userRow.marketing_email_opt_in),
        suppressed: false,
        created_at: userRow.created_at || '',
        updated_at: userRow.updated_at || '',
      }
    }
  } catch {}
  return null
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
  const updated = findAccountById(id)
  if (updated?.email) {
    syncUserToSupabase(updated).catch(() => {})
  }
  return updated
}

export function updateAccountEmail(id, email) {
  if (!id || !email) return null
  const database = getDb()
  const now = new Date().toISOString()
  const cleanEmail = email.toLowerCase().trim()
  database.prepare('UPDATE accounts SET email = ?, updated_at = ? WHERE id = ?').run(cleanEmail, now, id)
  try {
    database.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(cleanEmail, now, id)
  } catch (_) {}
  const updated = findAccountById(id)
  if (updated?.email) {
    syncUserToSupabase(updated).catch(() => {})
  }
  return updated
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
  const updated = findAccountById(id)
  if (updated?.email) {
    syncUserToSupabase(updated).catch(() => {})
  }
  return updated
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
 * verified = 1, email có sẵn, marketing_email_opt_in = 1, suppressed = 0, synthetic_flag = 0,
 * không nằm trong marketing_unsubscribes và không nằm trong email_suppressions (bounce).
 */
export function getMarketingAudience() {
  const database = getDb()
  ensureEmailSafetyTables(database)
  const rows = database.prepare(`
    SELECT a.* FROM accounts a
    WHERE a.verified = 1 
      AND a.email IS NOT NULL 
      AND a.email != ''
      AND a.marketing_email_opt_in = 1
      AND (a.suppressed IS NULL OR a.suppressed = 0)
      AND (a.synthetic_flag IS NULL OR a.synthetic_flag = 0)
      AND LOWER(a.email) NOT IN (SELECT LOWER(email) FROM marketing_unsubscribes)
      AND LOWER(a.email) NOT IN (SELECT LOWER(email) FROM users WHERE synthetic_flag = 1 AND email IS NOT NULL)
  `).all()
  return rows
    .filter((row) => !isEmailBounceSuppressed(row.email, database))
    .map(formatAccountRow)
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
  const formatted = formatVoucherRow(created)
  syncVoucherToSupabase(formatted).catch(() => {})
  return formatted
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
    SET used = 0, status = 'active', used_at = NULL, order_id = NULL, reserved_order_id = NULL, reserved_at = NULL
    WHERE UPPER(code) = ? AND (reserved_order_id = ? OR order_id = ?)
  `).run(cleanCode, orderId, orderId)

  if (result.changes > 0) {
    const updatedRow = database.prepare('SELECT * FROM vouchers WHERE UPPER(code) = ?').get(cleanCode)
    if (updatedRow) {
      syncVoucherToSupabase(formatVoucherRow(updatedRow)).catch(() => {})
    }
  }

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

  if (result.changes > 0) {
    const updatedRow = database.prepare('SELECT * FROM vouchers WHERE UPPER(code) = ?').get(cleanCode)
    if (updatedRow) {
      syncVoucherToSupabase(formatVoucherRow(updatedRow)).catch(() => {})
    }
  }

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

// ── CRUD Orders (Database SQLite Đồng Bộ) ───────────────────────

export function upsertOrderToDb(order, database = getDb()) {
  if (!order) return null
  const id = order.orderId || order.id
  if (!id) return null

  const customerName = order.customer?.fullName || order.customerName || 'Khách hàng'
  const customerPhone = order.customer?.phone || order.customerPhone || ''
  const customerEmail = order.customer?.email || order.customerEmail || null
  const total = Number(order.total || 0)
  const subtotal = Number(order.subtotal || order.total || 0)
  const shippingFee = Number(order.shippingFee || 0)
  const discount = Number(order.discount || order.discountAmount || 0)
  const paymentMethod = order.payment?.method || order.paymentMethod || 'COD'
  const paymentStatus = order.payment?.status || order.paymentStatus || 'PENDING'
  const status = order.status || 'PENDING'
  const trackingCode = order.trackingCode || null
  const itemsJson = JSON.stringify(order.items || [])
  const rawJson = JSON.stringify(order)
  const createdAt = order.createdAt || order.orderDate || new Date().toISOString()
  const updatedAt = new Date().toISOString()

  try {
    const stmt = database.prepare(`
      INSERT INTO orders (
        order_id, customer_name, customer_phone, customer_email,
        total, subtotal, shipping_fee, discount,
        payment_method, payment_status, status, tracking_code,
        items_json, raw_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      ) ON CONFLICT(order_id) DO UPDATE SET
        customer_name = excluded.customer_name,
        customer_phone = excluded.customer_phone,
        customer_email = excluded.customer_email,
        total = excluded.total,
        subtotal = excluded.subtotal,
        shipping_fee = excluded.shipping_fee,
        discount = excluded.discount,
        payment_method = excluded.payment_method,
        payment_status = excluded.payment_status,
        status = excluded.status,
        tracking_code = COALESCE(excluded.tracking_code, orders.tracking_code),
        items_json = CASE WHEN excluded.items_json != '[]' THEN excluded.items_json ELSE orders.items_json END,
        raw_json = excluded.raw_json,
        updated_at = excluded.updated_at
    `)
    stmt.run(
      id, customerName, customerPhone, customerEmail,
      total, subtotal, shippingFee, discount,
      paymentMethod, paymentStatus, status, trackingCode,
      itemsJson, rawJson, createdAt, updatedAt
    )
    return id
  } catch (err) {
    console.warn(`⚠️ [DB ORDER UPSERT ERROR] Không thể ghi nhận đơn ${id} vào DB:`, err.message)
    return null
  }
}

export function deleteOrderFromDb(orderId, database = getDb()) {
  if (!orderId) return false
  try {
    // KHÔNG xóa payment_transactions để bảo toàn dữ liệu đối soát kế toán & tài chính
    const stmt = database.prepare('DELETE FROM orders WHERE order_id = ?')
    const result = stmt.run(orderId)
    return result.changes > 0
  } catch (err) {
    console.warn(`⚠️ [DB ORDER DELETE ERROR] Không thể xóa đơn ${orderId} khỏi DB:`, err.message)
    return false
  }
}

export function revokeAdminTokenDb(token, expiresAt = Date.now() + 8 * 3600 * 1000, database = getDb()) {
  if (!token) return
  try {
    const tokenHash = hashSessionToken(token)
    database.prepare(`
      INSERT INTO admin_revoked_tokens (token, revoked_at, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        revoked_at = excluded.revoked_at,
        expires_at = excluded.expires_at
    `).run(tokenHash, Date.now(), expiresAt)
  } catch (err) {
    console.warn('⚠️ Lỗi ghi admin_revoked_tokens:', err.message)
  }
}

export function isTokenRevokedDb(token, database = getDb()) {
  if (!token) return false
  try {
    const tokenHash = hashSessionToken(token)
    const row = database.prepare('SELECT 1 FROM admin_revoked_tokens WHERE token = ? AND expires_at > ?').get(tokenHash, Date.now())
    return Boolean(row)
  } catch (err) {
    console.error('⚠️ Lỗi đọc admin_revoked_tokens (fail-closed):', err.message)
    return true
  }
}

export function getOrderFromDb(orderId, database = getDb()) {
  if (!orderId) return null
  try {
    const row = database.prepare('SELECT raw_json FROM orders WHERE order_id = ?').get(orderId)
    if (!row?.raw_json) return null
    return JSON.parse(row.raw_json)
  } catch {
    return null
  }
}

export function getOrdersByPhoneFromDb(phone, database = getDb()) {
  if (!phone) return []
  try {
    const rows = database.prepare('SELECT raw_json FROM orders WHERE customer_phone = ? ORDER BY created_at DESC').all(phone)
    return rows.map((r) => JSON.parse(r.raw_json))
  } catch {
    return []
  }
}

/**
 * Hợp nhất tài khoản OAuth (Google / Facebook) và Users trong 1 Transaction nguyên tử
 * Khắc phục triệt để lỗi H3 (xung đột ID giữa accounts và users) và F-G3 (pre-hijack)
 */
export function upsertUnifiedOAuthAccount({
  provider = 'google',
  subject,
  email,
  fullName = 'Quý khách',
  avatarUrl = null,
  marketingOptIn = false,
}) {
  if (!subject && !email) {
    throw new Error('Thiếu thông tin định danh (subject hoặc email)')
  }

  const database = getDb()
  const cleanEmail = email ? email.toLowerCase().trim() : null
  const now = new Date().toISOString()

  return database.transaction(() => {
    // 1. Tìm tài khoản hiện có qua identity mapping hoặc provider id
    let account = null
    if (subject) {
      account = findAccountByIdentity(provider, subject)
      if (!account && provider === 'google') {
        account = findAccountByGoogleId(subject)
      } else if (!account && provider === 'facebook') {
        account = findAccountByFacebookId(subject)
      }
    }

    // 2. Tìm qua email trong accounts hoặc users nếu chưa tìm thấy qua identity
    let existingUser = null
    if (cleanEmail) {
      existingUser = database.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail)
    }
    if (!existingUser && account) {
      existingUser = database.prepare('SELECT * FROM users WHERE id = ?').get(account.id)
    }
    if (!account && cleanEmail) {
      account = findAccountByEmail(cleanEmail)
    }
    if (!account && existingUser) {
      account = findAccountById(existingUser.id)
    }

    // Xác định ID duy nhất dùng chung cho cả 2 bảng
    let userId = null
    let isNewAccount = false
    let preHijackMitigated = false

    if (account) {
      userId = account.id
    } else if (existingUser) {
      userId = existingUser.id
    } else {
      isNewAccount = true
      userId = generateId('acc')
    }

    // 3. Xử lý F-G3: Pre-hijack mitigation
    // Nếu tài khoản cũ đăng ký bằng email+mật khẩu nhưng chưa verify, nay chính chủ xác thực qua OAuth
    // -> Vô hiệu hóa mật khẩu cũ và thu hồi toàn bộ session cũ của kẻ tấn công!
    if (existingUser && existingUser.verified === 0 && existingUser.password_hash) {
      database.prepare('UPDATE users SET password_hash = NULL, updated_at = ? WHERE id = ?').run(now, userId)
      revokeAllAccountSessions(userId)
      try {
        database.prepare('UPDATE enterprise_sessions SET is_revoked = 1, revoked_at = ? WHERE user_id = ?').run(now, userId)
      } catch (_) {}
      preHijackMitigated = true
    }

    // 4. Đồng bộ / Upsert bảng accounts
    const existingAccountRow = database.prepare('SELECT * FROM accounts WHERE id = ?').get(userId)
    if (!existingAccountRow) {
      database.prepare(`
        INSERT INTO accounts (id, method, google_id, facebook_id, phone, email, full_name, avatar_url, verified, marketing_email_opt_in, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?)
      `).run(
        userId,
        provider,
        provider === 'google' ? subject : null,
        provider === 'facebook' ? subject : null,
        existingUser?.phone || null,
        cleanEmail,
        fullName || existingUser?.full_name || 'Quý khách',
        avatarUrl || existingUser?.avatar_url || null,
        marketingOptIn ? 1 : 0,
        existingUser?.created_at || now,
        now
      )
    } else {
      database.prepare(`
        UPDATE accounts SET
          full_name = coalesce(?, full_name),
          avatar_url = coalesce(?, avatar_url),
          email = coalesce(?, email),
          google_id = CASE WHEN ? = 'google' THEN ? ELSE google_id END,
          facebook_id = CASE WHEN ? = 'facebook' THEN ? ELSE facebook_id END,
          verified = 1,
          updated_at = ?
        WHERE id = ?
      `).run(
        fullName,
        avatarUrl,
        cleanEmail,
        provider, subject,
        provider, subject,
        now,
        userId
      )
    }

    // 5. Đồng bộ / Upsert bảng users
    if (!existingUser) {
      database.prepare(`
        INSERT INTO users (id, email, full_name, avatar_url, phone, role, status, verified, verified_at, marketing_email_opt_in, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, 'customer', 'active', 1, ?, ?, ?, ?)
      `).run(
        userId,
        cleanEmail,
        fullName || 'Quý khách',
        avatarUrl,
        now,
        marketingOptIn ? 1 : 0,
        now,
        now
      )
    } else {
      database.prepare(`
        UPDATE users SET
          email = coalesce(?, email),
          full_name = coalesce(?, full_name),
          avatar_url = coalesce(?, avatar_url),
          verified = 1,
          verified_at = coalesce(verified_at, ?),
          last_login_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        cleanEmail,
        fullName || existingUser.full_name,
        avatarUrl || existingUser.avatar_url,
        now,
        now,
        now,
        existingUser.id
      )
    }

    // 6. Lưu mapping identity
    if (subject) {
      database.prepare(`
        INSERT OR IGNORE INTO account_identities (id, account_id, provider, provider_subject, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, userId, provider, subject, cleanEmail, now)

      database.prepare(`
        INSERT OR IGNORE INTO enterprise_accounts (id, user_id, provider, provider_account_id, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`eacc_${Date.now()}_${String(subject).slice(-6)}`, userId, provider, subject, cleanEmail, now, now)
    }

    const finalAccount = findAccountById(userId)
    const voucher = createWelcomeVoucher(userId)
    if (finalAccount?.email) {
      syncUserToSupabase(finalAccount).catch(() => {})
    }

    return {
      account: finalAccount,
      userId,
      isNewAccount,
      preHijackMitigated,
      voucher,
    }
  })()
}

export { generateSessionToken } from './authCrypto.js'




/**
 * Tra cứu người dùng toàn diện cho quy trình Quên mật khẩu
 * Thứ tự: users (SQLite) -> accounts (SQLite) -> users (Supabase Cloud)
 */
export async function findUserForPasswordReset(email, database = getDb()) {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) return null

  // 1. Kiểm tra bảng users trong SQLite
  let user = database.prepare('SELECT id, email, full_name, password_hash, role, status, avatar_url, verified FROM users WHERE LOWER(email) = ?').get(cleanEmail)
  if (user && user.password_hash) return user

  // 2. Kiểm tra bảng accounts trong SQLite (ví dụ tài khoản Google hoặc tài khoản cũ)
  if (!user) {
    const acc = database.prepare('SELECT id, email, full_name, avatar_url, phone, verified, created_at FROM accounts WHERE LOWER(email) = ?').get(cleanEmail)
    if (acc) {
      const now = new Date().toISOString()
      database.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, role, status, verified, verified_at, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, 'customer', 'active', ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET full_name = COALESCE(users.full_name, excluded.full_name)
      `).run(
        acc.id,
        acc.email.toLowerCase(),
        acc.full_name || 'Quý khách',
        acc.avatar_url || null,
        acc.phone || null,
        acc.verified ? 1 : 0,
        acc.created_at || now,
        acc.created_at || now,
        now
      )
      user = database.prepare('SELECT id, email, full_name, password_hash, role, status, avatar_url, verified FROM users WHERE LOWER(email) = ?').get(cleanEmail)
    }
  }

  // 3. Tra cứu trên Supabase Cloud (dành cho môi trường đám mây như Render Free Tier khi SQLite trống hoặc chưa có password_hash)
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabase()
      if (client) {
        const { data: sbUser } = await client.from('users').select('*').ilike('email', cleanEmail).maybeSingle()
        if (sbUser) {
          const now = new Date().toISOString()
          database.prepare(`
            INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, role, status, verified, verified_at, marketing_email_opt_in, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              password_hash = COALESCE(excluded.password_hash, users.password_hash),
              full_name = COALESCE(excluded.full_name, users.full_name),
              avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
              updated_at = excluded.updated_at
          `).run(
            sbUser.id,
            String(sbUser.email || cleanEmail).toLowerCase(),
            sbUser.password_hash || null,
            sbUser.full_name || 'Quý khách',
            sbUser.avatar_url || null,
            sbUser.phone || null,
            sbUser.role || 'customer',
            sbUser.status || 'active',
            sbUser.verified ? 1 : 0,
            sbUser.verified_at || null,
            sbUser.marketing_email_opt_in || 0,
            sbUser.created_at || now,
            sbUser.updated_at || now
          )
          return database.prepare('SELECT id, email, full_name, password_hash, role, status, avatar_url, verified FROM users WHERE LOWER(email) = ?').get(cleanEmail)
        }
      }
    } catch (sbErr) {
      console.warn('⚠️ [SUPABASE LOOKUP] Lỗi tra cứu tài khoản trên Supabase:', sbErr.message)
    }
  }

  return user || null
}

/**
 * Đồng bộ toàn bộ người dùng từ Supabase Cloud về SQLite khi khởi động máy chủ
 */
export async function syncUsersFromSupabase(database = getDb()) {
  if (isNodeTestRunner() || isAutomatedTestEnvironment()) return 0
  if (!isSupabaseConfigured()) return 0
  const client = getSupabase()
  if (!client) return 0

  try {
    const { data, error } = await client.from('users').select('*')
    if (error) {
      console.warn('⚠️ [SUPABASE SYNC] Lỗi tải users từ Supabase:', error.message)
      return 0
    }
    if (!data || data.length === 0) return 0

    const stmtUser = database.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, avatar_url, phone, role, status, verified, verified_at, marketing_email_opt_in, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        password_hash = COALESCE(excluded.password_hash, users.password_hash),
        full_name = excluded.full_name,
        avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
        phone = COALESCE(excluded.phone, users.phone),
        verified = MAX(users.verified, excluded.verified),
        updated_at = excluded.updated_at
    `)

    const stmtAccount = database.prepare(`
      INSERT INTO accounts (
        id, method, email, phone, full_name, avatar_url, verified, verified_at, marketing_email_opt_in, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = COALESCE(excluded.avatar_url, accounts.avatar_url),
        phone = COALESCE(excluded.phone, accounts.phone),
        verified = MAX(accounts.verified, excluded.verified),
        updated_at = excluded.updated_at
    `)

    const insertMany = database.transaction((rows) => {
      for (const r of rows) {
        const now = new Date().toISOString()

        // Khôi phục hồ sơ hội viên Loyalty (role = 'loyalty_member' hoặc id bắt đầu bằng 'mem_')
        if (r.role === 'loyalty_member' || String(r.id || '').startsWith('mem_')) {
          if (!r.phone) continue
          let meta = {}
          try {
            if (r.avatar_url && String(r.avatar_url).startsWith('{')) {
              meta = JSON.parse(r.avatar_url)
            }
          } catch {}
          try {
            database.exec(`
              CREATE TABLE IF NOT EXISTS loyalty_members (
                id TEXT PRIMARY KEY,
                phone TEXT UNIQUE NOT NULL,
                phone_verified_at TEXT,
                account_id TEXT,
                full_name TEXT NOT NULL,
                email TEXT,
                birth_day INTEGER,
                birth_month INTEGER,
                tier TEXT NOT NULL DEFAULT 'MEMBER',
                tier_changed_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                consent_version TEXT NOT NULL,
                consent_at TEXT NOT NULL,
                marketing_opt_in INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              );
            `)
            database.prepare(`
              INSERT INTO loyalty_members (
                id, phone, phone_verified_at, account_id, full_name, email,
                birth_day, birth_month, tier, tier_changed_at, status,
                consent_version, consent_at, marketing_opt_in, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0.0', ?, ?, ?, ?)
              ON CONFLICT(phone) DO UPDATE SET
                full_name = excluded.full_name,
                email = COALESCE(excluded.email, loyalty_members.email),
                tier = excluded.tier,
                status = excluded.status,
                updated_at = excluded.updated_at
            `).run(
              r.id,
              r.phone,
              r.verified_at || r.created_at || now,
              meta.account_id || null,
              r.full_name || 'Khách hàng thân thiết',
              meta.email || null,
              meta.birth_day || null,
              meta.birth_month || null,
              meta.tier || 'MEMBER',
              meta.tier_changed_at || r.created_at || now,
              r.status || 'active',
              r.created_at || now,
              r.marketing_email_opt_in ? 1 : 0,
              r.created_at || now,
              r.updated_at || now
            )
          } catch {}
          continue
        }

        if (!r.email) continue
        const cleanEmail = String(r.email).toLowerCase()
        const verifiedVal = r.verified ? 1 : 0
        const optInVal = r.marketing_email_opt_in ? 1 : 0

        stmtUser.run(
          r.id,
          cleanEmail,
          r.password_hash || null,
          r.full_name || 'Khách hàng',
          r.avatar_url || null,
          r.phone || null,
          r.role || 'customer',
          r.status || 'active',
          verifiedVal,
          r.verified_at || null,
          optInVal,
          r.created_at || now,
          r.updated_at || now
        )

        stmtAccount.run(
          r.id,
          r.password_hash ? 'local' : 'google',
          cleanEmail,
          r.phone || null,
          r.full_name || 'Khách hàng',
          r.avatar_url || null,
          verifiedVal,
          r.verified_at || null,
          optInVal,
          r.status || 'active',
          r.created_at || now,
          r.updated_at || now
        )
      }
    })

    insertMany(data)
    return data.length
  } catch (err) {
    console.warn('⚠️ [SUPABASE SYNC] Ngoại lệ khi đồng bộ users từ Supabase:', err.message)
    return 0
  }
}

/**
 * Đẩy một người dùng lên Supabase Cloud khi tạo mới hoặc cập nhật mật khẩu
 */
export async function syncUserToSupabase(user) {
  if (isNodeTestRunner() || isAutomatedTestEnvironment()) return
  if (!isSupabaseConfigured() || !user || (!user.id && !user.email)) return
  const client = getSupabase()
  if (!client) return

  try {
    const now = new Date().toISOString()
    const cleanEmail = String(user.email || '').trim().toLowerCase()
    const { data: existing } = await client.from('users').select('id, password_hash, avatar_url, phone, verified').ilike('email', cleanEmail).maybeSingle()

    const payload = {
      id: existing?.id || user.id,
      email: cleanEmail,
      password_hash: user.password_hash || existing?.password_hash || null,
      full_name: user.full_name || user.fullName || 'Khách hàng',
      avatar_url: user.avatar_url || user.avatarUrl || existing?.avatar_url || null,
      phone: user.phone || existing?.phone || null,
      role: user.role || 'customer',
      status: user.status || 'active',
      verified: (user.verified || existing?.verified) ? 1 : 0,
      verified_at: user.verified_at || null,
      marketing_email_opt_in: user.marketing_email_opt_in || user.marketingOptIn ? 1 : 0,
      created_at: user.created_at || now,
      updated_at: user.updated_at || now,
    }

    const { error: upsertErr } = await client.from('users').upsert(payload, { onConflict: 'id' })
    if (upsertErr) {
      console.warn('⚠️ [SUPABASE SYNC] Lỗi upsert user lên Supabase:', upsertErr.message)
    }
  } catch (err) {
    console.warn('⚠️ [SUPABASE SYNC] Lỗi khi lưu user lên Supabase:', err.message)
  }
}

/**
 * Đẩy một mã ưu đãi (voucher) lên Supabase Cloud (bảng public.vouchers)
 */
export async function syncVoucherToSupabase(voucher) {
  if (isNodeTestRunner() || isAutomatedTestEnvironment()) return false
  if (!isSupabaseConfigured() || !voucher || !voucher.code) return false
  const client = getSupabase()
  if (!client) return false

  try {
    const cleanCode = String(voucher.code).trim().toUpperCase()
    const payload = {
      code: cleanCode,
      account_id: voucher.account_id || 'system',
      discount_percent: Number(voucher.discount_percent ?? 10),
      freeship: voucher.free_shipping ? 1 : 0,
      single_use: 1,
      used: voucher.used ? 1 : 0,
      used_at: voucher.used_at || null,
      order_id: voucher.order_id || null,
      created_at: voucher.created_at || new Date().toISOString(),
    }
    const { error } = await client.from('vouchers').upsert(payload, { onConflict: 'code' })
    if (error) {
      console.warn('⚠️ [SUPABASE SYNC] Lỗi upsert voucher lên Supabase:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('⚠️ [SUPABASE SYNC] Ngoại lệ khi lưu voucher lên Supabase:', err.message)
    return false
  }
}

/**
 * Đồng bộ toàn bộ mã ưu đãi (vouchers) từ Supabase Cloud về SQLite khi khởi động máy chủ (Render Free Tier)
 */
export async function syncVouchersFromSupabase(database = getDb()) {
  if (isNodeTestRunner() || isAutomatedTestEnvironment()) return 0
  if (!isSupabaseConfigured()) return 0
  const client = getSupabase()
  if (!client) return 0

  try {
    const { data, error } = await client.from('vouchers').select('*')
    if (error) {
      console.warn('⚠️ [SUPABASE SYNC] Lỗi tải vouchers từ Supabase:', error.message)
      return 0
    }
    if (!data || data.length === 0) return 0

    const stmt = database.prepare(`
      INSERT INTO vouchers (
        id, account_id, code, discount_percent, free_shipping, used, used_at, order_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        used = MAX(vouchers.used, excluded.used),
        used_at = COALESCE(excluded.used_at, vouchers.used_at),
        order_id = COALESCE(excluded.order_id, vouchers.order_id),
        status = CASE WHEN MAX(vouchers.used, excluded.used) = 1 THEN 'used' ELSE vouchers.status END
    `)

    const insertMany = database.transaction((rows) => {
      for (const r of rows) {
        if (!r.code) continue
        const cleanCode = String(r.code).trim().toUpperCase()
        const isUsed = r.used ? 1 : 0
        const status = isUsed ? 'used' : 'active'
        stmt.run(
          `vouch_sb_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          r.account_id || 'system',
          cleanCode,
          Number(r.discount_percent ?? 10),
          r.freeship !== undefined ? (r.freeship ? 1 : 0) : 1,
          isUsed,
          r.used_at || null,
          r.order_id || null,
          status,
          r.created_at || new Date().toISOString()
        )
      }
    })

    insertMany(data)
    return data.length
  } catch (err) {
    console.warn('⚠️ [SUPABASE SYNC] Ngoại lệ khi đồng bộ vouchers từ Supabase:', err.message)
    return 0
  }
}

// ─────────────────────────────────────────────────────────────
// CÁC HÀM LƯU TRỮ OTP & PENDING REGISTRATION / RESET BỀN VỮNG
// Chống mất mát dữ liệu 100% khi Render spin down hoặc restart
// ─────────────────────────────────────────────────────────────

let pendingTablesEnsured = false
export function ensurePendingTables(database = getDb()) {
  if (pendingTablesEnsured) return
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS pending_registrations (
        email TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        birth_day INTEGER,
        birth_month INTEGER,
        birth_year INTEGER,
        marketing_opt_in INTEGER NOT NULL DEFAULT 1,
        code_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pending_reg_expires ON pending_registrations(expires_at);

      CREATE TABLE IF NOT EXISTS pending_password_resets (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pending_pwd_expires ON pending_password_resets(expires_at);

      CREATE TABLE IF NOT EXISTS active_reset_tokens (
        reset_token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_active_reset_tokens_exp ON active_reset_tokens(expires_at);
    `)
    for (const tbl of ['pending_registrations', 'users', 'accounts']) {
      try {
        const cols = database.prepare(`PRAGMA table_info(${tbl})`).all().map((c) => c.name)
        if (cols.length > 0 && !cols.includes('birth_day')) database.exec(`ALTER TABLE ${tbl} ADD COLUMN birth_day INTEGER`)
        if (cols.length > 0 && !cols.includes('birth_month')) database.exec(`ALTER TABLE ${tbl} ADD COLUMN birth_month INTEGER`)
        if (cols.length > 0 && !cols.includes('birth_year')) database.exec(`ALTER TABLE ${tbl} ADD COLUMN birth_year INTEGER`)
      } catch (_) {}
    }
    pendingTablesEnsured = true
  } catch (err) {
    console.error('ensurePendingTables error:', err.message)
  }
}

export function savePendingRegistrationDb({
  email,
  fullName,
  passwordHash,
  phone = null,
  birthDay = null,
  birthMonth = null,
  birthYear = null,
  marketingOptIn = 1,
  codeHash,
  salt,
  expiresInSeconds = 600,
  database = getDb(),
}) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  const now = Date.now()
  const expiresAt = now + expiresInSeconds * 1000

  // Tự động dọn dẹp các bản ghi hết hạn cũ
  try {
    database.prepare('DELETE FROM pending_registrations WHERE expires_at < ?').run(now)
  } catch (_) {}

  try {
    database.prepare(`
      INSERT INTO pending_registrations (
        email, full_name, password_hash, phone, birth_day, birth_month, birth_year, marketing_opt_in, code_hash, salt, attempts, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        full_name = excluded.full_name,
        password_hash = excluded.password_hash,
        phone = excluded.phone,
        birth_day = excluded.birth_day,
        birth_month = excluded.birth_month,
        birth_year = excluded.birth_year,
        marketing_opt_in = excluded.marketing_opt_in,
        code_hash = excluded.code_hash,
        salt = excluded.salt,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).run(
      cleanEmail,
      fullName,
      passwordHash,
      phone,
      birthDay,
      birthMonth,
      birthYear,
      marketingOptIn ? 1 : 0,
      codeHash,
      salt,
      expiresAt,
      now
    )
  } catch (err) {
    console.error('Lỗi savePendingRegistrationDb:', err.message)
    throw err
  }

  return { email: cleanEmail, expiresAt }
}

export function getPendingRegistrationDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  const now = Date.now()

  try {
    const record = database.prepare(`
      SELECT * FROM pending_registrations
      WHERE email = ? AND expires_at > ?
    `).get(cleanEmail, now)

    if (!record) return null

    return {
      fullName: record.full_name,
      email: record.email,
      passwordHash: record.password_hash,
      phone: record.phone,
      birthDay: record.birth_day || null,
      birthMonth: record.birth_month || null,
      birthYear: record.birth_year || null,
      marketingOptIn: Boolean(record.marketing_opt_in),
      codeHash: record.code_hash,
      salt: record.salt,
      attempts: record.attempts || 0,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
    }
  } catch (err) {
    console.error('Lỗi getPendingRegistrationDb:', err.message)
    return null
  }
}

export function deletePendingRegistrationDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  try {
    database.prepare('DELETE FROM pending_registrations WHERE email = ?').run(cleanEmail)
  } catch (_) {}
}

export function incrementPendingRegistrationAttemptsDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  try {
    database.prepare(`
      UPDATE pending_registrations
      SET attempts = attempts + 1
      WHERE email = ?
    `).run(cleanEmail)

    const updated = database.prepare('SELECT attempts FROM pending_registrations WHERE email = ?').get(cleanEmail)
    return updated ? updated.attempts : 0
  } catch (err) {
    console.error('Lỗi incrementPendingRegistrationAttemptsDb:', err.message)
    return 0
  }
}

export function savePendingPasswordResetDb({
  email,
  codeHash,
  salt,
  expiresInSeconds = 600,
  database = getDb(),
}) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  const now = Date.now()
  const expiresAt = now + expiresInSeconds * 1000

  try {
    database.prepare('DELETE FROM pending_password_resets WHERE expires_at < ?').run(now)
  } catch (_) {}

  try {
    database.prepare(`
      INSERT INTO pending_password_resets (
        email, code_hash, salt, attempts, expires_at, created_at
      ) VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        code_hash = excluded.code_hash,
        salt = excluded.salt,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `).run(cleanEmail, codeHash, salt, expiresAt, now)
  } catch (err) {
    console.error('Lỗi savePendingPasswordResetDb:', err.message)
    throw err
  }

  return { email: cleanEmail, expiresAt }
}

export function getPendingPasswordResetDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  const now = Date.now()

  try {
    const record = database.prepare(`
      SELECT * FROM pending_password_resets
      WHERE email = ? AND expires_at > ?
    `).get(cleanEmail, now)

    if (!record) return null

    return {
      email: record.email,
      codeHash: record.code_hash,
      salt: record.salt,
      attempts: record.attempts || 0,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
    }
  } catch (err) {
    console.error('Lỗi getPendingPasswordResetDb:', err.message)
    return null
  }
}

export function deletePendingPasswordResetDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  try {
    database.prepare('DELETE FROM pending_password_resets WHERE email = ?').run(cleanEmail)
  } catch (_) {}
}

export function incrementPendingPasswordResetAttemptsDb(email, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  try {
    database.prepare(`
      UPDATE pending_password_resets
      SET attempts = attempts + 1
      WHERE email = ?
    `).run(cleanEmail)

    const updated = database.prepare('SELECT attempts FROM pending_password_resets WHERE email = ?').get(cleanEmail)
    return updated ? updated.attempts : 0
  } catch (err) {
    console.error('Lỗi incrementPendingPasswordResetAttemptsDb:', err.message)
    return 0
  }
}

export function saveActiveResetTokenDb(resetToken, email, expiresInSeconds = 900, database = getDb()) {
  ensurePendingTables(database)
  const cleanEmail = (email || '').trim().toLowerCase()
  const now = Date.now()
  const expiresAt = now + expiresInSeconds * 1000

  try {
    database.prepare('DELETE FROM active_reset_tokens WHERE expires_at < ?').run(now)
  } catch (_) {}

  try {
    database.prepare(`
      INSERT INTO active_reset_tokens (reset_token, email, expires_at, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(reset_token) DO UPDATE SET
        email = excluded.email,
        expires_at = excluded.expires_at
    `).run(resetToken, cleanEmail, expiresAt, now)
  } catch (err) {
    console.error('Lỗi saveActiveResetTokenDb:', err.message)
  }
}

export function getActiveResetTokenDb(resetToken, database = getDb()) {
  ensurePendingTables(database)
  const now = Date.now()
  try {
    const record = database.prepare(`
      SELECT email FROM active_reset_tokens
      WHERE reset_token = ? AND expires_at > ?
    `).get(resetToken, now)

    return record ? record.email : null
  } catch (err) {
    console.error('Lỗi getActiveResetTokenDb:', err.message)
    return null
  }
}

export function deleteActiveResetTokenDb(resetToken, database = getDb()) {
  ensurePendingTables(database)
  try {
    database.prepare('DELETE FROM active_reset_tokens WHERE reset_token = ?').run(resetToken)
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// QUẢN LÝ DANH SÁCH CHẶN BOUNCE (EMAIL_SUPPRESSIONS) & SYNTHETIC GUARD (WP-3 / WP-5)
// ─────────────────────────────────────────────────────────────

export function hashEmailNormalized(email) {
  const clean = extractEmailAddress(email)
  if (!clean) return ''
  return crypto.createHash('sha256').update(clean).digest('hex')
}

function maskEmailForStorage(email) {
  const clean = extractEmailAddress(email)
  if (!clean) return '***'
  const at = clean.indexOf('@')
  if (at === -1) return '***'
  if (at <= 2) return '***' + clean.slice(at)
  return clean.slice(0, 2) + '***' + clean.slice(at)
}

let ensuredSafetyDbs = new WeakSet()
export function ensureEmailSafetyTables(database = getDb()) {
  if (!database || ensuredSafetyDbs.has(database)) return
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS email_suppressions (
        email_hash TEXT PRIMARY KEY,
        email_masked TEXT NOT NULL,
        reason TEXT NOT NULL CHECK(reason IN ('HARD_BOUNCE', 'DELAY_TIMEOUT', 'MANUAL')),
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL DEFAULT 'bounce_webhook',
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_email_suppressions_email_hash ON email_suppressions(email_hash);
      CREATE INDEX IF NOT EXISTS idx_email_suppressions_active ON email_suppressions(is_active, last_seen);

      CREATE TABLE IF NOT EXISTS email_bounce_requests (
        request_id TEXT PRIMARY KEY,
        nonce TEXT,
        received_at INTEGER NOT NULL,
        source TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_email_bounce_requests_nonce ON email_bounce_requests(nonce) WHERE nonce IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_email_bounce_requests_received ON email_bounce_requests(received_at);
    `)

    try {
      const userCols = database.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
      if (userCols.length > 0 && !userCols.includes('synthetic_flag')) {
        database.exec('ALTER TABLE users ADD COLUMN synthetic_flag INTEGER NOT NULL DEFAULT 0')
      }
      if (userCols.length > 0 && !userCols.includes('synthetic_reason')) {
        database.exec('ALTER TABLE users ADD COLUMN synthetic_reason TEXT')
      }
    } catch (_) {}

    try {
      const accCols = database.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name)
      if (accCols.length > 0 && !accCols.includes('synthetic_flag')) {
        database.exec('ALTER TABLE accounts ADD COLUMN synthetic_flag INTEGER NOT NULL DEFAULT 0')
      }
      if (accCols.length > 0 && !accCols.includes('synthetic_reason')) {
        database.exec('ALTER TABLE accounts ADD COLUMN synthetic_reason TEXT')
      }
    } catch (_) {}

    ensuredSafetyDbs.add(database)
  } catch (err) {
    console.warn('⚠️ [EMAIL SAFETY TABLES] Lỗi khởi tạo bảng:', err.message)
  }
}

export function __resetEmailSafetyTablesCacheForTests() {
  ensuredSafetyDbs = new WeakSet()
}

const VALID_SUPPRESSION_REASONS = new Set(['HARD_BOUNCE', 'DELAY_TIMEOUT', 'MANUAL'])

export function recordEmailSuppression({
  email,
  reason = 'HARD_BOUNCE',
  source = 'bounce_webhook',
  detectedAt = null,
  note = null,
  database = getDb(),
}) {
  ensureEmailSafetyTables(database)
  const cleanEmail = extractEmailAddress(email)
  if (!cleanEmail || !cleanEmail.includes('@')) return null
  const emailHash = hashEmailNormalized(cleanEmail)
  const emailMasked = maskEmailForStorage(cleanEmail)
  const safeReason = VALID_SUPPRESSION_REASONS.has(reason) ? reason : 'HARD_BOUNCE'
  const seenAt = detectedAt && !Number.isNaN(Date.parse(detectedAt)) ? new Date(detectedAt).toISOString() : new Date().toISOString()

  database.prepare(`
    INSERT INTO email_suppressions (email_hash, email_masked, reason, first_seen, last_seen, count, source, is_active, note)
    VALUES (?, ?, ?, ?, ?, 1, ?, 1, ?)
    ON CONFLICT(email_hash) DO UPDATE SET
      reason = CASE WHEN email_suppressions.reason = 'HARD_BOUNCE' THEN 'HARD_BOUNCE' ELSE excluded.reason END,
      last_seen = excluded.last_seen,
      count = email_suppressions.count + 1,
      source = excluded.source,
      is_active = 1,
      note = COALESCE(excluded.note, email_suppressions.note)
  `).run(emailHash, emailMasked, safeReason, seenAt, seenAt, String(source || 'bounce_webhook').slice(0, 64), note ? String(note).slice(0, 200) : null)

  return { emailHash, emailMasked, reason: safeReason, seenAt }
}

export function getEmailBounceSuppression(email, database = getDb()) {
  const emailHash = hashEmailNormalized(email)
  if (!emailHash) return null
  try {
    ensureEmailSafetyTables(database)
    const row = database.prepare(`
      SELECT email_hash, email_masked, reason, first_seen, last_seen, count, source, is_active
      FROM email_suppressions
      WHERE email_hash = ? AND is_active = 1
      LIMIT 1
    `).get(emailHash)
    return row || null
  } catch (_) {
    return null
  }
}

export function isEmailBounceSuppressed(email, database = getDb()) {
  return Boolean(getEmailBounceSuppression(email, database))
}

export function removeEmailSuppression(email, { note = 'manual_unsuppress', database = getDb() } = {}) {
  const emailHash = hashEmailNormalized(email)
  if (!emailHash) return false
  ensureEmailSafetyTables(database)
  const info = database.prepare(`
    UPDATE email_suppressions
    SET is_active = 0, note = ?
    WHERE email_hash = ? AND is_active = 1
  `).run(String(note || 'manual_unsuppress').slice(0, 200), emailHash)
  return (info.changes || 0) > 0
}

export function listEmailSuppressions({ activeOnly = true, limit = 100 } = {}, database = getDb()) {
  ensureEmailSafetyTables(database)
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500)
  const sql = activeOnly
    ? 'SELECT email_hash, email_masked, reason, first_seen, last_seen, count, source, is_active FROM email_suppressions WHERE is_active = 1 ORDER BY last_seen DESC LIMIT ?'
    : 'SELECT email_hash, email_masked, reason, first_seen, last_seen, count, source, is_active FROM email_suppressions ORDER BY last_seen DESC LIMIT ?'
  return database.prepare(sql).all(safeLimit)
}

export function recordBounceRequestIfNew({ requestId, nonce = null, source = 'apps_script_bounce_reader', database = getDb() }) {
  ensureEmailSafetyTables(database)
  const now = Date.now()
  // Dọn các requestId cũ hơn 7 ngày để bảng luôn gọn
  try {
    database.prepare('DELETE FROM email_bounce_requests WHERE received_at < ?').run(now - 7 * 24 * 60 * 60 * 1000)
  } catch (_) {}

  const cleanReqId = String(requestId || '').trim()
  const cleanNonce = nonce ? String(nonce).trim() : null

  return database.transaction(() => {
    const existingReq = database.prepare('SELECT request_id FROM email_bounce_requests WHERE request_id = ?').get(cleanReqId)
    if (existingReq) {
      return { status: 'duplicate_request_id' }
    }
    if (cleanNonce) {
      const existingNonce = database.prepare('SELECT request_id FROM email_bounce_requests WHERE nonce = ?').get(cleanNonce)
      if (existingNonce) {
        return { status: 'duplicate_nonce' }
      }
    }
    database.prepare(`
      INSERT INTO email_bounce_requests (request_id, nonce, received_at, source)
      VALUES (?, ?, ?, ?)
    `).run(cleanReqId, cleanNonce, now, String(source || 'apps_script_bounce_reader').slice(0, 64))
    return { status: 'ok' }
  })()
}

export function isSyntheticAccountEmail(email, database = getDb()) {
  const cleanEmail = extractEmailAddress(email)
  if (!cleanEmail) return false
  try {
    ensureEmailSafetyTables(database)
    const acc = database.prepare('SELECT 1 FROM accounts WHERE LOWER(email) = ? AND synthetic_flag = 1 LIMIT 1').get(cleanEmail)
    if (acc) return true
    const usr = database.prepare('SELECT 1 FROM users WHERE LOWER(email) = ? AND synthetic_flag = 1 LIMIT 1').get(cleanEmail)
    return Boolean(usr)
  } catch (_) {
    return false
  }
}

// ── J. Đồng bộ Giỏ hàng & Tùy chọn thanh toán/giao hàng theo Tài khoản ──
export function ensureCustomerCartTable(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS customer_carts (
      account_id TEXT PRIMARY KEY,
      items_json TEXT NOT NULL DEFAULT '[]',
      applied_voucher_json TEXT,
      delivery_option TEXT NOT NULL DEFAULT 'COMBINED',
      updated_at TEXT NOT NULL
    );
  `)
}

export function getCustomerCart(accountId, database = getDb()) {
  if (!accountId) {
    return { items: [], appliedVoucher: null, deliveryOption: 'COMBINED', updatedAt: null }
  }
  ensureCustomerCartTable(database)
  try {
    const row = database.prepare(`
      SELECT items_json, applied_voucher_json, delivery_option, updated_at
      FROM customer_carts
      WHERE account_id = ?
    `).get(accountId)

    if (!row) {
      return { items: [], appliedVoucher: null, deliveryOption: 'COMBINED', updatedAt: null }
    }

    let items = []
    let appliedVoucher = null
    try {
      const parsedItems = JSON.parse(row.items_json || '[]')
      items = Array.isArray(parsedItems) ? parsedItems : []
    } catch (_) {
      items = []
    }
    try {
      appliedVoucher = row.applied_voucher_json ? JSON.parse(row.applied_voucher_json) : null
    } catch (_) {
      appliedVoucher = null
    }

    return {
      items,
      appliedVoucher,
      deliveryOption: row.delivery_option === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED',
      updatedAt: row.updated_at || null,
    }
  } catch (err) {
    console.warn('⚠️ [CART DB READ WARN]', err.message)
    return { items: [], appliedVoucher: null, deliveryOption: 'COMBINED', updatedAt: null }
  }
}

const MAX_CART_JSON_BYTES = 32 * 1024 // 32KB max payload

function sanitizeCartItemRecord(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') return null
  const cleanStr = (val, maxLen = 160) =>
    val !== undefined && val !== null ? String(val).trim().slice(0, maxLen) : undefined
  const qtyRaw = Number.parseInt(String(rawItem.quantity ?? 1), 10)
  const quantity = Number.isFinite(qtyRaw) ? Math.min(Math.max(qtyRaw, 1), 99) : 1
  const priceRaw = Number(rawItem.price ?? rawItem.unitPrice ?? 0)
  const price = Number.isFinite(priceRaw) && priceRaw >= 0 && priceRaw <= 100_000_000 ? priceRaw : 0

  const sanitized = {}
  const strFields = [
    ['id', 100],
    ['productId', 100],
    ['slug', 120],
    ['name', 160],
    ['productName', 160],
    ['color', 80],
    ['colorLabel', 80],
    ['variant', 80],
    ['size', 20],
    ['image', 300],
    ['sku', 100],
  ]
  for (const [key, maxLen] of strFields) {
    if (rawItem[key] !== undefined && rawItem[key] !== null) {
      sanitized[key] = cleanStr(rawItem[key], maxLen)
    }
  }
  sanitized.quantity = quantity
  sanitized.price = price
  if (rawItem.unitPrice !== undefined) sanitized.unitPrice = price
  if (rawItem.isPreOrder !== undefined) sanitized.isPreOrder = Boolean(rawItem.isPreOrder)
  return sanitized
}

function sanitizeAppliedVoucherRecord(rawVoucher) {
  if (!rawVoucher || typeof rawVoucher !== 'object') return null
  const code = String(rawVoucher.code || '').trim().toUpperCase().slice(0, 64)
  if (!code) return null
  const sanitized = { code }
  if (rawVoucher.type !== undefined) sanitized.type = String(rawVoucher.type || '').slice(0, 32)
  if (rawVoucher.description !== undefined) sanitized.description = String(rawVoucher.description || '').slice(0, 200)
  const discountVal = Number(rawVoucher.discountAmount ?? rawVoucher.discount ?? 0)
  if (Number.isFinite(discountVal) && discountVal >= 0 && discountVal <= 100_000_000) {
    sanitized.discountAmount = discountVal
  }
  return sanitized
}

export function saveCustomerCart(
  accountId,
  { items = [], appliedVoucher = null, deliveryOption = 'COMBINED' } = {},
  database = getDb()
) {
  if (!accountId) return null
  ensureCustomerCartTable(database)
  const safeItems = Array.isArray(items)
    ? items.slice(0, 50).map(sanitizeCartItemRecord).filter(Boolean)
    : []
  const safeVoucher = sanitizeAppliedVoucherRecord(appliedVoucher)
  const safeDelivery = deliveryOption === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED'
  const itemsJson = JSON.stringify(safeItems)
  const voucherJson = safeVoucher ? JSON.stringify(safeVoucher) : null

  if (Buffer.byteLength(itemsJson, 'utf8') + (voucherJson ? Buffer.byteLength(voucherJson, 'utf8') : 0) > MAX_CART_JSON_BYTES) {
    const sizeErr = new Error('Dữ liệu giỏ hàng vượt quá giới hạn dung lượng cho phép (32KB).')
    sizeErr.status = 400
    sizeErr.code = 'CART_PAYLOAD_TOO_LARGE'
    throw sizeErr
  }

  const now = new Date().toISOString()

  database.prepare(`
    INSERT INTO customer_carts (account_id, items_json, applied_voucher_json, delivery_option, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET
      items_json = excluded.items_json,
      applied_voucher_json = excluded.applied_voucher_json,
      delivery_option = excluded.delivery_option,
      updated_at = excluded.updated_at
  `).run(
    accountId,
    itemsJson,
    voucherJson,
    safeDelivery,
    now
  )

  return {
    items: safeItems,
    appliedVoucher: safeVoucher,
    deliveryOption: safeDelivery,
    updatedAt: now,
  }
}

export function clearCustomerCart(accountId, database = getDb()) {
  if (!accountId) return false
  ensureCustomerCartTable(database)
  const now = new Date().toISOString()
  database.prepare(`
    UPDATE customer_carts
    SET items_json = '[]', applied_voucher_json = NULL, delivery_option = 'COMBINED', updated_at = ?
    WHERE account_id = ?
  `).run(now, accountId)
  return true
}
