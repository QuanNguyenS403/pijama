# 📖 SỔ TAY THAM CHIẾU VÀ KHÔI PHỤC BIẾN MÔI TRƯỜNG — QuanNguyenS

> **Mục đích:** Tài liệu này chuẩn hóa toàn bộ các biến môi trường được mã nguồn thực tế (`server/`, `src/`, `scripts/`) sử dụng. Khi xảy ra sự cố mất file cấu hình (`.env` / `.env.local`), lập trình viên hoặc AI Agent đối chiếu tài liệu này để cấp lại đầy đủ và chính xác các khóa cần thiết.  
> **Nguyên tắc bảo mật:** Tài liệu này **tuyệt đối KHÔNG chứa giá trị bí mật**.

---

## 1. Nhóm A: Bắt Buộc Cốt Lõi (Core Required)
*Thiếu bất kỳ biến nào trong nhóm này, hệ thống sẽ từ chối khởi động ở môi trường Production (Fail-Closed) hoặc chạy suy giảm tính năng (Degraded) ở Local.*

| Tên biến | Phạm vi | Bí mật? | Mục đích | Nơi cấp lại / Cách lấy | Ghi chú & Định dạng |
|---|---|---|---|---|---|
| `NODE_ENV` | Server | Không | Môi trường thực thi (`development`, `production`, `test`) | Tự đặt | `development` khi dev; `production` khi chạy server thật |
| `PORT` | Server | Không | Cổng mạng cho Express API Server | Tự đặt (mặc định: `3001`) | Số nguyên |
| `ALLOWED_ORIGINS` | Server | Không | Danh sách origin được phép gọi API (CORS) | Tự cấu hình | Chuỗi phân tách bằng dấu phẩy: `http://localhost:3000,https://quannguyens.com` |
| `APP_URL` | Server | Không | URL gốc của website frontend | Tự cấu hình | Dùng trong liên kết email và redirect |
| `CLIENT_ORIGIN` | Server | Không | URL frontend cho xác thực khách | Tự cấu hình | Thường trùng với `APP_URL` |
| `ADMIN_PASSWORD` | Server | **Bí mật** | Mật khẩu đăng nhập cổng Quản trị `/admin` | Quan tự đặt | Tối thiểu 8 ký tự, mật khẩu mạnh |
| `ADMIN_SESSION_SECRET` | Server | **Bí mật** | Khóa HMAC ký session token của Admin | Tự sinh ngẫu nhiên | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ORDER_TOKEN_SECRET` | Server | **Bí mật** | Khóa ký token tra cứu đơn hàng cho khách | Tự sinh ngẫu nhiên | Chuỗi hex 64 ký tự ngẫu nhiên |
| `CUSTOMER_AUTH_SECRET` | Server | **Bí mật** | Khóa ký HMAC và mã hóa token khách | Tự sinh ngẫu nhiên | Chuỗi hex 64 ký tự ngẫu nhiên |
| `JWT_SECRET` | Server | **Bí mật** | Khóa ký Access / Refresh JWT cho khách | Tự sinh ngẫu nhiên | Chuỗi hex 64 ký tự ngẫu nhiên |
| `GOOGLE_SHEET_ID` | Server | Không | ID bảng tính Google Sheet lưu trữ đơn | Google Sheet URL | Dạng `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` trong link docs |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Server | Không | Email của Google Service Account | Google Cloud Console → IAM → Service Accounts | Cần share quyền **Editor** trên Google Sheet cho email này |
| `GOOGLE_PRIVATE_KEY` | Server | **Bí mật** | Khóa RSA Private Key của Service Account | Google Cloud Console → Service Account Keys | Phải có đầy đủ `-----BEGIN PRIVATE KEY-----` và `-----END PRIVATE KEY-----` |
| `GMAIL_USER` | Server | Không | Email gửi hóa đơn và thông báo | Gmail shop (`quannguyens403@gmail.com`) | Địa chỉ email Gmail |
| `GMAIL_APP_PASSWORD` | Server | **Bí mật** | Mật khẩu ứng dụng 16 ký tự để gửi SMTP | Google Account → Bảo mật → Mật khẩu ứng dụng | **16 ký tự dán liền, không có dấu cách** |
| `OWNER_EMAIL` | Server | Không | Email chủ shop nhận thông báo đơn mới | Gmail shop (`quannguyens403@gmail.com`) | Thường trùng với `GMAIL_USER` |
| `SEPAY_WEBHOOK_API_KEY` | Server | **Bí mật** | Khóa xác thực webhook từ cổng SePay | SePay Dashboard → Tích hợp Webhook | Phải khớp chính xác với API Key khai báo bên SePay |
| `PAYMENT_WEBHOOK_SECRET` | Server | **Bí mật** | Khóa bí mật phụ cho webhook thanh toán | SePay Dashboard / Cấu hình bảo mật | Dự phòng cho `SEPAY_WEBHOOK_API_KEY` |
| `BANK_CODE` | Server | Không | Mã định danh ngân hàng nhận VietQR | Ngân hàng (mẫu: `VCB`) | Mã chuẩn Napas (VCB, MB, TCB...) |
| `BANK_ACCOUNT_NUMBER` | Server | Không | Số tài khoản ngân hàng nhận tiền | Tài khoản ngân hàng của Quan | Chuỗi số tài khoản |
| `BANK_ACCOUNT_NAME` | Server | Không | Tên chủ tài khoản ngân hàng | Tài khoản ngân hàng của Quan | Chữ in hoa không dấu (`NGUYEN DUC QUAN`) |
| `SHOP_NAME` | Server | Không | Tên thương hiệu hiển thị trên email/QR | Tự đặt (`QuanNguyenS`) | Chuỗi văn bản |
| `SHOP_PHONE` | Server | Không | Hotline hỗ trợ khách hàng | Hotline shop (`0981753082`) | Số điện thoại chuẩn |
| `SHOP_ADDRESS` | Server | Không | Địa chỉ kho xuất hàng (tính phí ship) | Địa chỉ xưởng/kho | Dùng làm gốc tọa độ tính khoảng cách ship |

---

## 2. Nhóm B: Tùy Chọn Theo Tính Năng (Feature Gated)
*Nếu thiếu, tính năng tương ứng sẽ tự động tắt hoặc chạy ở chế độ dự phòng.*

| Tên biến | Phạm vi | Bí mật? | Dùng cho tính năng | Nơi cấp lại | Ghi chú quan trọng |
|---|---|---|---|---|---|
| `GOOGLE_CLIENT_ID` | Server | Không | Xác thực Google One-Tap / OAuth backend | Google Cloud Console → Credentials → OAuth Client ID | **Phải trùng khớp 100% với `VITE_GOOGLE_CLIENT_ID`** |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Không | Nút đăng nhập Google trên trình duyệt | Google Cloud Console | Được nhúng vào bundle frontend |
| `SUPABASE_URL` | Server | Không | Bản sao phụ của đơn hàng và người dùng | Supabase Dashboard → Settings → API | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **Bí mật** | Quyền đọc/ghi toàn quyền Supabase | Supabase Dashboard → Settings → API | Khóa service role, không lộ ra client |
| `SUPABASE_ANON_KEY` | Server | **Bí mật** | Khóa client public Supabase | Supabase Dashboard → Settings → API | Dùng khi không có service role key |
| `VIETTELPOST_WEBHOOK_SECRET` | Server | **Bí mật** | Xác thực webhook cập nhật hành trình vận đơn | Viettel Post Dashboard | Xác thực callback trạng thái |
| `TURNSTILE_SECRET_KEY` | Server | **Bí mật** | Xác thực Captcha chống bot phía server | Cloudflare Dashboard → Turnstile | Secret key Cloudflare |
| `VITE_TURNSTILE_SITE_KEY` | Frontend | Không | Widget Captcha trên form | Cloudflare Dashboard → Turnstile | Site key công khai |
| `REDIS_URL` | Server | **Bí mật** | Phân tán Rate-limit & Cache phiên | Upstash / Redis Cloud / Local | Nếu thiếu, hệ thống tự fallback bộ nhớ trong RAM |
| `VITE_BACKEND_URL` | Frontend | Không | Trỏ API backend khi tách riêng domain | Tự cấu hình | Mặc định `http://localhost:3001` khi dev |

