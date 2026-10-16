# BÁO CÁO RÀ SOÁT A5 — AUTHENTICATION & SESSION
*Người thực hiện: A5 Authentication & Session Auditor*
*Phạm vi: `authEndpoints.js`, `enterpriseAuthEndpoints.js`, `providerOAuth.js`, `customerSessionMiddleware.js`, `tokenService.js`, `authCrypto.js`, `passwordService.js`, `smsService.js`, `adminAuth.js`, `turnstileService.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI & PHÂN TÍCH CHUYÊN SÂU

Hệ thống xác thực hiện tồn tại 2 kiến trúc chạy song song:
1. **Kiến trúc Legacy OAuth & Session:** `server/lib/authEndpoints.js` (Google, Facebook, Verify SMS/Email, cookie `qns_session`).
2. **Kiến trúc Enterprise Auth:** `server/lib/enterpriseAuthEndpoints.js` (Argon2id password hashing, JWT Jose Access Token, Refresh Token Rotation, HTTP-only cookie `qns_refresh_token`, Cloudflare Turnstile Captcha, Rate limiting).

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A5-001
- **ID:** A5-001
- **Tiêu đề:** Lỗ hổng P0 Chiếm tài khoản bất kỳ (Account Takeover) qua Fallback dữ liệu tự khai và Mock Token trong `POST /api/auth/google` (L-1 🔴)
- **Mức đề xuất:** 🔴 P0 (L-1)
- **Vị trí:** `server/lib/authEndpoints.js:129-165`, `server/lib/providerOAuth.js:20-40, 70-85`
- **Mô tả & tác động thực tế:**
  1. Khi người dùng gửi request tới `POST /api/auth/google` mà không truyền trường `credential`, hoặc credential không thể verify, code tự động rơi về dữ liệu khai trong body (`bodyEmail`, `bodySub`, `bodyFullName`):
     ```js
     // server/lib/authEndpoints.js:142-148
     if (!credential && (bodyEmail || bodySub)) {
       credential = `mock-google-token:${bodySub || 'google_' + Date.now()}:${bodyEmail || 'quannguyens403@gmail.com'}:${encodeURIComponent(bodyFullName || 'Quý khách QuanNguyenS')}`
     }
     if (!credential) {
       credential = `mock-google-token:google_${Date.now()}:quannguyens403@gmail.com:${encodeURIComponent('Quý khách QuanNguyenS')}`
     }
     ```
  2. Tại hàm `verifyGoogleIdToken` trong `server/lib/providerOAuth.js:20-39`, chuỗi có tiền tố `mock-google-token:` hoặc `dev-google-token:` được chấp nhận vô điều kiện:
     ```js
     if (idToken.startsWith('mock-google-token:') || idToken.startsWith('dev-google-token:')) {
       const parts = idToken.split(':')
       ...
       return { provider: 'google', email, name, ... }
     }
     ```
     Đồng thời nhánh `catch` dòng 71-85 giải mã JWT không kiểm tra chữ ký ở môi trường không phải production hoặc khi bật `AUTH_TEST_MODE`.
  3. Sau đó endpoint `POST /api/auth/google` tìm hoặc tạo tài khoản cho email đó, cấp cookie phiên `qns_session` và JWT access token, phát hành voucher chào mừng và cho phép xem toàn bộ lịch sử đơn hàng của nạn nhân qua `/api/auth/my-orders`.
  4. **Tác động:** Kẻ tấn công chỉ cần biết email của bất kỳ khách hàng nào (hoặc chủ shop `quannguyens403@gmail.com`) là có thể chiếm hoàn toàn quyền kiểm soát phiên đăng nhập của người đó mà không cần mật khẩu hay xác thực từ Google!
  5. Lỗ hổng này khớp trực tiếp với test đang fail `SEC-02` trong `tests/securityAuditVerification.test.js:59` (mong 400, thực tế trả về 200).
- **Bằng chứng:**
  - `tests/securityAuditVerification.test.js:59:1`:
    ```
    ✖ SEC-02: /api/auth/google từ chối request không có credential khi AUTH_TEST_MODE tắt
    AssertionError: Phải từ chối 400 khi thiếu credential (actual 200, expected 400)
    ```
  - Code tại `server/lib/authEndpoints.js:142-148` và `server/lib/providerOAuth.js:25-38`.
- **Cách tái hiện:**
  Chạy lệnh cục bộ:
  ```bash
  curl -X POST http://localhost:3001/api/auth/google \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"quannguyens403@gmail.com\"}"
  ```
  Kết quả: Server trả về HTTP 200, kèm Set-Cookie `qns_session` và object `account` của chủ shop!
- **Điều kiện tiên quyết:** Biết địa chỉ email mục tiêu.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:**
  1. Loại bỏ hoàn toàn fallback tự tạo mock token từ body trong `server/lib/authEndpoints.js`. Nếu không có `credential` hợp lệ: trả về ngay `400 Bad Request`.
  2. Bắt buộc xác minh ID Token thông qua Google OAuth2 Client (`verifyIdToken`) với chữ ký cryptographic, kiểm tra `aud`, `iss`, `exp` và `email_verified: true`.
  3. Tuyệt đối không cho phép bypass `mock-google-token` ở production; ở môi trường test, chỉ cho phép khi được cô lập bằng test double rõ ràng.
- **Độ tin cậy:** CONFIRMED (100% tái hiện qua test `SEC-02`).

---

### Phát hiện A5-002
- **ID:** A5-002
- **Tiêu đề:** Hồi quy tên hiển thị tài khoản Google trong `providerOAuth.js` làm fail test suite (T-1)
- **Mức đề xuất:** 🟠 P1 (T-1)
- **Vị trí:** `server/lib/providerOAuth.js:29`, `tests/customerOAuthAccountCreation.test.js:34-59`
- **Mô tả & tác động thực tế:**
  Trong `tests/customerOAuthAccountCreation.test.js:39`:
  Mock token gửi lên chỉ có 3 phần (`mock-google-token:sub:email`).
  Tại `providerOAuth.js:29`:
  ```js
  const name = parts[3] ? decodeURIComponent(parts[3]) : 'Quý khách Google'
  ```
  Do `parts[3]` undefined, code fallback về `'Quý khách Google'`. Tuy nhiên, test mong muốn tên người dùng mặc định khi đăng nhập Google là `'Google Test User'`. Sự bất đồng bộ này làm fail test suite `customerOAuthAccountCreation.test.js`.
- **Bằng chứng:**
  Kết quả chạy `npm test`:
  ```
  ✖ Google OAuth: Tạo tài khoản riêng trên website và đặt tên theo tên Google
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual: 'Quý khách Google'
  - expected: 'Google Test User'
  ```
- **Cách tái hiện:** Chạy `node --test tests/customerOAuthAccountCreation.test.js`.
- **Điều kiện tiên quyết:** Không có.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Điều chỉnh giá trị mặc định của test double hoặc xử lý nhất quán tên người dùng Google trong `providerOAuth.js` và test case.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A5-003
- **ID:** A5-003
- **Tiêu đề:** Sai lệch mã voucher chào mừng trong kiểm thử Enterprise Auth (T-2)
- **Mức đề xuất:** 🟠 P1 (T-2)
- **Vị trí:** `server/lib/enterpriseAuthEndpoints.js:125-128`, `tests/enterpriseAuth.test.js:55`, `server/lib/accountDb.js:833-841`
- **Mô tả & tác động thực tế:**
  Khi người dùng đăng ký tài khoản doanh nghiệp qua `/api/auth/register`, hàm `createWelcomeVoucher(userId)` sinh mã ngẫu nhiên duy nhất dạng `WELCOME-XXXXXX` (do ràng buộc UNIQUE trong DB). Trong khi đó, `tests/enterpriseAuth.test.js:55` kiểm tra:
  ```js
  assert.equal(data.user.voucherCode, 'WELCOME10')
  ```
  khiến test fail (`actual: 'WELCOME-S4BLTT', expected: 'WELCOME10'`). Đồng thời thông báo trong response ghi: *"Mã ưu đãi chào mừng WELCOME10 đã được lưu vào ví voucher của bạn"* nhưng trường `voucherCode` lại trả về mã ngẫu nhiên.
- **Bằng chứng:**
  Kết quả chạy `npm test`:
  ```
  ✖ Bước 1, 2, 3: Đăng ký tài khoản mới bằng Email + Argon2id mật khẩu
  AssertionError: + 'WELCOME-S4BLTT' - 'WELCOME10'
  ```
- **Cách tái hiện:** Chạy `node --test tests/enterpriseAuth.test.js`.
- **Điều kiện tiên quyết:** Đăng ký tài khoản mới qua `/api/auth/register`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Thống nhất cách thức định danh voucher chào mừng: hoặc trả về mã cá nhân hóa hợp lệ và cập nhật test kiểm tra định dạng `WELCOME-`, hoặc cho phép mã chiến dịch `WELCOME10` làm alias hợp lệ.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A5-004
- **ID:** A5-004
- **Tiêu đề:** Hai hệ thống xác thực song song (Legacy vs Enterprise) cùng hoạt động dưới prefix `/api/auth/*` tiềm ẩn nguy cơ xung đột (T-6)
- **Mức đề xuất:** 🟡 P2 (T-6)
- **Vị trí:** `server/lib/authEndpoints.js` và `server/lib/enterpriseAuthEndpoints.js`
- **Mô tả & tác động thực tế:**
  Hệ thống duy trì 2 bảng user/account khác nhau (`users` và `accounts`), 2 bảng session (`enterprise_sessions` và `customer_sessions`), 2 loại token (HMAC opaque token và JWT Jose). Mặc dù `customerSessionMiddleware.js` đã cố gắng bắc cầu bằng cách kiểm tra cả hai, nhưng việc duy trì 2 mô hình đăng xuất, 2 mô hình cập nhật trạng thái (`active`/`locked`) dễ dẫn đến việc khóa tài khoản ở bảng này nhưng vẫn có hiệu lực ở bảng kia.
- **Bằng chứng:** Đọc kiến trúc dữ liệu trong `accountDb.js` và `schemaMigration.js`.
- **Cách tái hiện:** Xem schema migration và 2 bộ endpoint auth.
- **Điều kiện tiên quyết:** Đăng nhập đồng thời bằng cả 2 phương thức.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Đồng bộ trạng thái khóa tài khoản và thu hồi session giữa `users` và `accounts` trong mọi thao tác admin/logout.
- **Độ tin cậy:** CONFIRMED.
