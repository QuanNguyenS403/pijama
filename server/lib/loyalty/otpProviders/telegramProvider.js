// server/lib/loyalty/otpProviders/telegramProvider.js
import {
  getLoyaltyDb,
  maskPhone,
  createAlert,
  getPendingOtpByVerificationId,
  getPendingOtpByPhone,
  saveTelegramUser,
  getTelegramUserByPhone,
  getTelegramUserByTelegramId,
  attachTelegramChatIdToVerification,
} from '../loyaltyDb.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone } from '../../smsService.js'
import { isNodeTestRunner } from '../../emailRecipientGuard.js'

/**
 * Kiểm tra xem Telegram đã được cấu hình hay chưa
 */
export function isTelegramConfigured() {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const gateway = (process.env.TELEGRAM_GATEWAY_TOKEN || '').trim()
  return Boolean(token || gateway)
}

/**
 * Lấy Username của Telegram Bot
 */
export function getTelegramBotUsername() {
  const custom = (process.env.TELEGRAM_BOT_USERNAME || '').trim()
  if (custom) return custom.replace(/^@/, '')
  return 'QuanNguyenSbot'
}

/**
 * Gửi tin nhắn trực tiếp qua Telegram Bot API (sendMessage)
 */
export async function sendTelegramDirectMessage({
  chatId,
  text,
  parseMode = 'HTML',
  replyMarkup = null,
}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token) {
    return { ok: false, error: 'Chưa cấu hình TELEGRAM_BOT_TOKEN' }
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  }

  if (replyMarkup) {
    payload.reply_markup = replyMarkup
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      console.warn('⚠️ [TELEGRAM SEND MESSAGE ERROR]:', data?.description || res.statusText)
      return { ok: false, error: data?.description || 'Không thể gửi tin nhắn Telegram' }
    }

    return { ok: true, result: data.result }
  } catch (err) {
    console.warn('⚠️ [TELEGRAM SEND MESSAGE EXCEPTION]:', err?.message || err)
    return { ok: false, error: err?.message || 'Lỗi mạng khi kết nối Telegram API' }
  }
}

/**
 * Gửi mã OTP xác minh qua Telegram Gateway API (SMS alternative)
 */
export async function sendTelegramGatewayVerification({ phone, code, ttlMinutes = 5 }) {
  const gatewayToken = (process.env.TELEGRAM_GATEWAY_TOKEN || '').trim()
  if (!gatewayToken) {
    return { ok: false, error: 'Chưa cấu hình TELEGRAM_GATEWAY_TOKEN' }
  }

  const cleanPhone = normalizeVietnamesePhone(phone)
  const e164Phone = cleanPhone.startsWith('0') ? `+84${cleanPhone.slice(1)}` : `+${cleanPhone}`
  const botUsername = getTelegramBotUsername()

  try {
    const url = 'https://gatewayapi.telegram.org/sendVerificationMessage'
    const payload = {
      phone_number: e164Phone,
      code,
      ttl: ttlMinutes * 60,
    }
    if (botUsername) {
      payload.sender_username = botUsername
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      console.warn('⚠️ [TELEGRAM GATEWAY ERROR]:', data)
      return {
        ok: false,
        errorCode: 'GATEWAY_ERROR',
        error: data?.error || 'Lỗi gửi tin qua Telegram Gateway',
      }
    }

    return {
      ok: true,
      providerMessageId: data.result?.request_id,
      message: `Mã xác thực đã được gửi trực tiếp tới Telegram của số ${maskPhone(cleanPhone)}`,
    }
  } catch (err) {
    console.warn('⚠️ [TELEGRAM GATEWAY EXCEPTION]:', err?.message || err)
    return {
      ok: false,
      errorCode: 'GATEWAY_NETWORK_ERROR',
      error: err?.message || 'Lỗi kết nối Telegram Gateway',
    }
  }
}

/**
 * Thông báo tức thì cho Chủ Shop khi có khách hàng đăng ký hội viên
 */
async function notifyOwnerNewLoyaltyVerification({ phone, purpose }) {
  const ownerChatId = (process.env.TELEGRAM_OWNER_CHAT_ID || '').trim()
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!ownerChatId || !token) return

  const cleanPhone = normalizeVietnamesePhone(phone)
  const text = `🔔 <b>[QUANNGUYENS — KHÁCH HÀNG MỚI]</b>\nKhách hàng số <b>${maskPhone(cleanPhone)}</b> vừa yêu cầu mã xác minh <b>Ưu Đãi Hội Viên</b> qua Telegram (${purpose}).`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ownerChatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    // Không chặn luồng chính nếu lỗi thông báo chủ shop
  }
}

