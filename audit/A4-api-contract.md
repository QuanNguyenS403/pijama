# BÁO CÁO RÀ SOÁT A4 — API & ENDPOINT CONTRACT
*Người thực hiện: A4 API & Endpoint Contract Auditor*
*Phạm vi: Toàn bộ 52 API endpoints từ bản đồ A0*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

Rà soát hợp đồng API của toàn bộ 52 endpoints:
- Ma trận phân quyền (Ẩn danh, Khách hàng, Admin)
- Rò rỉ thông tin qua thông báo lỗi `500` (`err.message`)
- Xác thực đầu vào (Input Validation & DTO Schemas)
- Thao túng tham số thanh toán (Parameter Tampering)
- Phân tách và cô lập dữ liệu người dùng (IDOR)

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A4-001
- **ID:** A4-001
- **Tiêu đề:** Endpoint `/api/payment/generate-qr` nhận `accountNumber`, `bankCode`, `accountName` tùy ý từ Client Body (Xác minh T-4)
- **Mức đề xuất:** 🔴 P0 (T-4)
- **Vị trí:** `server/index.js:185-206`
- **Mô tả & tác động thực tế:**
  Trong `POST /api/payment/generate-qr`:
  ```js
  const { amount, description, bankCode, accountNumber, accountName, orderId, provider = 'NAPAS_247' } = req.body
  ...
  const result = await generateAiNapasQR({
    amount,
    description,
    orderId,
    bankCode: bankCode || process.env.BANK_CODE || 'VCB',
    accountNumber: accountNumber || process.env.BANK_ACCOUNT_NUMBER || '1050773506',
    accountName: accountName || process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN',
  })
  ```
  Endpoint công khai này cho phép client tự gửi số tài khoản và ngân hàng nhận tiền. Kẻ tấn công có thể lợi dụng endpoint chính thức của cửa hàng (`quannguyens.com/api/payment/generate-qr`) để sinh mã QR chuyển tiền vào tài khoản cá nhân của kẻ lừa đảo với định dạng hiển thị uy tín của QuanNguyenS, hoặc khai thác XSS/client tampering để chuyển hướng dòng tiền mua hàng của khách sang tài khoản khác.
- **Bằng chứng:** `server/index.js:187`, `server/index.js:202-204`.
- **Cách tái hiện:**
  Gửi request POST tới `http://localhost:3001/api/payment/generate-qr`:
  ```json
  {
    "amount": 500000,
    "accountNumber": "9999999999",
    "bankCode": "MB",
    "accountName": "KE TIEU GIAN",
    "description": "Chuyen tien pijama"
  }
  ```
  Server tạo thành công mã QR thanh toán trỏ về tài khoản ngân hàng `MB - 9999999999`!
- **Điều kiện tiên quyết:** Bất kỳ ai ngoài Internet.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Khóa cứng số tài khoản, mã ngân hàng và tên chủ tài khoản từ cấu hình bảo mật phía server (`process.env.BANK_ACCOUNT_NUMBER`, `process.env.BANK_CODE`, `process.env.BANK_ACCOUNT_NAME`). Tuyệt đối không nhận các trường này từ client body.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A4-002
- **ID:** A4-002
- **Tiêu đề:** Rò rỉ thông tin hệ thống và cấu trúc database qua phản hồi lỗi `500` (`err.message`) trên hơn 20 endpoints
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `server/index.js:209, 235, 276, 401, 570, 588, 611, 628, 702, 719, 734, 746, 758, 771, 843`, `server/lib/authEndpoints.js:623, 688, 791, 805, 876, 924, 960, 1006`
- **Mô tả & tác động thực tế:**
  Hàng loạt khối `catch (err)` trả thẳng `res.status(500).json({ success: false, error: err.message })` ra ngoài cho client. Khi xảy ra lỗi SQLite constraint, syntax error, đường dẫn file không tìm thấy, hoặc lỗi thư viện thứ ba, các chi tiết nhạy cảm như tên bảng, đường dẫn tuyệt đối thư mục máy chủ (ví dụ `d:\QNS Clothes\...`) hoặc thông tin driver bị lộ trực tiếp cho kẻ tấn công thu thập thông tin trinh sát.
- **Bằng chứng:** Grep `res.status(500)` trong `server/` tìm thấy 24 vị trí trả trực tiếp `err.message`.
- **Cách tái hiện:** Gửi request làm phát sinh lỗi DB (ví dụ JSON malformed hoặc query sai schema) → response trả về thông báo lỗi chi tiết của Node.js / SQLite.
- **Điều kiện tiên quyết:** Bất kỳ client nào gửi request gặp lỗi.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Chuẩn hóa middleware xử lý lỗi tập trung. Ở môi trường production (`NODE_ENV === 'production'`), chỉ trả về thông điệp lỗi chung: `"Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau."`, đồng thời ghi log chi tiết nội bộ trên máy chủ.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A4-003
- **ID:** A4-003
- **Tiêu đề:** `GET /api/orders/status` không có Rate Limiter, cho phép dò quét trạng thái thanh toán hàng loạt (T-5)
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `server/index.js:287-291`
- **Mô tả & tác động thực tế:**
  Endpoint `GET /api/orders/status` hoàn toàn không có middleware rate limiter và không kiểm tra quyền sở hữu đơn. Kẻ xấu có thể gửi hàng nghìn request/giây để brute-force mã đơn hàng và thăm dò trạng thái đơn của khách hàng.
- **Bằng chứng:** `server/index.js:287`.
- **Cách tái hiện:** Gửi vòng lặp gọi `GET /api/orders/status?orderId=QNS-TEST` liên tục mà không bị chặn 429.
- **Điều kiện tiên quyết:** Không có.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Gắn `lookupLimiter` vào endpoint này và yêu cầu kèm theo `phone` hoặc `token` để xác thực nếu muốn tra cứu thông tin chi tiết.
- **Độ tin cậy:** CONFIRMED.
