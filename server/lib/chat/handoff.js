/**
 * Handoff Service Module:
 * Quản lý kết nối khách hàng với chủ shop (Zalo, Gọi điện, Để lại SĐT).
 * Lưu trữ yêu cầu vào SQLite bảng `chat_handoffs` an toàn,
 * tự động gửi email thông báo qua Nodemailer và gửi tin nhắn tức thì qua Telegram Bot (nếu cấu hình).
 */

import crypto from 'crypto'
import { getDb } from '../accountDb.js'
import { getTransporter } from '../emailConfig.js'
import { scrubPII } from './scrubPII.js'

// Khởi tạo bảng chat_handoffs an toàn (Idempotent Migration)
export function initHandoffSchema() {
  try {
    const database = getDb()
    database.exec(`
      CREATE TABLE IF NOT EXISTS chat_handoffs (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        phone TEXT NOT NULL,
        topic TEXT,
        preferred_time TEXT,
        summary TEXT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notified_email INTEGER NOT NULL DEFAULT 0,
        notified_telegram INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_chat_handoffs_created ON chat_handoffs(created_at);
      CREATE INDEX IF NOT EXISTS idx_chat_handoffs_phone ON chat_handoffs(phone);
    `)
  } catch (err) {
    console.warn('⚠️ [HANDOFF SCHEMA INIT WARNING]:', err.message)
  }
}

// Chạy khởi tạo schema khi import
initHandoffSchema()

/**
 * Validate số điện thoại Việt Nam
 */
export function isValidVnPhone(phone) {
  if (!phone || typeof phone !== 'string') return false
  const cleanPhone = phone.replace(/[\s.-]/g, '')
  return /^(?:0|\+84)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(cleanPhone)
}

/**
 * Gửi thông báo Email tới chủ shop
 */
