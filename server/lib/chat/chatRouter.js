/**
 * Chat Router Module:
 * Đăng ký các endpoints:
 * - POST /api/chat : Xử lý tin nhắn khách hàng (Tầng 0 -> Tầng 1 -> Tầng 2)
 * - POST /api/chat/handoff : Tiếp nhận form yêu cầu gọi lại (Lưu SQLite + Email + Telegram)
 * - GET  /api/chat/config  : Cung cấp trạng thái bật/tắt và quick replies ban đầu
 */

import express from 'express'
import { createRateLimiter } from '../rateLimiter.js'
import { processTier0Intent } from './intents.js'
import { retrieveKnowledge } from './knowledgeBase.js'
import { buildLiveFacts, LIVE_CONSTANTS } from './liveFacts.js'
import { scrubPII } from './scrubPII.js'
import { guardOutput } from './outputGuard.js'
import { buildSystemPrompt } from './persona.js'
import { generateChatResponse } from './providerManager.js'
import { createHandoffRequest } from './handoff.js'

const router = express.Router()

// Rate limiter cho API chat: Mặc định 10 request/phút/IP
const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CHAT_PER_IP_PER_MIN || '12', 10),
  message: 'Bạn đang gửi tin nhắn hơi nhanh. Vui lòng chờ vài giây để em trả lời nhé!',
})

// Rate limiter chặt cho Form Handoff: Tối đa 5 yêu cầu / 10 phút / IP
const handoffLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Bạn đã gửi yêu cầu liên hệ gần đây. Shop đã ghi nhận và sẽ liên hệ sớm nhất ạ!',
})

// Middleware kiểm tra công tắc khẩn cấp CHAT_ENABLED
function checkChatEnabled(req, res, next) {
  if (process.env.CHAT_ENABLED === 'false') {
    return res.status(503).json({
      success: false,
      error: 'Tính năng trợ lý ảo tạm thời tắt để bảo trì. Quý khách vui lòng liên hệ hotline 0981 753 082 ạ!',
      enabled: false,
    })
  }
  next()
}

/**
 * GET /api/chat/config
 * Trả về trạng thái hoạt động của chatbot cho frontend
 */
router.get('/config', (req, res) => {
  const isEnabled = process.env.CHAT_ENABLED !== 'false'
  return res.json({
    success: true,
    enabled: isEnabled,
    hotline: LIVE_CONSTANTS.SHOP_HOTLINE,
    zaloLink: LIVE_CONSTANTS.SHOP_ZALO_LINK,
    initialQuickReplies: [
      'Tư vấn chọn size',
      'Phí ship & đổi trả',
      'Ưu đãi đang có',
      'Gặp chủ shop',
    ],
  })
})

/**
 * POST /api/chat
 * Xử lý một lượt hội thoại từ người dùng
 */