/**
 * Gửi OTP qua Telegram (Ưu tiên Gateway nếu có, hoặc Bot Direct Chat / Deep-Link)
 */
export async function sendTelegramOtp({
  phone,
  code,
  purpose = 'enrollment',
  ttlMinutes = 5,
  verificationId = '',
}) {
  const cleanPhone = normalizeVietnamesePhone(phone)
  const botUsername = getTelegramBotUsername()

  // 1. Nếu có TELEGRAM_GATEWAY_TOKEN: Gửi trực tiếp qua Telegram Gateway
  if (process.env.TELEGRAM_GATEWAY_TOKEN) {
    const gwRes = await sendTelegramGatewayVerification({ phone: cleanPhone, code, ttlMinutes })
    if (gwRes.ok) {
      notifyOwnerNewLoyaltyVerification({ phone: cleanPhone, purpose }).catch(() => {})
      return {
        ok: true,
        provider: 'telegram_gateway',
        message: gwRes.message,
        telegramUrl: `https://t.me/${botUsername}`,
      }
    }
    console.warn('⚠️ [TELEGRAM GATEWAY FALLBACK] Chuyển sang Telegram Bot do Gateway trả về lỗi:', gwRes.error)
  }

  // 2. Nếu đã có TELEGRAM_BOT_TOKEN
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!botToken) {
    return {
      ok: false,
      provider: 'telegram',
      errorCode: 'TELEGRAM_TOKEN_MISSING',
      error: 'Hệ thống xác thực Telegram chưa được cấu hình TELEGRAM_BOT_TOKEN.',
    }
  }

  // Deep-link Telegram dẫn tới bot kèm mã phiên xác thực
  const telegramDeepLink = verificationId
    ? `https://t.me/${botUsername}?start=otp_${verificationId}`
    : `https://t.me/${botUsername}`

  // 2a. Kiểm tra xem người dùng đã từng nhắn tin hoặc liên kết Telegram trước đó chưa
  const existingTgUser = getTelegramUserByPhone(cleanPhone)
  let directSent = false

  if (existingTgUser?.telegram_id) {
    const msg = `✨ <b>QuanNguyenS — MÃ XÁC MINH ƯU ĐÃI HỘI VIÊN</b>\n\n` +
      `Kính chào Quý khách! Mã xác minh số điện thoại <b>${maskPhone(cleanPhone)}</b> của Quý khách là:\n\n` +
      `👉 <code>${code}</code> 👈 <i>(chạm vào mã để sao chép)</i>\n\n` +
      `⏳ Mã có hiệu lực trong <b>${ttlMinutes} phút</b>.\n` +
      `Vui lòng nhập mã này vào trang web để xác minh chính chủ và kích hoạt đặc quyền hội viên ngay lập tức!`

    const directRes = await sendTelegramDirectMessage({
      chatId: existingTgUser.telegram_id,
      text: msg,
    })

    if (directRes.ok) {
      directSent = true
      if (verificationId) {
        attachTelegramChatIdToVerification(verificationId, existingTgUser.telegram_id)
      }
    }
  }

  notifyOwnerNewLoyaltyVerification({ phone: cleanPhone, purpose }).catch(() => {})

  if (directSent) {
    return {
      ok: true,
      provider: 'telegram_bot',
      message: `Mã xác thực 6 chữ số đã được gửi qua Telegram tới số ${maskPhone(cleanPhone)}. Vui lòng kiểm tra tin nhắn Telegram!`,
      telegramUrl: telegramDeepLink,
      deliveredDirectly: true,
    }
  }

  // 2b. Nếu khách chưa chat với Bot lần nào: Deep-link để khách bấm Start nhận mã ngay
  return {
    ok: true,
    provider: 'telegram_bot',
    message: 'Mã xác thực đã sẵn sàng trên Telegram. Vui lòng bấm "Mở Telegram Nhận Mã" để xem mã xác minh.',
    telegramUrl: telegramDeepLink,
    deliveredDirectly: false,
  }
}

