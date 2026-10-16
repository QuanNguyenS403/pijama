# BÁO CÁO RÀ SOÁT A1 — FRONTEND LOGIC
*Người thực hiện: A1 Frontend Logic Auditor*
*Phạm vi: `src/**` (pages, components, store, hooks, lib)*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI & PHÂN TÍCH

Frontend được xây dựng bằng React 19 + Vite + TailwindCSS + Zustand + Framer Motion.
Các luồng chính đã rà soát:
1. Giỏ hàng & State (`src/store/cartStore.js`, `src/hooks/useCart.js`, `src/components/cart/*`)
2. Checkout & Đặt hàng (`src/pages/CheckoutPage.jsx`, `src/data/checkoutConfig.js`, `src/lib/orderService.js`)
3. Thanh toán Chuyển khoản & Duyệt tự động (`src/pages/BankTransferPaymentPage.jsx`, `src/pages/OrderSuccessPage.jsx`)
4. Xác thực khách hàng & OAuth (`src/components/auth/AuthModal.jsx`, `src/pages/AccountPage.jsx`, `src/lib/googleAuth.js`, `src/lib/apiClient.js`)
5. Tra cứu đơn hàng & Lịch sử (`src/components/ui/OrdersHistoryDrawer.jsx`, `src/components/orders/OrderLookupModal.jsx`)

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A1-001
- **ID:** A1-001
- **Tiêu đề:** Giao diện cho phép người dùng tự gửi SMS giả mạo qua ô nhập văn bản để kích hoạt duyệt thanh toán tức thì (`POST /api/payment/ai-verify`)
- **Mức đề xuất:** 🔴 P0 (Đồng lõa với L-2)
- **Vị trí:** `src/pages/BankTransferPaymentPage.jsx:167-199`, `src/pages/BankTransferPaymentPage.jsx:730-775`
- **Mô tả & tác động thực tế:** Trang thanh toán hiển thị hộp textarea mời gọi khách hàng: *"Nếu bạn vừa chuyển tiền, dán tin nhắn SMS biến động số dư hoặc mã giao dịch Vietcombank vào đây. Trợ lý AI sẽ đối soát và duyệt đơn tức thì"*. Client gửi trực tiếp chuỗi ký tự tự gõ lên `/api/payment/ai-verify`. Khi server trả về `status: PAID`, frontend ngay lập tức chuyển hướng đơn hàng sang trạng thái `CONFIRMED` và hoàn tất thanh toán. Kẻ gian chỉ cần copy định dạng SMS mẫu ghi trên placeholder là đơn hàng được xác nhận đã thanh toán mà không phải trả tiền thật.
- **Bằng chứng:**
  ```jsx
  // src/pages/BankTransferPaymentPage.jsx:173-187
  const res = await fetch('/api/payment/ai-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText: aiInputText.trim(),
      orderId,
    }),
  })
  const data = await res.json()
  if (data?.success && data?.status === 'PAID') {
    setAiMessage({ type: 'success', text: 'AI đã khớp giao dịch thành công 100%! Đang chuyển hướng...' })
    setTimeout(() => {
      completePaymentAndRedirect(null, false)
    }, 1200)
  }
  ```
- **Cách tái hiện:**
  1. Đặt 1 đơn hàng chuyển khoản (ví dụ mã `QNS-TEST-123456`, tổng tiền 350.000đ).
  2. Tại trang `BankTransferPaymentPage`, mở ô "Dán SMS để duyệt tức thì".
  3. Dán chuỗi: `VCB: +350,000VND vao TK 1050773506. ND: QNS-TEST-123456`.
  4. Bấm gửi → Client nhận status PAID và chuyển hướng đơn sang CONFIRMED.
- **Điều kiện tiên quyết:** Có mã đơn hàng và số tiền (khách hàng biết rõ khi đặt).
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Gỡ bỏ hoàn toàn hộp nhập SMS giả lập này khỏi giao diện người dùng. Việc xác nhận thanh toán tự động chỉ được thực hiện thông qua Server-to-Server Webhook có chữ ký xác thực từ SePay/Ngân hàng hoặc Polling trạng thái hợp lệ từ Server.
- **Độ tin cậy:** CONFIRMED (Đã kiểm chứng luồng code client và request server).

---

### Phát hiện A1-002
- **ID:** A1-002
- **Tiêu đề:** Modal đăng nhập `AccountPage` mở backdoor đăng nhập nhanh dưới danh nghĩa Chủ Shop / Quý Khách VIP bằng chuỗi giả lập `mock-google-token`
- **Mức đề xuất:** 🔴 P0 (Đồng lõa với L-1)
- **Vị trí:** `src/pages/AccountPage.jsx:64`, `src/pages/AccountPage.jsx:126`, `src/pages/AccountPage.jsx:834-865`
- **Mô tả & tác động thực tế:** Trong `AccountPage.jsx`, khi đăng nhập Google thất bại hoặc click vào fallback, một modal `devModalOpen` xuất hiện có sẵn các nút bấm đăng nhập nhanh:
  - Nút "quannguyens403@gmail.com - Chủ shop / Quản trị viên QuanNguyenS"
  - Nút "khachhang.vip@gmail.com - Khách hàng thân thiết VIP Club"
  Khi người dùng click, hàm `handleQuickLoginWithEmail` tự tạo token giả `mock-google-token:google_<timestamp>:<email>:<name>` gửi lên `/api/auth/google`. Kết quả là bất kỳ người dùng nào trên website cũng có thể đăng nhập thẳng vào tài khoản của Chủ Shop hoặc bất kỳ ai.
- **Bằng chứng:**
  ```jsx
  // src/pages/AccountPage.jsx:834-847
  <button
    type="button"
    onClick={() => {
      setDevModalOpen(false)
      handleQuickLoginWithEmail('quannguyens403@gmail.com', 'QuanNguyenS Store Owner')
    }}
  >
  ```
