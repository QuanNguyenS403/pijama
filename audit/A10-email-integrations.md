# BÁO CÁO RÀ SOÁT A10 — EMAIL & TÍCH HỢP NGOÀI
*Người thực hiện: A10 Email & External Integrations Auditor*
*Phạm vi: `email*.js` (chỉ đọc, 🔒), `smsService.js`, `viettelPostService.js`, `googleSheets.js`, `distanceService.js`, `aiGeoDistanceService.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

- **Dịch vụ khoảng cách & Định vị (T-7):** `server/lib/distanceService.js`, `aiGeoDistanceService.js`.
- **Dịch vụ Vận chuyển Viettel Post:** `server/lib/viettelPostService.js`, webhook `/api/shipping/viettelpost/webhook`.
- **Hệ thống Gửi Email:** Gmail SMTP (`emailConfig.js`), email biên nhận (`emailCustomer.js`), email chủ shop (`emailOwner.js`), cập nhật trạng thái (`emailStatusUpdates.js`). Tất cả thuộc danh mục 🔒.

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A10-001
- **ID:** A10-001
- **Tiêu đề:** Dịch vụ khoảng cách tự xưng "Multi-Agent AI" thực chất là bảng tra cứu tĩnh theo quận/huyện và công thức toán học Haversine (T-7)
- **Mức đề xuất:** 🟡 P2 (T-7)
- **Vị trí:** `server/lib/aiGeoDistanceService.js:1-120, 420-438`, `src/pages/CheckoutPage.jsx:55-80`
- **Mô tả & tác động thực tế:**
  1. Code và UI/API mô tả hệ thống là: *"HỆ THỐNG ĐỊNH VỊ BẢN ĐỒ & TÍNH KHOẢNG CÁCH TỰ ĐỘNG BẰNG MULTI-AGENT AI gồm 4 Agent chuyên môn: AddressIntelligenceAgent, SpatialGeocodingAgent, RoadRoutingAgent, ShippingPolicyAgent"*.
  2. Tuy nhiên, khi kiểm tra mã nguồn thực tế, không có mô hình AI hoặc LLM nào được gọi. Toàn bộ logic dựa trên bảng tra tĩnh `HANOI_DISTRICTS_MAP` (30 quận/huyện), `LANDMARKS_MAP`, `NEARBY_PROVINCES_MAP` và công thức toán học tính khoảng cách đường chim bay nhân hệ số uốn lượn `factor`.
  3. Về mặt vận hành: Bảng tra này hoạt động ổn định, tiết kiệm 100% chi phí Google Maps API và tính toán tức thì (0ms latency).
  4. Về mặt tính chính xác:
     - Nếu địa chỉ chỉ ghi "Hà Nội" mà không rõ quận huyện, hệ thống tự động fallback về khoảng cách 5.5km (cho phép COD).
     - Nếu địa chỉ không tìm thấy bất kỳ từ khóa nào trong danh mục, hệ thống mặc định coi là ngoại tỉnh xa 120km (chặn COD).
- **Bằng chứng:** `server/lib/aiGeoDistanceService.js:28-67`, `server/lib/aiGeoDistanceService.js:313-334`.
- **Cách tái hiện:** Xem mã nguồn `aiGeoDistanceService.js`.
- **Điều kiện tiên quyết:** Khách hàng nhập địa chỉ ở trang thanh toán.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Chuẩn hóa lại tài liệu và thông báo nội bộ: Mô tả trung thực là "Thuật toán nội suy tọa độ & Bảng ma trận cự ly địa chính Hà Nội (Zero-cost Geolocation Engine)", tránh gây hiểu nhầm về việc tích hợp mô hình AI bên ngoài.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A10-002
- **ID:** A10-002
- **Tiêu đề:** Webhook Viettel Post `/api/shipping/viettelpost/webhook` mở cửa không xác thực nếu thiếu cấu hình `VIETTELPOST_WEBHOOK_SECRET`
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `server/index.js:778-794`
- **Mô tả & tác động thực tế:**
  Trong `POST /api/shipping/viettelpost/webhook`:
  ```js
  const expectedSecret = process.env.VIETTELPOST_WEBHOOK_SECRET
  if (expectedSecret) {
    ... // Kiểm tra secret
  }
  ```
  Nếu server chưa cấu hình biến `VIETTELPOST_WEBHOOK_SECRET` (như trong báo cáo `check-env` hiện tại là ❌ THIẾU), khối lệnh `if (expectedSecret)` bị bỏ qua!
  Kết quả là endpoint webhook hoàn toàn mở công khai cho bất kỳ ai trên Internet gửi POST request đổi trạng thái bất kỳ đơn hàng nào sang `DELIVERED` (Đã giao hàng thành công) và khóa không cho phép hủy đơn!
- **Bằng chứng:** `server/index.js:781`.
- **Cách tái hiện:** Khi `VIETTELPOST_WEBHOOK_SECRET` không có trong `.env`, gửi POST tới `/api/shipping/viettelpost/webhook` kèm `{"ORDER_NUMBER": "QNS-TEST", "ORDER_STATUS": "501"}` -> đơn hàng bị đổi sang `DELIVERED` mà không bị từ chối 401.
- **Điều kiện tiên quyết:** Thiếu biến môi trường `VIETTELPOST_WEBHOOK_SECRET`.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Áp dụng cơ chế bảo mật Fail-Closed tương tự như SePay Webhook: Nếu chưa cấu hình `VIETTELPOST_WEBHOOK_SECRET`, từ chối ngay mọi request webhook với mã lỗi `500 Server Configuration Error`.
- **Độ tin cậy:** CONFIRMED.
