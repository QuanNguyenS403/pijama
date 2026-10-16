# BÁO CÁO RÀ SOÁT A3 — BACKEND CORE & ORDERS
*Người thực hiện: A3 Backend Core & Orders Auditor*
*Phạm vi: `server/index.js`, `server/apiHandler.js`, `server/lib/orderPersistence.js`, `server/lib/adminOrdersHandler.js`, `server/lib/orderEvents.js`, `server/lib/googleSheets.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

Rà soát vòng đời đơn hàng từ tiếp nhận (`apiHandler.js`), lưu trữ bền vững (`orderPersistence.js`), cập nhật quản trị (`adminOrdersHandler.js`), phát sự kiện thời gian thực (`orderEvents.js`) đến đồng bộ Google Sheets (`googleSheets.js`).

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A3-001
- **ID:** A3-001
- **Tiêu đề:** Endpoint SSE `/api/orders/events` không kiểm tra token khi không truyền tham số, cho phép client ẩn danh nghe lén toàn bộ sự kiện đơn hàng của cả hệ thống (Xác minh T-5)
- **Mức đề xuất:** 🟠 P1 (T-5)
- **Vị trí:** `server/lib/orderEvents.js:41-47`, `server/lib/orderEvents.js:121-123`
- **Mô tả & tác động thực tế:**
  1. Trong `addSseClient`, việc kiểm tra token chỉ diễn ra nếu client truyền CẢ `orderId` VÀ `token` (`if (!isAdmin && orderId && token)`). Nếu client gọi `GET /api/orders/events` mà không truyền token, hoặc không truyền `orderId`, request hoàn toàn được chấp thuận với `scopedOrderId = null`.
  2. Khi có sự kiện đơn hàng mới được cập nhật, hàm `broadcastOrderUpdate` kiểm tra:
     ```js
     else if (!client.orderId || client.orderId === currentOrderId) {
       client.res.write(`event: order_updated\ndata: ${publicPayload}\n\n`)
     }
     ```
     Vì `client.orderId` là `null`, điều kiện `!client.orderId` luôn luôn ĐÚNG!
  3. Bất kỳ ai ngoài Internet chỉ cần mở 1 kết nối SSE đến `/api/orders/events` là nhận được mọi sự kiện biến động của TẤT CẢ đơn hàng trên toàn hệ thống trong thời gian thực (bao gồm `orderId`, `status`, `paymentStatus`, mã vận đơn `trackingCode`, lý do hủy `cancelReason`).
- **Bằng chứng:**
  `server/lib/orderEvents.js:41-47` và `server/lib/orderEvents.js:121-123`.
- **Cách tái hiện:**
  1. Mở kết nối SSE: `curl -N http://localhost:3001/api/orders/events`.
  2. Tại một tab khác, cập nhật hoặc tạo bất kỳ đơn hàng nào.
  3. Terminal `curl` lập tức nhận được payload `order_updated` chứa mã đơn hàng và mã tracking mà không cần bất kỳ quyền hạn nào.
- **Điều kiện tiên quyết:** Không cần đăng nhập, chỉ cần gọi endpoint SSE công khai.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:**
  - Bắt buộc phải có xác thực: Hoặc là Admin (qua cookie / session token), hoặc là Khách hàng sở hữu đơn hàng (phải có `orderId` VÀ `trackingToken` hợp lệ).
  - Nếu không có xác thực hợp lệ, trả về ngay lập tức `401 Unauthorized` hoặc `403 Forbidden`, tuyệt đối không cho phép kết nối SSE không scope.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A3-002
- **ID:** A3-002
- **Tiêu đề:** `formatAdminOrder` tự động gán trạng thái thanh toán mặc định là `PAID` cho phương thức `BANK_TRANSFER` nếu thiếu `paymentStatus`
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `server/lib/adminOrdersHandler.js:25-29`
- **Mô tả & tác động thực tế:**
  Trong hàm định dạng đơn hàng Admin:
  ```js
  let paymentStatus = order.payment?.status || order.paymentStatus
  if (!paymentStatus) {
    paymentStatus = paymentMethod === 'BANK_TRANSFER' ? 'PAID' : 'UNPAID'
  }
  ```
  Nếu một đơn hàng chuyển khoản ngân hàng bị thiếu trường `paymentStatus` (ví dụ do đơn hàng đọc từ Google Sheets cũ hoặc cache lỗi), hệ thống Admin sẽ hiển thị trạng thái thanh toán là `PAID` (Đã thanh toán) thay vì `AWAITING_PAYMENT` hoặc `UNPAID`. Điều này có thể khiến nhân viên đóng hàng và gửi hàng đi cho khách dù khách chưa thực sự chuyển tiền!
