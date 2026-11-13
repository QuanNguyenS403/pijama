# 🚀 HƯỚNG DẪN TRIỂN KHAI QUANNGUYENS LÊN RENDER.COM & VẬN HÀNH THỰC TẾ

> **Cập nhật quan trọng (13/11/2026):**
> 1. **Gửi Email trên Render gói Free:** Từ ngày **26/09/2025**, Render đã **chặn hoàn toàn cổng SMTP 25/465/587 trên gói Free** ([Render Changelog](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). Vì vậy, trên Render gói Free, bạn **bắt buộc dùng Google Apps Script HTTPS Webhook (`GAS_EMAIL_WEBHOOK_URL` + `GAS_WEBHOOK_SECRET` qua cổng 443 — miễn phí 100%)** hoặc **Resend API (`RESEND_API_KEY`)**, hoặc nâng lên gói Render trả phí (`Starter` $7/tháng) và đặt `EMAIL_ALLOW_SMTP_ON_RENDER=true`.
> 2. **Đồng bộ 2 chiều với Supabase trên Render gói Free (0đ):** Gói Free dùng ổ đĩa tạm (ephemeral disk) — nhưng khi đã cấu hình `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, hệ thống tự động lưu trữ bền vững và khôi phục 2 chiều toàn bộ **Tài khoản khách hàng (`users`), Mã giảm giá Welcome (`vouchers`), và Đơn hàng (`orders`)** ngay khi server khởi động lại sau redeploy hoặc spin-down.
> 3. **Luồng thanh toán VietQR hiện hành:** Khách quét mã VietQR -> tải ảnh chụp màn hình chuyển khoản lên web -> bấm "Hoàn tất thanh toán" -> Chủ shop đối soát và bấm xác nhận tại `/admin/orders` (các biến `BANK_EMAIL_ALLOWED_SENDERS` / `BANK_EMAIL_AUTO_SETTLE` cũ đã ngừng sử dụng).

---

## 📌 PHẦN 1: TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

Hệ thống hoạt động theo mô hình **All-in-One Monolith**:
- **Frontend:** React + Vite được build ra thư mục tĩnh `dist/`.
- **Backend:** Máy chủ Express (Node.js 22) phục vụ `dist/` và cung cấp hệ thống API:
  - Đặt hàng & kiểm tra cự ly COD 30km (`/api/orders/submit`, `/api/shipping/check-cod`).
  - Sinh mã VietQR chuẩn Napas 24/7 (`/api/payment/qr`) & tải ảnh chứng từ có chữ ký bảo mật (`/api/orders/payment-proof`, `/api/orders/submit-qr-payment`).
  - Gửi email xác nhận & OTP qua HTTPS Port 443 (`server/lib/httpsEmailService.js`).
  - Quản trị đơn hàng (`/admin/orders`), Hội viên Loyalty (`/api/loyalty/*`), và Chatbot tư vấn 0đ (`/api/chat`).
  - Kiểm tra sức khỏe tức thì (`/livez`, `/readyz`, `/api/health`).

---

## 📌 PHẦN 2: CẤU HÌNH CẦU GỬI GMAIL QUA GOOGLE APPS SCRIPT (HTTPS 443 — MIỄN PHÍ 100% TRÊN RENDER FREE)

Vì Render gói Free chặn cổng SMTP 465/587, cách gửi Gmail chính chủ `quannguyens403@gmail.com` miễn phí và ổn định nhất là tạo 1 Web App Google Apps Script:

1. Đăng nhập [https://script.google.com](https://script.google.com) bằng tài khoản **`quannguyens403@gmail.com`**.
2. Nhấn **Dự án mới (New Project)**, xóa code mặc định trong `Code.gs` và dán đoạn mã sau:
   ```javascript
   function doPost(e) {
     try {
       var props = PropertiesService.getScriptProperties();
       var expectedSecret = (props.getProperty('GAS_WEBHOOK_SECRET') || '').trim();
       var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
       if (!expectedSecret || payload.secret !== expectedSecret) {
         return jsonOut({ ok: false, error: 'UNAUTHORIZED' });
       }
       var remaining = MailApp.getRemainingDailyQuota();
       if (remaining <= 0) {
         return jsonOut({ ok: false, error: 'QUOTA_EXCEEDED', remainingQuota: 0 });
       }
       var options = {
         name: payload.fromName || 'QuanNguyenS',
         htmlBody: payload.html || payload.text || ''
       };
       if (payload.replyTo) options.replyTo = payload.replyTo;
       GmailApp.sendEmail(payload.to, payload.subject || 'QuanNguyenS', payload.text || '', options);
       return jsonOut({ ok: true, success: true, code: 'OK', remainingQuota: remaining - 1 });
     } catch (err) {
       return jsonOut({ ok: false, success: false, error: String(err && err.message ? err.message : err) });
     }
   }
   function jsonOut(obj) {
     return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Vào **Cài đặt dự án (Project Settings ⚙)** -> **Thuộc tính tập lệnh (Script Properties)** -> Nhấn **Thêm thuộc tính tập lệnh**:
   - **Thuộc tính:** `GAS_WEBHOOK_SECRET`
   - **Giá trị:** Chuỗi bí mật ngẫu nhiên 64 ký tự hex (dùng chung giá trị này cho biến `GAS_WEBHOOK_SECRET` trên Render).
4. Nhấn **Triển khai (Deploy)** -> **Tạo bản triển khai mới (New deployment)**:
   - Chọn loại: **Ứng dụng web (Web app)**.
   - **Thực thi dưới dạng (Execute as):** `Tôi (quannguyens403@gmail.com)`.
   - **Ai có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)`.
   - Nhấn **Triển khai**, cấp quyền Gmail và sao chép URL `https://script.google.com/macros/s/.../exec` dán vào biến `GAS_EMAIL_WEBHOOK_URL` trên Render.

---

## 📌 PHẦN 3: DANH SÁCH BIẾN MÔI TRƯỜNG TRÊN RENDER (ENVIRONMENT VARIABLES)

Tại mục **Environment** của Web Service trên Render Dashboard, cấu hình các biến sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
|---|---|---|
| `NODE_VERSION` | `22.14.0` | **Bắt buộc**: Chạy Node.js 22 LTS |
| `NODE_ENV` | `production` | **Bắt buộc**: Kích hoạt chế độ bảo mật Production |
| `ADMIN_PASSWORD` | `[Mật khẩu quản trị >= 8 ký tự]` | **Bắt buộc**: Mật khẩu đăng nhập `/admin/orders` |
| `ADMIN_SESSION_SECRET` | `[64 ký tự hex độc lập #1]` | **Bắt buộc**: Khóa ký phiên Admin |
| `ORDER_TOKEN_SECRET` | `[64 ký tự hex độc lập #2]` | **Bắt buộc**: Khóa ký `trackingToken` & chữ ký ảnh chứng từ |
| `CUSTOMER_AUTH_SECRET` | `[64 ký tự hex độc lập #3]` | **Bắt buộc**: Khóa bảo mật phiên & link hủy đăng ký khách hàng |
| `JWT_SECRET` | `[64 ký tự hex độc lập #4]` | **Bắt buộc**: Khóa ký JWT Access Token |
| `GAS_EMAIL_WEBHOOK_URL` | `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec` | **Khuyến nghị số 1 (Render Free)**: URL cầu Apps Script HTTPS 443 |
| `GAS_WEBHOOK_SECRET` | `[Khớp với Script Properties]` | **Khuyến nghị số 1 (Render Free)**: Khóa bí mật cầu Apps Script |
| `RESEND_API_KEY` | `re_...` | (Tùy chọn) Gửi qua Resend HTTPS 443 |
| `RESEND_FROM_EMAIL` | `QuanNguyenS <...>` | (Khi dùng Resend) Địa chỉ thuộc tên miền đã có MX & DKIM |
| `GMAIL_USER` | `quannguyens403@gmail.com` | Email thương hiệu mặc định |
| `GMAIL_APP_PASSWORD` | `[16 ký tự App Password mới]` | Chỉ dùng ở Local/VPS hoặc Render trả phí (`EMAIL_ALLOW_SMTP_ON_RENDER=true`) |
| `EMAIL_ALLOW_SMTP_ON_RENDER` | `false` | Đặt `true` chỉ khi đã nâng gói Render trả phí |
| `OWNER_EMAIL` | `quannguyens403@gmail.com` | Email nhận thông báo đơn hàng & ảnh chứng từ |
| `EMAIL_REAL_SEND` | `true` | Cho phép gửi email thật |
| `BANK_CODE` | `VCB` | Ngân hàng Vietcombank |
| `BANK_ACCOUNT_NUMBER` | `1050773506` | Số tài khoản nhận chuyển khoản |
| `BANK_ACCOUNT_NAME` | `NGUYEN DUC QUAN` | Chủ tài khoản |
| `SHOP_NAME` | `QuanNguyenS` | Tên thương hiệu |
| `SHOP_PHONE` | `0973 486 218` | Hotline cửa hàng |
| `SHOP_ADDRESS` | `Hai Bà Trưng, Hà Nội` | Địa chỉ kho/cửa hàng |
| `UNPAID_QR_AUTOCANCEL_HOURS` | `24` (hoặc `0`) | Tự hủy đơn QR bỏ dở chưa tải ảnh CK sau 24 giờ (`0` = tắt) |
| `GOOGLE_CLIENT_ID` | `745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com` | Google Sign-In Client ID |
| `VITE_GOOGLE_CLIENT_ID` | `745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com` | Phải trùng khớp với `GOOGLE_CLIENT_ID` |
| `GOOGLE_SHEET_ID` | `[ID Google Sheet]` | **Khuyến nghị (Render Free 0đ)**: Lưu sổ đơn hàng vĩnh viễn trên Google Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `[Email Service Account]` | **Khuyến nghị (Render Free 0đ)**: Tài khoản dịch vụ Google Sheets |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | **Khuyến nghị (Render Free 0đ)**: Khóa riêng Google Sheets |
| `SUPABASE_URL` | `https://llzcsqxiwnhrjqpdmtdn.supabase.co` | **Bắt buộc trên Render Free**: Đồng bộ 2 chiều tài khoản, voucher & đơn hàng lên Supabase Free |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Service Role Key]` | **Bắt buộc trên Render Free**: Khóa ghi/khôi phục dữ liệu Backend từ Supabase |

---

## 📌 PHẦN 4: BẢO TOÀN DỮ LIỆU 100% MIỄN PHÍ TRÊN RENDER GÓI FREE (0Đ)

Vì Render gói **Free (`plan: free`)** sử dụng ổ đĩa tạm (ephemeral disk — tự xóa file cục bộ khi redeploy hoặc spin-down), để vận hành **hoàn toàn miễn phí (0đ)** mà không mất đơn hàng và tài khoản khách hàng:

1. **Đồng bộ Đơn hàng tức thời lên Google Sheets (Miễn phí 100%):**
   - Tạo bảng tính Google Sheets và chia sẻ quyền **Editor** cho `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - Cấu hình `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` trên Render.
   - Mọi đơn hàng đặt mới, tải ảnh chứng từ, xác nhận thanh toán hoặc hủy đơn đều được ghi ngay lập tức lên Google Sheets.
2. **Đồng bộ Tài khoản & Đơn hàng lên Supabase Free Tier (Miễn phí 100%):**
   - Tạo project miễn phí tại [https://supabase.com](https://supabase.com), mở **SQL Editor** và chạy nội dung file `scripts/supabase-schema.sql` trong repo.
   - Lấy `Project URL` và `service_role secret` (trong **Project Settings -> API**) điền vào `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trên Render.
3. **Nhận Ảnh chứng từ chuyển khoản trực tiếp qua Email Chủ Shop (`OWNER_EMAIL`):**
   - Ngay khi khách tải ảnh chứng từ chuyển khoản lên web, hệ thống lập tức gửi email thông báo kèm link xem ảnh chứng từ có chữ ký bảo mật về `quannguyens403@gmail.com`.
