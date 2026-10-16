# BẢN ĐỒ HỆ THỐNG TOÀN DIỆN (SYSTEM MAP) — QuanNguyenS
*Người thực hiện: A0 Cartographer*
*Thời điểm lập: 16/10/2026*
*Commit cơ sở: `51a7667` (model 30)*
*Nhánh làm việc: `audit-fix/integration`*

---

## 1. BẢNG DANH MỤC 100% ENDPOINT TOÀN HỆ THỐNG

| STT | Method | Đường dẫn API | Vị trí (File:Dòng) | Middleware Xác thực | CSRF Check | Rate Limiter | Schema Validate | Dữ liệu cá nhân trả về | Tác dụng phụ (DB/Sheet/Email/Tiền) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/livez` | `server/index.js:117` | None | None | None | None | Không | Không |
| 2 | `GET` | `/readyz` | `server/index.js:122` | None | None | None | None | Không | Kiểm tra kết nối Sheets, Email, SQLite |
| 3 | `GET` | `/api/health` | `server/index.js:140` | None | None | None | None | Không | Không |
| 4 | `GET` | `/api/health/email` | `server/index.js:152` | None | None | None | None | Không | Gửi verify transporter SMTP |
| 5 | `POST` | `/api/payment/generate-qr` | `server/index.js:185` | None | None | `generateQrLimiter` | Ad-hoc checks | Số tài khoản, tên chủ TK | Không |
| 6 | `GET` | `/api/payment/napas-qr` | `server/index.js:214` | None | None | None | Query params | Số tài khoản, tên chủ TK | Không |
| 7 | `POST` | `/api/payment/ai-verify` | `server/index.js:240` | **None (L-2 🔴)** | None | `submitOrderLimiter` | Regex parsing | Mã đơn, số tiền, tên khách | **Đổi trạng thái ĐÃ THANH TOÁN, gửi email, ghi Sheet** |
| 8 | `POST` | `/api/payment/webhook` | `server/index.js:281` | Webhook Secret / API Key | None | None | Ad-hoc SePay | Mã đơn, giao dịch | Đổi trạng thái PAID, gửi email, ghi Sheet |
| 9 | `GET` | `/api/orders/status` | `server/index.js:287` | **None (T-5 ⚠️)** | None | None | Query `orderId` | Trạng thái TT đơn | Đọc bộ nhớ/disk |
| 10 | `POST` | `/api/payment/confirm` | `server/index.js:294` | `requireAdminAuth` | None | `submitOrderLimiter` | Body `orderId` | Thông tin đơn | Đổi trạng thái PAID, gửi email, ghi Sheet |
| 11 | `POST` | `/api/payment/claim` | `server/index.js:301` | None | None | `submitOrderLimiter` | Body `orderId` | Trạng thái claim | Cập nhật `CUSTOMER_CLAIMED_PAID` |
| 12 | `POST` | `/api/orders/submit` | `server/index.js:323` | Optional Session | None | `submitOrderLimiter` | `pricingValidator`, `stockValidator` | Họ tên, SĐT, Email, Địa chỉ, Mã đơn | Ghi orders_store, Sheet, trừ tồn kho, gửi email (COD) |
| 13 | `POST` | `/api/orders` | `server/index.js:324` | Optional Session | None | `submitOrderLimiter` | Giống submit | Họ tên, SĐT, Email, Địa chỉ | Alias của `/api/orders/submit` |
| 14 | `GET` | `/api/orders/tracking` | `server/index.js:327` | `verifyTrackingToken` | None | None | Query token | Toàn bộ thông tin đơn hàng | Đọc đơn hàng |
| 15 | `GET` | `/api/orders/lookup` | `server/index.js:486` | None | None | `lookupLimiter` | Query query/orderId/phone | Toàn bộ thông tin đơn | Đọc Sheet/Memory |
| 16 | `GET` | `/api/shipping/check-cod` | `server/index.js:591` | None | None | None | Query params | Không | Tính khoảng cách tĩnh (`aiGeoDistanceService`) |
| 17 | `POST` | `/api/shipping/check-cod` | `server/index.js:592` | None | None | None | Body params | Không | Tính khoảng cách tĩnh (`aiGeoDistanceService`) |
| 18 | `GET` | `/api/shipping/viettelpost/track` | `server/index.js:595` | None | None | `lookupLimiter` | Query `trackingCode` | Lịch sử bưu phẩm | Gọi Viettel Post API |
| 19 | `GET` | `/api/orders/events` | `server/index.js:616` | **None (T-5 ⚠️)** | None | None | SSE Stream | **Phát event trạng thái đơn** | Giữ kết nối SSE client |
| 20 | `POST` | `/api/orders/sync-batch` | `server/index.js:621` | None | None | `lookupLimiter` | Body `orderIds` | Trạng thái các đơn | Đọc Sheet/Memory |
| 21 | `POST` | `/api/orders/cancel-request` | `server/index.js:633` | TrackingToken/Session/Sig | None | None | Body orderId, reason | Thông tin đơn | Cập nhật trạng thái CANCELLED, hoàn tồn kho |
| 22 | `POST` | `/api/admin/login` | `server/index.js:707` | Timing-safe Admin pass | None | `adminLoginLimiter` | Body password | Cấp Admin Token | Cấp cookie admin session |
| 23 | `GET` | `/api/admin/orders` | `server/index.js:712` | `requireAdminAuth` | None | None | Query filter | Toàn bộ danh sách đơn hàng | Đọc DB / Sheet |
| 24 | `GET` | `/api/admin/orders/:orderId` | `server/index.js:723` | `requireAdminAuth` | None | None | Param orderId | Chi tiết đơn khách | Đọc đơn |
| 25 | `PATCH` | `/api/admin/orders/:orderId` | `server/index.js:738` | `requireAdminAuth` | None | None | Body updates | Chi tiết đơn khách | Cập nhật trạng thái đơn, ghi Sheet |
| 26 | `POST` | `/api/admin/orders/sync-viettelpost` | `server/index.js:751` | `requireAdminAuth` | None | None | None | Danh sách đơn | Đồng bộ trạng thái từ Viettel Post |
| 27 | `POST` | `/api/admin/orders/:orderId/sync-viettelpost` | `server/index.js:762` | `requireAdminAuth` | None | None | Param orderId | Chi tiết đơn | Đồng bộ 1 đơn từ Viettel Post |
| 28 | `POST` | `/api/shipping/viettelpost/webhook` | `server/index.js:776` | Header `TOKEN` secret | None | None | Body Viettel Post | Mã vận đơn, trạng thái | Cập nhật trạng thái đơn (DELIVERED...) |
| 29 | `GET` | `*` (SPA Fallback) | `server/index.js:859, 867` | None | None | None | None | Không | Phục vụ index.html |
| 30 | `GET` | `/api/auth/config` | `server/lib/authEndpoints.js:103` | None | None | None | None | Client ID công khai | Không |
| 31 | `POST` | `/api/auth/phone/send-otp` | `server/lib/authEndpoints.js:121` | None | None | None | None | Không | Trả về 501 Not Implemented |
| 32 | `POST` | `/api/auth/google` | `server/lib/authEndpoints.js:129` | **None (L-1 🔴)** | None | `oauthRateLimiter` | **Nhận credential hoặc body fallback** | Email, Tên, Token, Voucher | **Tạo tài khoản, cấp cookie phiên, tạo voucher** |
| 33 | `POST` | `/api/auth/facebook` | `server/lib/authEndpoints.js:321` | None (Gated by test mode) | None | `oauthRateLimiter` | `accessToken` / `userID` | Email, Tên, Token, Voucher | Tạo tài khoản, cấp cookie phiên, tạo voucher |
| 34 | `POST` | `/api/auth/verify` | `server/lib/authEndpoints.js:473` | None | None | `verifyRateLimiter` | `accountId`, `code` | Token, User profile, Voucher | Xác minh tài khoản, cấp session cookie |
| 35 | `POST` | `/api/auth/resend` | `server/lib/authEndpoints.js:628` | None | None | `otpRateLimiter` | `accountId` | Masked email/phone | Tạo OTP mới, gửi email/SMS |
| 36 | `GET` | `/api/auth/me` | `server/lib/authEndpoints.js:693` | `customerSessionMiddleware` | None | None | None | Email, Tên, SĐT, Voucher | Đọc thông tin phiên khách hàng |
| 37 | `POST` | `/api/auth/logout` | `server/lib/authEndpoints.js:760` | Optional Session | `verifyCsrfOrigin` | None | None | Không | Xóa cookie phiên |
| 38 | `GET` | `/api/vouchers/validate` | `server/lib/authEndpoints.js:778` | None | None | None | Query `code` | Chiết khấu voucher | Tra cứu voucher |
| 39 | `GET` | `/api/auth/my-voucher` | `server/lib/authEndpoints.js:796` | `requireCustomerAuth` | None | None | None | Mã voucher, trạng thái | Tra cứu voucher của tài khoản |
| 40 | `GET` | `/api/auth/my-orders` | `server/lib/authEndpoints.js:810` | `requireCustomerAuth` | None | None | None | Danh sách đơn hàng cá nhân | Tra cứu đơn của tài khoản |
| 41 | `PATCH` | `/api/auth/preferences` | `server/lib/authEndpoints.js:863` | `requireCustomerAuth` | `verifyCsrfOrigin` | None | Body preferences | Trạng thái preferences | Cập nhật SQLite `marketing_opt_in` |
| 42 | `POST` | `/api/auth/link-email` | `server/lib/authEndpoints.js:881` | `requireCustomerAuth` | `verifyCsrfOrigin` | `otpRateLimiter` | Body email | Masked email | Tạo OTP liên kết email, gửi mail |
| 43 | `POST` | `/api/auth/link-email/verify` | `server/lib/authEndpoints.js:928` | `requireCustomerAuth` | `verifyCsrfOrigin` | `verifyRateLimiter` | Body email, code | Account profile | Cập nhật email tài khoản |
| 44 | `GET` | `/api/auth/unsubscribe` | `server/lib/authEndpoints.js:991` | Unsubscribe Token | None | None | Query token | Thông báo hủy | Cập nhật hủy nhận tin email |
| 45 | `POST` | `/api/auth/unsubscribe` | `server/lib/authEndpoints.js:992` | Unsubscribe Token | None | None | Body token | Thông báo hủy | Cập nhật hủy nhận tin email |
| 46 | `GET` | `/api/admin/broadcast/stats` | `server/lib/authEndpoints.js:995` | `requireAdminAuth` | None | None | None | Thống kê số lượng email opt-in | Đọc SQLite |
| 47 | `POST` | `/api/admin/broadcast` | `server/lib/authEndpoints.js:1011` | `requireAdminAuth` | None | None | Body subject, content | Kết quả broadcast | Gửi email hàng loạt cho khách opt-in |
| 48 | `POST` | `/api/auth/register` | `server/lib/enterpriseAuthEndpoints.js:33` | None | None | None | `RegisterDtoSchema` (zod) | User ID, email, fullName | Tạo user băm Argon2id, session, voucher |
| 49 | `POST` | `/api/auth/login` | `server/lib/enterpriseAuthEndpoints.js:178` | None | None | None | `LoginDtoSchema` (zod) | User ID, token, session | Xác thực Argon2id, xoay refresh token |
| 50 | `POST` | `/api/auth/refresh` | `server/lib/enterpriseAuthEndpoints.js:301` | Refresh Cookie | None | None | None | Access token mới | Xoay refresh token trong DB |
| 51 | `POST` | `/api/auth/otp/send` | `server/lib/enterpriseAuthEndpoints.js:341` | None | None | None | `SendOtpDtoSchema` (zod) | Masked target | Tạo và gửi OTP |
| 52 | `POST` | `/api/auth/otp/verify` | `server/lib/enterpriseAuthEndpoints.js:392` | None | None | None | `VerifyOtpDtoSchema` (zod) | Token xác thực | Xác thực OTP |

---

## 2. BẢN ĐỒ DỮ LIỆU & ĐỒNG BỘ (DATA MAP)

### 2.1 SQLite (`server/data/accounts.db` / `accounts.test.db`)
- Quản lý bởi: `server/lib/accountDb.js` và `server/lib/schemaMigration.js`.
- Chế độ: WAL (`db.pragma('journal_mode = WAL')`).
- Các bảng:
  1. `accounts` (Legacy): id, method, google_id, facebook_id, phone, email, full_name, avatar_url, verified, created_at, updated_at.
  2. `verification_codes` (Legacy): id, account_id, code, target, target_type, expires_at, attempts, used, created_at.
  3. `vouchers`: id, account_id, code, discount_percent, free_shipping, used, used_at, order_id, created_at. (Bao gồm seed mã hệ thống `QNS10`).
  4. `users` (Enterprise): id, email, password_hash (Argon2id), full_name, avatar_url, phone, role, status, verified, verified_at, marketing_email_opt_in, marketing_opt_in_at, last_login_at, created_at, updated_at.
  5. `enterprise_accounts`: id, user_id, provider, provider_account_id, email, created_at, updated_at (FK: users.id).
  6. `enterprise_sessions`: id, user_id, refresh_token_hash, family_id, is_revoked, revoked_at, ip_hash, user_agent_hash, expires_at, created_at, last_used_at (FK: users.id).
  7. `security_audit_logs`: id, user_id, action, status, ip_hash, user_agent_hash, details, created_at.

### 2.2 File JSON cục bộ (`server/data/orders_store.json`, `processed_tx.json`)
- Quản lý bởi: `server/lib/orderPersistence.js`.
- Ghi nguyên tử qua file tạm `.tmp` và `renameSync`.
- Đóng vai trò là nguồn dữ liệu chuẩn trong bộ nhớ RAM (`ordersMap`) và đồng bộ xuống đĩa để bảo toàn sau restart.

### 2.3 Google Sheets (`ORDER_HEADERS` 26 cột)
- Quản lý bởi: `server/lib/googleSheets.js`.
- Sheet ID từ env `GOOGLE_SHEET_ID`.
- Tab `Đơn Hàng`: 26 cột (A-Z).
- Tab `Chi Tiết SP`: 9 cột (A-I).
- Đồng bộ: Bất đối xứng / Background. Lỗi kết nối Google Sheets không được làm sập đơn hàng, có cảnh báo log và có thể rebuild lại qua `npm run rebuild-orders`.

### 2.4 Supabase (`orders` table)
- Quản lý bởi: `server/lib/supabaseClient.js` và `server/lib/orderPersistence.js:syncOrderToSupabase`.
- Chế độ: Background sync không chặn luồng chính (`.catch(()=>{})`).

---

## 3. BẢN ĐỒ LUỒNG NGHIỆP VỤ (WORKFLOW MAP)

1. **Luồng Đặt hàng (Checkout):**
   - Khách duyệt giỏ hàng -> Chọn COD hoặc Chuyển khoản (VietQR).
   - Client gửi `POST /api/orders/submit`.
   - Server validate catalog giá (`pricingValidator`), validate tồn kho (`stockValidator`), tính khoảng cách COD (`distanceService`).
   - Ghi đơn vào RAM + file disk (`orders_store.json`), gọi Google Sheets append, sinh tracking token.
   - Nếu COD: Gửi email khách + email chủ shop ngay lập tức.
   - Nếu Chuyển khoản: Trạng thái đơn `AWAITING_PAYMENT`, sinh mã QR SePay/VietQR. Không gửi email thanh toán.

2. **Luồng Thanh toán (Payment):**
   - Khách quét mã VietQR hoặc SePay.
   - **Đường chuẩn:** SePay Webhook gọi `POST /api/payment/webhook` kèm API Key / Secret. Server so sánh secret, đối soát `orderId` và `amount` khớp 100%, chuyển trạng thái sang `PAID`, vô hiệu hóa QR, gửi email hóa đơn và ghi Sheet.
   - **Đường Admin:** `POST /api/payment/confirm` yêu cầu cookie admin xác thực, kiểm tra đơn hợp lệ rồi kích hoạt `PAID`.
   - **Đường Khách xác nhận:** `POST /api/payment/claim` chỉ đánh dấu `CUSTOMER_CLAIMED_PAID` (chờ đối soát).
   - **Đường Lỗ Hổng 🔴 L-2:** `POST /api/payment/ai-verify` cho phép người dùng tự gửi text, regex đơn giản đổi trạng thái thành `PAID` và gửi email/ghi Sheet mà không có xác thực tài khoản ngân hàng thật!

3. **Luồng Đăng ký / Đăng nhập (Authentication):**
   - **Hệ thống Enterprise:** `/api/auth/register`, `/login`, `/refresh`, `/otp/*` dùng mã hóa Argon2id, JWT + Refresh Token Rotation qua HTTP-only cookies.
   - **Hệ thống OAuth & Legacy:** `/api/auth/google`, `/facebook`, `/verify`, `/me`, `/logout`.
   - **Đường Lỗ Hổng 🔴 L-1:** `/api/auth/google` và `providerOAuth.js` chấp nhận mock token, fallback dữ liệu body không cần chữ ký, cho phép chiếm tài khoản.

4. **Luồng Vận chuyển (Viettel Post):**
   - Đơn hàng xuất kho -> Tạo vận đơn Viettel Post.
   - Viettel Post gọi webhook `POST /api/shipping/viettelpost/webhook` -> Cập nhật sang `DELIVERED`, khóa không cho xóa/hủy đơn.

---

## 4. DANH MỤC BIẾN MÔI TRƯỜNG THỰC DÙNG (ENV CATALOG)

| Tên biến | Nơi sử dụng | Phân loại | Mục đích |
|---|---|---|---|
| `PORT` | `server/index.js` | Core Public | Cổng chạy Express Server (mặc định 3001) |
| `NODE_ENV` | Toàn hệ thống | Core Public | `development`, `production`, `test` |
| `APP_URL` | `server/lib/email*.js`, `authEndpoints.js` | Core Public | URL domain chính của web |
| `ALLOWED_ORIGINS` | `server/index.js` | Core Public | Danh sách CORS domain cho phép |
| `ADMIN_PASSWORD` | `server/lib/adminAuth.js` | Core Secret | Mật khẩu quản trị viên |
| `ADMIN_SESSION_SECRET` | `server/lib/adminAuth.js` | Core Secret | Khóa ký token phiên Admin |
| `ORDER_TOKEN_SECRET` | `server/lib/orderTokenService.js` | Core Secret | Khóa ký token tra cứu đơn hàng |
| `CUSTOMER_AUTH_SECRET` | `server/lib/authCrypto.js` | Core Secret | Khóa HMAC cookie phiên khách hàng |
| `JWT_SECRET` | `server/lib/tokenService.js` | Core Secret | Khóa ký access/refresh token JWT Jose |
| `GOOGLE_SHEET_ID` | `server/lib/googleSheets.js` | Core Public | ID bảng tính Google Sheets |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `server/lib/googleSheets.js` | Core Public | Email service account Google |
| `GOOGLE_PRIVATE_KEY` | `server/lib/googleSheets.js` | Core Secret | Khóa RSA Private Key Google Sheets |
| `GMAIL_USER` | `server/lib/emailConfig.js` | Core Public | Địa chỉ gửi Gmail SMTP |
| `GMAIL_APP_PASSWORD` | `server/lib/emailConfig.js` | Core Secret | Mật khẩu ứng dụng Gmail (16 ký tự) |
| `OWNER_EMAIL` | `server/lib/emailConfig.js`, `emailOwner.js` | Core Public | Email nhận thông báo chủ shop |
| `BANK_CODE` | `server/index.js`, `paymentQrService.js` | Core Public | Mã ngân hàng (VCB/Vietcombank) |
| `BANK_ACCOUNT_NUMBER` | `server/index.js`, `paymentQrService.js` | Core Public | Số tài khoản ngân hàng nhận tiền |
| `BANK_ACCOUNT_NAME` | `server/index.js`, `paymentQrService.js` | Core Public | Tên chủ tài khoản ngân hàng |
| `SEPAY_WEBHOOK_API_KEY` | `server/lib/paymentWebhook.js` | Core Secret | Khóa xác thực Webhook SePay |
| `PAYMENT_WEBHOOK_SECRET` | `server/lib/paymentWebhook.js` | Core Secret | Khóa xác thực Webhook thanh toán |
| `GOOGLE_CLIENT_ID` | `server/lib/authEndpoints.js` | Feature Public | Google OAuth Client ID server-side |
| `VITE_GOOGLE_CLIENT_ID` | Client Vite & server fallback | Feature Public | Google OAuth Client ID client-side |
| `SUPABASE_URL` | `server/lib/supabaseClient.js` | Feature Public | URL kết nối Supabase REST API |
| `SUPABASE_SERVICE_ROLE_KEY` | `server/lib/supabaseClient.js` | Feature Secret | Khóa Service Role Supabase |
| `VIETTELPOST_WEBHOOK_SECRET` | `server/index.js` | Feature Secret | Khóa bí mật webhook Viettel Post |
| `TURNSTILE_SECRET_KEY` | `server/lib/turnstileService.js` | Feature Secret | Khóa bí mật Cloudflare Turnstile |
| `AUTH_TEST_MODE` | `server/lib/authEndpoints.js`, `providerOAuth.js` | Dev Override | Cờ test auth (CẤM Ở PRODUCTION) |

---

## 5. DỮ LIỆU ĐO BASELINE NGUYÊN VĂN (COMMIT 51a7667)

1. **`npm test`**:
   - Tổng số test: 57
   - Pass: 54
   - Fail: 3
   - Chi tiết fail:
     - `tests/customerOAuthAccountCreation.test.js:34:1`: Tên tài khoản Google mong muốn `Google Test User`, thực tế trả về `Quý khách Google`.
     - `tests/enterpriseAuth.test.js:38:3`: Đăng ký tài khoản mong nhận voucher mã `WELCOME10`, thực tế nhận mã động ngẫu nhiên `WELCOME-S4BLTT`.
     - `tests/securityAuditVerification.test.js:59:1` (SEC-02): `/api/auth/google` từ chối request không có credential khi `AUTH_TEST_MODE` tắt (mong 400, nhận 200).
2. **`npm run build`**:
   - Kết quả: Thành công (built in 3.69s).
   - Bundle lớn nhất: `dist/assets/vendor-react-D26dK3r_.js` (417.39 kB │ gzip: 129.11 kB), `dist/assets/vendor-motion-23mDXvl2.js` (152.73 kB │ gzip: 49.63 kB), `dist/assets/Section12Footer-sGG-TN7R.js` (116.65 kB).
   - Ảnh tĩnh lớn nhất: `fabric-macro-Vs9IESCh.jpg` (779 kB), `hero-campaign-CedHOfzA.jpg` (771 kB).
3. **`npm run check-env`**:
   - Trạng thái: Cảnh báo DEV (Đủ điều kiện chạy Dev, thiếu `SEPAY_WEBHOOK_API_KEY`/`PAYMENT_WEBHOOK_SECRET`, `AUTH_TEST_MODE` đang bật).
4. **`npm audit --omit=dev`**:
   - 5 vulnerabilities (4 moderate, 1 high liên quan đến `nodemailer <= 10.0.5` và `uuid < 11.1.1` qua `googleapis`).
5. **Grep kiểm tra chuỗi nhạy cảm**:
   - `1050773506`: Xuất hiện hardcoded trong 12 file (index.js, aiNapasQrService.js, paymentQrService.js, emailCustomer.js, checkoutConfig.js, BankTransferPaymentPage.jsx, OrdersHistoryDrawer.jsx).
   - `mock-google-token`: Xuất hiện hardcoded trong authEndpoints.js, providerOAuth.js, AuthModal.jsx, googleAuth.js, AccountPage.jsx.
   - `quannguyens403@gmail.com`: Xuất hiện trong chính sách hỗ trợ khách hàng, cấu hình email chủ shop, và fallback token.
