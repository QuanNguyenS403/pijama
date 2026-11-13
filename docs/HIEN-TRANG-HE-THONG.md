# Hiện Trạng Hệ Thống QuanNguyenS (`pijama`) — Nguồn Sự Thật Duy Nhất (Single Source of Truth)

> **Cập nhật theo mốc mã nguồn:** `9002bf6` + gói gia cố Go-Live (13/11/2026)
> **Mục đích:** Đồng bộ 100% tài liệu vận hành, kiến trúc thực tế của backend, luồng thanh toán, luồng gửi email, lưu trữ dữ liệu và danh sách biến môi trường đang có hiệu lực trong mã nguồn.

---

## 1. Thông Tin Cửa Hàng Chuẩn Hóa (`server/lib/shopConfig.js`)

| Hạng mục | Giá trị chuẩn | Nơi định nghĩa chính |
|---|---|---|
| Tên thương hiệu | `QuanNguyenS` | `server/lib/shopConfig.js`, `src/data/policies.js` |
| Slogan | `Style To Be Lived In` | `server/lib/shopConfig.js`, `render.yaml` |
| Hotline & Zalo | `0973 486 218` (`https://zalo.me/0973486218`) | `server/lib/shopConfig.js`, `server/lib/chat/liveFacts.js` |
| Email CSKH / Chủ shop | `quannguyens403@gmail.com` | `server/lib/emailAccount.js`, `src/data/policies.js` |
| Địa chỉ kho / cửa hàng | `Hai Bà Trưng, Hà Nội` | `server/lib/shopConfig.js`, `server/lib/aiGeoDistanceService.js` |
| Ngân hàng nhận chuyển khoản | `Vietcombank (VCB)` — STK `1050773506` — `NGUYEN DUC QUAN` | `server/lib/paymentQrService.js`, `src/data/checkoutConfig.js` |
| Chính sách vận chuyển | Freeship đơn từ `500.000đ`; dưới `500.000đ` phí ship `30.000đ`; tách đơn Pre-order cộng `30.000đ` | `src/lib/pricingCalculator.js`, `server/lib/pricingValidator.js` |
| Chính sách COD & VietQR | Ship COD trong bán kính `<= 30km` từ kho `Hai Bà Trưng, Hà Nội`; `> 30km` bắt buộc chuyển khoản VietQR (giảm `10%` trên giá sản phẩm) | `server/apiHandler.js`, `server/lib/aiGeoDistanceService.js` |

### Danh mục sản phẩm hiện hành (`src/data/products.js` 🔒)
1. **`FELIZ SET`** (`id: the-classic-set`, `slug: feliz-set`): `698.000đ` — Sắc Đỏ (Hành Hỏa), Size `S, M`, hàng có sẵn.
2. **`GALAXIA SET`** (`id: the-cafe-look`, `slug: galaxia-set`): `598.000đ` — Caro Navy (Hành Thủy), Size `S, M`, hàng có sẵn.
3. **`THE HEARTH SET`** (`id: the-evening-edit`, `slug: the-hearth-set`): `750.000đ` — Sọc Nâu (Hành Thổ), Size `S, M`, Pre-order 7–10 ngày.

---

## 2. Luồng Thanh Toán Thực Tế (Manual VietQR Verification & COD)

> **Lưu ý quan trọng:** Cơ chế tự động đối soát biến động số dư qua email ngân hàng (`/api/payment/bank-email`) và báo chuyển khoản cũ (`/api/payment/claim`, `/api/payment/ai-verify`) đã **ngừng hoạt động vĩnh viễn (trả HTTP 410 Gone)**.

### 2.1 Luồng Đơn Hàng Chuyển Khoản VietQR (`BANK_TRANSFER`)
1. **Khởi tạo đơn (`POST /api/orders/submit`):**
   - Server kiểm tra giá (`validateOrderPricing`) + tồn kho (`validateOrderStock`) + khóa voucher (`redeemVoucher`) + ghi đơn vào `orderPersistence` trong **một khối đồng bộ nguyên tử (không có `await` xen giữa)** để chống race condition bán vượt (overselling).
   - Đơn khởi tạo ở trạng thái `status: 'AWAITING_PAYMENT'`, `payment.status: 'AWAITING_PAYMENT'`, kèm `trackingToken` ký bằng HMAC-SHA256 (`ORDER_TOKEN_SECRET`).
   - Ghi nhận lên Google Sheets với trạng thái `CHỜ CHUYỂN KHOẢN (VIETQR)`. Chưa gửi email xác nhận đơn hàng lúc này.
