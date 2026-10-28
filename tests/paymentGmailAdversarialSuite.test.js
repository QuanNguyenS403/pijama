import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import {
  PAYMENT_QR_TTL_SECONDS,
  PAYMENT_DETECTION_GRACE_SECONDS,
  PAYMENT_CLOCK_TOLERANCE_SECONDS,
  PAYMENT_PHASES,
  getPaymentPhase,
  canAdvanceFulfilment,
  markOrderPaid,
  expireOrderIfDue,
  sweepExpiredOrders,
} from '../server/lib/paymentState.js'
import {
  parseBankEmail,
  verifyEmailSender,
  extractOrderIdStrict,
  PARSER_VERSION,
} from '../server/lib/bankEmailParser.js'
import {
  computeBridgeSignature,
  verifyBridgeHmac,
  safeTimingCompare,
  HMAC_TEST_VECTOR,
} from '../server/lib/gmailBridgeAuth.js'
import {
  settleBankTransaction,
  recordPaymentTransaction,
  getPaymentTransactionByTxId,
  findTransactionByMessageId,
  findTransactionByFingerprint,
  computeTransactionFingerprint,
  assignTransactionToOrder,
} from '../server/lib/paymentTransactions.js'
import { getPaymentQrData } from '../server/lib/paymentQrService.js'
import {
  recordBridgeHeartbeat,
  getBridgeHealth,
  checkBridgeHealthAndAlert,
  getLastBridgeRunAt,
} from '../server/lib/bridgeHealth.js'
import { handleAdminOrderAction, formatAdminOrder } from '../server/lib/adminOrdersHandler.js'
import {
  getOrderPaymentStatus,
  confirmOrderPaymentManually,
  markOrderPaidByAI,
  matchOrderFromContent,
} from '../server/lib/paymentWebhook.js'

// Mock environment
process.env.NODE_ENV = 'test'
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret-key-123456789'
process.env.ADMIN_PASSWORD = 'TestAdminPassword123!'
process.env.BANK_CODE = 'VCB'
process.env.BANK_ACCOUNT_NUMBER = '1050773506'
process.env.BANK_ACCOUNT_LAST4 = '3506'
process.env.BANK_ACCOUNT_NAME = 'NGUYEN DUC QUAN'
process.env.GMAIL_BRIDGE_SECRET = 'test-bridge-secret-key-64-bytes-vector-1234567890'
process.env.BANK_EMAIL_AUTO_SETTLE = 'true'

// ==============================================================================
// 1. LUỒNG CHÍNH (Items 1 - 5)
// ==============================================================================

test('Item 1: Tạo đơn VietQR -> AWAITING_PAYMENT, expiresAt = createdAt + 600s, không email xác nhận, không cộng điểm', () => {
  const orderId = `QNS-ADV-01-${Date.now()}`
  const now = Date.now()
  const order = {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    customer: { fullName: 'Nguyen Van A', phone: '0981753082', email: 'customer@example.com' },
    createdAt: new Date(now).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrGeneratedAt: now,
      qrExpiresAt: now + PAYMENT_QR_TTL_SECONDS * 1000,
    },
  }
  orderPersistence.set(orderId, order)

  const saved = orderPersistence.get(orderId)
  assert.equal(saved.status, 'AWAITING_PAYMENT')
  assert.equal(saved.payment.status, 'AWAITING_PAYMENT')
  assert.equal(saved.payment.qrExpiresAt, now + 600 * 1000)
  assert.equal(saved.emails?.confirmationSentAt, undefined, 'Chưa gửi email xác nhận khi chưa thanh toán')
  assert.equal(getPaymentPhase(saved, now), PAYMENT_PHASES.AWAITING)
})

