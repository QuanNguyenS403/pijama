# Hướng Dẫn Deliverability & Vận Hành Hệ Thống Email Giao Dịch QuanNguyenS

Tài liệu kỹ thuật chuyên sâu về khả năng gửi thư thành công (Deliverability), cấu hình DNS, kiểm soát hạn mức và quy trình vận hành cho chủ dự án **Quan Nguyen**.

---

## 1. Bản Chất Kỹ Thuật Của Cầu Gửi Gmail Apps Script

### 1.1 Cơ chế hoạt động & Chữ ký mật mã
- Khi máy chủ gửi yêu cầu qua HTTPS Webhook tới `Code.gs`, Google Apps Script gọi trực tiếp hàm native `GmailApp.sendEmail()`.
- Thư này được chuyển phát trực tiếp từ máy chủ thư của Google (Google Mail Transfer Agent - MTA), xuất phát từ tài khoản chính thức của shop: `quannguyens403@gmail.com`.
- **Chữ ký số DKIM:** Thư tự động được Google ký số mật mã bằng khóa DKIM chính chủ của Google (`d=gmail.com`, `s=20230601`).
- **SPF:** Bản ghi SPF tự động vượt qua kiểm tra (`pass`) vì thư thực sự xuất phát từ dải IP chính thống của Google Mail.
- **Hạn chế cố hữu:** Bạn **không thể** cấu hình DKIM cho tên miền riêng (`quannguyens.com`) khi gửi bằng tài khoản Gmail tiêu chuẩn cá nhân qua Apps Script. Thư sẽ luôn hiển thị người gửi thực tế là `quannguyens403@gmail.com`.

### 1.2 Hạn mức gửi thư tự động của Gmail tiêu chuẩn (Quota Limits)
*(Nguồn tra cứu: Google Apps Script Quotas & Limits Documentation)*
- **Hạn ngạch:** **100 người nhận / 24 giờ** cho tài khoản Gmail tiêu chuẩn miễn phí (`@gmail.com`).
- **Cơ chế tính:** Tính theo **rolling window 24 giờ** (không phải reset cố định vào lúc 00:00 nửa đêm).
- **Phạm vi áp dụng:** Dùng chung cho cả `MailApp` và `GmailApp`. Nếu bạn gửi thư thủ công bằng webmail Gmail, hạn mức webmail là 500 thư/ngày, nhưng gửi tự động qua script bị giới hạn ở 100 người nhận.
- **Hành vi khi chạm trần:** `GmailApp.sendEmail` sẽ ném ngoại lệ *"Service invoked too many times for one day: email"*.
- **Cách hệ thống bảo vệ bạn:**
  - `Code.gs` tự động kiểm tra `MailApp.getRemainingDailyQuota()` trước mỗi lần gửi. Nếu hạn mức <= 0, cầu sẽ từ chối ngay lập tức với mã `QUOTA_EXCEEDED` thay vì nuốt lỗi.
  - Máy chủ Node.js áp dụng trần toàn cục `OTP_EMAIL_MAX_PER_HOUR_GLOBAL` (mặc định 50 thư/giờ) để tránh việc một đợt spam bot làm cạn sạch hạn mức cả ngày của bạn trong vài phút.

---

## 2. Checklist DNS Cho Tên Miền Riêng (Khi Sử Dụng Resend / Transactional Provider)

Nếu bạn muốn gửi thư hiển thị thương hiệu chính thức `support@quannguyens.com` thay vì Gmail cá nhân, bạn cần thêm các bản ghi DNS sau vào nhà cung cấp tên miền của `quannguyens.com` (Cloudflare, Namecheap, v.v.):

### 2.1 Bản ghi SPF (Sender Policy Framework)
- **Loại:** `TXT`
- **Tên (Host):** `@`
- **Giá trị (ví dụ dùng Resend):**
  ```text
  v=spf1 include:amazonses.com ~all
  ```
- **Ý nghĩa:** Khẳng định với các máy chủ nhận thư (Google, Yahoo, Microsoft) rằng hệ thống gửi thư được ủy quyền chính thức phát thư đại diện cho `quannguyens.com`.

