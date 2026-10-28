// server/lib/paymentTransactions.js
/**
 * Module quản lý lưu vết và đối soát giao dịch ngân hàng (payment_transactions)
 * Đảm bảo Invariant I6: Mọi giao dịch tiền vào webhook/email đều được lưu lại (kể cả không khớp/trễ/sai tiền); không bao giờ "nuốt".
 */

import crypto from 'crypto'
import { getDb } from './accountDb.js'
import { orderPersistence } from './orderPersistence.js'
import { markOrderPaid } from './paymentState.js'
import { sendOwnerEmail } from './emailOwner.js'

/**
 * Tính toán dấu vân tay duy nhất của giao dịch (chống trùng lặp / replay)
 */
export function computeTransactionFingerprint({ amount, bankTime, content, accountLast4 = '', bankRef = '' }) {
  const normTime = String(bankTime || '').trim()
  const normContent = String(content || '').trim().toLowerCase()
  const normRef = String(bankRef || '').trim()
  const normAcc = String(accountLast4 || '').trim()
  const raw = `${Number(amount) || 0}|${normTime}|${normContent}|${normAcc}|${normRef}`
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Tra cứu giao dịch theo txId
 */
export function getPaymentTransactionByTxId(txId) {
  if (!txId) return null
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM payment_transactions WHERE tx_id = ?').get(String(txId))
    return row || null
  } catch (err) {
    console.error('Lỗi getPaymentTransactionByTxId:', err.message)
    return null
  }
}

/**
 * Tra cứu theo messageId
 */
export function findTransactionByMessageId(messageId) {
  if (!messageId) return null
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM payment_transactions WHERE message_id = ?').get(String(messageId))
    return row || null
  } catch (err) {
    return null
  }
}

/**
 * Tra cứu theo fingerprint
 */
export function findTransactionByFingerprint(fingerprint) {
  if (!fingerprint) return null
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM payment_transactions WHERE fingerprint = ?').get(String(fingerprint))
    return row || null
  } catch (err) {
    return null
  }
}

/**
 * Lưu vết giao dịch vào database SQLite (Idempotent)
 */
