import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

/**
 * Nạp thông minh biến môi trường từ .env, .env.development, .env.local
 * Nguyên tắc: Ưu tiên giá trị không rỗng, tránh việc file rỗng ghi đè file có dữ liệu thật.
 */
export function loadEnvironment(rootDir = process.cwd()) {
  const envFiles = ['.env', '.env.development', '.env.local']
  const candidateDirs = [rootDir, path.resolve(rootDir, 'pijama')]
  for (const dir of candidateDirs) {
    for (const file of envFiles) {
      const fullPath = path.resolve(dir, file)
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = dotenv.parse(fs.readFileSync(fullPath, 'utf-8'))
          for (const [key, value] of Object.entries(parsed)) {
            const valToSet = (key === 'GMAIL_APP_PASSWORD' && typeof value === 'string') ? value.replace(/\s+/g, '') : value
            if (valToSet && valToSet.trim() !== '') {
              process.env[key] = valToSet
            } else if (process.env[key] === undefined) {
              process.env[key] = valToSet
            }
          }
        } catch (e) {
          console.warn(`⚠️ Không thể nạp ${file}:`, e.message)
        }
      }
    }
  }
}


const PLACEHOLDER_PATTERNS = [
  /^xxxx/i,
  /^\[.*\]$/,
  /^<.*>$/,
  /^your[-_]/i,
  /your[_-]?api[_-]?key/i,
  /insert[_-]here/i,
  /^placeholder/i,
]

function isPlaceholder(val) {
  if (!val || typeof val !== 'string') return false
  const trimmed = val.trim()
  return PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed))
}

