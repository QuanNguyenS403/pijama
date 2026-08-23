// lib/monitoring/logger.ts — Simple structured logger

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const log = (level: LogLevel, message: string, meta: Record<string, any> = {}) => {
  if (levels[level] > (levels[currentLevel] ?? 2)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

export const logger = {
  error: (msg: string, meta?: Record<string, any>) => log('error', msg, meta),
  warn: (msg: string, meta?: Record<string, any>) => log('warn', msg, meta),
  info: (msg: string, meta?: Record<string, any>) => log('info', msg, meta),
  debug: (msg: string, meta?: Record<string, any>) => log('debug', msg, meta),

  // Shortcut cho order events
  order: (action: string, orderId: string, meta: Record<string, any> = {}) =>
    log('info', `[ORDER] ${action}`, { orderId, ...meta }),
};

export default logger;