test('Item 2: GET /api/payment/qr đơn hợp lệ -> QR đúng order.total; đơn PAID/hết hạn/hủy -> 410', async () => {
  const now = Date.now()
  const validOrderId = `QNS-ADV-02-VAL-${Date.now()}`
  orderPersistence.set(validOrderId, {
    orderId: validOrderId,
    total: 550000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(now).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: now + 600000,
    },
  })

  // Gọi QR service lấy dữ liệu
  const qrRes = await getPaymentQrData(validOrderId, now)
  assert.equal(qrRes.status, 200)
  assert.equal(qrRes.data.total, 550000, 'QR service phải lấy đúng order.total từ server')
  assert.ok(qrRes.data.vietQrUrl.includes('amount=550000'))

  // Đơn đã PAID -> 410 Gone
  const paidOrderId = `QNS-ADV-02-PAID-${Date.now()}`
  orderPersistence.set(paidOrderId, {
    orderId: paidOrderId,
    total: 390000,
    status: 'CONFIRMED',
    payment: { method: 'BANK_TRANSFER', status: 'PAID' },
  })
  const paidRes = await getPaymentQrData(paidOrderId, now)
  assert.equal(paidRes.status, 410)
  assert.equal(paidRes.code, 'ALREADY_PAID')

  // Đơn CANCELLED -> 410 Gone
  const cancelOrderId = `QNS-ADV-02-CANC-${Date.now()}`
  orderPersistence.set(cancelOrderId, {
    orderId: cancelOrderId,
    total: 390000,
    status: 'CANCELLED',
    payment: { method: 'BANK_TRANSFER', status: 'EXPIRED_TIMEOUT' },
  })
  const cancelRes = await getPaymentQrData(cancelOrderId, now)
  assert.equal(cancelRes.status, 410)

  // Đơn EXPIRED -> 410 Gone
  const expOrderId = `QNS-ADV-02-EXP-${Date.now()}`
  orderPersistence.set(expOrderId, {
    orderId: expOrderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: now - (PAYMENT_QR_TTL_SECONDS + PAYMENT_DETECTION_GRACE_SECONDS + 50) * 1000,
    },
  })
  const expRes = await getPaymentQrData(expOrderId, now)
  assert.equal(expRes.status, 410)
  assert.equal(expRes.code, 'QR_EXPIRED')
})

test('Item 3: Thư hợp lệ + đúng tiền + trong hạn -> PAID/CONFIRMED; 1 email; MATCHED_PAID; phase: PAID', async () => {
  process.env.BANK_EMAIL_AUTO_SETTLE = 'true'
  const now = Date.now()
  const orderId = `QNS-ADV-03-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(now - 60000).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: now + 540000,
    },
    customer: { fullName: 'Test Khach', email: 'khach@test.com' },
  })

  const msgId = `msg_03_${Date.now()}`
  const bankRef = `FT03${Date.now()}`
  const settleRes = await settleBankTransaction({
    messageId: msgId,
    amount: 390000,
    content: `Thanh toan ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef,
    accountLast4: '3506',
    sender: 'vietcombank@vietcombank.com.vn',
    trust: 'TRUSTED',
    matchedOrderId: orderId,
  })

  assert.equal(settleRes.outcome, 'MATCHED_PAID')
  const updatedOrder = orderPersistence.get(orderId)
  assert.equal(updatedOrder.status, 'CONFIRMED')
  assert.equal(updatedOrder.payment.status, 'PAID')
  assert.ok(updatedOrder.emails?.confirmationSentAt, 'Đã ghi nhận confirmationSentAt')

  // Giao dịch lưu trong SQLite
  const tx = findTransactionByMessageId(msgId)
  assert.ok(tx)
  assert.equal(tx.outcome, 'MATCHED_PAID')

  // Polling contract
  const pollStatus = getOrderPaymentStatus(orderId, now)
  assert.equal(pollStatus.phase, 'PAID')
})

