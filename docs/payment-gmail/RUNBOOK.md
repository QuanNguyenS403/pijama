# Sổ Tay Vận Hành Hệ Thống Thanh Toán VietQR Tự Động (RUNBOOK) — QuanNguyenS

Tài liệu hướng dẫn quản trị, giám sát và xử lý sự cố cho hệ thống thanh toán VietQR tự động qua Email biến động số dư ngân hàng (Gmail + Google Apps Script Bridge).

---

## 1. Ba Sự Thật Cốt Lõi Cần Nắm Rõ

1. **Thời gian xác nhận phụ thuộc vào ngân hàng & chu kỳ quét:**
   - Thời gian xác nhận đơn hàng = (Độ trễ ngân hàng gửi email biến động) + (Chu kỳ quét của Apps Script ~1 phút).
   - Vì vậy, thời gian xác nhận thực tế thường dao động trong khoảng **1 – 2 phút** kể từ lúc khách bấm chuyển khoản thành công trên app ngân hàng.
2. **Ngân hàng không thể "chặn" khách quét mã QR lần 2 hoặc quét mã đã hết hạn:**
   - Mã VietQR thực chất là chuỗi ký tự chứa STK + Số tiền + Nội dung. Phía app ngân hàng không có cơ chế biết mã đã "hết hạn" hay "đã dùng".
   - Hệ thống QNS bảo vệ an toàn bằng cách:
     - Ẩn mã QR trên màn hình sau 10 phút (`PAYMENT_QR_TTL_SECONDS = 600`).
     - Giao dịch chuyển muộn (`LATE_AFTER_EXPIRY`) hoặc chuyển lặp lại (`DUPLICATE_PAYMENT`) sẽ **không tự động duyệt đơn** mà được đưa vào hàng đợi cảnh báo để chủ shop hoàn tiền hoặc xử lý thủ công.
3. **Email giả mạo là rủi ro có thật được phòng ngừa đa tầng:**
   - Bất kỳ ai cũng có thể gửi email đến hộp thư. Hệ thống QNS đã dựng 3 tầng bảo vệ vững chắc:
     - **Tầng 1:** Kiểm tra chữ ký số mật mã HMAC-SHA256 và chống lệch giờ (Skew <= 300s) giữa Apps Script và máy chủ QNS.
     - **Tầng 2:** Kiểm tra nghiêm ngặt kết quả xác thực tên miền DKIM / DMARC (`dkim=pass`, `header.d=vietcombank.com.vn`) từ máy chủ ngân hàng do Gmail xác nhận.
     - **Tầng 3:** Thư không đạt chuẩn sẽ bị gắn nhãn `UNTRUSTED_EMAIL`, từ chối xác nhận đơn và lập tức gửi email cảnh báo chủ shop.

---

## 2. Quy Trình Vận Hành Hàng Ngày Dành Cho Chủ Shop (Admin)

### 2.1. Giám Sát Sức Khỏe Cầu Nối (Bridge Health Badge)
Trên trang quản trị đơn hàng (`/admin/orders`), tại góc trên bên phải có huy hiệu trạng thái:
- **🟢 Cầu nối Gmail: Online (Xanh lá):** Script hoạt động ổn định, có tín hiệu gửi về trong vòng dưới 3 phút.
- **🟡 Cầu nối Gmail: Chậm (Vàng):** Script chưa gửi tín hiệu trong 3 – 5 phút (có thể do mạng Google hoặc chu kỳ quét trễ nhẹ).
- **🔴 Cầu nối Gmail: Mất tín hiệu (Đỏ):** Script im lặng quá 5 phút. Nếu trong hệ thống có đơn đang chờ thanh toán, máy chủ sẽ tự động gửi 1 email cảnh báo khẩn tới chủ shop.

### 2.2. Xử Lý Khung "Giao Dịch Cần Xử Lý" (Unresolved Transactions)
Khi có giao dịch ngân hàng không thể tự động khớp (do khách nhập sai mã đơn, chuyển thiếu tiền, chuyển trễ, v.v.), giao dịch sẽ xuất hiện trong bảng **Giao Dịch Ngân Hàng Chờ Xử Lý**:

| Trường hợp | Hiện tượng | Cách xử lý của Admin |
|---|---|---|
| **Sai mã đơn (`UNMATCHED`)** | Khách quên ghi mã đơn hoặc ghi sai cú pháp (ví dụ: `Nguyen Van A chuyen tien`). | 1. Xem số tiền và giờ chuyển.<br>2. Bấm nút **Gán đơn hàng** -> Nhập đúng mã đơn (ví dụ: `QNS-123456-ABCD`) -> Hệ thống kiểm tra đúng số tiền và tự động chuyển đơn sang `PAID/CONFIRMED`. |
| **Sai số tiền (`AMOUNT_MISMATCH`)** | Đơn 390.000đ nhưng khách chuyển 380.000đ hoặc 400.000đ. | 1. Hệ thống **tuyệt đối không tự xác nhận đơn**.<br>2. Admin liên hệ khách hàng để yêu cầu chuyển bổ sung hoặc hoàn tiền.<br>3. Bấm **Bỏ qua** hoặc **Đã hoàn tiền** để đóng giao dịch. |
| **Tiền về muộn (`LATE_AFTER_EXPIRY`)** | Khách để quá hạn 10 phút + 10 phút đối soát mới chuyển tiền, đơn đã bị hủy tự động. | 1. Đơn **không tự động hồi sinh** để tránh bán trùng hàng tồn kho.<br>2. Admin kiểm tra tồn kho: nếu còn hàng, có thể tạo đơn mới cho khách rồi dùng nút gán đơn; nếu hết hàng, bấm **Hoàn tiền** cho khách. |
| **Chuyển tiền 2 lần (`DUPLICATE_PAYMENT`)** | Khách lỡ tay chuyển 2 lần cho cùng một đơn hàng. | 1. Đơn hàng đầu tiên vẫn giữ nguyên `PAID`.<br>2. Khoản tiền chuyển thừa thứ 2 được gắn cờ `DUPLICATE_PAYMENT`.<br>3. Admin chuyển khoản hoàn trả tiền thừa cho khách và bấm **Đã hoàn tiền**. |

