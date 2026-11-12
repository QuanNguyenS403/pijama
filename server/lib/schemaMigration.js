import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Enterprise ORM-like Schema Migration Manager for QuanNguyenS
 * Manages tables: users, accounts, sessions, security_audit_logs, vouchers, verification_challenges
 */
export function runEnterpriseMigrations(database) {
  // 1. BẢNG USERS (Người dùng trung tâm, lưu mật khẩu băm Argon2id)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      status TEXT NOT NULL DEFAULT 'active',
      verified INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      marketing_email_opt_in INTEGER NOT NULL DEFAULT 0,
      marketing_opt_in_at TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `)

  // 2. BẢNG ACCOUNTS (Liên kết danh tính đa phương thức - Google, Facebook, Local)
  database.exec(`
    CREATE TABLE IF NOT EXISTS enterprise_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_account_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ent_accounts_user ON enterprise_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_ent_accounts_provider ON enterprise_accounts(provider, provider_account_id);
  `)

  // 3. BẢNG SESSIONS (Quản lý phiên & Token Rotation, lưu refresh token hash)
  database.exec(`
    CREATE TABLE IF NOT EXISTS enterprise_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT UNIQUE NOT NULL,
      family_id TEXT NOT NULL,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      revoked_at TEXT,
      ip_hash TEXT,
      user_agent_hash TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ent_sessions_token ON enterprise_sessions(refresh_token_hash);
    CREATE INDEX IF NOT EXISTS idx_ent_sessions_user ON enterprise_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_ent_sessions_family ON enterprise_sessions(family_id);
  `)

  // 4. BẢNG SECURITY AUDIT LOGS (Ghi nhận toàn bộ nhật ký an ninh)
  database.exec(`
    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      ip_hash TEXT,
      user_agent_hash TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_logs(created_at);
  `)

  // 4b. BẢNG PAYMENT TRANSACTIONS (Lưu vết mọi giao dịch thanh toán ngân hàng / Webhook)
  try {
    const txTableInfo = database.prepare("PRAGMA table_info(payment_transactions)").all()
    if (txTableInfo.length === 0) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id TEXT PRIMARY KEY,
          tx_id TEXT UNIQUE NOT NULL,
          received_at TEXT NOT NULL,
          amount REAL NOT NULL,
          content TEXT,
          gateway TEXT,
          raw_json TEXT,
          matched_order_id TEXT,
          outcome TEXT NOT NULL,
          status TEXT DEFAULT 'UNMATCHED',
          resolved_at TEXT,
          resolved_by TEXT,
          resolution_note TEXT,
          fingerprint TEXT,
          message_id TEXT,
          bank_time TEXT,
          bank_ref TEXT,
          account_last4 TEXT,
          sender TEXT,
          trust TEXT,
          created_at TEXT NOT NULL
        );
      `)
    } else {
      const colNames = txTableInfo.map((c) => c.name)
      if (!colNames.includes('tx_id')) database.exec("ALTER TABLE payment_transactions ADD COLUMN tx_id TEXT")
      if (!colNames.includes('received_at')) database.exec("ALTER TABLE payment_transactions ADD COLUMN received_at TEXT")
      if (!colNames.includes('raw_json')) database.exec("ALTER TABLE payment_transactions ADD COLUMN raw_json TEXT")
      if (!colNames.includes('matched_order_id')) database.exec("ALTER TABLE payment_transactions ADD COLUMN matched_order_id TEXT")
      if (!colNames.includes('outcome')) database.exec("ALTER TABLE payment_transactions ADD COLUMN outcome TEXT")
      if (!colNames.includes('resolved_at')) database.exec("ALTER TABLE payment_transactions ADD COLUMN resolved_at TEXT")
      if (!colNames.includes('resolved_by')) database.exec("ALTER TABLE payment_transactions ADD COLUMN resolved_by TEXT")
      if (!colNames.includes('resolution_note')) database.exec("ALTER TABLE payment_transactions ADD COLUMN resolution_note TEXT")
      if (!colNames.includes('fingerprint')) database.exec("ALTER TABLE payment_transactions ADD COLUMN fingerprint TEXT")
      if (!colNames.includes('message_id')) database.exec("ALTER TABLE payment_transactions ADD COLUMN message_id TEXT")
      if (!colNames.includes('bank_time')) database.exec("ALTER TABLE payment_transactions ADD COLUMN bank_time TEXT")
      if (!colNames.includes('bank_ref')) database.exec("ALTER TABLE payment_transactions ADD COLUMN bank_ref TEXT")
      if (!colNames.includes('account_last4')) database.exec("ALTER TABLE payment_transactions ADD COLUMN account_last4 TEXT")
      if (!colNames.includes('sender')) database.exec("ALTER TABLE payment_transactions ADD COLUMN sender TEXT")
      if (!colNames.includes('trust')) database.exec("ALTER TABLE payment_transactions ADD COLUMN trust TEXT")
    }
    database.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_tx_id ON payment_transactions(tx_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_fingerprint ON payment_transactions(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_message_id ON payment_transactions(message_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_matched_order ON payment_transactions(matched_order_id);
      CREATE INDEX IF NOT EXISTS idx_payment_tx_outcome ON payment_transactions(outcome);
    `)
  } catch (txErr) {
    console.warn('⚠️ [MIGRATION WARNING] Payment transactions schema migration:', txErr.message)
  }

  // 4c. BẢNG BẢO LƯU OTP & ĐĂNG KÝ BỀN VỮNG (Chống mất mát khi Render Spin-down / Restart)
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
    `)
    const pendCols = database.prepare('PRAGMA table_info(pending_registrations)').all().map((c) => c.name)
    if (pendCols.length > 0 && !pendCols.includes('birth_day')) {
      database.exec('ALTER TABLE pending_registrations ADD COLUMN birth_day INTEGER')
    }
    if (pendCols.length > 0 && !pendCols.includes('birth_month')) {
      database.exec('ALTER TABLE pending_registrations ADD COLUMN birth_month INTEGER')
    }
    if (pendCols.length > 0 && !pendCols.includes('birth_year')) {
      database.exec('ALTER TABLE pending_registrations ADD COLUMN birth_year INTEGER')
    }
    database.exec(`
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

      -- BẢNG EMAIL OUTBOX (WP-B B8: Ghi nhận trạng thái gửi thực tế: queued, sent, sent_unverified_domain, sandboxed, suppressed, blocked_mx, blocked_synthetic, failed, unknown)
      CREATE TABLE IF NOT EXISTS email_outbox (
        id TEXT PRIMARY KEY,
        purpose TEXT NOT NULL,
        recipient_hash TEXT,
        recipient_masked TEXT NOT NULL,
        status TEXT NOT NULL,
        transport TEXT,
        error_code TEXT,
        attempts INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
      CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_outbox(created_at);

      -- BẢNG DANH SÁCH CHẶN GỬI THƯ DO BOUNCE / DELAY / CHẶN THỦ CÔNG (WP-3.1)
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

      -- BẢNG CHỐNG PHÁT LẠI / IDEMPOTENCY CHO WEBHOOK BOUNCE (WP-3.3)
      CREATE TABLE IF NOT EXISTS email_bounce_requests (
        request_id TEXT PRIMARY KEY,
        nonce TEXT,
        received_at INTEGER NOT NULL,
        source TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_email_bounce_requests_nonce ON email_bounce_requests(nonce) WHERE nonce IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_email_bounce_requests_received ON email_bounce_requests(received_at);
    `)
  } catch (pendingErr) {
    console.warn('⚠️ [MIGRATION WARNING] Pending OTP tables migration:', pendingErr.message)
  }

  // 4d. BỔ SUNG CỘT SYNTHETIC_FLAG CHO USERS & ACCOUNTS (WP-5.3 / WP-5.4)
  try {
    const userCols = database.prepare('PRAGMA table_info(users)').all().map((c) => c.name)
    if (userCols.length > 0 && !userCols.includes('synthetic_flag')) {
      database.exec('ALTER TABLE users ADD COLUMN synthetic_flag INTEGER NOT NULL DEFAULT 0')
    }
    if (userCols.length > 0 && !userCols.includes('synthetic_reason')) {
      database.exec('ALTER TABLE users ADD COLUMN synthetic_reason TEXT')
    }
    if (userCols.length > 0 && !userCols.includes('birth_day')) {
      database.exec('ALTER TABLE users ADD COLUMN birth_day INTEGER')
    }
    if (userCols.length > 0 && !userCols.includes('birth_month')) {
      database.exec('ALTER TABLE users ADD COLUMN birth_month INTEGER')
    }
    if (userCols.length > 0 && !userCols.includes('birth_year')) {
      database.exec('ALTER TABLE users ADD COLUMN birth_year INTEGER')
    }

    const accountCols = database.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name)
    if (accountCols.length > 0 && !accountCols.includes('synthetic_flag')) {
      database.exec('ALTER TABLE accounts ADD COLUMN synthetic_flag INTEGER NOT NULL DEFAULT 0')
    }
    if (accountCols.length > 0 && !accountCols.includes('synthetic_reason')) {
      database.exec('ALTER TABLE accounts ADD COLUMN synthetic_reason TEXT')
    }
    if (accountCols.length > 0 && !accountCols.includes('birth_day')) {
      database.exec('ALTER TABLE accounts ADD COLUMN birth_day INTEGER')
    }
    if (accountCols.length > 0 && !accountCols.includes('birth_month')) {
      database.exec('ALTER TABLE accounts ADD COLUMN birth_month INTEGER')
    }
    if (accountCols.length > 0 && !accountCols.includes('birth_year')) {
      database.exec('ALTER TABLE accounts ADD COLUMN birth_year INTEGER')
    }
  } catch (synErr) {
    console.warn('⚠️ [MIGRATION WARNING] Synthetic flag / birth column migration:', synErr.message)
  }

  // 5. ĐỒNG BỘ TƯƠNG THÍCH NGƯỢC (Backfill từ bảng accounts cũ sang users nếu có)
  try {
    const existingOldAccounts = database.prepare(`
      SELECT id, full_name, email, phone, avatar_url, verified, verified_at, created_at
      FROM accounts
      WHERE id != 'system'
    `).all()

    const insertUser = database.prepare(`
      INSERT OR IGNORE INTO users (id, email, full_name, avatar_url, phone, role, status, verified, verified_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'customer', 'active', ?, ?, ?, ?)
    `)

    for (const acc of existingOldAccounts) {
      const email = acc.email ? acc.email.toLowerCase().trim() : null
      insertUser.run(
        acc.id,
        email,
        acc.full_name || 'Khách hàng QuanNguyenS',
        acc.avatar_url || null,
        acc.phone || null,
        acc.verified || 0,
        acc.verified_at || null,
        acc.created_at || new Date().toISOString(),
        new Date().toISOString()
      )
    }
  } catch (err) {
    // Không làm gián đoạn nếu accounts cũ chưa khởi tạo
  }
}