2. **Hiển thị mã QR (`GET /api/payment/qr?orderId=...`):**
   - Server sinh mã QR VietQR Napas 24/7 chính xác theo `order.total` và nội dung `QNS <orderId>`.
3. **Khách tải lên ảnh chứng từ chuyển khoản (`POST /api/orders/payment-proof`):**
   - Kiểm tra magic bytes (`JPEG`, `PNG`, `WebP`, tối đa `5MB`), giới hạn tốc độ theo IP và theo `orderId` (tối đa `5` lần tải ảnh/đơn).
   - Yêu cầu `trackingToken` hoặc phiên đăng nhập chủ đơn (chỉ cho phép fallback SĐT ở lần tải ảnh đầu tiên khi đơn chưa có chứng từ, tuyệt đối không cho phép dùng mỗi SĐT để ghi đè ảnh chứng từ đã có).
   - Lưu file vào `UPLOADS_DIR` (mặc định `public/uploads/payment-proofs/proof_<32hex>.<ext>`).
   - **Kiểm soát truy cập chứng từ (`G4`):** Route `/uploads/payment-proofs/:filename` chặn truy cập công khai (`403 Forbidden`); chỉ phục vụ ảnh khi có chữ ký tạm thời hợp lệ (`?exp=...&sig=...`) hoặc header phiên Admin hợp lệ (`Authorization: Bearer <adminToken>` / `x-admin-token`).
   - Gửi email thông báo kèm link ảnh có chữ ký cho chủ shop (`OWNER_EMAIL`).
4. **Khách bấm "Hoàn tất thanh toán" (`POST /api/orders/submit-qr-payment`):**
   - Chuyển `payment.status = 'PENDING_ADMIN_CONFIRMATION'`, `phase = 'WAITING_CONFIRMATION'`, lưu `payment.submittedAt`.
   - Khách được chuyển sang trang `/cho-xac-nhan-thanh-toan?orderId=...` (polling `/api/payment/status` + SSE `/api/orders/events`).
5. **Admin đối soát & xác nhận thủ công (`/admin/orders`):**
   - Chủ shop kiểm tra biến động số dư thực tế + ảnh chứng từ trên trang Quản trị và bấm xác nhận (`POST /api/admin/orders/:orderId/confirm-payment` hoặc `PATCH /api/admin/orders/:orderId` với `action: 'CONFIRM'`).
   - `markOrderPaid()` chuyển `status = 'CONFIRMED'`, `payment.status = 'PAID'`, gửi email xác nhận đơn hàng cho cả khách hàng và chủ shop (đúng 1 lần qua chốt `order.emails.confirmationSentAt`), và cập nhật Google Sheets.
6. **Quản lý tồn kho đơn VietQR bỏ dở (`UNPAID_QR_AUTOCANCEL_HOURS`):**
   - Mặc định `UNPAID_QR_AUTOCANCEL_HOURS=0` (giữ thủ công). Khi đặt `UNPAID_QR_AUTOCANCEL_HOURS=24`, job định kỳ 15 phút tự hủy các đơn `AWAITING_PAYMENT` **chưa tải ảnh chứng từ và chưa bấm thanh toán** quá 24 giờ để nhả tồn kho SKU và nhả voucher.
   - Đơn đã tải ảnh chứng từ (`PENDING_ADMIN_CONFIRMATION`) **tuyệt đối không bao giờ tự hủy**.

---

## 3. Kiến Trúc Gửi Email Giao Dịch (`server/lib/httpsEmailService.js`)

### 3.1 Vì sao cổng SMTP (25/465/587) không dùng được trên Render gói Free?
- Theo thông báo chính thức của Render ([Free web services will no longer allow outbound traffic to SMTP ports](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports), hiệu lực từ **26/09/2025**), mọi kết nối đi ra cổng TCP `25`, `465`, `587` từ Web Service gói Free đều bị chặn ở tầng mạng.
- Do đó, trên Render (`RENDER=true` / `RENDER_EXTERNAL_URL`), hệ thống **tự động vô hiệu hóa tầng Gmail SMTP 465** (trừ khi bạn nâng lên gói Render trả phí và đặt `EMAIL_ALLOW_SMTP_ON_RENDER=true`) để tránh treo 10–15 giây mỗi lần gửi OTP/đơn hàng.

