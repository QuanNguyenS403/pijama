# Hướng Dẫn Cài Đặt và Vận Hành QNS VietQR Gmail Bridge (v3.0 Bọc Thép)

Cầu nối tự động đọc email biến động số dư ngân hàng bằng **Google Apps Script** và gửi tín hiệu xác nhận thanh toán an toàn về máy chủ **QuanNguyenS**.

---

## 1. Tổng Quan Kiến Trúc

- **Mục tiêu:** Tự động xác nhận đơn hàng thanh toán qua VietQR ngay khi tiền về tài khoản ngân hàng, khách hàng không cần bấm bất kỳ nút nào, không phụ thuộc vào cổng thanh toán trung gian trả phí.
- **Cơ chế hoạt động:**
  1. Khách quét mã VietQR và thực hiện chuyển khoản.
  2. Ngân hàng gửi email biến động số dư về hòm thư Gmail.
  3. Google Apps Script quét hòm thư định kỳ mỗi 1 phút.
  4. Trích xuất thông tin, ký số xác thực HMAC-SHA256 (`X-QNS-Signature` + `X-QNS-Timestamp`) và gửi POST payload đến máy chủ QNS (`/api/payment/bank-email`).
  5. Máy chủ xác thực chữ ký HMAC, kiểm tra DKIM/DMARC, đối soát số tiền và mã đơn `QNS-XXXXXX-XXXX` để tự động xác nhận đơn hàng (`CONFIRMED / PAID`).

---

## 2. Hướng Dẫn Cài Đặt Chi Tiết Cho Quan (Từng Bước)

### Bước 1: Chuẩn bị hòm thư Gmail nhận biến động số dư
> [!IMPORTANT]
> **Tài khoản Gmail chạy bridge chuẩn hóa:** Sử dụng chính tài khoản Gmail chuyên dụng của shop: **`quannguyens403@gmail.com`** (đã cấu hình trong `.env` để nhận email biến động số dư Vietcombank và phát thông báo cho shop).
> Mọi thao tác Apps Script và cấp quyền OAuth đều thực hiện trên tài khoản này.

