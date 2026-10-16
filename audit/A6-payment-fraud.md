# BÁO CÁO RÀ SOÁT A6 — PAYMENT & FRAUD
*Người thực hiện: A6 Payment & Fraud Auditor*
*Phạm vi: `paymentWebhook.js`, `aiNapasQrService.js`, `paymentQrService.js`, `pricingValidator.js` (chỉ đọc), `voucherValidator.js`, `server/index.js` routes `/api/payment/*`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

Rà soát toàn bộ các luồng có khả năng chuyển trạng thái đơn hàng sang `PAID` (Đã thanh toán) hoặc can thiệp vào số tiền thanh toán:
1. Webhook ngân hàng SePay (`/api/payment/webhook`)
2. Xác nhận thủ công Admin (`/api/payment/confirm`)
3. Khách hàng thông báo chuyển khoản (`/api/payment/claim`)
4. Trợ lý AI Napas 24/7 đối soát tự động (`/api/payment/ai-verify`)
5. Tạo mã VietQR / Napas QR (`/api/payment/generate-qr`, `/api/payment/napas-qr`)

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A6-001
- **ID:** A6-001
- **Tiêu đề:** Lỗ hổng P0 Gian lận thanh toán (Payment Fraud Bypass) qua Endpoint công khai `/api/payment/ai-verify` tự động duyệt ĐÃ THANH TOÁN bằng Regex (L-2 🔴)
- **Mức đề xuất:** 🔴 P0 (L-2)
- **Vị trí:** `server/index.js:240-279`, `server/lib/aiNapasQrService.js:246-325`, `server/lib/paymentWebhook.js:306-390`
- **Mô tả & tác động thực tế:**
  1. Endpoint `POST /api/payment/ai-verify` hoàn toàn công khai, không yêu cầu xác thực.
  2. Endpoint nhận `rawText` do người dùng nhập từ giao diện (hoặc gửi qua API).
  3. Hàm `parseAndMatchTransactionAI` thực chất chỉ là các biểu thức chính quy (Regex) đơn giản: tìm số tiền và tìm mã đơn hàng. Nếu `rawText` chứa mã đơn hàng và số tiền sai lệch dưới 100đ so với `order.total`:
     ```js
     // server/lib/aiNapasQrService.js:305-316
     const amountMatches = Math.abs(extractedAmount - expTotal) < 100
     if (amountMatches && idMatches) {
       isMatched = true
       confidence = 1.0
     }
     ```
  4. Ngay khi `isMatched === true`, server lập tức gọi `markOrderPaidByAI()`:
     - Chuyển `order.status = 'CONFIRMED'`
     - Chuyển `order.payment.status = 'PAID'`
     - Kích hoạt gửi Gmail biên nhận chính thức cho khách hàng và chủ shop
     - Ghi nhận trạng thái `'ĐÃ THANH TOÁN'` lên Google Sheets!
  5. Mã giao dịch `refNumber` do chính người gửi tự đặt trong chuỗi văn bản được lấy làm khóa chống trùng lặp (`processedTransactionIds.add(txId)`), nghĩa là kẻ gian có thể tự bịa mã `REF123456` ngẫu nhiên để qua mặt idempotency.
  6. **Tác động:** Kẻ gian mua hàng hoàn toàn MIỄN PHÍ. Sau khi bấm đặt hàng chuyển khoản, kẻ gian chỉ cần gửi một chuỗi văn bản tự soạn (ví dụ: `VCB +550000 QNS123456 REF888888`) là đơn hàng lập tức được hệ thống xác nhận ĐÃ THANH TOÁN, chủ shop nhận được thông báo đơn đã thanh toán và tiến hành đóng gói giao hàng cho kẻ gian mà không có bất kỳ khoản tiền nào vào tài khoản ngân hàng thật!
- **Bằng chứng:**
  Xem trực tiếp `server/index.js:253-259`:
  ```js
  if (matchResult.verification?.isMatched && orderId) {
    const confirmResult = await markOrderPaidByAI({
      orderId,
      amount: matchResult.parsed.extractedAmount,
      refNumber: matchResult.parsed.refNumber,
      rawText,
    })
  ```
  và `server/lib/paymentWebhook.js:341-377`.
- **Cách tái hiện:**
  1. Tạo 1 đơn hàng chuyển khoản (giả sử mã `QNS-TEST-FRAUD`, tổng tiền 390.000đ).
  2. Gửi request POST tới server:
     ```bash
     curl -X POST http://localhost:3001/api/payment/ai-verify \
       -H "Content-Type: application/json" \
       -d "{\"rawText\":\"VCB: +390,000VND vao TK 1050773506. ND: QNS-TEST-FRAUD. REF: FAKE999999\",\"orderId\":\"QNS-TEST-FRAUD\"}"
     ```
  3. Kết quả: Server trả về HTTP 200, `status: 'PAID'`, `order.status = 'CONFIRMED'`, kích hoạt gửi email hóa đơn!
