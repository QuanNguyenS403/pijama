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
  moderateReview,
  replyToReview,
  hasReviewedItem,
  formatDisplayName,
  sanitizeReviewBody,
} from '../server/lib/reviewDb.js'
import { isEmailSuppressed, sendReviewInviteEmail } from '../server/lib/emailReviewInvite.js'
import { unsubscribeAccount, getDb } from '../server/lib/accountDb.js'

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

test('Reviews System: Toàn bộ quy trình kiểm thử API Đánh Giá Thật', async () => {
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

    // Tạo đơn hàng thử nghiệm #1: Đang PENDING (chưa giao)
    const testOrderIdPending = `QNS-REV-PENDING-${Date.now()}`
    const testPhone = '0981753082'
    const pendingOrder = {
      orderId: testOrderIdPending,
      status: 'PENDING',
      customer: {
        fullName: 'Nguyễn Văn Test',
        phone: testPhone,
        email: 'test_pending@quannguyens.com',
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
    orderPersistence.set(testOrderIdPending, pendingOrder)

    // Tạo đơn hàng thử nghiệm #2: DELIVERED (đã giao thành công)
    const testOrderIdDelivered = `QNS-REV-DELIVERED-${Date.now()}`
    const deliveredOrder = {
      orderId: testOrderIdDelivered,
      status: 'DELIVERED',
      customer: {
        fullName: 'Lê Thị Thu Trang',
        phone: testPhone,
        email: 'test_delivered@quannguyens.com',
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
    orderPersistence.set(testOrderIdDelivered, deliveredOrder)

    const validToken = generateTrackingToken(testOrderIdDelivered, testPhone)

    // 1. TEST: Từ chối đánh giá khi đơn hàng chưa DELIVERED (đang PENDING)
    const resPending = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderIdPending,
        phone: testPhone,
        rating: 5,
        displayName: 'Nguyễn Văn Test',
        body: 'Bộ này mặc rất thích và êm ái thoải mái.',
      }),
    })
    assert.equal(resPending.status, 400, 'Đơn chưa DELIVERED phải trả về 400 Bad Request')
    const dataPending = await resPending.json()
    assert.equal(dataPending.success, false)
    assert.match(dataPending.error, /DELIVERED/i)

    // 2. TEST: Từ chối đánh giá khi sai số điện thoại / token
    const resWrongAuth = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderIdDelivered,
        phone: '0900000000', // Sai SĐT
        rating: 5,
        displayName: 'Kẻ Giả Mạo',
        body: 'Nội dung đánh giá cố tình gửi không hợp lệ.',
      }),
    })
    assert.equal(resWrongAuth.status, 401, 'Sai thông tin xác thực phải trả về 401 Unauthorized')

    // 3. TEST: Gửi đánh giá THÀNH CÔNG với đơn hàng DELIVERED
    const resSuccess = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderIdDelivered,
        phone: testPhone,
        token: validToken,
        rating: 5,
        displayName: 'Lê Thị Thu Trang',
        body: 'Vải modal cực kỳ mềm rũ, đường may ve cổ notch tỉ mỉ không có chỉ thừa. Rất ưng ý!',
        // Cố tình gửi verifiedPurchase: false hoặc status: 'approved' để kiểm tra bảo vệ
        verifiedPurchase: false,
        status: 'approved',
      }),
    })
    assert.equal(resSuccess.status, 201, 'Gửi đánh giá hợp lệ phải trả về 201 Created')
    const dataSuccess = await resSuccess.json()
    assert.equal(dataSuccess.success, true)
    assert.ok(dataSuccess.reviewId)

    // Kiểm tra trong DB: Server tự đặt verified_purchase = 1 và status = 'pending'
    const createdReview = getReviewById(dataSuccess.reviewId, database)
    assert.ok(createdReview)
    assert.equal(createdReview.verified_purchase, true, 'Server phải tự xác nhận verified_purchase = true')
    assert.equal(createdReview.status, 'pending', 'Đánh giá mới tạo phải ở trạng thái pending chờ duyệt')
    assert.equal(createdReview.display_name, 'Thị Thu Trang L.')

    // 4. TEST: Chống gửi trùng lặp (Một đánh giá / mặt hàng / đơn)
    const resDuplicate = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'the-classic-set',
        orderId: testOrderIdDelivered,
        phone: testPhone,
        rating: 4,
        displayName: 'Lê Thị Thu Trang',
        body: 'Gửi lần thứ hai cố tình tạo spam đánh giá.',
      }),
    })
    assert.equal(resDuplicate.status, 409, 'Gửi trùng mặt hàng trong cùng đơn phải trả về 409 Conflict')

    // 5. TEST: GET /api/products/:id/reviews CHỈ TRẢ VỀ REVIEW ĐÃ DUYỆT (approved)
    const resGetBeforeApprove = await fetch(`${baseUrl}/api/products/the-classic-set/reviews`)
    assert.equal(resGetBeforeApprove.status, 200)
    const dataBeforeApprove = await resGetBeforeApprove.json()
    assert.equal(
      dataBeforeApprove.data.reviews.some((r) => r.id === dataSuccess.reviewId),
      false,
      'Review pending không được hiển thị ra ngoài PDP'
    )

    // Admin phê duyệt review
    moderateReview(dataSuccess.reviewId, { status: 'approved' }, database)

    // Lấy lại sau khi duyệt
    const resGetAfterApprove = await fetch(`${baseUrl}/api/products/the-classic-set/reviews`)
    const dataAfterApprove = await resGetAfterApprove.json()
    assert.equal(dataAfterApprove.success, true)
    const approvedItem = dataAfterApprove.data.reviews.find((r) => r.id === dataSuccess.reviewId)
    assert.ok(approvedItem, 'Review đã duyệt phải xuất hiện trong API PDP')
    assert.equal(approvedItem.verifiedPurchase, true)
    assert.equal(dataAfterApprove.data.summary.totalReviews >= 1, true)

    // 6. TEST: Admin endpoint từ chối khi không có token (401)
    const resAdminNoAuth = await fetch(`${baseUrl}/api/admin/reviews`)
    assert.equal(resAdminNoAuth.status, 401, 'Admin endpoint không có token phải trả về 401')

    // 7. TEST: Email mời đánh giá tôn trọng Unsubscribe
    const unsubEmail = 'unsub_test@quannguyens.com'
    unsubscribeAccount(unsubEmail)
    assert.equal(isEmailSuppressed(unsubEmail, database), true, 'Email đã hủy phải được nhận diện suppressed')

    const unsubOrder = {
      orderId: `QNS-UNSUB-${Date.now()}`,
      status: 'DELIVERED',
      customer: { email: unsubEmail, fullName: 'Khách Đã Unsub' },
      items: [{ productId: 'the-classic-set', name: 'THE DAYBREAK SET' }],
    }
    const sendResult = await sendReviewInviteEmail(unsubOrder)
    assert.equal(sendResult.success, false)
    assert.equal(sendResult.reason, 'unsubscribed', 'Không được gửi email mời cho người đã hủy đăng ký')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
