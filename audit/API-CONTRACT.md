# HỢP ĐỒNG GIAO TIẾP API (API CONTRACT) — QuanNguyenS
*Thời điểm ban hành: 16/10/2026*
*Phiên bản: 1.0.0 (Chuẩn hóa cho Băng chuyền sửa lỗi)*

---

## 1. NGUYÊN TẮC CỐT LÕI
1. **Zero Client Trust:** Server không bao giờ tin tưởng giá tiền, số lượng, hoặc tài khoản ngân hàng nhận tiền do client gửi lên.
2. **Fail-Closed:** Thiếu secret hoặc token không hợp lệ -> từ chối ngay lập tức (400 / 401 / 403 / 500).
3. **Information Leak Protection:** Trong môi trường production, mọi lỗi 500 chỉ trả về thông báo chung, không lộ stack trace hay `err.message` nhạy cảm.

---

## 2. CHI TIẾT HỢP ĐỒNG CÁC ENDPOINT ĐÃ ĐƯỢC CHUẨN HÓA

### 2.1 Tạo mã QR Thanh toán (`POST /api/payment/generate-qr`)
- **Mục đích:** Tạo mã VietQR / Napas 24/7 cho đơn hàng.
- **Header:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "amount": 350000,
    "orderId": "QNS-1729001234",
    "description": "QNS-1729001234"
  }
  ```
  *(Lưu ý: Các trường `accountNumber`, `bankCode`, `accountName` bị loại bỏ hoàn toàn khỏi Body; Server tự động đọc từ cấu hình môi trường).*
- **Phản hồi Thành công (200 OK):**
  ```json
  {
    "success": true,
    "qrDataURL": "data:image/png;base64,...",
    "quickLink": "https://img.vietqr.io/image/...",
    "bankCode": "VCB",
    "accountNumber": "1050773506",
    "accountName": "NGUYEN DUC QUAN",
    "amount": 350000,
    "description": "QNS-1729001234"
  }
  ```
- **Phản hồi Thất bại:**
  - `400 Bad Request`: `{"success": false, "error": "Thiếu số tiền thanh toán (amount)"}`
  - `429 Too Many Requests`: `{"success": false, "error": "Yêu cầu tạo mã QR quá nhanh..."}`

---

### 2.2 Đăng nhập Google OAuth (`POST /api/auth/google`)
- **Mục đích:** Xác thực danh tính khách hàng bằng Google ID Token chính thức.
- **Header:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "credential": "<Google_ID_Token_JWT_chuan>",
    "marketingOptIn": true
  }
  ```
  *(Lưu ý: Bắt buộc phải có `credential`. Không chấp nhận request chỉ gửi `email` hoặc `sub` tự khai; không chấp nhận `mock-google-token` ở production).*
- **Phản hồi Thành công (200 OK):**
  ```json
  {
    "success": true,
    "authenticated": true,
    "account": {
      "id": "acc_...",
      "email": "user@gmail.com",
      "fullName": "Nguyen Van A",
      "avatarUrl": "https://lh3.googleusercontent.com/...",
      "verified": true
    },
    "accessToken": "ey...",
    "voucher": {
      "code": "WELCOME-XXXXXX",
      "discountPercent": 10,
      "freeShipping": true
    }
  }
  ```
  *(Set-Cookie: `qns_session=...; HttpOnly; SameSite=Lax; Path=/`)*
- **Phản hồi Thất bại:**
  - `400 Bad Request`: `{"success": false, "error": "Thiếu Google ID token (credential) hợp lệ"}`
  - `401 Unauthorized`: `{"success": false, "error": "Xác thực chữ ký Google token thất bại"}`

---

### 2.3 Lắng nghe sự kiện SSE Đơn hàng (`GET /api/orders/events`)
- **Mục đích:** Theo dõi trạng thái đơn hàng thời gian thực.
- **Query Params:**
  - `orderId`: Bắt buộc đối với khách hàng thường.
  - `token`: Tracking Token HMAC (đối với khách) HOẶC Admin Session Token (đối với Admin).
- **Phản hồi:**
  - `200 OK` (Stream `text/event-stream`): Chỉ phát các sự kiện thuộc đúng `orderId` được cấp phép.
  - `401 Unauthorized`: Trả về ngay nếu không có token hoặc token không khớp quyền sở hữu đơn.

---

### 2.4 Trợ lý Khách báo chuyển khoản (`POST /api/payment/claim`)
- **Mục đích:** Khách hàng thông báo đã chuyển khoản thành công trên giao diện.
- **Quy tắc:** Chỉ đổi trạng thái đơn sang `CUSTOMER_CLAIMED_PAID` (Chờ đối soát), TUYỆT ĐỐI không đổi sang `PAID` và không kích hoạt email hóa đơn.
