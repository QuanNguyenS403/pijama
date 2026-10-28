# Sổ Tay Vận Hành & Nghiệm Thu Thanh Toán VietQR (Runbook) — QuanNguyenS

*Tài liệu hướng dẫn trực quan dành riêng cho Quản trị viên (Quan)*

---

## 1. Cấu Hình Nhận Tín Hiệu Ngân Hàng Tự Động (Webhook)

> **Lưu ý quan trọng:** Hệ thống đã được lập trình sẵn sàng 100% để tiếp nhận webhook chuẩn SePay / Casso / Napas. Việc đăng ký tài khoản, kết nối tài khoản ngân hàng Vietcombank (VCB) và lựa chọn gói dịch vụ do Quan trực tiếp thực hiện trên cổng chính thức của nhà cung cấp.

### Các bước kết nối:
1. **Đăng nhập dịch vụ giám sát biến động số dư** (ví dụ: [SePay](https://my.sepay.vn)).
2. **Thêm tài khoản ngân hàng:** Kết nối tài khoản Vietcombank nhận tiền của shop theo hướng dẫn của nhà cung cấp.
3. **Cấu hình Webhook:**
   - **URL Webhook:** `https://<ten-mien-website-cua-ban>/api/payment/webhook`
   - **Kiểu xác thực (Authentication):** Chọn `API Key` (gửi header `Authorization: Apikey <KEY>`) hoặc `Bearer Token`.
   - **Tạo mã Secret:** Sao chép mã API Key bí mật do hệ thống cấp.
4. **Cấu hình trên Server:**
   - Mở file `.env` (hoặc cấu hình Environment Variables trên máy chủ hosting).
   - Thêm dòng biến môi trường:
     ```env
     SEPAY_WEBHOOK_API_KEY=ma_api_key_cua_ban
     ```
   - Khởi động lại server để nhận biến môi trường mới.

---

## 2. Quy Trình Nghiệm Thu Thực Tế (Quan Thực Hiện)

1. **Tạo đơn hàng thử nghiệm:**
   - Truy cập website, chọn 1 sản phẩm vào giỏ hàng và tiến hành thanh toán.
   - Chọn phương thức: **Chuyển khoản VietQR (Napas 24/7 - Giảm 10%)**.
   - Bấm đặt hàng → Hệ thống chuyển sang trang thanh toán có mã QR VietQR kèm đồng hồ đếm ngược 10 phút.
2. **Thực hiện chuyển khoản thật (số tiền nhỏ):**
   - Mở ứng dụng ngân hàng, quét mã QR hiển thị trên màn hình.
   - Giữ nguyên nội dung chuyển khoản tự động điền dạng: `QNS-XXXXXX-XXXX`.
   - Hoàn tất chuyển khoản trên app ngân hàng.
3. **Quan sát kết quả tự động:**
   - Trong vòng 5–15 giây sau khi ngân hàng ghi nhận tiền vào:
     - Trang QR tự động phát hiện tiền về, hiển thị thông báo "Thanh Toán Thành Công!" và chuyển sang trang hóa đơn.
     - Khách hàng nhận đúng 01 email xác nhận đặt hàng kèm hóa đơn chi tiết.
     - Quan (Chủ shop) nhận đúng 01 email thông báo đơn đã thanh toán.
     - Trên trang Admin `/admin/orders`: Đơn hàng tự động chuyển sang trạng thái `CONFIRMED` và thanh toán `PAID`.

---

## 3. Chế Độ Vận Hành Thủ Công An Toàn (Khi Chưa Có Webhook)

Nếu Quan chưa kết nối dịch vụ Webhook tự động hoặc dịch vụ ngân hàng bảo trì:
1. **Khách hàng đặt hàng:** Khách quét QR chuyển khoản, sau đó bấm nút:
   **"TÔI ĐÃ CHUYỂN KHOẢN — BÁO CHO CỬA HÀNG"**.
2. **Trạng thái ghi nhận:**
   - Hệ thống chuyển sang pha **"Đang Chờ Xác Nhận Thanh Toán"** (màu trung tính, không hiện chữ thành công ảo).
   - Khách hàng được hướng dẫn chờ vài phút để cửa hàng đối soát.
3. **Quy trình kiểm tra của Quan (Hằng ngày):**
   - Mở trang Quản trị đơn hàng: `/admin/orders`.
   - Bấm vào tab bộ lọc: **"📩 Khách báo CK — Chờ đối soát"**.
   - Mở app ngân hàng Vietcombank kiểm tra số dư và mã đơn trong nội dung chuyển khoản.
   - Khi thấy tiền đã về đúng số tiền: Bấm nút **"💳 Xác nhận đã nhận tiền"**, nhập ghi chú đối soát (ví dụ: *"Đã nhận 390k lúc 14:02 VCB mã GD 998811"*).
   - Hệ thống lập tức kích hoạt đơn sang `CONFIRMED`, gán `PAID`, gửi email xác nhận cho khách và ghi nhật ký an ninh.
   - Nếu sau 24 giờ khách chưa chuyển: Quan bấm **"❌ Hủy đơn"** (nhập lý do "Khách chưa chuyển khoản").

---

## 4. Xử Lý "Giao Dịch Ngân Hàng Cần Xử Lý" (Tiền Về Trễ, Sai Tiền, Sai Nội Dung)

Nếu khách chuyển khoản nhưng viết sai mã đơn, hoặc chuyển tiền khi đơn đã quá hạn 10 phút:
1. Mở `/admin/orders` → Ngay đầu trang xuất hiện khung cảnh báo màu vàng:
   **"⚠️ Có X giao dịch ngân hàng cần đối soát"**.
2. Bấm **"Xem chi tiết giao dịch"**:
   - **Trường hợp tiền chuyển trễ sau khi đơn hết hạn (`LATE_AFTER_EXPIRY`):** Bấm **"Gán vào đơn"**, nhập mã đơn hàng của khách để khôi phục và xác nhận `PAID`, hoặc bấm **"Bỏ qua"** nếu đã chuyển khoản hoàn trả lại cho khách.
   - **Trường hợp sai số tiền (`AMOUNT_MISMATCH`):** Liên hệ khách hàng theo số điện thoại trên đơn để thu thêm hoặc hoàn trả phần chênh lệch, sau đó gán đơn hoặc bỏ qua.
   - **Trường hợp không ghi mã đơn (`UNMATCHED`):** Tra cứu số tiền và nội dung để tìm khách hàng tương ứng rồi bấm **"Gán vào đơn"**.

