// server/lib/loyalty/enrollment.js
import crypto from 'crypto'
import {
  createMember,
  getMemberByPhone,
  getMemberById,
  updateMember,
  getLoyaltyDb,
  maskPhone,
  createAlert,
  createLoyaltySession,
  getTelegramUserByPhone,
} from './loyaltyDb.js'
import { sendTelegramDirectMessage } from './otpProviders/telegramProvider.js'
import { verifyLoyaltyOtp } from './phoneVerifier.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone } from '../smsService.js'
import { generateSessionToken, hashSessionToken, hashClientMetadata } from '../authCrypto.js'
import { LOYALTY_RULES } from './loyaltyConfig.js'

/**
 * Xác thực dữ liệu form đăng ký hội viên
 */
export function validateEnrollmentInput({
  fullName,
  phone,
  email,
  birthDay,
  birthMonth,
  consentToTerms,
  ageConsent,
}) {
  const errors = []

  const cleanName = String(fullName || '').trim()
  if (!cleanName || cleanName.length < 2) {
    errors.push('Họ và tên cần có ít nhất 2 ký tự')
  }

  const cleanPhone = normalizeVietnamesePhone(phone)
  if (!cleanPhone || !isValidVietnamesePhone(cleanPhone)) {
    errors.push('Số điện thoại không hợp lệ (cần là SĐT di động Việt Nam 10 số)')
  }

  if (email && String(email).trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(email).trim())) {
      errors.push('Địa chỉ email không đúng định dạng')
    }
  }

  if (birthDay !== undefined && birthDay !== null && birthDay !== '') {
    const d = Number(birthDay)
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      errors.push('Ngày sinh phải là số từ 1 đến 31')
    }
  }

  if (birthMonth !== undefined && birthMonth !== null && birthMonth !== '') {
    const m = Number(birthMonth)
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      errors.push('Tháng sinh phải là số từ 1 đến 12')
    }
  }

  if (consentToTerms !== true && consentToTerms !== 'true') {
    errors.push('Bạn cần đọc và đồng ý với Điều khoản chương trình Hội viên để tiếp tục')
  }

  if (ageConsent !== true && ageConsent !== 'true') {
    errors.push('Bạn cần xác nhận từ đủ 16 tuổi để tham gia chương trình')
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanName,
    cleanPhone,
    cleanEmail: email ? String(email).trim().toLowerCase() : null,
    cleanBirthDay: birthDay ? Number(birthDay) : null,
    cleanBirthMonth: birthMonth ? Number(birthMonth) : null,
  }
}

/**
 * Đăng ký hội viên mới sau khi xác thực OTP thành công
 */
