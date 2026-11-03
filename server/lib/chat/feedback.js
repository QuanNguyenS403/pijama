/**
 * Feedback & Complaints Module:
 * Quản lý tiếp nhận đóng góp ý kiến, phàn nàn và yêu cầu đặc biệt của khách hàng.
 * Lưu trữ dữ liệu an toàn vào SQLite bảng `customer_feedbacks`,
 * Tự động gửi email thông báo tới chủ shop và Telegram Bot (nếu cấu hình).
 */

import crypto from 'crypto'
import { getDb } from '../accountDb.js'
import { getTransporter } from '../emailConfig.js'
import { scrubPII } from './scrubPII.js'
import { isValidVnPhone } from './handoff.js'

// Khởi tạo bảng customer_feedbacks (Idempotent Migration)
export function initFeedbackSchema() {
  try {
    const database = getDb()
    database.exec(`
      CREATE TABLE IF NOT EXISTS customer_feedbacks (
        id TEXT PRIMARY KEY,
        feedback_type TEXT NOT NULL,
        customer_name TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        order_id TEXT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notified_email INTEGER NOT NULL DEFAULT 0,
        notified_telegram INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_customer_feedbacks_created ON customer_feedbacks(created_at);
      CREATE INDEX IF NOT EXISTS idx_customer_feedbacks_phone ON customer_feedbacks(phone);
    `)
  } catch (err) {
    console.warn('⚠️ [FEEDBACK SCHEMA INIT WARNING]:', err.message)
  }
}

// Chạy khởi tạo schema khi nạp module
initFeedbackSchema()

const FEEDBACK_TYPE_LABELS = {
  suggestion: '💡 Đóng góp ý kiến cải tiến',
  complaint: '⚠️ Phàn nàn / Khiếu nại dịch vụ & đơn hàng',
  request: '💌 Yêu cầu / Nguyện vọng đặc biệt',
  other: '📝 Ý kiến khác',
}

/**
 * Gửi email thông báo ý kiến khách hàng tới ban quản trị / chủ shop
 */
