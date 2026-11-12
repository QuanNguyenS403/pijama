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
