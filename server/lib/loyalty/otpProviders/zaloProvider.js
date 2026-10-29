// server/lib/loyalty/otpProviders/zaloProvider.js
import { normalizeVietnamesePhone } from '../../smsService.js'

function toZaloPhone(phone) {
  const normalized = normalizeVietnamesePhone(phone)
  return '84' + normalized.slice(1)
}

/**
 * Kiểm tra xem cấu hình Zalo ZNS đã có đủ chưa
 */
export function isZaloConfigured() {
  const token = (process.env.ZALO_OA_ACCESS_TOKEN || process.env.ZALO_OA_TOKEN || '').trim()
  const templateId = (process.env.ZALO_ZNS_TEMPLATE_OTP || process.env.ZALO_OTP_TEMPLATE_ID || '').trim()
  return Boolean(token && templateId)
}

/**
 * Gửi OTP qua Zalo ZNS API chính thức
 * @param {Object} params
 * @param {string} params.phone - Số điện thoại Việt Nam (09...)
 * @param {string} params.code - Mã OTP 6 chữ số
 * @param {number} [params.ttlMinutes=5] - Thời gian hiệu lực (phút)
 * @returns {Promise<{ ok: boolean, providerMessageId?: string, retryable?: boolean, errorCode?: string, error?: string }>}
 */
export async function sendZaloOtp({ phone, code, ttlMinutes = 5 }) {
  const token = (process.env.ZALO_OA_ACCESS_TOKEN || process.env.ZALO_OA_TOKEN || '').trim()
  const templateId = (process.env.ZALO_ZNS_TEMPLATE_OTP || process.env.ZALO_OTP_TEMPLATE_ID || '').trim()

  if (!token || !templateId) {
    return {
      ok: false,
      errorCode: 'MISSING_CONFIG',
      error: 'Dịch vụ Zalo ZNS chưa được cấu hình đầy đủ token và template ID',
      retryable: false,
    }
  }

  const zaloPhone = toZaloPhone(phone)
  const trackingId = `qns_otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  try {
    const res = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: {
        'access_token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: zaloPhone,
        template_id: templateId,
        template_data: {
          otp: String(code),
          time: `${ttlMinutes} phút`,
        },
        tracking_id: trackingId,
      }),
    })

    const data = await res.json()

    // error = 0 là thành công theo chuẩn Zalo OpenAPI
    if (data.error === 0) {
      return {
        ok: true,
        providerMessageId: data.data?.msg_id || trackingId,
      }
    }

    const zaloErrors = {
      '-201': 'Số điện thoại chưa đăng ký tài khoản Zalo',
      '-202': 'Người dùng đã tắt nhận thông báo ZNS từ OA này',
      '-203': 'Template OTP chưa được duyệt hoặc ID template không đúng',
      '-204': 'Access token Zalo OA không hợp lệ hoặc đã hết hạn',
      '-210': 'Vượt quá hạn mức gửi tin ZNS của tài khoản hôm nay',
    }

    const errorMsg = zaloErrors[String(data.error)] || data.message || `Lỗi Zalo ZNS mã ${data.error}`
    const isTokenExpired = data.error === -204
    const isRetryable = isTokenExpired || data.error === -210

    // Nếu token hết hạn và có cấu hình refresh token, ghi log cảnh báo
    if (isTokenExpired) {
      console.warn('⚠️ [ZALO ZNS] Access Token hết hạn (mã -204). Vui lòng cập nhật ZALO_OA_ACCESS_TOKEN trong .env.')
    }

    return {
      ok: false,
      errorCode: String(data.error),
      error: errorMsg,
      retryable: isRetryable,
    }
  } catch (err) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      error: `Lỗi kết nối máy chủ Zalo: ${err.message}`,
      retryable: true,
    }
  }
}

