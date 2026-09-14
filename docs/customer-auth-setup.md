# 📖 Hướng Dẫn Thiết Lập & Vận Hành Hệ Thống Tài Khoản Khách Hàng (Customer Auth) — QuanNguyenS

Tài liệu này cung cấp hướng dẫn toàn diện về kiến trúc bảo mật, quy trình tích hợp các nhà cung cấp định danh (Google, Facebook, Zalo ZNS) và các chính sách quản lý phiên, voucher và tiếp thị qua email cho cửa hàng **QuanNguyenS**.

---

## 1. Tổng Quan Kiến Trúc & Quyết Định Kỹ Thuật

- **Mô hình Optional Auth:** Khách hàng không bắt buộc phải đăng nhập. Khách vẫn có thể duyệt sản phẩm, thêm vào giỏ hàng và thanh toán dưới hình thức Guest Checkout mà không gặp bất kỳ rào cản nào.
- **Bắt buộc OTP Challenge cho mọi luồng:** Kể cả khi khách hàng chọn đăng nhập qua Google hoặc Facebook, hệ thống **không** tự động cấp quyền truy cập ngay. Một mã xác minh một lần (OTP 6 số CSPRNG) sẽ được gửi đến email đã xác thực của tài khoản đó (hoặc SĐT nếu Facebook không trả email) nhằm bảo đảm chính chủ và chống bot/tài khoản rác.
- **Bảo Mật Phiên Server-side (HttpOnly Cookie):**
  - Session token là chuỗi ngẫu nhiên 32 bytes (`crypto.randomBytes(32)`).
  - Server chỉ lưu trữ hash SHA-256 của session token trong SQLite (`customer_sessions`).
  - Trình duyệt lưu token trong cookie với cờ `HttpOnly`, `SameSite=Lax`, `Path=/`, và `Secure` (trong môi trường Production).
  - Khách hàng không lưu token trong `localStorage` hay URL.
  - Session được xoay vòng (rotated) sau khi xác thực thành công để chống tấn công cố định phiên (Session Fixation).
  - Hỗ trợ thời gian chờ không hoạt động (Idle Timeout: 7 ngày) và thời gian sống tuyệt đối (Absolute Timeout: 30 ngày).

---

## 2. Hướng Dẫn Cấu Hình Nhà Cung Cấp Định Danh (Identity Providers)

### 2.1. Google Identity Services (OAuth 2.0)
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn dự án và vào mục **APIs & Services** > **Credentials**.
3. Tạo mới **OAuth 2.0 Client ID** (chọn loại ứng dụng: *Web application*).
4. Cấu hình **Authorized JavaScript origins**:
   - `http://localhost:3000` (môi trường dev)
   - `https://quannguyens.vn` (môi trường production)
5. Lấy `Client ID` và `Client Secret`, điền vào file môi trường:
   ```env
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   ```
6. **Cơ chế xác thực phía Server:** Server sử dụng `OAuth2Client.verifyIdToken` (từ thư viện `googleapis`) để giải mã và kiểm tra chữ ký số từ máy chủ Google, kiểm tra `iss`, `aud`, `exp` và yêu cầu `email_verified: true`. Claim `sub` được dùng làm khóa định danh duy nhất (identity key).

