# BÁO CÁO KIỂM CHỨNG LỖ HỔNG HỆ THỐNG THANH TOÁN VIETQR (B1 – B15)
*Dự án: QuanNguyenS (pijama) — Phiên bản tích hợp Email Biến Động Số Dư (Gmail + Apps Script)*
*Thời điểm kiểm chứng: 27/10/2026*

---

## 1. TỔNG QUAN KIỂM CHỨNG
Toàn bộ 15 lỗ hổng (B1 – B15) trong mã nguồn đã được rà soát và kiểm chứng trực tiếp trên từng file và dòng code.

| # | Vị trí kiểm chứng | Hiện tượng trong code | Hậu quả thực tế | Trạng thái |
|---|---|---|---|---|
| **B1** | `src/pages/BankTransferPaymentPage.jsx` dòng ~239–257 | Polling 3 giây: `data.status === 'PAID' \|\| data.isQrValid === false` → `completePaymentAndRedirect(...)`. QR hết hạn → server trả `isQrValid: false` (`paymentWebhook.js` ~283–290). | Hết hạn → trang tự chuyển sang "Đặt hàng thành công" dù không có tiền vào tài khoản. | Đã xác minh |
| **B2** | `src/pages/BankTransferPaymentPage.jsx` dòng ~167–230, ~668–685 | Client tự ghi `payment.status='CUSTOMER_CLAIMED_PAID'` vào localStorage rồi `navigate('/dat-hang-thanh-cong')`. Nút "TÔI ĐÃ CHUYỂN KHOẢN" cho phép khách tự bấm. | Trạng thái do client tự tạo. Cần gỡ bỏ hoàn toàn nút bấm và đường claim theo quy trình tự động mới. | Đã xác minh |
| **B3** | `src/pages/BankTransferPaymentPage.jsx` dòng ~76–91, ~66–73 | Hết 5 phút client tự đặt `CANCELLED` vào localStorage; đồng hồ lấy giờ máy khách; gọi `POST /api/payment/generate-qr` với `amount` do client gửi. | Client-state lệch với Server-state; người dùng chỉnh giờ máy tính làm sai lệch logic. | Đã xác minh |
| **B4** | `src/pages/OrderSuccessPage.jsx` dòng ~171–176, ~265–273 | Tiêu đề luôn hiện "Đặt Hàng Thành Công!"; nhánh claim hiện "✅ ... đã được ghi nhận thành công"; tin location.state/localStorage. | Màn hình gây hiểu lầm cho khách hàng là đơn đã được duyệt dù chưa có tiền. | Đã xác minh |
| **B5** | `server/lib/paymentWebhook.js` dòng ~29, ~43 | Chỉ bỏ tiền tố `Bearer`; SePay gửi `Authorization: Apikey <KEY>` dẫn tới 401. Test `tests/phase1SecurityAndIntegrity.test.js` chỉ thử Bearer. | Nhánh webhook cũ không nhận được tín hiệu từ SePay thật. | Đã xác minh |
| **B6** | `server/lib/paymentWebhook.js` dòng ~78–85, ~102–123 | Không có mã đơn → trả 200 "Đã lưu giao dịch..." nhưng không lưu gì; đơn hủy → 400; sai tiền → 400, bỏ. | Tiền chuyển trễ hoặc sai số tiền không còn dấu vết để đối soát. | Đã xác minh |
| **B7** | `server/lib/paymentWebhook.js` `confirmOrderPaymentManually`, `markOrderPaidByAI`; routes `server/index.js` ~265, ~318, ~325 | `/api/payment/claim` công khai, ghi đè `payment.status` kể cả khi đã PAID/hủy/COD; `/api/payment/ai-verify` tương tự. | Nguy cơ hạ cấp đơn đã thanh toán hoặc spam email chủ shop. Cần trả HTTP 410 Gone theo quy trình tự động. | Đã xác minh |
| **B8** | `server/lib/paymentWebhook.js` `getOrderPaymentStatus`; `server/apiHandler.js` ~159 | Hết hạn chỉ xử lý khi có người GET; `redeemVoucher` ngay khi tạo đơn VietQR chưa trả tiền; nhả voucher chỉ có ở cancel-request. | Đơn kẹt `AWAITING_PAYMENT` mãi nếu khách đóng tab; voucher bị giam giữ không giải phóng. | Đã xác minh |
| **B9** | `server/lib/adminOrdersHandler.js` dòng 9, ~293–299, ~362–365; `src/pages/admin/AdminOrdersPage.jsx` ~237 | `AWAITING_PAYMENT → CONFIRMED` không kiểm tiền; `TOGGLE_PAYMENT` đổi PAID tự do và mặc định PAID; `DELIVER` tự gán PAID. | Thao tác của quản trị viên vô tình hợp thức hóa đơn chưa trả tiền thành đã thu tiền. | Đã xác minh |
| **B10** | `server/index.js` ~472; `src/lib/orderSync.js` ~150–154 | Thiếu dữ liệu thì mặc định `PAID` (fail-open); `isDelivered` tự suy `PAID` cho cả chuyển khoản. | Hiển thị "đã thanh toán" sai sự thật khi dữ liệu rỗng. | Đã xác minh |
| **B11** | `server/apiHandler.js` ~136; `server/lib/paymentWebhook.js` ~249, ~267; trang QR ~66–73 + chữ trên UI | Hạn QR 5 phút (300 giây) hard-code rải rác nhiều nơi. | Thiếu tính nhất quán. Cần gom lại thành hằng số `PAYMENT_QR_TTL_SECONDS = 600` (10 phút). | Đã xác minh |
| **B12** | `server/lib/aiNapasQrService.js` `parseAndMatchTransactionAI` ~246–342 | Bộ khớp mờ: dung sai số tiền ±100đ, khớp mã đơn bằng `includes` 2 chiều, nhận cả chuỗi 10–15 chữ số bất kỳ làm mã đơn. | Rất nguy hiểm nếu dùng để tự xác nhận tiền; dễ khớp nhầm đơn hàng của khách khác. | Đã xác minh |
| **B13** | `server/index.js` ~199–236 (`POST /api/payment/generate-qr`), ~239–262 (`GET /api/payment/napas-qr`) | Cả hai route công khai, nhận `amount` từ client, không kiểm tra đơn có đang chờ/hết hạn/đã trả. | Kẻ gian có thể tự tạo mã QR với số tiền 1.000đ cho đơn hàng giá trị cao; QR vẫn được tạo sau khi đơn đã hủy. | Đã xác minh |
| **B14** | `tests/paymentQrIntegrity.test.js`, `tests/aiVerifySecurity.test.js`, `tests/phase1SecurityAndIntegrity.test.js` | Các test tự dựng lại route trong test app thay vì import handler thật từ `server/index.js`. | Sửa route thật nhưng test vẫn xanh ảo do test chạy trên handler giả lập riêng. | Đã xác minh |
| **B15** | `server/lib/loyalty/orderHook.js` ~22; `server/lib/orderPersistence.js` ~182–195 | Điểm hội viên chỉ cộng khi `DELIVERED`; hủy → hoàn. | Cần bảo đảm chốt chặn I4 ngăn đơn chưa `PAID` sang `DELIVERED` để điểm thưởng không bị kích hoạt sai. | Đã xác minh |