async function notifyOwnerByEmail({ id, customerName, phone, topic, preferredTime, summary, createdAt }) {
  try {
    const transporter = getTransporter()
    const ownerEmail = process.env.OWNER_EMAIL || 'quannguyens403@gmail.com'
    const subject = `🔔 [CHATBOT HANDOFF] Khách yêu cầu liên hệ lại — ${phone} (${customerName || 'Khách vãng lai'})`

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Khách hàng yêu cầu hỗ trợ</title></head>
    <body style="font-family: Arial, sans-serif; background: #FAF8F5; margin: 0; padding: 20px; color: #2C201A;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #E8DFD5; border-radius: 4px; overflow: hidden;">
        <div style="background: #631521; padding: 18px 24px; color: #FAF8F5;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">🔔 YÊU CẦU LIÊN HỆ TỪ CHATBOT</h2>
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85;">Thời gian: ${new Date(createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; width: 140px; font-weight: bold;">HỌ VÀ TÊN:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #631521;">${customerName || 'Chưa cung cấp'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">SỐ ĐIỆN THOẠI:</td>
              <td style="padding: 8px 0; font-weight: bold;"><a href="tel:${phone}" style="color: #631521; text-decoration: none;">${phone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">CHỦ ĐỀ QUAN TÂM:</td>
              <td style="padding: 8px 0;">${topic || 'Tư vấn sản phẩm / Đơn hàng'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">GIỜ TIỆN GỌI:</td>
              <td style="padding: 8px 0;">${preferredTime || 'Càng sớm càng tốt'}</td>
            </tr>
          </table>

          <div style="background: #FAF5F0; border-left: 3px solid #D4AF37; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
            <b style="color: #631521;">Tóm tắt hội thoại trước đó:</b><br/>
            ${summary ? summary.replace(/\n/g, '<br/>') : 'Không có tóm tắt chi tiết.'}
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="tel:${phone}" style="display: inline-block; background: #631521; color: #ffffff; padding: 10px 24px; text-decoration: none; font-weight: bold; border-radius: 2px; font-size: 13px;">GỌI NGAY CHO KHÁCH</a>
            <a href="https://zalo.me/${phone.replace(/^\+84/, '0')}" style="display: inline-block; background: #0068FF; color: #ffffff; padding: 10px 24px; text-decoration: none; font-weight: bold; border-radius: 2px; font-size: 13px; margin-left: 8px;">NHẮN TIN ZALO</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    await transporter.sendMail({
      from: `"QuanNguyenS Assistant" <${process.env.GMAIL_USER}>`,
      to: ownerEmail,
      subject,
      html,
    })

    return true
  } catch (err) {
    console.warn('⚠️ [HANDOFF EMAIL ERROR]:', err.message)
    return false
  }
}

/**
 * Gửi thông báo tức thì lên điện thoại chủ shop qua Telegram Bot (Tùy chọn miễn phí)
 */
async function notifyOwnerByTelegram({ customerName, phone, topic, preferredTime, summary }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID

  if (!token || !chatId) return false

  try {
    const text =
      `🔔 *YÊU CẦU GỌI LẠI TỪ KHÁCH HÀNG (CHATBOT)*\n\n` +
      `👤 *Khách hàng:* ${customerName || 'Chưa cung cấp'}\n` +
      `📞 *Số điện thoại:* \`${phone}\`\n` +
      `💬 *Chủ đề:* ${topic || 'Tư vấn sản phẩm'}\n` +
      `⏰ *Giờ tiện gọi:* ${preferredTime || 'Càng sớm càng tốt'}\n\n` +
      `📝 *Tóm tắt:* ${summary || 'Khách bấm yêu cầu tư vấn'}`

    const url = `https://api.telegram.org/bot${token}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    return res.ok
  } catch (err) {
    console.warn('⚠️ [HANDOFF TELEGRAM WARNING]:', err.message)
    return false
  }
}

/**
 * Xử lý tiếp nhận yêu cầu Handoff từ form khách gửi
 * @param {Object} data
 * @param {string} data.name - Tên khách
 * @param {string} data.phone - SĐT khách
 * @param {string} data.topic - Chủ đề cần tư vấn
 * @param {string} data.preferredTime - Giờ tiện gọi
 * @param {string} data.recentConversation - Các tin nhắn gần nhất
 */
export async function createHandoffRequest({ name, phone, topic, preferredTime, recentConversation = '' }) {
  if (!isValidVnPhone(phone)) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 0).',
    }
  }

  const cleanPhone = phone.trim().replace(/[\s.-]/g, '')
  const cleanName = (name || '').trim().slice(0, 80)
  const cleanTopic = (topic || '').trim().slice(0, 150)
  const cleanPreferredTime = (preferredTime || '').trim().slice(0, 100)
  const scrubbedSummary = scrubPII(recentConversation).slice(0, 500)

  const id = `ho_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
  const now = new Date().toISOString()

  const database = getDb()

  // Lưu vào SQLite
  database.prepare(`
    INSERT INTO chat_handoffs (id, customer_name, phone, topic, preferred_time, summary, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, cleanName, cleanPhone, cleanTopic, cleanPreferredTime, scrubbedSummary, now)

  // Gửi thông báo nền (không block response nếu lỗi mạng)
  let emailSent = false
  let telegramSent = false

  try {
    emailSent = await notifyOwnerByEmail({
      id,
      customerName: cleanName,
      phone: cleanPhone,
      topic: cleanTopic,
      preferredTime: cleanPreferredTime,
      summary: scrubbedSummary,
      createdAt: now,
    })
  } catch (e) {}

  try {
    telegramSent = await notifyOwnerByTelegram({
      customerName: cleanName,
      phone: cleanPhone,
      topic: cleanTopic,
      preferredTime: cleanPreferredTime,
      summary: scrubbedSummary,
    })
  } catch (e) {}

  // Cập nhật trạng thái thông báo
  try {
    database.prepare(`
      UPDATE chat_handoffs 
      SET notified_email = ?, notified_telegram = ?
      WHERE id = ?
    `).run(emailSent ? 1 : 0, telegramSent ? 1 : 0, id)
  } catch (e) {}

  return {
    success: true,
    message: 'Em đã chuyển thông tin tới chủ shop, anh/chị sẽ được liên hệ sớm qua số điện thoại đã cung cấp ạ!',
    handoffId: id,
  }
}
