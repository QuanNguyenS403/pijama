import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'http'
import { registerReviewEndpoints } from '../server/lib/reviewEndpoints.js'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { generateTrackingToken } from '../server/lib/orderTokenService.js'
import {
  initReviewSchema,
  createReview,
  getApprovedReviewsByProduct,
  getReviewById,
  hasReviewedItem,
  formatDisplayName,
  sanitizeReviewBody,
} from '../server/lib/reviewDb.js'
import { isEmailSuppressed, sendReviewInviteEmail } from '../server/lib/emailReviewInvite.js'
import { unsubscribeAccount, getDb, getOrderFromDb } from '../server/lib/accountDb.js'

test('Reviews System: Unit helpers & sanitization', () => {
  // Test formatDisplayName (Bảo vệ quyền riêng tư)
  assert.equal(formatDisplayName('Nguyễn Thị Thùy Trang'), 'Thị Thùy Trang N.')
  assert.equal(formatDisplayName('Trần Văn Bình'), 'Văn Bình T.')
  assert.equal(formatDisplayName('Khánh Linh D.'), 'Khánh Linh D.')
  assert.equal(formatDisplayName('Trang'), 'Trang')
  assert.equal(formatDisplayName(''), 'Khách hàng')

  // Test sanitizeReviewBody (Chống XSS / HTML Injection)
  const malicious = '<script>alert("hack")</script><b>Đẹp</b>'
  const clean = sanitizeReviewBody(malicious)
  assert.equal(clean.includes('<script>'), false)
  assert.equal(clean.includes('&lt;script&gt;'), true)
  assert.equal(clean.includes('<b>'), false)
  assert.equal(clean.includes('&lt;b&gt;'), true)
})