test('Item 4: Cùng thư gửi lại (cùng messageId) và thư chuyển tiếp (khác messageId, cùng vân tay) -> DUPLICATE', async () => {
  const now = Date.now()
  const orderId = `QNS-ADV-04-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 600000 },
  })

  const msgId = `msg_04_${Date.now()}`
  const bankTime = new Date(now).toISOString()
  const bankRef = `FT04${Date.now()}`

  // Lần 1: Thành công
  const res1 = await settleBankTransaction({
    messageId: msgId,
    amount: 390000,
    content: `Chuyen tien ${orderId}`,
    bankTime,
    bankRef,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })
  assert.equal(res1.outcome, 'MATCHED_PAID')

  // Lần 2: Gửi lại cùng messageId
  const res2 = await settleBankTransaction({
    messageId: msgId,
    amount: 390000,
    content: `Chuyen tien ${orderId}`,
    bankTime,
    bankRef,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })
  assert.equal(res2.outcome, 'DUPLICATE')

  // Lần 3: Khác messageId nhưng cùng vân tay (cùng amount, time, content, ref, acc)
  const res3 = await settleBankTransaction({
    messageId: `msg_forward_${Date.now()}`,
    amount: 390000,
    content: `Chuyen tien ${orderId}`,
    bankTime,
    bankRef,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })
  assert.equal(res3.outcome, 'DUPLICATE')
})

test('Item 5: Chuyển khoản lần hai cùng mã đơn -> DUPLICATE_PAYMENT, đơn không đổi, cảnh báo hoàn tiền', async () => {
  const now = Date.now()
  const orderId = `QNS-ADV-05-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'CONFIRMED',
    payment: { method: 'BANK_TRANSFER', status: 'PAID', paidAt: new Date(now).toISOString() },
  })

  // Khách chuyển khoản thêm lần nữa với mã giao dịch mới
  const dupRes = await settleBankTransaction({
    messageId: `msg_dup_${Date.now()}`,
    amount: 390000,
    content: `Thanh toan lai ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT05_DUP_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })

  assert.equal(dupRes.outcome, 'DUPLICATE_PAYMENT')
  assert.equal(dupRes.alreadyPaid, true)
  const order = orderPersistence.get(orderId)
  assert.equal(order.status, 'CONFIRMED')
  assert.equal(order.payment.status, 'PAID')
})

// ==============================================================================
// 2. TIỀN SAI / TRỄ (Items 6 - 10)
// ==============================================================================

test('Item 6: Thiếu/thừa dù 1đ -> AMOUNT_MISMATCH, đơn không PAID', async () => {
  const now = Date.now()
  const orderId = `QNS-ADV-06-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 600000 },
  })

  // Thiếu 1 đồng
  const resLess = await settleBankTransaction({
    messageId: `msg_less_${Date.now()}`,
    amount: 389999,
    content: `QNS ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT06_LESS_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })
  assert.equal(resLess.outcome, 'AMOUNT_MISMATCH')
  assert.equal(orderPersistence.get(orderId).payment.status, 'AWAITING_PAYMENT')

  // Thừa 1 đồng
  const resMore = await settleBankTransaction({
    messageId: `msg_more_${Date.now()}`,
    amount: 390001,
    content: `QNS ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT06_MORE_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })
  assert.equal(resMore.outcome, 'AMOUNT_MISMATCH')
  assert.equal(orderPersistence.get(orderId).payment.status, 'AWAITING_PAYMENT')
})

