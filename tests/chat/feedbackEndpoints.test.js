import test from 'node:test'
import assert from 'node:assert/strict'
import { createFeedbackSubmission } from '../../server/lib/chat/feedback.js'
import { getDb } from '../../server/lib/accountDb.js'

test('Feedback: Tiếp nhận đóng góp ý kiến hợp lệ và lưu vào SQLite', async () => {
  const result = await createFeedbackSubmission({
    feedbackType: 'suggestion',
    name: 'Chị Mai Lan',
    phone: '0973 486 218',
    email: 'mailan@example.com',
    content: 'Shop nên có thêm màu hồng pastel cho The Stillwater Set nhé!',
  })

  assert.equal(result.success, true)
  assert.ok(result.feedbackId)
  assert.match(result.message, /chân thành cảm ơn/i)

  const database = getDb()
  const row = database.prepare('SELECT * FROM customer_feedbacks WHERE id = ?').get(result.feedbackId)
  assert.ok(row, 'Bản ghi đóng góp ý kiến phải tồn tại trong SQLite')
  assert.equal(row.feedback_type, 'suggestion')
  assert.equal(row.customer_name, 'Chị Mai Lan')
  assert.equal(row.phone, '0973486218')
  assert.equal(row.status, 'pending')
  assert.ok(row.content.includes('hồng pastel'))
})

test('Feedback: Tiếp nhận phàn nàn / khiếu nại kèm mã đơn hàng', async () => {
  const result = await createFeedbackSubmission({
    feedbackType: 'complaint',
    name: 'Anh Tuấn',
    phone: '0981753082',
    orderId: 'QNS-123456',
    content: 'Đơn hàng giao trễ 1 ngày so với hẹn, mong shop kiểm tra giúp!',
  })

  assert.equal(result.success, true)
  assert.match(result.message, /khiếu nại/i)

  const database = getDb()
  const row = database.prepare('SELECT * FROM customer_feedbacks WHERE id = ?').get(result.feedbackId)
  assert.ok(row)
  assert.equal(row.feedback_type, 'complaint')
  assert.equal(row.order_id, 'QNS-123456')
})

test('Feedback: Tiếp nhận yêu cầu đặc biệt (đặt size / may đo riêng)', async () => {
  const result = await createFeedbackSubmission({
    feedbackType: 'request',
    name: 'Chị Hoàng Yến',
    phone: '0901234567',
    content: 'Mình muốn đặt may The Hearth Set theo số đo riêng và kèm hộp quà tặng cao cấp.',
  })

  assert.equal(result.success, true)
  assert.match(result.message, /yêu cầu đặc biệt/i)

  const database = getDb()
  const row = database.prepare('SELECT * FROM customer_feedbacks WHERE id = ?').get(result.feedbackId)
  assert.ok(row)
  assert.equal(row.feedback_type, 'request')
})

test('Feedback: Từ chối lưu khi số điện thoại không hợp lệ', async () => {
  const result = await createFeedbackSubmission({
    feedbackType: 'suggestion',
    name: 'Khách lạ',
    phone: '012345678901234',
    content: 'Nội dung test',
  })

  assert.equal(result.success, false)
  assert.match(result.error, /Số điện thoại không hợp lệ/i)
})

test('Feedback: Từ chối lưu khi nội dung quá ngắn (< 5 ký tự)', async () => {
  const result = await createFeedbackSubmission({
    feedbackType: 'suggestion',
    name: 'Khách lạ',
    phone: '0973486218',
    content: 'abc',
  })

  assert.equal(result.success, false)
  assert.match(result.error, /tối thiểu 5 ký tự/i)
})

