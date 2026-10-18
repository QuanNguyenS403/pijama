/**
 * Provider Manager Module:
 * Quản lý vòng đời gọi LLM:
 * 1. Kiểm tra Daily Cap & Quota nội bộ.
 * 2. Bộ đệm Cache phản hồi ngắn (TTL 15 phút) cho câu hỏi tương đồng.
 * 3. Circuit Breaker chống treo và tự động chuyển đổi Primary -> Fallback -> Tier 2.
 * 4. Không bao giờ làm crash hệ thống hay trả lỗi thô cho người dùng.
 */

import { generateGemini } from './providers/gemini.js'
import { generateGroq } from './providers/groq.js'
import { generateOpenRouter } from './providers/openrouter.js'
import { removeVietnameseTones } from './knowledgeBase.js'
import { getDb } from '../accountDb.js'
import { generateLocalAdvisorResponse } from './localAdvisor.js'

// Cache câu trả lời ngắn trong bộ nhớ (Key -> { text, timestamp })
const responseCache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 phút

// Circuit Breaker State cho từng provider
const circuitState = {
  gemini: { failures: 0, lastFailure: 0, openUntil: 0 },
  groq: { failures: 0, lastFailure: 0, openUntil: 0 },
  openrouter: { failures: 0, lastFailure: 0, openUntil: 0 },
}

// Khởi tạo bảng lưu trữ quota ngày vào SQLite nếu chưa có
function initQuotaTable() {
  try {
    const database = getDb()
    database.exec(`
      CREATE TABLE IF NOT EXISTS chat_daily_quota (
        date_key TEXT PRIMARY KEY,
        request_count INTEGER NOT NULL DEFAULT 0,
        token_count INTEGER NOT NULL DEFAULT 0
      );
    `)
  } catch (err) {
    console.warn('⚠️ [CHAT QUOTA TABLE WARNING]:', err.message)
  }
}

initQuotaTable()

/**
 * Lấy số lượng request đã sử dụng trong ngày hôm nay (Theo giờ Việt Nam UTC+7)
 */
export function getTodayRequestCount() {
  const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  try {
    const database = getDb()
    const row = database.prepare('SELECT request_count FROM chat_daily_quota WHERE date_key = ?').get(vnDate)
    return row ? row.request_count : 0
  } catch {
    return 0
  }
}

/**
 * Tăng bộ đếm request sử dụng trong ngày
 */
export function incrementTodayRequestCount(tokens = 0) {
  const vnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  try {
    const database = getDb()
    database.prepare(`
      INSERT INTO chat_daily_quota (date_key, request_count, token_count)
      VALUES (?, 1, ?)
      ON CONFLICT(date_key) DO UPDATE SET 
        request_count = request_count + 1,
        token_count = token_count + excluded.token_count
    `).run(vnDate, tokens)
  } catch (err) {
    console.warn('⚠️ [CHAT QUOTA INCR WARNING]:', err.message)
  }
}

/**
 * Kiểm tra xem circuit của provider có đang mở (bị ngắt tạm thời) hay không
 */
function isCircuitOpen(providerName) {
  const state = circuitState[providerName]
  if (!state) return false
  const now = Date.now()
  if (state.openUntil > now) {
    return true
  }
  if (state.openUntil > 0 && state.openUntil <= now) {
    // Thử đóng lại circuit (half-open)
    state.openUntil = 0
    state.failures = 0
  }
  return false
}

/**
 * Ghi nhận lỗi khi gọi provider để kích hoạt Circuit Breaker nếu cần
 */
function recordProviderFailure(providerName) {
  const state = circuitState[providerName]
  if (!state) return
  const now = Date.now()
  state.failures += 1
  state.lastFailure = now

  // Nếu gặp 2 lỗi liên tiếp trong vòng 5 phút -> mở mạch 120 giây (2 phút)
  if (state.failures >= 2) {
    state.openUntil = now + 120 * 1000
    console.warn(`⚡ [CIRCUIT BREAKER] Ngắt tạm thời Provider [${providerName}] trong 120 giây do lỗi liên tiếp!`)
  }
}

/**
 * Ghi nhận thành công -> reset circuit
 */
function recordProviderSuccess(providerName) {
  const state = circuitState[providerName]
  if (state) {
    state.failures = 0
    state.openUntil = 0
  }
}

/**
 * Gọi hàm sinh văn bản theo tên provider
 */
async function callProvider(providerName, { system, messages, maxTokens }) {
  if (providerName === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
    return await generateGemini({ apiKey, system, messages, maxTokens })
  }

  if (providerName === 'groq') {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY_NOT_CONFIGURED')
    return await generateGroq({ apiKey, system, messages, maxTokens })
  }

  if (providerName === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY_NOT_CONFIGURED')
    return await generateOpenRouter({ apiKey, system, messages, maxTokens })
  }

  throw new Error(`UNKNOWN_PROVIDER: ${providerName}`)
}

