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
