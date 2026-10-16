# 🚀 HƯỚNG DẪN TRIỂN KHAI QNS CLOTHES LÊN RENDER.COM CHẠY 24/24 MIỄN PHÍ

> **Mục tiêu:** Đưa toàn bộ hệ thống (Giao diện mua sắm React/Vite + Máy chủ Express xử lý đơn hàng, thanh toán VietQR & tự động gửi Gmail xác nhận) lên nền tảng đám mây **Render.com**. Web hoạt động độc lập 24/24 mà **hoàn toàn không cần bật máy tính cá nhân** và **không cần mua VPS**.

---

## 📌 PHẦN 1: TỔNG QUAN KIẾN TRÚC TRIỂN KHAI

Hệ thống được thiết kế theo mô hình **All-in-One**:
- **Frontend:** Code React/Tailwind được Vite build thành các file tĩnh tối ưu trong thư mục `dist/`.
- **Backend:** Máy chủ Express (Node.js 22) phục vụ trực tiếp các file tĩnh của Frontend, đồng thời cung cấp các API:
  - Tiếp nhận đơn hàng (`/api/orders/submit`).
  - Tự động kích hoạt luồng gửi email xác nhận Gmail qua SMTP (`server/lib/emailConfig.js`).
  - Tạo mã QR thanh toán Napas/VietQR tự động.
  - Lắng nghe Webhook SePay/Ngân hàng.
  - Liveness Check (`/livez`) phục vụ duy trì kết nối 24/24.

---

## 📌 PHẦN 2: CÁC BƯỚC ĐẨY CODE LÊN GITHUB (ĐÃ ĐƯỢC CẤU HÌNH SẴN)

Kho lưu trữ GitHub đã được liên kết với:
`https://github.com/QuanNguyenS403/pijama.git`

Khi bạn muốn cập nhật code mới nhất từ máy tính lên GitHub, chỉ cần mở terminal tại thư mục `pijama` và chạy:
```bash
git add .
git commit -m "feat: deploy to render"
git push origin main
```
*(Nếu trợ lý AI đã push giúp bạn, bước này code đã sẵn sàng trên GitHub)*.

---

## 📌 PHẦN 3: TẠO WEB SERVICE TRÊN RENDER.COM

### Cách 1: Tạo thủ công (Khuyên dùng - Cực kỳ trực quan)

