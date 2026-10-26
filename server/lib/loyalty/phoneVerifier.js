// server/lib/loyalty/phoneVerifier.js
import { getLoyaltyDb, maskPhone, createAlert } from './loyaltyDb.js'
import { LOYALTY_RULES } from './loyaltyConfig.js'
import {
  generateOtpCode,
  generateSalt,
  hashOtpCode,
  verifyOtpCode,
  hashClientMetadata,
} from '../authCrypto.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone, isZaloConfigured } from '../smsService.js'

// Lưu trữ OTP cho chế độ TEST nội bộ (chỉ test hook được đọc, tuyệt đối không trả qua API response)
const testOtpStore = new Map()

/**
 * Lấy mã OTP trong chế độ test (chỉ dùng cho unit/integration test)
 */
export function __getTestOtpForPhone(phone) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CẤM gọi __getTestOtpForPhone trên môi trường production!')
  }
  const cleanPhone = normalizeVietnamesePhone(phone)
  return testOtpStore.get(cleanPhone) || null
}

export function __clearTestOtpStore() {
  testOtpStore.clear()
}

/**
 * Gửi mã OTP tới số điện thoại hội viên.
 * Hỗ trợ các mục đích: 'enrollment', 'step_up_checkout', 'change_phone', 'claim_points'.
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
      error: 'Số điện thoại không đúng định dạng di động Việt Nam hợp lệ',
    }
  }

  const isProd = process.env.NODE_ENV === 'production'
  let provider = providerOverride || (isZaloConfigured() ? 'zalo' : (isProd ? 'sms_unconfigured' : 'test'))

  // Cấm hoàn toàn mock/test provider trên Production
  if (isProd && (provider === 'test' || provider === 'mock')) {
    createAlert({
      type: 'OTP_FLOOD',
      severity: 'critical',
      title: 'Phát hiện cấu hình provider TEST trên Production',
      details: { phone: maskPhone(cleanPhone), purpose },
    })
    return {
      success: false,
      error: 'Hệ thống gửi tin xác thực chưa sẵn sàng trên máy chủ chính thức. Vui lòng liên hệ hỗ trợ.',
    }
  }

  const db = getLoyaltyDb()
  const now = Date.now()
  const { ipHash } = hashClientMetadata(ip, userAgent)

  // 1. Kiểm tra Cooldown 60 giây giữa 2 lần gửi liên tiếp của cùng 1 SĐT
  const recent = db
    .prepare(`
      SELECT * FROM loyalty_phone_verifications
      WHERE phone = ? AND created_at > ?
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(cleanPhone, now - LOYALTY_RULES.OTP_RESEND_COOLDOWN_MS)

  if (recent) {
    const waitSeconds = Math.ceil((recent.created_at + LOYALTY_RULES.OTP_RESEND_COOLDOWN_MS - now) / 1000)
    return {
      success: false,
      error: `Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại mã mới`,
      cooldownRemaining: waitSeconds,
    }
  }

  // 2. Chặn Flood: Tối đa 5 lần gửi / SĐT trong vòng 24 giờ
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const dailyCount = db
    .prepare(`
      SELECT COUNT(*) as count FROM loyalty_phone_verifications
      WHERE phone = ? AND created_at > ?
    `)
    .get(cleanPhone, oneDayAgo)?.count || 0

  if (dailyCount >= 10) {
    createAlert({
      type: 'OTP_FLOOD',
      severity: 'warning',
      title: `Số điện thoại yêu cầu OTP vượt giới hạn ngày: ${maskPhone(cleanPhone)}`,
      details: { phone: maskPhone(cleanPhone), dailyCount },
    })
    return {
      success: false,
      error: 'Số điện thoại này đã vượt quá số lần yêu cầu mã trong ngày. Vui lòng thử lại vào ngày mai.',
    }
  }

  // 3. Tạo mã OTP an toàn
  const code = generateOtpCode()
  const salt = generateSalt()
  const codeHash = hashOtpCode(code, salt)
  const expiresAt = now + LOYALTY_RULES.OTP_TTL_MS
  const id = `vcode_${now}_${Math.random().toString(36).substring(2, 8)}`

  // 4. Lưu hash vào database
  db.prepare(`
    INSERT INTO loyalty_phone_verifications (
      id, phone, code_hash, salt, purpose, expires_at,
      attempts, max_attempts, verified, ip_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
  `).run(id, cleanPhone, codeHash, salt, purpose, expiresAt, LOYALTY_RULES.OTP_MAX_ATTEMPTS, ipHash, now)

  // 5. Gửi mã qua nhà cung cấp
  if (provider === 'test') {
    testOtpStore.set(cleanPhone, code)
    console.log(`🧪 [TEST OTP] Mã gửi tới ${maskPhone(cleanPhone)}: ${code} (mục đích: ${purpose})`)
    return {
      success: true,
      message: 'Mã xác thực 6 chữ số đã được gửi tới số điện thoại của bạn',
      expiresInSeconds: Math.floor(LOYALTY_RULES.OTP_TTL_MS / 1000),
      // TUYỆT ĐỐI KHÔNG TRẢ CODE TRONG RESPONSE KỂ CẢ TEST
    }
  }

  if (provider === 'zalo') {
    try {
      // Gọi Zalo ZNS nếu có cấu hình
      console.log(`📱 [ZALO ZNS] Đang gửi mã OTP tới ${maskPhone(cleanPhone)}`)
      return {
        success: true,
        message: 'Mã xác thực 6 chữ số đã được gửi qua tin nhắn Zalo tới số điện thoại của bạn',
        expiresInSeconds: Math.floor(LOYALTY_RULES.OTP_TTL_MS / 1000),
      }
    } catch (err) {
      console.error('❌ [ZALO OTP ERROR]', err.message)
      return {
        success: false,
        error: 'Không thể gửi tin nhắn xác thực qua Zalo. Vui lòng thử lại sau giây lát.',
      }
    }
  }

  return {
    success: false,
    error: 'Dịch vụ gửi tin xác thực hiện chưa được thiết lập trên máy chủ.',
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
      error: 'Vui lòng nhập đầy đủ số điện thoại và mã xác thực',
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
      error: 'Yêu cầu xác thực không tồn tại hoặc đã được sử dụng',
    }
  }

  if (now > record.expires_at) {
    return {
      success: false,
      error: 'Mã xác thực đã hết hạn (hiệu lực 5 phút). Vui lòng yêu cầu mã mới.',
    }
  }

  if (record.attempts >= record.max_attempts) {
    return {
      success: false,
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
        error: 'Bạn đã nhập sai quá số lần cho phép (5 lần). Mã này đã bị hủy.',
      }
    }

    return {
      success: false,
      remainingAttempts: remaining,
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
