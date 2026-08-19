import { getTransporter } from './emailConfig.js'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export const sendOwnerEmail = async (order) => {
  const transporter = getTransporter()
  const paymentEmoji =
    order.payment?.method === 'COD'
      ? '🚚'
      : order.payment?.status === 'PAID'
      ? '💰'
      : '⏳'

  const ownerEmail = process.env.OWNER_EMAIL || 'ducquan16102006@gmail.com'

  const subject = `${paymentEmoji} ĐƠN MỚI [${order.orderId}] — ${order.customer?.fullName} — ${formatVND(order.total)}`

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Thông báo đơn hàng mới</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
      .wrap { max-width: 600px; margin: 0 auto; background: white; border: 1px solid #ddd; }
      .top-bar { background: #631521; padding: 18px 24px; }
      .top-bar h1 { color: white; font-size: 18px; margin: 0; }
      .top-bar p  { color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0; }
      .body { padding: 24px; }
      .kv-grid { display: grid; grid-template-columns: 130px 1fr; gap: 8px 16px; margin-bottom: 20px; }
      .kv-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
      .kv-value { font-size: 13px; color: #333; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #631521; color: white; font-size: 11px; padding: 8px 10px; text-align: left; }
      td { padding: 10px; font-size: 13px; border-bottom: 1px solid #eee; }
      .total-box { background: #FAF5F0; border: 1px solid #E8DFD5; padding: 16px; border-radius: 3px; }
      .total-final { font-size: 20px; color: #631521; font-weight: bold; margin-top: 4px; }
      .tag { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 2px; }
      .tag-cod { background: #FFF9E6; color: #B8860B; border: 1px solid #D4AF37; }
      .tag-paid { background: #E8F5E9; color: #2E7D32; border: 1px solid #2E7D32; }
    </style>
  </head>
  <body>
  <div class="wrap">
    <div class="top-bar">
      <h1>${paymentEmoji} Đơn hàng mới — ${order.orderId}</h1>
      <p>${order.orderDateVN} · ${order.payment?.methodLabel || 'Phương thức khác'}</p>
    </div>
    <div class="body">

      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#631521;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:16px">
        Thông tin khách hàng
      </h3>
      <div class="kv-grid">
        <span class="kv-label">Họ tên</span>     <span class="kv-value">${order.customer?.fullName}</span>
        <span class="kv-label">Điện thoại</span> <span class="kv-value"><a href="tel:${order.customer?.phone}" style="color:#631521;text-decoration:none">${order.customer?.phone}</a></span>
        <span class="kv-label">Email</span>       <span class="kv-value">${order.customer?.email}</span>
        <span class="kv-label">Địa chỉ</span>    <span class="kv-value">${order.shipping?.fullAddress}</span>
        ${order.note ? `<span class="kv-label">Ghi chú</span><span class="kv-value" style="color:#631521">${order.note}</span>` : ''}
      </div>

      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#631521;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:16px">
        Chi tiết sản phẩm
      </h3>
      <table>
        <tr><th>Sản phẩm</th><th>Biến thể</th><th>SL</th><th>Thành tiền</th></tr>
        ${(order.items || []).map((i) => `
        <tr>
          <td><b>${i.productName}</b></td>
          <td style="color:#666">${i.variant}</td>
          <td>x${i.quantity}</td>
          <td style="color:#631521;font-weight:bold">${formatVND(i.totalPrice)}</td>
        </tr>`).join('')}
      </table>

      <div class="total-box">
        <div style="font-size:12px;color:#666;margin-bottom:4px">Tạm tính: <b>${formatVND(order.subtotal)}</b></div>
        <div style="font-size:12px;color:#666;margin-bottom:4px">Phí ship: <b>${order.shippingFee > 0 ? formatVND(order.shippingFee) : 'Miễn phí'}</b></div>
        ${order.discount > 0 ? `<div style="font-size:12px;color:#666;margin-bottom:4px">Giảm giá: <b>-${formatVND(order.discount)}</b></div>` : ''}
        <div class="total-final">TỔNG THU: ${formatVND(order.total)}</div>
        <div style="margin-top:10px;font-size:13px">
          Phương thức: <b>${order.payment?.methodLabel}</b><br>
          Trạng thái: ${order.payment?.method === 'COD' ? '<span class="tag tag-cod">Chưa TT (Thu COD)</span>' : '<span class="tag tag-paid">Đã TT</span>'}
        </div>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#777;border-top:1px solid #eee;padding-top:14px">
        ⚡ Đơn hàng này đã được tự động lưu vào Google Sheets. Vui lòng đóng gói và xử lý giao hàng trong 24h.
      </p>

    </div>
  </div>
  </body>
  </html>
  `

  await transporter.sendMail({
    from: `"QuanNguyenS System" <${process.env.GMAIL_USER}>`,
    to: ownerEmail,
    subject,
    html,
  })

  console.log(`✅ Owner notification sent to ${ownerEmail}`)
  return { success: true, recipient: ownerEmail }
}