export async function enrollLoyaltyMember({
  fullName,
  phone,
  otpCode,
  email = null,
  birthDay = null,
  birthMonth = null,
  consentToTerms,
  ageConsent,
  marketingOptIn = false,
  accountId = null,
  ip = '',
  userAgent = '',
  allowLoginIfExisting = false,
}) {
  // 1. Kiểm tra tính hợp lệ của thông tin đăng ký
  const validation = validateEnrollmentInput({
    fullName,
    phone,
    email,
    birthDay,
    birthMonth,
    consentToTerms,
    ageConsent,
  })

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors[0],
      allErrors: validation.errors,
    }
  }

  const { cleanPhone, cleanName, cleanEmail, cleanBirthDay, cleanBirthMonth } = validation

  // 2. Kiểm tra mã OTP qua PhoneVerifier
  const otpResult = verifyLoyaltyOtp({
    phone: cleanPhone,
    code: otpCode,
    purpose: 'enrollment',
  })

  if (!otpResult.success) {
    return {
      success: false,
      error: otpResult.error,
      remainingAttempts: otpResult.remainingAttempts,
    }
  }

  // 3. Kiểm tra xem số điện thoại đã là hội viên chưa (phản hồi trung tính, an toàn)
  const existingMember = getMemberByPhone(cleanPhone)
  if (existingMember) {
    if (allowLoginIfExisting) {
      const sessionToken = generateSessionToken()
      createLoyaltySession({
        memberId: existingMember.id,
        token: sessionToken,
        ip,
        userAgent,
      })

      // Thông báo cho chủ shop qua Telegram
      const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID
      if (ownerChatId) {
        sendTelegramDirectMessage({
          chatId: ownerChatId,
          text: `👑 <b>[HỘI VIÊN KẾT NỐI LẠI]</b>\n` +
            `Khách hàng: <b>${existingMember.full_name || cleanName || 'Hội viên'}</b>\n` +
            `Số điện thoại: <b>${maskPhone(cleanPhone)}</b>\n` +
            `Hạng: <b>${existingMember.tier || 'MEMBER'}</b>\n` +
            `Đã xác minh số điện thoại chính chủ qua Telegram và kết nối tài khoản thành công!`,
        }).catch(() => {})
      }

      return {
        success: true,
        alreadyMember: true,
        member: {
          id: existingMember.id,
          phone: existingMember.phone,
          fullName: existingMember.full_name,
          tier: existingMember.tier,
          tierChangedAt: existingMember.tier_changed_at,
        },
        sessionToken,
        message: 'Chào mừng Quý khách quay trở lại với chương trình Hội viên QuanNguyenS!',
      }
    }

    return {
      success: false,
      code: 'ALREADY_MEMBER',
      error: 'Số điện thoại này đã được đăng ký trong chương trình Hội viên. Vui lòng đăng nhập để xem quyền lợi.',
    }
  }

  // 4. Tạo hội viên mới trong Database
  const db = getLoyaltyDb()
  const now = new Date().toISOString()

  let newMember = null
  try {
    newMember = createMember({
      phone: cleanPhone,
      fullName: cleanName,
      email: cleanEmail,
      birthDay: cleanBirthDay,
      birthMonth: cleanBirthMonth,
      accountId: accountId || null,
      consentVersion: '1.0.0',
      marketingOptIn: marketingOptIn ? 1 : 0,
      tier: 'MEMBER',
    })

    // Ghi lịch sử khởi tạo hạng ban đầu
    db.prepare(`
      INSERT INTO loyalty_tier_history (id, member_id, from_tier, to_tier, reason, actor, created_at)
      VALUES (?, ?, 'NONE', 'MEMBER', 'Khách hàng chủ động đăng ký tham gia chương trình', 'member', ?)
    `).run(`th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, newMember.id, now)
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return {
        success: false,
        code: 'ALREADY_MEMBER',
        error: 'Số điện thoại này đã được đăng ký trong chương trình Hội viên.',
      }
    }
    console.error('❌ [ENROLLMENT ERROR]', err)
    return {
      success: false,
      error: 'Không thể khởi tạo hồ sơ hội viên. Vui lòng thử lại sau giây lát.',
    }
  }

  // 5. Cấp session token cho hội viên
  const sessionToken = generateSessionToken()
  createLoyaltySession({
    memberId: newMember.id,
    token: sessionToken,
    ip,
    userAgent,
  })

  // 6. Gửi tin nhắn Telegram chúc mừng cho khách hàng và chủ shop
  try {
    const tgUser = getTelegramUserByPhone(cleanPhone)
    if (tgUser?.telegram_id) {
      sendTelegramDirectMessage({
        chatId: tgUser.telegram_id,
        text: `🎉 <b>CHÚC MỪNG QUÝ KHÁCH ĐÃ TRỞ THÀNH HỘI VIÊN THÂN THIẾT!</b>\n\n` +
          `✨ Đặc quyền của Quý khách đã có hiệu lực ngay lập tức trên website QuanNguyenS:\n` +
          `• Chiết khấu đặc quyền theo hạng thành viên\n` +
          `• Tích lũy 1 điểm cho mỗi 100.000đ chi tiêu\n` +
          `• Tặng Voucher sinh nhật 50.000đ độc quyền\n\n` +
          `Quý khách có thể mua sắm ngay tại https://quannguyens.com để tận hưởng ưu đãi!`,
      }).catch(() => {})
    }

    const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID
    if (ownerChatId) {
      sendTelegramDirectMessage({
        chatId: ownerChatId,
        text: `👑 <b>[HỘI VIÊN MỚI GIA NHẬP]</b>\n` +
          `Khách hàng: <b>${newMember.full_name || 'Khách vãng lai'}</b>\n` +
          `Số điện thoại: <b>${maskPhone(cleanPhone)}</b>\n` +
          `Hạng: <b>${newMember.tier || 'MEMBER'}</b>\n` +
          `Đã hoàn tất xác thực số điện thoại chính chủ qua Telegram!`,
      }).catch(() => {})
    }
  } catch {}

  return {
    success: true,
    member: {
      id: newMember.id,
      phone: newMember.phone,
      fullName: newMember.full_name,
      tier: newMember.tier,
      tierChangedAt: newMember.tier_changed_at,
    },
    sessionToken,
    message: 'Chúc mừng bạn đã trở thành Hội viên Thân Thiết của QuanNguyenS!',
  }
}

/**
 * Đăng nhập / Nhận diện hội viên bằng SĐT + OTP
 */
export async function authenticateMemberByOtp({ phone, otpCode, ip = '', userAgent = '' }) {
  const cleanPhone = normalizeVietnamesePhone(phone)
  if (!cleanPhone || !isValidVietnamesePhone(cleanPhone)) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ',
    }
  }

  const member = getMemberByPhone(cleanPhone)
  if (!member || member.status !== 'active') {
    return {
      success: false,
      error: 'Số điện thoại chưa tham gia chương trình Hội viên hoặc tài khoản đang tạm khóa.',
    }
  }

  const otpResult = verifyLoyaltyOtp({
    phone: cleanPhone,
    code: otpCode,
    purpose: 'login',
  })

  if (!otpResult.success) {
    return {
      success: false,
      error: otpResult.error,
      remainingAttempts: otpResult.remainingAttempts,
    }
  }

  const sessionToken = generateSessionToken()
  createLoyaltySession({
    memberId: member.id,
    token: sessionToken,
    ip,
    userAgent,
  })

  return {
    success: true,
    member: {
      id: member.id,
      phone: member.phone,
      fullName: member.full_name,
      tier: member.tier,
    },
    sessionToken,
  }
}
