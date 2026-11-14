// server/lib/loyalty/otpProviders/telegramProvider.js
import {
  getLoyaltyDb,
  maskPhone,
  createAlert,
  getPendingOtpByVerificationId,
  getPendingOtpByPhone,
  saveTelegramUser,
  getTelegramUserByPhone,
  attachTelegramChatIdToVerification,
} from '../loyaltyDb.js'
import { normalizeVietnamesePhone } from '../../smsService.js'
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

/**
 * Xử lý cập nhật (Update) từ Telegram Webhook hoặc Long-polling
 */
export async function handleTelegramWebhookUpdate(update) {
  if (!update || !update.message) return { ok: true, ignored: true }

  const msg = update.message
  const chatId = msg.chat?.id
  const fromUser = msg.from || {}
  const text = (msg.text || '').trim()
  const contact = msg.contact

  if (!chatId) return { ok: true, ignored: true }

  const botUsername = getTelegramBotUsername()

  // ── 1. Khách hàng bấm /start otp_<verificationId> (Deep-link từ web) ──
  if (text.startsWith('/start otp_')) {
    const verificationId = text.replace('/start otp_', '').trim()
    const record = getPendingOtpByVerificationId(verificationId)

    if (!record || !record.raw_code_temp) {
      await sendTelegramDirectMessage({
        chatId,
        text: `⚠️ <b>Yêu cầu xác thực không tồn tại hoặc đã hết hạn</b>\n\n` +
          `Mã xác minh chỉ có hiệu lực trong 5 phút để bảo mật. Quý khách vui lòng quay lại website https://quannguyens.com để yêu cầu mã mới.`,
      })
      return { ok: true, handled: 'expired_or_not_found' }
    }

    // Ghi nhận chatId vào bản ghi xác minh và lưu user Telegram
    attachTelegramChatIdToVerification(record.id, chatId)
    saveTelegramUser({
      telegramId: String(chatId),
      phone: record.phone,
      username: fromUser.username || null,
      firstName: fromUser.first_name || '',
      lastName: fromUser.last_name || '',
    })

    // Gửi ngay tin nhắn chứa mã OTP kèm hướng dẫn
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

  // ── 2. Khách hàng gửi Danh bạ (Chia sẻ số điện thoại qua nút Share Contact) ──
  if (contact && contact.phone_number) {
    const cleanPhone = normalizeVietnamesePhone(contact.phone_number)

    saveTelegramUser({
      telegramId: String(chatId),
      phone: cleanPhone,
      username: fromUser.username || null,
      firstName: contact.first_name || fromUser.first_name || '',
      lastName: contact.last_name || fromUser.last_name || '',
    })

    // Kiểm tra xem có yêu cầu OTP nào đang chờ xác thực cho SĐT này không
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

    // Nếu chưa có yêu cầu OTP trên web
    await sendTelegramDirectMessage({
      chatId,
      text:
        `✅ <b>Đã liên kết số điện thoại ${maskPhone(cleanPhone)} thành công!</b>\n\n` +
        `Bất cứ khi nào Quý khách đăng ký Ưu Đãi Hội Viên trên website QuanNguyenS, mã xác minh OTP sẽ được gửi tự động và an toàn về tin nhắn Telegram này.`,
    })

    return { ok: true, handled: 'contact_saved', phone: cleanPhone }
  }

  // ── 3. Khách nhắn lệnh /start thông thường hoặc tin nhắn chào hỏi ──
  if (text.startsWith('/start') || /^(chào|hi|hello|hoi vien|ưu đãi|otp)/i.test(text)) {
    const welcomeText =
      `👋 <b>Kính chào Quý khách đến với QuanNguyenS Privileged!</b>\n\n` +
      `Bot chính thức hỗ trợ gửi mã xác minh số điện thoại chính chủ để kích hoạt <b>Đặc Quyền Hội Viên & Tích Điểm</b> tại thương hiệu thời trang lụa QuanNguyenS.\n\n` +
      `📌 <b>Cách lấy mã xác minh:</b>\n` +
      `1. Quý khách điền số điện thoại tại website: https://quannguyens.com/hoi-vien\n` +
      `2. Nhận tin nhắn mã xác thực tại đây và điền vào website để kích hoạt.\n\n` +
      `Quý khách cũng có thể nhấn nút bên dưới để xác nhận số điện thoại chính chủ của tài khoản Telegram này.`

    await sendTelegramDirectMessage({
      chatId,
      text: welcomeText,
      replyMarkup: {
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
      },
    })

    return { ok: true, handled: 'start_greeting' }
  }

  return { ok: true, handled: 'other' }
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

  // Nếu đã cấu hình Webhook URL trên production thì không chạy polling để tránh xung đột
  if (process.env.TELEGRAM_WEBHOOK_URL) {
    console.log('🌐 [TELEGRAM] Sử dụng Webhook URL:', process.env.TELEGRAM_WEBHOOK_URL)
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
        // Chờ 5s rồi thử lại
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