async function notifyOwnerByEmail({ id, feedbackType, customerName, phone, email, orderId, content, createdAt }) {
  try {
    const transporter = getTransporter()
    const ownerEmail = process.env.OWNER_EMAIL || 'quannguyens403@gmail.com'
    const typeLabel = FEEDBACK_TYPE_LABELS[feedbackType] || FEEDBACK_TYPE_LABELS.other

    let subjectPrefix = '💡 [Ý KIẾN KHÁCH HÀNG]'
    if (feedbackType === 'complaint') subjectPrefix = '🚨 [PHÀN NÀN - KHIẾU NẠI]'
    else if (feedbackType === 'request') subjectPrefix = '💌 [YÊU CẦU ĐẶC BIỆT]'

    const subject = `${subjectPrefix} ${customerName || 'Khách hàng'} — ${phone}`

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Ý kiến đóng góp & Phàn nàn từ khách hàng</title></head>
    <body style="font-family: Arial, sans-serif; background: #FAF8F5; margin: 0; padding: 20px; color: #2C201A;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #E8DFD5; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="background: ${feedbackType === 'complaint' ? '#8C1D2F' : '#631521'}; padding: 18px 24px; color: #FAF8F5;">
          <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">${typeLabel.toUpperCase()}</h2>
          <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85;">Thời gian tiếp nhận: ${new Date(createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
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
            ${email ? `
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">EMAIL:</td>
              <td style="padding: 8px 0;">${email}</td>
            </tr>` : ''}
            ${orderId ? `
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">MÃ ĐƠN HÀNG:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #D4AF37;">${orderId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #8C7E74; font-weight: bold;">PHÂN LOẠI:</td>
              <td style="padding: 8px 0; font-weight: 600;">${typeLabel}</td>
            </tr>
          </table>

          <div style="background: #FAF5F0; border-left: 4px solid #D4AF37; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
            <b style="color: #631521;">Nội dung khách hàng chia sẻ:</b><br/>
            <div style="margin-top: 6px; white-space: pre-wrap; color: #2C201A;">${content}</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="tel:${phone}" style="display: inline-block; background: #631521; color: #ffffff; padding: 10px 22px; text-decoration: none; font-weight: bold; border-radius: 2px; font-size: 13px;">GỌI NGAY CHO KHÁCH</a>
            <a href="https://zalo.me/${phone.replace(/^\+84/, '0')}" style="display: inline-block; background: #0068FF; color: #ffffff; padding: 10px 22px; text-decoration: none; font-weight: bold; border-radius: 2px; font-size: 13px; margin-left: 8px;">NHẮN TIN ZALO</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    await transporter.sendMail({
      from: `"QNS Chat" <${process.env.GMAIL_USER}>`,
      to: ownerEmail,
      subject,
      html,
    })

    return true
  } catch (err) {
    console.warn('⚠️ [FEEDBACK EMAIL ERROR]:', err.message)
    return false
  }
}

/**
 * Gửi thông báo tới Telegram Bot chủ shop (nếu có cấu hình)
 */
async function notifyOwnerByTelegram({ feedbackType, customerName, phone, orderId, content }) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID

  if (!token || !chatId) return false

  try {
    const typeLabel = FEEDBACK_TYPE_LABELS[feedbackType] || FEEDBACK_TYPE_LABELS.other
    const text =
      `📬 *THÔNG BÁO Ý KIẾN KHÁCH HÀNG (QNS CHAT)*\n\n` +
      `📌 *Phân loại:* ${typeLabel}\n` +
      `👤 *Khách hàng:* ${customerName || 'Chưa cung cấp'}\n` +
      `📞 *Số điện thoại:* \`${phone}\`\n` +
      (orderId ? `📦 *Đơn hàng:* \`${orderId}\`\n` : '') +
      `\n💬 *Nội dung:*\n${content.slice(0, 500)}`

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
    console.warn('⚠️ [FEEDBACK TELEGRAM WARNING]:', err.message)
    return false
  }
}

/**
 * Tiếp nhận và xử lý Ý kiến đóng góp / Phàn nàn / Yêu cầu
 * @param {Object} data
 * @param {string} data.feedbackType - 'suggestion' | 'complaint' | 'request' | 'other'
 * @param {string} data.name - Tên khách
 * @param {string} data.phone - SĐT khách
 * @param {string} [data.email] - Email khách (tùy chọn)
 * @param {string} [data.orderId] - Mã đơn hàng (tùy chọn)
 * @param {string} data.content - Nội dung ý kiến
 */
export async function createFeedbackSubmission({
  feedbackType = 'suggestion',
  name = '',
  phone = '',
  email = '',
  orderId = '',
  content = '',
}) {
  const validTypes = ['suggestion', 'complaint', 'request', 'other']
  const cleanType = validTypes.includes(feedbackType) ? feedbackType : 'suggestion'

  if (!isValidVnPhone(phone)) {
    return {
      success: false,
      error: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại gồm 10 chữ số (ví dụ: 0973 486 218) để Ban Quản Trị có thể liên hệ lại hỗ trợ chu đáo ạ.',
    }
  }

  const cleanContent = (content || '').trim()
  if (cleanContent.length < 5) {
    return {
      success: false,
      error: 'Vui lòng nhập nội dung chi tiết (tối thiểu 5 ký tự) để chúng em có thể thấu hiểu và giải quyết thấu đáo nhất ạ.',
    }
  }

  const cleanPhone = phone.trim().replace(/[\s.-]/g, '')
  const cleanName = (name || '').trim().slice(0, 80)
  const cleanEmail = (email || '').trim().slice(0, 100)
  const cleanOrderId = (orderId || '').trim().slice(0, 50)
  const safeContent = cleanContent.slice(0, 2000)

  const id = `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
  const now = new Date().toISOString()

  const database = getDb()

  // Lưu vào SQLite
  database.prepare(`
    INSERT INTO customer_feedbacks (id, feedback_type, customer_name, phone, email, order_id, content, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, cleanType, cleanName, cleanPhone, cleanEmail, cleanOrderId, safeContent, now)

  // Gửi thông báo email và telegram (nền)
  let emailSent = false
  let telegramSent = false

  try {
    emailSent = await notifyOwnerByEmail({
      id,
      feedbackType: cleanType,
      customerName: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      orderId: cleanOrderId,
      content: safeContent,
      createdAt: now,
    })
  } catch {}

  try {
    telegramSent = await notifyOwnerByTelegram({
      feedbackType: cleanType,
      customerName: cleanName,
      phone: cleanPhone,
      orderId: cleanOrderId,
      content: safeContent,
    })
  } catch {}

  // Cập nhật cờ thông báo
  try {
    database.prepare(`
      UPDATE customer_feedbacks
      SET notified_email = ?, notified_telegram = ?
      WHERE id = ?
    `).run(emailSent ? 1 : 0, telegramSent ? 1 : 0, id)
  } catch {}

  let responseMessage = 'QuanNguyenS xin chân thành cảm ơn ý kiến đóng góp của quý khách! Ban Quản Trị sẽ lắng nghe và phản hồi sớm nhất qua số điện thoại đã cung cấp ạ.'
  if (cleanType === 'complaint') {
    responseMessage = 'QuanNguyenS chân thành cáo lỗi vì trải nghiệm chưa trọn vẹn của quý khách. Ban Quản Trị đã tiếp nhận khiếu nại và sẽ gọi điện trực tiếp xử lý thỏa đáng trong vòng 24 giờ làm việc ạ!'
  } else if (cleanType === 'request') {
    responseMessage = 'QuanNguyenS đã ghi nhận yêu cầu đặc biệt của quý khách. Đội ngũ tư vấn sẽ liên hệ để xác nhận và phục vụ quý khách chu đáo nhất ạ!'
  }

  return {
    success: true,
    feedbackId: id,
    message: responseMessage,
  }
}

