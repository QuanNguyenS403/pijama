# BÁO CÁO KIỂM TOÁN HỆ THỐNG TOÀN DIỆN (AUDIT REPORT) — QuanNguyenS
*Người thực hiện: Chief Auditor (Hợp nhất từ A0–A11, Verifier & Skeptic)*
*Thời điểm phát hành: 16/10/2026*
*Commit cơ sở: `51a7667` (model 30)*
*Nhánh làm việc: `audit-fix/integration`*

---

## 1. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

> **KẾT LUẬN THẲNG:**
> **HỆ THỐNG CHƯA ĐỦ ĐIỀU KIỆN ĐỂ BÁN HÀNG THẬT TRÊN PRODUCTION.**
> Việc mở bán ngay lúc này sẽ đối mặt với rủi ro tài chính và an ninh cực kỳ nghiêm trọng, bị chặn bởi **3 lỗ hổng chí mạng (P0)**:
> 1. **Gian lận thanh toán (L-2 🔴):** Bất kỳ ai cũng có thể tự dán một tin nhắn biến động số dư giả vào ô nhập tại trang thanh toán để được hệ thống tự động đổi trạng thái đơn thành **ĐÃ THANH TOÁN (PAID / CONFIRMED)** và kích hoạt gửi hàng miễn phí mà không hề trả tiền thật.
> 2. **Chiếm đoạt tài khoản bất kỳ (L-1 🔴):** API đăng nhập Google tự sinh token giả từ dữ liệu body, cho phép bất kỳ ai chiếm đoạt tài khoản của khách hàng hoặc thậm chí của chính **Chủ Shop (`quannguyens403@gmail.com`)** chỉ bằng cách biết email.
> 3. **Thao túng tài khoản nhận tiền (T-4 🔴):** API `/api/payment/generate-qr` chấp nhận số tài khoản ngân hàng tùy ý từ client, tạo cơ hội cho kẻ gian chuyển hướng dòng tiền mua hàng về tài khoản cá nhân.
>
> Ngoài ra, hệ thống đang tồn tại **3 unit test fail** và **lỗ hổng nghe lén đơn hàng thời gian thực qua SSE (T-5 🟠)**. Cần hoàn tất Băng chuyền sửa lỗi Pha D trước khi đưa vào vận hành thực tế.

---

## 2. BẢNG THỐNG KÊ PHÁT HIỆN THEO MỨC ĐỘ & KHU VỰC

| Khu vực kiểm toán | 🔴 P0 (Chí mạng) | 🟠 P1 (Nghiêm trọng) | 🟡 P2 (Trung bình) | ⚪ P3 (Nhỏ / Tốt) | Tổng cộng |
|---|:---:|:---:|:---:|:---:|:---:|
| **Frontend (A1, A2)** | 2 (A1-001, A1-002) | 2 (A1-003, A2-001) | 2 (A1-004, A2-002) | 1 (A2-003) | 7 |
| **Backend & Orders (A3, A4)** | 1 (A4-001) | 2 (A3-001, A4-002) | 2 (A3-003, A4-003) | 0 | 5 |
| **Auth & Session (A5)** | 1 (A5-001) | 2 (A5-002, A5-003) | 1 (A5-004) | 1 (A5-005) | 5 |
| **Payment & Fraud (A6)** | 1 (A6-001) | 0 | 1 (A6-002) | 1 (A6-003) | 3 |
| **Database & Integrity (A7)** | 0 | 1 (A7-001) | 1 (A7-002) | 0 | 2 |
| **AppSec Red Team (A8)** | 0 (Gộp vào L1/L2) | 3 (A8-003, A8-004, A8-005) | 0 | 0 | 3 |
| **Config, DevOps, Integrations (A9, A10)** | 0 | 2 (A9-001, A10-002) | 2 (A9-002, A9-003) | 1 (A10-001) | 5 |
| **QA & Test Coverage (A11)** | 0 | 1 (A11-001) | 0 | 0 | 1 |
| **TỔNG HỢP TOÀN HỆ THỐNG** | **3 (L-1, L-2, T-4)** | **9** | **8** | **4** | **24** |

