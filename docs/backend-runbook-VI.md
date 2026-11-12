# Sổ Tay Vận Hành & Bảo Mật Backend — QuanNguyenS (`pijama`)

> Tài liệu vận hành cho hệ thống backend (`server/`), cơ sở dữ liệu, sao lưu, và các script rà soát dữ liệu.
> Cập nhật theo đợt rà soát & gia cố backend (HEAD nền `f5513de` + hardening).

---

## 1. Kiến Trúc Lưu Trữ & Cảnh Báo Quan Trọng Trên Render

### Thực trạng cấu hình `render.yaml`
- `render.yaml` hiện đang chạy gói `plan: free` và **không khai báo `disk:`** (Persistent Disk).
- Theo tài liệu chính thức của Render, toàn bộ filesystem mặc định trên Web Services là **ephemeral (tạm thời)** và dịch vụ Free không hỗ trợ gắn Persistent Disk; mỗi lần redeploy, khởi động lại, hoặc spin-down (sau ~15 phút không có request), mọi thay đổi ghi xuống đĩa cục bộ (`server/data/accounts.db`, `orders_store.json`, `processed_tx.json`, `server/data/backups/`) **sẽ bị xóa sạch về trạng thái lúc build**.

### Khuyến nghị triển khai cho Quan
1. **Nếu lưu trữ chính tại SQLite/JSON trên Render:**
   - Nâng cấp Web Service lên gói trả phí (Starter trở lên) và gắn **Persistent Disk** tại đường dẫn mount (ví dụ `/var/data/quannguyens`), đồng thời cấu hình đường dẫn dữ liệu/backup về ổ đĩa này (`BACKUP_DIR=/var/data/quannguyens/backups`).
2. **Nếu tiếp tục dùng Render Free hoặc kiến trúc Hybrid Cloud (Supabase):**
   - Bắt buộc chạy bản cập nhật [`scripts/supabase-schema.sql`](../scripts/supabase-schema.sql) trên Supabase SQL Editor trước khi nhập dữ liệu thật (bản cũ từng mở policy `USING (true)` và `GRANT ALL ... TO anon, authenticated` gây rủi ro lộ bảng qua PostgREST).
   - Luôn sao lưu định kỳ ra ngoài server (S3 / Cloudflare R2 / tải về máy cá nhân qua `npm run backup-data`).

---

## 2. Quản Lý Biến Môi Trường & Tách Khóa Bí Mật

Tham khảo mẫu chuẩn ở [`backend-hardening.env.example`](../backend-hardening.env.example) (KHÔNG sửa `.env.example` 🔒).

### Danh sách khóa bắt buộc tách riêng (tối thiểu 32 ký tự ở Production)
Sinh từng khóa độc lập bằng lệnh:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- `ADMIN_SESSION_SECRET`: ký token phiên đăng nhập Admin (tách hoàn toàn khỏi `JWT_SECRET`).
- `ORDER_TOKEN_SECRET`: ký `trackingToken` theo dõi đơn hàng của khách.
- `CUSTOMER_AUTH_SECRET`: ký token hủy đăng ký email marketing / auth khách hàng.
- `JWT_SECRET`: ký JWT access token.
- `SEPAY_WEBHOOK_API_KEY` / `PAYMENT_WEBHOOK_SECRET`: xác thực webhook biến động số dư.

### Chính sách Fail-Closed ở Production (`NODE_ENV=production`)
- Khi thiếu bất kỳ khóa nào ở trên, module tương ứng và `server/index.js` sẽ **từ chối khởi động hoặc từ chối xác thực**, không dùng chuỗi mặc định hardcoded.
- Về gửi email: `envCheck.js` chấp nhận qua `RESEND_API_KEY` (hoặc `GMAIL_APP_PASSWORD` qua SMTP).

### Quy trình xoay vòng khóa (Secret Rotation) không gián đoạn
- **Đối với `ADMIN_SESSION_SECRET` / `ADMIN_PASSWORD`:**
  - Khi cần thu hồi phiên admin ngay lập tức mà chưa đổi khóa: gọi `POST /api/admin/logout` (token bị ghi vĩnh viễn tới khi hết hạn vào bảng `admin_revoked_tokens` trong SQLite).
  - Khi đổi `ADMIN_SESSION_SECRET`, mọi phiên admin cũ tự động hết hiệu lực và yêu cầu đăng nhập lại.

---

## 3. Sao Lưu & Khôi Phục Dữ Liệu

### Sao lưu thủ công ra ngoài thư mục repo
```bash
npm run backup-data
```
- Script `scripts/backup-data.js` sử dụng `better-sqlite3` chế độ `{ readonly: true }` + `sourceDb.backup()` (SQLite Online Backup API), sau đó tự chạy `PRAGMA integrity_check` và sao chép `orders_store.json`, `processed_tx.json` sang `../qns-backups/<YYYY-MM-DD>/` (giữ 30 ngày).
- Tự động định kỳ trong server qua `server/lib/backupService.js` (có hỗ trợ biến `BACKUP_DIR`).