- **Cách tái hiện:**
  1. Truy cập trang `/tai-khoan`.
  2. Nhấp đăng nhập Google khi chưa cấu hình Google Client ID hoặc chặn popup.
  3. Modal hiện lên, bấm nút "quannguyens403@gmail.com".
  4. Client gửi request và đăng nhập thành công vào tài khoản chủ shop!
- **Điều kiện tiên quyết:** Truy cập trang `/tai-khoan`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Xóa bỏ hoàn toàn modal dev / backdoor đăng nhập nhanh trong `AccountPage.jsx`. Đăng nhập Google phải dùng Google Identity Services chính thức và truyền ID Token hợp lệ từ Google.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A1-003
- **ID:** A1-003
- **Tiêu đề:** Client tự chế tạo `mock-google-token` khi dùng OAuth2 Token Client trong `googleAuth.js` và `AuthModal.jsx`
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `src/lib/googleAuth.js:82-89`, `src/components/auth/AuthModal.jsx:33`
- **Mô tả & tác động thực tế:** Client dùng `google.accounts.oauth2.initTokenClient` nhận về `access_token`, gọi endpoint Google `userinfo` lấy email, nhưng thay vì gửi `access_token` hoặc `id_token` chuẩn lên server để server verify với Google, client lại tự ráp chuỗi `mock-google-token:${userInfo.sub}:${userInfo.email}:${userInfo.name}` và gửi lên `/api/auth/google`. Điều này buộc server phải chấp nhận token không có chữ ký.
- **Bằng chứng:**
  ```js
  // src/lib/googleAuth.js:82-84
  await onSuccess({
    credential: `mock-google-token:${userInfo.sub || 'google_' + Date.now()}:${userInfo.email}:${encodeURIComponent(userInfo.name || 'Quý khách Google')}`,
  ```
- **Cách tái hiện:** Kiểm tra hàm `loginWithGoogle` trong `src/lib/googleAuth.js:83`.
- **Điều kiện tiên quyết:** Người dùng đăng nhập qua Google popup client-side.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Đồng bộ phương thức Google Sign-In sang Google Identity Services chuẩn (GIS credential ID Token JWT) hoặc gửi `access_token` hợp lệ để server verify qua `oauth2/v3/tokeninfo`. Loại bỏ hoàn toàn tiền tố `mock-google-token`.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A1-004
- **ID:** A1-004
- **Tiêu đề:** Số tài khoản ngân hàng và thông tin Vietcombank bị hardcode tĩnh ở nhiều component client, không đồng bộ với cấu hình server
- **Mức đề xuất:** 🟡 P2 (T-3)
- **Vị trí:** `src/components/ui/OrdersHistoryDrawer.jsx:607, 812, 814`, `src/pages/BankTransferPaymentPage.jsx:124, 571, 575`, `src/data/checkoutConfig.js:21`
- **Mô tả & tác động thực tế:** Số tài khoản `1050773506` và chủ tài khoản `NGUYEN DUC QUAN` bị gắn cứng trực tiếp trong JSX của nhiều trang thay vì nhận từ API cấu hình hoặc biến môi trường `BANK_ACCOUNT_NUMBER`. Nếu chủ shop đổi số tài khoản trên server `.env`, client vẫn hiển thị và sao chép số tài khoản cũ, dẫn đến khách chuyển khoản nhầm.
- **Bằng chứng:**
  ```jsx
  // src/pages/BankTransferPaymentPage.jsx:571
  <strong className="font-mono text-base font-bold text-[#631521] tracking-wider select-all">
    1050773506
  </strong>
  ```
- **Cách tái hiện:** Xem mã nguồn `src/pages/BankTransferPaymentPage.jsx:571` và `OrdersHistoryDrawer.jsx:812`.
- **Điều kiện tiên quyết:** Khách hàng xem trang thanh toán hoặc xem chi tiết đơn hàng cũ.
- **Nghi ngờ nằm ở file 🔒?:** Không (`checkoutConfig.js` và `.jsx` không thuộc file 🔒).
- **Đề xuất sửa:** Lấy thông tin tài khoản ngân hàng từ dữ liệu đơn hàng trả về (`order.paymentInfo` / `api/payment/generate-qr`) hoặc từ file cấu hình tập trung `checkoutConfig.js` kế thừa từ env public.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A1-005
- **ID:** A1-005
- **Tiêu đề:** Getters tính toán tổng tiền trong Zustand `cartStore` (`subtotal`, `totalItems`) không re-compute tự động khi dùng cú pháp destructuring thông thường
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `src/store/cartStore.js:12-28`
- **Mô tả & tác động thực tế:** `cartStore.js` định nghĩa các getter trong object state (`get totalItems()`, `get subtotal()`). Trong Zustand với middleware `persist`, object getter sau khi rehydrate từ localStorage có thể mất getter descriptor hoặc không trigger re-render nếu component chỉ destructure state. Rất may là `src/hooks/useCart.js` đã tự bọc một lớp selector và tính toán bổ sung, nhưng nếu bất kỳ component nào gọi trực tiếp `useCartStore((state) => state.subtotal)` thì giá trị có nguy cơ bị stale hoặc không đồng bộ.
- **Bằng chứng:** `src/store/cartStore.js:12-28`.
- **Cách tái hiện:** Kiểm tra định nghĩa store trong `src/store/cartStore.js`.
- **Điều kiện tiên quyết:** Component import trực tiếp `useCartStore`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Chuyển đổi các giá trị dẫn xuất (derived values) thành selector functions hoặc hàm tính toán trong hook `useCart`.
- **Độ tin cậy:** CONFIRMED.