### 2.3. Quy Trình Xác Nhận Tiền Về Thủ Công (`MARK_PAID`)
Dành cho trường hợp khách chuyển khoản qua ngân hàng khác, nộp tiền mặt tại quầy hoặc có biến động nhưng email về chậm:
1. Tại danh sách đơn hàng, tìm đơn cần duyệt.
2. Bấm nút **Xác nhận đã nhận tiền (MARK_PAID)**.
3. Hộp thoại yêu cầu nhập lý do đối soát:
   - **Bắt buộc:** Nhập lý do tối thiểu 10 ký tự (ví dụ: `Khách chuyển qua Techcombank lúc 14:20, đã kiểm tra sao kê khớp`).
   - Thao tác này được ghi nhật ký bảo mật (`logSecurityAudit`) kèm danh tính người thực hiện.
4. Đơn hàng lập tức được chuyển sang `PAID` và `CONFIRMED`, gửi email xác nhận cho khách và cập nhật Google Sheet.

---

## 3. Hướng Dẫn Xử Lý Sự Cố Kỹ Thuật (Troubleshooting)

### Sự cố 1: Huy hiệu Bridge báo Đỏ (Mất tín hiệu > 5 phút)
1. Đăng nhập vào [script.google.com](https://script.google.com/) bằng tài khoản Gmail chạy bridge (`quannguyentop1lux@gmail.com`).
2. Mở dự án `QNS-VietQR-Bank-Bridge` -> Chọn tab **Kích hoạt (Triggers)**.
3. Kiểm tra xem trigger `syncBankEmails` có bị tắt hoặc báo lỗi không:
   - Nếu báo lỗi ủy quyền (Authorization): Bấm **Chạy (Run)** hàm `selfTestSignature` để cấp lại quyền OAuth.
   - Nếu trigger bị mất: Tạo lại trigger hẹn giờ mỗi 1 phút theo hướng dẫn cài đặt.

### Sự cố 2: Thay đổi Tên miền máy chủ (Domain / IP Migration)
1. Mở dự án Apps Script -> **Cài đặt dự án (Project Settings)** -> **Các thuộc tính tập lệnh (Script Properties)**.
2. Sửa thuộc tính `QNS_ENDPOINT` thành URL mới (ví dụ: `https://new-domain.com/api/payment/bank-email`).
3. Bấm **Lưu thuộc tính tập lệnh**.

### Sự cố 3: Thay đổi Khóa bí mật (Zero-Downtime Secret Rotation)
Để đổi khóa bí mật mà không làm gián đoạn việc nhận email biến động:
1. Tạo một khóa bí mật mới: `NEW_SECRET_KEY_RANDOM_STRING_HERE`.
2. Trên server QNS (file `.env`):
   - Đặt `GMAIL_BRIDGE_SECRET_PREV` = Khóa bí mật cũ.
   - Đặt `GMAIL_BRIDGE_SECRET` = Khóa bí mật mới.
   - Khởi động lại server. (Server lúc này chấp nhận cả khóa cũ và khóa mới).
3. Trên Google Apps Script:
   - Cập nhật thuộc tính `QNS_SECRET` thành khóa bí mật mới.
4. Sau 24 giờ khi đã ổn định, xóa bỏ dòng `GMAIL_BRIDGE_SECRET_PREV` khỏi file `.env` server.

---

## 4. Định Hướng Nâng Cấp Phase 2 (Khi Cần Tốc Độ Dưới 10 Giây)

Hiện tại giải pháp Polling 1 phút qua Google Apps Script hoàn toàn miễn phí, độc lập, không tốn chi phí duy trì cổng thanh toán. Khi quy mô cửa hàng mở rộng, có 2 lộ trình nâng cấp:

1. **Lộ trình A — Gmail Push Notifications (Google Cloud Pub/Sub):**
   - Đăng ký Google Cloud Console -> Tạo Pub/Sub Topic -> Thiết lập Gmail Watch API.
   - Mỗi khi có email ngân hàng mới, Google Cloud tự động bắn Webhook Push về server QNS trong vòng **1 – 3 giây**.
   - Phù hợp khi lượng đơn đạt > 500 đơn/ngày.
2. **Lộ trình B — Dịch vụ Webhook Ngân Hàng Chuyên Dụng (SePay / Casso):**
   - Mã nguồn QNS đã chuẩn hóa thống nhất route `/api/payment/webhook` và bộ giải quyết giao dịch `settleBankTransaction`.
   - Có thể bật lại cổng SePay/Casso làm kênh phụ trợ (Auxiliary Channel) bất cứ lúc nào bằng cách cấu hình API Key.