const CONTACT_REQUEST_KEYBOARD = {
  keyboard: [
    [
      {
        text: '📱 Xác nhận số điện thoại của tôi',
        request_contact: true,
      },
    ],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
}

/**
 * Xử lý cập nhật (Update) từ Telegram Webhook hoặc Long-polling
 */
export async function handleTelegramWebhookUpdate(update) {
  if (!update || !update.message) return { ok: true, ignored: true }

  const msg = update.message
  const chatId = msg.chat?.id
  const fromUser = msg.from || {}
  const rawText = (msg.text || '').trim()
  const contact = msg.contact

  if (!chatId) return { ok: true, ignored: true }

  // ── 1. Khách hàng gửi lệnh /start (hỗ trợ cả /start@BotUsername, tham số otp_ hoặc deep-link) ──
  const startMatch = rawText.match(/^\/start(?:@\w+)?(?:\s+(.*))?$/i)

  if (startMatch) {
    const rawParam = (startMatch[1] || '').trim()
    const otpParamMatch =
      rawParam.match(/^(?:otp_)?(vcode_[a-zA-Z0-9_-]+)$/i) ||
      rawParam.match(/^otp_([a-zA-Z0-9_-]+)$/i)
    const verificationId = otpParamMatch ? otpParamMatch[1].trim() : ''

    // 1a. Nếu có mã phiên xác thực verificationId từ deep-link
    if (verificationId) {
      const record = getPendingOtpByVerificationId(verificationId)

      if (!record || !record.raw_code_temp) {
        await sendTelegramDirectMessage({
          chatId,
          text: `⚠️ <b>Yêu cầu xác thực không tồn tại hoặc đã hết hạn</b>\n\n` +
            `Mã xác minh chỉ có hiệu lực trong 5 phút để bảo mật. Quý khách vui lòng quay lại website https://www.quannguyens.com/hoi-vien để yêu cầu mã mới.`,
        })
        return { ok: true, handled: 'expired_or_not_found' }
      }

      if (record.telegram_chat_id && String(record.telegram_chat_id) !== String(chatId)) {
        await sendTelegramDirectMessage({
          chatId,
          text: '⚠️ Mã xác thực này đã được gửi riêng tới tài khoản Telegram đã liên kết trước đó với số điện thoại này.',
        })
        return { ok: true, handled: 'deeplink_chat_mismatch' }
      }

      attachTelegramChatIdToVerification(record.id, chatId)
      saveTelegramUser({
        telegramId: String(chatId),
        phone: record.phone,
        username: fromUser.username || null,
        firstName: fromUser.first_name || '',
        lastName: fromUser.last_name || '',
      })

      const replyText =
        `✨ <b>QuanNguyenS — XÁC MINH SỐ ĐIỆN THOẠI HỘI VIÊN</b> ✨\n\n` +
        `Kính chào Quý khách! Mã xác thực đăng ký ưu đãi hội viên cho số <b>${maskPhone(record.phone)}</b> là:\n\n` +
        `👉 <code>${record.raw_code_temp}</code> 👈\n\n` +
        `<i>(Chạm vào dãy số trên để sao chép nhanh)</i>\n\n` +
        `⏳ Mã có hiệu lực trong <b>5 phút</b>.\n` +
        `Quý khách vui lòng quay lại website điền mã xác minh để chứng minh số điện thoại chính chủ và kích hoạt đặc quyền hội viên nhé!`

      await sendTelegramDirectMessage({
        chatId,
        text: replyText,
      })

      return { ok: true, handled: 'otp_sent_via_deeplink', phone: record.phone }
    }

    // 1b. Khách bấm /start không có tham số (hoặc tham số không phải mã OTP): Tra cứu SĐT đã liên kết
    const existingTgUser = getTelegramUserByTelegramId(chatId)
    if (existingTgUser?.phone) {
      const pendingOtp = getPendingOtpByPhone(existingTgUser.phone)
      if (pendingOtp && pendingOtp.raw_code_temp) {
        attachTelegramChatIdToVerification(pendingOtp.id, chatId)

        const replyText =
          `✨ <b>QuanNguyenS — MÃ XÁC MINH SỐ ĐIỆN THOẠI HỘI VIÊN</b> ✨\n\n` +
          `Mã xác thực đăng ký ưu đãi hội viên cho số <b>${maskPhone(existingTgUser.phone)}</b> là:\n\n` +
          `👉 <code>${pendingOtp.raw_code_temp}</code> 👈\n\n` +
          `⏳ Mã có hiệu lực trong <b>5 phút</b>. Vui lòng nhập mã này vào trang web để kích hoạt đặc quyền!`

        await sendTelegramDirectMessage({
          chatId,
          text: replyText,
        })

        return { ok: true, handled: 'otp_sent_to_known_user', phone: existingTgUser.phone }
      }
    }

    // 1c. Lời chào và nút bấm chia sẻ số điện thoại
    const welcomeText =
      `👋 <b>Kính chào Quý khách đến với QuanNguyenS Privileged!</b>\n\n` +
      `Bot chính thức hỗ trợ gửi mã xác minh số điện thoại chính chủ để kích hoạt <b>Đặc Quyền Hội Viên & Tích Điểm</b> tại thương hiệu thời trang lụa QuanNguyenS.\n\n` +
      `📌 <b>Cách lấy mã xác minh:</b>\n` +
      `1. Điền số điện thoại tại website: https://www.quannguyens.com/hoi-vien\n` +
      `2. Nhận tin nhắn mã xác thực tại đây và điền vào website để kích hoạt.\n\n` +
      `Quý khách vui lòng nhấn nút bên dưới để xác nhận số điện thoại chính chủ của tài khoản Telegram này nhé!`

    await sendTelegramDirectMessage({
      chatId,
      text: welcomeText,
      replyMarkup: CONTACT_REQUEST_KEYBOARD,
    })

    return { ok: true, handled: 'start_greeting' }
  }

  // ── 2. Khách hàng gửi Danh bạ (Chia sẻ số điện thoại qua nút Share Contact) ──
  if (contact && contact.phone_number) {
    if (!contact.user_id || !fromUser.id || String(contact.user_id) !== String(fromUser.id)) {
      await sendTelegramDirectMessage({
        chatId,
        text: '⚠️ Vì lý do bảo mật, Quý khách vui lòng chỉ chia sẻ số điện thoại chính chủ của chính tài khoản Telegram này bằng nút bên dưới.',
        replyMarkup: CONTACT_REQUEST_KEYBOARD,
      })
      return { ok: true, handled: 'contact_not_owned' }
    }

    const cleanPhone = normalizeVietnamesePhone(contact.phone_number)

    saveTelegramUser({
      telegramId: String(chatId),
      phone: cleanPhone,
      username: fromUser.username || null,
      firstName: contact.first_name || fromUser.first_name || '',
      lastName: contact.last_name || fromUser.last_name || '',
    })

    const pendingOtp = getPendingOtpByPhone(cleanPhone)
    if (pendingOtp && pendingOtp.raw_code_temp) {
      attachTelegramChatIdToVerification(pendingOtp.id, chatId)

      const replyText =
        `🎉 <b>XÁC NHẬN SỐ ĐIỆN THOẠI CHÍNH CHỦ THÀNH CÔNG!</b>\n\n` +
        `Mã xác minh ưu đãi hội viên của số <b>${maskPhone(cleanPhone)}</b> là:\n\n` +
        `👉 <code>${pendingOtp.raw_code_temp}</code> 👈\n\n` +
        `⏳ Mã có hiệu lực trong <b>5 phút</b>. Vui lòng quay lại website điền mã để hoàn tất!`

      await sendTelegramDirectMessage({
        chatId,
        text: replyText,
      })

      return { ok: true, handled: 'contact_verified_and_otp_sent', phone: cleanPhone }
    }

    await sendTelegramDirectMessage({
      chatId,
      text:
        `✅ <b>Đã liên kết số điện thoại ${maskPhone(cleanPhone)} thành công!</b>\n\n` +
        `Bất cứ khi nào Quý khách đăng ký Ưu Đãi Hội Viên trên website QuanNguyenS, mã xác minh OTP sẽ được gửi tự động và an toàn về tin nhắn Telegram này.`,
    })

    return { ok: true, handled: 'contact_saved', phone: cleanPhone }
  }

  // ── 3. Khách hàng gõ trực tiếp số điện thoại dạng text (Chặn giả mạo SĐT người khác) ──
  const potentialPhone = normalizeVietnamesePhone(rawText.replace(/[^\d+]/g, ''))
  if (potentialPhone && isValidVietnamesePhone(potentialPhone)) {
    await sendTelegramDirectMessage({
      chatId,
      text:
        `🔒 Để bảo vệ tài khoản hội viên, hệ thống không gửi mã xác thực qua số điện thoại nhập tay. Quý khách vui lòng bấm nút <b>"📱 Xác nhận số điện thoại của tôi"</b> bên dưới hoặc mở lại nút <b>"Mở Telegram Nhận Mã"</b> trên website https://www.quannguyens.com/hoi-vien nhé!`,
      replyMarkup: CONTACT_REQUEST_KEYBOARD,
    })

    return { ok: true, handled: 'typed_phone_require_contact' }
  }

  // ── 4. Khách nhắn tin chào hỏi khác ──
  if (/^(chào|hi|hello|hoi vien|ưu đãi|otp)/i.test(rawText)) {
    await sendTelegramDirectMessage({
      chatId,
      text:
        `👋 Kính chào Quý khách! Để nhận mã xác minh hội viên, Quý khách vui lòng nhấn nút <b>"📱 Xác nhận số điện thoại của tôi"</b> bên dưới hoặc mở lại liên kết từ website https://www.quannguyens.com/hoi-vien nhé!`,
      replyMarkup: CONTACT_REQUEST_KEYBOARD,
    })
    return { ok: true, handled: 'start_greeting' }
  }

  return { ok: true, handled: 'other' }
}

let webhookSyncPromise = null

/**
 * Đảm bảo Webhook của Telegram luôn được đồng bộ chính xác với Canonical Domain
 * Tuyệt đối tránh URL non-www vì Cloudflare sẽ trả về 307 Temporary Redirect khiến Telegram từ chối gửi tin!
 */
export function syncTelegramWebhook() {
  if (webhookSyncPromise) return webhookSyncPromise

  webhookSyncPromise = (async () => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
    if (!token) return

    if (process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT) || isNodeTestRunner()) return

    let targetWebhookUrl = (process.env.TELEGRAM_WEBHOOK_URL || '').trim()
    if (!targetWebhookUrl) {
      if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        targetWebhookUrl = 'https://www.quannguyens.com/api/telegram/webhook'
      }
    }

    targetWebhookUrl = targetWebhookUrl.replace(
      /^https?:\/\/quannguyens\.com(?=\/|$)/i,
      'https://www.quannguyens.com'
    )

    if (!targetWebhookUrl) return

    try {
      const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: AbortSignal.timeout(8000),
      })
      const infoData = await infoRes.json()

      if (infoData.ok && infoData.result?.url === targetWebhookUrl && !infoData.result?.last_error_message) {
        console.log(`✅ [TELEGRAM] Webhook đang hoạt động chuẩn xác: ${targetWebhookUrl}`)
        return
      }

      console.log(`📡 [TELEGRAM] Đang cấu hình lại Webhook chính xác: ${targetWebhookUrl}...`)
      const setWebhookBody = {
        url: targetWebhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }
      const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
      if (webhookSecret) {
        setWebhookBody.secret_token = webhookSecret
      }

      const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setWebhookBody),
        signal: AbortSignal.timeout(8000),
      })
      const setData = await setRes.json()
      if (setData.ok) {
        console.log(`✅ [TELEGRAM] Webhook đã được thiết lập thành công tới: ${targetWebhookUrl}`)
      } else {
        console.warn('⚠️ [TELEGRAM SET WEBHOOK FAILED]:', setData.description)
      }
    } catch (err) {
      console.warn('⚠️ [TELEGRAM WEBHOOK SYNC EXCEPTION]:', err?.message || err)
    }
  })().finally(() => {
    webhookSyncPromise = null
  })

  return webhookSyncPromise
}

