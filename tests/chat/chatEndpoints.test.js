import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandoffRequest, isValidVnPhone } from '../../server/lib/chat/handoff.js'
import { getDb } from '../../server/lib/accountDb.js'
import { generateChatResponse, getTodayRequestCount } from '../../server/lib/chat/providerManager.js'

test('Handoff: Kiểm tra định dạng số điện thoại Việt Nam hợp lệ', () => {
  assert.equal(isValidVnPhone('0981753082'), true)
  assert.equal(isValidVnPhone('+84981753082'), true)
  assert.equal(isValidVnPhone('0398765432'), true)
  assert.equal(isValidVnPhone('0771234567'), true)

  // Không hợp lệ
  assert.equal(isValidVnPhone('12345'), false)
  assert.equal(isValidVnPhone('0123456789'), false) // Đầu 01 cũ
  assert.equal(isValidVnPhone('abc0981753082'), false)
  assert.equal(isValidVnPhone(''), false)
})

test('Handoff: Lưu trữ yêu cầu gọi lại vào SQLite thành công', async () => {
  const result = await createHandoffRequest({
    name: 'Chị Mai',
    phone: '0981753082',
    topic: 'Tư vấn may đo riêng',
    preferredTime: 'Sau 17h chiều',
    recentConversation: 'Khách hỏi có nhận may đo theo số đo không',
  })

  assert.equal(result.success, true)
  assert.ok(result.handoffId)

  const database = getDb()
  const row = database.prepare('SELECT * FROM chat_handoffs WHERE id = ?').get(result.handoffId)
  assert.ok(row, 'Bản ghi phải tồn tại trong SQLite')
  assert.equal(row.customer_name, 'Chị Mai')
  assert.equal(row.phone, '0981753082')
  assert.equal(row.status, 'pending')
})

test('Handoff: Từ chối lưu khi số điện thoại không hợp lệ', async () => {
  const result = await createHandoffRequest({
    name: 'Hacker',
    phone: '123456',
    topic: 'Spam test',
  })

  assert.equal(result.success, false)
  assert.match(result.error, /Số điện thoại không hợp lệ/i)
})

test('ProviderManager: Tự động chuyển về Smart Local Advisor trả lời tư vấn thực tế khi thiếu key mà không văng exception', async () => {
  // Tạm xóa key
  const prevGemini = process.env.GEMINI_API_KEY
  const prevGroq = process.env.GROQ_API_KEY
  process.env.GEMINI_API_KEY = ''
  process.env.GROQ_API_KEY = ''

  try {
    const res = await generateChatResponse({
      system: 'Test system',
      messages: [{ role: 'user', content: 'Tư vấn cho tôi một bộ đi' }],
      userMessage: 'Tư vấn cho tôi một bộ đi',
    })

    assert.equal(res.usedTier, 'tier-0-smart-advisor')
    assert.equal(res.provider, 'local_advisor')
    assert.equal(res.handoff, null, 'Không được ép handoff khi khách chỉ hỏi tư vấn')
    assert.ok(res.text.includes('THE DAYBREAK SET') || res.text.includes('QuanNguyenS'), 'Phải trả lời tư vấn sản phẩm thực tế')
  } finally {
    process.env.GEMINI_API_KEY = prevGemini
    process.env.GROQ_API_KEY = prevGroq
  }
})
