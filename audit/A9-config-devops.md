# BÁO CÁO RÀ SOÁT A9 — CONFIG, DEVOPS & SUPPLY CHAIN
*Người thực hiện: A9 Config, DevOps & Supply Chain Auditor*
*Phạm vi: `.env*.example`, `envCheck.js`, `ecosystem.config.cjs`, `.github/workflows/ci.yml`, `package.json`, `vite.config.js`, `.gitignore`, `docs/`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

- **Cấu hình & Biến môi trường (T-8):** `envCheck.js`, `loadEnvironment()`, `.env.example`, kiểm tra Fail-Closed khi khởi chạy Production.
- **Quy trình CI/CD GitHub Actions (T-9):** Kiểm tra cờ `--ignore-scripts` và khả năng tương thích của native addon `better-sqlite3`.
- **Triển khai PM2 & Scale (T-11):** `ecosystem.config.cjs`, giới hạn 1 instance, hành vi khi khởi động lại.
- **Quy tắc Git Ignore (T-12):** `.gitignore` chặn toàn bộ `*.json`.

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A9-001
- **ID:** A9-001
- **Tiêu đề:** CI Pipeline `.github/workflows/ci.yml` sử dụng `--ignore-scripts`, có nguy cơ làm hỏng native addon `better-sqlite3` trên Linux (T-9)
- **Mức đề xuất:** 🟠 P1 (T-9)
- **Vị trí:** `.github/workflows/ci.yml:36, 50`
- **Mô tả & tác động thực tế:**
  1. Trong workflow CI:
     ```yaml
     - name: Install All Dependencies
       run: npm ci --ignore-scripts --no-audit --no-fund
     ```
  2. `better-sqlite3` là một thư viện C++ native binding yêu cầu thực thi script cài đặt để tải prebuilt binary hoặc biên dịch qua `node-gyp`.
  3. Cờ `--ignore-scripts` ngăn chặn hoàn toàn việc chạy install script của các package. Nếu môi trường runner không tìm thấy binary tương thích, bước `npm test` sẽ fail ngay lập tức khi load module SQLite, hoặc nếu CI bỏ qua, các test chạm database sẽ không được kiểm chứng đầy đủ.
- **Bằng chứng:** `.github/workflows/ci.yml:36`.
- **Cách tái hiện:** Xem cấu hình step `npm ci` trong `.github/workflows/ci.yml`.
- **Điều kiện tiên quyết:** Chạy CI trên runner Ubuntu mới.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Bỏ cờ `--ignore-scripts` trong CI hoặc thêm bước `npm rebuild better-sqlite3` để đảm bảo native addon được biên dịch đầy đủ trước khi chạy test.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A9-002
- **ID:** A9-002
- **Tiêu đề:** `.gitignore` sử dụng quy tắc diện rộng `*.json`, gây nguy cơ bỏ sót âm thầm các file cấu hình quan trọng (T-12)
- **Mức đề xuất:** 🟡 P2 (T-12)
- **Vị trí:** `.gitignore:8-11`
- **Mô tả & tác động thực tế:**
  Trong `.gitignore`:
  ```gitignore
  *.json
  !package.json
  !package-lock.json
  !tsconfig.json
  ```
  Quy tắc `*.json` chặn toàn bộ mọi file JSON trong dự án. Khi thêm các cấu hình chuẩn như `.eslintrc.json`, `components.json`, hoặc các file dữ liệu test/audit JSON, Git sẽ âm thầm bỏ qua mà lập trình viên không nhận ra.
- **Bằng chứng:** `.gitignore:8`.
- **Cách tái hiện:** Thử tạo file `audit/test.json` và chạy `git status` -> file bị ignore.
- **Điều kiện tiên quyết:** Bổ sung file cấu hình dạng JSON.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Thu hẹp phạm vi ignore thành `server/data/*.json` và `server/data/backups/`, thay vì chặn toàn bộ `*.json` trong toàn repo.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A9-003
- **ID:** A9-003
- **Tiêu đề:** Kiến trúc bộ nhớ RAM (In-memory Rate Limiter, SSE Clients) ràng buộc chặt chẽ với cấu hình PM2 đơn instance (T-11)
- **Mức đề xuất:** 🟡 P2 (T-11)
- **Vị trí:** `ecosystem.config.cjs:6`, `server/lib/rateLimiter.js:10`, `server/lib/orderEvents.js:8`
- **Mô tả & tác động thực tế:**
  `ecosystem.config.cjs` hiện cấu hình `instances: 1`. Toàn bộ danh sách kết nối SSE (`sseClients`) và bộ đếm Rate Limiter (`createRateLimiter`) được lưu trong bộ nhớ RAM của một tiến trình Node.js duy nhất. Nếu quản trị viên thay đổi cấu hình PM2 sang chế độ Cluster (`instances: 'max'`), các worker sẽ không chia sẻ được trạng thái, dẫn đến việc sự kiện cập nhật đơn hàng ở tiến trình này không được phát tới khách hàng kết nối ở tiến trình khác.
- **Bằng chứng:** `ecosystem.config.cjs:6`, `server/lib/orderEvents.js:8`.
- **Cách tái hiện:** Đọc cấu hình `instances: 1` và Set lưu client trong `orderEvents.js`.
- **Điều kiện tiên quyết:** Chạy PM2 ở chế độ Cluster.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Ghi rõ trong tài liệu kiến trúc: Hệ thống hiện tại yêu cầu chạy Single-instance. Khi mở rộng nhiều instance, cần kích hoạt Redis Pub/Sub cho SSE và Redis Store cho Rate Limiting.
- **Độ tin cậy:** CONFIRMED.