1. **Đăng nhập Render:** Truy cập [https://dashboard.render.com](https://dashboard.render.com) (Đăng nhập bằng tài khoản GitHub `QuanNguyenS403`).
2. **Tạo Web Service mới:**
   - Nhấn **New +** ở góc trên cùng bên phải -> Chọn **Web Service**.
   - Chọn mục **Build and deploy from a Git repository** -> Nhấn **Next**.
   - Chọn kho lưu trữ **`pijama`** (hoặc `QuanNguyenS403/pijama`).
3. **Điền thông số cấu hình Web Service:**
   - **Name:** `qns-clothes` (hoặc tên tùy thích, ví dụ `quannguyens`).
   - **Region:** Chọn **Singapore (Southeast Asia)** để khách truy cập tại Việt Nam có tốc độ nhanh nhất.
   - **Branch:** `main`
   - **Root Directory:** *(Để trống)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Chọn gói **Free** ($0/tháng).

---

## 📌 PHẦN 4: CẤU HÌNH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

Tại trang cấu hình Web Service trên Render, cuộn xuống mục **Environment Variables** (hoặc tab **Environment** sau khi tạo). Nhấn **Add Environment Variable** để thêm các biến sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
|---|---|---|
| `NODE_VERSION` | `22.14.0` | **Bắt buộc**: Render sẽ dùng Node.js 22 |
| `NODE_ENV` | `production` | **Bắt buộc**: Kích hoạt chế độ Production |
| `GMAIL_USER` | `quannguyens403@gmail.com` | Email gửi thư xác nhận đơn hàng |
| `GMAIL_APP_PASSWORD` | `[16 ký tự mật khẩu ứng dụng]` | Lấy từ Google Account (viết liền không dấu cách) |
| `OWNER_EMAIL` | `quannguyens403@gmail.com` | Email nhận thông báo khi có khách đặt hàng |
| `ADMIN_PASSWORD` | `[Mật khẩu quản trị của bạn]` | Mật khẩu vào trang quản lý đơn /admin/orders |
| `ADMIN_SESSION_SECRET` | `quannguyens_admin_secret_session_key_2026_super_secure` | Chuỗi bảo mật phiên Admin (tối thiểu 32 ký tự) |
| `ORDER_TOKEN_SECRET` | `quannguyens_order_token_secret_key_2026_super_secure` | Chuỗi bảo mật mã đơn khách hàng |
| `CUSTOMER_AUTH_SECRET` | `quannguyens_customer_auth_secret_key_2026_super_secure` | Chuỗi bảo mật tài khoản khách |
| `JWT_SECRET` | `quannguyens_jwt_super_secret_key_2026_production` | Chuỗi bí mật JWT |
| `BANK_CODE` | `VCB` | Mã ngân hàng nhận chuyển khoản (Vietcombank) |
| `BANK_ACCOUNT_NUMBER` | `1050773506` | Số tài khoản nhận tiền |
| `BANK_ACCOUNT_NAME` | `NGUYEN DUC QUAN` | Tên chủ tài khoản |
| `SHOP_NAME` | `QuanNguyenS` | Tên thương hiệu |
| `SHOP_PHONE` | `0981753082` | Hotline cửa hàng |
| `SHOP_ADDRESS` | `Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hà Nội` | Địa chỉ shop |
| `GOOGLE_SHEET_ID` | `[ID Google Sheets của bạn]` | Bảng tính lưu trữ đơn hàng |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `[Email service account]` | Google Cloud Service Account |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Private Key của Google Service Account |
| `GOOGLE_CLIENT_ID` | `745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com` | Google One-Tap Đăng nhập |
| `VITE_GOOGLE_CLIENT_ID` | `745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com` | Client ID cho Frontend |
| `TURNSTILE_SECRET_KEY` | `0x4AAAAAAFXbUZTWy-tGC4zUAtfGxzU07q4` | Chống bot spam đặt hàng Cloudflare |
| `VITE_TURNSTILE_SITE_KEY` | `0x4AAAAAAFXbURX5lj6_klfx` | Site key hiển thị CAPTCHA vô hình |
| `SEPAY_WEBHOOK_API_KEY` | `[Mã API SePay của bạn]` | Key xác thực biến động số dư SePay |

> 💡 **Mẹo:** Bạn có thể mở file `.env.local` trên máy tính của bạn, copy chính xác các giá trị bạn đang dùng và dán vào Render.
> Dự án đã được tối ưu: Biến `APP_URL` và `ALLOWED_ORIGINS` sẽ **tự động nhận diện** tên miền Render cấp (`https://qns-clothes.onrender.com`), bạn không cần phải tự cấu hình lại!

4. Nhấn **Create Web Service**. Render sẽ bắt đầu clone code từ GitHub, cài đặt thư viện và build web tự động trong khoảng 2-3 phút.

---

## 📌 PHẦN 5: BÍ QUYẾT GIỮ WEB CHẠY 24/24 KHÔNG BAO GIỜ NGỦ (KEEP-ALIVE MIỄN PHÍ)

Trên gói Free của Render, máy chủ sẽ tự động tạm dừng ("spin down" / ngủ) sau 15 phút nếu không có ai truy cập. Khi có khách vào, web mất khoảng 30 - 45 giây để khởi động lại.

Để giải quyết vấn đề này mà **không mất 1 đồng chi phí**, bạn chỉ cần thiết lập **Keep-Alive Ping**:

### Dùng dịch vụ Cron-Job.org (Miễn phí 100% vĩnh viễn):
1. Truy cập [https://cron-job.org](https://cron-job.org) và đăng ký tài khoản miễn phí.
2. Nhấn **Create Cronjob**:
   - **Title:** `QNS Render Keep Alive`
   - **URL:** `https://<ten-web-cua-ban>.onrender.com/livez` (Ví dụ: `https://qns-clothes.onrender.com/livez`)
   - **Schedule:** Chọn **Every 10 minutes** (Mỗi 10 phút một lần).
3. Nhấn **Create**.

👉 **Kết quả:** Cứ mỗi 10 phút, Cron-Job sẽ gửi 1 tín hiệu siêu nhẹ (0.001 giây) tới máy chủ Render, báo cho Render biết máy chủ vẫn đang hoạt động. **Web của bạn sẽ thức liên tục 24/24, không bao giờ bị ngủ, khách vào lúc nào cũng mở tức thì!**

---

## 📌 PHẦN 6: GẮN TÊN MIỀN RIÊNG (NẾU CÓ - VÍ DỤ QUANNGUYENS.COM)

Nếu bạn có tên miền riêng:
1. Vào Web Service trên Render -> Chọn tab **Settings** -> Mục **Custom Domains**.
2. Nhấn **Add Custom Domain** -> Nhập `quannguyens.com` và `www.quannguyens.com`.
3. Render sẽ hiển thị bản ghi CNAME hoặc A Record. Bạn vào nơi quản lý tên miền (như Cloudflare, PA Vietnam, Mat Bao...) trỏ bản ghi theo hướng dẫn của Render. Render sẽ tự động cấp chứng chỉ SSL HTTPS miễn phí!