export function recordPaymentTransaction({
  txId,
  fingerprint = null,
  messageId = null,
  amount,
  content = '',
  gateway = 'Vietcombank',
  bankTime = null,
  bankRef = null,
  accountLast4 = null,
  sender = null,
  trust = 'TRUSTED',
  rawJson = null,
  matchedOrderId = null,
  outcome = 'UNMATCHED',
  receivedAt = new Date().toISOString(),
}) {
  try {
    const db = getDb()
    const createdAt = new Date().toISOString()
    const cleanRawJson = typeof rawJson === 'object' ? JSON.stringify(rawJson) : String(rawJson || '')
    const safeTxId = String(txId || `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`)

    const stmt = db.prepare(`
      INSERT INTO payment_transactions (
        tx_id, fingerprint, message_id, received_at, amount, content,
        gateway, bank_time, bank_ref, account_last4, sender, trust,
        raw_json, matched_order_id, outcome, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      safeTxId,
      fingerprint,
      messageId,
      receivedAt,
      Number(amount) || 0,
      String(content || ''),
      String(gateway || 'Vietcombank'),
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      cleanRawJson,
      matchedOrderId,
      outcome,
      outcome,
      createdAt
    )

    return {
      txId: safeTxId,
      fingerprint,
      messageId,
      receivedAt,
      amount: Number(amount) || 0,
      content,
      gateway,
      matchedOrderId,
      outcome,
      createdAt,
    }
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      console.warn(`⚠️ [PAYMENT_TX DUPLICATE] Giao dịch đã tồn tại trong DB (tx_id: ${txId}).`)
      return getPaymentTransactionByTxId(txId) || findTransactionByMessageId(messageId) || findTransactionByFingerprint(fingerprint)
    }
    console.error('Lỗi lưu payment_transactions:', err.message)
    return null
  }
}

/**
 * Xử lý đối soát và ghi nhận giao dịch từ Email Ngân Hàng hoặc Webhook (WP3)
 * @param {Object} txData
 * @returns {Object} { outcome, orderId, alreadyPaid }
 */
export function settleBankTransaction({
  messageId = null,
  amount = 0,
  content = '',
  bankTime = null,
  bankRef = null,
  accountLast4 = null,
  sender = null,
  trust = 'TRUSTED',
  matchedOrderId = null,
  rawExtracted = null,
  gateway = 'Vietcombank',
  receivedAt = new Date().toISOString(),
}) {
  const fingerprint = computeTransactionFingerprint({ amount, bankTime, content, accountLast4, bankRef })

  // 1. Kiểm tra trùng lặp (Idempotent theo messageId hoặc fingerprint)
  if (messageId) {
    const existingMsg = findTransactionByMessageId(messageId)
    if (existingMsg) {
      console.log(`ℹ️ [TRANSACTION DUPLICATE MSG] Đã nhận messageId ${messageId} trước đó.`)
      return { outcome: 'DUPLICATE', existing: existingMsg }
    }
  }

  const existingFp = findTransactionByFingerprint(fingerprint)
  if (existingFp) {
    console.log(`ℹ️ [TRANSACTION DUPLICATE FP] Đã nhận giao dịch có fingerprint ${fingerprint} trước đó.`)
    return { outcome: 'DUPLICATE', existing: existingFp }
  }

  const txId = bankRef ? `tx_${bankRef}` : `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`

  // 2. Thư không đáng tin cậy (DKIM/DMARC fail hoặc From giả mạo)
  if (trust === 'UNTRUSTED') {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust: 'UNTRUSTED',
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'UNTRUSTED_EMAIL',
      receivedAt,
    })
    console.warn(`⛔ [UNTRUSTED_EMAIL] Nhận thư biến động số dư từ người gửi không tin cậy: ${sender}`)
    sendOwnerEmail({
      orderId: matchedOrderId || 'UNKNOWN',
      notes: `[CẢNH BÁO BẢO MẬT] Nhận email biến động số dư từ người gửi KHÔNG HỢP LỆ: ${sender}. Số tiền: ${amount}đ. Vui lòng kiểm tra kỹ!`,
    }).catch(() => {})
    return { outcome: 'UNTRUSTED_EMAIL' }
  }

  // 3. Không tìm thấy mã đơn hàng trong nội dung
  if (!matchedOrderId) {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId: null,
      outcome: 'UNMATCHED',
      receivedAt,
    })
    console.warn(`⚠️ [BANK UNMATCHED] Không tìm thấy mã đơn hàng hợp lệ trong nội dung: "${content}"`)
    return { outcome: 'UNMATCHED' }
  }

  // 4. Tìm kiếm đơn hàng trong kho lưu trữ
  const order = orderPersistence.get(matchedOrderId)
  if (!order) {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'ORDER_NOT_FOUND',
      receivedAt,
    })
    console.warn(`⛔ [BANK ORDER_NOT_FOUND] Không tìm thấy đơn hàng "${matchedOrderId}" trong hệ thống.`)
    return { outcome: 'ORDER_NOT_FOUND' }
  }

  // 5. Kiểm tra số tài khoản thụ hưởng (4 số cuối)
  const expectedLast4 = process.env.BANK_ACCOUNT_LAST4 || '3506'
  if (accountLast4 && accountLast4 !== expectedLast4) {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'UNMATCHED',
      receivedAt,
    })
    console.warn(`⛔ [BANK ACCOUNT_MISMATCH] Số tài khoản nhận ${accountLast4} không khớp với cấu hình ${expectedLast4}.`)
    return { outcome: 'UNMATCHED' }
  }

  // 6. Kiểm tra số tiền nhận so với tổng tiền đơn hàng (Dung sai = 0đ)
  if (Number(amount) !== Number(order.total)) {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'AMOUNT_MISMATCH',
      receivedAt,
    })
    console.warn(`⛔ [BANK AMOUNT_MISMATCH] Nhận ${amount}đ nhưng đơn hàng ${matchedOrderId} yêu cầu ${order.total}đ.`)
    sendOwnerEmail({
      ...order,
      notes: `[CẢNH BÁO SAI TIỀN] Đơn ${matchedOrderId} yêu cầu ${order.total}đ nhưng ngân hàng báo nhận ${amount}đ. Vui lòng đối soát thủ công!`,
    }).catch(() => {})
    return { outcome: 'AMOUNT_MISMATCH', orderId: matchedOrderId }
  }

  // 7. Đơn hàng đã PAID từ trước (Chống chuyển tiền thừa / Duplicate)
  if (order.payment?.status === 'PAID') {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'DUPLICATE_PAYMENT',
      receivedAt,
    })
    console.warn(`⚠️ [BANK DUPLICATE_PAYMENT] Đơn hàng ${matchedOrderId} đã PAID nhưng nhận thêm khoản ${amount}đ. Cần hoàn tiền!`)
    sendOwnerEmail({
      ...order,
      notes: `[CẢNH BÁO CHUYỂN TIỀN TRÙNG] Đơn ${matchedOrderId} đã thanh toán trước đó nhưng vừa nhận thêm ${amount}đ. Vui lòng kiểm tra và hoàn tiền cho khách.`,
    }).catch(() => {})
    return { outcome: 'DUPLICATE_PAYMENT', orderId: matchedOrderId, alreadyPaid: true }
  }

  // 8. Đơn hàng đã HỦY hoặc HẾT HẠN (LATE_AFTER_EXPIRY)
  if (order.status === 'CANCELLED' || order.payment?.status === 'EXPIRED_TIMEOUT') {
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'LATE_AFTER_EXPIRY',
      receivedAt,
    })
    console.warn(`⛔ [BANK LATE_AFTER_EXPIRY] Tiền về cho đơn hàng ${matchedOrderId} đã HỦY/HẾT HẠN. Cần đối soát/hoàn tiền thủ công.`)
    sendOwnerEmail({
      ...order,
      notes: `[TIỀN VỀ MUỘN] Đơn hàng ${matchedOrderId} đã HỦY/HẾT HẠN nhưng vừa nhận được ${amount}đ. Không tự động phục hồi đơn. Vui lòng liên hệ khách để hỗ trợ hoặc hoàn tiền!`,
    }).catch(() => {})
    return { outcome: 'LATE_AFTER_EXPIRY', orderId: matchedOrderId }
  }

  // 9. Kiểm tra giờ giao dịch ngân hàng so với hạn TTL + 60s dung sai
  const orderCreatedAtMs = order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
  const orderExpiresAtMs = order.payment?.qrExpiresAt
    ? new Date(order.payment.qrExpiresAt).getTime()
    : orderCreatedAtMs + 600000

  const bankTimeMs = bankTime ? new Date(bankTime).getTime() : Date.now()
  if (bankTimeMs > orderExpiresAtMs + 60000) {
    // Khách thực hiện lệnh chuyển sau khi mã QR đã hết hạn 10 phút
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'LATE_AFTER_EXPIRY',
      receivedAt,
    })
    console.warn(`⛔ [BANK LATE_AFTER_EXPIRY] Giờ chuyển tiền ngân hàng (${bankTime}) đã vượt quá hạn QR đơn hàng.`)
    sendOwnerEmail({
      ...order,
      notes: `[TIỀN VỀ QUÁ HẠN QR] Đơn ${matchedOrderId} nhận ${amount}đ nhưng khách chuyển sau khi QR hết hạn. Cần đối soát thủ công!`,
    }).catch(() => {})
    return { outcome: 'LATE_AFTER_EXPIRY', orderId: matchedOrderId }
  }

  // 10. Đơn AWAITING_PAYMENT / RECONCILING hợp lệ + đúng số tiền
  const autoSettleEnabled = process.env.BANK_EMAIL_AUTO_SETTLE === 'true'

  if (autoSettleEnabled) {
    // Tự động xác nhận PAID
    markOrderPaid(order, {
      source: 'bank-email',
      txId: bankRef || txId,
      amount,
      bankTime: bankTime || receivedAt,
      actor: 'system',
      note: `Tự động khớp từ email biến động số dư ngân hàng (${gateway})`,
    })

    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'MATCHED_PAID',
      receivedAt,
    })

    console.log(`🎉 [XÁC NHẬN TIỀN VỀ TỰ ĐỘNG THÀNH CÔNG] Đơn hàng ${matchedOrderId}: Đã nhận đúng ${amount}đ!`)
    return { outcome: 'MATCHED_PAID', orderId: matchedOrderId, paid: true }
  } else {
    // Chế độ S1 (BANK_EMAIL_AUTO_SETTLE=false): Lưu lại và gợi ý đối soát cho Admin
    recordPaymentTransaction({
      txId,
      fingerprint,
      messageId,
      amount,
      content,
      gateway,
      bankTime,
      bankRef,
      accountLast4,
      sender,
      trust,
      rawJson: rawExtracted,
      matchedOrderId,
      outcome: 'UNMATCHED', // Lưu chờ admin duyệt
      receivedAt,
    })

    console.log(`ℹ️ [BANK S1 MODE] Nhận ${amount}đ khớp đơn ${matchedOrderId} nhưng cờ BANK_EMAIL_AUTO_SETTLE=false. Chờ admin duyệt thủ công.`)
    return { outcome: 'PENDING_MANUAL_REVIEW', orderId: matchedOrderId, paid: false }
  }
}

/**
 * Lấy danh sách giao dịch cần xử lý (Pending Admin Resolution)
 */
export function getUnresolvedPaymentTransactions() {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM payment_transactions
      WHERE outcome NOT IN ('MATCHED_PAID', 'DUPLICATE', 'ALREADY_PAID')
        AND resolved_at IS NULL
      ORDER BY received_at DESC
      LIMIT 100
    `).all()
    return rows
  } catch (err) {
    console.error('Lỗi getUnresolvedPaymentTransactions:', err.message)
    return []
  }
}