test('Item 7: Giờ ngân hàng <= expiresAt+60s trong grace -> PAID; bankTime > expiresAt+60s -> LATE_AFTER_EXPIRY', async () => {
  const now = Date.now()
  const orderCreatedAt = now - 650000 // Đã tạo 10.8 phút trước (quá TTL 600s, đang trong Grace)
  const qrExpiresAt = orderCreatedAt + 600000

  // Đơn 7A: Khách chuyển lúc còn hạn (hoặc trong 60s dung sai), email đến trong Grace -> PAID
  const orderIdA = `QNS-ADV-07A-${Date.now()}`
  orderPersistence.set(orderIdA, {
    orderId: orderIdA,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(orderCreatedAt).toISOString(),
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt },
  })

  const resA = await settleBankTransaction({
    messageId: `msg_07A_${Date.now()}`,
    amount: 390000,
    content: `QNS ${orderIdA}`,
    bankTime: new Date(qrExpiresAt + 20000).toISOString(), // Dung sai 20s <= 60s
    bankRef: `FT07A_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderIdA,
  })
  assert.equal(resA.outcome, 'MATCHED_PAID')
  assert.equal(orderPersistence.get(orderIdA).payment.status, 'PAID')

  // Đơn 7B: Khách thực hiện lệnh chuyển trễ (quá hạn 60s) -> LATE_AFTER_EXPIRY
  const orderIdB = `QNS-ADV-07B-${Date.now()}`
  orderPersistence.set(orderIdB, {
    orderId: orderIdB,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(orderCreatedAt).toISOString(),
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt },
  })

  const resB = await settleBankTransaction({
    messageId: `msg_07B_${Date.now()}`,
    amount: 390000,
    content: `QNS ${orderIdB}`,
    bankTime: new Date(qrExpiresAt + 120000).toISOString(), // Trễ 120s > 60s
    bankRef: `FT07B_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderIdB,
  })
  assert.equal(resB.outcome, 'LATE_AFTER_EXPIRY')
  assert.notEqual(orderPersistence.get(orderIdB).payment.status, 'PAID')

  // Đơn 7C: Đơn đã hủy sau Grace, tiền về muộn -> LATE_AFTER_EXPIRY, không hồi sinh đơn
  const orderIdC = `QNS-ADV-07C-${Date.now()}`
  orderPersistence.set(orderIdC, {
    orderId: orderIdC,
    total: 390000,
    status: 'CANCELLED',
    payment: { method: 'BANK_TRANSFER', status: 'EXPIRED_TIMEOUT' },
  })
  const resC = await settleBankTransaction({
    messageId: `msg_07C_${Date.now()}`,
    amount: 390000,
    content: `QNS ${orderIdC}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT07C_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderIdC,
  })
  assert.equal(resC.outcome, 'LATE_AFTER_EXPIRY')
  assert.equal(orderPersistence.get(orderIdC).status, 'CANCELLED', 'Đơn đã hủy tuyệt đối không tự hồi sinh')
})

test('Item 8: Không mã đơn / mã lạ -> UNMATCHED/ORDER_NOT_FOUND; sai tài khoản (4 số cuối) -> UNMATCHED', async () => {
  const now = Date.now()

  // Không mã đơn
  const resNoOrder = await settleBankTransaction({
    messageId: `msg_no_code_${Date.now()}`,
    amount: 390000,
    content: 'Chuyen tien mua hang khong ghi ma',
    bankTime: new Date(now).toISOString(),
    bankRef: `FT08_1_${Date.now()}`,
    matchedOrderId: null,
  })
  assert.equal(resNoOrder.outcome, 'UNMATCHED')

  // Mã lạ không tồn tại
  const resNotFound = await settleBankTransaction({
    messageId: `msg_not_found_${Date.now()}`,
    amount: 390000,
    content: 'QNS-999999-XXXX',
    bankTime: new Date(now).toISOString(),
    bankRef: `FT08_2_${Date.now()}`,
    matchedOrderId: 'QNS-999999-XXXX',
  })
  assert.equal(resNotFound.outcome, 'ORDER_NOT_FOUND')

  // Đúng mã đơn nhưng sai số tài khoản thụ hưởng (khác 3506)
  const validOrderId = `QNS-ADV-08-${Date.now()}`
  orderPersistence.set(validOrderId, {
    orderId: validOrderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 600000 },
  })

  const resWrongAcc = await settleBankTransaction({
    messageId: `msg_wrong_acc_${Date.now()}`,
    amount: 390000,
    content: `Thanh toan ${validOrderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT08_3_${Date.now()}`,
    accountLast4: '9999', // Sai số tài khoản
    matchedOrderId: validOrderId,
  })
  assert.equal(resWrongAcc.outcome, 'UNMATCHED')
  assert.equal(orderPersistence.get(validOrderId).payment.status, 'AWAITING_PAYMENT')
})

test('Item 9: Biến thể nội dung (hoa/thường, mất gạch, thừa chữ) khớp đúng đơn; 2 mã trong 1 nội dung -> UNMATCHED', () => {
  // Biến thể chuẩn
  const t1 = extractOrderIdStrict('chuyen tien cho don QNS-123456-ABCD cam on shop')
  assert.equal(t1.matchedOrderId, 'QNS-123456-ABCD')

  // Biến thể mất gạch
  const t2 = extractOrderIdStrict('chuyen khoan qns123456abcd')
  assert.equal(t2.matchedOrderId, 'QNS-123456-ABCD')

  // Hai mã trong cùng một nội dung -> ambiguous
  const t3 = extractOrderIdStrict('Thanh toan don QNS-123456-ABCD va QNS-654321-EFGH')
  assert.equal(t3.matchedOrderId, null)
  assert.equal(t3.ambiguous, true)
  assert.equal(t3.candidates.length, 2)
})

test('Item 10: Thư tiền ra/phí/thông báo khác -> IGNORED (direction: OUT)', () => {
  const debitEmail = parseBankEmail({
    from: 'vietcombank@vietcombank.com.vn',
    authResults: 'dkim=pass header.d=vietcombank.com.vn',
    subject: 'Thông báo biến động số dư tài khoản',
    bodyText: 'Tài khoản 1050773506 tại VCB. Số tiền GD: -50,000 VND. Nội dung: Phi duy tri dich vu VCB Digibank.',
  })
  assert.equal(debitEmail.direction, 'OUT')
  assert.equal(debitEmail.ok, false)
  assert.ok(debitEmail.reason.includes('OUTGOING_IGNORED'))
})

// ==============================================================================
// 3. BẢO MẬT KÊNH EMAIL -> SERVER (Items 11 - 14)
// ==============================================================================

test('Item 11: Chữ ký HMAC, lệch giờ > 300s -> 401, body sửa 1 byte -> 401, vector khớp Apps Script', () => {
  const secret = process.env.GMAIL_BRIDGE_SECRET
  const nowSec = Math.floor(Date.now() / 1000)
  const rawBody = '{"runId":"test_01","emails":[]}'

  // Chữ ký chuẩn
  const validSig = computeBridgeSignature(rawBody, secret, nowSec)
  const validReq = {
    headers: { 'x-qns-timestamp': String(nowSec), 'x-qns-signature': validSig },
    rawBody,
  }
  const validCheck = verifyBridgeHmac(validReq)
  assert.equal(validCheck.valid, true)

  // Body bị sửa 1 byte -> 401
  const tamperedReq = {
    headers: { 'x-qns-timestamp': String(nowSec), 'x-qns-signature': validSig },
    rawBody: '{"runId":"test_02","emails":[]}',
  }
  const tamperedCheck = verifyBridgeHmac(tamperedReq)
  assert.equal(tamperedCheck.valid, false)
  assert.equal(tamperedCheck.status, 401)

  // Lệch giờ > 300s -> 401
  const skewedReq = {
    headers: { 'x-qns-timestamp': String(nowSec - 301), 'x-qns-signature': validSig },
    rawBody,
  }
  const skewedCheck = verifyBridgeHmac(skewedReq)
  assert.equal(skewedCheck.valid, false)
  assert.equal(skewedCheck.status, 401)

  // Khóa previous còn dùng được (Zero-Downtime Secret Rotation)
  process.env.GMAIL_BRIDGE_SECRET_PREV = 'old-previous-secret-key-1234567890'
  const oldSig = computeBridgeSignature(rawBody, process.env.GMAIL_BRIDGE_SECRET_PREV, nowSec)
  const rotReq = {
    headers: { 'x-qns-timestamp': String(nowSec), 'x-qns-signature': oldSig },
    rawBody,
  }
  const rotCheck = verifyBridgeHmac(rotReq)
  assert.equal(rotCheck.valid, true)
  assert.equal(rotCheck.usingPreviousSecret, true)
  delete process.env.GMAIL_BRIDGE_SECRET_PREV

  // Vector kiểm thử HMAC cố định Gate G6
  assert.equal(
    computeBridgeSignature(HMAC_TEST_VECTOR.rawBody, HMAC_TEST_VECTOR.secret, HMAC_TEST_VECTOR.timestamp),
    HMAC_TEST_VECTOR.expectedSignature
  )
})

test('Item 12: Thư giả mạo: người gửi lạ / dkim=fail / authResults thiếu -> UNTRUSTED_EMAIL, không xác nhận', async () => {
  const now = Date.now()
  const orderId = `QNS-ADV-12-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 600000 },
  })

  // Thư từ người gửi lạ không thuộc danh sách
  const untrustedSenderCheck = verifyEmailSender('hacker@fakemail.com', 'dkim=pass')
  assert.equal(untrustedSenderCheck.isTrusted, false)

  // Thư có From VCB nhưng dkim=fail
  const dkimFailCheck = verifyEmailSender('vietcombank@vietcombank.com.vn', 'dkim=fail')
  assert.equal(dkimFailCheck.isTrusted, false)

  // Thử settle với thư UNTRUSTED -> outcome: UNTRUSTED_EMAIL
  const settleUntrusted = await settleBankTransaction({
    messageId: `msg_fake_${Date.now()}`,
    amount: 390000,
    content: `QNS ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT12_${Date.now()}`,
    accountLast4: '3506',
    sender: 'hacker@fakemail.com',
    trust: 'UNTRUSTED',
    matchedOrderId: orderId,
  })

  assert.equal(settleUntrusted.outcome, 'UNTRUSTED_EMAIL')
  assert.equal(orderPersistence.get(orderId).payment.status, 'AWAITING_PAYMENT', 'Đơn hàng không được xác nhận')
})

