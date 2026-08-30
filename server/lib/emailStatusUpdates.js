// server/lib/emailStatusUpdates.js
// 3 email template: Đã xác nhận / Đang giao / Đã hủy

import { transporter } from './emailConfig.js'

const vnd = (n) => Number(n).toLocaleString('vi-VN') + 'đ'

// ── CSS dùng chung ────────────────────────────────────
const baseStyles = `
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',Arial,sans-serif; background:#F5F0E8; color:#3A3535; }
  .wrap { max-width:600px; margin:20px auto; background:#fff; border:1px solid #D9CFC4; }
  .header { background:#7B2D3E; padding:28px 40px; text-align:center; }
  .logo   { font-family:Georgia,serif; font-size:26px; font-weight:bold; color:#F5F0E8; letter-spacing:3px; }
  .tag    { font-size:10px; color:rgba(245,240,232,.65); letter-spacing:2.5px; text-transform:uppercase; margin-top:5px; }
  .body   { padding:32px 40px; }
  .greeting { font-family:Georgia,serif; font-size:19px; margin-bottom:14px; }
  .intro  { font-size:14px; line-height:1.75; color:#5A5050; margin-bottom:24px; }
  .sec-label { font-size:9px; font-weight:500; letter-spacing:2.5px; text-transform:uppercase; color:#7A6E6E; border-bottom:1px solid #D9CFC4; padding-bottom:7px; margin-bottom:16px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; background:#F5F0E8; padding:18px; margin-bottom:24px; }
  .info-label { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#7A6E6E; display:block; margin-bottom:3px; }
  .info-value { font-size:13px; font-weight:500; color:#3A3535; }
  .items-table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px; }
  .items-table thead tr { background:#7B2D3E; }
  .items-table th { color:#F5F0E8; font-size:9px; font-weight:500; letter-spacing:1.5px; text-transform:uppercase; padding:9px 12px; text-align:left; }
  .items-table td { padding:11px 12px; border-bottom:1px solid #EDE8DF; color:#3A3535; }
  .items-table tr:nth-child(even) td { background:#FAF7F3; }
  .td-price { font-family:Georgia,serif; font-size:14px; color:#7B2D3E; font-weight:bold; text-align:right; }
  .notice { border-left:3px solid #C9A87C; background:#FFF9F0; padding:14px 18px; margin-bottom:24px; }
  .notice-title { font-size:13px; font-weight:500; color:#7B2D3E; margin-bottom:6px; }
  .notice-text { font-size:13px; line-height:1.7; }
  .contact { text-align:center; border-top:1px solid #D9CFC4; padding-top:22px; margin-top:8px; }
  .contact p { font-size:13px; color:#7A6E6E; margin-bottom:10px; }
  .contact a { color:#7B2D3E; text-decoration:none; font-size:13px; margin:0 10px; }
  .footer { background:#3A3535; padding:22px 40px; text-align:center; }
  .footer-logo { font-family:Georgia,serif; font-size:17px; color:#F5F0E8; letter-spacing:2px; }
  .footer-tag  { font-size:9px; color:rgba(245,240,232,.5); letter-spacing:2px; text-transform:uppercase; margin-top:4px; }
  .footer-info { font-size:11px; color:rgba(245,240,232,.55); margin-top:10px; line-height:1.9; }
</style>
`

const renderHeader = () => `
  <div class="header">
    <div class="logo">QuanNguyenS</div>
    <div class="tag">Dressed for Life. Even at Home.</div>
  </div>
`