/**
 * Trình chạy Long-Polling cho Telegram Bot trong môi trường Dev hoặc khi không dùng Webhook
 */
let pollingActive = false
let pollingAbortController = null

export function startTelegramPolling() {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!token) return

  if (process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT) || isNodeTestRunner()) return
  if (pollingActive) return

  // Nếu là môi trường Production hoặc có Webhook URL: dừng polling để không xung đột 409
  if (process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.TELEGRAM_WEBHOOK_URL) {
    return
  }

  // Ở môi trường local dev: chỉ kích hoạt long polling nếu được bật tường minh
  if (process.env.TELEGRAM_DEV_POLLING !== 'true') {
    return
  }

  pollingActive = true
  pollingAbortController = new AbortController()

  console.log(`🤖 [TELEGRAM BOT] Khởi động chế độ nhận tin nhắn (Bot: @${getTelegramBotUsername()})...`)

  let offset = 0

  const pollLoop = async () => {
    while (pollingActive) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`
        const res = await fetch(url, { signal: pollingAbortController?.signal })
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 5000))
          continue
        }

        const data = await res.json()
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1
            await handleTelegramWebhookUpdate(update).catch((err) => {
              console.warn('⚠️ [TELEGRAM UPDATE ERROR]:', err?.message || err)
            })
          }
        }
      } catch (err) {
        if (err.name === 'AbortError' || !pollingActive) break
        await new Promise((r) => setTimeout(r, 5000))
      }
    }
  }

  pollLoop().catch((err) => {
    console.warn('⚠️ [TELEGRAM POLL LOOP EXITED]:', err?.message || err)
  })
}

export function stopTelegramPolling() {
  pollingActive = false
  if (pollingAbortController) {
    pollingAbortController.abort()
    pollingAbortController = null
  }
}
