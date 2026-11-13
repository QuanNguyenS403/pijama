import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import crypto from 'crypto'
import { isNodeTestRunner } from './emailRecipientGuard.js'
import {
  getNormalizedNodeEnv,
  isProductionEnv,
  isRenderEnvironment,
  isSmtpAllowedOnCurrentPlatform,
} from './shopConfig.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

// Ghi nhớ các biến do chính loadEnvironment() nạp từ file (key -> value đã set).
// Biến nào đang có giá trị trong process.env mà KHÔNG nằm trong map này (hoặc đã bị đổi giá trị)
// là biến do môi trường bên ngoài cấp (cross-env, shell, Render dashboard, test runner...)
// => TUYỆT ĐỐI không được ghi đè. Trước đây NODE_ENV=test của `npm test` bị .env ghi đè thành
// "development", khiến bộ test gửi email OTP THẬT tới các địa chỉ giả (gây bounce Mail Delivery Subsystem).
const fileManagedEnv = new Map()

// Các biến điều khiển môi trường chạy & gửi email thật: TUYỆT ĐỐI không được nạp/ghi đè từ .env khi đang ở test runner
const TEST_RUNNER_PROTECTED_KEYS = new Set([
  'NODE_ENV',
  'NODE_TEST_CONTEXT',
  'EMAIL_REAL_SEND',
  'AUTH_TEST_MODE',
  'EMAIL_DELIVERY_DISABLED',
])

/**
 * Nạp thông minh biến môi trường từ .env, .env.development, .env.local
 * Nguyên tắc:
 *  - Biến môi trường do bên ngoài cấp (process/shell/CI) luôn được ưu tiên, file .env không ghi đè.
 *  - Trong Node test runner (NODE_ENV=test / NODE_TEST_CONTEXT / --test), không bao giờ nạp/ghi đè
 *    NODE_ENV, NODE_TEST_CONTEXT, EMAIL_REAL_SEND, AUTH_TEST_MODE từ file .env.
 *  - Giữa các file: ưu tiên giá trị không rỗng, tránh việc file rỗng ghi đè file có dữ liệu thật.
 */
