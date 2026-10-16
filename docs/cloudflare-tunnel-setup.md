# 🌐 HƯỚNG DẪN KẾT NỐI DOMAIN QUANNGUYENS.COM QUA CLOUDFLARE TUNNEL (KHÔNG CẦN VPS)

Tài liệu này hướng dẫn Quan kết nối tên miền **`quannguyens.com`** trực tiếp vào website đang chạy trên máy tính của bạn thông qua **Cloudflare Tunnel (`cloudflared`)** — **hoàn toàn miễn phí, có chứng chỉ SSL HTTPS khóa xanh, bảo mật chống tấn công DDoS và không cần mở port mạng**.

---

## 🚀 1. LỢI ÍCH KHI DÙNG CLOUDFLARE TUNNEL
1. **Không tốn tiền mua VPS:** Tận dụng máy tính hiện tại để làm máy chủ website.
2. **Có ngay SSL HTTPS:** Cloudflare tự động cấp chứng chỉ bảo mật cho `https://quannguyens.com`.
3. **An toàn tuyệt đối:** IP máy tính của bạn được ẩn 100% đằng sau mạng lưới Edge của Cloudflare.
4. **Vận hành trơn tru Full-Stack:** Frontend (Port 3000) và Backend API (Port 3001) đều hoạt động thông suốt dưới domain chính thức.

---

## 📋 2. CÁC BƯỚC THỰC HIỆN (CHỈ MẤT 3 PHÚT)

### Bước 1: Tạo Cloudflare Tunnel trên Dashboard
1. Đăng nhập vào trang quản trị Cloudflare: **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Ở thanh menu bên trái, bấm chọn **Zero Trust** (hoặc truy cập trực tiếp: **[one.dash.cloudflare.com](https://one.dash.cloudflare.com)**).
   *(Nếu là lần đầu vào Zero Trust, bạn chỉ cần đặt một tên Team tùy ý và chọn gói Free 0đ).*
3. Vào mục **Networks** ➔ chọn **Tunnels**.
4. Bấm **Add a tunnel** ➔ Chọn loại **Cloudflared** ➔ Bấm **Next**.
5. Đặt tên cho Tunnel: ví dụ `quannguyens-store` ➔ Bấm **Save tunnel**.

### Bước 2: Lấy Tunnel Token
1. Tại màn hình "Install and run a connector", chọn hệ điều hành **Windows** (64-bit).
2. Bạn sẽ thấy một đoạn lệnh mẫu dạng:
   ```cmd
   cloudflared.exe tunnel run --token eyJhIjoi...
   ```
3. **Sao chép chuỗi mã Token bí mật** (đoạn dài bắt đầu bằng `eyJh...` nằm sau chữ `--token`).

### Bước 3: Cấu hình Hostname cho Domain quannguyens.com
1. Vẫn trên trang Cloudflare Tunnel, bấm nút **Next** để chuyển sang tab **Public Hostnames**.
2. Thiết lập như sau:
   - **Subdomain:** Để trống (nếu muốn chạy trực tiếp `quannguyens.com`)
   - **Domain:** Chọn tên miền của bạn: `quannguyens.com`
   - **Path:** Để trống
   - **Type (Service):** Chọn **HTTP**
   - **URL:** Gõ chính xác: `localhost:3000`
3. *(Tùy chọn thêm `www`):* Bạn có thể bấm Add a public hostname thứ 2:
   - Subdomain: `www` | Domain: `quannguyens.com` | Type: `HTTP` | URL: `localhost:3000`
4. Bấm **Save tunnel**.

### Bước 4: Lưu thông tin vào file `.env`
Mở file `.env` trong dự án `pijama` và dán các thông tin bạn đang có:
```ini
# ── CLOUDFLARE TUNNEL & DOMAIN ───
CLOUDFLARE_ACCOUNT_ID=[Dán Account ID của bạn]
CLOUDFLARE_ZONE_ID=[Dán Zone ID của bạn]
CLOUDFLARE_TUNNEL_TOKEN=[Dán Tunnel Token bạn vừa sao chép ở Bước 2]
```

---

## ⚡ 3. CÁCH KHỞI CHẠY WEBSITE MỖI NGÀY

Tôi đã chuẩn bị sẵn file chạy tự động trên Windows cho bạn:

### Cách 1: Bấm đúp chuột vào file `mo-web-domain.bat` (Khuyên dùng)
- File `mo-web-domain.bat` sẽ tự động:
  1. Bật Web Server Full-stack (Frontend Vite + Backend Express).
  2. Bật Cloudflare Tunnel kết nối domain `quannguyens.com`.
- Trình duyệt và khách hàng trên toàn thế giới truy cập ngay vào: **`https://quannguyens.com`**

### Cách 2: Chạy bằng lệnh trong terminal
```powershell
# Chạy tunnel
powershell -ExecutionPolicy Bypass -File scripts\start-tunnel.ps1
```

---

## 🔒 4. CẬP NHẬT CẤU HÌNH DỊCH VỤ LIÊN KẾT
Sau khi domain `quannguyens.com` hoạt động:
1. **Google Cloud Console:** Thêm `https://quannguyens.com` vào mục Authorized JavaScript Origins để khách đăng nhập Google.
2. **SePay Webhook:** Cấu hình Webhook URL: `https://quannguyens.com/api/payment/webhook`.
