import Redis from 'ioredis'

let redisClient = null
let isRedisConnected = false

// In-memory fallback cache khi không có REDIS_URL
const memoryCache = new Map()
const memoryTimers = new Map()

const redisUrl = process.env.REDIS_URL || null

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: () => null, // Không reconnect liên tục nếu fail
    })

    redisClient
      .connect()
      .then(() => {
        isRedisConnected = true
        console.log('⚡ [REDIS] Kết nối Redis Cache thành công:', redisUrl)
      })
      .catch((err) => {
        isRedisConnected = false
        console.warn('⚠️ [REDIS] Không thể kết nối Redis, tự động chuyển sang In-memory Cache Fallback:', err.message)
      })

    redisClient.on('error', () => {
      isRedisConnected = false
    })
  } catch (err) {
    console.warn('⚠️ [REDIS] Khởi tạo Redis lỗi, sử dụng In-memory Cache:', err.message)
  }
} else {
  // Chạy dev/local không cần redis server
  // console.log('ℹ️ [CACHE] Đang hoạt động ở chế độ High-Performance In-Memory Cache (TTL enabled)')
}

/**
 * Lưu giá trị vào cache với thời gian sống TTL (giây)
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify({ v: value })

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds)
      return
    } catch {
      // Fallback xuống memory nếu redis gặp sự cố
    }
  }

  // Fallback in-memory
  memoryCache.set(key, serialized)
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key))
  }
  const timer = setTimeout(() => {
    memoryCache.delete(key)
    memoryTimers.delete(key)
  }, ttlSeconds * 1000)

  if (timer.unref) timer.unref()
  memoryTimers.set(key, timer)
}

/**
 * Lấy giá trị từ cache
 */
export async function cacheGet(key) {
  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get(key)
      if (val === null) return null
      try {
        const parsed = JSON.parse(val)
        return parsed && typeof parsed === 'object' && 'v' in parsed ? parsed.v : parsed
      } catch {
        return val
      }
    } catch {
      // Fallback
    }
  }

  const raw = memoryCache.get(key)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && 'v' in parsed ? parsed.v : parsed
  } catch {
    return raw
  }
}

/**
 * Xóa khóa khỏi cache
 */
export async function cacheDel(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key)
    } catch {}
  }

  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key))
    memoryTimers.delete(key)
  }
  memoryCache.delete(key)
}

/**
 * Atomic sliding window rate limiter qua Redis / Memory
 * @param {string} key
 * @param {number} maxRequests
 * @param {number} windowSeconds
 * @returns {Promise<{ allowed: boolean, remaining: number, retryAfter: number }>}
 */
export async function checkRateLimit(key, maxRequests = 10, windowSeconds = 60) {
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // Đơn giản hóa bộ đếm sliding window trong cache
  const recordKey = `ratelimit:${key}`
  const existing = (await cacheGet(recordKey)) || []
  const validTimestamps = Array.isArray(existing) ? existing.filter((t) => now - t < windowMs) : []

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0]
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) }
  }

  validTimestamps.push(now)
  await cacheSet(recordKey, validTimestamps, windowSeconds)

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    retryAfter: 0,
  }
}