export function validateEnvironment(env = process.env) {
  const isCI = env.CI === 'true'
  const isProd = env.NODE_ENV === 'production'
  const isTest = env.NODE_ENV === 'test'
  const shouldEnforceFatal = isProd && !isCI

  const results = {
    isValid: true,
    hasFatalErrors: false,
    environment: isCI ? `${env.NODE_ENV || 'production'} (CI)` : (env.NODE_ENV || 'development'),
    isCI,
    required: [],
    featureGated: [],
    forbidden: [],
    legacy: [],
    errors: [],
    warnings: [],
  }

  // Helper check
  const checkVar = (name, isSecret = false, validator = null) => {
    const val = env[name]
    const exists = val !== undefined && val !== null && String(val).trim() !== ''
    const placeholder = exists && isPlaceholder(String(val))

    let status = 'OK'
    let message = ''

    if (!exists) {
      status = 'THIẾU'
    } else if (placeholder) {
      status = 'SAI'
      message = 'Đang dùng giá trị mẫu/placeholder'
    } else if (validator) {
      const valRes = validator(String(val))
      if (valRes !== true) {
        status = 'SAI'
        message = valRes || 'Định dạng không hợp lệ'
      }
    }

    const item = {
      name,
      status,
      isSecret,
      length: exists ? String(val).length : 0,
      message,
    }

    return item
  }

  // ---------------------------------------------------------------------------
  // Nhóm A: Bắt buộc cốt lõi (Required Core)
  // ---------------------------------------------------------------------------
  const requiredSpecs = [
    { name: 'NODE_ENV', isSecret: false },
    { name: 'PORT', isSecret: false },
    { name: 'APP_URL', isSecret: false },
    { name: 'ALLOWED_ORIGINS', isSecret: false },
    { name: 'ADMIN_PASSWORD', isSecret: true, validator: (v) => v.length >= 8 || 'Mật khẩu admin quá ngắn (< 8 ký tự)' },
    { name: 'ADMIN_SESSION_SECRET', isSecret: true, validator: (v) => v.length >= 32 || 'Secret phiên admin quá ngắn (< 32 ký tự)' },
    { name: 'ORDER_TOKEN_SECRET', isSecret: true, validator: (v) => v.length >= 32 || 'Secret token đơn quá ngắn (< 32 ký tự)' },
    { name: 'CUSTOMER_AUTH_SECRET', isSecret: true, validator: (v) => v.length >= 32 || 'Secret auth khách quá ngắn (< 32 ký tự)' },
    { name: 'JWT_SECRET', isSecret: true, validator: (v) => v.length >= 32 || 'JWT Secret quá ngắn (< 32 ký tự)' },
    { name: 'GOOGLE_SHEET_ID', isSecret: false },
    { name: 'GOOGLE_SERVICE_ACCOUNT_EMAIL', isSecret: false, validator: (v) => v.includes('@') || 'Email service account không hợp lệ' },
    {
      name: 'GOOGLE_PRIVATE_KEY',
      isSecret: true,
      validator: (v) => (v.includes('BEGIN') && v.includes('PRIVATE KEY')) || 'Thiếu phần định dạng BEGIN/END PRIVATE KEY',
    },
    { name: 'GMAIL_USER', isSecret: false, validator: (v) => v.includes('@') || 'Gmail user không hợp lệ' },
    {
      name: 'GMAIL_APP_PASSWORD',
      isSecret: true,
      validator: (v) => (v.replace(/\s+/g, '').length === 16 ? true : 'Mật khẩu ứng dụng Gmail phải gồm đúng 16 ký tự'),
    },
    { name: 'OWNER_EMAIL', isSecret: false },
    { name: 'BANK_CODE', isSecret: false },
    { name: 'BANK_ACCOUNT_NUMBER', isSecret: false },
    { name: 'BANK_ACCOUNT_NAME', isSecret: false },
    { name: 'SHOP_NAME', isSecret: false },
    { name: 'SHOP_PHONE', isSecret: false },
    { name: 'SHOP_ADDRESS', isSecret: false },
  ]

  for (const spec of requiredSpecs) {
    const res = checkVar(spec.name, spec.isSecret, spec.validator)
    results.required.push(res)
    if (res.status !== 'OK') {
      if (isProd) {
        results.errors.push(`[BẮT BUỘC PROD] ${res.name}: ${res.status}${res.message ? ` (${res.message})` : ''}`)
      } else {
        results.warnings.push(`[THIẾU DEV] ${res.name}: ${res.status}${res.message ? ` (${res.message})` : ''}`)
      }
    }
  }

  // Kiểm tra đặc thù SePay: Phải có ít nhất SEPAY_WEBHOOK_API_KEY hoặc PAYMENT_WEBHOOK_SECRET
  const sepayKey = checkVar('SEPAY_WEBHOOK_API_KEY', true)
  const webhookSecret = checkVar('PAYMENT_WEBHOOK_SECRET', true)
  results.required.push(sepayKey)
  results.required.push(webhookSecret)
  if (sepayKey.status !== 'OK' && webhookSecret.status !== 'OK') {
    const msg = 'Cần ít nhất một trong hai: SEPAY_WEBHOOK_API_KEY hoặc PAYMENT_WEBHOOK_SECRET'
    if (isProd) {
      results.errors.push(`[BẮT BUỘC PROD] ${msg}`)
    } else {
      results.warnings.push(`[THIẾU DEV] ${msg}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Nhóm B: Theo tính năng (Feature Gated)
  // ---------------------------------------------------------------------------
  const featureSpecs = [
    { name: 'GOOGLE_CLIENT_ID', isSecret: false },
    { name: 'VITE_GOOGLE_CLIENT_ID', isSecret: false },
    { name: 'SUPABASE_URL', isSecret: false },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', isSecret: true },
    { name: 'SUPABASE_ANON_KEY', isSecret: true },
    { name: 'VIETTELPOST_WEBHOOK_SECRET', isSecret: true },
    { name: 'TURNSTILE_SECRET_KEY', isSecret: true },
    { name: 'VITE_TURNSTILE_SITE_KEY', isSecret: false },
    { name: 'REDIS_URL', isSecret: true },
    { name: 'VITE_BACKEND_URL', isSecret: false },
  ]

  for (const spec of featureSpecs) {
    const res = checkVar(spec.name, spec.isSecret)
    results.featureGated.push(res)
  }

  // Kiểm tra đồng bộ Google Client ID (Frontend & Backend phải khớp nhau)
  const gClient = (env.GOOGLE_CLIENT_ID || '').trim()
  const viteGClient = (env.VITE_GOOGLE_CLIENT_ID || '').trim()
  if (gClient && viteGClient && gClient !== viteGClient) {
    results.errors.push('[SAI ĐỒNG BỘ] GOOGLE_CLIENT_ID và VITE_GOOGLE_CLIENT_ID không trùng khớp!')
  }

  // ---------------------------------------------------------------------------
  // Nhóm C: Cấm ở Production (Forbidden In Production)
  // ---------------------------------------------------------------------------
  const forbiddenVars = ['AUTH_TEST_MODE', 'ORDER_STORE_FILE', 'TX_STORE_FILE', 'ACCOUNT_DB_FILE']
  for (const name of forbiddenVars) {
    const val = env[name]
    const exists = val !== undefined && val !== null && String(val).trim() !== ''
    if (exists) {
      const item = { name, status: isProd ? 'CẤM' : 'ĐANG BẬT', value: exists }
      results.forbidden.push(item)
      if (isProd) {
        results.errors.push(`[NGUY HIỂM PROD] Biến ${name} đang được bật ở môi trường Production! Hãy gỡ bỏ ngay.`)
      } else {
        results.warnings.push(`[CẢNH BÁO DEV] Biến ghi đè ${name} đang bật (${val})`)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Nhóm D: Biến cũ / Không dùng trực tiếp (Legacy)
  // ---------------------------------------------------------------------------
  const legacyVars = ['GOOGLE_CLIENT_SECRET', 'SHOP_SLOGAN', 'DATABASE_URL', 'NEXTAUTH_URL']
  for (const name of legacyVars) {
    const res = checkVar(name, false)
    results.legacy.push(res)
  }

  if (results.errors.length > 0) {
    results.isValid = false
    results.hasFatalErrors = shouldEnforceFatal
  }

  return results
}

export function printEnvReport(results) {
  console.log('\n=============================================================================')
  console.log(`📋 BÁO CÁO KIỂM TRA BIẾN MÔI TRƯỜNG (${results.environment.toUpperCase()})`)
  console.log('=============================================================================')

  const renderTable = (items, title) => {
    console.log(`\n▶ ${title}:`)
    console.log('─'.repeat(75))
    console.log(`${'Tên biến'.padEnd(35)} | ${'Loại'.padEnd(10)} | ${'Trạng thái'.padEnd(12)} | Ghi chú`)
    console.log('─'.repeat(75))
    for (const it of items) {
      const typeStr = it.isSecret ? 'Bí mật' : 'Công khai'
      let statusIcon = '✅ OK'
      if (it.status === 'THIẾU') statusIcon = '❌ THIẾU'
      if (it.status === 'SAI') statusIcon = '⚠️ SAI'
      if (it.status === 'CẤM') statusIcon = '⛔ CẤM'

      const note = it.message ? it.message : it.isSecret && it.status === 'OK' ? `Độ dài: ${it.length} ký tự` : ''
      console.log(`${it.name.padEnd(35)} | ${typeStr.padEnd(10)} | ${statusIcon.padEnd(12)} | ${note}`)
    }
  }

  renderTable(results.required, 'Nhóm A: Biến Bắt Buộc Cốt Lõi (Core Required)')
  renderTable(results.featureGated, 'Nhóm B: Tùy Chọn Theo Tính Năng (Feature Gated)')

  if (results.forbidden.length > 0) {
    console.log('\n▶ Nhóm C: Biến Ghi Đè / Chỉ Dành Cho Test (Forbidden in Production):')
    for (const f of results.forbidden) {
      console.log(`  - ⚠️ ${f.name}: ${f.status}`)
    }
  }

  if (results.errors.length > 0) {
    console.log('\n🚨 DANH SÁCH LỖI NGHIÊM TRỌNG (ERRORS):')
    for (const e of results.errors) {
      console.log(`  ❌ ${e}`)
    }
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️ CẢNH BÁO CẦN LƯU Ý (WARNINGS):')
    for (const w of results.warnings) {
      console.log(`  ⚠️ ${w}`)
    }
  }

  console.log('\n' + '='.repeat(75))
  if (results.hasFatalErrors) {
    console.log('⛔ KẾT LUẬN: KHÔNG ĐỦ ĐIỀU KIỆN KHỞI CHẠY PRODUCTION (FAIL-CLOSED).')
  } else if (results.warnings.length > 0 || results.errors.length > 0) {
    console.log('⚠️ KẾT LUẬN: ĐỦ ĐIỀU KIỆN CHẠY DEV (CÁC TÍNH NĂNG THIẾU KHÓA SẼ TỰ CHUYỂN SANG CHẾ ĐỘ DEGRADED).')
  } else {
    console.log('✅ KẾT LUẬN: TOÀN BỘ CẤU HÌNH HỢP LỆ VÀ SẴN SÀNG HOẠT ĐỘNG 100%!')
  }
  console.log('='.repeat(75) + '\n')
}
