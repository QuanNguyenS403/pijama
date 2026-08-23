// lib/monitoring/sentry.ts — Sentry monitoring module

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('xxx')) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1, // 10% requests
    environment: process.env.NODE_ENV || 'development',
    beforeSend(event) {
      // Không gửi lỗi khi dev
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });
}

export { Sentry };
export default Sentry;
