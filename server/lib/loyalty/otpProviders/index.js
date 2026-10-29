// server/lib/loyalty/otpProviders/index.js
import { sendZaloOtp, isZaloConfigured } from './zaloProvider.js'
export { isZaloConfigured }
import { maskPhone, createAlert } from '../loyaltyDb.js'
import { normalizeVietnamesePhone } from '../../smsService.js'

// In-memory store chỉ dùng cho môi trường test/dev nội bộ
const testOtpStore = new Map()

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
 * Xác định provider thích hợp dựa trên môi trường và cấu hình
 */
export function resolveOtpProvider(providerOverride = null) {
  if (providerOverride) return providerOverride

  const configuredProvider = (process.env.LOYALTY_OTP_PROVIDER || '').trim().toLowerCase()
  if (configuredProvider) return configuredProvider

  if (isZaloConfigured()) return 'zalo'

  const isProd = process.env.NODE_ENV === 'production'
  return isProd ? 'sms_unconfigured' : 'test'
}

/**
 * Gửi OTP qua provider được chọn
 * @param {Object} params
 * @param {string} params.phone
 * @param {string} params.code
 * @param {string} params.purpose
 * @param {number} params.ttlMinutes
 * @param {string} [params.providerOverride]
 * @returns {Promise<{ ok: boolean, provider: string, message?: string, error?: string, errorCode?: string }>}
 */
export async function sendOtpViaProvider({
  phone,
  code,
  purpose = 'enrollment',
  ttlMinutes = 5,
  providerOverride = null,
}) {
  const isProd = process.env.NODE_ENV === 'production'
  const provider = resolveOtpProvider(providerOverride)
  const cleanPhone = normalizeVietnamesePhone(phone)

  // Cấm hoàn toàn mock/test provider trên Production (Fail-closed)
  if (isProd && (provider === 'test' || provider === 'mock')) {
    createAlert({
      type: 'OTP_FLOOD',
      severity: 'critical',
      title: 'Phát hiện cấu hình provider TEST trên Production',
      details: { phone: maskPhone(cleanPhone), purpose },
    })
    return {
      ok: false,
      provider: 'test',
      errorCode: 'TEST_PROVIDER_ON_PROD_FORBIDDEN',
      error: 'Hệ thống gửi tin xác thực chưa sẵn sàng trên máy chủ chính thức. Vui lòng liên hệ hotline.',
    }
  }

  // 1. Chế độ test/dev
  if (provider === 'test' || provider === 'mock') {
    testOtpStore.set(cleanPhone, String(code))
    console.log(`🧪 [TEST OTP] Mã gửi tới ${maskPhone(cleanPhone)}: ${code} (mục đích: ${purpose})`)
    return {
      ok: true,
      provider: 'test',
      message: 'Mã xác thực 6 chữ số đã được gửi tới số điện thoại của bạn',
    }
  }

  // 2. Chế độ Zalo ZNS
  if (provider === 'zalo') {
    const result = await sendZaloOtp({ phone: cleanPhone, code, ttlMinutes })
    if (result.ok) {
      console.log(`📱 [ZALO ZNS] Đã gửi OTP thành công tới ${maskPhone(cleanPhone)} (ID: ${result.providerMessageId})`)
      return {
        ok: true,
        provider: 'zalo',
        message: 'Mã xác thực 6 chữ số đã được gửi qua tin nhắn Zalo tới số điện thoại của bạn',
      }
    }

    createAlert({
      type: 'SYSTEM_ERROR',
      severity: 'warning',
      title: `Lỗi gửi Zalo ZNS: ${result.errorCode || 'UNKNOWN'}`,
      details: { phone: maskPhone(cleanPhone), error: result.error, purpose },
    })

    return {
      ok: false,
      provider: 'zalo',
      errorCode: result.errorCode,
      error: 'Không thể gửi tin nhắn xác thực qua Zalo lúc này. Vui lòng thử lại sau giây lát hoặc liên hệ shop.',
    }
  }

  // 3. Chế độ unconfigured (Fail-closed trên Production)
  createAlert({
    type: 'SYSTEM_ERROR',
    severity: 'critical',
    title: 'Thiếu cấu hình nhà cung cấp OTP SMS/ZNS trên Production',
    details: { phone: maskPhone(cleanPhone), purpose },
  })

  return {
    ok: false,
    provider: 'sms_unconfigured',
    errorCode: 'PROVIDER_UNCONFIGURED',
    error: 'Dịch vụ gửi tin xác thực hiện chưa được thiết lập trên máy chủ. Vui lòng liên hệ hotline: 0981 753 082.',
  }
}