### Kiểm tra môi trường trước khi chạy Production
```bash
NODE_ENV=production npm run check-env
```

---

## 4. Hướng Dẫn Sử Dụng Các Script Kiểm Toán & Dọn Rác Dữ Liệu (An Toàn 2 Bước)

Tất cả script mới trong `scripts/audit-data/` đều tuân theo nguyên tắc **chỉ-đọc mặc định (`--dry-run` / `readonly: true`)**:
- **Không** chạy trực tiếp vào dữ liệu thật với cờ sửa nếu chưa kiểm tra kết quả `--dry-run` và sao lưu dữ liệu trước.
- Khi cần áp dụng sửa đổi trên dữ liệu thật (`--apply`), Quan phải **chạy `npm run backup-data` trước**, truyền cả cờ `--apply` và đúng biến môi trường xác nhận của từng script dưới đây.

### 4.1 Rà soát SQLite (`accounts.db`)
```bash
# Bước 1: Kiểm tra chỉ-đọc (an toàn, không ghi)
node scripts/audit-data/scan-db.mjs

# Bước 2 (chỉ khi Quan muốn dọn các bản ghi hết hạn sau khi backup):
npm run backup-data
CONFIRM_DB_CLEANUP=YES_CLEANUP_EXPIRED_ROWS node scripts/audit-data/scan-db.mjs --apply
```
- Script chạy `PRAGMA quick_check`, `PRAGMA foreign_key_check`, đếm số dòng mỗi bảng và lượng session/OTP hết hạn có thể dọn. Luôn tạo bản sao lưu bằng `db.backup()` trước khi xóa ở chế độ `--apply`.

### 4.2 Rà soát đơn hàng (`orders_store.json`)
```bash
# Bước 1: Kiểm tra chỉ-đọc (mọi SĐT/email đều được che)
node scripts/audit-data/scan-orders.mjs

# Bước 2 (tách lưu trữ riêng đơn test nếu Quan xác nhận sau khi backup):
npm run backup-data
CONFIRM_ORDER_CLEANUP=YES_ARCHIVE_JUNK node scripts/audit-data/scan-orders.mjs --apply
```

### 4.3 Rà soát đánh giá sản phẩm (`reviews` trong SQLite)
```bash
# Bước 1: Rà soát đánh giá mẫu / gắn cờ sai verified_purchase
node scripts/audit-data/fix-review-verification.mjs

# Bước 2 (chỉ áp dụng nếu phát hiện review mẫu đang để verified_purchase = 1):
npm run backup-data
CONFIRM_APPLY_REVIEW_FIX=I_CONFIRM_REMOVE_UNVERIFIED_PURCHASE node scripts/audit-data/fix-review-verification.mjs --apply
```

---

## 5. Lưu Ý Hợp Đồng API & Tương Thích Frontend (`cần frontend điều chỉnh`)

Các thay đổi bảo mật bắt buộc đã áp dụng ở backend mà Admin UI / client cần lưu ý:
1. **Admin SSE (`GET /api/orders/events`):**
   - Trong môi trường `NODE_ENV=production`, token phiên Admin **chỉ được chấp nhận qua HTTP Header** (`Authorization: Bearer <token>` hoặc `x-admin-token`), **không chấp nhận qua query `?token=`** (tránh lộ token Admin trên URL access log / Referer). Khách hàng theo dõi 1 đơn lẻ vẫn dùng `?orderId=...&token=<trackingToken>` bình thường.
   - Do native browser `EventSource` không hỗ trợ gửi custom header, giao diện Admin nếu muốn nghe SSE trên production cần dùng `@microsoft/fetch-event-source` hoặc `fetch` stream có header `Authorization`.
2. **Tra cứu & Hủy đơn (`GET /api/orders/tracking`, `POST /api/orders/cancel-request`):**
   - Bắt buộc gửi đầy đủ số điện thoại chính xác (không chấp nhận chỉ gửi 4 số cuối qua `.endsWith()`), hoặc `trackingToken` hợp lệ.
   - Không cho phép khách tự hủy đơn hàng đã ở trạng thái `PAID`; đơn hủy hợp lệ chuyển sang trạng thái `CANCELLED` (soft-delete, giữ nguyên lịch sử giao dịch ngân hàng để đối soát).
3. **Chẩn đoán Email (`GET /api/health/email`):**
   - Đã khóa sau `requireAdminAuth` và che thông tin email; không còn mở công khai.
4. **Đăng xuất Admin (`POST /api/admin/logout`):**
   - Bổ sung endpoint mới thu hồi tức thì token phiên Admin đang dùng và ghi log kiểm toán bảo mật.
