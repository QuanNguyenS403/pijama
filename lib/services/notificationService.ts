// lib/services/notificationService.ts — Tự động gửi email khách hàng, email chủ shop và ghi Google Sheets

// @ts-ignore
import { sendCustomerEmail } from '../emailCustomer.js';
// @ts-ignore
import { sendConfirmedEmail, sendShippedEmail, sendCancelledEmail } from '../emailStatusUpdates.js';
// @ts-ignore
import { sendOwnerEmail } from '../emailOwner.js';
// @ts-ignore
import { writeOrderToSheet } from '../googleSheets.js';
import prisma from '../prisma';

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  VNPAY: 'VNPAY',
  MOMO: 'Ví MoMo',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
};

// Convert Prisma Order → email format
const formatOrderForEmail = (order: any) => ({
  orderId: order.orderNumber,
  orderDate: order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString(),
  orderDateVN: (order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }),
  status: order.status,
  customer: {
    fullName: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
  },
  shipping: order.shippingAddress,
  items:
    order.items?.map((i: any) => ({
      productName: i.productName,
      variant: `${i.colorLabel} | Size ${i.size}`,
      color: i.colorName,
      size: i.size,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    })) || [],
  subtotal: order.subtotal,
  shippingFee: order.shippingFee,
  discount: order.discount,
  voucherCode: order.voucherCode,
  total: order.total,
  note: order.customerNote,
  payment: {
    method: order.paymentMethod,
    methodLabel: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod,
    status: order.paymentStatus,
  },
});

export const NotificationService = {
  async sendOrderConfirmation(order: any) {
    const orderPayload = formatOrderForEmail(order);

    const [sheetResult, customerResult, ownerResult] = await Promise.allSettled([
      writeOrderToSheet(orderPayload),
      sendCustomerEmail(orderPayload),
      sendOwnerEmail(orderPayload),
    ]);

    // Log kết quả vào DB
    const logs = [
      { type: 'SHEET_WRITE', result: sheetResult, recipient: 'google-sheets' },
      { type: 'ORDER_CONFIRM', result: customerResult, recipient: order.customerEmail },
      { type: 'OWNER_NOTIFY', result: ownerResult, recipient: process.env.OWNER_EMAIL || 'owner@gmail.com' },
    ];

    await Promise.all(
      logs.map((log) =>
        prisma.notificationLog
          .create({
            data: {
              type: log.type,
              recipient: log.recipient,
              subject: `Order ${order.orderNumber}`,
              status: log.result.status === 'fulfilled' ? 'SENT' : 'FAILED',
              orderId: order.id,
              error: log.result.status === 'rejected' ? (log.result as PromiseRejectedResult).reason?.message || 'Error' : null,
            },
          })
          .catch((err) => console.error('[NotificationLog error]', err))
      )
    );

    return { sheetResult, customerResult, ownerResult };
  },

  // ════════════════════════════════════════════
  // Gửi email theo status update (CONFIRMED / SHIPPED / CANCELLED)
  // ════════════════════════════════════════════
  async sendStatusUpdate(order: any, newStatus: string, extra: any = {}) {
    const emailFn = (STATUS_EMAIL_MAP as any)[newStatus];
    if (!emailFn) return; // Không phải status cần email

    const orderPayload = formatOrderForEmail(order);

    const [emailResult] = await Promise.allSettled([
      emailFn(orderPayload, extra),
    ]);

    // Log vào DB
    await prisma.notificationLog.create({
      data: {
        type: `STATUS_${newStatus}`,
        recipient: order.customerEmail,
        subject: `Order ${order.orderNumber} → ${newStatus}`,
        status: emailResult.status === 'fulfilled' ? 'SENT' : 'FAILED',
        orderId: order.id,
        error: emailResult.status === 'rejected' ? (emailResult as PromiseRejectedResult).reason?.message || 'Error' : null,
      },
    });
  },

  // Cập nhật cột trạng thái trong Google Sheets
  async updateSheetStatus(orderNumber: string, newStatus: string, note = '') {
    try {
      const { google } = await import('googleapis');
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      // Tìm dòng có orderNumber trong cột A
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Đơn Hàng!A:A',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r) => r[0] === orderNumber);

      if (rowIndex === -1) {
        console.warn(`Sheet: Không tìm thấy đơn ${orderNumber}`);
        return;
      }

      const rowNumber = rowIndex + 1; // Sheets dùng 1-based index
      const statusVN = (ORDER_STATUS_LABELS_VN as any)[newStatus] || newStatus;
      const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

      // Cập nhật cột W (Trạng Thái Đơn) — index 22 (0-based)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Đơn Hàng!W${rowNumber}:X${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[statusVN, note ? `${now}: ${note}` : now]],
        },
      });

      console.log(`✅ Sheet: Cập nhật đơn ${orderNumber} → ${statusVN}`);
    } catch (err: any) {
      console.error('Sheet update error:', err.message);
    }
  },
};

// ── Map status → email sender function ─────────────
const STATUS_EMAIL_MAP: Record<string, any> = {
  CONFIRMED: sendConfirmedEmail,
  SHIPPED: sendShippedEmail,
  CANCELLED: sendCancelledEmail,
  // PROCESSING và DELIVERED: không gửi email khách (optional)
};

const ORDER_STATUS_LABELS_VN: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang đóng gói',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

export default NotificationService;