/**
 * Hàm điều phối chính (Provider Orchestrator)
 * Thực hiện: Cache -> Quota check -> Primary -> Fallback -> Tier 2
 */
export async function generateChatResponse({
  system,
  messages = [],
  userMessage = '',
  maxTokens = 350,
  cartSummary = null,
}) {
  const primaryProvider = process.env.CHAT_PROVIDER || 'gemini'
  const fallbackProvider = process.env.CHAT_FALLBACK_PROVIDER || 'groq'
  const dailyCap = parseInt(process.env.CHAT_DAILY_REQUEST_CAP || '1200', 10)

  // 1. Kiểm tra cache câu hỏi tương đồng
  const cacheKey = removeVietnameseTones(userMessage.trim())
  if (cacheKey && cacheKey.length >= 4 && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        text: cached.text,
        usedTier: 'tier-1-cache',
        provider: 'cache',
      }
    } else {
      responseCache.delete(cacheKey)
    }
  }

  // 1.5. Phản hồi tư vấn thông minh cục bộ nếu máy chủ chưa cấu hình API key LLM
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY)
  if (!hasKey) {
    const localAdvice = generateLocalAdvisorResponse(userMessage, { cartSummary })
    return {
      text: localAdvice.reply,
      quickReplies: localAdvice.quickReplies,
      product: localAdvice.product || null,
      handoff: localAdvice.handoff || null,
      usedTier: 'tier-0-smart-advisor',
      provider: 'local_advisor',
    }
  }

  // 2. Kiểm tra Daily Cap
  const currentDailyCount = getTodayRequestCount()
  if (currentDailyCount >= dailyCap) {
    console.warn(`🛑 [CHAT QUOTA REACHED] Đã chạm trần ngân sách ngày (${currentDailyCount}/${dailyCap}). Rơi về Local Smart Advisor.`)
    const localAdvice = generateLocalAdvisorResponse(userMessage, { cartSummary })
    return {
      text: localAdvice.reply,
      quickReplies: localAdvice.quickReplies,
      product: localAdvice.product || null,
      handoff: localAdvice.handoff || null,
      usedTier: 'tier-2-smart-advisor',
      provider: 'local_advisor',
    }
  }

  // 3. Thử Provider Chính (Primary)
  if (!isCircuitOpen(primaryProvider)) {
    try {
      const result = await callProvider(primaryProvider, { system, messages, maxTokens })
      recordProviderSuccess(primaryProvider)
      incrementTodayRequestCount(result.usage?.totalTokens || 0)

      // Lưu cache câu trả lời ngắn
      if (cacheKey && cacheKey.length >= 4 && result.text) {
        responseCache.set(cacheKey, { text: result.text, timestamp: Date.now() })
      }

      return {
        text: result.text,
        usedTier: 'tier-1',
        provider: result.provider,
        usage: result.usage,
      }
    } catch (err) {
      console.warn(`⚠️ [CHAT PRIMARY ERROR] Provider [${primaryProvider}] thất bại:`, err.message)
      recordProviderFailure(primaryProvider)
    }
  } else {
    console.warn(`⚡ [CIRCUIT OPEN] Bỏ qua [${primaryProvider}], chuyển thẳng sang Fallback [${fallbackProvider}].`)
  }

  // 4. Thử Provider Dự Phòng (Fallback)
  if (fallbackProvider && fallbackProvider !== primaryProvider && !isCircuitOpen(fallbackProvider)) {
    try {
      const result = await callProvider(fallbackProvider, { system, messages, maxTokens })
      recordProviderSuccess(fallbackProvider)
      incrementTodayRequestCount(result.usage?.totalTokens || 0)

      return {
        text: result.text,
        usedTier: 'tier-1-fallback',
        provider: result.provider,
        usage: result.usage,
      }
    } catch (err) {
      console.warn(`⚠️ [CHAT FALLBACK ERROR] Provider [${fallbackProvider}] thất bại:`, err.message)
      recordProviderFailure(fallbackProvider)
    }
  }

  // 5. TẦNG 2: Graceful Fallback khi cả 2 provider đều lỗi hoặc circuit open
  const localAdvice = generateLocalAdvisorResponse(userMessage, { cartSummary })
  return {
    text: localAdvice.reply,
    quickReplies: localAdvice.quickReplies,
    product: localAdvice.product || null,
    handoff: localAdvice.handoff || null,
    usedTier: 'tier-2-smart-advisor',
    provider: 'local_advisor',
  }
}