### 2.2 Bản ghi DKIM (DomainKeys Identified Mail)
- Thêm 3 bản ghi `CNAME` do nhà cung cấp (Resend) cấp trong trang quản trị:
  - Host: `resend._domainkey.quannguyens.com`
  - Value: `...dkim.resend.com`
- **Ý nghĩa:** Chữ ký mật mã khóa công khai/khóa bí mật chống việc thư bị can thiệp, sửa đổi nội dung trên đường truyền mạng.

### 2.3 Bản ghi DMARC (Domain-based Message Authentication, Reporting, and Conformance)
- **Loại:** `TXT`
- **Tên (Host):** `_dmarc`
- **Giá trị khởi đầu (Chế độ giám sát):**
  ```text
  v=DMARC1; p=none; rua=mailto:dmarc-reports@quannguyens.com
  ```
- **Ý nghĩa:** Bắt buộc từ tháng 02/2024 theo chính sách mới của Google và Yahoo để ngăn chặn hoàn toàn việc mạo danh tên miền.

---

## 3. Hướng Dẫn Giám Sát Hoạt Động & Kiểm Tra Lỗi (Executions Log)

### 3.1 Cách xem nhật ký thực thi trên Google Apps Script
1. Đăng nhập [script.google.com](https://script.google.com/) bằng tài khoản `quannguyens403@gmail.com`.
2. Mở dự án Google Apps Script của bạn.
3. Ở thanh menu bên trái, bấm vào biểu tượng **Lượt thực thi (Executions)**.
4. Bạn sẽ thấy danh sách các lần gọi `doPost`:
   - **Trạng thái Hoàn thành (Completed):** Thư đã được gửi đi thành công.
   - **Trạng thái Thất bại (Failed):** Bấm trực tiếp vào dòng đó để xem chi tiết thông báo lỗi (ví dụ: `QUOTA_EXCEEDED`, `UNAUTHORIZED` do sai secret, hoặc `INVALID_RECIPIENT`).
5. Nếu thấy xuất hiện nhiều lệnh gọi lạ mà máy chủ không gửi: Kiểm tra ngay secret `QNS_SEND_SECRET` và đảm bảo bạn đã tạo Deployment mới có URL riêng biệt.

### 3.2 Cách kiểm tra bảng `email_outbox` trên máy chủ
Mỗi yêu cầu gửi OTP đều được máy chủ tự động lưu vào bảng SQLite `email_outbox` với các trạng thái:
- `queued`: Đang xếp hàng xử lý.
- `sent`: Đã gửi thành công qua cầu Apps Script hoặc Resend.
- `unknown`: Gặp timeout khi kết nối tới Apps Script (thư có thể đã đến Google nhưng phản hồi bị trễ). Mã OTP của khách **vẫn được giữ nguyên** trong hệ thống để khách có thể nhập mã bình thường.
- `failed`: Lỗi xác định (địa chỉ không tồn tại, hết hạn mức, cấu hình thiếu).

---

## 4. Quy Trình Ứng Phó Khi Nhận Thư Delay / Bounce (Mail Delivery Subsystem)

Khi bạn nhận được email từ `Mail Delivery Subsystem`:
1. **Mở thư thông báo:** Đọc dòng lý do trì hoãn hoặc trả về:
   - *"The recipient server did not accept our requests to connect"*: Máy chủ người nhận đang bảo trì, Gmail sẽ thử lại tối đa 48 giờ.
   - *"550 5.1.1 The email account that you tried to reach does not exist"*: Khách nhập sai chính tả địa chỉ email (ví dụ gmai.com thay vì gmail.com). Hệ thống đã có `emailRecipientGuard` để lọc sớm các domain không có bản ghi MX.
   - *"Address not found / Domain not found"*: Địa chỉ hoàn toàn không tồn tại.
2. **Kiểm tra địa chỉ nhận:**
   - Nếu địa chỉ có tiền tố `otp_register_...`: Đây là do các lệnh test cũ từng chạy với môi trường nạp biến thật. Phiên bản mới đã chặn 100% việc này qua `isAutomatedTestEnvironment()`.
   - Nếu là địa chỉ khách thật: Khách có thể đổi email khác bằng nút **"← Đổi email"** ngay trên giao diện website.