---

## 3. BẢNG ĐÁNH GIÁ 100% ENDPOINT TOÀN HỆ THỐNG (52/52 ENDPOINTS)

| STT | Method | Endpoint | Xác thực | Rate Limit | Đánh giá an ninh & Kết quả kiểm toán | Trạng thái |
|---|---|---|---|---|---|:---:|
| 1 | `GET` | `/livez` | Không | Không | Endpoint kiểm tra sống của tiến trình, an toàn | ✅ PASS |
| 2 | `GET` | `/readyz` | Không | Không | Endpoint kiểm tra sẵn sàng, kết nối dịch vụ tốt | ✅ PASS |
| 3 | `GET` | `/api/health` | Không | Không | Trả trạng thái cơ bản của hệ thống | ✅ PASS |
| 4 | `GET` | `/api/health/email` | Không | Không | Kiểm tra transporter email (chỉ đọc) | ✅ PASS |
| 5 | `POST` | `/api/payment/generate-qr` | Không | Có | **LỖ HỔNG T-4 (P0): Nhận STK/ngân hàng từ client body** | ❌ FAIL (P0) |
| 6 | `GET` | `/api/payment/napas-qr` | Không | Không | Tạo ảnh QR trực tiếp | ⚠️ PASS (P2: STK hardcode) |
| 7 | `POST` | `/api/payment/ai-verify` | Không | Có | **LỖ HỔNG L-2 (P0): Khách tự nhập SMS giả đổi trạng thái sang PAID** | ❌ FAIL (P0) |
| 8 | `POST` | `/api/payment/webhook` | Webhook Secret | Không | Xử lý SePay Webhook chuẩn, so sánh hằng thời gian an toàn | ✅ PASS |
| 9 | `GET` | `/api/orders/status` | Không | Không | **T-5: Thiếu rate limiter, cho phép brute-force mã đơn** | ⚠️ CẦN SỬA (P2) |
| 10 | `POST` | `/api/payment/confirm` | Admin Auth | Có | Xác nhận thanh toán thủ công chuẩn admin | ✅ PASS |
| 11 | `POST` | `/api/payment/claim` | Không | Có | Khách báo chuyển khoản, chỉ đặt cờ CLAIMED, an toàn | ✅ PASS |
| 12 | `POST` | `/api/orders/submit` | Session tùy chọn | Có | Đặt đơn chuẩn, validate giá + tồn kho chặt chẽ | ✅ PASS |
| 13 | `POST` | `/api/orders` | Session tùy chọn | Có | Alias an toàn của submit | ✅ PASS |
| 14 | `GET` | `/api/orders/tracking` | Token tra cứu | Không | Kiểm tra tracking token HMAC hợp lệ | ✅ PASS |
| 15 | `GET` | `/api/orders/lookup` | Không | Có | Tra cứu đơn hàng, đã chặn tìm kiếm mờ (SEC-01) | ✅ PASS |
| 16 | `GET` | `/api/shipping/check-cod` | Không | Không | Tính khoảng cách tĩnh 30km (GET) | ✅ PASS |
| 17 | `POST` | `/api/shipping/check-cod` | Không | Không | Tính khoảng cách tĩnh 30km (POST) | ✅ PASS |
| 18 | `GET` | `/api/shipping/viettelpost/track` | Không | Có | Tra cứu vận đơn Viettel Post | ✅ PASS |
| 19 | `GET` | `/api/orders/events` | Không | Không | **LỖ HỔNG T-5 (P1): Cho phép client ẩn danh nghe lén toàn bộ đơn qua SSE** | ❌ FAIL (P1) |
| 20 | `POST` | `/api/orders/sync-batch` | Không | Có | Đồng bộ trạng thái đơn hàng | ✅ PASS |
| 21 | `POST` | `/api/orders/cancel-request` | Token/SĐT | Không | **Hủy đơn bằng đuôi SĐT 9 số lỏng lẻo** | ⚠️ CẦN SỬA (P2) |
| 22 | `POST` | `/api/admin/login` | So sánh mật khẩu | Có | Xác thực Admin băm SHA-256 constant-time | ✅ PASS |
| 23 | `GET` | `/api/admin/orders` | Admin Auth | Không | Xem danh sách đơn Admin, yêu cầu session | ✅ PASS |
| 24 | `GET` | `/api/admin/orders/:orderId` | Admin Auth | Không | Xem chi tiết đơn Admin, yêu cầu session | ✅ PASS |
| 25 | `PATCH` | `/api/admin/orders/:orderId` | Admin Auth | Không | Cập nhật đơn Admin, yêu cầu session | ✅ PASS |
| 26 | `POST` | `/api/admin/orders/sync-viettelpost` | Admin Auth | Không | Đồng bộ Viettel Post Admin, yêu cầu session | ✅ PASS |
| 27 | `POST` | `/api/admin/orders/:id/sync` | Admin Auth | Không | Đồng bộ 1 đơn Viettel Post Admin | ✅ PASS |
| 28 | `POST` | `/api/shipping/viettelpost/webhook` | Token tùy chọn | Không | **Mở cửa không xác thực nếu thiếu secret env** | ❌ FAIL (P1) |
| 29 | `GET` | `*` (SPA Fallback) | Không | Không | Phục vụ index.html tĩnh an toàn | ✅ PASS |
| 30 | `GET` | `/api/auth/config` | Không | Không | Trả cấu hình public client id | ✅ PASS |
| 31 | `POST` | `/api/auth/phone/send-otp` | Không | Không | Trả về 501 Not Implemented an toàn | ✅ PASS |
| 32 | `POST` | `/api/auth/google` | Không | Có | **LỖ HỔNG L-1 (P0): Nhận mock token & fallback body chiếm tài khoản** | ❌ FAIL (P0) |
| 33 | `POST` | `/api/auth/facebook` | Gated test mode | Có | Đã được khóa sau cờ AUTH_TEST_MODE | ✅ PASS |
| 34 | `POST` | `/api/auth/verify` | Không | Có | Xác minh mã kích hoạt tài khoản | ✅ PASS |
| 35 | `POST` | `/api/auth/resend` | Không | Có | Gửi lại mã xác minh, có rate limit | ✅ PASS |
| 36 | `GET` | `/api/auth/me` | Session | Không | Lấy thông tin tài khoản hiện tại | ✅ PASS |
| 37 | `POST` | `/api/auth/logout` | Session | CSRF Origin | Đăng xuất và xóa cookie phiên an toàn | ✅ PASS |
| 38 | `GET` | `/api/vouchers/validate` | Không | Không | Kiểm tra tính hợp lệ của voucher | ✅ PASS |
| 39 | `GET` | `/api/auth/my-voucher` | Customer Auth | Không | Xem voucher cá nhân | ✅ PASS |
| 40 | `GET` | `/api/auth/my-orders` | Customer Auth | Không | Xem đơn hàng cá nhân, cách ly tài khoản chuẩn | ✅ PASS |
| 41 | `PATCH` | `/api/auth/preferences` | Customer Auth | CSRF Origin | Cập nhật tùy chọn nhận email | ✅ PASS |
| 42 | `POST` | `/api/auth/link-email` | Customer Auth | CSRF Origin | Gửi mã liên kết email mới | ✅ PASS |
| 43 | `POST` | `/api/auth/link-email/verify` | Customer Auth | CSRF Origin | Xác minh liên kết email mới | ✅ PASS |
| 44 | `GET` | `/api/auth/unsubscribe` | Token hủy tin | Không | Hủy nhận email marketing qua GET | ✅ PASS |
| 45 | `POST` | `/api/auth/unsubscribe` | Token hủy tin | Không | Hủy nhận email marketing qua POST | ✅ PASS |
| 46 | `GET` | `/api/admin/broadcast/stats` | Admin Auth | Không | Thống kê số lượng email opt-in | ✅ PASS |
| 47 | `POST` | `/api/admin/broadcast` | Admin Auth | Không | Gửi email hàng loạt cho khách opt-in | ✅ PASS |
| 48 | `POST` | `/api/auth/register` | Không | Rate limit | Đăng ký tài khoản mật khẩu Argon2id, Turnstile | ✅ PASS |
| 49 | `POST` | `/api/auth/login` | Không | Rate limit | Đăng nhập tài khoản Argon2id, Turnstile | ✅ PASS |
| 50 | `POST` | `/api/auth/refresh` | Refresh Cookie | Không | Xoay vòng Refresh Token Rotation chuẩn | ✅ PASS |
| 51 | `POST` | `/api/auth/otp/send` | Không | Không | Gửi OTP đăng nhập doanh nghiệp | ✅ PASS |
| 52 | `POST` | `/api/auth/otp/verify` | Không | Không | Xác minh OTP đăng nhập doanh nghiệp | ✅ PASS |

