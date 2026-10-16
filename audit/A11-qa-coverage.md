# BÁO CÁO RÀ SOÁT A11 — QA & ĐỘ PHỦ TEST
*Người thực hiện: A11 QA & Test Coverage Auditor*
*Phạm vi: `tests/**`, `scripts/verify-all.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI & PHÂN LOẠI TEST HIỆN HÀNH

- **Hiện trạng đo lường:** 57 tests: **54 pass, 3 fail**.
- **12 File Test Suite:**
  1. `pricingValidator.test.js`: 5 tests — 100% Pass.
  2. `stockValidator.test.js`: 2 tests — 100% Pass.
  3. `viettelPostAutoSync.test.js`: 3 tests — 100% Pass.
  4. `phase1SecurityAndIntegrity.test.js`: 5 tests — 100% Pass.
  5. `phase2Integrity.test.js`: 5 tests — 100% Pass.
  6. `accountDataIsolation.test.js`: 10 tests — 100% Pass.
  7. `customerAuthSecurity.test.js`: 12 tests — 100% Pass.
  8. `customerOAuthAccountCreation.test.js`: 3 tests — **1 FAIL** (T-1).
  9. `enterpriseAuth.test.js`: 7 tests — **1 FAIL** (T-2).
  10. `securityAuditVerification.test.js`: 2 tests — **1 FAIL** (SEC-02).
  11. `test-api.js`: Test runner scripts đơn lẻ.
  12. `test-db.js`: Test kiểm tra kết nối DB.

---

## 2. PHÂN TÍCH CHI TIẾT 3 TEST ĐANG FAIL

### Fail 1: T-1 `customerOAuthAccountCreation.test.js:34`
- **Tên test:** `Google OAuth: Tạo tài khoản riêng trên website và đặt tên theo tên Google`
- **Nguyên nhân gốc:** Test double `mock-google-token` trong file test chỉ truyền 3 phần (`mock-google-token:sub:email`). Tại `server/lib/providerOAuth.js:29`, giá trị fallback khi thiếu tên là `'Quý khách Google'`, trong khi test case yêu cầu khẳng định tên phải là `'Google Test User'` (`dbAccount.full_name === 'Google Test User'`).
- **Phân loại:** Hồi quy hiển thị tên mặc định (Display Name Regression).

### Fail 2: T-2 `enterpriseAuth.test.js:38`
- **Tên test:** `Bước 1, 2, 3: Đăng ký tài khoản mới bằng Email + Argon2id mật khẩu`
- **Nguyên nhân gốc:** `enterpriseAuthEndpoints.js:127` gọi `createWelcomeVoucher(userId)` sinh mã ngẫu nhiên duy nhất dạng `WELCOME-XXXXXX` (để tránh vi phạm ràng buộc `UNIQUE` trong SQLite). Nhưng test case tại dòng 55 lại hardcode kiểm tra `assert.equal(data.user.voucherCode, 'WELCOME10')`.
- **Phân loại:** Bất đồng bộ giữa Schema ràng buộc cơ sở dữ liệu và Assertion kiểm thử.

### Fail 3: SEC-02 `securityAuditVerification.test.js:59`
- **Tên test:** `SEC-02: /api/auth/google từ chối request không có credential khi AUTH_TEST_MODE tắt`
- **Nguyên nhân gốc:** `server/lib/authEndpoints.js:142` tự động sinh `mock-google-token` từ dữ liệu body khi thiếu `credential`, và `providerOAuth.js` chấp nhận mock token này ở mọi môi trường. Test mong muốn HTTP 400 Bad Request, nhưng server trả về HTTP 200 OK.
- **Phân loại:** Lỗ hổng bảo mật P0 thực tế (L-1) bị chặn bởi test case bảo vệ.

---

## 3. CÁC VÙNG TRỐNG KIỂM THỬ (TEST COVERAGE GAPS)

Hiện tại hệ thống hoàn toàn CHƯA CÓ test tự động cho:
1. `POST /api/payment/ai-verify`: Không có test kiểm tra việc từ chối các chuỗi SMS giả mạo hoặc đảm bảo endpoint này không được tự ý đổi trạng thái sang `PAID`.
2. `POST /api/payment/generate-qr`: Không có test ngăn chặn việc client gửi số tài khoản ngân hàng lạ trong body.
3. `GET /api/orders/events`: Không có test kiểm tra xác thực quyền nghe lén SSE channel và ngăn rò rỉ đơn hàng.
4. `POST /api/shipping/viettelpost/webhook`: Không có test kiểm tra hành vi fail-closed khi thiếu `VIETTELPOST_WEBHOOK_SECRET`.
5. Google Sheets Formula Injection: Không có test kiểm tra các ký tự `=`, `+`, `-`, `@`.

---

## 4. BỘ TEST HỒI QUY TỐI THIỂU CẦN XÂY DỰNG CHO PHA D

Mỗi ticket sửa lỗi trong Pha D phải có test fail-trước tương ứng:
- `test-l1-google-oauth-reject-unverified`: Chứng minh `/api/auth/google` từ chối 400 nếu không có ID token Google được xác thực.
- `test-l2-ai-verify-no-auto-paid`: Chứng minh `/api/payment/ai-verify` không thể chuyển đổi trạng thái đơn sang `PAID` và không kích hoạt email thanh toán.
- `test-t4-generate-qr-ignores-client-account`: Chứng minh `/api/payment/generate-qr` luôn dùng STK từ env server, lờ đi mọi số tài khoản do client gửi lên.
- `test-t5-sse-requires-auth`: Chứng minh `/api/orders/events` từ chối kết nối ẩn danh không có token/orderId hợp lệ.