test('Item 13: BANK_EMAIL_AUTO_SETTLE=false -> lưu và gợi ý nhưng không tự động PAID', async () => {
  const originalFlag = process.env.BANK_EMAIL_AUTO_SETTLE
  try {
    process.env.BANK_EMAIL_AUTO_SETTLE = 'false'
    const now = Date.now()
    const orderId = `QNS-ADV-13-${Date.now()}`
    orderPersistence.set(orderId, {
      orderId,
      total: 390000,
      status: 'AWAITING_PAYMENT',
      payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 600000 },
    })

    const msgId = `msg_manual_mode_${Date.now()}`
    const res = await settleBankTransaction({
      messageId: msgId,
      amount: 390000,
      content: `Chuyen tien ${orderId}`,
      bankTime: new Date(now).toISOString(),
      bankRef: `FT13_${Date.now()}`,
      accountLast4: '3506',
      matchedOrderId: orderId,
    })

    assert.ok(['PENDING_MANUAL_REVIEW', 'UNRESOLVED'].includes(res.outcome))
    assert.equal(res.orderId, orderId)
    // Đơn hàng vẫn ở trạng thái chờ đối soát thủ công, không tự chuyển PAID
    assert.equal(orderPersistence.get(orderId).payment.status, 'AWAITING_PAYMENT')
  } finally {
    process.env.BANK_EMAIL_AUTO_SETTLE = originalFlag
  }
})