---

## 4. CHI TIẾT TỪNG PHÁT HIỆN CẦN XỬ LÝ (THEO THỨ TỰ ƯU TIÊN)

### 🔴 NHÓM P0 — RỦI RO CHÍ MẠNG (XỬ LÝ Ở LÀN 0)

#### [P0-1] L-1: Chiếm đoạt tài khoản bất kỳ qua `POST /api/auth/google` và `providerOAuth.js`
- **Vị trí:** `server/lib/authEndpoints.js:129-165`, `server/lib/providerOAuth.js:20-40, 70-85`, `src/pages/AccountPage.jsx:834-865`
- **Tác động:** Kẻ tấn công chỉ cần biết email là có thể đăng nhập vào tài khoản của bất kỳ ai (kể cả chủ shop `quannguyens403@gmail.com`), xem đơn hàng cá nhân và nhận voucher chào mừng.
- **Trạng thái thẩm tra:** `CONFIRMED` (Tái hiện 100% qua test `SEC-02`).
- **Phản biện Skeptic:** `SURVIVES` (Không có middleware nào chặn fallback này).

#### [P0-2] L-2: Gian lận thanh toán đơn hàng qua `POST /api/payment/ai-verify` và `BankTransferPaymentPage.jsx`
- **Vị trí:** `server/index.js:240-279`, `server/lib/aiNapasQrService.js:246-325`, `server/lib/paymentWebhook.js:306-390`, `src/pages/BankTransferPaymentPage.jsx:173, 745-770`
- **Tác động:** Khách hàng tự nhập SMS giả mạo, server dùng regex đơn giản đổi trạng thái đơn sang `PAID` và `CONFIRMED`, kích hoạt gửi email hóa đơn và ghi Sheet mà không có tiền vào tài khoản thật.
- **Trạng thái thẩm tra:** `CONFIRMED` (Tái hiện 100% bằng PoC gửi request mẫu).
- **Phản biện Skeptic:** `SURVIVES` (Code thực tế đổi thẳng sang PAID và CONFIRMED mà không cần webhook ngân hàng).