router.post('/', checkChatEnabled, chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, cartSummary, history = [] } = req.body || {}

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tin nhắn',
      })
    }

    const maxInputChars = parseInt(process.env.CHAT_MAX_INPUT_CHARS || '600', 10)
    const cleanMessage = message.trim().slice(0, maxInputChars)

    // 1. Kiểm tra Tầng 0 (Intents & FAQ cục bộ — 0đ, không gọi AI)
    const tier0Result = processTier0Intent(cleanMessage, { cartSummary })
    if (tier0Result.handled) {
      const liveFacts = buildLiveFacts({ cartSummary })
      const guarded = guardOutput(tier0Result.reply, {
        activeVoucherCodes: liveFacts.activeVoucherCodes,
      })

      return res.json({
        success: true,
        reply: guarded.sanitizedReply,
        quickReplies: tier0Result.quickReplies || ['Tư vấn chọn size', 'Xem mẫu pijama', 'Gặp chủ shop'],
        handoff: tier0Result.handoff || null,
        usedTier: tier0Result.usedTier || 'tier-0',
      })
    }

    // 2. Chuẩn bị ngữ cảnh cho Tầng 1 (LLM)
    const relevantChunks = retrieveKnowledge(cleanMessage, 3)
    const liveFacts = buildLiveFacts({ cartSummary })
    const systemPrompt = buildSystemPrompt({
      liveFacts,
      relevantChunks,
      botName: 'Trợ lý QuanNguyenS',
    })

    // Lọc PII trong lịch sử và tin nhắn hiện tại
    const maxHistoryTurns = parseInt(process.env.CHAT_HISTORY_TURNS || '6', 10)
    const safeHistory = (Array.isArray(history) ? history.slice(-maxHistoryTurns) : []).map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: scrubPII(String(h.content || '').slice(0, 400)),
    }))

    safeHistory.push({
      role: 'user',
      content: scrubPII(cleanMessage),
    })

    const maxOutputTokens = parseInt(process.env.CHAT_MAX_OUTPUT_TOKENS || '220', 10)

    // 3. Gọi điều phối Provider (Primary -> Fallback -> Tier 2)
    const llmResult = await generateChatResponse({
      system: systemPrompt,
      messages: safeHistory,
      userMessage: cleanMessage,
      maxTokens: maxOutputTokens,
      cartSummary,
    })

    // 4. Kiểm duyệt đầu ra bắt buộc (outputGuard)
    const guarded = guardOutput(llmResult.text, {
      activeVoucherCodes: liveFacts.activeVoucherCodes,
    })

    let handoffData = null
    if (llmResult.handoff) {
      handoffData = llmResult.handoff
    } else if (llmResult.fallbackHandoff) {
      handoffData = {
        active: true,
        zalo: liveFacts.zaloLink,
        tel: `tel:${liveFacts.hotline}`,
        phoneDisplay: liveFacts.hotline,
      }
    }

    // Gợi ý phản hồi nhanh thông minh
    const dynamicQuickReplies =
      llmResult.quickReplies && llmResult.quickReplies.length > 0
        ? llmResult.quickReplies
        : ['Xem 3 mẫu pijama', 'Tư vấn chọn size', 'Phí ship & Đổi trả', 'Gặp chủ shop']

    return res.json({
      success: true,
      reply: guarded.sanitizedReply,
      quickReplies: dynamicQuickReplies,
      product: llmResult.product || null,
      handoff: handoffData,
      usedTier: llmResult.usedTier,
      provider: llmResult.provider,
    })
  } catch (err) {
    console.error('🚨 [CHAT ROUTE ERROR]:', err)
    // Luôn trả về phản hồi lịch sự, tuyệt đối không quăng lỗi thô cho khách
    return res.json({
      success: true,
      reply:
        'Dạ em sẵn sàng hỗ trợ anh/chị chọn size, xem mẫu hoặc kết nối ngay cùng chủ shop QuanNguyenS qua Zalo (0981 753 082) nhé ạ!',
      quickReplies: ['Tư vấn chọn size', 'Gặp chủ shop'],
      handoff: {
        active: true,
        zalo: LIVE_CONSTANTS.SHOP_ZALO_LINK,
        tel: `tel:${LIVE_CONSTANTS.SHOP_HOTLINE}`,
        phoneDisplay: LIVE_CONSTANTS.SHOP_HOTLINE,
      },
      usedTier: 'tier-2-exception',
    })
  }
})

/**
 * POST /api/chat/handoff
 * Tiếp nhận form để lại số điện thoại gọi lại
 */
router.post('/handoff', checkChatEnabled, handoffLimiter, async (req, res) => {
  try {
    const { name, phone, topic, preferredTime, recentConversation } = req.body || {}

    const result = await createHandoffRequest({
      name,
      phone,
      topic,
      preferredTime,
      recentConversation,
    })

    if (!result.success) {
      return res.status(400).json(result)
    }

    return res.json(result)
  } catch (err) {
    console.error('🚨 [HANDOFF ROUTE ERROR]:', err)
    return res.status(500).json({
      success: false,
      error: 'Không thể tiếp nhận yêu cầu lúc này. Quý khách vui lòng gọi trực tiếp hotline 0981 753 082 ạ!',
    })
  }
})

export default router
