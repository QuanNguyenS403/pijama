// lib/monitoring/logger.js — Simple structured logger

const levels = { error: 0, warn: 1, info: 2, debug: 3 }
const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const log = (level, message, meta = {}) => {
  if (levels[level] > levels[currentLevel]) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }

  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),

  // Shortcut cho order events
  order: (action, orderId, meta = {}) =>
    log('info', `[ORDER] ${action}`, { orderId, ...meta }),
}

export default logger