#### [P0-3] T-4: Thao túng tài khoản thụ hưởng qua `POST /api/payment/generate-qr`
- **Vị trí:** `server/index.js:185-206`
- **Tác động:** Server chấp nhận `accountNumber`, `bankCode`, `accountName` từ client body, cho phép tạo mã QR nhận tiền vào tài khoản của kẻ gian.
- **Trạng thái thẩm tra:** `CONFIRMED`.
- **Phản biện Skeptic:** `SURVIVES`.

---

### 🟠 NHÓM P1 — LỖI CHỨC NĂNG CỐT LÕI & AN NINH CAO (LÀN 1 VÀ 2)

#### [P1-1] T-5: Rò rỉ dữ liệu đơn hàng toàn hệ thống qua SSE `/api/orders/events`
- **Vị trí:** `server/lib/orderEvents.js:41-47, 121-123`
- **Tác động:** Client ẩn danh kết nối SSE không truyền token được nhận toàn bộ sự kiện cập nhật đơn hàng của mọi khách hàng trong thời gian thực.
- **Trạng thái:** `CONFIRMED`.

#### [P1-2] T-1: Hồi quy tên hiển thị tài khoản Google trong `providerOAuth.js` làm fail test suite
- **Vị trí:** `server/lib/providerOAuth.js:29`, `tests/customerOAuthAccountCreation.test.js:34`
- **Tác động:** Làm fail bài test đơn vị của hệ thống.
- **Trạng thái:** `CONFIRMED`.

