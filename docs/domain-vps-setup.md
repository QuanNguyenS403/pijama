# 🌐 HƯỚNG DẪN CẤU HÌNH TÊN MIỀN QUANNGUYENS.COM LÊN MÁY CHỦ VPS LINUX

Tài liệu này hướng dẫn chi tiết từng bước để đưa website **QuanNguyenS** lên hoạt động chính thức với tên miền **`quannguyens.com`** trên máy chủ VPS (Ubuntu 22.04 / 24.04 LTS), sử dụng **Nginx + PM2 + SSL Let's Encrypt**.

---

## 🏗️ 1. MÔ HÌNH KIẾN TRÚC VẬN HÀNH

```
[ Khách hàng truy cập: https://quannguyens.com ]
                      │
                      ▼ (Port 443 HTTPS - SSL Let's Encrypt)
            [ NGINX REVERSE PROXY ]
           ┌──────────┴──────────┐
           ▼                     ▼
   [ / (Tĩnh: HTML/CSS/JS) ]   [ /api/* (Động: REST / SSE) ]
   Phục vụ từ `dist/`          Chuyển tiếp đến Node.js Server
   (Vite Build, Cache 1 năm)   (Port 3001 qua PM2 Daemon)
```

---

## 📌 BƯỚC 1: TRỎ BẢN GHI DNS TẠI NHÀ CUNG CẤP TÊN MIỀN

Đăng nhập vào trang quản trị tên miền nơi bạn đã mua `quannguyens.com` (ví dụ: Cloudflare, Namecheap, GoDaddy, Mắt Bão, PA Việt Nam, v.v.) và cấu hình 2 bản ghi sau:

| Loại (Type) | Tên / Host | Giá trị (Value / Points to) | TTL | Ý nghĩa |
|---|:---:|---|:---:|---|
| **A** | `@` | `<Địa_chỉ_IP_Public_VPS_của_bạn>` | Auto / 300s | Trỏ `quannguyens.com` về máy chủ VPS |
| **CNAME** | `www` | `quannguyens.com` | Auto / 300s | Trỏ `www.quannguyens.com` về tên miền chính |

> ⏱️ *Lưu ý:* Bản ghi DNS thường mất từ 5 đến 30 phút để cập nhật trên toàn cầu.  
> Kiểm tra bằng lệnh: `ping quannguyens.com` hoặc trang web `https://dnschecker.org/#A/quannguyens.com`.

---

## 💻 BƯỚC 2: CÀI ĐẶT HẠ TẦNG VPS (UBUNTU)

1. Đăng nhập SSH vào VPS của bạn bằng quyền `root`:
   ```bash
   ssh root@<IP_VPS_CỦA_BẠN>
   ```

2. Tạo thư mục làm việc và clone mã nguồn về:
   ```bash
   mkdir -p /var/www/quannguyens
   cd /var/www/quannguyens
   git clone https://github.com/your-username/your-repo.git .
   ```

3. Chạy script cài đặt môi trường tự động (đã bao gồm Node 20, Nginx, PM2, Certbot, UFW):
   ```bash
   sudo bash deploy/setup-vps.sh
   ```

---

## 🔒 BƯỚC 3: CẤU HÌNH NGINX & CẤP CHỨNG CHỈ SSL HTTPS

1. Kích hoạt file cấu hình Nginx của dự án:
   ```bash
   sudo cp deploy/nginx/quannguyens.conf /etc/nginx/sites-available/
   sudo ln -sf /etc/nginx/sites-available/quannguyens.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

2. Tạo thư mục chứng chỉ tạm và kiểm tra cú pháp Nginx:
   ```bash
   sudo mkdir -p /var/www/certbot
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Cấp chứng chỉ SSL HTTPS miễn phí trọn đời bằng Certbot Let's Encrypt:
   ```bash
   sudo certbot --nginx -d quannguyens.com -d www.quannguyens.com
   ```
   *(Điền email của bạn và chọn Đồng ý điều khoản. Certbot sẽ tự động chèn khóa SSL vào file cấu hình Nginx).*

4. Kiểm tra tính năng tự động gia hạn SSL:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## ⚙️ BƯỚC 4: THIẾT LẬP BIẾN MÔI TRƯỜNG PRODUCTION (`.env`)

Tại thư mục `/var/www/quannguyens`, tạo file `.env`:
```bash
nano .env
```