/**
 * Giải quyết giao dịch thủ công bởi Admin (gán đơn hoặc bỏ qua/hoàn tiền)
 */
export function resolvePaymentTransaction(txId, { resolvedBy, resolutionNote, matchedOrderId = null, outcome = null }) {
  try {
    const db = getDb()
    const resolvedAt = new Date().toISOString()
    const stmt = db.prepare(`
      UPDATE payment_transactions
      SET resolved_at = ?,
          resolved_by = ?,
          resolution_note = ?,
          matched_order_id = COALESCE(?, matched_order_id),
          outcome = COALESCE(?, outcome)
      WHERE tx_id = ?
    `)
    stmt.run(resolvedAt, resolvedBy, resolutionNote, matchedOrderId, outcome, String(txId))
    return getPaymentTransactionByTxId(txId)
  } catch (err) {
    console.error('Lỗi resolvePaymentTransaction:', err.message)
    return null
  }
}

/**
 * Gán thủ công giao dịch ngân hàng vào đơn hàng (Item 21)
 * Kiểm tra số tiền nghiêm ngặt (chặn nếu sai tiền) và chỉ đánh dấu PAID khi khớp số tiền
 */
export async function assignTransactionToOrder(txId, orderId, adminUser = 'admin', note = '') {
  const tx = getPaymentTransactionByTxId(txId)
  if (!tx) {
    return { ok: false, status: 404, error: 'Không tìm thấy giao dịch ngân hàng' }
  }
  const order = orderPersistence.get(orderId)
  if (!order) {
    return { ok: false, status: 404, error: `Không tìm thấy đơn hàng ${orderId}` }
  }
  if (Number(tx.amount) !== Number(order.total)) {
    return {
      ok: false,
      status: 400,
      error: `Số tiền giao dịch (${tx.amount}đ) không khớp với tổng tiền đơn hàng (${order.total}đ)`,
    }
  }

  const resolutionNote = String(note || 'Gán thủ công bởi admin').trim()
  markOrderPaid(order, {
    source: 'admin',
    actor: adminUser,
    note: resolutionNote,
    txId,
    amount: order.total,
  })

  resolvePaymentTransaction(txId, {
    resolvedBy: adminUser,
    resolutionNote,
    matchedOrderId: orderId,
    outcome: 'MATCHED_PAID',
  })

  return { ok: true, status: 200, message: `Đã gán giao dịch ${txId} vào đơn ${orderId} thành công` }
}
