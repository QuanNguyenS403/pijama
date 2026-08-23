// lib/security/rate-limit.js — Rate limiting dùng Redis counter
// Chặn spam API — bảo vệ checkout, auth, voucher endpoints

import redis from '../redis.js';

const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  
  // Next.js App Router Request (Headers object)
  if (typeof req.headers?.get === 'function') {
    return (
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'
    );
  }

  // Node/Express style req
  const headers = req.headers || {};
  return (
    (headers['x-forwarded-for'] ? String(headers['x-forwarded-for']).split(',')[0].trim() : null) ||
    headers['x-real-ip'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
};

export const rateLimit = ({
  windowMs = 60 * 1000,  // 1 phút
  max = 10,              // Tối đa 10 requests/phút
  keyPrefix = 'rl',
} = {}) => {
  return async (req) => {
    try {
      const ip = getClientIp(req);
      const key = `${keyPrefix}:${ip}`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      const remaining = Math.max(0, max - count);
      const isAllowed = count <= max;

      return {
        isAllowed,
        remaining,
        reset: Date.now() + windowMs,
        limit: max,
        current: count,
      };
    } catch (error) {
      // Fallback fail-open nếu Redis tạm thời ngắt kết nối
      console.warn(`[RateLimit Warning] Redis unavailable for key prefix ${keyPrefix}:`, error.message);
      return {
        isAllowed: true,
        remaining: max,
        reset: Date.now() + windowMs,
        limit: max,
        current: 1,
      };
    }
  };
};

// Preset rate limiters cho từng loại endpoint
export const authRateLimit     = rateLimit({ max: 5,   windowMs: 15 * 60 * 1000, keyPrefix: 'rl:auth'     }); // 5 lần/15 phút
export const checkoutRateLimit = rateLimit({ max: 10,  windowMs: 60 * 1000,       keyPrefix: 'rl:checkout' }); // 10 lần/phút
export const apiRateLimit      = rateLimit({ max: 100, windowMs: 60 * 1000,       keyPrefix: 'rl:api'      }); // 100 lần/phút
export const searchRateLimit   = rateLimit({ max: 30,  windowMs: 60 * 1000,       keyPrefix: 'rl:search'   }); // 30 lần/phút

// Express Middleware helper (nếu dùng server Express)
export const createRateLimitMiddleware = (limiter) => {
  return async (req, res, next) => {
    const result = await limiter(req);
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.reset);

    if (!result.isAllowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
      });
    }

    next();
  };
};
