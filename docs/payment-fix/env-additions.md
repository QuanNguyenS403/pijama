# Danh Sách Biến Môi Trường Bổ Sung Cho Thanh Toán VietQR

*Lưu ý: Không chỉnh sửa trực tiếp `.env.example` theo quy tắc PROTECTED-DATA.md.*

---

## 1. Biến Môi Trường Webhook Ngân Hàng (SePay / Casso)

```env
# Khóa xác thực Secret Token cho Webhook biến động số dư ngân hàng (SePay / Casso)
# Chấp nhận qua header: "Authorization: Apikey <KEY>", "Authorization: Bearer <KEY>", hoặc "x-api-key: <KEY>"
SEPAY_WEBHOOK_API_KEY=your_secure_sepay_api_key_here

# Hoặc dùng PAYMENT_WEBHOOK_SECRET (tương thích backward)
# PAYMENT_WEBHOOK_SECRET=your_secure_sepay_api_key_here
```

## 2. Hằng Số Vận Hành Thanh Toán (Đã Được Tích Hợp Sẵn Trong Code)

- `PAYMENT_QR_TTL_SECONDS`: Thời hạn hiệu lực của mã QR VietQR (Mặc định: **600 giây / 10 phút** theo Q-B).
- `PAYMENT_CLAIM_GRACE_SECONDS`: Thời gian ân hạn thêm khi khách bấm báo chuyển khoản (Mặc định: **120 giây**).
- `PAYMENT_CLAIM_REVIEW_HOURS`: Thời hạn cảnh báo nhắc việc đối soát đơn khách đã báo chuyển khoản (Mặc định: **24 giờ**).