Dán cấu hình sản xuất chuẩn:
```ini
# ==============================================================
# QUANNGUYENS PRODUCTION ENVIRONMENT (.env)
# ==============================================================
NODE_ENV=production
PORT=3001
APP_URL=https://quannguyens.com
CLIENT_ORIGIN=https://quannguyens.com
ALLOWED_ORIGINS=https://quannguyens.com,https://www.quannguyens.com
VITE_BACKEND_URL=https://quannguyens.com

# Bảo mật & Admin
ADMIN_PASSWORD=[mat-khau-admin-manh-cua-ban]
ADMIN_SESSION_SECRET=[chuoi-ngau-nhien-64-ky-tu]
ORDER_TOKEN_SECRET=[chuoi-ngau-nhien-64-ky-tu]
CUSTOMER_AUTH_SECRET=[chuoi-ngau-nhien-64-ky-tu]
JWT_SECRET=[chuoi-ngau-nhien-64-ky-tu]

# Google Sheets API
GOOGLE_SHEET_ID=[id-sheet-cua-ban]
GOOGLE_SERVICE_ACCOUNT_EMAIL=[email-service-account]
GOOGLE_PRIVATE_KEY=[private-key-cua-ban]

# Gmail SMTP
GMAIL_USER=quannguyens403@gmail.com
GMAIL_APP_PASSWORD=[mat-khau-ung-dung-16-ky-tu]
OWNER_EMAIL=quannguyens403@gmail.com

# Ngân hàng & Webhook SePay
BANK_CODE=VCB
BANK_ACCOUNT_NUMBER=1050773506
BANK_ACCOUNT_NAME=NGUYEN DUC QUAN
SEPAY_WEBHOOK_API_KEY=[api-key-sepay]
PAYMENT_WEBHOOK_SECRET=[secret-sepay]

# Google OAuth & Chống Bot
GOOGLE_CLIENT_ID=745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn.apps.googleusercontent.com
AUTH_TEST_MODE=false
```

---

## 🚀 BƯỚC 5: BUILD & KHỞI CHẠY HỆ THỐNG

Thực hiện lệnh deploy tự động:
```bash
bash deploy/deploy.sh
```

Cấu hình để PM2 tự động khởi động cùng hệ thống khi VPS reboot:
```bash
pm2 startup
# Sao chép và chạy lệnh sudo env PATH... mà PM2 hiển thị trên màn hình
pm2 save
```

Kiểm tra trạng thái tiến trình backend:
```bash
pm2 status
pm2 logs quannguyens-store
```

---

## 🔗 BƯỚC 6: CẬP NHẬT CẤU HÌNH DỊCH VỤ NGOÀI VỚI DOMAIN MỚI

### 1. Google Cloud Console (Đăng nhập Google)
1. Truy cập: [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Chọn Client ID: `745618651365-0bo8817pnd3hgtsgd8bp9paq4h8gs0kn...`
3. Thêm vào mục **Authorized JavaScript origins**:
   * `https://quannguyens.com`
   * `https://www.quannguyens.com`
4. Thêm vào mục **Authorized redirect URIs**:
   * `https://quannguyens.com`
   * `https://www.quannguyens.com`
5. Bấm **Save**.

### 2. Cổng Thanh Toán SePay (Nhận diện thanh toán tự động)
1. Đăng nhập [SePay Dashboard](https://my.sepay.vn)
2. Vào mục **Cấu hình Webhook**
3. Điền Webhook URL:
   ```
   https://quannguyens.com/api/payment/webhook
   ```
4. Đảm bảo API Key khớp với biến `SEPAY_WEBHOOK_API_KEY` trong file `.env`.

### 3. Viettel Post Webhook (Cập nhật hành trình vận đơn tự động)
1. Cấu hình Webhook URL trên Viettel Post đối soát:
   ```
   https://quannguyens.com/api/viettelpost/webhook
   ```

---

## 🔄 CÁCH CẬP NHẬT CODE MỖI KHI CÓ BẢN NÂNG CẤP MỚI

Khi bạn thực hiện thay đổi mã nguồn và push lên GitHub, chỉ cần đăng nhập VPS và chạy 1 lệnh duy nhất:

```bash
cd /var/www/quannguyens && bash deploy/deploy.sh
```

Hệ thống sẽ tự động kéo code, build frontend, reload PM2 mà không làm gián đoạn trải nghiệm của khách hàng (Zero Downtime).