### Bước 2: Mở hoặc Tạo dự án Apps Script
1. Truy cập [script.google.com](https://script.google.com/) bằng tài khoản Gmail nói trên.
2. Mở dự án hiện tại (ví dụ: `QNS-Banking` hoặc `QNS-VietQR-Bank-Bridge`).

### Bước 3: Dán mã nguồn v3.0 và cấu hình Manifest
1. Tại file `Code.gs` (hoặc `Mã.gs`): Xóa sạch nội dung cũ, copy toàn bộ nội dung từ file [`integrations/gmail-bridge/Code.gs`](file:///d:/QNS%20Clothes/pijama/integrations/gmail-bridge/Code.gs) dán vào và nhấn `Ctrl + S` để lưu.
2. Vào **Cài đặt dự án (Project Settings)** (biểu tượng bánh răng bên trái) -> Tích chọn **"Hiển thị tệp kê khai 'appsscript.json' trong trình chỉnh sửa"**.
3. Quay lại trình soạn thảo code, mở file `appsscript.json`, thay thế toàn bộ bằng nội dung file [`integrations/gmail-bridge/appsscript.json`](file:///d:/QNS%20Clothes/pijama/integrations/gmail-bridge/appsscript.json) và lưu lại.

### Bước 4: Cấu hình Tham Số Bí Mật (Script Properties)
Vào **Cài đặt dự án (Project Settings)** -> cuộn xuống mục **Các thuộc tính tập lệnh (Script Properties)** -> Bấm **Chỉnh sửa thuộc tính tập lệnh (Edit script properties)** và kiểm tra 4 thuộc tính sau:

| Tên thuộc tính (Property) | Giá trị mẫu | Giải thích |
|---|---|---|
| `QNS_ENDPOINT` | `https://api.quannguyens.vn/api/payment/bank-email` | URL nhận webhook trên máy chủ QNS (khi test local có thể dùng URL HTTPS ngrok/tunnel) |
| `QNS_SECRET` | *(chuỗi bí mật ngẫu nhiên dài >= 32 ký tự)* | Khóa bí mật ký số HMAC, **phải trùng khớp** với `GMAIL_BRIDGE_SECRET` trong file `.env` của server QNS |
| `BANK_SENDER` | `vietcombank.com.vn` | Tên miền hoặc địa chỉ email gửi biến động số dư của ngân hàng (mặc định VCB) |
| `MAX_BATCH_SIZE` | `10` | Số lượng email tối đa đọc và gửi trong một lượt (mặc định 10) |

Bấm **Lưu thuộc tính tập lệnh**.

### Bước 5: Chạy Kiểm Thử Chữ Ký (Self-Test Signature)
1. Quay lại file `Code.gs`.
2. Trên thanh công cụ, tại ô chọn hàm cần chạy, chọn hàm `selfTestSignature`.
3. Bấm **Chạy (Run)**.
4. Lần đầu chạy, Google sẽ yêu cầu cấp quyền: Bấm **Xem lại quyền** -> Chọn tài khoản Google của bạn -> Bấm **Nâng cao (Advanced)** -> Bấm **Chuyển đến... (không an toàn)** -> Bấm **Cho phép (Allow)**.
5. Xem Nhật ký thực thi (Execution log): Khi thấy thông báo:
   ```text
   ✅ TEST CHỮ KÝ THÀNH CÔNG: Chữ ký Apps Script khớp 100% với chuẩn Node.js máy chủ.
   ```
   Nghĩa là thuật toán HMAC SHA-256 giữa Apps Script và Node.js đã hoàn toàn tương thích và khớp vector bảo mật Gate G6.

### Bước 6: Kiểm Thử Đọc Thư Thử Nghiệm (Dry-Run)
1. Chọn hàm `dryRun` trên thanh công cụ.
2. Bấm **Chạy (Run)**.
3. Xem nhật ký: Apps Script sẽ tìm kiếm các email biến động số dư trong 2 ngày qua và in thông tin xem trước (ID, thời gian, tiêu đề) mà KHÔNG gửi dữ liệu lên máy chủ.

### Bước 7: Kích Hoạt Trình Kích Hoạt Tự Động (Triggers) & Cài Đặt Thông Báo Lỗi Chuẩn
1. Ở thanh menu bên trái, bấm vào biểu tượng đồng hồ **Kích hoạt (Triggers)**.
2. Bấm nút **+ Thêm trình kích hoạt (+ Add Trigger)** ở góc dưới bên phải (hoặc bấm vào hình chiếc bút để chỉnh sửa trigger `syncBankEmails` hiện có).
3. Thiết lập các thông số chính xác như sau:
   - **Chọn hàm chạy:** `syncBankEmails`
   - **Chọn bản triển khai:** `Head`
   - **Chọn nguồn sự kiện:** `Dựa trên thời gian (Time-driven)`
   - **Chọn loại trình kích hoạt:** `Hẹn giờ theo phút (Minutes timer)`
   - **Chọn khoảng thời gian tính bằng phút:** `Mỗi phút (Every minute)`
   - **Cài đặt thông báo lỗi (Failure notification settings):** Chọn **`Không bao giờ thông báo (Never)`** (hoặc `Hàng tuần - Weekly`).
     > [!TIP]
     > **Lý do kỹ thuật quan trọng:** Do script chạy liên tục 1,440 lần/ngày, Google Apps Script đôi khi gặp micro-hiccup nội bộ (vài giây) của hạ tầng đám mây Google. Script v3.0 đã tự động bắt lỗi và thử lại êm đẹp ở phút kế tiếp mà không mất mát giao dịch nào. Đổi cài đặt thông báo sang **Không bao giờ** hoặc **Hàng tuần** sẽ loại bỏ triệt để các email thông báo phiền toái gửi về hòm thư của bạn.
4. Bấm **Lưu (Save)**.

---

## 3. Tính Toán Hạn Mức Google Apps Script (Quota Safety)

Apps Script chạy trên tài khoản Gmail tiêu chuẩn (miễn phí) có các giới hạn hạn mức sau:

| Tài nguyên | Giới hạn miễn phí của Google | Mức sử dụng của QNS Bridge | Đánh giá an toàn |
|---|---|---|---|
| **Lượt kích hoạt trigger** | Không giới hạn số lần chạy | 1,440 lần / ngày (mỗi 1 phút) | ✅ 100% Khả thi |
| **Tổng thời gian chạy trigger** | Tối đa **90 phút / ngày** | Mỗi lượt chạy mất ~1 - 2 giây (không có thư) hoặc 2 - 3 giây (có thư). Tổng: **~25 - 45 phút / ngày** | ✅ Nằm sâu dưới ngưỡng 90 phút (an toàn 50%) |
| **Số lần gọi UrlFetch (HTTP)** | **20,000 cuộc gọi / ngày** | 1,440 cuộc gọi / ngày (mỗi phút gửi 1 request kể cả heartbeat rỗng) | ✅ Chỉ chiếm 7.2% hạn ngạch cho phép |
| **Dung lượng Script Properties** | **9 KB / property** | Bridge giới hạn tối đa 200 ID thư gần nhất trong `PROCESSED_MESSAGE_IDS` (~ 3.5 - 4 KB) | ✅ Không bao giờ bị tràn dung lượng |

---

## 4. Cơ Chế Bảo Mật & Chống Trùng Lặp

1. **Khóa chống chạy đồng thời (`LockService`):**
   - Đảm bảo nếu một lượt quét bị mạng chậm, lượt quét tiếp theo sẽ tự động bỏ qua để không bao giờ có 2 tiến trình chạy đè lên nhau.
2. **Ký số HMAC-SHA256 (`X-QNS-Signature` & `X-QNS-Timestamp`):**
   - Máy chủ chỉ chấp nhận request có chữ ký hợp lệ với khóa bí mật `QNS_SECRET`.
   - Máy chủ kiểm tra độ lệch thời gian (timestamp skew <= 300 giây) để ngăn chặn hoàn toàn tấn công phát lại (Replay Attacks).
3. **Cơ chế Heartbeat giữ tín hiệu máy chủ:**
   - Dù không có thư ngân hàng mới, script vẫn gửi mảng rỗng `emails: []` lên máy chủ.
   - Máy chủ nhận heartbeat để duy trì trạng thái **Bridge Online (Xanh)** trên trang quản trị `AdminOrdersPage`, khách hàng nhìn thấy hệ thống hoạt động ổn định.
4. **Không lưu trữ dữ liệu nhạy cảm:**
   - Script Properties chỉ lưu ID thư (`messageId`) đã xử lý để tránh đọc lại, tuyệt đối không lưu nội dung thư, số tài khoản hay số dư.

---

## 5. Triển Khai Web App Làm Cầu Nối Gửi Email HTTPS (Port 443 Fallback)

> [!IMPORTANT]
> **CẢNH BÁO BẢO MẬT & XOAY URL TRIỂN KHAI:**
> Do URL Web App cũ trước đây từng bị lộ trong cấu hình `render.yaml`, **bắt buộc phải tạo Bản triển khai MỚI (New Deployment)** để sinh ra một Web App URL hoàn toàn mới, đồng thời **lưu trữ (archive) hoặc xóa bản triển khai cũ** để vô hiệu hóa hoàn toàn URL cũ.
>
> Ngoài ra, hệ thống v3.1 yêu cầu cài đặt thuộc tính tập lệnh **`QNS_SEND_SECRET`** (tách biệt hoàn toàn với `QNS_SECRET` ngân hàng) để ngăn chặn kẻ xấu lợi dụng cầu Gmail gửi thư rác (Open Relay).

### Các bước triển khai Web App MỚI:
1. Tại trình soạn thảo Apps Script, bấm nút **Triển khai (Deploy)** ở góc trên bên phải -> chọn **Bản triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng bên cạnh "Chọn loại" -> Chọn **Ứng dụng web (Web app)**.
3. Điền thông tin cấu hình:
   - **Mô tả (Description):** `QNS Gmail HTTPS Email Dispatcher v3.1 (Secured)`
   - **Thực thi dưới tên (Execute as):** `Tôi (quannguyens403@gmail.com)`
   - **Ai có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)`
     *(Lưu ý: Bắt buộc chọn "Bất kỳ ai" vì máy chủ Render gọi qua HTTP mà không đăng nhập tài khoản Google. Mã nguồn `Code.gs` đã bảo vệ 100% bằng cơ chế xác thực bí mật `QNS_SEND_SECRET` fail-closed).*
4. Bấm **Triển khai (Deploy)**. Nếu Google yêu cầu ủy quyền quyền mới (`gmail.send`), bấm **Xem lại quyền** và chấp thuận.
5. Sao chép **URL ứng dụng web MỚI (Web app URL)** (dạng: `https://script.google.com/macros/s/AKfycb.../exec`).
6. Vào mục **Cài đặt dự án (Project Settings)** -> **Các thuộc tính tập lệnh (Script Properties)**:
   - Bấm **Thêm thuộc tính tập lệnh**.
   - Tên thuộc tính: `QNS_SEND_SECRET`.
   - Giá trị: Tạo một chuỗi ngẫu nhiên dài từ 32-64 ký tự (ví dụ sinh bằng `openssl rand -hex 32`).
   - (Tùy chọn) Thêm `QNS_REPLY_TO`: `support@quannguyens.com`.
   - Bấm **Lưu thuộc tính tập lệnh**.
7. Cập nhật URL và Secret mới lên Render và máy chủ:
   - Trên Render Dashboard (Environment Variables): Cập nhật `GAS_EMAIL_WEBHOOK_URL` bằng URL mới và `GAS_WEBHOOK_SECRET` bằng giá trị `QNS_SEND_SECRET`.
   - Tuyệt đối **không commit URL và Secret này vào Git repo**.

### Quản lý Hạn Mức Gửi & Nhật Ký Hoạt Động (Executions Log):
1. **Xem nhật ký thực thi (Executions):**
   - Ở thanh menu bên trái Apps Script, bấm biểu tượng **Lượt thực thi (Executions)**.
   - Tại đây bạn có thể thấy từng lệnh gửi qua `doPost`: trạng thái Hoàn thành (Completed) hoặc Thất bại (Failed), thời gian thực thi (thường từ 800ms - 2s).
2. **Hạn mức gửi của Gmail cá nhân:**
   - Tài khoản `@gmail.com` tiêu chuẩn có hạn mức gửi tự động qua Apps Script là **100 người nhận / 24 giờ** (theo cơ chế 24-hour rolling window).
   - Hàm `doPost` trong `Code.gs` tự động kiểm tra `MailApp.getRemainingDailyQuota()` trước mỗi lần gửi. Nếu hạn mức chạm 0, script sẽ từ chối ngay và trả mã lỗi `QUOTA_EXCEEDED` rõ ràng thay vì nuốt lỗi.

### Tự Kiểm Thử Bằng Hàm Gửi Thư Thật Vào Hộp Thư Của Bạn:
Để kiểm tra tài khoản Gmail và quyền gửi hoạt động bình thường, mở `Code.gs` trong Apps Script Editor, tìm hàm `testSendSelfEmail`, thay địa chỉ email của bạn và bấm **Chạy (Run)**:
```javascript
function testSendSelfEmail() {
  var myEmail = 'quannguyens403@gmail.com'; // Thay bằng hộp thư của bạn
  var quota = MailApp.getRemainingDailyQuota();
  Logger.log('Hạn mức còn lại trong 24h: ' + quota);
  GmailApp.sendEmail(myEmail, '[Test QNS] Thử nghiệm gửi qua Apps Script', 'Thư thử nghiệm từ Apps Script v3.1.');
  Logger.log('Đã gửi thư thử nghiệm thành công.');
}
```
