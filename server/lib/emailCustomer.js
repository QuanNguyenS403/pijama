import { getTransporter } from './emailConfig.js'

// Helper format VND
const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export const sendCustomerEmail = async (order) => {
  const transporter = getTransporter()
  const isCOD = order.payment?.method === 'COD'
  const isBankTransfer = order.payment?.method === 'BANK_TRANSFER'

  let subject = `✅ QuanNguyenS — Xác nhận đơn hàng #${order.orderId}`
  let html = buildCODEmailHTML(order)

  if (isBankTransfer) {
    subject = `🏦 QuanNguyenS — Thông tin thanh toán VietQR đơn #${order.orderId}`
    html = buildBankTransferEmailHTML(order)
  } else if (!isCOD && order.payment?.status === 'PAID') {
    subject = `🎉 QuanNguyenS — Thanh toán thành công đơn #${order.orderId}`
    html = buildPaidEmailHTML(order)
  }

  await transporter.sendMail({
    from: `"QuanNguyenS Luxury Pajamas" <${process.env.GMAIL_USER}>`,
    to: order.customer.email,
    subject,
    html,
  })

  console.log(`✅ Customer email sent to ${order.customer.email}`)
  return { success: true, recipient: order.customer.email }
}

// ──────────────────────────────────────────────────────────
// Template 3: BANK TRANSFER (VietQR - Chuyển khoản ngân hàng)
// ──────────────────────────────────────────────────────────
export const buildBankTransferEmailHTML = (order) => {
  const transferContent = `${order.customer?.fullName || ''} ${order.customer?.phone || ''}`.trim()
  const qrUrl = `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${order.total}&accountName=NGUYEN%20DUC%20QUAN`
  const hasPreOrder = !!(
    order.hasPreOrder ||
    order.items?.some(
      (i) =>
        i.isPreOrder ||
        i.slug === 'the-evening-edit' ||
        i.productId === 'the-evening-edit' ||
        i.productName?.includes('HEARTH')
    )
  )

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông tin chuyển khoản đơn hàng #${order.orderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #F5F0E8; color: #3A3535; padding: 20px; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E8DFD5; }
    .header { background: #631521; padding: 32px 40px; text-align: center; }
    .header-logo { font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #FAF8F5; letter-spacing: 2px; }
    .header-tagline { font-family: Arial, sans-serif; font-size: 11px; color: rgba(245,240,232,0.7); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
    .banner { background: #FAF5F0; border-left: 4px solid #631521; padding: 20px 40px; text-align: center; }
    .banner-icon { font-size: 36px; }
    .banner-title { font-family: Georgia, serif; font-size: 20px; color: #631521; margin-top: 8px; font-weight: bold; }
    .banner-subtitle { font-family: Arial, sans-serif; font-size: 13px; color: #4A3F38; margin-top: 6px; }
    .content { padding: 32px 40px; }
    .greeting { font-family: Georgia, serif; font-size: 18px; margin-bottom: 16px; color: #1A1614; }
    .body-text { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; margin-bottom: 24px; color: #3A3535; }
    .section-label { font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #631521; border-bottom: 1px solid #E8DFD5; padding-bottom: 8px; margin-bottom: 16px; }
    .qr-card { background: #FAF8F5; border: 1px solid #E8DFD5; padding: 24px; text-align: center; margin-bottom: 24px; border-radius: 4px; }
    .qr-img { max-width: 240px; width: 100%; height: auto; margin: 12px auto; display: block; border-radius: 4px; border: 1px solid #E8DFD5; }
    .bank-grid { display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; text-align: left; background: white; padding: 16px; border: 1px solid #E8DFD5; margin-top: 16px; font-family: Arial, sans-serif; font-size: 13px; }
    .bank-label { color: #8C7E74; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .bank-value { color: #1A1614; font-weight: bold; }
    .bank-highlight { color: #631521; font-size: 15px; font-weight: bold; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #631521; color: #FAF8F5; font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; text-align: left; }
    .items-table td { padding: 12px; font-family: Arial, sans-serif; font-size: 13px; border-bottom: 1px solid #E8DFD5; }
    .items-table tr:nth-child(even) td { background: #FAF8F5; }
    .price-td { font-family: Georgia, serif; font-size: 15px; color: #631521; font-weight: bold; text-align: right; }
    .total-section { background: #FAF5F0; padding: 20px; margin-bottom: 24px; border: 1px solid #E8DFD5; }
    .total-row { display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 13px; color: #4A3F38; margin-bottom: 8px; }
    .total-final { display: flex; justify-content: space-between; border-top: 1px solid #E8DFD5; padding-top: 12px; margin-top: 4px; }
    .total-final .label { font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1A1614; }
    .total-final .amount { font-family: Georgia, serif; font-size: 22px; color: #631521; font-weight: bold; }
    .shipping-info { background: #FAF8F5; padding: 20px; margin-bottom: 24px; border: 1px solid #E8DFD5; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; }
    .contact-section { border-top: 1px solid #E8DFD5; padding-top: 24px; text-align: center; }
    .contact-text { font-family: Arial, sans-serif; font-size: 13px; color: #8C7E74; margin-bottom: 12px; }
    .contact-links a { font-family: Arial, sans-serif; font-size: 13px; color: #631521; text-decoration: none; margin: 0 8px; font-weight: bold; }
    .footer { background: #1A1614; padding: 24px 40px; text-align: center; }
    .footer-logo { font-family: Georgia, serif; font-size: 18px; color: #FAF8F5; letter-spacing: 2px; }
    .footer-tagline { font-family: Arial, sans-serif; font-size: 10px; color: rgba(245,240,232,0.5); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .footer-info { font-family: Arial, sans-serif; font-size: 11px; color: rgba(245,240,232,0.6); margin-top: 12px; line-height: 1.8; }
  </style>
</head>
<body>
<div class="email-wrapper">

  <div class="header">
    <div class="header-logo">QuanNguyenS</div>
    <div class="header-tagline">Dressed for Life. Even at Home.</div>
  </div>

  <div class="banner">
    <div class="banner-icon">🏦</div>
    <div class="banner-title">Đơn hàng đã được ghi nhận!</div>
    <div class="banner-subtitle">
      Cảm ơn bạn đã lựa chọn thanh toán chuyển khoản VietQR (Giảm 10%).<br>
      Vui lòng quét mã QR hoặc chuyển khoản theo thông tin bên dưới.
    </div>
  </div>

  <div class="content">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="body-text">
      Đơn hàng <strong>#${order.orderId}</strong> của bạn đã được tiếp nhận. Sau khi nhận được chuyển khoản, chúng tôi sẽ tiến hành xử lý và giao hàng cho bạn (${hasPreOrder ? '<strong>7–10 ngày làm việc</strong> đối với đơn có sản phẩm Đặt Trước' : '<strong>2–4 ngày làm việc</strong>'}).
    </p>

    ${hasPreOrder ? `
    <div style="background:#FAF5F0;border:1px solid #D4AF37;border-left:4px solid #D4AF37;padding:14px 18px;margin-bottom:20px;border-radius:2px;">
      <strong style="color:#631521;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;">⏱ Lưu ý đơn hàng Đặt Trước (Pre-Order)</strong>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#4A3F38;margin-top:4px;line-height:1.5;">
        Đơn hàng có chứa sản phẩm <strong>THE HEARTH SET</strong> (may đo theo yêu cầu). Thời gian sản xuất và giao hàng dự kiến là <strong>7–10 ngày làm việc</strong>.
      </p>
    </div>` : ''}

    <!-- VIETQR THÔNG TIN CHUYỂN KHOẢN -->
    <p class="section-label">Thông tin thanh toán VietQR</p>
    <div class="qr-card">
      <p style="font-family: Arial, sans-serif; font-size: 12px; color: #631521; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
        Quét mã VietQR để thanh toán nhanh
      </p>
      <img src="${qrUrl}" alt="VietQR Vietcombank" class="qr-img" />
      
      <div class="bank-grid">
        <span class="bank-label">Ngân hàng</span>
        <span class="bank-value">Vietcombank (VCB)</span>
        <span class="bank-label">Số tài khoản</span>
        <span class="bank-highlight">1050773506</span>
        <span class="bank-label">Chủ tài khoản</span>
        <span class="bank-value">NGUYEN DUC QUAN</span>
        <span class="bank-label">Số tiền cần chuyển</span>
        <span class="bank-highlight">${formatVND(order.total)}</span>
        <span class="bank-label">Nội dung CK</span>
        <span class="bank-highlight">${transferContent}</span>
      </div>
    </div>

    <!-- SẢN PHẨM -->
    <p class="section-label">Sản phẩm đã đặt</p>
    <table class="items-table">
      <thead>
        <tr><th>Sản phẩm</th><th>Biến thể</th><th>SL</th><th style="text-align:right">Thành tiền</th></tr>
      </thead>
      <tbody>
        ${(order.items || []).map((item) => `
        <tr>
          <td><strong>${item.productName}</strong></td>
          <td style="color:#7A6E6E">${item.variant}</td>
          <td>x${item.quantity}</td>
          <td class="price-td">${formatVND(item.totalPrice)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <!-- TỔNG TIỀN -->
    <div class="total-section">
      <div class="total-row"><span>Tạm tính</span><span>${formatVND(order.subtotal)}</span></div>
      <div class="total-row"><span>Phí ship</span><span>${order.shippingFee === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}</span></div>
      ${order.discount > 0 ? `<div class="total-row"><span>Giảm giá VietQR (10%)</span><span>- ${formatVND(order.discount)}</span></div>` : ''}
      <div class="total-final">
        <span class="label">Tổng thanh toán</span>
        <span class="amount">${formatVND(order.total)}</span>
      </div>
    </div>

    <!-- ĐỊA CHỈ GIAO HÀNG -->
    <p class="section-label">Địa chỉ nhận hàng</p>
    <div class="shipping-info">
      <strong>${order.customer.fullName}</strong><br>
      📞 ${order.customer.phone}<br>
      📍 ${order.shipping.fullAddress}
      ${order.note ? `<br><br>📝 <em>Ghi chú: ${order.note}</em>` : ''}
    </div>

    <!-- LIÊN HỆ -->
    <div class="contact-section">
      <p class="contact-text">Cần hỗ trợ thanh toán hoặc xác nhận đơn gấp?</p>
      <div class="contact-links">
        <a href="tel:0981753082">📞 Hotline: 0981 753 082</a>
        <a href="mailto:ducquan16102006@gmail.com">✉️ Email hỗ trợ</a>
      </div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-logo">QuanNguyenS</div>
    <div class="footer-tagline">Dressed for Life. Even at Home.</div>
    <div class="footer-info">
      Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội<br>
      0981 753 082 · ducquan16102006@gmail.com
    </div>
  </div>

</div>
</body>
</html>
`
}

// ──────────────────────────────────────────────────────────
// Template 1: COD — chưa thanh toán
// ──────────────────────────────────────────────────────────
export const buildCODEmailHTML = (order) => {
  const hasPreOrder = !!(
    order.hasPreOrder ||
    order.items?.some(
      (i) =>
        i.isPreOrder ||
        i.slug === 'the-evening-edit' ||
        i.productId === 'the-evening-edit' ||
        i.productName?.includes('HEARTH')
    )
  )
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đơn hàng</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #F5F0E8;
      color: #3A3535;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E8DFD5;
    }
    .header {
      background: #631521;
      padding: 32px 40px;
      text-align: center;
    }
    .header-logo {
      font-family: 'Georgia', serif;
      font-size: 28px;
      font-weight: bold;
      color: #FAF8F5;
      letter-spacing: 2px;
    }
    .header-tagline {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: rgba(245,240,232,0.7);
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .status-banner {
      background: #FAF5F0;
      padding: 20px 40px;
      border-left: 4px solid #D4AF37;
      text-align: center;
    }
    .status-icon { font-size: 32px; }
    .status-title {
      font-family: Georgia, serif;
      font-size: 20px;
      color: #1A1614;
      margin-top: 8px;
      font-weight: bold;
    }
    .status-subtitle {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #4A3F38;
      margin-top: 4px;
    }
    .content { padding: 32px 40px; }
    .greeting {
      font-family: Georgia, serif;
      font-size: 18px;
      margin-bottom: 16px;
      color: #1A1614;
    }
    .body-text {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #3A3535;
      margin-bottom: 24px;
    }
    .section-label {
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #631521;
      border-bottom: 1px solid #E8DFD5;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .order-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
      background: #FAF8F5;
      padding: 20px;
      border: 1px solid #E8DFD5;
    }
    .info-item label {
      font-family: Arial, sans-serif;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8C7E74;
      display: block;
      margin-bottom: 3px;
    }
    .info-item value {
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #1A1614;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #631521;
      color: #FAF8F5;
      font-family: Arial, sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 10px 12px;
      text-align: left;
    }
    .items-table td {
      padding: 12px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      border-bottom: 1px solid #E8DFD5;
    }
    .items-table tr:nth-child(even) td { background: #FAF8F5; }
    .price-td {
      font-family: Georgia, serif;
      font-size: 15px;
      color: #631521;
      font-weight: bold;
      text-align: right;
    }
    .total-section {
      background: #FAF5F0;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #E8DFD5;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #4A3F38;
      margin-bottom: 8px;
    }
    .total-final {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #E8DFD5;
      padding-top: 12px;
      margin-top: 4px;
    }
    .total-final .label {
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1A1614;
    }
    .total-final .amount {
      font-family: Georgia, serif;
      font-size: 22px;
      color: #631521;
      font-weight: bold;
    }
    .cod-notice {
      background: #FFF9E6;
      border: 1px solid #D4AF37;
      border-left: 4px solid #D4AF37;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .cod-notice-title {
      font-family: Arial, sans-serif;
      font-size: 13px;
      font-weight: bold;
      color: #631521;
      margin-bottom: 6px;
    }
    .cod-notice-text {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #3A3535;
      line-height: 1.6;
    }
    .shipping-info {
      background: #FAF8F5;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #E8DFD5;
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
    }
    .contact-section {
      border-top: 1px solid #E8DFD5;
      padding-top: 24px;
      text-align: center;
    }
    .contact-text {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #8C7E74;
      margin-bottom: 12px;
    }
    .contact-links a {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #631521;
      text-decoration: none;
      margin: 0 8px;
      font-weight: bold;
    }
    .footer {
      background: #1A1614;
      padding: 24px 40px;
      text-align: center;
    }
    .footer-logo {
      font-family: Georgia, serif;
      font-size: 18px;
      color: #FAF8F5;
      letter-spacing: 2px;
    }
    .footer-tagline {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: rgba(245,240,232,0.5);
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .footer-info {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: rgba(245,240,232,0.6);
      margin-top: 12px;
      line-height: 1.8;
    }
  </style>
</head>
<body>
<div class="email-wrapper">

  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">QuanNguyenS</div>
    <div class="header-tagline">Dressed for Life. Even at Home.</div>
  </div>

  <!-- STATUS BANNER -->
  <div class="status-banner">
    <div class="status-icon">✅</div>
    <div class="status-title">Đơn hàng đã được xác nhận!</div>
    <div class="status-subtitle">
      Cảm ơn bạn đã đặt hàng tại QuanNguyenS.
      Chúng tôi sẽ liên hệ xác nhận lại trước khi giao.
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="body-text">
      Chúng tôi đã nhận được đơn hàng của bạn và đang chuẩn bị xử lý.
      Bạn có thể theo dõi thông tin đơn hàng bên dưới.
      Mọi thắc mắc, hãy liên hệ qua số <strong>0981 753 082</strong>.
    </p>

    <!-- THÔNG TIN ĐƠN -->
    <p class="section-label">Thông tin đơn hàng</p>
    <div class="order-info-grid">
      <div class="info-item">
        <label>Mã đơn hàng</label>
        <value>${order.orderId}</value>
      </div>
      <div class="info-item">
        <label>Ngày đặt</label>
        <value>${order.orderDateVN}</value>
      </div>
      <div class="info-item">
        <label>Phương thức TT</label>
        <value>${order.payment?.methodLabel || 'Thanh toán khi nhận hàng (COD)'}</value>
      </div>
      <div class="info-item">
        <label>Trạng thái</label>
        <value>🟡 Chờ xác nhận</value>
      </div>
    </div>

    <!-- SẢN PHẨM -->
    <p class="section-label">Sản phẩm đã đặt</p>
    <table class="items-table">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Biến thể</th>
          <th>SL</th>
          <th style="text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${(order.items || []).map((item) => `
        <tr>
          <td><strong>${item.productName}</strong></td>
          <td style="color:#7A6E6E">${item.variant}</td>
          <td>x${item.quantity}</td>
          <td class="price-td">${formatVND(item.totalPrice)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TỔNG TIỀN -->
    <div class="total-section">
      <div class="total-row">
        <span>Tạm tính</span>
        <span>${formatVND(order.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>Phí vận chuyển</span>
        <span>${order.shippingFee === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}</span>
      </div>
      ${order.discount > 0 ? `
      <div class="total-row">
        <span>Giảm giá ${order.voucherCode ? '(' + order.voucherCode + ')' : ''}</span>
        <span>- ${formatVND(order.discount)}</span>
      </div>` : ''}
      <div class="total-final">
        <span class="label">Tổng cộng</span>
        <span class="amount">${formatVND(order.total)}</span>
      </div>
    </div>

    <!-- COD NOTICE -->
    <div class="cod-notice">
      <div class="cod-notice-title">📦 Thanh toán khi nhận hàng (COD)</div>
      <div class="cod-notice-text">
        Bạn sẽ thanh toán <strong>${formatVND(order.total)}</strong> bằng tiền mặt
        khi nhận hàng. Vui lòng chuẩn bị đúng số tiền để thuận tiện cho nhân viên giao hàng.
        <br><br>
        Thời gian giao hàng dự kiến: <strong>${hasPreOrder ? '7–10 ngày làm việc (Đơn có sản phẩm Đặt Trước)' : '2–4 ngày làm việc'}</strong> kể từ ngày xác nhận.
      </div>
    </div>
    ${hasPreOrder ? `
    <div style="background:#FAF5F0;border:1px solid #D4AF37;border-left:4px solid #D4AF37;padding:14px 18px;margin-bottom:20px;border-radius:2px;">
      <strong style="color:#631521;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;">⏱ Lưu ý sản phẩm Đặt Trước</strong>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#4A3F38;margin-top:4px;line-height:1.5;">
        Sản phẩm <strong>THE HEARTH SET</strong> đang được may đo kỹ lưỡng theo đơn của bạn. Toàn bộ kiện hàng sẽ được vận chuyển đồng bộ ngay khi hoàn tất.
      </p>
    </div>` : ''}

    <!-- ĐỊA CHỈ GIAO HÀNG -->
    <p class="section-label">Địa chỉ giao hàng</p>
    <div class="shipping-info">
      <strong>${order.customer.fullName}</strong><br>
      📞 ${order.customer.phone}<br>
      📍 ${order.shipping.fullAddress}
      ${order.note ? `<br><br>📝 <em>Ghi chú: ${order.note}</em>` : ''}
    </div>

    <!-- LIÊN HỆ -->
    <div class="contact-section">
      <p class="contact-text">Cần hỗ trợ? Chúng tôi luôn sẵn sàng giúp bạn.</p>
      <div class="contact-links">
        <a href="tel:0981753082">📞 0981 753 082</a>
        <a href="mailto:ducquan16102006@gmail.com">✉️ Email hỗ trợ</a>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-logo">QuanNguyenS</div>
    <div class="footer-tagline">Dressed for Life. Even at Home.</div>
    <div class="footer-info">
      Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội<br>
      0981 753 082 · ducquan16102006@gmail.com
    </div>
  </div>

</div>
</body>
</html>
`
}

// ──────────────────────────────────────────────────────────
// Template 2: ĐÃ THANH TOÁN (VNPAY / MoMo / Chuyển khoản xác nhận)
// ──────────────────────────────────────────────────────────
export const buildPaidEmailHTML = (order) => {
  const hasPreOrder = !!(
    order.hasPreOrder ||
    order.items?.some(
      (i) =>
        i.isPreOrder ||
        i.slug === 'the-evening-edit' ||
        i.productId === 'the-evening-edit' ||
        i.productName?.includes('HEARTH')
    )
  )
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt hàng thành công</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #F5F0E8; color: #3A3535; padding: 20px; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E8DFD5; }
    .header { background: #631521; padding: 32px 40px; text-align: center; }
    .header-logo { font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #FAF8F5; letter-spacing: 2px; }
    .header-tagline { font-family: Arial, sans-serif; font-size: 11px; color: rgba(245,240,232,0.7); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
    .paid-banner { background: #E8F5E9; border-left: 4px solid #2E7D32; padding: 20px 40px; text-align: center; }
    .paid-icon { font-size: 40px; }
    .paid-title { font-family: Georgia, serif; font-size: 22px; color: #2E7D32; margin-top: 8px; font-weight: bold; }
    .paid-subtitle { font-family: Arial, sans-serif; font-size: 13px; color: #4A3F38; margin-top: 6px; }
    .paid-badge {
      display: inline-block;
      background: #2E7D32;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 14px;
      margin-top: 10px;
      border-radius: 2px;
    }
    .content { padding: 32px 40px; }
    .greeting { font-family: Georgia, serif; font-size: 18px; margin-bottom: 16px; color: #1A1614; }
    .body-text { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; margin-bottom: 24px; color: #3A3535; }
    .section-label { font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #631521; border-bottom: 1px solid #E8DFD5; padding-bottom: 8px; margin-bottom: 16px; }
    .order-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; background: #FAF8F5; padding: 20px; border: 1px solid #E8DFD5; }
    .info-item label { font-family: Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8C7E74; display: block; margin-bottom: 3px; }
    .info-item value { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #1A1614; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table th { background: #631521; color: #FAF8F5; font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 10px 12px; text-align: left; }
    .items-table td { padding: 12px; font-family: Arial, sans-serif; font-size: 13px; border-bottom: 1px solid #E8DFD5; }
    .items-table tr:nth-child(even) td { background: #FAF8F5; }
    .price-td { font-family: Georgia, serif; font-size: 15px; color: #631521; font-weight: bold; text-align: right; }
    .total-section { background: #FAF5F0; padding: 20px; margin-bottom: 24px; border: 1px solid #E8DFD5; }
    .total-row { display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 13px; color: #4A3F38; margin-bottom: 8px; }
    .total-final { display: flex; justify-content: space-between; border-top: 1px solid #E8DFD5; padding-top: 12px; margin-top: 4px; }
    .total-final .label { font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1A1614; }
    .total-final .amount { font-family: Georgia, serif; font-size: 22px; color: #631521; font-weight: bold; }
    .shipping-info { background: #FAF8F5; padding: 20px; margin-bottom: 24px; border: 1px solid #E8DFD5; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; }
    .contact-section { border-top: 1px solid #E8DFD5; padding-top: 24px; text-align: center; }
    .contact-text { font-family: Arial, sans-serif; font-size: 13px; color: #8C7E74; margin-bottom: 12px; }
    .contact-links a { font-family: Arial, sans-serif; font-size: 13px; color: #631521; text-decoration: none; margin: 0 8px; font-weight: bold; }
    .footer { background: #1A1614; padding: 24px 40px; text-align: center; }
    .footer-logo { font-family: Georgia, serif; font-size: 18px; color: #FAF8F5; letter-spacing: 2px; }
    .footer-tagline { font-family: Arial, sans-serif; font-size: 10px; color: rgba(245,240,232,0.5); letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .footer-info { font-family: Arial, sans-serif; font-size: 11px; color: rgba(245,240,232,0.6); margin-top: 12px; line-height: 1.8; }
  </style>
</head>
<body>
<div class="email-wrapper">

  <div class="header">
    <div class="header-logo">QuanNguyenS</div>
    <div class="header-tagline">Dressed for Life. Even at Home.</div>
  </div>

  <!-- PAID SUCCESS BANNER -->
  <div class="paid-banner">
    <div class="paid-icon">🎉</div>
    <div class="paid-title">Thanh toán thành công!</div>
    <div class="paid-subtitle">
      Đơn hàng của bạn đã được thanh toán và xác nhận.<br>
      Chúng tôi đang chuẩn bị hàng và sẽ giao trong thời gian sớm nhất.
    </div>
    <div class="paid-badge">✓ ĐÃ THANH TOÁN</div>
  </div>

  <div class="content">
    <p class="greeting">Xin chào ${order.customer.fullName},</p>
    <p class="body-text">
      Chúng tôi đã nhận được thanh toán của bạn qua <strong>${order.payment?.methodLabel || 'Cổng thanh toán'}</strong>.
      Đơn hàng đã được xác nhận và đang được chuẩn bị chu đáo. Bạn sẽ nhận được hàng trong
      <strong>${hasPreOrder ? '7–10 ngày làm việc (Đơn có sản phẩm Đặt Trước)' : '2–4 ngày làm việc'}</strong>.
    </p>

    ${hasPreOrder ? `
    <div style="background:#FAF5F0;border:1px solid #D4AF37;border-left:4px solid #D4AF37;padding:14px 18px;margin-bottom:20px;border-radius:2px;">
      <strong style="color:#631521;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;">⏱ Lưu ý sản phẩm Đặt Trước</strong>
      <p style="font-family:Arial,sans-serif;font-size:13px;color:#4A3F38;margin-top:4px;line-height:1.5;">
        Sản phẩm <strong>THE HEARTH SET</strong> đang được may đo theo đơn đặt của bạn. Chúng tôi sẽ thông báo ngay khi kiện hàng bắt đầu được chuyển phát.
      </p>
    </div>` : ''}

    <p class="section-label">Thông tin đơn hàng</p>
    <div class="order-info-grid">
      <div class="info-item">
        <label>Mã đơn hàng</label>
        <value>${order.orderId}</value>
      </div>
      <div class="info-item">
        <label>Ngày đặt</label>
        <value>${order.orderDateVN}</value>
      </div>
      <div class="info-item">
        <label>Phương thức TT</label>
        <value>${order.payment?.methodLabel}</value>
      </div>
      <div class="info-item">
        <label>Trạng thái TT</label>
        <value style="color:#2E7D32">✅ Đã thanh toán</value>
      </div>
    </div>

    <p class="section-label">Sản phẩm đã đặt</p>
    <table class="items-table">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Biến thể</th>
          <th>SL</th>
          <th style="text-align:right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${(order.items || []).map((item) => `
        <tr>
          <td><strong>${item.productName}</strong></td>
          <td style="color:#7A6E6E">${item.variant}</td>
          <td>x${item.quantity}</td>
          <td class="price-td">${formatVND(item.totalPrice)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row"><span>Tạm tính</span><span>${formatVND(order.subtotal)}</span></div>
      <div class="total-row"><span>Phí vận chuyển</span><span>${order.shippingFee === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}</span></div>
      ${order.discount > 0 ? `<div class="total-row"><span>Giảm giá</span><span>- ${formatVND(order.discount)}</span></div>` : ''}
      <div class="total-final">
        <span class="label">Đã thanh toán</span>
        <span class="amount">${formatVND(order.total)}</span>
      </div>
    </div>

    <p class="section-label">Địa chỉ giao hàng</p>
    <div class="shipping-info">
      <strong>${order.customer.fullName}</strong><br>
      📞 ${order.customer.phone}<br>
      📍 ${order.shipping.fullAddress}
      ${order.note ? `<br><br>📝 <em>Ghi chú: ${order.note}</em>` : ''}
    </div>

    <div class="contact-section">
      <p class="contact-text">Cần hỗ trợ sau mua? Chúng tôi luôn sẵn sàng.</p>
      <div class="contact-links">
        <a href="tel:0981753082">📞 0981 753 082</a>
        <a href="mailto:ducquan16102006@gmail.com">✉️ Email hỗ trợ</a>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-logo">QuanNguyenS</div>
    <div class="footer-tagline">Dressed for Life. Even at Home.</div>
    <div class="footer-info">
      Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội<br>
      0981 753 082 · ducquan16102006@gmail.com
    </div>
  </div>

</div>
</body>
</html>
`
}

