/**
 * Dịch vụ gửi mã OTP xác minh tài khoản
 * Ưu tiên: Zalo ZNS (miễn phí 3.000 tin/tháng) → Mock mode (dev)
 *
 * Zalo ZNS setup:
 * 1. Tạo Zalo Official Account tại: https://oa.zalo.me (miễn phí)
 * 2. Vào ZNS Dashboard → Tạo template OTP → Chờ duyệt 1-3 ngày
 * 3. Lấy OA Access Token + Template ID → Điền vào .env
 * Docs: https://developers.zalo.me/docs/zns/gui-tin-zns/gui-tin-zns
 */

// ── Validate & Normalize SĐT Việt Nam ─────────────────────────

export function normalizeVietnamesePhone(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\s+/g, '').replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2)
  }
  return cleaned
}

export function isValidVietnamesePhone(phone) {
  const normalized = normalizeVietnamesePhone(phone)
  return /^(0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(normalized)
}

// Zalo ZNS yêu cầu format 84XXXXXXXXX thay vì 0XXXXXXXXX
function toZaloPhone(phone) {
  const normalized = normalizeVietnamesePhone(phone)
  return '84' + normalized.slice(1)
}

// ── Kiểm tra cấu hình ─────────────────────────────────────────

export function isZaloConfigured() {
  return Boolean(
    (process.env.ZALO_OA_TOKEN || '').trim() &&
    (process.env.ZALO_OTP_TEMPLATE_ID || '').trim()
  )
}

// Giữ lại để tương thích với authEndpoints.js
export function isSmsConfigured() {
  return isZaloConfigured()
}

// ── Gửi OTP qua Zalo ZNS ────────────────────────────────────

async function sendZaloZnsOtp(phone, code) {
  const token = (process.env.ZALO_OA_TOKEN || '').trim()
  const templateId = (process.env.ZALO_OTP_TEMPLATE_ID || '').trim()
  const zaloPhone = toZaloPhone(phone)

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
        otp: code,
        time: '10 phút',
      },
      tracking_id: `qns_${Date.now()}`,
    }),
  })

  const data = await res.json()

  // Zalo ZNS: error = 0 là thành công
  if (data.error === 0) {
    console.log(`✅ [ZALO ZNS] Đã gửi mã OTP tới Zalo ${phone}`)
    return { success: true, isMock: false, provider: 'zalo', phone }
  }

  // Map lỗi phổ biến để dễ debug
  const zaloErrors = {
    '-201': 'Số điện thoại chưa có tài khoản Zalo',
    '-202': 'Người dùng đã tắt nhận ZNS từ OA này',
    '-203': 'Template OTP chưa duyệt hoặc ID sai',
    '-204': 'ZALO_OA_TOKEN không hợp lệ hoặc đã hết hạn (refresh hàng tháng)',
    '-210': 'Vượt quota ZNS miễn phí hôm nay',
  }
  const errMsg = zaloErrors[String(data.error)] || data.message || `Zalo ZNS lỗi ${data.error}`
  throw new Error(errMsg)
}

// ── Entry Point: sendSmsOtp (giữ tên cũ để không break imports) ─

export async function sendSmsOtp(phone, code) {
  const normalized = normalizeVietnamesePhone(phone)

  if (!isValidVietnamesePhone(normalized)) {
    throw new Error('Số điện thoại không hợp lệ (cần đủ 10 số di động Việt Nam)')
  }

  // 1. Gửi qua Zalo ZNS (nếu đã cấu hình)
  if (isZaloConfigured()) {
    try {
      return await sendZaloZnsOtp(normalized, code)
    } catch (err) {
      console.error('❌ [ZALO ZNS] Lỗi:', err.message)
      throw new Error(`Không thể gửi Zalo: ${err.message}`)
    }
  }

  // 2. Mock mode (chưa cấu hình ZALO_OA_TOKEN)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dịch vụ gửi mã xác minh SMS/Zalo chưa được cấu hình trên máy chủ')
  }

  const message = `[QuanNguyenS] Ma xac minh: ${code}. Hieu luc 10 phut.`
  console.log(`\n======================================================`)
  console.log(`📱 [OTP DEV - CHẾ ĐỘ THỬ NGHIỆM]`)
  console.log(`👉 Số điện thoại: ${normalized}`)
  console.log(`ℹ️ Để gửi Zalo thật: thêm ZALO_OA_TOKEN + ZALO_OTP_TEMPLATE_ID vào .env`)
  console.log(`======================================================\n`)

  return {
    success: true,
    isMock: true,
    phone: normalized,
    message: 'Mã OTP đã tạo (chế độ thử nghiệm dev)',
  }
}


