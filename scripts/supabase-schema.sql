-- ==============================================================================
-- QUANNGUYENS - ENTERPRISE SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Chạy script này trên Supabase Dashboard -> SQL Editor
-- Website: https://quannguyens.com
-- ==============================================================================

-- 1. BẢNG USERS (Người dùng trung tâm & Khách hàng thân thiết)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  verified INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  marketing_email_opt_in INTEGER NOT NULL DEFAULT 0,
  marketing_opt_in_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2. BẢNG ENTERPRISE_ACCOUNTS (Đa phương thức đăng nhập - Google OAuth, Facebook, Local)
CREATE TABLE IF NOT EXISTS public.enterprise_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ent_accounts_user ON public.enterprise_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ent_accounts_provider ON public.enterprise_accounts(provider, provider_account_id);

-- 3. BẢNG ENTERPRISE_SESSIONS (Quản lý phiên đăng nhập & Token Rotation)
CREATE TABLE IF NOT EXISTS public.enterprise_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT UNIQUE NOT NULL,
  family_id TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  ip_hash TEXT,
  user_agent_hash TEXT,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ent_sessions_token ON public.enterprise_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_ent_sessions_user ON public.enterprise_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ent_sessions_family ON public.enterprise_sessions(family_id);

-- 4. BẢNG SECURITY_AUDIT_LOGS (Nhật ký kiểm toán an ninh hệ thống)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.security_audit_logs(created_at);

-- 5. BẢNG ORDERS (Đơn hàng thương mại điện tử QuanNguyenS)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  shipping_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  order_status TEXT NOT NULL DEFAULT 'PENDING',
  tracking_code TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);

-- 6. BẢNG VOUCHERS (Mã ưu đãi & Voucher chào mừng)
CREATE TABLE IF NOT EXISTS public.vouchers (
  code TEXT PRIMARY KEY,
  account_id TEXT,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  freeship INTEGER NOT NULL DEFAULT 1,
  single_use INTEGER NOT NULL DEFAULT 1,
  used INTEGER NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_account ON public.vouchers(account_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_used ON public.vouchers(used);

-- 7. BẬT ROW LEVEL SECURITY (RLS) ĐẢM BẢO AN TOÀN FAIL-CLOSED
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Gỡ bỏ mọi policy mở PUBLIC/anon cũ nếu từng được chạy trước đây
DROP POLICY IF EXISTS "Service Role Full Access Users" ON public.users;
DROP POLICY IF EXISTS "Service Role Full Access Accounts" ON public.enterprise_accounts;
DROP POLICY IF EXISTS "Service Role Full Access Sessions" ON public.enterprise_sessions;
DROP POLICY IF EXISTS "Service Role Full Access Logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Service Role Full Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Service Role Full Access Vouchers" ON public.vouchers;

-- Chỉ cấp quyền policy riêng cho service_role (lưu ý service_role vốn đã có BYPASSRLS trên Supabase;
-- việc ghi rõ TO service_role ngăn chặn triệt để role anon/authenticated đọc ghi qua PostgREST)
CREATE POLICY "Service Role Only Users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Only Accounts" ON public.enterprise_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Only Sessions" ON public.enterprise_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Only Logs" ON public.security_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Only Orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Only Vouchers" ON public.vouchers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. THU HỒI QUYỀN PUBLIC/ANON/AUTHENTICATED & CHỈ CẤP CHO BACKEND SERVICE_ROLE
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;