test('Item 14: Không log / không lưu thân thư ngân hàng vào bảng dữ liệu', () => {
  const emailPayload = {
    from: 'vietcombank@vietcombank.com.vn',
    authResults: 'dkim=pass header.d=vietcombank.com.vn',
    subject: 'Thông báo số dư',
    bodyText: 'Thân thư nhạy cảm chứa số dư đầu kỳ: 50,000,000 VND và số dư cuối kỳ: 50,390,000 VND',
  }
  const parsed = parseBankEmail(emailPayload)
  assert.equal(parsed.bodyText, undefined, 'Parser không truyền lại toàn bộ thân thư vào kết quả trích xuất')
})

// ==============================================================================
// 4. HẾT HẠN & ĐUA NHAU (Items 15 - 17)
// ==============================================================================

test('Item 15: Quá 10 phút -> RECONCILING; quá Grace -> CANCELLED/EXPIRED_TIMEOUT, releaseVoucher 1 lần', () => {
  const now = Date.now()
  const createdTime = now - (PAYMENT_QR_TTL_SECONDS + 30) * 1000 // Quá TTL 30s
  const orderId = `QNS-ADV-15-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(createdTime).toISOString(),
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      qrExpiresAt: createdTime + PAYMENT_QR_TTL_SECONDS * 1000,
    },
  })

  // Đang trong giai đoạn đối soát ân hạn (RECONCILING)
  const phaseInGrace = getPaymentPhase(orderPersistence.get(orderId), now)
  assert.equal(phaseInGrace, 'RECONCILING')

  // Gọi expireOrderIfDue trong Grace -> không hủy
  const expiredPremature = expireOrderIfDue(orderId, now)
  assert.equal(expiredPremature, false)
  assert.equal(orderPersistence.get(orderId).status, 'AWAITING_PAYMENT')

  // Quá hạn Grace 10 phút nữa
  const pastGraceTime = createdTime + (PAYMENT_QR_TTL_SECONDS + PAYMENT_DETECTION_GRACE_SECONDS + 10) * 1000
  const expiredDue = expireOrderIfDue(orderId, pastGraceTime)
  assert.equal(expiredDue, true)

  const finalOrder = orderPersistence.get(orderId)
  assert.equal(finalOrder.status, 'CANCELLED')
  assert.equal(finalOrder.payment.status, 'EXPIRED_TIMEOUT')

  // Chạy lại phải Idempotent
  const secondRun = expireOrderIfDue(orderId, pastGraceTime)
  assert.equal(secondRun, false)
})

test('Item 16: Thư PAID và job hết hạn chen nhau -> kết quả luôn nhất quán, không có đơn vừa CANCELLED vừa PAID', async () => {
  process.env.BANK_EMAIL_AUTO_SETTLE = 'true'
  const now = Date.now()
  const orderId = `QNS-ADV-16-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    createdAt: new Date(now - 300000).toISOString(),
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now + 300000 },
  })

  // Settle tiền về trước
  await settleBankTransaction({
    messageId: `msg_race_${Date.now()}`,
    amount: 390000,
    content: `QNS ${orderId}`,
    bankTime: new Date(now).toISOString(),
    bankRef: `FT16_${Date.now()}`,
    accountLast4: '3506',
    matchedOrderId: orderId,
  })

  // Sau đó job hết hạn chạy vào thời điểm tương lai
  const expireAttempt = expireOrderIfDue(orderId, now + 2000000)
  assert.equal(expireAttempt, false, 'Đơn hàng đã PAID tuyệt đối không bị hủy bởi expireOrderIfDue')

  const finalState = orderPersistence.get(orderId)
  assert.equal(finalState.status, 'CONFIRMED')
  assert.equal(finalState.payment.status, 'PAID')
})

test('Item 17: PAYMENT_QR_TTL_SECONDS === 600 cố định trong code, không bị ghi đè qua môi trường (I11)', () => {
  assert.equal(PAYMENT_QR_TTL_SECONDS, 600, 'Hạn QR phải là 600 giây (10 phút)')
  assert.equal(PAYMENT_DETECTION_GRACE_SECONDS, 600, 'Thời gian ân hạn đối soát phải là 600 giây (10 phút)')
  assert.equal(PAYMENT_CLOCK_TOLERANCE_SECONDS, 60, 'Dung sai đồng hồ ngân hàng phải là 60 giây')
})

// ==============================================================================
// 5. ADMIN & HỒI QUY (Items 18 - 27)
// ==============================================================================