#### [P1-3] T-2: Bất đồng bộ mã voucher chào mừng trong kiểm thử Enterprise Auth
- **Vị trí:** `server/lib/enterpriseAuthEndpoints.js:127`, `tests/enterpriseAuth.test.js:55`
- **Tác động:** Làm fail bài test tích hợp của hệ thống.
- **Trạng thái:** `CONFIRMED`.

#### [P1-4] Google Sheets Formula Injection (CSV Injection)
- **Vị trí:** `server/lib/googleSheets.js:188-223`
- **Tác động:** Kẻ gian chèn ký tự `=`, `+`, `-`, `@` vào tên/địa chỉ để thực thi mã khi chủ shop mở file Sheet.
- **Trạng thái:** `CONFIRMED`.

#### [P1-5] Webhook Viettel Post mở cửa không xác thực khi thiếu secret
- **Vị trí:** `server/index.js:778-794`
- **Tác động:** Bất kỳ ai cũng có thể đổi trạng thái đơn sang `DELIVERED` nếu server thiếu biến `VIETTELPOST_WEBHOOK_SECRET`.
- **Trạng thái:** `CONFIRMED`.

#### [P1-6] Cờ `--ignore-scripts` trong CI Pipeline làm hỏng native module `better-sqlite3` (T-9)
- **Vị trí:** `.github/workflows/ci.yml:36, 50`
- **Trạng thái:** `CONFIRMED`.

#### [P1-7] Dung lượng ảnh tĩnh trong `public/images/` quá lớn (lên tới 2.28MB/ảnh)
- **Vị trí:** `public/images/classic-set-brown-main.jpg` (2.28MB) và các ảnh kèm theo.
- **Trạng thái:** `CONFIRMED`.

#### [P1-8] Rò rỉ thông tin nội bộ hệ thống qua phản hồi lỗi 500 (`err.message`)
- **Vị trí:** Hơn 20 vị trí trong `server/index.js` và `authEndpoints.js`.
- **Trạng thái:** `CONFIRMED`.

#### [P1-9] Lỗ hổng High Severity trong thư viện `nodemailer <= 10.0.5`
- **Vị trí:** `package.json`
- **Trạng thái:** `CONFIRMED` (qua `npm audit --omit=dev`).

---

### 🟡 NHÓM P2 — CHẤT LƯỢNG & ĐỘ BỀN HỆ THỐNG (LÀN 3 VÀ 4)