### 3.2 Thứ tự ưu tiên 3 tầng gửi Email trong `sendEmailViaHttps()`
1. **Tầng 1 (Ưu tiên số 1 trên Render Free — Miễn phí 0đ): Google Apps Script HTTPS Webhook (Cổng 443)**
   - Biến môi trường: `GAS_EMAIL_WEBHOOK_URL` + `GAS_WEBHOOK_SECRET`.
   - Gửi qua HTTPS `POST` (cổng 443) tới Google Apps Script của tài khoản `quannguyens403@gmail.com` -> gọi `GmailApp.sendEmail()` với chữ ký DKIM/SPF chính chủ `@gmail.com` (hạn mức 100 người nhận/24h với tài khoản Gmail miễn phí).
2. **Tầng 2 (HTTPS Cổng 443 cho tên miền riêng): Resend HTTP API**
   - Biến môi trường: `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (bắt buộc thuộc tên miền đã xác minh SPF/DKIM và có bản ghi MX hợp lệ).
3. **Tầng 3 (Dành cho Local Dev / VPS / Render gói trả phí): Gmail SMTP (`smtp.gmail.com:465`)**
   - Biến môi trường: `GMAIL_USER` + `GMAIL_APP_PASSWORD` (16 ký tự). Trên Render chỉ kích hoạt khi `EMAIL_ALLOW_SMTP_ON_RENDER=true`.

---

## 4. Kiến Trúc Lưu Trữ & Ổ Đĩa Bền Vững (`G3`)

- **Các tệp dữ liệu cục bộ:**
  - SQLite: `${DATA_DIR}/accounts.db` (mặc định `server/data/accounts.db`) — lưu `accounts`, `users`, `customer_sessions`, `enterprise_sessions`, `vouchers`, `orders`, `payment_transactions`, `product_reviews`, `loyalty_members`, `email_outbox`, `email_suppressions`, `chat_handoffs`, `customer_feedbacks`.
  - JSON Store: `${DATA_DIR}/orders_store.json`, `${DATA_DIR}/processed_tx.json`.
  - Ảnh chứng từ: `${UPLOADS_DIR}` (mặc định `public/uploads/payment-proofs`).
  - Bản sao lưu: `${BACKUP_DIR}` (mặc định `${DATA_DIR}/backups`).
- **Cảnh báo ổ tạm trên Render Free:**
  - Gói `plan: free` của Render dùng ổ đĩa container tạm thời (ephemeral filesystem) — mọi tệp ghi vào ổ đĩa cục bộ sẽ mất khi redeploy hoặc spin-down.
  - Khi chạy Production trên Render mà chưa cấu hình `DATA_DIR` / `PERSISTENT_STORAGE_CONFIRMED=true`, server in cảnh báo nổi bật `🚨 [ERROR: DỮ LIỆU ĐANG Ở Ổ TẠM — SẼ MẤT KHI REDEPLOY]`.
  - Khi nâng lên gói Render **Starter ($7/tháng)** và gắn **Persistent Disk** tại `/var/data/qns`, chỉ cần đặt:
    - `DATA_DIR=/var/data/qns/data`
    - `UPLOADS_DIR=/var/data/qns/uploads/payment-proofs`
    - `BACKUP_DIR=/var/data/qns/backups`
    - `PERSISTENT_STORAGE_CONFIRMED=true`

---

## 5. Bảng Tham Chiếu Biến Môi Trường Đầy Đủ

| Nhóm | Tên biến | Bắt buộc ở Prod? | Mô tả & Giá trị chuẩn |
|---|---|---|---|
| **A. Khóa Bảo Mật Lõi** | `NODE_ENV` | **Bắt buộc** (`Fatal`) | Đặt `production` trên Render/VPS |
| | `ADMIN_PASSWORD` | **Bắt buộc** (`Fatal`) | Mật khẩu đăng nhập `/admin/orders` (`>= 8` ký tự) |
| | `ADMIN_SESSION_SECRET` | **Bắt buộc** (`Fatal`) | Khóa ký token phiên Admin (`>= 32` ký tự, độc lập) |
| | `ORDER_TOKEN_SECRET` | **Bắt buộc** (`Fatal`) | Khóa ký `trackingToken` & URL ảnh chứng từ (`>= 32` ký tự) |
| | `CUSTOMER_AUTH_SECRET` | **Bắt buộc** (`Fatal`) | Khóa ký token hủy đăng ký & phiên khách (`>= 32` ký tự) |
| | `JWT_SECRET` | **Bắt buộc** (`Fatal`) | Khóa ký JWT Access Token (`>= 32` ký tự) |
| **B. Gửi Email** | `GAS_EMAIL_WEBHOOK_URL` | Khuyến nghị số 1 trên Render Free | URL Web App Google Apps Script (`https://script.google.com/macros/s/.../exec`) |
| | `GAS_WEBHOOK_SECRET` | Khuyến nghị số 1 trên Render Free | Chuỗi bí mật xác thực với Apps Script (`>= 32` ký tự) |
| | `RESEND_API_KEY` | Tùy chọn (HTTPS 443) | API Key của Resend (`re_...`) |
| | `RESEND_FROM_EMAIL` | Khi dùng Resend | Địa chỉ gửi thuộc tên miền đã có MX & xác minh DKIM |
| | `GMAIL_USER` | Khuyến nghị | `quannguyens403@gmail.com` |
| | `GMAIL_APP_PASSWORD` | Khi dùng SMTP (Local/VPS/Render Paid) | Mật khẩu ứng dụng Google 16 ký tự (xoay mới sau sự cố lộ khóa) |
| | `EMAIL_ALLOW_SMTP_ON_RENDER` | Tùy chọn | Mặc định `false`. Chỉ đặt `true` nếu đã nâng gói Render trả phí |
| | `OWNER_EMAIL` | Khuyến nghị | `quannguyens403@gmail.com` |
| | `EMAIL_REAL_SEND` | Khuyến nghị | `true` ở Production |
| **C. Lưu Trữ & Vận Hành** | `DATA_DIR` | Khuyến nghị (Persistent Disk) | Đường dẫn thư mục lưu `accounts.db`, `orders_store.json` |
| | `UPLOADS_DIR` | Khuyến nghị (Persistent Disk) | Đường dẫn thư mục lưu ảnh chứng từ chuyển khoản |
| | `BACKUP_DIR` | Tùy chọn | Đường dẫn thư mục lưu bản sao lưu định kỳ |
| | `PERSISTENT_STORAGE_CONFIRMED` | Tùy chọn | Đặt `true` sau khi đã gắn Persistent Disk |
| | `UNPAID_QR_AUTOCANCEL_HOURS` | Tùy chọn | Số giờ tự hủy đơn QR bỏ dở chưa có ảnh CK (mặc định `0`, gợi ý `24`) |
| **D. Đồng Bộ & OAuth** | `GOOGLE_CLIENT_ID` | Khuyến nghị | Client ID Google OAuth (phải khớp `VITE_GOOGLE_CLIENT_ID`) |
| | `VITE_GOOGLE_CLIENT_ID` | Khuyến nghị | Client ID Google OAuth cho Frontend |
| | `GOOGLE_SHEET_ID` | Tùy chọn (Degraded-safe) | ID bảng tính Google Sheets |
| | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Tùy chọn (Degraded-safe) | Email Service Account Google Cloud |
| | `GOOGLE_PRIVATE_KEY` | Tùy chọn (Degraded-safe) | Khóa riêng PEM của Service Account |
| | `SUPABASE_URL` | Tùy chọn | URL dự án Supabase Cloud |
| | `SUPABASE_SERVICE_ROLE_KEY` | Tùy chọn | Service Role Key (chỉ dùng ở Backend) |
| **E. Cấm ở Production** | `AUTH_TEST_MODE` | **CẤM** (`Fatal`) | Tuyệt đối không đặt `true` ở Production |
| | `ORDER_STORE_FILE` / `ACCOUNT_DB_FILE` | **CẤM** (`Fatal`) | Dùng `DATA_DIR` thay cho các biến ghi đè file test |