### 2.2. Meta / Facebook Login
1. Truy cập [Meta for Developers](https://developers.facebook.com/).
2. Tạo App mới (Loại ứng dụng: *Consumer* hoặc *Business*).
3. Thêm sản phẩm **Facebook Login** và cấu hình URL trang web hợp lệ.
4. Lấy `App ID` và `App Secret` từ mục **App Settings** > **Basic**:
   ```env
   FACEBOOK_APP_ID=xxxx
   FACEBOOK_APP_SECRET=xxxx
   ```
5. **Cơ chế xác thực phía Server:** Server gọi Meta Graph API `debug_token` để kiểm tra tính hợp lệ của token, xác minh `app_id` khớp với ứng dụng của shop và token chưa hết hạn trước khi truy vấn thông tin người dùng từ `/me`.
6. Nếu tài khoản Facebook không chia sẻ email, hệ thống sẽ tự động chuyển hướng khách hàng sang xác thực số điện thoại qua OTP.

### 2.3. Số Điện Thoại Việt Nam (Zalo ZNS / SMS)
1. Sử dụng tài khoản Zalo Official Account (OA) đã xác thực tại [oa.zalo.me](https://oa.zalo.me).
2. Tạo mẫu thông báo OTP tại mục **ZNS Dashboard** và gửi phê duyệt.
3. Điền token và Template ID vào file môi trường:
   ```env
   ZALO_OA_TOKEN=xxxx
   ZALO_OTP_TEMPLATE_ID=xxxx
   ```
4. **Cơ chế kiểm tra:** Số điện thoại được chuẩn hóa về định dạng di động Việt Nam (`0xxxxxxxxx` hoặc `84xxxxxxxxx`). Trong môi trường Production, nếu dịch vụ Zalo ZNS chưa được cấu hình, hệ thống sẽ **Fail-Closed** (từ chối thực thi, không gửi mock OTP để đảm bảo an toàn).

---

## 3. Cơ Chế Bảo Mật OTP & Chống Lạm Dụng (Anti-Abuse)

| Tiêu chí | Quy chuẩn triển khai |
| :--- | :--- |
| **Độ ngẫu nhiên** | Sinh bằng CSPRNG (`crypto.randomInt(100000, 1000000)`), đúng 6 chữ số. |
| **Lưu trữ DB** | Băm một chiều bằng SHA-256 kèm chuỗi Salt ngẫu nhiên 16 bytes. Tuyệt đối không lưu mã OTP thô (plaintext). |
| **So khớp mã** | So sánh thời gian hằng định (`crypto.timingSafeEqual`) chống tấn công Timing Attack. |
| **Hiệu lực (TTL)** | 10 phút. Hủy ngay sau lần xác thực thành công đầu tiên (Single-use). |
| **Giới hạn số lần thử** | Tối đa 5 lần thử sai cho mỗi mã. Sau 5 lần, mã bị khóa vĩnh viễn. |
| **Cooldown gửi lại** | Tối thiểu 60 giây giữa các lần bấm gửi lại mã. |
| **Rate Limiting** | Tối đa 6 lần yêu cầu mã trong 10 phút trên mỗi IP/Target để chống spam SMS/Email. |

---

## 4. Chính Sách Voucher Chào Mừng (Welcome Voucher 10% + Freeship)

1. **Một Voucher duy nhất:** Mỗi tài khoản sau khi xác minh chỉ được tạo duy nhất một Welcome Voucher (`WELCOME-XXXXXX`).
2. **Quyền sở hữu (Ownership):** Voucher được liên kết trực tiếp với `account_id`. Không thể chuyển nhượng hoặc sử dụng chéo bởi tài khoản khác.
3. **Đơn hàng đầu tiên (First Eligible Order):** Voucher chỉ áp dụng cho đơn hàng đầu tiên của tài khoản chưa từng hoàn tất mua sắm.
4. **Quyền lợi:** Giảm 10% trên tạm tính hàng hóa (merchandise subtotal) và ghi đè phí vận chuyển thành 0đ (Freeship toàn quốc).
5. **Vòng đời (Lifecycle):**
   - Khi tạo đơn: Voucher chuyển sang trạng thái tạm giữ (`reserved`).
   - Nếu thanh toán thành công: Chuyển sang trạng thái đã sử dụng (`used`).
   - Nếu đơn hàng bị hủy hoặc giao dịch thất bại: Voucher được hoàn trả tự động (`released`) về trạng thái khả dụng (`active`).

---

## 5. Tiếp Thị Qua Email (Marketing Consent & Unsubscribe)

> [!IMPORTANT]
> **Khuyến nghị Pháp lý (Cần Legal Review):**
> Triển khai kỹ thuật của hệ thống tuân thủ nguyên tắc bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân) và Nghị định 91/2020/NĐ-CP (Chống tin nhắn rác, thư điện tử rác). Doanh nghiệp cần tham vấn thêm luật sư chuyên trách để hoàn thiện Điều khoản dịch vụ và Chính sách bảo mật chính thức.

1. **Opt-in Tự Nguyện & Độc Lập:**
   - Hộp kiểm đồng ý nhận tin quảng cáo được tách biệt rõ ràng, **mặc định KHÔNG chọn (unchecked)**.
   - Nội dung cam kết: *"Tôi đồng ý nhận email về sản phẩm mới, livestream và ưu đãi của QuanNguyenS."*
   - Khách hàng không bị bắt buộc phải opt-in để nhận voucher chào mừng hoặc hoàn tất mua sắm.
2. **Cơ Chế Hủy Đăng Ký 1-Click (Unsubscribe):**
   - Toàn bộ email marketing đều chứa liên kết hủy nhận tin với signed token bảo mật HMAC-SHA256.
   - Hỗ trợ header chuẩn email: `List-Unsubscribe` và `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
   - Khi hủy đăng ký: Hệ thống cập nhật trạng thái opt-out ngay lập tức (`marketing_email_opt_in = 0, suppressed = 1`).
   - Email giao dịch bắt buộc (hóa đơn, mã QR, thông báo vận đơn) **không** bị ảnh hưởng khi khách hủy nhận email marketing.

---

## 6. Danh Mục Biến Môi Trường (Environment Variables)

Xem file mẫu chi tiết tại [customer-auth.env.example](file:///d:/Pijima/pijama/customer-auth.env.example).

| Tên biến | Bắt buộc ở Prod | Mô tả |
| :--- | :---: | :--- |
| `GOOGLE_CLIENT_ID` | Có (nếu bật Google) | Khóa Client ID của Google Cloud OAuth |
| `GOOGLE_CLIENT_SECRET` | Có (nếu bật Google) | Secret Key tương ứng của Google Client |
| `FACEBOOK_APP_ID` | Có (nếu bật FB) | Meta App ID |
| `FACEBOOK_APP_SECRET` | Có (nếu bật FB) | Meta App Secret để xác thực token phía server |
| `ZALO_OA_TOKEN` | Có (nếu bật Phone) | Access Token Zalo Official Account |
| `ZALO_OTP_TEMPLATE_ID` | Có (nếu bật Phone) | Mã mẫu tin nhắn ZNS chứa OTP |
| `CUSTOMER_AUTH_SECRET` | Có | Khóa bí mật dùng để ký HMAC token hủy đăng ký |
| `APP_URL` | Có | Domain chính thức của ứng dụng (ví dụ: `https://quannguyens.vn`) |

---

## 7. Quy Trình Rollback (Phục Hồi Sự Cố)

Nếu xảy ra sự cố khẩn cấp trên Production liên quan đến xác thực khách hàng:
1. **Dữ liệu đơn hàng & Guest Checkout:** Hoàn toàn độc lập, khách hàng vẫn đặt hàng bình thường qua luồng COD hoặc VietQR.
2. **Khôi phục SQLite Database:** File database độc lập tại `server/data/accounts.db`. Backup định kỳ file này trước mỗi đợt bảo trì.
3. **Chế độ suy giảm an toàn (Degraded Mode):** Nếu một nhà cung cấp (Google / FB / Zalo) gặp sự cố mạng, các phương thức còn lại vẫn hoạt động độc lập và không làm gián đoạn trang web bán hàng.
