// lib/services/notificationService.js — Gọi automation đã có từ prompt trước

import { sendCustomerEmail } from '../emailCustomer.js'
import { sendConfirmedEmail, sendShippedEmail, sendCancelledEmail } from '../emailStatusUpdates.js'
import { sendOwnerEmail }    from '../emailOwner.js'
import { writeOrderToSheet } from '../googleSheets.js'
import { prisma }            from '../prisma.js'

const PAYMENT_LABELS = {
  COD:           'Thanh toán khi nhận hàng (COD)',
  VNPAY:         'VNPAY',
  MOMO:          'Ví MoMo',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
}

// Convert Prisma Order → email format
const formatOrderForEmail = (order) => ({
  orderId:     order.orderNumber,
  orderDate:   order.createdAt.toISOString(),
  orderDateVN: order.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  status:      order.status,
  customer: {
    fullName: order.customerName,
    phone:    order.customerPhone,
    email:    order.customerEmail,
  },
  shipping: order.shippingAddress,
  items: order.items?.map(i => ({
    productName: i.productName,
    variant:     `${i.colorLabel} | Size ${i.size}`,
    color:       i.colorName,
    size:        i.size,
    quantity:    i.quantity,
    unitPrice:   i.unitPrice,
    totalPrice:  i.totalPrice,
  })) || [],
  subtotal:    order.subtotal,
  shippingFee: order.shippingFee,
  discount:    order.discount,
  voucherCode: order.voucherCode,
  total:       order.total,
  note:        order.customerNote,
  payment: {
    method:      order.paymentMethod,
    methodLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
    status:      order.paymentStatus,
  },
})

export const NotificationService = {

  async sendOrderConfirmation(order) {
    const orderPayload = formatOrderForEmail(order)

    const [sheetResult, customerResult, ownerResult] = await Promise.allSettled([
      writeOrderToSheet(orderPayload),
      sendCustomerEmail(orderPayload),
      sendOwnerEmail(orderPayload),
    ])

    // Log kết quả vào DB
    const logs = [
      { type: 'SHEET_WRITE',    result: sheetResult,    recipient: 'google-sheets' },
      { type: 'ORDER_CONFIRM',  result: customerResult, recipient: order.customerEmail },
      { type: 'OWNER_NOTIFY',   result: ownerResult,    recipient: process.env.OWNER_EMAIL || 'owner@gmail.com' },
    ]

    await Promise.all(logs.map(log =>
      prisma.notificationLog.create({
        data: {
          type:      log.type,
          recipient: log.recipient,
          subject:   `Order ${order.orderNumber}`,
          status:    log.result.status === 'fulfilled' ? 'SENT' : 'FAILED',
          orderId:   order.id,
          error:     log.result.reason?.message || null,
        },
      }).catch(err => console.error('[NotificationLog error]', err))
    ))

    return { sheetResult, customerResult, ownerResult }
  },

  // ════════════════════════════════════════════
  // Gửi email theo status update (CONFIRMED / SHIPPED / CANCELLED)
  // ════════════════════════════════════════════
  async sendStatusUpdate(order, newStatus, extra = {}) {
    const emailFn = STATUS_EMAIL_MAP[newStatus]
    if (!emailFn) return  // Không phải status cần email

    const orderPayload = formatOrderForEmail(order)

    const [emailResult] = await Promise.allSettled([
      emailFn(orderPayload, extra),
    ])

    // Log vào DB
    await prisma.notificationLog.create({
      data: {
        type:      `STATUS_${newStatus}`,
        recipient: order.customerEmail,
        subject:   `Order ${order.orderNumber} → ${newStatus}`,
        status:    emailResult.status === 'fulfilled' ? 'SENT' : 'FAILED',
        orderId:   order.id,
        error:     emailResult.reason?.message || null,
      },
    })
  },

  // Cập nhật cột trạng thái trong Google Sheets
  async updateSheetStatus(orderNumber, newStatus, note = '') {
    try {
      const { google } = await import('googleapis')
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
      const sheets        = google.sheets({ version: 'v4', auth })
      const spreadsheetId = process.env.GOOGLE_SHEET_ID

      // Tìm dòng có orderNumber trong cột A
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Đơn Hàng!A:A',
      })

      const rows    = response.data.values || []
      const rowIndex = rows.findIndex(r => r[0] === orderNumber)

      if (rowIndex === -1) {
        console.warn(`Sheet: Không tìm thấy đơn ${orderNumber}`)
        return
      }

      const rowNumber = rowIndex + 1   // Sheets dùng 1-based index
      const statusVN  = ORDER_STATUS_LABELS_VN[newStatus] || newStatus
      const now       = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

      // Cập nhật cột W (Trạng Thái Đơn) — index 22 (0-based)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range:            `Đơn Hàng!W${rowNumber}:X${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            statusVN,
            note ? `${now}: ${note}` : now,
          ]],
        },
      })

      console.log(`✅ Sheet: Cập nhật đơn ${orderNumber} → ${statusVN}`)
    } catch (err) {
      console.error('Sheet update error:', err.message)
    }
  },
}

// ── Map status → email sender function ─────────────
const STATUS_EMAIL_MAP = {
  CONFIRMED:  sendConfirmedEmail,
  SHIPPED:    sendShippedEmail,
  CANCELLED:  sendCancelledEmail,
  // PROCESSING và DELIVERED: không gửi email khách (optional)
}

const ORDER_STATUS_LABELS_VN = {
  PENDING:    'Chờ xác nhận',
  CONFIRMED:  'Đã xác nhận',
  PROCESSING: 'Đang đóng gói',
  SHIPPED:    'Đang giao hàng',
  DELIVERED:  'Đã giao hàng',
  CANCELLED:  'Đã hủy',
  REFUNDED:   'Đã hoàn tiền',
}

export default NotificationService
