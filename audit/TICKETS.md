# DANH SÁCH TICKET SỬA LỖI THEO BĂNG CHUYỀN (TICKETS.md) — QuanNguyenS
*Người lập: Planner*
*Thời điểm: 16/10/2026*
*Quy tắc: Mỗi file chỉ có MỘT chủ sở hữu trong một làn (bảng khóa file). Không sửa file 🔒.*

---

## 🔒 BẢNG KHÓA FILE THEO LÀN (FILE LOCKING MATRIX)

| File | Làn 0 (Wave 0) | Làn 1 (Wave 1) | Làn 2 (Wave 2) | Làn 3 (Wave 3) | Làn 4 (Wave 4) |
|---|:---:|:---:|:---:|:---:|:---:|
| `server/lib/authEndpoints.js` | **F-auth** (TK-001) | - | - | - | - |
| `server/lib/providerOAuth.js` | **F-auth** (TK-001) | **F-auth** (TK-004) | - | - | - |
| `server/index.js` | **F-payment** (TK-002, TK-003) | - | **F-api** (TK-009, TK-011, TK-013) | - | - |
| `server/lib/paymentWebhook.js` | **F-payment** (TK-002) | - | - | - | - |
| `server/lib/aiNapasQrService.js`| **F-payment** (TK-002) | - | - | - | - |
| `server/lib/enterpriseAuthEndpoints.js` | - | **F-auth** (TK-005) | - | - | - |
| `.github/workflows/ci.yml` | - | **F-config** (TK-007) | - | - | - |
| `server/lib/orderEvents.js` | - | - | **F-api** (TK-008) | - | - |
| `server/lib/googleSheets.js` | - | - | **F-db** (TK-010) | - | - |
| `server/lib/adminOrdersHandler.js`| - | - | **F-orders** (TK-012) | - | - |
| `src/pages/BankTransferPaymentPage.jsx` | - | - | - | **F-frontend** (TK-014, TK-016) | - |
| `src/pages/AccountPage.jsx` | - | - | - | **F-frontend** (TK-015) | - |
| `src/components/auth/AuthModal.jsx` | - | - | - | **F-frontend** (TK-015) | - |
| `src/lib/googleAuth.js` | - | - | - | **F-frontend** (TK-015) | - |
| `src/data/checkoutConfig.js` | - | - | - | **F-frontend** (TK-016) | - |
| `src/components/ui/OrdersHistoryDrawer.jsx` | - | - | - | **F-frontend** (TK-016) | - |
| `.gitignore` | - | - | - | - | **F-config** (TK-017) |
| `package.json` | - | - | - | - | **F-qa** (TK-018) |
| `server/lib/backupService.js` | - | - | - | - | **F-db** (TK-019) |

---

## 🌊 LÀN 0: CHẶN RỦI RO TIỀN VÀ TÀI KHOẢN (WAVE 0 — CHÍ MẠNG)

### TICKET TK-001
- **Nguồn:** L-1, A5-001, A8-001
- **Mức:** 🔴 P0 | **Làn:** 0 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/authEndpoints.js`, `server/lib/providerOAuth.js`
- **Hành vi mong muốn:**
  - `POST /api/auth/google` bắt buộc phải có `credential` hợp lệ. Nếu thiếu `credential`, trả về ngay lập tức HTTP 400 Bad Request, không được tự động sinh token giả từ `bodyEmail` hay `bodySub`.
  - Trong `providerOAuth.js`, loại bỏ việc chấp nhận `mock-google-token` ở production; chỉ cho phép test double khi chạy trong môi trường kiểm thử được cô lập.
- **Test hồi quy bắt buộc:** `tests/securityAuditVerification.test.js::SEC-02` (chuyển từ Fail sang Pass).
- **Người sửa:** Fixer F-auth | **Người kiểm:** SecurityReviewer + CodeReviewer.

### TICKET TK-002
- **Nguồn:** L-2, A6-001, A8-002
- **Mức:** 🔴 P0 | **Làn:** 0 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/index.js`, `server/lib/paymentWebhook.js`, `server/lib/aiNapasQrService.js`
- **Hành vi mong muốn:**
  - `POST /api/payment/ai-verify` và hàm `markOrderPaidByAI` TUYỆT ĐỐI không được phép chuyển trạng thái đơn hàng sang `PAID` hoặc `CONFIRMED`.
  - Khách hàng dán SMS chỉ được ghi nhận dưới dạng `CUSTOMER_CLAIMED_PAID` (chờ đối soát) tương đương endpoint `/claim`.
  - Trạng thái `PAID` và kích hoạt email biên nhận chỉ được đổi qua SePay Webhook có chữ ký bí mật hoặc Admin confirm.
