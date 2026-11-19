// server/lib/loyalty/otpProviders/telegramConfig.js
// Pure, dependency-free Telegram configuration validators and diagnostics.
// Kept free of DB/SQLite imports so envCheck.js / bootstrapEnv.js can import safely at boot.

const TELEGRAM_PLACEHOLDER_PATTERNS = [
  /^xxxx/i,
  /^\[.*\]$/,
  /^<.*>$/,
  /^your[-_]/i,
  /your[_-]?bot/i,
  /your[_-]?token/i,
  /your[_-]?chat/i,
  /your[_-]?webhook/i,
  /insert[_-]here/i,
  /^placeholder/i,
]

function isTelegramPlaceholder(val = '') {
  const trimmed = String(val || '').trim()
  if (!trimmed) return false
  return TELEGRAM_PLACEHOLDER_PATTERNS.some((p) => p.test(trimmed))
}

/**
 * Escape ký tự đặc biệt HTML cho Telegram parse_mode: 'HTML'
 */
export function escapeTelegramHtml(str = '') {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Tách Bot ID số nguyên từ TELEGRAM_BOT_TOKEN (phần trước dấu `:`)
 */
export function extractTelegramBotId(rawToken = '') {
  const token = String(rawToken || '').trim()
  const match = token.match(/^(\d{5,}):[A-Za-z0-9_-]{20,}$/)
  return match ? match[1] : ''
}

/**
 * Kiểm tra định dạng TELEGRAM_BOT_TOKEN
 */
export function validateTelegramBotToken(rawToken = '') {
  const token = String(rawToken || '').trim()
  if (!token) {
    return {
      valid: false,
      configured: false,
      token: '',
      botId: '',
      code: 'MISSING',
      message: 'Chưa cấu hình TELEGRAM_BOT_TOKEN.',
    }
  }
  if (isTelegramPlaceholder(token)) {
    return {
      valid: false,
      configured: true,
      token: '',
      botId: '',
      code: 'PLACEHOLDER',
      message: 'TELEGRAM_BOT_TOKEN đang là giá trị mẫu/placeholder (ví dụ <BOT_TOKEN>). Vui lòng thay bằng Bot Token thật từ @BotFather.',
    }
  }
  const botId = extractTelegramBotId(token)
  if (!botId) {
    return {
      valid: false,
      configured: true,
      token: '',
      botId: '',
      code: 'INVALID_FORMAT',
      message: 'TELEGRAM_BOT_TOKEN không đúng định dạng của @BotFather (<bot_id>:<secret>).',
    }
  }
  return {
    valid: true,
    configured: true,
    token,
    botId,
    code: 'OK',
    message: '',
  }
}

/**
 * Kiểm tra định dạng TELEGRAM_WEBHOOK_SECRET theo chuẩn Telegram Bot API
 * (chỉ cho phép [A-Za-z0-9_-], độ dài 1..256, tuyệt đối không bọc < >)
 */
export function validateTelegramWebhookSecret(rawSecret = '') {
  const secret = String(rawSecret || '').trim()
  if (!secret) {
    return {
      valid: true,
      configured: false,
      secret: '',
      code: 'NOT_SET',
      message: '',
    }
  }
  if (isTelegramPlaceholder(secret) || /[<>]/.test(secret) || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    return {
      valid: false,
      configured: true,
      secret: '',
      code: 'INVALID_SECRET_CHARS',
      message: 'TELEGRAM_WEBHOOK_SECRET không hợp lệ (chứa dấu < >, khoảng trắng hoặc placeholder). Telegram chỉ chấp nhận A-Z, a-z, 0-9, _ và - (1–256 ký tự).',
    }
  }
  return {
    valid: true,
    configured: true,
    secret,
    code: 'OK',
    message: '',
  }
}

/**
 * Kiểm tra TELEGRAM_OWNER_CHAT_ID: bắt buộc là Chat ID số nguyên cá nhân/nhóm,
 * cấm @username (như @QuanNguyenSbot) và cấm trùng với ID của chính con bot.
 */
export function validateTelegramOwnerChatId(rawChatId = '', rawBotToken = process.env.TELEGRAM_BOT_TOKEN) {
  const chatId = String(rawChatId || '').trim()
  if (!chatId) {
    return {
      valid: false,
      configured: false,
      chatId: '',
      code: 'MISSING',
      message: 'Chưa cấu hình TELEGRAM_OWNER_CHAT_ID.',
    }
  }
  if (isTelegramPlaceholder(chatId)) {
    return {
      valid: false,
      configured: true,
      chatId: '',
      code: 'PLACEHOLDER',
      message: 'TELEGRAM_OWNER_CHAT_ID đang là giá trị mẫu/placeholder. Hãy thay bằng Chat ID số nguyên cá nhân của chủ shop.',
    }
  }
  if (chatId.startsWith('@')) {
    return {
      valid: false,
      configured: true,
      chatId: '',
      code: 'USERNAME_NOT_ALLOWED',
      message: `TELEGRAM_OWNER_CHAT_ID không được dùng username ("${chatId}"). Bot Telegram không thể gửi tin tới @username cá nhân hoặc chính @QuanNguyenSbot; hãy lấy ID số nguyên từ @userinfobot hoặc gửi /myid cho bot.`,
    }
  }
  if (!/^-?\d{5,20}$/.test(chatId)) {
    return {
      valid: false,
      configured: true,
      chatId: '',
      code: 'INVALID_FORMAT',
      message: 'TELEGRAM_OWNER_CHAT_ID phải là số nguyên (ví dụ 987654321 cho tài khoản cá nhân hoặc -100... cho nhóm).',
    }
  }
  const botId = extractTelegramBotId(rawBotToken)
  if (botId && chatId === botId) {
    return {
      valid: false,
      configured: true,
      chatId: '',
      code: 'EQUALS_BOT_ID',
      message: `TELEGRAM_OWNER_CHAT_ID (${chatId}) đang trùng với ID của chính Telegram Bot. Bot không thể tự nhắn cho chính mình; hãy thay bằng Chat ID cá nhân của chủ shop (lấy từ @userinfobot hoặc lệnh /myid).`,
    }
  }
  return {
    valid: true,
    configured: true,
    chatId,
    code: 'OK',
    message: '',
  }
}

/**
 * Báo cáo chẩn đoán cấu hình Telegram an toàn (không bao giờ làm lộ token hay secret)
 */
export function getTelegramConfigDiagnostics(env = process.env) {
  const tokenCheck = validateTelegramBotToken(env.TELEGRAM_BOT_TOKEN)
  const ownerCheck = validateTelegramOwnerChatId(env.TELEGRAM_OWNER_CHAT_ID, env.TELEGRAM_BOT_TOKEN)
  const secretCheck = validateTelegramWebhookSecret(env.TELEGRAM_WEBHOOK_SECRET)
  const rawBotUsername = String(env.TELEGRAM_BOT_USERNAME || '').trim()
  const botUsername = rawBotUsername ? rawBotUsername.replace(/^@/, '') : 'QuanNguyenSbot'
  const rawWebhookUrl = String(env.TELEGRAM_WEBHOOK_URL || '').trim()
  const canonicalWebhookUrl = rawWebhookUrl
    ? rawWebhookUrl.replace(/^https?:\/\/quannguyens\.com(?=\/|$)/i, 'https://www.quannguyens.com')
    : ((env.NODE_ENV === 'production' || env.RENDER) ? 'https://www.quannguyens.com/api/telegram/webhook' : '')
  const webhookUrlIsNonWww = /^https?:\/\/quannguyens\.com(?=\/|$)/i.test(rawWebhookUrl)
  const webhookUrlIsHttps = !rawWebhookUrl || /^https:\/\//i.test(rawWebhookUrl)
  const rawOwner = String(env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const maskedOwner = ownerCheck.valid
    ? (ownerCheck.chatId.length >= 6
        ? `${ownerCheck.chatId.slice(0, 3)}***${ownerCheck.chatId.slice(-3)}`
        : ownerCheck.chatId)
    : (rawOwner || null)

  return {
    configured: Boolean(tokenCheck.valid || String(env.TELEGRAM_GATEWAY_TOKEN || '').trim()),
    botUsername,
    botUsernameHasAtPrefix: rawBotUsername.startsWith('@'),
    botId: tokenCheck.botId || null,
    botToken: {
      configured: tokenCheck.configured,
      valid: tokenCheck.valid,
      code: tokenCheck.code,
      message: tokenCheck.message,
      length: String(env.TELEGRAM_BOT_TOKEN || '').trim().length,
    },
    ownerChatId: {
      configured: ownerCheck.configured,
      valid: ownerCheck.valid,
      code: ownerCheck.code,
      message: ownerCheck.message,
      masked: maskedOwner,
    },
    webhookUrl: rawWebhookUrl || null,
    canonicalWebhookUrl: canonicalWebhookUrl || null,
    webhookUrlIsNonWww,
    webhookUrlIsHttps,
    webhookSecret: {
      configured: secretCheck.configured,
      valid: secretCheck.valid,
      code: secretCheck.code,
      message: secretCheck.message,
      length: String(env.TELEGRAM_WEBHOOK_SECRET || '').trim().length,
    },
    gatewayConfigured: Boolean(String(env.TELEGRAM_GATEWAY_TOKEN || '').trim()),
  }
}