test('Reviews System: Toàn bộ quy trình Đánh Giá Thật Tự Động Phê Duyệt & Chặn Sai Sản Phẩm', async () => {
  const app = express()
  app.use(express.json())
  registerReviewEndpoints(app)

  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    const database = getDb()
    initReviewSchema(database)

    // 1. TEST: 24 đánh giá ban đầu đã được nạp tự động vào cơ sở dữ liệu
    const initialReviews = getApprovedReviewsByProduct('the-classic-set', {}, database)
    assert.ok(initialReviews.reviews.length >= 8, 'Phải có ít nhất 8 đánh giá ban đầu cho THE DAYBREAK SET')
    assert.equal(initialReviews.summary.totalReviews >= 8, true)
    assert.ok(initialReviews.summary.averageRating >= 4.5)

    // 2. TEST: Đơn hàng được ghi nhận đồng bộ vào Database SQLite (orders table)
    const testOrderId = `QNS-REV-ORDER-${Date.now()}`
    const testPhone = '0981753082'
    const testOrder = {
      orderId: testOrderId,
      status: 'CONFIRMED', // Mua hàng thành công
      customer: {
        fullName: 'Lê Thị Thu Trang',
        phone: testPhone,
        email: 'test_review@quannguyens.com',
      },
      items: [
        {
          productId: 'the-classic-set',
          productName: 'THE DAYBREAK SET',
          size: 'S',
          unitPrice: 390000,
          quantity: 1,
        },
      ],
      total: 420000,
    }
    orderPersistence.set(testOrderId, testOrder)

    // Kiểm tra đơn hàng đã được ghi nhận vào SQLite orders table
    const orderInDb = getOrderFromDb(testOrderId, database)
    assert.ok(orderInDb, 'Đơn hàng phải được lưu trữ trong SQLite orders table')
    assert.equal(orderInDb.orderId, testOrderId)
    assert.equal(orderInDb.customer.phone, testPhone)

    const validToken = generateTrackingToken(testOrderId, testPhone)

    // 3. TEST: Chặn không được review sai sản phẩm (mua the-classic-set nhưng gửi review the-cafe-look)
    const resWrongProduct = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-cafe-look', // Sai sản phẩm!
        orderId: testOrderId,
        phone: testPhone,
        rating: 5,
        displayName: 'Lê Thị Thu Trang',
        body: 'Bộ caro navy này mặc rất êm ái thoáng mát.',
      }),
    })
    assert.equal(resWrongProduct.status, 400, 'Review sai sản phẩm phải bị chặn với mã 400')
    const dataWrongProduct = await resWrongProduct.json()
    assert.equal(dataWrongProduct.success, false)
    assert.match(dataWrongProduct.error, /không chứa sản phẩm/i)

    // 4. TEST: Chặn đơn hàng đã bị hủy (CANCELLED)
    const cancelledOrderId = `QNS-REV-CANCEL-${Date.now()}`
    orderPersistence.set(cancelledOrderId, {
      ...testOrder,
      orderId: cancelledOrderId,
      status: 'CANCELLED',
    })
    const resCancelled = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: cancelledOrderId,
        phone: testPhone,
        rating: 5,
        displayName: 'Lê Thị Thu Trang',
        body: 'Đơn hàng đã hủy cố tình gửi đánh giá.',
      }),
    })
    assert.equal(resCancelled.status, 400, 'Đơn hàng đã hủy phải bị từ chối đánh giá')

    // 5. TEST: Gửi đánh giá THÀNH CÔNG cho đúng sản phẩm đã mua -> TỰ ĐỘNG PHÊ DUYỆT (approved) ngay lập tức!
    const countBefore = getApprovedReviewsByProduct('the-classic-set', {}, database).summary.totalReviews

    const resSuccess = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderId,
        phone: testPhone,
        token: validToken,
        rating: 5,
        displayName: 'Lê Thị Thu Trang',
        body: 'Vải Cotton-Modal mềm mại thoáng mát, ve cổ notch may rất đẹp và phẳng phiu.',
      }),
    })
    assert.equal(resSuccess.status, 201, 'Gửi đánh giá hợp lệ phải trả về 201 Created')
    const dataSuccess = await resSuccess.json()
    assert.equal(dataSuccess.success, true)
    assert.ok(dataSuccess.reviewId)

    // Kiểm tra trong DB: review mới có status = 'approved' ngay lập tức (không cần admin duyệt)
    const createdReview = getReviewById(dataSuccess.reviewId, database)
    assert.ok(createdReview)
    assert.equal(createdReview.status, 'approved', 'Review phải được tự động approved ngay lập tức')

    // 6. TEST: Review mới xuất hiện ngay lập tức trong API PDP
    const reviewsAfter = getApprovedReviewsByProduct('the-classic-set', {}, database)
    assert.equal(reviewsAfter.summary.totalReviews, countBefore + 1)
    const foundNew = reviewsAfter.reviews.find((r) => r.id === dataSuccess.reviewId)
    assert.ok(foundNew, 'Review mới tạo phải hiển thị ngay lập tức trong danh sách đánh giá của sản phẩm')

    // 7. TEST: Chống gửi trùng lặp (1 đánh giá / mặt hàng / đơn)
    const resDuplicate = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderId,
        phone: testPhone,
        rating: 4,
        displayName: 'Lê Thị Thu Trang',
        body: 'Gửi lần thứ 2 cố tình spam.',
      }),
    })
    assert.equal(resDuplicate.status, 409, 'Gửi trùng phải trả về 409 Conflict')

    // 8. TEST: Email mời đánh giá tôn trọng Unsubscribe
    const unsubEmail = 'unsub_test@quannguyens.com'
    unsubscribeAccount(unsubEmail)
    assert.equal(isEmailSuppressed(unsubEmail, database), true)

    const unsubOrder = {
      orderId: `QNS-UNSUB-${Date.now()}`,
      status: 'DELIVERED',
      customer: { email: unsubEmail, fullName: 'Khách Đã Unsub' },
      items: [{ productId: 'the-classic-set', name: 'THE DAYBREAK SET' }],
    }
    const sendResult = await sendReviewInviteEmail(unsubOrder)
    assert.equal(sendResult.success, false)
    assert.equal(sendResult.reason, 'unsubscribed')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