---

## 3. Nhóm C: Biến Cấm Ở Production (Forbidden in Production)
*Tuyệt đối KHÔNG xuất hiện trên server Production hoặc trong file cấu hình deploy thật.*

| Tên biến | Nguy cơ khi bật ở Production |
|---|---|
| `AUTH_TEST_MODE` | Cho phép mock OTP và bỏ qua xác thực thật. Bật ở production sẽ gây lỗ hổng nghiêm trọng cho phép chiếm đoạt tài khoản. |
| `ORDER_STORE_FILE` | Khiến hệ thống coi là môi trường test, tắt đồng bộ Supabase và thay đổi đường dẫn lưu trữ đơn hàng. |
| `TX_STORE_FILE` | Ghi đè file lưu vết giao dịch sang đường dẫn test. |
| `ACCOUNT_DB_FILE` | Ghi đè file cơ sở dữ liệu SQLite sang database test. |

---

## 4. Nhóm D: Biến Cũ / Tham Chiếu Phụ (Legacy)

| Tên biến | Trạng thái hiện tại trong code |
|---|---|
| `GOOGLE_CLIENT_SECRET` | Code hiện tại chỉ cần verify ID Token client-side gửi lên bằng `OAuth2Client(GOOGLE_CLIENT_ID)`, không cần secret. |
| `SHOP_SLOGAN` | Chỉ là chuỗi văn bản phụ trong template cũ. |
| `DATABASE_URL` | Chỉ dùng trong script chẩn đoán `scripts/dev-only/test-database.js`. |
| `NEXTAUTH_URL` | Giá trị dự phòng fallback URL trong email template cũ. |

---

## 5. Lệnh Kiểm Tra Cấu Hình Nhanh

Sau khi điền hoặc thay đổi file `.env.local`, luôn chạy lệnh sau để kiểm tra:

```sh
npm run check-env
```

Lệnh này sẽ quét toàn bộ biến môi trường, đối chiếu định dạng, độ dài, cảnh báo giá trị placeholder, và kiểm tra tính hợp lệ mà **không bao giờ để lộ giá trị bí mật**.