const renderItemsTable = (items) => `
  <p class="sec-label">Sản phẩm trong đơn</p>
  <table class="items-table">
    <thead>
      <tr>
        <th>Sản phẩm</th><th>Biến thể</th>
        <th style="text-align:center">SL</th>
        <th style="text-align:right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `
      <tr>
        <td><strong>${i.productName}</strong></td>
        <td style="color:#7A6E6E">${i.variant}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td class="td-price">${vnd(i.totalPrice)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
`

const renderFooter = () => `
  <div class="footer">
    <div class="footer-logo">QuanNguyenS</div>
    <div class="footer-tag">Dressed for Life. Even at Home.</div>
    <div class="footer-info">
      Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội<br>
      0981 753 082 · ducquan16102006@gmail.com
    </div>
  </div>
`

// ════════════════════════════════════════════════════
// EMAIL 1: ĐÃ XÁC NHẬN — shop đã duyệt đơn
// ════════════════════════════════════════════════════
export const sendConfirmedEmail = async (order) => {
  const html = `
<!DOCTYPE html><html lang="vi">
<head><meta charset="UTF-8">${baseStyles}</head>
<body><div class="wrap">
  ${renderHeader()}

  <!-- Banner xanh dương — shop đang xử lý -->
  <div style="background:#E3F2FD;padding:22px 40px;text-align:center;border-left:4px solid #1565C0">
    <div style="font-size:40px">📦</div>
    <div style="font-family:Georgia,serif;font-size:20px;color:#1565C0;margin-top:8px">
      Đơn hàng đã được xác nhận!
    </div>
    <div style="font-size:13px;color:#555;margin-top:5px">
      Chúng tôi đang chuẩn bị hàng cho bạn.
    </div>
    <div style="
      display:inline-block;background:#1565C0;color:#fff;
      font-size:10px;font-weight:500;letter-spacing:1.5px;
      text-transform:uppercase;padding:5px 16px;margin-top:10px
    ">📦 ĐANG CHUẨN BỊ HÀNG</div>
  </div>

  <div class="body">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="intro">
      Đơn hàng <strong style="color:#7B2D3E">#${order.orderId}</strong>
      của bạn đã được QuanNguyenS xác nhận và đang được chuẩn bị.
      Chúng tôi sẽ bàn giao cho đơn vị vận chuyển trong thời gian sớm nhất
      và thông báo cho bạn ngay khi hàng được giao đi.
    </p>

    <p class="sec-label">Thông tin đơn hàng</p>
    <div class="info-grid">
      <div>
        <span class="info-label">Mã đơn hàng</span>
        <span class="info-value" style="color:#7B2D3E">${order.orderId}</span>
      </div>
      <div>
        <span class="info-label">Ngày đặt</span>
        <span class="info-value">${order.orderDateVN}</span>
      </div>
      <div>
        <span class="info-label">Trạng thái</span>
        <span class="info-value" style="color:#1565C0">📦 Đang chuẩn bị</span>
      </div>
      <div>
        <span class="info-label">Tổng tiền</span>
        <span class="info-value" style="color:#7B2D3E;font-family:Georgia,serif;font-size:15px">
          ${vnd(order.total)}
        </span>
      </div>
    </div>

    ${renderItemsTable(order.items)}

    <div class="notice">
      <div class="notice-title">⏱️ Thời gian giao hàng dự kiến</div>
      <div class="notice-text">
        Bạn sẽ nhận được hàng trong <strong>2–4 ngày làm việc</strong>.
        Chúng tôi sẽ gửi email có mã vận đơn ngay khi hàng được giao cho shipper.
      </div>
    </div>

    <p class="sec-label">Địa chỉ giao hàng</p>
    <div style="background:#F5F0E8;padding:16px 18px;margin-bottom:24px;font-size:13px;line-height:1.8">
      <strong>${order.customer.fullName}</strong><br>
      📞 ${order.customer.phone}<br>
      📍 ${order.shipping.fullAddress}
    </div>

    <div class="contact">
      <p>Câu hỏi về đơn hàng? Liên hệ ngay:</p>
      <a href="tel:0981753082">📞 0981 753 082</a>
      <a href="mailto:ducquan16102006@gmail.com">✉️ Email</a>
    </div>
  </div>
  ${renderFooter()}
</div></body></html>
`

  await transporter.sendMail({
    from:    `"QuanNguyenS" <${process.env.GMAIL_USER}>`,
    to:      order.customer.email,
    subject: `📦 QuanNguyenS — Đơn hàng #${order.orderId} đã được xác nhận`,
    html,
  })
  console.log(`✅ Email CONFIRMED → ${order.customer.email}`)
}