- **Test hồi quy bắt buộc:** `tests/aiVerifySecurity.test.js` (Test-first: từ chối chuyển PAID qua ai-verify).
- **Người sửa:** Fixer F-payment | **Người kiểm:** SecurityReviewer + CodeReviewer.

### TICKET TK-003
- **Nguồn:** T-4, A4-001
- **Mức:** 🔴 P0 | **Làn:** 0 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/index.js`
- **Hành vi mong muốn:**
  - `POST /api/payment/generate-qr` khóa cứng số tài khoản ngân hàng từ `process.env.BANK_ACCOUNT_NUMBER` và `process.env.BANK_CODE`.
  - Lờ đi hoặc từ chối mọi trường `accountNumber`, `bankCode`, `accountName` gửi từ Client body.
- **Test hồi quy bắt buộc:** `tests/paymentQrIntegrity.test.js` (Test-first: gửi STK lạ, server vẫn sinh QR STK chuẩn).
- **Người sửa:** Fixer F-payment | **Người kiểm:** SecurityReviewer + CodeReviewer.

---

## 🌊 LÀN 1: NỀN TẢNG & ĐƯA 3 TEST FAIL VỀ XANH (WAVE 1)

### TICKET TK-004
- **Nguồn:** T-1, A5-002
- **Mức:** 🟠 P1 | **Làn:** 1 | **Phụ thuộc:** TK-001
- **Sở hữu file:** `server/lib/providerOAuth.js`
- **Hành vi mong muốn:**
  - Chuẩn hóa tên mặc định trả về từ Google test double trong `providerOAuth.js` là `'Google Test User'` khi `parts[3]` không có, giúp `customerOAuthAccountCreation.test.js` chuyển sang Pass.
- **Test hồi quy bắt buộc:** `tests/customerOAuthAccountCreation.test.js`.
- **Người sửa:** Fixer F-auth | **Người kiểm:** CodeReviewer.

### TICKET TK-005
- **Nguồn:** T-2, A5-003
- **Mức:** 🟠 P1 | **Làn:** 1 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/enterpriseAuthEndpoints.js`
- **Hành vi mong muốn:**
  - Khi đăng ký tài khoản thành công qua `/api/auth/register`, gán đồng bộ mã voucher chào mừng trong object trả về và ghi nhận `vouchers` nhất quán, hỗ trợ code chiến dịch `WELCOME10` làm alias hoặc trả về mã chuẩn cho test `enterpriseAuth.test.js:55`.
- **Test hồi quy bắt buộc:** `tests/enterpriseAuth.test.js`.
- **Người sửa:** Fixer F-auth | **Người kiểm:** CodeReviewer.

### TICKET TK-006
- **Nguồn:** T-9, A9-001
- **Mức:** 🟠 P1 | **Làn:** 1 | **Phụ thuộc:** Không
- **Sở hữu file:** `.github/workflows/ci.yml`
- **Hành vi mong muốn:**
  - Bỏ cờ `--ignore-scripts` trong CI pipeline hoặc bổ sung lệnh `npm rebuild better-sqlite3` để đảm bảo native addon được build đúng chuẩn trên Linux CI runner.
- **Người sửa:** Fixer F-config | **Người kiểm:** CodeReviewer.

---

## 🌊 LÀN 2: BACKEND & API SECURITY (WAVE 2)

### TICKET TK-007
- **Nguồn:** T-5, A3-001
- **Mức:** 🟠 P1 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/orderEvents.js`
- **Hành vi mong muốn:**
  - Endpoint SSE `/api/orders/events` bắt buộc phải kiểm tra quyền: Nếu không có token Admin hoặc không có trackingToken sở hữu đơn `orderId`, từ chối kết nối ngay lập tức (`401 Unauthorized`), không cho phép kết nối rỗng nghe lén toàn hệ thống.
- **Test hồi quy bắt buộc:** `tests/sseEventsSecurity.test.js`.
- **Người sửa:** Fixer F-api | **Người kiểm:** SecurityReviewer + CodeReviewer.

### TICKET TK-008
- **Nguồn:** P1-5, A10-002
- **Mức:** 🟠 P1 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/index.js`
- **Hành vi mong muốn:**
  - Webhook Viettel Post `/api/shipping/viettelpost/webhook` áp dụng bảo mật Fail-Closed: Nếu thiếu cấu hình `VIETTELPOST_WEBHOOK_SECRET`, từ chối 500 mọi request thay vì mở toang không kiểm tra.
- **Test hồi quy bắt buộc:** `tests/viettelPostWebhookSecurity.test.js`.
- **Người sửa:** Fixer F-api | **Người kiểm:** SecurityReviewer + CodeReviewer.

