// scripts/audit-bank-transfer-orders.js
/**
 * SCRIPT CHỈ ĐỌC (READ-ONLY AUDIT TOOL) — QuanNguyenS
 * Rà soát và lập danh sách đối chiếu các đơn hàng chuyển khoản VietQR trong hệ thống.
 * TUYỆT ĐỐI KHÔNG GHI / KHÔNG CHỈNH SỬA / KHÔNG XÓA BẤT KỲ DỮ LIỆU NÀO.
 * 
 * Cách dùng trên máy chủ / môi trường của Quan:
 *   node scripts/audit-bank-transfer-orders.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import { PAYMENT_QR_TTL_SECONDS } from '../server/lib/paymentState.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runAudit() {
  console.log('===============================================================')
  console.log('🔍 BẮT ĐẦU RÀ SOÁT ĐƠN HÀNG CHUYỂN KHOẢN VIETQR (READ-ONLY AUDIT)')
  console.log('===============================================================\n')

  const now = Date.now()
  const allOrders = orderPersistence.getAll() || []
  console.log(`📦 Tổng số đơn hàng trong cơ sở dữ liệu: ${allOrders.length}`)

  const auditResults = {
    generatedAt: new Date().toISOString(),
    totalOrdersInSystem: allOrders.length,
    unpaidAdvancedFulfilment: [],    // (i) Chưa trả tiền nhưng đã CONFIRMED / PROCESSING / SHIPPED / DELIVERED
    paidWithoutWebhookTx: [],        // (ii) Đánh dấu PAID nhưng không có referenceCode / giao dịch Webhook thật
    stuckAwaitingExpired: [],        // (iii) Kẹt AWAITING_PAYMENT quá thời hạn TTL
    voucherHeldByCancelled: [],      // (iv) Voucher bị giữ bởi đơn đã hủy
  }

  for (const order of allOrders) {
    const orderId = order.orderId || order.id
    if (!orderId) continue

    const method = order.payment?.method || order.paymentMethod || 'COD'
    const status = order.status || 'PENDING'
    const paymentStatus = order.payment?.status || order.paymentStatus || 'UNPAID'
    const isBankTransfer = method === 'BANK_TRANSFER'

    // (i) Đơn BANK_TRANSFER mà payment.status !== 'PAID' nhưng status ∈ {CONFIRMED, PROCESSING, SHIPPED, DELIVERED}
    if (isBankTransfer && paymentStatus !== 'PAID') {
      if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) {
        auditResults.unpaidAdvancedFulfilment.push({
          orderId,
          status,
          paymentStatus,
          total: order.total,
          customerName: order.customer?.fullName,
          customerPhone: order.customer?.phone,
          createdAt: order.createdAt,
          note: 'Đơn chuyển khoản chưa có trạng thái PAID nhưng đã được chuyển sang giao dịch/vận chuyển',
        })
      }
    }

    // (ii) Đơn BANK_TRANSFER mà payment.status === 'PAID' nhưng không có referenceCode hoặc txId từ webhook
    if (isBankTransfer && paymentStatus === 'PAID') {
      const hasWebhookProof = Boolean(order.payment?.referenceCode || order.payment?.txId || order.payment?.gatewayTxId)
      if (!hasWebhookProof) {
        auditResults.paidWithoutWebhookTx.push({
          orderId,
          status,
          paymentStatus,
          total: order.total,
          customerName: order.customer?.fullName,
          customerPhone: order.customer?.phone,
          paidAt: order.payment?.paidAt || order.updatedAt,
          note: 'Đơn đánh dấu PAID nhưng thiếu mã giao dịch ngân hàng (có thể do bấm nhầm hoặc DELIVER tự gán)',
        })
      }
    }

    // (iii) Đơn BANK_TRANSFER kẹt AWAITING_PAYMENT quá hạn
    if (isBankTransfer && (status === 'AWAITING_PAYMENT' || paymentStatus === 'AWAITING_PAYMENT')) {
      const qrExpiresAt = order.payment?.qrExpiresAt
        ? new Date(order.payment.qrExpiresAt).getTime()
        : (order.createdAt ? new Date(order.createdAt).getTime() + PAYMENT_QR_TTL_SECONDS * 1000 : 0)

      if (qrExpiresAt > 0 && now > qrExpiresAt) {
        const minutesOverdue = Math.round((now - qrExpiresAt) / (1000 * 60))
        auditResults.stuckAwaitingExpired.push({
          orderId,
          status,
          total: order.total,
          customerPhone: order.customer?.phone,
          qrExpiresAt: new Date(qrExpiresAt).toISOString(),
          minutesOverdue,
          voucherCode: order.voucherCode || null,
        })
      }
    }

    // (iv) Voucher đang giữ bởi đơn đã hủy
    if (status === 'CANCELLED' && order.voucherCode) {
      auditResults.voucherHeldByCancelled.push({
        orderId,
        voucherCode: order.voucherCode,
        cancelledAt: order.cancelledAt || order.updatedAt,
        cancelReason: order.cancelReason || 'Không rõ lý do',
      })
    }
  }

  // Tạo thư mục audit/ nếu chưa tồn tại
  const auditDir = path.resolve(__dirname, '../audit')
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = path.resolve(auditDir, `bank-transfer-audit-${timestamp}.json`)
  const csvPath = path.resolve(auditDir, `bank-transfer-audit-${timestamp}.csv`)

  fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2), 'utf8')

  // Xuất file CSV đối chiếu nhanh
  const csvRows = [
    'Phân loại,Mã đơn hàng,Trạng thái đơn,Trạng thái TT,Tổng tiền,Khách hàng,SĐT,Ghi chú',
  ]

  auditResults.unpaidAdvancedFulfilment.forEach((o) => {
    csvRows.push(`CHUA_PAID_DA_GIAO,${o.orderId},${o.status},${o.paymentStatus},${o.total},"${o.customerName || ''}",${o.customerPhone || ''},"${o.note}"`)
  })
  auditResults.paidWithoutWebhookTx.forEach((o) => {
    csvRows.push(`PAID_THIEU_MA_GD,${o.orderId},${o.status},${o.paymentStatus},${o.total},"${o.customerName || ''}",${o.customerPhone || ''},"${o.note}"`)
  })
  auditResults.stuckAwaitingExpired.forEach((o) => {
    csvRows.push(`KET_AWAITING_QUA_HAN,${o.orderId},${o.status},AWAITING,${o.total},,${o.customerPhone || ''},"Quá hạn ${o.minutesOverdue} phút"`)
  })

  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8')

  console.log('---------------------------------------------------------------')
  console.log(`📊 KẾT QUẢ ĐỐI SOÁT:`)
  console.log(`  1. Đơn chuyển khoản chưa PAID nhưng đã giao/vận chuyển: ${auditResults.unpaidAdvancedFulfilment.length}`)
  console.log(`  2. Đơn PAID nhưng thiếu mã giao dịch Webhook thật:       ${auditResults.paidWithoutWebhookTx.length}`)
  console.log(`  3. Đơn kẹt AWAITING_PAYMENT quá thời hạn TTL:           ${auditResults.stuckAwaitingExpired.length}`)
  console.log(`  4. Đơn đã hủy nhưng có voucher liên quan:              ${auditResults.voucherHeldByCancelled.length}`)
  console.log('---------------------------------------------------------------')
  console.log(`📁 File kết quả đã xuất an toàn:`)
  console.log(`   - JSON: ${jsonPath}`)
  console.log(`   - CSV : ${csvPath}`)
  console.log('===============================================================\n')
}

runAudit().catch((err) => {
  console.error('Lỗi chạy audit script:', err)
})