// ════════════════════════════════════════════════════
// EMAIL 2: ĐÃ GIAO SHIPPER — kèm tracking number
// ════════════════════════════════════════════════════
export const sendShippedEmail = async (order, { trackingNumber } = {}) => {
  const html = `
<!DOCTYPE html><html lang="vi">
<head><meta charset="UTF-8">${baseStyles}</head>
<body><div class="wrap">
  ${renderHeader()}

  <!-- Banner cam — hàng đang di chuyển -->
  <div style="background:#FFF3E0;padding:22px 40px;text-align:center;border-left:4px solid #E65100">
    <div style="font-size:44px">🚚</div>
    <div style="font-family:Georgia,serif;font-size:22px;color:#E65100;margin-top:8px">
      Đơn hàng đang trên đường đến!
    </div>
    <div style="font-size:13px;color:#555;margin-top:5px">
      Hàng đã được bàn giao cho đơn vị vận chuyển.
    </div>
    <div style="
      display:inline-block;background:#E65100;color:#fff;
      font-size:10px;font-weight:500;letter-spacing:1.5px;
      text-transform:uppercase;padding:5px 16px;margin-top:10px
    ">🚚 ĐANG GIAO HÀNG</div>
  </div>

  <div class="body">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="intro">
      Tin vui! Đơn hàng <strong style="color:#7B2D3E">#${order.orderId}</strong>
      đã được bàn giao cho đơn vị vận chuyển và đang trên đường đến với bạn.
      Vui lòng để ý điện thoại — shipper sẽ gọi trước khi giao.
    </p>

    ${trackingNumber ? `
    <!-- Tracking number highlight -->
    <div style="
      background:#7B2D3E;color:#F5F0E8;
      padding:20px 24px;margin-bottom:24px;text-align:center
    ">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;
                  color:rgba(245,240,232,.7);margin-bottom:8px">
        Mã vận đơn
      </div>
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:bold;
                  letter-spacing:3px">
        ${trackingNumber}
      </div>
      <div style="font-size:11px;color:rgba(245,240,232,.6);margin-top:6px">
        Dùng mã này để tra cứu đơn hàng trên website shipper
      </div>
    </div>` : ''}

    <p class="sec-label">Thông tin đơn hàng</p>
    <div class="info-grid">
      <div>
        <span class="info-label">Mã đơn hàng</span>
        <span class="info-value" style="color:#7B2D3E">${order.orderId}</span>
      </div>
      <div>
        <span class="info-label">Trạng thái</span>
        <span class="info-value" style="color:#E65100">🚚 Đang giao hàng</span>
      </div>
      <div>
        <span class="info-label">Phương thức TT</span>
        <span class="info-value">${order.payment.methodLabel}</span>
      </div>
      <div>
        <span class="info-label">Tổng tiền</span>
        <span class="info-value" style="color:#7B2D3E;font-family:Georgia,serif;font-size:15px">
          ${vnd(order.total)}
        </span>
      </div>
    </div>

    ${renderItemsTable(order.items)}

    <div class="notice">
      <div class="notice-title">📋 Lưu ý khi nhận hàng</div>
      <div class="notice-text">
        ${order.payment.method === 'COD'
          ? `• Chuẩn bị <strong>${vnd(order.total)}</strong> bằng tiền mặt để thanh toán khi nhận<br>`
          : '• Đơn hàng đã thanh toán — không cần chuẩn bị thêm tiền mặt<br>'
        }
        • Kiểm tra kỹ sản phẩm trước khi ký nhận<br>
        • Nếu hàng bị hỏng hoặc sai — từ chối nhận và liên hệ ngay: <strong>0981 753 082</strong>
      </div>
    </div>

    <p class="sec-label">Giao hàng đến</p>
    <div style="background:#F5F0E8;padding:16px 18px;margin-bottom:24px;font-size:13px;line-height:1.8">
      <strong>${order.customer.fullName}</strong><br>
      📞 ${order.customer.phone}<br>
      📍 ${order.shipping.fullAddress}
    </div>

    <div class="contact">
      <p>Cần hỗ trợ về đơn hàng đang giao?</p>
      <a href="tel:0981753082">📞 0981 753 082</a>
      <a href="mailto:ducquan16102006@gmail.com">✉️ Email</a>
    </div>
  </div>
  ${renderFooter()}
</div></body></html>
`

  await transporter.sendMail({
    from:    `"QuanNguyenS" <${process.env.GMAIL_USER}>`,
    to:      order.customer.email,
    subject: `🚚 QuanNguyenS — Đơn hàng #${order.orderId} đang trên đường giao`,
    html,
  })
  console.log(`✅ Email SHIPPED → ${order.customer.email}`)
}

