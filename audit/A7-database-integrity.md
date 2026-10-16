# BÁO CÁO RÀ SOÁT A7 — DATABASE & DATA INTEGRITY
*Người thực hiện: A7 Database & Data Integrity Auditor*
*Phạm vi: `accountDb.js`, `schemaMigration.js`, `orderPersistence.js`, `supabaseClient.js`, `scripts/*.js`, `backupService.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

- **SQLite Database:** `server/data/accounts.db`, `accounts.test.db`, chế độ WAL (`better-sqlite3`).
- **File Persistence:** `server/data/orders_store.json`, `processed_tx.json` (Atomic write qua temporary file).
- **Sao lưu & Khôi phục (Disaster Recovery):** `scripts/backup-data.js`, `server/lib/backupService.js`.
- **Cô lập dữ liệu Test vs Production:** Kiểm tra nguy cơ test chạm vào dữ liệu thật (T-10).

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A7-001
- **ID:** A7-001
- **Tiêu đề:** Dữ liệu kiểm thử (`accounts.test.db`, `orders_store.test.json`) đặt chung thư mục `server/data/` với dữ liệu Production, nguy cơ nhiễm bẩn khi chạy lệnh ngoài môi trường test (T-10)
- **Mức đề xuất:** 🟠 P1 (T-10)
- **Vị trí:** `server/lib/accountDb.js:18-23`, `server/lib/orderPersistence.js:10-14, 44-50`
- **Mô tả & tác động thực tế:**
  1. Trong `accountDb.js`:
     ```js
     const isTestEnv =
       process.env.NODE_ENV === 'test' ||
       Boolean(process.env.ACCOUNT_DB_FILE) ||
       process.argv.some((arg) => typeof arg === 'string' && (arg.includes('node:test') || arg.includes('tests/') || arg.includes('verify-all')))
     const dbPath = process.env.ACCOUNT_DB_FILE || (isTestEnv ? path.resolve(dataDir, 'accounts.test.db') : path.resolve(dataDir, 'accounts.db'))
     ```
  2. Cơ chế nhận diện môi trường test dựa một phần vào kiểm tra `process.argv`. Nếu lập trình viên chạy script test tùy chỉnh, script tự động hóa, hoặc chạy unit test qua runner không truyền `node:test` hoặc quên set `NODE_ENV=test`, mã nguồn sẽ âm thầm ghi vào `accounts.db` và `orders_store.json` thật của Production!
  3. Việc lưu file test song song trong cùng thư mục `server/data/` làm tăng nguy cơ nhầm lẫn khi sao lưu (backup) hoặc rà soát file.
- **Bằng chứng:** `server/lib/accountDb.js:18-24`, `server/data/` hiện chứa cả `accounts.db` và `accounts.test.db`.
- **Cách tái hiện:** Xem logic gán `dbPath` trong `server/lib/accountDb.js`.
- **Điều kiện tiên quyết:** Chạy script mà không set rõ ràng `NODE_ENV=test`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:**
  - Tách biệt hoàn toàn thư mục runtime test sang thư mục riêng (ví dụ `server/data/test/` hoặc bộ nhớ RAM `:memory:` khi chạy test).
  - Bắt buộc kiểm tra tường minh `NODE_ENV === 'test'`, không phụ thuộc vào chuỗi lỏng lẻo trong `process.argv`.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A7-002
- **ID:** A7-002
- **Tiêu đề:** `backupService.js` sử dụng `fs.copyFileSync` trên file SQLite đang mở ở chế độ WAL thay vì SQLite Online Backup API
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `server/lib/backupService.js:43-44`
- **Mô tả & tác động thực tế:**
  Trong `server/lib/backupService.js:43`, hàm backup tự động thực hiện:
  ```js
  fs.copyFileSync(accountsFile, backupPath)
  ```
  Vì SQLite hoạt động ở chế độ Write-Ahead Logging (`WAL`), các giao dịch gần nhất được ghi vào file `accounts.db-wal`. Sử dụng `fs.copyFileSync` chỉ sao chép file `.db` chính mà không đồng bộ các trang trong WAL, dẫn đến bản sao lưu có thể bị thiếu dữ liệu mới nhất hoặc rơi vào trạng thái corrupt/inconsistent nếu có giao dịch đang ghi dở.
  (Trong khi đó, script `scripts/backup-data.js` đã dùng đúng chuẩn `await sourceDb.backup(destDbPath)`).
- **Bằng chứng:** `server/lib/backupService.js:43`.
- **Cách tái hiện:** Đọc hàm `performDatabaseBackup` trong `server/lib/backupService.js`.
- **Điều kiện tiên quyết:** Server đang chạy và có transaction ghi vào SQLite.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Cập nhật `backupService.js` sử dụng API `db.backup()` của `better-sqlite3` tương tự như `scripts/backup-data.js` để đảm bảo bản sao lưu luôn toàn vẹn và có kiểm tra PRAGMA `integrity_check`.
- **Độ tin cậy:** CONFIRMED.