- **Bằng chứng:** `server/lib/adminOrdersHandler.js:25-29`.
- **Cách tái hiện:** Gọi `formatAdminOrder({ orderId: 'QNS-TEST', paymentMethod: 'BANK_TRANSFER' })` → kết quả trả về `paymentStatus: 'PAID'`.
- **Điều kiện tiên quyết:** Đơn hàng ngân hàng thiếu `paymentStatus`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Với phương thức `BANK_TRANSFER`, giá trị mặc định khi chưa có xác nhận phải luôn là `AWAITING_PAYMENT` (hoặc `UNPAID`), không bao giờ được mặc định là `PAID`.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A3-003
- **ID:** A3-003
- **Tiêu đề:** Quyền hủy đơn hàng `/api/orders/cancel-request` chấp nhận số điện thoại dùng phương thức `endsWith`, tiềm ẩn nguy cơ dò số điện thoại để hủy đơn trái phép
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `server/index.js:655-657`
- **Mô tả & tác động thực tế:**
  Trong endpoint `/api/orders/cancel-request`:
  ```js
  else if (cleanInputPhone && cleanCustomerPhone && cleanInputPhone.length >= 9 && (cleanInputPhone === cleanCustomerPhone || cleanCustomerPhone.endsWith(cleanInputPhone))) {
    isAuthorized = true
  }
  ```
  Việc dùng `cleanCustomerPhone.endsWith(cleanInputPhone)` với độ dài >= 9 số (ở VN số điện thoại 10 số) cho phép kẻ xấu chỉ cần biết 9 số cuối hoặc số điện thoại mà không cần `trackingToken` mật để hủy đơn của người khác nếu đoán được mã đơn.
- **Bằng chứng:** `server/index.js:655-657`.
- **Cách tái hiện:** Xem logic kiểm tra số điện thoại trong `server/index.js`.
- **Điều kiện tiên quyết:** Biết mã đơn hàng và số điện thoại của khách hàng.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Yêu cầu so khớp chính xác 100% số điện thoại chuẩn hóa (`cleanInputPhone === cleanCustomerPhone`) hoặc ưu tiên bắt buộc kiểm tra `trackingToken` được ký HMAC.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A3-004
- **ID:** A3-004
- **Tiêu đề:** Ghi đĩa đơn hàng `atomicWriteFileSync` chạy đồng bộ (`fs.writeFileSync`) cho toàn bộ mảng đơn hàng sau mỗi thao tác cập nhật
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `server/lib/orderPersistence.js:130-134`, `server/lib/orderPersistence.js:166`
- **Mô tả & tác động thực tế:**
  Mỗi khi gọi `orderPersistence.set()`, toàn bộ danh sách đơn hàng trong bộ nhớ (`Array.from(ordersMap.values())`) được `JSON.stringify` và ghi đè xuống đĩa đồng bộ (`fs.writeFileSync`). Khi số lượng đơn hàng tăng lên hàng nghìn đơn, việc tuần tự hóa toàn bộ JSON và I/O đĩa đồng bộ sẽ gây block luồng Node.js Event Loop, làm tăng độ trễ (latency) của toàn bộ các API khác.
- **Bằng chứng:** `server/lib/orderPersistence.js:130-134`.
- **Cách tái hiện:** Xem hàm `saveToDisk` trong `server/lib/orderPersistence.js`.
- **Điều kiện tiên quyết:** Số lượng đơn hàng lớn.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Áp dụng debounce cho việc flush to disk hoặc chuyển sang cơ chế SQLite / stream bất đồng bộ cho đơn hàng.
- **Độ tin cậy:** CONFIRMED.
