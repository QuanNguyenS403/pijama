# Hướng Dẫn Cấu Hình Xác Thực OTP Zalo ZNS — QuanNguyenS Loyalty

Tài liệu hướng dẫn chủ shop (Quân Nguyễn) thiết lập và kết nối dịch vụ tin nhắn xác thực số điện thoại Zalo Notification Service (ZNS) cho chương trình Hội viên & Đặc quyền của **QuanNguyenS / 10PM Pijama**.

---

## 1. Tổng Quan Quy Trình Triển Khai

Để gửi mã OTP đăng ký / đăng nhập hội viên đến Zalo của khách hàng mà không bị rơi vào thư rác, hệ thống sử dụng dịch vụ **Zalo ZNS Template OTP** chính thức qua Zalo Business OpenAPI.

> [!IMPORTANT]
> **Nguyên tắc an toàn (Fail-closed):**
> Máy chủ Production tuyệt đối **không** gửi mã OTP giả lập qua response API và không tự ý cho qua. Khi chưa cấu hình Zalo OA Token và Template ID, hệ thống sẽ trả thông báo lỗi thân thiện cho khách và kích hoạt cảnh báo admin nội bộ.

---

## 2. Các Bước Thiết Lập Phía Zalo Business

### Bước 1: Xác thực Zalo Official Account (OA) Doanh Nghiệp
1. Truy cập [Zalo Official Account](https://oa.zalo.me/manage) và đăng ký tài khoản Doanh nghiệp cho thương hiệu **QuanNguyenS**.
2. Nộp hồ sơ xác thực doanh nghiệp (Giấy ĐKKD hoặc Giấy chứng nhận Hộ kinh doanh cá thể) để nhận tích vàng xác thực.

### Bước 2: Tạo Zalo App trên Zalo for Developers
1. Truy cập [Zalo for Developers](https://developers.zalo.me/).
2. Chọn **Thêm ứng dụng mới**, đặt tên ứng dụng (ví dụ: `QuanNguyenS Loyalty OTP`).
3. Liên kết ứng dụng vừa tạo với Zalo OA đã xác thực ở Bước 1.
4. Lấy 2 thông số cơ bản:
   - **App ID**
   - **Secret Key**

### Bước 3: Đăng ký Mẫu Template OTP (ZNS OTP)
1. Đăng nhập [Zalo Cloud Account / ZNS Portal](https://zns.oa.zalo.me/).
2. Chọn mục **Quản lý mẫu ZNS** → **Tạo mẫu ZNS mới**.
3. Loại tin nhắn: Chọn **Tin nhắn xác thực OTP (Dạng chuẩn)**.
4. Cấu hình nội dung template và các tham số biến số bắt buộc:
   - Tham số `<otp>`: Mã xác thực 6 chữ số (ví dụ: `123456`).
   - Tham số `<time>`: Thời gian hiệu lực (mã code hệ thống truyền vào: `5 phút`).
5. Gửi mẫu lên Zalo kiểm duyệt (thời gian duyệt phụ thuộc vào Zalo, thông thường 1–3 ngày làm việc).
6. Sau khi được duyệt, sao chép mã số **Template ID** (dãy số định danh template).

### Bước 4: Lấy Access Token của Zalo OA
1. Sử dụng công cụ lấy Token của Zalo for Developers (OAuth 2.0 flow) để cấp quyền cho App gửi ZNS thay mặt OA.
2. Lưu lại `access_token` để đưa vào cấu hình máy chủ.
   *(Lưu ý: Access Token của Zalo có thời hạn nhất định, Quân cần kiểm tra chính sách gia hạn hoặc sử dụng Refresh Token tự động theo tài liệu Zalo Business OpenAPI).*

---

## 3. Cấu Hình Biến Môi Trường Trên Máy Chủ

Khi đưa lên môi trường Production, bổ sung các biến môi trường sau vào file `.env` của máy chủ (tham khảo mẫu tại [loyalty.env.example](file:///D:/QNS%20Clothes/pijama/loyalty.env.example)):

```bash
# 1. Bật hệ thống Loyalty
LOYALTY_ENABLED=true

# 2. Chọn nhà cung cấp Zalo ZNS
LOYALTY_OTP_PROVIDER=zalo

# 3. Thông tin Zalo OA & Template (hệ thống hỗ trợ cả 2 bộ tên biến tương thích)
ZALO_OA_ACCESS_TOKEN=your_zalo_oa_access_token_here
ZALO_ZNS_TEMPLATE_OTP=your_template_id_here
ZALO_APP_ID=your_zalo_app_id_here
ZALO_SECRET_KEY=your_zalo_secret_key_here

# 4. Hạn mức & Bảo vệ ngân sách
LOYALTY_OTP_DAILY_LIMIT_PER_PHONE=5
LOYALTY_OTP_DAILY_LIMIT_PER_IP=20
LOYALTY_OTP_DAILY_BUDGET_COUNT=200
LOYALTY_OTP_RESEND_COOLDOWN_SEC=60
LOYALTY_OTP_TTL_SEC=300
```

---

## 4. Bảng Tra Cứu Mã Lỗi Zalo ZNS OpenAPI Thường Gặp

| Mã lỗi | Nguyên nhân | Hướng xử lý |
|--------|-------------|-------------|
| `0` | Thành công | Tin nhắn đã gửi thành công tới Zalo khách hàng. |
| `-201` | Số điện thoại chưa đăng ký Zalo | Khách hàng dùng số chưa kích hoạt Zalo. Hệ thống sẽ báo khách dùng số có Zalo. |
| `-202` | Khách chặn nhận tin ZNS | Khách hàng đã chủ động tắt thông báo từ OA. |
| `-203` | Template chưa duyệt hoặc sai ID | Kiểm tra lại `ZALO_ZNS_TEMPLATE_OTP` trong `.env`. |
| `-204` | Access Token hết hạn hoặc không hợp lệ | Cập nhật lại `ZALO_OA_ACCESS_TOKEN` trên server. |
| `-210` | Vượt quá hạn mức gửi tin trong ngày | Nạp thêm số dư hoặc nâng hạn mức OA trên cổng Zalo Cloud. |

---

## 5. Lưu Ý Về Chi Phí & Pháp Lý

> [!WARNING]
> **CHƯA XÁC MINH — Quân cần kiểm tra:**
> - **Đơn giá gửi ZNS OTP:** Chi phí mỗi tin ZNS phụ thuộc vào bảng giá công bố hiện hành và gói dịch vụ của Zalo. Vui lòng tra cứu trực tiếp tại [Bảng giá ZNS chính thức](https://zns.oa.zalo.me/pricing) trước khi ký quỹ.
> - **Quy định về dữ liệu cá nhân & Tin nhắn thương mại:** Việc gửi tin OTP phục vụ xác thực người dùng được phân loại là tin nhắn giao dịch/chăm sóc khách hàng. Tuy nhiên, shop cần duy trì checkbox đồng ý điều khoản dịch vụ và chính sách bảo mật thông tin trước khi gửi mã xác thực.

