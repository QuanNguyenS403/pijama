# QuanNguyenS — Cao Cấp Pijama & Homewear Store

Website thương mại điện tử chuyên cung cấp sản phẩm pijama thiết kế cao cấp thương hiệu **QuanNguyenS**. Hệ thống tích hợp đầy đủ luồng đặt hàng, tính toán giá server-side, thanh toán chuyển khoản VietQR tự động hóa qua Webhook, ghi nhận Google Sheets và gửi Gmail biên nhận cho khách hàng & chủ shop.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Hệ Thống

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18.x trở lên (khuyên dùng Node.js 20 LTS).
- **Trình duyệt**: Chrome, Edge, Safari, Firefox phiên bản hiện đại.

### 2. Cài Đặt Dependencies
```bash
npm install
```

### 3. Chạy Môi Trường Phát Triển (Development)
Để chạy đồng thời cả **Frontend (Vite - Port 3000)** và **Backend API Server (Express - Port 3001)**:

**Cách 1 (Khuyên dùng trên Windows):**
- Nhấp đúp chuột vào file `mo-web.bat` trong thư mục gốc.

**Cách 2 (Bằng dòng lệnh Terminal):**
```bash
npm run dev:full
```

- **Frontend Website**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:3001`

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` hoặc `.env.local` ở thư mục gốc (tham khảo mẫu tại `.env.example`):

```env
# ── Cổng Server Backend ──
PORT=3001
NODE_ENV=production

# ── CORS Whitelist (Phân tách bằng dấu phẩy) ──
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://quannguyens.vn

# ── Google Sheets API (Lưu trữ đơn hàng) ──
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_sheet_id

# ── Gmail SMTP (Gửi email tự động) ──
GMAIL_USER=quannguyens.store@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
OWNER_EMAIL=ducquan16102006@gmail.com

# ── Webhook Bảo Mật Thanh Toán (BẮT BUỘC để kích hoạt Webhook) ──
SEPAY_WEBHOOK_API_KEY=your_sepay_webhook_secret_key_here
PAYMENT_WEBHOOK_SECRET=your_payment_webhook_secret_key_here
```

> ⚠️ **Lưu ý quan trọng về Bảo Mật Webhook (Fail-Closed):**
> Hệ thống áp dụng cơ chế bảo mật *Fail-Closed*. Nếu không cấu hình `SEPAY_WEBHOOK_API_KEY` hoặc `PAYMENT_WEBHOOK_SECRET` trong `.env`, server sẽ từ chối mọi yêu cầu webhook (trả về lỗi 500) để ngăn chặn kẻ xấu giả mạo thông báo thanh toán.

---

## 🔒 Kiến Trúc Bảo Mật & Toàn Vẹn Đơn Hàng

1. **Server Pricing Validator (`server/lib/pricingValidator.js`):**
   - Không tin tưởng đơn giá hoặc tổng tiền do client gửi lên.
   - Server tự động tra cứu danh mục gốc (`src/data/products.js`), tính toán lại đơn giá, tạm tính, phí ship (Freeship từ 500k) và chiết khấu 10% chuyển khoản.
   - Từ chối ngay lập tức (`400 Bad Request`) nếu client cố tình sửa đổi giá tiền.

2. **Server Stock Validator (`server/lib/stockValidator.js`):**
   - Kiểm tra tồn kho khả dụng = `Tồn kho gốc` - `Số lượng đã đặt trong các đơn chưa hủy`.
   - Ngăn chặn tình trạng đặt vượt quá số lượng hàng có trong kho.

3. **Chống giả mạo xác nhận thanh toán (`server/lib/paymentWebhook.js`):**
   - Khi khách hàng bấm *"Tôi đã chuyển khoản thành công"*, trạng thái chỉ ghi nhận là `CUSTOMER_CLAIMED_PAID` (Chờ đối soát).
   - Chỉ khi Webhook ngân hàng gửi tín hiệu có kèm Secret Key hợp lệ và khớp mã đơn + số tiền thì hệ thống mới chuyển sang `PAID` và kích hoạt email hóa đơn chính thức.

4. **Lưu trữ đơn hàng bền vững (`server/lib/orderPersistence.js`):**
   - Trạng thái thanh toán, mã đơn và lịch sử giao dịch được đồng bộ trực tiếp xuống file disk (`server/data/orders_store.json`), không bị mất khi restart server.

5. **Rate Limiting & CORS (`server/lib/rateLimiter.js`):**
   - Giới hạn tần suất tạo đơn (15 đơn/15 phút/IP) và tra cứu (20 lần/phút/IP) để chống spam và bảo vệ tài nguyên Gmail/Google Sheets.

---

## 🚢 Triển Khai Production

### Triển Khai Server Duy Nhất (Single Server)
```bash
# 1. Build mã nguồn Frontend
npm run build

# 2. Khởi chạy Production Server
npm start
```
Server Express sẽ tự động phục vụ các file tĩnh trong `dist/` kèm fallback routing cho SPA và toàn bộ các API `/api/*`.

### Triển Khai Bằng Quản Trị Tiến Trình PM2
```bash
# Cài đặt PM2 toàn cục (nếu chưa có)
npm install -g pm2

# Khởi chạy hệ thống theo cấu hình ecosystem
pm2 start ecosystem.config.cjs

# Xem nhật ký hoạt động
pm2 logs quannguyens-store
```

---

## 🧪 Chạy Kiểm Thử Tự Động (Unit Tests)

Hệ thống có sẵn bộ test tự động kiểm tra logic tính giá, chiết khấu, freeship và bảo mật:

```bash
npm test
```