// ════════════════════════════════════════════════════
// EMAIL 3: ĐÃ HỦY — kèm lý do hủy
// ════════════════════════════════════════════════════
export const sendCancelledEmail = async (order, { reason } = {}) => {
  const html = `
<!DOCTYPE html><html lang="vi">
<head><meta charset="UTF-8">${baseStyles}</head>
<body><div class="wrap">
  ${renderHeader()}

  <!-- Banner xám nhạt — thông báo hủy -->
  <div style="background:#FAFAFA;padding:22px 40px;text-align:center;border-left:4px solid #757575">
    <div style="font-size:36px">❌</div>
    <div style="font-family:Georgia,serif;font-size:20px;color:#424242;margin-top:8px">
      Đơn hàng đã được hủy
    </div>
    <div style="font-size:13px;color:#757575;margin-top:5px">
      Mã đơn: <strong>${order.orderId}</strong>
    </div>
  </div>

  <div class="body">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="intro">
      Chúng tôi xin thông báo đơn hàng
      <strong style="color:#7B2D3E">#${order.orderId}</strong> của bạn
      đã được hủy. Chúng tôi rất tiếc vì sự bất tiện này.
    </p>

    <!-- Lý do hủy -->
    ${reason ? `
    <div class="notice" style="border-color:#757575;background:#F5F5F5">
      <div class="notice-title" style="color:#424242">📋 Lý do hủy đơn</div>
      <div class="notice-text" style="color:#616161">${reason}</div>
    </div>` : ''}

    <!-- Đơn hàng đã hủy -->
    <p class="sec-label">Thông tin đơn đã hủy</p>
    <div class="info-grid" style="opacity:0.7">
      <div>
        <span class="info-label">Mã đơn hàng</span>
        <span class="info-value">${order.orderId}</span>
      </div>
      <div>
        <span class="info-label">Ngày đặt</span>
        <span class="info-value">${order.orderDateVN}</span>
      </div>
      <div>
        <span class="info-label">Trạng thái</span>
        <span class="info-value" style="color:#757575">❌ Đã hủy</span>
      </div>
      <div>
        <span class="info-label">Tổng tiền</span>
        <span class="info-value" style="text-decoration:line-through;color:#9E9E9E">
          ${vnd(order.total)}
        </span>
      </div>
    </div>

    ${renderItemsTable(order.items)}

    <!-- Hoàn tiền (nếu đã TT) -->
    ${order.payment.method !== 'COD' ? `
    <div class="notice" style="border-color:#2E7D32;background:#F1F8F1">
      <div class="notice-title" style="color:#2E7D32">💳 Thông tin hoàn tiền</div>
      <div class="notice-text">
        Vì bạn đã thanh toán qua <strong>${order.payment.methodLabel}</strong>,
        số tiền <strong>${vnd(order.total)}</strong> sẽ được hoàn lại
        trong vòng <strong>3–7 ngày làm việc</strong> tùy theo ngân hàng/ví của bạn.
        <br><br>
        Nếu sau 7 ngày chưa nhận được — vui lòng liên hệ: <strong>0981 753 082</strong>
      </div>
    </div>` : ''}

    <!-- Khuyến khích đặt lại -->
    <div style="
      background:#EDD9D0;padding:20px 24px;
      margin-bottom:24px;text-align:center
    ">
      <div style="font-family:Georgia,serif;font-size:16px;color:#3A3535;margin-bottom:8px">
        Bạn vẫn muốn sở hữu sản phẩm này?
      </div>
      <div style="font-size:13px;color:#7A6E6E;margin-bottom:14px">
        Kho hàng của chúng tôi luôn được cập nhật. Đặt lại bất cứ lúc nào!
      </div>
      <a href="${process.env.NEXTAUTH_URL || 'https://quannguyen-s.vercel.app'}/bo-suu-tap"
         style="
           display:inline-block;
           background:#7B2D3E;color:#F5F0E8;
           font-size:11px;font-weight:500;
           text-transform:uppercase;letter-spacing:1.5px;
           padding:12px 28px;text-decoration:none;
         ">
        XEM LẠI BỘ SƯU TẬP
      </a>
    </div>

    <div class="contact">
      <p>Thắc mắc về việc hủy đơn? Liên hệ chúng tôi:</p>
      <a href="tel:0981753082">📞 0981 753 082</a>
      <a href="mailto:ducquan16102006@gmail.com">✉️ Email</a>
    </div>
  </div>
  ${renderFooter()}
</div></body></html>
`

  await transporter.sendMail({
    from:    `"QuanNguyenS" <${process.env.GMAIL_USER}>`,
    to:      order.customer.email,
    subject: `❌ QuanNguyenS — Đơn hàng #${order.orderId} đã được hủy`,
    html,
  })
  console.log(`✅ Email CANCELLED → ${order.customer.email}`)
}