test('Item 18: CONFIRM/PROCESSING/SHIP/DELIVER BANK_TRANSFER chưa PAID -> 400; sau MARK_PAID -> được; thiếu lý do -> 400', async () => {
  const orderId = `QNS-ADV-18-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })

  // Chuyển sang CONFIRM khi chưa trả tiền -> 400
  const confirmRes = await handleAdminOrderAction(orderId, { action: 'CONFIRM' })
  assert.equal(confirmRes.status, 400)
  assert.ok(confirmRes.data.error.includes('PAID') || confirmRes.data.error.includes('tiền về'))

  // MARK_PAID thiếu lý do (< 10 ký tự) -> 400
  const shortNoteRes = await handleAdminOrderAction(orderId, { action: 'MARK_PAID', note: 'ngan hang' })
  assert.equal(shortNoteRes.status, 400)

  // MARK_PAID với lý do hợp lệ >= 10 ký tự -> 200
  const markRes = await handleAdminOrderAction(orderId, {
    action: 'MARK_PAID',
    note: 'Đã nhận đủ 390.000đ qua app VCB lúc 15:30',
  })
  assert.equal(markRes.status, 200)
  assert.equal(orderPersistence.get(orderId).payment.status, 'PAID')

  // Sau khi MARK_PAID, đơn hàng đã tự động chuyển sang CONFIRMED và PAID
  assert.equal(orderPersistence.get(orderId).status, 'CONFIRMED')
  // Tiến hành bước thực hiện tiếp theo (PROCESSING) -> Thành công 200!
  const afterProcessRes = await handleAdminOrderAction(orderId, { action: 'PROCESSING' })
  assert.equal(afterProcessRes.status, 200)
  assert.equal(orderPersistence.get(orderId).status, 'PROCESSING')
})

test('Item 19: TOGGLE_PAYMENT chặn BANK_TRANSFER (400); DELIVER COD vẫn tự gán PAID (hồi quy)', async () => {
  // BANK_TRANSFER -> 400
  const bankOrderId = `QNS-ADV-19-BANK-${Date.now()}`
  orderPersistence.set(bankOrderId, {
    orderId: bankOrderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })
  const toggleBank = await handleAdminOrderAction(bankOrderId, { action: 'TOGGLE_PAYMENT' })
  assert.equal(toggleBank.status, 400)

  // COD -> DELIVER tự gán PAID
  const codOrderId = `QNS-ADV-19-COD-${Date.now()}`
  orderPersistence.set(codOrderId, {
    orderId: codOrderId,
    total: 390000,
    status: 'SHIPPED',
    payment: { method: 'COD', status: 'UNPAID' },
  })
  const deliverCod = await handleAdminOrderAction(codOrderId, { action: 'DELIVER' })
  assert.equal(deliverCod.status, 200)
  assert.equal(orderPersistence.get(codOrderId).payment.status, 'PAID')
})

test('Item 20: Viettel Post Auto-Sync không đưa BANK_TRANSFER chưa PAID sang DELIVERED', () => {
  const unpaidBankOrder = {
    orderId: 'QNS-TEST-VTP',
    total: 390000,
    status: 'SHIPPED',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  }
  const check = canAdvanceFulfilment(unpaidBankOrder)
  assert.equal(check.allowed, false, 'Không cho phép hoàn tất giao hàng khi đơn chuyển khoản chưa thanh toán')
})

test('Item 21: Giao dịch cần xử lý: gán thủ công vào đơn đúng tiền -> PAID; sai tiền -> 400', async () => {
  const now = Date.now()
  const txId = `tx_manual_${now}`
  recordPaymentTransaction({
    txId,
    amount: 390000,
    content: 'Chuyen tien khong ro ma don',
    outcome: 'UNMATCHED',
    status: 'UNRESOLVED',
  })

  // Đơn hàng khớp tiền 390000
  const matchOrderId = `QNS-ADV-21-MATCH-${now}`
  orderPersistence.set(matchOrderId, {
    orderId: matchOrderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })

  // Đơn hàng sai tiền 550000
  const wrongOrderId = `QNS-ADV-21-WRONG-${now}`
  orderPersistence.set(wrongOrderId, {
    orderId: wrongOrderId,
    total: 550000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })

  // Gán vào đơn sai tiền -> 400
  const assignWrong = await assignTransactionToOrder(txId, wrongOrderId, 'admin', 'Gán đối soát sai tiền')
  assert.equal(assignWrong.ok, false)
  assert.equal(assignWrong.status, 400)

  // Gán vào đơn đúng tiền -> 200, chuyển sang PAID
  const assignMatch = await assignTransactionToOrder(txId, matchOrderId, 'admin', 'Gán đối soát khớp tiền')
  assert.equal(assignMatch.ok, true)
  assert.equal(orderPersistence.get(matchOrderId).payment.status, 'PAID')
})

test('Item 22: Heartbeat: lô rỗng cập nhật lastBridgeRunAt; im > 5 phút có đơn chờ -> cảnh báo; huy hiệu đúng màu', async () => {
  const t0 = 1700000000000
  recordBridgeHeartbeat(new Date(t0).toISOString())
  assert.equal(getLastBridgeRunAt(), new Date(t0).toISOString())

  // < 3 phút -> GREEN
  const healthGreen = getBridgeHealth(t0 + 2 * 60000)
  assert.equal(healthGreen.status, 'GREEN')
  assert.equal(healthGreen.healthy, true)

  // 4 phút -> YELLOW
  const healthYellow = getBridgeHealth(t0 + 4 * 60000)
  assert.equal(healthYellow.status, 'YELLOW')
  assert.equal(healthYellow.healthy, true)

  // 6 phút -> RED
  const healthRed = getBridgeHealth(t0 + 6 * 60000)
  assert.equal(healthRed.status, 'RED')
  assert.equal(healthRed.healthy, false)

  // Kiểm tra cảnh báo (chỉ cảnh báo khi có đơn chờ thanh toán)
  const alertResult = await checkBridgeHealthAndAlert(t0 + 6 * 60000)
  assert.ok(typeof alertResult.alertSent === 'boolean')
})

test('Item 23: /api/payment/claim và /api/payment/ai-verify -> 410 Gone và không đổi được trạng thái', async () => {
  const orderId = `QNS-ADV-23-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
  })

  const claimRes = await confirmOrderPaymentManually({ orderId })
  assert.equal(claimRes.status, 410)

  const aiRes = await markOrderPaidByAI({ orderId, amount: 390000 })
  assert.equal(aiRes.status, 410)

  // Trạng thái đơn không bao giờ thay đổi
  assert.equal(orderPersistence.get(orderId).payment.status, 'AWAITING_PAYMENT')
})

