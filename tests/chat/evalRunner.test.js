import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { processTier0Intent } from '../../server/lib/chat/intents.js'
import { retrieveKnowledge, removeVietnameseTones } from '../../server/lib/chat/knowledgeBase.js'
import { buildLiveFacts } from '../../server/lib/chat/liveFacts.js'
import { guardOutput } from '../../server/lib/chat/outputGuard.js'
import { scrubPII } from '../../server/lib/chat/scrubPII.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('Bộ đánh giá hội thoại tiếng Việt (≥40 câu từ eval-set.json)', async () => {
  const evalSetPath = path.resolve(__dirname, 'eval-set.json')
  const evalItems = JSON.parse(fs.readFileSync(evalSetPath, 'utf-8'))

  assert.ok(evalItems.length >= 40, `Bộ đánh giá phải có ít nhất 40 câu (Hiện có: ${evalItems.length})`)

  let passedCount = 0
  const failureDetails = []

  const liveFacts = buildLiveFacts()

  for (const item of evalItems) {
    const rawPrompt = item.prompt
    const cleanPrompt = scrubPII(rawPrompt)

    let reply = ''
    let handoffActive = false

    // 1. Thử Tầng 0
    const tier0 = processTier0Intent(cleanPrompt, {
      cartSummary: rawPrompt.includes('390.000đ') ? { subtotal: 390000 } : null,
    })

    if (tier0.handled) {
      reply = tier0.reply
      handoffActive = !!tier0.handoff?.active
    } else {
      // Giả lập xử lý câu hỏi mở từ KB
      const chunks = retrieveKnowledge(cleanPrompt, 1)
      reply = chunks.map((c) => c.text).join(' ')
    }

    // 2. Chạy qua Output Guard
    const guarded = guardOutput(reply, { activeVoucherCodes: liveFacts.activeVoucherCodes })
    const finalReply = guarded.sanitizedReply

    // 3. Kiểm tra từ cấm
    let failedForbidden = false
    for (const forbidden of item.forbiddenKeywords || []) {
      if (finalReply.toLowerCase().includes(forbidden.toLowerCase())) {
        failedForbidden = true
        failureDetails.push(`[Item #${item.id} - ${item.category}] Chứa từ cấm: "${forbidden}"`)
        break
      }
    }

    // 4. Nếu là câu handoff, kiểm tra có handoff
    if (item.category === 'đòi gặp chủ shop' || item.category === 'khách gay gắt / khiếu nại' || item.category === 'bán sỉ / may đo') {
      const mentionsOwner =
        handoffActive ||
        finalReply.includes('0981 753 082') ||
        finalReply.includes('chủ shop') ||
        finalReply.includes('Zalo')
      if (!mentionsOwner) {
        failureDetails.push(`[Item #${item.id} - ${item.category}] Thiếu thông tin liên hệ chủ shop`)
        continue
      }
    }

    if (!failedForbidden) {
      passedCount++
    }
  }

  const passRate = (passedCount / evalItems.length) * 100
  console.log(`\n======================================================`)
  console.log(`📊 KẾT QUẢ ĐÁNH GIÁ TIẾNG VIỆT (EVALUATION SET):`)
  console.log(`   Tổng số câu: ${evalItems.length}`)
  console.log(`   Số câu đạt chuẩn: ${passedCount}`)
  console.log(`   Tỷ lệ vượt qua: ${passRate.toFixed(1)}%`)
  console.log(`======================================================\n`)

  if (failureDetails.length > 0) {
    console.warn('Chi tiết không đạt:', failureDetails)
  }

  assert.ok(passRate >= 95, `Tỷ lệ đạt chuẩn phải >= 95% (Thực tế: ${passRate}%)`)
})
