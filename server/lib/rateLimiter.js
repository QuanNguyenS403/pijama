/**
 * Lightweight IP-based Sliding Window Rate Limiter Middleware
 */
const requestRecords = new Map()

// Dọn dẹp cache IP cũ định kỳ mỗi 5 phút
setInterval(() => {
  const now = Date.now()
  for (const [key, records] of requestRecords.entries()) {
    const validRecords = records.filter((timestamp) => now - timestamp < 3600000)
    if (validRecords.length === 0) {
      requestRecords.delete(key)
    } else {
      requestRecords.set(key, validRecords)
    }
  }
}, 300000)

/**
 * Tạo middleware rate limiter
 * @param {Object} options
 * @param {number} options.windowMs - Khoảng thời gian tính (ms), mặc định 60s
 * @param {number} options.max - Số request tối đa trong khoảng thời gian, mặc định 30
 * @param {string} options.message - Thông báo lỗi khi vượt quá giới hạn
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 30,
  message = 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.',
} = {}) {
  return (req, res, next) => {
    // Lấy địa chỉ IP thật của client
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown-ip'

    const key = `${req.baseUrl || req.path}:${ip}`
    const now = Date.now()

    let timestamps = requestRecords.get(key) || []
    // Lọc các timestamps nằm trong windowMs
    timestamps = timestamps.filter((t) => now - t < windowMs)

    if (timestamps.length >= max) {
      const retryAfterSec = Math.ceil((timestamps[0] + windowMs - now) / 1000)
      res.setHeader('Retry-After', retryAfterSec)
      if (typeof res.status === 'function') {
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: retryAfterSec,
        })
      } else {
        res.statusCode = 429
        res.setHeader('Content-Type', 'application/json')
        return res.end(
          JSON.stringify({
            success: false,
            error: message,
            retryAfter: retryAfterSec,
          })
        )
      }
    }

    timestamps.push(now)
    requestRecords.set(key, timestamps)
    if (typeof next === 'function') {
      next()
    }
  }
}
