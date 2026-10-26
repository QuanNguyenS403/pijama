// server/lib/loyalty/loyaltyDb.js
import crypto from 'crypto'
import { getDb } from '../accountDb.js'
import { normalizeVietnamesePhone } from '../smsService.js'
import { LOYALTY_TIERS, TIER_ORDER } from './loyaltyConfig.js'

let isInitialized = false

/**
 * Migration schema cho toàn bộ hệ thống Loyalty.
 * Hoạt động idempotent: kiểm tra sự tồn tại của bảng và cột trước khi thêm.
 */
export function initLoyaltySchema(db) {
  if (!db) db = getDb()

  // 1. Mở rộng bảng vouchers nếu chưa có các cột mới
  try {
    const voucherColumns = db.pragma('table_info(vouchers)').map((c) => c.name)
    if (!voucherColumns.includes('kind')) {
      db.exec("ALTER TABLE vouchers ADD COLUMN kind TEXT DEFAULT 'percent'")
    }
    if (!voucherColumns.includes('discount_amount')) {
      db.exec('ALTER TABLE vouchers ADD COLUMN discount_amount INTEGER DEFAULT 0')
    }
    if (!voucherColumns.includes('min_subtotal')) {
      db.exec('ALTER TABLE vouchers ADD COLUMN min_subtotal INTEGER DEFAULT 0')
    }
    if (!voucherColumns.includes('expires_at')) {
      db.exec('ALTER TABLE vouchers ADD COLUMN expires_at TEXT')
    }
    if (!voucherColumns.includes('member_id')) {
      db.exec('ALTER TABLE vouchers ADD COLUMN member_id TEXT')
    }
    if (!voucherColumns.includes('source')) {
      db.exec("ALTER TABLE vouchers ADD COLUMN source TEXT DEFAULT 'welcome'")
    }
    if (!voucherColumns.includes('issued_by')) {
      db.exec("ALTER TABLE vouchers ADD COLUMN issued_by TEXT DEFAULT 'system'")
    }
  } catch (err) {
    console.warn('⚠️ [LOYALTY MIGRATION] Bỏ qua kiểm tra vouchers alter:', err.message)
  }

  // 2. Bảng hội viên: loyalty_members
  db.exec(`
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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_members_phone ON loyalty_members(phone);
    CREATE INDEX IF NOT EXISTS idx_loyalty_members_account ON loyalty_members(account_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_members_tier ON loyalty_members(tier);
    CREATE INDEX IF NOT EXISTS idx_loyalty_members_status ON loyalty_members(status);
  `)

  // 3. Sổ cái biến động điểm: loyalty_ledger (Chỉ thêm, không sửa, không xóa)
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      type TEXT NOT NULL,
      points_delta INTEGER NOT NULL,
      spend_delta INTEGER NOT NULL DEFAULT 0,
      order_id TEXT,
      idempotency_key TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      meta TEXT,
      FOREIGN KEY(member_id) REFERENCES loyalty_members(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_ledger_idempotency ON loyalty_ledger(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_member ON loyalty_ledger(member_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order ON loyalty_ledger(order_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_created ON loyalty_ledger(created_at);
  `)

  // 4. Lịch sử thăng / hạ hạng: loyalty_tier_history
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_tier_history (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      from_tier TEXT NOT NULL,
      to_tier TEXT NOT NULL,
      reason TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(member_id) REFERENCES loyalty_members(id)
    );
    CREATE INDEX IF NOT EXISTS idx_loyalty_tier_history_member ON loyalty_tier_history(member_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_tier_history_created ON loyalty_tier_history(created_at);
  `)

  // 5. Cảnh báo bất thường cho Admin: loyalty_alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_alerts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      member_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      details TEXT,
      notes TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_loyalty_alerts_status ON loyalty_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_loyalty_alerts_type ON loyalty_alerts(type);
    CREATE INDEX IF NOT EXISTS idx_loyalty_alerts_member ON loyalty_alerts(member_id);
  `)

  // 6. Quản lý OTP xác thực SĐT: loyalty_phone_verifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_phone_verifications (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      verified INTEGER NOT NULL DEFAULT 0,
      verified_at INTEGER,
      ip_hash TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_loyalty_verif_phone_purpose ON loyalty_phone_verifications(phone, purpose, verified, expires_at);
  `)

  // 7. Quản lý phiên hội viên: loyalty_sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_sessions (
      id TEXT PRIMARY KEY,
      session_hash TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT,
      FOREIGN KEY(member_id) REFERENCES loyalty_members(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_loyalty_sessions_hash ON loyalty_sessions(session_hash);
    CREATE INDEX IF NOT EXISTS idx_loyalty_sessions_member ON loyalty_sessions(member_id);
  `)

  isInitialized = true
}

export function getLoyaltyDb() {
  const db = getDb()
  if (!isInitialized) {
    initLoyaltySchema(db)
  }
  return db
}

function generateId(prefix = 'lm') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

// ── MEMBER QUERIES ──────────────────────────────────────────

export function createMember({
  phone,
  fullName,
  email = null,
  birthDay = null,
  birthMonth = null,
  accountId = null,
  consentVersion = '1.0.0',
  marketingOptIn = 0,
  tier = 'MEMBER',
}) {
  const db = getLoyaltyDb()
  const cleanPhone = normalizeVietnamesePhone(phone)
  const id = generateId('mem')
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO loyalty_members (
      id, phone, phone_verified_at, account_id, full_name, email,
      birth_day, birth_month, tier, tier_changed_at, status,
      consent_version, consent_at, marketing_opt_in, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, 'active',
      ?, ?, ?, ?, ?
    )
  `)

  stmt.run(
    id,
    cleanPhone,
    now,
    accountId || null,
    (fullName || 'Khách hàng thân thiết').trim(),
    email ? email.toLowerCase().trim() : null,
    birthDay ? Number(birthDay) : null,
    birthMonth ? Number(birthMonth) : null,
    tier,
    now,
    consentVersion,
    now,
    marketingOptIn ? 1 : 0,
    now,
    now
  )

  return getMemberById(id)
}

export function getMemberById(id) {
  if (!id) return null
  const db = getLoyaltyDb()
  return db.prepare('SELECT * FROM loyalty_members WHERE id = ?').get(id) || null
}

export function getMemberByPhone(phone) {
  if (!phone) return null
  const cleanPhone = normalizeVietnamesePhone(phone)
  const db = getLoyaltyDb()
  return db.prepare('SELECT * FROM loyalty_members WHERE phone = ?').get(cleanPhone) || null
}

export function getMemberByAccountId(accountId) {
  if (!accountId) return null
  const db = getLoyaltyDb()
  return db.prepare('SELECT * FROM loyalty_members WHERE account_id = ?').get(accountId) || null
}

export function updateMember(id, updates) {
  if (!id || !updates || Object.keys(updates).length === 0) return null
  const db = getLoyaltyDb()

  const fields = []
  const values = []

  for (const [key, val] of Object.entries(updates)) {
    // Chỉ cho phép update các cột an toàn
    if (
      [
        'full_name',
        'email',
        'birth_day',
        'birth_month',
        'tier',
        'tier_changed_at',
        'status',
        'account_id',
        'phone',
        'marketing_opt_in',
      ].includes(key)
    ) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }

  if (fields.length === 0) return getMemberById(id)

  fields.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  db.prepare(`UPDATE loyalty_members SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getMemberById(id)
}

export function linkMemberAccount(memberId, accountId) {
  if (!memberId || !accountId) return false
  const db = getLoyaltyDb()
  const result = db.prepare('UPDATE loyalty_members SET account_id = ?, updated_at = ? WHERE id = ?').run(
    accountId,
    new Date().toISOString(),
    memberId
  )
  return result.changes > 0
}

export function anonymizeAndCloseMember(id, reason = 'Khách yêu cầu xóa tài khoản') {
  const db = getLoyaltyDb()
  const member = getMemberById(id)
  if (!member) return false

  const anonymizedPhone = `closed_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE loyalty_members 
    SET full_name = 'Hội viên đã đóng',
        phone = ?,
        email = NULL,
        birth_day = NULL,
        birth_month = NULL,
        status = 'closed',
        marketing_opt_in = 0,
        updated_at = ?
    WHERE id = ?
  `).run(anonymizedPhone, now, id)

  createAlert({
    type: 'ADMIN_ACTION',
    memberId: id,
    severity: 'info',
    title: `Đã đóng tài khoản hội viên và ẩn danh hóa dữ liệu cá nhân`,
    details: JSON.stringify({ reason, previousPhoneMasked: maskPhone(member.phone) }),
  })

  return true
}

export function listMembers({ tier, status, search, limit = 50, offset = 0 } = {}) {
  const db = getLoyaltyDb()
  const clauses = []
  const params = []

  if (tier) {
    clauses.push('tier = ?')
    params.push(tier)
  }
  if (status) {
    clauses.push('status = ?')
    params.push(status)
  }
  if (search) {
    const cleanSearch = `%${search.trim()}%`
    clauses.push('(phone LIKE ? OR full_name LIKE ? OR email LIKE ?)')
    params.push(cleanSearch, cleanSearch, cleanSearch)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(`
      SELECT * FROM loyalty_members
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset)

  return rows
}

export function countMembers({ tier, status, search } = {}) {
  const db = getLoyaltyDb()
  const clauses = []
  const params = []

  if (tier) {
    clauses.push('tier = ?')
    params.push(tier)
  }
  if (status) {
    clauses.push('status = ?')
    params.push(status)
  }
  if (search) {
    const cleanSearch = `%${search.trim()}%`
    clauses.push('(phone LIKE ? OR full_name LIKE ? OR email LIKE ?)')
    params.push(cleanSearch, cleanSearch, cleanSearch)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const row = db.prepare(`SELECT COUNT(*) as total FROM loyalty_members ${whereSql}`).get(...params)
  return row ? row.total : 0
}

// ── ALERTS CRUD ─────────────────────────────────────────────

export function createAlert({ type, memberId = null, severity = 'info', title, details = '', notes = '' }) {
  const db = getLoyaltyDb()
  const id = generateId('alt')
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO loyalty_alerts (
      id, type, member_id, status, severity, title, details, notes, created_at
    ) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).run(id, type, memberId, severity, title, typeof details === 'object' ? JSON.stringify(details) : details, notes, now)

  return id
}

export function listAlerts({ status = 'open', limit = 50, offset = 0 } = {}) {
  const db = getLoyaltyDb()
  const rows = db
    .prepare(`
      SELECT * FROM loyalty_alerts
      ${status ? 'WHERE status = ?' : ''}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...(status ? [status] : []), limit, offset)
  return rows
}

export function resolveAlert(alertId, resolvedBy = 'admin', notes = '') {
  const db = getLoyaltyDb()
  const now = new Date().toISOString()
  const res = db.prepare(`
    UPDATE loyalty_alerts 
    SET status = 'resolved', resolved_by = ?, resolved_at = ?, notes = CASE WHEN ? != '' THEN ? ELSE notes END
    WHERE id = ?
  `).run(resolvedBy, now, notes, notes, alertId)
  return res.changes > 0
}

// ── UTILS ───────────────────────────────────────────────────

export function maskPhone(phone) {
  if (!phone) return ''
  const clean = String(phone).trim()
  if (clean.length < 7) return clean
  if (clean.length >= 10) {
    return clean.slice(0, 4) + ' *** ' + clean.slice(-3)
  }
  return clean.slice(0, 3) + ' *** ' + clean.slice(-3)
}

// ── LOYALTY SESSIONS ────────────────────────────────────────

export function createLoyaltySession({ memberId, token, ip = '', userAgent = '', ttlDays = 30 }) {
  if (!memberId || !token) return null
  const db = getLoyaltyDb()
  const id = generateId('lsess')
  const sessionHash = crypto.createHash('sha256').update(String(token)).digest('hex')
  const now = Date.now()
  const expiresAt = now + ttlDays * 24 * 60 * 60 * 1000
  const ipHash = crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 16)
  const uaHash = crypto.createHash('sha256').update(String(userAgent || '')).digest('hex').slice(0, 16)

  db.prepare(`
    INSERT INTO loyalty_sessions (
      id, session_hash, member_id, created_at, last_seen_at, expires_at, ip_hash, user_agent_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionHash, memberId, now, now, expiresAt, ipHash, uaHash)

  return { id, memberId, expiresAt }
}

export function findLoyaltySessionByToken(token) {
  if (!token) return null
  const db = getLoyaltyDb()
  const sessionHash = crypto.createHash('sha256').update(String(token)).digest('hex')
  const now = Date.now()

  const session = db
    .prepare(`
      SELECT s.*, m.phone, m.full_name, m.tier, m.status as member_status, m.birth_day, m.birth_month, m.account_id
      FROM loyalty_sessions s
      JOIN loyalty_members m ON s.member_id = m.id
      WHERE s.session_hash = ? AND s.expires_at > ?
    `)
    .get(sessionHash, now)

  if (!session) return null

  // Cập nhật last_seen_at
  db.prepare('UPDATE loyalty_sessions SET last_seen_at = ? WHERE id = ?').run(now, session.id)

  return session
}