- **Điều kiện tiên quyết:** Biết mã đơn hàng và số tiền (người đặt hàng hiển nhiên biết).
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:**
  - Vô hiệu hóa hoặc loại bỏ hoàn toàn khả năng đổi trạng thái đơn sang `PAID` từ endpoint `ai-verify`.
  - Khách hàng dán SMS chỉ được ghi nhận dưới dạng `CUSTOMER_CLAIMED_PAID` (Yêu cầu đối soát) để chủ shop kiểm tra.
  - Trạng thái `PAID` và kích hoạt email hóa đơn CHỈ ĐƯỢC PHÉP thay đổi thông qua 2 con đường hợp pháp:
    1. Webhook ngân hàng SePay có khóa bí mật (`SEPAY_WEBHOOK_API_KEY` / `PAYMENT_WEBHOOK_SECRET`) với so sánh hằng thời gian.
    2. Quản trị viên (Admin) đăng nhập xác nhận thủ công qua `POST /api/payment/confirm`.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A6-002
- **ID:** A6-002
- **Tiêu đề:** Số tài khoản ngân hàng `1050773506` bị hardcode làm giá trị dự phòng trong các service tạo mã QR (T-3)
- **Mức đề xuất:** 🟡 P2 (T-3)
- **Vị trí:** `server/index.js:203-204`, `server/lib/aiNapasQrService.js:104, 160`, `server/lib/paymentQrService.js:21, 64`
- **Mô tả & tác động thực tế:**
  Trong các service tạo QR Napas/VietQR, nếu biến môi trường `BANK_ACCOUNT_NUMBER` không được cấu hình hoặc bị rỗng, hệ thống sẽ im lặng sử dụng số tài khoản hardcoded `1050773506` thay vì cảnh báo hoặc báo lỗi:
  ```js
  accountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506'
  ```
  Nếu dự án được chuyển giao hoặc đổi tài khoản ngân hàng nhận tiền mà quên cấu hình env, tiền khách hàng thanh toán có thể chuyển nhầm sang tài khoản cũ.
- **Bằng chứng:** `server/lib/paymentQrService.js:21`:
  `accountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506'`
- **Cách tái hiện:** Chạy server khi bỏ biến `BANK_ACCOUNT_NUMBER` → mã QR vẫn được tạo với STK `1050773506`.
- **Điều kiện tiên quyết:** Thiếu biến môi trường `BANK_ACCOUNT_NUMBER`.
- **Nghi ngờ nằm ở file 🔒?:** Có một phần: `server/lib/emailCustomer.js` cũng chứa hardcode này nhưng là file 🔒 (được chuyển sang `audit/NEEDS-QUAN.md`).
- **Đề xuất sửa:** Trong các file không thuộc diện 🔒 (`server/index.js`, `aiNapasQrService.js`, `paymentQrService.js`), thay thế fallback hardcoded bằng việc lấy từ `process.env.BANK_ACCOUNT_NUMBER` và áp dụng fail-closed nếu thiếu cấu hình.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A6-003
- **ID:** A6-003
- **Tiêu đề:** Điểm sáng: Bộ thẩm định giá Server-side `pricingValidator.js` và `paymentWebhook.js` SePay đạt chuẩn an toàn cao (Passed Audits)
- **Mức đề xuất:** ⚪ P3 (Ghi nhận đạt)
- **Vị trí:** `server/lib/pricingValidator.js`, `server/lib/paymentWebhook.js:40-135`
- **Mô tả & tác động thực tế:**
  1. `pricingValidator.js` hoàn toàn độc lập với client, tự tính toán lại đơn giá, chiết khấu VietQR 10%, và phí ship từ catalog gốc, chặn đứng mọi hành vi sửa giá từ client.
  2. `paymentWebhook.js` (luồng chuẩn SePay) thực hiện so sánh hằng thời gian (`crypto.timingSafeEqual`) đối với Webhook Secret/API Key, kiểm tra khớp số tiền 100%, từ chối đơn hàng ảo không tồn tại, và kiểm tra chống trùng lặp `processedTransactionIds` đạt chuẩn idempotency.
- **Bằng chứng:** Đã kiểm thử qua test suite `tests/securityAuditVerification.test.js` (PAY-002, PAY-003).
- **Độ tin cậy:** CONFIRMED.