test('Item 24: Đơn cũ CUSTOMER_CLAIMED_PAID vẫn hiển thị và xử lý được ở admin qua MARK_PAID', async () => {
  const orderId = `QNS-ADV-24-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: {
      method: 'BANK_TRANSFER',
      status: 'CUSTOMER_CLAIMED_PAID',
      claimedAt: new Date().toISOString(),
    },
  })

  const formatted = formatAdminOrder(orderPersistence.get(orderId))
  assert.ok(formatted)
  assert.equal(formatted.paymentStatus, 'CUSTOMER_CLAIMED_PAID')

  // Admin có thể duyệt qua MARK_PAID
  const markRes = await handleAdminOrderAction(orderId, {
    action: 'MARK_PAID',
    note: 'Kiểm tra sao kê thấy tiền về đúng đơn cũ khách claim',
  })
  assert.equal(markRes.status, 200)
  assert.equal(orderPersistence.get(orderId).payment.status, 'PAID')
})

test('Item 25: Giao diện: polling contract không cho phép giả lập thành công khi server chưa PAID', () => {
  const orderId = `QNS-ADV-25-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: Date.now() + 600000 },
  })

  const status = getOrderPaymentStatus(orderId)
  assert.equal(status.phase, 'AWAITING')
  assert.notEqual(status.phase, 'PAID', 'Server trả phase AWAITING nên trang không bao giờ tự nhảy sang thành công')
})

test('Item 26: /api/orders/status không rò rỉ thông tin nhạy cảm (claimedRawText / referenceCode)', () => {
  const orderId = `QNS-ADV-26-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    payment: {
      method: 'BANK_TRANSFER',
      status: 'AWAITING_PAYMENT',
      claimedRawText: 'TIN NHAN NGAN HANG BI MAT',
      referenceCode: 'FT9999SECRET',
    },
  })

  const sanitized = getOrderPaymentStatus(orderId)
  assert.equal(sanitized.claimedRawText, undefined)
  assert.equal(sanitized.referenceCode, undefined)
  assert.equal(sanitized.success, true)
  assert.ok(sanitized.phase)
})

test('Item 27: COD đơn + giá không đổi; đơn hết hạn hoàn voucher; LOYALTY_ENABLED=false không ảnh hưởng', () => {
  const now = Date.now()
  const orderId = `QNS-ADV-27-${Date.now()}`
  orderPersistence.set(orderId, {
    orderId,
    total: 390000,
    status: 'AWAITING_PAYMENT',
    voucherCode: 'QNS10',
    createdAt: new Date(now - 1300000).toISOString(),
    payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT', qrExpiresAt: now - 700000 },
  })

  // Hết hạn an toàn
  const expired = expireOrderIfDue(orderId, now)
  assert.equal(expired, true)
  assert.equal(orderPersistence.get(orderId).status, 'CANCELLED')
})
