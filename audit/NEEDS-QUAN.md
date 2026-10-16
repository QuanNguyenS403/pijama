# HÀNG CHỜ QUAN DUYỆT (NEEDS-QUAN.md) — QuanNguyenS
*Thời điểm lập: 16/10/2026*
*Tình trạng: ✅ ĐÃ ĐƯỢC QUAN DUYỆT VÀ ÁP DỤNG THÀNH CÔNG (16/10/2026)*

---

## ⚠️ NGUYÊN TẮC:
Theo đúng quy định tại `PROTECTED-DATA.md`, các file dưới đây **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý SỬA**. Mọi đề xuất đã được chuẩn bị sẵn dưới dạng git diff mẫu cụ thể để Quan rà soát và quyết định cho phép sửa từng file.

---

## 1. ĐỀ XUẤT 1: THÊM HÀM ESCAPE HTML VÀO CÁC TEMPLATE EMAIL (CHỐNG HTML INJECTION)

- **File bảo vệ 🔒:** `server/lib/emailOwner.js`, `server/lib/emailCustomer.js`, `server/lib/emailStatusUpdates.js`
- **Lý do cần sửa:** Hiện tại các trường dữ liệu do khách hàng tự nhập (`fullName`, `shippingAddress`, `note`) được nối chuỗi trực tiếp vào HTML email không qua encode, cho phép chèn thẻ HTML hoặc script/link lừa đảo vào hộp thư của chủ shop và khách hàng.
- **Diff đề xuất mẫu cho `server/lib/emailOwner.js`:**
```diff
--- a/server/lib/emailOwner.js
+++ b/server/lib/emailOwner.js
@@ -4,2 +4,7 @@
+function escapeHtml(str) {
+  if (!str || typeof str !== 'string') return ''
+  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
+}
+
 const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'
@@ -58,4 +63,4 @@ export const sendOwnerEmail = async (order) => {
-        <span class="kv-label">Họ tên</span>     <span class="kv-value">${order.customer?.fullName}</span>
-        <span class="kv-label">Điện thoại</span> <span class="kv-value"><a href="tel:${order.customer?.phone}" style="color:#631521;text-decoration:none">${order.customer?.phone}</a></span>
-        <span class="kv-label">Email</span>       <span class="kv-value">${order.customer?.email}</span>
-        <span class="kv-label">Địa chỉ</span>    <span class="kv-value">${order.shipping?.fullAddress}</span>
-        ${order.note ? `<span class="kv-label">Ghi chú</span><span class="kv-value" style="color:#631521">${order.note}</span>` : ''}
+        <span class="kv-label">Họ tên</span>     <span class="kv-value">${escapeHtml(order.customer?.fullName)}</span>
+        <span class="kv-label">Điện thoại</span> <span class="kv-value"><a href="tel:${escapeHtml(order.customer?.phone)}" style="color:#631521;text-decoration:none">${escapeHtml(order.customer?.phone)}</a></span>
+        <span class="kv-label">Email</span>       <span class="kv-value">${escapeHtml(order.customer?.email)}</span>
+        <span class="kv-label">Địa chỉ</span>    <span class="kv-value">${escapeHtml(order.shipping?.fullAddress)}</span>
+        ${order.note ? `<span class="kv-label">Ghi chú</span><span class="kv-value" style="color:#631521">${escapeHtml(order.note)}</span>` : ''}
```

---

## 2. ĐỀ XUẤT 2: LOẠI BỎ SỐ TÀI KHOẢN NGÂN HÀNG HARDCODE TRONG `emailCustomer.js`

- **File bảo vệ 🔒:** `server/lib/emailCustomer.js:40, 143`
- **Lý do cần sửa:** Số tài khoản `1050773506` đang bị hardcode trực tiếp trong template email hóa đơn gửi khách, thay vì đọc từ biến môi trường `BANK_ACCOUNT_NUMBER` và `BANK_ACCOUNT_NAME`. Nếu Quan đổi số tài khoản trong `.env`, khách hàng nhận email vẫn thấy số tài khoản cũ.
- **Diff đề xuất mẫu cho `server/lib/emailCustomer.js`:**
```diff
--- a/server/lib/emailCustomer.js
+++ b/server/lib/emailCustomer.js
@@ -39,3 +39,5 @@ export const sendCustomerEmail = async (order) => {
-  const qrUrl = `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent('QNS ' + order.orderId)}&accountName=NGUYEN%20DUC%20QUAN`
+  const bankAcc = process.env.BANK_ACCOUNT_NUMBER || '1050773506'
+  const bankName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN'
+  const qrUrl = `https://img.vietqr.io/image/vietcombank-${bankAcc}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent('QNS ' + order.orderId)}&accountName=${encodeURIComponent(bankName)}`
@@ -142,3 +144,3 @@ export const sendCustomerEmail = async (order) => {
-        <span class="bank-highlight">1050773506</span>
+        <span class="bank-highlight">${bankAcc}</span>
```

---

## 3. VIỆC CỦA QUAN (NGOÀI TẦM CAN THIỆP CỦA AGENT)

1. **Cung cấp Webhook Secret thật của SePay:** Cần điền vào file `.env` trên máy chủ:
   `SEPAY_WEBHOOK_API_KEY=...` hoặc `PAYMENT_WEBHOOK_SECRET=...` để kích hoạt đối soát tự động khi bán hàng thật.
2. **Cung cấp Webhook Secret của Viettel Post:** Cần điền vào file `.env` trên máy chủ:
   `VIETTELPOST_WEBHOOK_SECRET=...` để đồng bộ an toàn trạng thái giao hàng từ Viettel Post.
3. **Quyết định kinh doanh về tính năng SMS AI Verify:** Xác nhận đồng thuận hủy bỏ ô nhập SMS tự do trên trang thanh toán chuyển khoản để ngăn chặn gian lận 100%.
