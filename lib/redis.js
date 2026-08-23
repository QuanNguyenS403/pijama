import { Redis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'

const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes('xxx')

const getRedisClient = () => {
  if (isUpstashConfigured) {
    // Production: Upstash Redis (serverless-compatible)
    return new UpstashRedis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  // Development: local Redis
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  })
}

const globalForRedis = globalThis
export const redis = globalForRedis.redis ?? getRedisClient()
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// Cache helpers
export const Cache = {
  async get(key) {
    const data = await redis.get(key)
    if (!data) return null
    return typeof data === 'string' ? JSON.parse(data) : data
  },
  async set(key, val, ttl) {
    return ttl
      ? redis.setex(key, ttl, JSON.stringify(val))
      : redis.set(key, JSON.stringify(val))
  },
  async del(...keys) {
    return redis.del(...keys)
  },
  async flush(pattern) {
    if (typeof redis.keys === 'function') {
      const keys = await redis.keys(pattern)
      if (keys.length) await redis.del(...keys)
    }
  },
}

export default redis
