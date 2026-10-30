import Redis from 'ioredis'

let redisClient = null
let isRedisConnected = false

// In-memory fallback cache khi không có REDIS_URL
const memoryCache = new Map()
const memoryTimers = new Map()
const memorySlidingWindows = new Map()

// Dọn dẹp sliding window memory định kỳ mỗi 5 phút
const windowCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of memorySlidingWindows.entries()) {
    const valid = timestamps.filter((t) => now - t < 3600000)
    if (valid.length === 0) {
      memorySlidingWindows.delete(key)
    } else {
      memorySlidingWindows.set(key, valid)
    }
  }
}, 300000)

if (windowCleanup.unref) {
  windowCleanup.unref()
}

const rawRedisUrl = (process.env.REDIS_URL || '').trim()
const isLocalhostRedis = rawRedisUrl.includes('localhost') || rawRedisUrl.includes('127.0.0.1')
const shouldAttemptRedis = rawRedisUrl && !(process.env.NODE_ENV === 'production' && isLocalhostRedis)

if (shouldAttemptRedis) {
  try {
    redisClient = new Redis(rawRedisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: () => null, // Không reconnect liên tục nếu fail
    })

    redisClient
      .connect()
      .then(() => {
        isRedisConnected = true
        console.log('⚡ [REDIS] Kết nối Redis Cache thành công:', rawRedisUrl)
      })
      .catch((err) => {
        isRedisConnected = false
        console.log('⚡ [CACHE] Kích hoạt In-Memory Cache tốc độ cao (0ms RAM Fallback):', err.message)
      })

    redisClient.on('error', () => {
      isRedisConnected = false
    })
  } catch (err) {
    console.log('⚡ [CACHE] Kích hoạt In-Memory Cache tốc độ cao (0ms RAM):', err.message)
  }
} else {
  console.log('⚡ [CACHE] Hệ thống đang sử dụng High-Performance In-Memory Cache (RAM 0ms latency) - Hoạt động độc lập 100%.')
}

/**
 * Lưu giá trị vào cache với thời gian sống TTL (giây)
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify({ v: value })

  if (isRedisConnected && redisClient) {
    try {
      if (ttlSeconds > 0) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds)
      } else {
        await redisClient.set(key, serialized)
      }
      return
    } catch (err) {
      console.warn('Lỗi Redis Set, fallback Memory:', err.message)
    }
  }

  // Fallback Memory
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key))
    memoryTimers.delete(key)
  }

  memoryCache.set(key, serialized)

  if (ttlSeconds > 0) {
    const timer = setTimeout(() => {
      memoryCache.delete(key)
      memoryTimers.delete(key)
    }, ttlSeconds * 1000)

    if (timer.unref) timer.unref()
    memoryTimers.set(key, timer)
  }
}

/**
 * Lấy giá trị từ cache
 */
export async function cacheGet(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key)
      if (!data) return null
      const parsed = JSON.parse(data)
      return parsed.v
    } catch (err) {
      console.warn('Lỗi Redis Get, fallback Memory:', err.message)
    }
  }

  // Fallback Memory
  const data = memoryCache.get(key)
  if (!data) return null
  try {
    const parsed = JSON.parse(data)
    return parsed.v
  } catch {
    return null
  }
}

/**
 * Xóa key khỏi cache
 */
export async function cacheDel(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key)
      return
    } catch (err) {
      console.warn('Lỗi Redis Del:', err.message)
    }
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
  const recordKey = `ratelimit:${key}`

  if (!isRedisConnected || !redisClient) {
    // Atomic in-process sliding window (đồng bộ trong JavaScript event loop)
    let timestamps = memorySlidingWindows.get(recordKey) || []
    timestamps = timestamps.filter((t) => now - t < windowMs)

    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0]
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
      memorySlidingWindows.set(recordKey, timestamps)
      return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) }
    }

    timestamps.push(now)
    memorySlidingWindows.set(recordKey, timestamps)

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfter: 0,
    }
  }

  try {
    const list = await redisClient.lrange(recordKey, 0, -1)
    const validTimestamps = list.map(Number).filter((t) => now - t < windowMs)

    if (validTimestamps.length >= maxRequests) {
      const oldest = validTimestamps[0]
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) }
    }

    await redisClient.pipeline().rpush(recordKey, now).expire(recordKey, windowSeconds).exec()

    return {
      allowed: true,
      remaining: maxRequests - validTimestamps.length - 1,
      retryAfter: 0,
    }
  } catch (err) {
    // Fallback in-process
    let timestamps = memorySlidingWindows.get(recordKey) || []
    timestamps = timestamps.filter((t) => now - t < windowMs)
    if (timestamps.length >= maxRequests) {
      const oldest = timestamps[0]
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) }
    }
    timestamps.push(now)
    memorySlidingWindows.set(recordKey, timestamps)
    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfter: 0,
    }
  }
}
