// server/lib/adminAuth.js
import { createRateLimiter } from './rateLimiter.js'

/**
 * Rate limiter cho route Admin Login:
 * Tối đa 5 lần thử trong vòng 15 phút trên mỗi IP
 */
export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.',
})

/**
 * Xác thực mật khẩu Admin:
 * - Chỉ sử dụng process.env.ADMIN_PASSWORD chuẩn.
 * - Fail-closed: Nếu chưa cấu hình ADMIN_PASSWORD, từ chối mọi đăng nhập và trả lỗi 500.
 * - Tuyệt đối không chấp nhận bất kỳ mật khẩu dự phòng hardcode nào.
 */
export function verifyAdminLogin(password) {
  const configuredPassword = process.env.ADMIN_PASSWORD ? String(process.env.ADMIN_PASSWORD).trim() : ''

  if (!configuredPassword) {
    console.error('⛔ [CRITICAL] Chưa cấu hình biến môi trường ADMIN_PASSWORD trên máy chủ.')
    return {
      status: 500,
      data: {
        success: false,
        error: 'Hệ thống chưa cấu hình mật khẩu quản trị',
      },
    }
  }

  const inputPass = String(password || '').trim()

  if (!inputPass || inputPass !== configuredPassword) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Sai mật khẩu quản trị',
      },
    }
  }

  return {
    status: 200,
    data: {
      success: true,
    },
  }
}