1. **[P2-1] T-3:** Hardcode số tài khoản ngân hàng `1050773506` làm giá trị dự phòng trong các file code (chưa tính file 🔒).
2. **[P2-2] T-6:** Hai hệ thống xác thực (Legacy vs Enterprise) duy trì 2 bảng session và 2 mô hình token độc lập.
3. **[P2-3] T-7:** Mô tả "Multi-Agent AI" cho dịch vụ khoảng cách bản chất là bảng tra tĩnh theo quận/huyện.
4. **[P2-4] T-10:** Dữ liệu test (`accounts.test.db`, `orders_store.test.json`) đặt chung thư mục với dữ liệu production.
5. **[P2-5] T-11:** In-memory state và rate limiter phụ thuộc vào PM2 Single Instance.
6. **[P2-6] T-12:** `.gitignore` chặn toàn bộ `*.json` thay vì giới hạn trong `server/data/`.
7. **[P2-7] A3-002:** `formatAdminOrder` tự gán `PAID` cho đơn chuyển khoản nếu thiếu `paymentStatus`.
8. **[P2-8] A3-003:** Endpoint `/api/orders/cancel-request` chấp nhận số điện thoại dùng `endsWith`.

---

## 5. MỤC "CÁI TỐT, ĐÃ KIỂM VÀ ĐẠT" (KHÔNG CẦN ĐỤNG VÀO)

1. **Bộ kiểm định giá Server-side (`pricingValidator.js` 🔒):** Hoạt động xuất sắc, chặn đứng 100% mọi hành vi sửa giá, sửa tổng tiền, sai lệch tiền cước hoặc sản phẩm ảo từ client.
2. **Bộ kiểm định tồn kho (`stockValidator.js` 🔒):** Tính toán chính xác tồn kho khả dụng trừ đi các đơn chưa hủy.
3. **Quy trình SePay Webhook chuẩn (`paymentWebhook.js:40-135`):** So sánh secret bằng `crypto.timingSafeEqual`, kiểm tra trùng lặp `processedTransactionIds`, fail-closed khi thiếu secret.
4. **Đăng nhập quản trị viên Admin (`adminAuth.js`):** Băm SHA-256 constant-time, bảo vệ HMAC token, giới hạn tần suất đăng nhập nghiêm ngặt (5 lần / 15 phút).
5. **Cấu trúc SEO & Typography Frontend (`index.html`):** Đầy đủ Schema.org JSON-LD, meta Open Graph, font Google Cormorant Garamond & Inter chuẩn nhận diện thương hiệu.

---

## 6. MỤC "KHÔNG KIỂM CHỨNG ĐƯỢC VÀ VÌ SAO"

1. **Giao dịch thanh toán SePay thật trên tài khoản ngân hàng thực tế:** Thiếu secret thật trên môi trường dev cục bộ (`SEPAY_WEBHOOK_API_KEY`), đã kiểm chứng bằng chữ ký giả lập trong test double.
2. **Gửi Gmail thật tới hộp thư khách hàng:** Thiếu mật khẩu ứng dụng Gmail thực tế (`GMAIL_APP_PASSWORD`), đã kiểm chứng thông qua mock transport và kiểm tra cú pháp template.
3. **Gọi API bưu phẩm trực tiếp tới máy chủ Viettel Post:** Thiếu khóa bí mật `VIETTELPOST_WEBHOOK_SECRET`, đã kiểm chứng bằng payload giả lập.

---

## 7. MỤC "HÀNG CHỜ QUAN DUYỆT" & "VIỆC CỦA QUAN"

- Chi tiết toàn bộ xem tại file: [`audit/NEEDS-QUAN.md`](file:///d:/QNS%20Clothes/pijama/audit/NEEDS-QUAN.md).
- Tóm tắt 2 việc thuộc diện file 🔒:
  1. Phê duyệt bổ sung hàm `escapeHtml()` trong `emailOwner.js` và `emailCustomer.js` để triệt tiêu lỗ hổng HTML Injection.
  2. Phê duyệt thay thế số tài khoản hardcode `1050773506` trong `emailCustomer.js` bằng `process.env.BANK_ACCOUNT_NUMBER`.
- Tóm tắt 2 việc của Quan trên hạ tầng Production:
  1. Điền secret SePay vào `.env` production.
  2. Điền secret Viettel Post vào `.env` production.
