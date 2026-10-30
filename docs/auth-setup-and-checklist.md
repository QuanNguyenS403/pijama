# SỔ TAY HƯỚNG DẪN CẤU HÌNH & CHECKLIST HỆ THỐNG XÁC THỰC (AUTH) QUANNGUYENS

Tài liệu hướng dẫn chủ shop (Quan Nguyen) cấu hình Google Cloud Console, Cloudflare Turnstile, các biến môi trường bảo mật, và quy trình kiểm tra xử lý sự cố.

---

## 1. Cấu hình Google Cloud Console (Bắt Buộc cho Google Sign-In)

Để nút **"Tiếp tục với Google"** và popup Google Identity Services (GIS) hoạt động bình thường, tài khoản Google Cloud Console cần được cấp quyền tên miền:

1. Đăng nhập vào [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn dự án tương ứng của website QuanNguyenS.
3. Truy cập: **APIs & Services** → **Credentials**.
4. Nhấn chỉnh sửa **OAuth 2.0 Client IDs** (loại Web application).
5. Tại mục **Authorized JavaScript origins (Nguồn gốc JavaScript được phép)**, thêm đầy đủ các domain sau:
   - `http://localhost:3000`
   - `http://localhost:5173`
   - `https://quannguyens.com`
   - `https://www.quannguyens.com`
   - `https://<ten-mien-render>.onrender.com` *(nếu đang chạy trên Render)*
6. Tại mục **Authorized redirect URIs (URI chuyển hướng được phép)**, thêm:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://quannguyens.com/api/auth/google/callback`
   - `https://www.quannguyens.com/api/auth/google/callback`
7. Nhấn **Save (Lưu)**. *(Lưu ý: Google mất khoảng 5–15 phút để cập nhật cấu hình trên CDN toàn cầu)*.
8. Sao chép **Client ID** vào biến môi trường:
   - Server: `GOOGLE_CLIENT_ID`
   - Client (Vite): `VITE_GOOGLE_CLIENT_ID`

---

## 2. Yêu cầu Tiêu chuẩn Bảo mật Máy chủ (Server Headers)

Hệ thống đã được cấu hình tự động trong `server/index.js`:
- **Cross-Origin-Opener-Policy (COOP):** Đặt là `same-origin-allow-popups`. Header này cho phép cửa sổ popup của Google gửi dữ liệu và callback trở lại trang cha (`window.opener`). Nếu dùng giá trị `same-origin`, trình duyệt sẽ ngắt kết nối sổ popup và gây hiện tượng "đứng yên".
- **Content Security Policy (CSP):**
  - `scriptSrc`: Cho phép `'self'`, `'unsafe-inline'`, `https://accounts.google.com/gsi/client`, `https://challenges.cloudflare.com`.
  - `styleSrc`: Cho phép `'self'`, `'unsafe-inline'`, `https://accounts.google.com/gsi/style`.
  - `frameSrc`: Cho phép `https://accounts.google.com/gsi/`, `https://challenges.cloudflare.com`.
  - `connectSrc`: Cho phép `'self'`, `https://accounts.google.com/gsi/`.

---

## 3. Quy định Biến Môi Trường Bí Mật (Environment Secrets)

Cấu hình trong file môi trường bí mật trên máy chủ (Render Environment / `.env.local` / VPS):

| Tên biến | Bắt buộc ở Production | Yêu cầu kỹ thuật | Mô tả |
| :--- | :---: | :--- | :--- |
| `JWT_SECRET` | **BẮT BUỘC** | Tối thiểu 32 ký tự ngẫu nhiên (CSPRNG) | Khóa bí mật ký JWT Access Token. Nếu thiếu hoặc dưới 32 ký tự, máy chủ sẽ **Fail-Closed** (từ chối khởi động/từ chối cấp token). |
| `CUSTOMER_AUTH_SECRET` | **BẮT BUỘC** | Tối thiểu 32 ký tự ngẫu nhiên | Khóa băm HMAC-SHA256 cho token unsubscribe email và session. |
| `GOOGLE_CLIENT_ID` | **BẮT BUỘC** | Định dạng `*.apps.googleusercontent.com` | Google OAuth 2.0 Client ID xác thực audience. |
| `ALLOWED_ORIGINS` | **BẮT BUỘC** | Danh sách domain cách nhau bằng dấu phẩy | Kiểm soát CORS nghiêm ngặt, chống tấn công đánh cắp cookie. |
| `TURNSTILE_SECRET_KEY` | Tùy chọn | Bắt đầu bằng `0x4AAAAAA...` | Khóa bí mật Cloudflare Turnstile Captcha. |
| `VITE_TURNSTILE_SITE_KEY` | Tùy chọn | Bắt đầu bằng `0x4AAAAAA...` | Khóa công khai hiển thị widget Turnstile trên client. |
| `TURNSTILE_ENFORCE` | Tùy chọn | `true` hoặc `false` (mặc định `false`) | Bật bắt buộc hoàn thành Captcha khi có dấu hiệu tấn công tự động. |

> [!IMPORTANT]
> Tuyệt đối không nhập khóa thật vào `.env.example` hoặc commit lên Git repository công khai.

---

## 4. Công cụ Kiểm toán Dữ liệu Định kỳ (Read-Only Audit)

Để kiểm tra tính toàn vẹn và đồng bộ giữa bảng tài khoản `accounts` và bảng đăng nhập `users` mà **không làm thay đổi hay mất mát dữ liệu**:

Chạy lệnh kiểm toán sau trên terminal máy chủ:
```bash
node scripts/audit-auth-accounts.mjs
```

Script sẽ:
- Mở cơ sở dữ liệu ở chế độ chỉ đọc (`readonly: true`).
- Đối chiếu các tài khoản bị lệch giữa `users` và `accounts`.
- Rà soát các tài khoản OAuth thiếu ID định danh.
- Tự động che dấu toàn bộ PII (email `q***s@domain.com`) để đảm bảo quyền riêng tư.

---

## 5. Hướng dẫn Xử lý Sự cố & Báo lỗi (Troubleshooting Guide)

Khi người dùng báo lỗi "Đăng nhập Google đứng yên" hoặc lỗi đăng nhập:

1. **Kiểm tra Console F12 (Tab Console):**
   - Nếu có lỗi `Cross-Origin-Opener-Policy blocked the access`: Kiểm tra proxy / Nginx phía trước có ghi đè header `Cross-Origin-Opener-Policy` thành `same-origin` hay không. Phải là `same-origin-allow-popups`.
   - Nếu có lỗi `Refused to connect to accounts.google.com`: Kiểm tra CSP header trên Nginx/Cloudflare.
   - Nếu có thông báo `Thời gian chờ xác thực Google đã quá hạn (20 giây)`: Người dùng đã mở popup Google nhưng đóng lại hoặc kết nối mạng tới máy chủ Google bị gián đoạn.
2. **Kiểm tra Network F12 (Tab Network):**
   - Kiểm tra mã phản hồi HTTP của `POST /api/auth/google`:
     - `401 Unauthorized`: Token Google không hợp lệ hoặc đã hết hạn, hoặc Client ID trên máy chủ không khớp.
     - `400 Bad Request`: Thiếu thông tin credential.
     - `200 OK`: Đã thành công, kiểm tra cookie `qns_session` và `qns_refresh_token` trong tab Application → Cookies.
3. **Chạy bộ kiểm thử tự động:**
   ```bash
   npm test
   ```
   Tất cả các bài kiểm thử bảo mật (H1–H9, F-G1–F-G9, F-M1–F-M15) phải đạt 100% màu xanh.

