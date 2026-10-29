// server/lib/loyalty/phoneVerifier.js
import { getLoyaltyDb, getMemberByPhone, maskPhone, createAlert } from './loyaltyDb.js'
import { LOYALTY_RULES } from './loyaltyConfig.js'
import {
  generateOtpCode,
  generateSalt,
  hashOtpCode,
  verifyOtpCode,
  hashClientMetadata,
} from '../authCrypto.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone } from '../smsService.js'
import {
  sendOtpViaProvider,
  __getTestOtpForPhone,
  __clearTestOtpStore,
  isZaloConfigured,
} from './otpProviders/index.js'

// Re-export test hooks cho compatibility
export { __getTestOtpForPhone, __clearTestOtpStore }

export const ALLOWED_PURPOSES = [
  'enrollment',
  'login',
  'step_up_checkout',
  'claim_points',
  'change_phone',
]

/**
 * Gửi mã OTP tới số điện thoại hội viên.
 * Hỗ trợ các mục đích: 'enrollment', 'login', 'step_up_checkout', 'change_phone', 'claim_points'.
 */
export async function sendLoyaltyOtp({
  phone,
  purpose = 'enrollment',
  ip = '',
  userAgent = '',
  providerOverride = null,
}) {
  const cleanPhone = normalizeVietnamesePhone(phone)
  if (!cleanPhone || !isValidVietnamesePhone(cleanPhone)) {
    return {
      success: false,
      errorCode: 'INVALID_PHONE',
      error: 'Số điện thoại không đúng định dạng di động Việt Nam hợp lệ',
    }
  }

  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return {
      success: false,
      errorCode: 'INVALID_PURPOSE',
      error: `Mục đích xác thực '${purpose}' không được chấp nhận`,
    }
  }

  const ttlSec = Number(process.env.LOYALTY_OTP_TTL_SEC) || Math.floor(LOYALTY_RULES.OTP_TTL_MS / 1000)
  const ttlMs = ttlSec * 1000
  const ttlMinutes = Math.max(1, Math.round(ttlSec / 60))
  const cooldownSec = Number(process.env.LOYALTY_OTP_RESEND_COOLDOWN_SEC) || Math.floor(LOYALTY_RULES.OTP_RESEND_COOLDOWN_MS / 1000)
  const cooldownMs = cooldownSec * 1000
  const dailyLimit = Number(process.env.LOYALTY_OTP_DAILY_LIMIT_PER_PHONE) || 5

  // 1. Chống user enumeration đối với purpose = 'login'
  // Nếu SĐT chưa là thành viên hoạt động: trả phản hồi trung tính 200, KHÔNG sinh mã, KHÔNG gọi provider
  if (purpose === 'login') {
    const member = getMemberByPhone(cleanPhone)
    if (!member || member.status !== 'active') {
      return {
        success: true,
        message: 'Nếu số điện thoại này đã tham gia hội viên, mã xác thực đã được gửi.',
        expiresInSeconds: ttlSec,
      }
    }
  }

  const db = getLoyaltyDb()
  const now = Date.now()
  const { ipHash } = hashClientMetadata(ip, userAgent)

  // 2. Kiểm tra Cooldown giữa 2 lần gửi liên tiếp của cùng 1 SĐT
  const recent = db
    .prepare(`
      SELECT * FROM loyalty_phone_verifications
      WHERE phone = ? AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(cleanPhone, now - cooldownMs)

  if (recent) {
    const waitSeconds = Math.ceil((recent.created_at + cooldownMs - now) / 1000)
    return {
      success: false,
      errorCode: 'COOLDOWN_ACTIVE',
      error: `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại mã mới`,
      cooldownRemaining: waitSeconds,
    }
  }

  // 3. Chặn Flood: Tối đa dailyLimit lần gửi / SĐT trong vòng 24 giờ
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const dailyCount = db
    .prepare(`
      SELECT COUNT(*) as count FROM loyalty_phone_verifications
      WHERE phone = ? AND created_at > ?
    `)
    .get(cleanPhone, oneDayAgo)?.count || 0

  if (dailyCount >= dailyLimit) {
    createAlert({
      type: 'OTP_FLOOD',
      severity: 'warning',
      title: `Số điện thoại yêu cầu OTP vượt giới hạn ngày: ${maskPhone(cleanPhone)}`,
      details: { phone: maskPhone(cleanPhone), dailyCount, dailyLimit },
    })
    return {
      success: false,
      errorCode: 'DAILY_LIMIT_EXCEEDED',
      error: 'Số điện thoại này đã vượt quá số lần yêu cầu mã trong ngày. Vui lòng thử lại vào ngày mai.',
    }
  }

  // 4. Tạo mã OTP an toàn
  const code = generateOtpCode()
  const salt = generateSalt()
  const codeHash = hashOtpCode(code, salt)
  const expiresAt = now + ttlMs
  const id = `vcode_${now}_${Math.random().toString(36).substring(2, 8)}`

  // 5. Lưu hash vào database
  db.prepare(`
    INSERT INTO loyalty_phone_verifications (
      id, phone, code_hash, salt, purpose, expires_at,
      attempts, max_attempts, verified, ip_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
  `).run(id, cleanPhone, codeHash, salt, purpose, expiresAt, LOYALTY_RULES.OTP_MAX_ATTEMPTS, ipHash, now)

  // 6. Gửi mã qua provider thống nhất
  const providerResult = await sendOtpViaProvider({
    phone: cleanPhone,
    code,
    purpose,
    ttlMinutes,
    providerOverride,
  })

  if (!providerResult.ok) {
    // Xóa record vừa tạo để tránh ghost cooldown khi gửi thất bại
    try {
      db.prepare('DELETE FROM loyalty_phone_verifications WHERE id = ?').run(id)
    } catch (cleanupErr) {
      console.warn('⚠️ [OTP CLEANUP ERROR]', cleanupErr.message)
    }

    return {
      success: false,
      errorCode: providerResult.errorCode || 'SEND_FAILED',
      error: providerResult.error || 'Không thể gửi tin xác thực lúc này',
    }
  }

  return {
    success: true,
    message: providerResult.message || 'Mã xác thực 6 chữ số đã được gửi tới số điện thoại của bạn',
    expiresInSeconds: ttlSec,
    // TUYỆT ĐỐI KHÔNG TRẢ CODE TRONG RESPONSE KỂ CẢ TEST
  }
}

/**
 * Xác thực mã OTP nhập vào.
 * So khớp constant-time, giới hạn 5 lần thử, tự hủy khi vượt quá.
 */
export function verifyLoyaltyOtp({ phone, code, purpose = 'enrollment' }) {
  const cleanPhone = normalizeVietnamesePhone(phone)
  const cleanCode = String(code || '').trim()

  if (!cleanPhone || !cleanCode) {
    return {
      success: false,
      errorCode: 'MISSING_PARAMS',
      error: 'Vui lòng nhập đầy đủ số điện thoại và mã xác thực',
    }
  }

  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return {
      success: false,
      errorCode: 'INVALID_PURPOSE',
      error: `Mục đích xác thực '${purpose}' không hợp lệ`,
    }
  }

  const db = getLoyaltyDb()
  const now = Date.now()

  // 1. Tìm bản ghi OTP mới nhất còn hiệu lực
  const record = db
    .prepare(`
      SELECT * FROM loyalty_phone_verifications
      WHERE phone = ? AND purpose = ? AND verified = 0
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(cleanPhone, purpose)

  if (!record) {
    return {
      success: false,
      errorCode: 'RECORD_NOT_FOUND',
      error: 'Yêu cầu xác thực không tồn tại hoặc đã được sử dụng',
    }
  }

  if (now > record.expires_at) {
    return {
      success: false,
      errorCode: 'OTP_EXPIRED',
      error: 'Mã xác thực đã hết hạn (hiệu lực 5 phút). Vui lòng yêu cầu mã mới.',
    }
  }

  if (record.attempts >= record.max_attempts) {
    return {
      success: false,
      errorCode: 'MAX_ATTEMPTS_EXCEEDED',
      error: 'Bạn đã nhập sai quá số lần cho phép (5 lần). Mã này đã bị vô hiệu hóa.',
    }
  }

  // 2. So khớp mã an toàn bằng TimingSafeEqual
  const isMatch = verifyOtpCode(cleanCode, record.salt, record.code_hash)

  if (!isMatch) {
    const nextAttempts = record.attempts + 1
    db.prepare('UPDATE loyalty_phone_verifications SET attempts = ? WHERE id = ?').run(nextAttempts, record.id)
    const remaining = Math.max(0, record.max_attempts - nextAttempts)

    if (remaining === 0) {
      createAlert({
        type: 'OTP_FLOOD',
        severity: 'warning',
        title: `Nhập sai OTP quá 5 lần: ${maskPhone(cleanPhone)}`,
        details: { phone: maskPhone(cleanPhone), purpose },
      })
      return {
        success: false,
        remainingAttempts: 0,
        errorCode: 'MAX_ATTEMPTS_EXCEEDED',
        error: 'Bạn đã nhập sai quá số lần cho phép (5 lần). Mã này đã bị hủy.',
      }
    }

    return {
      success: false,
      remainingAttempts: remaining,
      errorCode: 'CODE_MISMATCH',
      error: `Mã xác thực không chính xác. Bạn còn lại ${remaining} lần thử.`,
    }
  }

  // 3. Đánh dấu đã xác thực thành công (single-use)
  db.prepare(`
    UPDATE loyalty_phone_verifications 
    SET verified = 1, verified_at = ? 
    WHERE id = ?
  `).run(now, record.id)

  return {
    success: true,
    phone: cleanPhone,
    purpose,
    verifiedAt: now,
  }
}