export function loadEnvironment(rootDir = process.cwd(), options = {}) {
  const { onlyRootDir = false } = options || {}
  const inTestRunner = isNodeTestRunner()
  const envFiles = ['.env', '.env.development', '.env.local']
  const candidateDirs = onlyRootDir
    ? [rootDir]
    : Array.from(new Set([rootDir, path.resolve(rootDir, 'pijama'), projectRoot]))
  for (const dir of candidateDirs) {
    for (const file of envFiles) {
      const fullPath = path.resolve(dir, file)
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = dotenv.parse(fs.readFileSync(fullPath, 'utf-8'))
          for (const [key, value] of Object.entries(parsed)) {
            if (inTestRunner && TEST_RUNNER_PROTECTED_KEYS.has(key)) continue
            const valToSet = (key === 'GMAIL_APP_PASSWORD' && typeof value === 'string') ? value.replace(/\s+/g, '') : value
            const current = process.env[key]
            const isExternallyProvided =
              current !== undefined &&
              String(current).trim() !== '' &&
              (!fileManagedEnv.has(key) || fileManagedEnv.get(key) !== current)
            if (isExternallyProvided) continue

            if (valToSet && valToSet.trim() !== '') {
              process.env[key] = valToSet
              fileManagedEnv.set(key, valToSet)
            } else if (current === undefined) {
              process.env[key] = valToSet
              fileManagedEnv.set(key, valToSet)
            }
          }
        } catch (e) {
          console.warn(`⚠️ Không thể nạp ${file}:`, e.message)
        }
      }
    }
  }

  // Tự động nhận diện môi trường Render.com
  if (process.env.RENDER_EXTERNAL_URL) {
    const cleanRenderUrl = String(process.env.RENDER_EXTERNAL_URL).trim().replace(/\/+$/, '')
    process.env.RENDER_EXTERNAL_URL = cleanRenderUrl
    if (!process.env.APP_URL) {
      process.env.APP_URL = cleanRenderUrl
    }
    if (!process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS = `${cleanRenderUrl},https://quannguyens.com,https://www.quannguyens.com`
    }
  }

  // Nếu chưa cấu hình SePay Webhook, tự sinh secret ngẫu nhiên để bảo vệ an toàn cổng webhook mà không chặn khởi động
  if (!process.env.SEPAY_WEBHOOK_API_KEY && !process.env.PAYMENT_WEBHOOK_SECRET) {
    process.env.PAYMENT_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex')
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
  const normEnv = getNormalizedNodeEnv(env)
  const isProd = isProductionEnv(env)
  const isTest = normEnv === 'test'
  const shouldEnforceFatal = isProd && !isCI

  // Tạo bản sao env an toàn để tự động suy diễn trên Render nếu cần (không làm bẩn process.env thật khi test)
  const effectiveEnv = { ...env }
  if (effectiveEnv.RENDER_EXTERNAL_URL) {
    const cleanRenderUrl = String(effectiveEnv.RENDER_EXTERNAL_URL).trim().replace(/\/+$/, '')
    effectiveEnv.RENDER_EXTERNAL_URL = cleanRenderUrl
    if (!effectiveEnv.APP_URL) {
      effectiveEnv.APP_URL = cleanRenderUrl
    }
    if (!effectiveEnv.ALLOWED_ORIGINS) {
      effectiveEnv.ALLOWED_ORIGINS = `${cleanRenderUrl},https://quannguyens.com,https://www.quannguyens.com`
    }
  }

  const results = {
    isValid: true,
    hasFatalErrors: false,
    environment: isCI ? `${effectiveEnv.NODE_ENV || 'production'} (CI)` : (effectiveEnv.NODE_ENV || 'development'),
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
    const val = effectiveEnv[name]
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
  // Chỉ những biến an ninh / định danh cốt lõi mới chặn khởi động (fail-closed)
  // ---------------------------------------------------------------------------
  const requiredSpecs = [
    { name: 'NODE_ENV', isSecret: false, fatalInProd: true },
    { name: 'PORT', isSecret: false, fatalInProd: false },
    { name: 'APP_URL', isSecret: false, fatalInProd: false },
    { name: 'ALLOWED_ORIGINS', isSecret: false, fatalInProd: false },
    { name: 'ADMIN_PASSWORD', isSecret: true, fatalInProd: true, validator: (v) => v.length >= 8 || 'Mật khẩu admin quá ngắn (< 8 ký tự)' },
    { name: 'ADMIN_SESSION_SECRET', isSecret: true, fatalInProd: true, validator: (v) => v.length >= 32 || 'Secret phiên admin quá ngắn (< 32 ký tự)' },
    { name: 'ORDER_TOKEN_SECRET', isSecret: true, fatalInProd: true, validator: (v) => v.length >= 32 || 'Secret token đơn quá ngắn (< 32 ký tự)' },
    { name: 'CUSTOMER_AUTH_SECRET', isSecret: true, fatalInProd: true, validator: (v) => v.length >= 32 || 'Secret auth khách quá ngắn (< 32 ký tự)' },
    { name: 'JWT_SECRET', isSecret: true, fatalInProd: true, validator: (v) => v.length >= 32 || 'JWT Secret quá ngắn (< 32 ký tự)' },
    { name: 'GMAIL_USER', isSecret: false, fatalInProd: false, validator: (v) => v.includes('@') || 'Gmail user không hợp lệ' },
    { name: 'OWNER_EMAIL', isSecret: false, fatalInProd: false },
    { name: 'BANK_CODE', isSecret: false, fatalInProd: false },
    { name: 'BANK_ACCOUNT_NUMBER', isSecret: false, fatalInProd: false },
    { name: 'BANK_ACCOUNT_NAME', isSecret: false, fatalInProd: false },
    { name: 'SHOP_NAME', isSecret: false, fatalInProd: false },
    { name: 'SHOP_PHONE', isSecret: false, fatalInProd: false },
    { name: 'SHOP_ADDRESS', isSecret: false, fatalInProd: false },
  ]

  for (const spec of requiredSpecs) {
    const res = checkVar(spec.name, spec.isSecret, spec.validator)
    results.required.push(res)
    if (res.status !== 'OK') {
      if (isProd && spec.fatalInProd) {
        results.errors.push(`[BẮT BUỘC PROD] ${res.name}: ${res.status}${res.message ? ` (${res.message})` : ''}`)
      } else if (isProd) {
        results.warnings.push(`[CẤU HÌNH MẶC ĐỊNH / DEGRADED] ${res.name}: ${res.status}${res.message ? ` (${res.message})` : ''}`)
      } else {
        results.warnings.push(`[THIẾU DEV] ${res.name}: ${res.status}${res.message ? ` (${res.message})` : ''}`)
      }
    }
  }

  // Kiểm tra phương thức gửi email: Hỗ trợ Google Apps Script HTTPS Bridge, Resend API hoặc Gmail SMTP (GMAIL_APP_PASSWORD).
  // Lưu ý: Render gói Free chặn cổng SMTP 25/465/587 từ 26/09/2025 => trên Render không tính hasSmtp trừ khi EMAIL_ALLOW_SMTP_ON_RENDER=true.
  const isRender = isRenderEnvironment(effectiveEnv)
  const smtpAllowedOnPlatform = isSmtpAllowedOnCurrentPlatform(effectiveEnv)
  const gasUrlKey = effectiveEnv.GAS_EMAIL_WEBHOOK_URL
    ? 'GAS_EMAIL_WEBHOOK_URL'
    : effectiveEnv.GMAIL_APP_SCRIPT_URL
      ? 'GMAIL_APP_SCRIPT_URL'
      : effectiveEnv.GMAIL_BRIDGE_WEBHOOK_URL
        ? 'GMAIL_BRIDGE_WEBHOOK_URL'
        : 'GAS_EMAIL_WEBHOOK_URL'
  const gasSecretKey = effectiveEnv.GAS_WEBHOOK_SECRET
    ? 'GAS_WEBHOOK_SECRET'
    : effectiveEnv.GMAIL_BRIDGE_SECRET
      ? 'GMAIL_BRIDGE_SECRET'
      : 'GAS_WEBHOOK_SECRET'

  const gasUrlCheck = checkVar(gasUrlKey, false, (v) => v.startsWith('https://') || 'URL Google Apps Script phải bắt đầu bằng https://')
  const gasSecretCheck = checkVar(gasSecretKey, true)
  const hasGas = gasUrlCheck.status === 'OK' && gasSecretCheck.status === 'OK'

  const resendKeyCheck = checkVar('RESEND_API_KEY', true)
  const resendFromCheck = checkVar('RESEND_FROM_EMAIL', false)
  const hasResendKey = resendKeyCheck.status === 'OK'
  const hasVerifiedResendFrom =
    resendFromCheck.status === 'OK' && !String(effectiveEnv.RESEND_FROM_EMAIL || '').toLowerCase().includes('@resend.dev')
  const hasResend = Boolean(hasResendKey && (!isProd || hasVerifiedResendFrom))
  const gmailPassCheck = checkVar('GMAIL_APP_PASSWORD', true, (v) => (v.replace(/\s+/g, '').length === 16 ? true : 'Mật khẩu ứng dụng Gmail phải gồm đúng 16 ký tự'))
  const hasSmtpCredentials = gmailPassCheck.status === 'OK'
  const hasSmtp = hasSmtpCredentials && smtpAllowedOnPlatform
  const hasUsableEmailDelivery = hasGas || hasResend || hasSmtp

  results.featureGated.push(gasUrlCheck)
  results.featureGated.push(gasSecretCheck)
  results.featureGated.push(resendKeyCheck)
  results.featureGated.push(gmailPassCheck)

  if (hasResendKey && isProd && !hasVerifiedResendFrom) {
    results.warnings.push('[RESEND CONFIG] RESEND_API_KEY đã bật nhưng thiếu RESEND_FROM_EMAIL hợp lệ (không dùng @resend.dev ở Production)')
  }

  if (isRender && hasSmtpCredentials && !smtpAllowedOnPlatform) {
    results.warnings.push(
      '[RENDER CHẶN SMTP] GMAIL_APP_PASSWORD đã cấu hình nhưng Render gói Free chặn cổng SMTP 25/465/587 (từ 26/09/2025). Hãy cấu hình GAS_EMAIL_WEBHOOK_URL (Apps Script HTTPS 443) hoặc RESEND_API_KEY, hoặc đặt EMAIL_ALLOW_SMTP_ON_RENDER=true nếu dùng gói trả phí.'
    )
  }

  if (!hasUsableEmailDelivery) {
    const msg = isRender
      ? 'Chưa có kênh gửi email HTTPS hợp lệ trên Render (cổng SMTP 465/587 bị chặn trên gói Free): Cần GAS_EMAIL_WEBHOOK_URL + GAS_WEBHOOK_SECRET hoặc RESEND_API_KEY + RESEND_FROM_EMAIL hợp lệ (hoặc EMAIL_ALLOW_SMTP_ON_RENDER=true nếu dùng gói trả phí)'
      : 'Chưa cấu hình đầy đủ gửi email: Cần GAS_EMAIL_WEBHOOK_URL, GMAIL_APP_PASSWORD (16 ký tự) hoặc RESEND_API_KEY + RESEND_FROM_EMAIL hợp lệ'
    if (effectiveEnv.REQUIRE_EMAIL_DELIVERY === 'true' && isProd) {
      results.errors.push(`[BẮT BUỘC PROD] ${msg}`)
    } else if (isProd) {
      results.emailDeliveryMissingInProd = true
      results.warnings.push(`[CHẾ ĐỘ DEGRADED] ${msg} — Web vẫn khởi chạy nhưng chức năng gửi email sẽ từ chối fail-closed; khuyến nghị cấu hình GAS_EMAIL_WEBHOOK_URL hoặc RESEND_API_KEY`)
    } else {
      results.warnings.push(`[THIẾU DEV] ${msg}`)
    }
  } else if (!hasSmtp && !hasGas && hasResend) {
    results.warnings.push('[TÙY CHỌN FALLBACK] GMAIL_APP_PASSWORD chưa cấu hình (hệ thống gửi email qua Resend API)')
  }

  // Kiểm tra ổ đĩa bền vững / đồng bộ đám mây trên Render Production (G3)
  const hasPersistentConfirm = String(effectiveEnv.PERSISTENT_STORAGE_CONFIRMED || '').trim().toLowerCase() === 'true'
  const customDataDir = String(effectiveEnv.DATA_DIR || '').trim()
  const hasSupabaseCloud =
    Boolean(String(effectiveEnv.SUPABASE_URL || '').trim().startsWith('https://')) &&
    Boolean(String(effectiveEnv.SUPABASE_SERVICE_ROLE_KEY || '').trim())
  if (isProd && isRender && !hasPersistentConfirm && !customDataDir && !hasSupabaseCloud) {
    results.ephemeralStorageInProd = true
    results.warnings.push(
      '[CẢNH BÁO Ổ TẠM RENDER] DỮ LIỆU ĐANG Ở Ổ TẠM (server/data, public/uploads) — SẼ MẤT KHI REDEPLOY/RESTART! Trên Render Free hãy cấu hình SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (hoặc gắn Persistent Disk trên gói Starter).'
    )
  }

  // Kiểm tra Google Sheets: Chế độ Degraded an toàn nếu không bắt buộc (REQUIRE_GOOGLE_SHEETS !== 'true')
  const sheetIdCheck = checkVar('GOOGLE_SHEET_ID', false)
  const sheetEmailCheck = checkVar('GOOGLE_SERVICE_ACCOUNT_EMAIL', false, (v) => v.includes('@') || 'Email service account không hợp lệ')
  const sheetKeyCheck = checkVar('GOOGLE_PRIVATE_KEY', true, (v) => (v.includes('BEGIN') && v.includes('PRIVATE KEY')) || 'Thiếu phần định dạng BEGIN/END PRIVATE KEY')
  results.featureGated.push(sheetIdCheck, sheetEmailCheck, sheetKeyCheck)

  const sheetOk = sheetIdCheck.status === 'OK' && sheetEmailCheck.status === 'OK' && sheetKeyCheck.status === 'OK'
  if (!sheetOk) {
    if (effectiveEnv.REQUIRE_GOOGLE_SHEETS === 'true' && isProd) {
      results.errors.push('[BẮT BUỘC PROD] Thiếu cấu hình Google Sheets (REQUIRE_GOOGLE_SHEETS=true)')
    } else {
      results.warnings.push('[CHẾ ĐỘ DEGRADED] Thiếu cấu hình Google Sheets: Đơn hàng lưu tại SQLite/JSON cục bộ, tạm tắt đồng bộ Google Sheets')
    }
  }

  // Kiểm tra đặc thù SePay: Phải có ít nhất SEPAY_WEBHOOK_API_KEY hoặc PAYMENT_WEBHOOK_SECRET
  const sepayKey = checkVar('SEPAY_WEBHOOK_API_KEY', true)
  const webhookSecret = checkVar('PAYMENT_WEBHOOK_SECRET', true)
  results.required.push(sepayKey)
  results.required.push(webhookSecret)
  if (sepayKey.status !== 'OK' && webhookSecret.status !== 'OK') {
    const msg = 'Chưa cấu hình SePay: Cổng webhook SePay tạm tắt an toàn, shop vẫn hoạt động bình thường với VietQR Napas 24/7'
    results.warnings.push(`[CẢNH BÁO TÍNH NĂNG] ${msg}`)
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
    { name: 'LOYALTY_ENABLED', isSecret: false },
    { name: 'LOYALTY_OTP_PROVIDER', isSecret: false },
    { name: 'LOYALTY_PHONE_VERIFIER', isSecret: false },
    { name: 'ZALO_OA_ACCESS_TOKEN', isSecret: true },
    { name: 'ZALO_OA_TOKEN', isSecret: true },
    { name: 'ZALO_APP_ID', isSecret: false },
    { name: 'ZALO_SECRET_KEY', isSecret: true },
    { name: 'ZALO_ZNS_TEMPLATE_OTP', isSecret: false },
    { name: 'ZALO_OTP_TEMPLATE_ID', isSecret: false },
    { name: 'LOYALTY_OTP_DAILY_LIMIT_PER_PHONE', isSecret: false },
    { name: 'LOYALTY_OTP_DAILY_LIMIT_PER_IP', isSecret: false },
    { name: 'LOYALTY_OTP_DAILY_BUDGET_COUNT', isSecret: false },
    { name: 'LOYALTY_OTP_RESEND_COOLDOWN_SEC', isSecret: false },
    { name: 'LOYALTY_OTP_TTL_SEC', isSecret: false },
  ]

  for (const spec of featureSpecs) {
    const res = checkVar(spec.name, spec.isSecret)
    results.featureGated.push(res)
  }

  // Kiểm tra đồng bộ Google Client ID (Frontend & Backend phải khớp nhau)
  const gClient = (effectiveEnv.GOOGLE_CLIENT_ID || '').trim()
  const viteGClient = (effectiveEnv.VITE_GOOGLE_CLIENT_ID || '').trim()
  if (gClient && viteGClient && gClient !== viteGClient) {
    results.errors.push('[SAI ĐỒNG BỘ] GOOGLE_CLIENT_ID và VITE_GOOGLE_CLIENT_ID không trùng khớp!')
  }

  // ---------------------------------------------------------------------------
  // Nhóm C: Cấm ở Production (Forbidden In Production)
  // ---------------------------------------------------------------------------
  const forbiddenVars = ['AUTH_TEST_MODE', 'ORDER_STORE_FILE', 'TX_STORE_FILE', 'ACCOUNT_DB_FILE']
  for (const name of forbiddenVars) {
    const val = effectiveEnv[name]
    const trimmed = val !== undefined && val !== null ? String(val).trim() : ''
    const exists = trimmed !== ''
    if (!exists) continue

    // Cho phép AUTH_TEST_MODE=false/0 (cảnh báo dọn sạch), chỉ chặn cứng khi bật true/1
    if (name === 'AUTH_TEST_MODE' && !/^(true|1|yes|on)$/i.test(trimmed)) {
      results.warnings.push(`[DỌN DẸP ENV] Biến AUTH_TEST_MODE="${trimmed}" đang tắt nhưng nên xóa hẳn khỏi Production env.`)
      continue
    }

    const item = { name, status: isProd ? 'CẤM' : 'ĐANG BẬT', value: exists }
    results.forbidden.push(item)
    if (isProd) {
      results.errors.push(`[NGUY HIỂM PROD] Biến ${name} đang được bật ở môi trường Production! Hãy gỡ bỏ ngay.`)
    } else {
      results.warnings.push(`[CẢNH BÁO DEV] Biến ghi đè ${name} đang bật (${val})`)
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

  // Kiểm tra tách biệt khóa bí mật (tránh dùng chung JWT_SECRET với khóa phiên admin/đơn hàng)
  const jwtSecretVal = String(effectiveEnv.JWT_SECRET || '').trim()
  const secretPairs = [
    ['ADMIN_SESSION_SECRET', effectiveEnv.ADMIN_SESSION_SECRET],
    ['ORDER_TOKEN_SECRET', effectiveEnv.ORDER_TOKEN_SECRET],
    ['CUSTOMER_AUTH_SECRET', effectiveEnv.CUSTOMER_AUTH_SECRET],
  ]
  if (jwtSecretVal) {
    for (const [keyName, keyVal] of secretPairs) {
      if (keyVal && String(keyVal).trim() === jwtSecretVal) {
        results.warnings.push(`[TÁCH KHÓA] ${keyName} đang trùng giá trị với JWT_SECRET — nên sinh khóa riêng biệt cho từng mục đích.`)
      }
    }
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

  if (results.emailDeliveryMissingInProd) {
    console.error('❌ [EMAIL DELIVERY ERROR] Production đang thiếu kênh gửi email hợp lệ (trên Render Free cổng SMTP 465/587 bị chặn — cần GAS_EMAIL_WEBHOOK_URL + GAS_WEBHOOK_SECRET hoặc RESEND_API_KEY + RESEND_FROM_EMAIL). Đặt REQUIRE_EMAIL_DELIVERY=true để chặn khởi động khi thiếu.')
  }

  if (results.ephemeralStorageInProd) {
    console.error('🚨 [ERROR: DỮ LIỆU ĐANG Ở Ổ TẠM — SẼ MẤT KHI REDEPLOY] Render chưa cấu hình Persistent Disk (DATA_DIR / UPLOADS_DIR). Mọi đơn hàng, tài khoản SQLite (accounts.db), và ảnh chứng từ trên ổ đĩa container sẽ mất khi redeploy/spin-down!')
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
    const isProdEnv = String(results.environment || '').toLowerCase().includes('production')
    console.log(
      isProdEnv
        ? '⚠️ KẾT LUẬN: ĐỦ ĐIỀU KIỆN CHẠY PRODUCTION (CÁC TÍNH NĂNG THIẾU KHÓA CHẠY Ở CHẾ ĐỘ DEGRADED AN TOÀN).'
        : '⚠️ KẾT LUẬN: ĐỦ ĐIỀU KIỆN CHẠY DEV (CÁC TÍNH NĂNG THIẾU KHÓA SẼ TỰ CHUYỂN SANG CHẾ ĐỘ DEGRADED).'
    )
  } else {
    console.log('✅ KẾT LUẬN: TOÀN BỘ CẤU HÌNH HỢP LỆ VÀ SẴN SÀNG HOẠT ĐỘNG 100%!')
  }
  console.log('='.repeat(75) + '\n')
}