### TICKET TK-009
- **Nguồn:** P1-4, A8-003
- **Mức:** 🟠 P1 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/googleSheets.js`
- **Hành vi mong muốn:**
  - Thêm cơ chế sanitize cho mọi ô chuỗi ghi vào Google Sheets: nếu chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`, tự động prefix thêm `'` để vô hiệu hóa formula injection.
- **Người sửa:** Fixer F-db | **Người kiểm:** SecurityReviewer.

### TICKET TK-010
- **Nguồn:** P1-8, A4-002
- **Mức:** 🟠 P1 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/index.js`
- **Hành vi mong muốn:**
  - Chuẩn hóa các response lỗi 500 trong `server/index.js`: khi `NODE_ENV === 'production'`, không trả về `err.message` thô của hệ thống.
- **Người sửa:** Fixer F-api | **Người kiểm:** CodeReviewer.

### TICKET TK-011
- **Nguồn:** A3-002
- **Mức:** 🟡 P2 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/adminOrdersHandler.js`
- **Hành vi mong muốn:**
  - `formatAdminOrder` không tự động gán `PAID` cho đơn chuyển khoản nếu thiếu `paymentStatus` (phải là `AWAITING_PAYMENT`).
- **Người sửa:** Fixer F-orders | **Người kiểm:** CodeReviewer.

### TICKET TK-012
- **Nguồn:** A3-003
- **Mức:** 🟡 P2 | **Làn:** 2 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/index.js`
- **Hành vi mong muốn:**
  - `/api/orders/cancel-request` so khớp chính xác 100% số điện thoại chuẩn hóa thay vì dùng `endsWith`.
- **Người sửa:** Fixer F-api | **Người kiểm:** SecurityReviewer.

---

## 🌊 LÀN 3: FRONTEND ALIGNMENT (WAVE 3)

### TICKET TK-013
- **Nguồn:** A1-001
- **Mức:** 🔴 P0 | **Làn:** 3 | **Phụ thuộc:** TK-002
- **Sở hữu file:** `src/pages/BankTransferPaymentPage.jsx`
- **Hành vi mong muốn:**
  - Gỡ bỏ hoàn toàn hộp nhập textarea "Dán SMS để duyệt tức thì" khỏi trang thanh toán chuyển khoản, tránh tạo ấn tượng cho khách là có thể tự duyệt đơn.
- **Người sửa:** Fixer F-frontend | **Người kiểm:** CodeReviewer.

### TICKET TK-014
- **Nguồn:** A1-002, A1-003
- **Mức:** 🔴 P0 | **Làn:** 3 | **Phụ thuộc:** TK-001
- **Sở hữu file:** `src/pages/AccountPage.jsx`, `src/components/auth/AuthModal.jsx`, `src/lib/googleAuth.js`
- **Hành vi mong muốn:**
  - Xóa bỏ modal dev/backdoor đăng nhập nhanh với tài khoản chủ shop trên `AccountPage.jsx`.
  - Làm sạch `AuthModal.jsx` và `googleAuth.js`, loại bỏ việc tự ghép chuỗi `mock-google-token`.
- **Người sửa:** Fixer F-frontend | **Người kiểm:** SecurityReviewer + CodeReviewer.

### TICKET TK-015
- **Nguồn:** A1-004, T-3
- **Mức:** 🟡 P2 | **Làn:** 3 | **Phụ thuộc:** Không
- **Sở hữu file:** `src/data/checkoutConfig.js`, `src/pages/BankTransferPaymentPage.jsx`, `src/components/ui/OrdersHistoryDrawer.jsx`
- **Hành vi mong muốn:**
  - Khử hardcode STK `1050773506`, lấy thông tin STK và Tên chủ TK từ dữ liệu đơn hàng trả về hoặc file cấu hình chung `checkoutConfig.js`.
- **Người sửa:** Fixer F-frontend | **Người kiểm:** CodeReviewer.

---

## 🌊 LÀN 4: HOÀN THIỆN & DỌN DẸP (WAVE 4)

### TICKET TK-016
- **Nguồn:** T-12, A9-002
- **Mức:** 🟡 P2 | **Làn:** 4 | **Phụ thuộc:** Không
- **Sở hữu file:** `.gitignore`
- **Hành vi mong muốn:**
  - Thu hẹp quy tắc ignore `*.json` thành `server/data/*.json` và `server/data/backups/`.
- **Người sửa:** Fixer F-config | **Người kiểm:** CodeReviewer.

### TICKET TK-017
- **Nguồn:** A7-002
- **Mức:** 🟡 P2 | **Làn:** 4 | **Phụ thuộc:** Không
- **Sở hữu file:** `server/lib/backupService.js`
- **Hành vi mong muốn:**
  - Cập nhật `backupService.js` sử dụng SQLite Backup API `db.backup()`, kiểm tra PRAGMA integrity check.
- **Người sửa:** Fixer F-db | **Người kiểm:** CodeReviewer.
