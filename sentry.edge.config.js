// sentry.edge.config.js — Cấu hình Sentry Edge/Middleware

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:              process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% requests
  environment:      process.env.NODE_ENV,
  beforeSend(event) {
    // Không gửi lỗi khi dev
    if (process.env.NODE_ENV === 'development') return null
    return event
  },
})
