# 🔒 TÀI LIỆU KHÓA DỮ LIỆU HỆ THỐNG — QuanNguyenS
*Cập nhật lần cuối: 28/08/2026*

---

## ⚠️ NGUYÊN TẮC BẮT BUỘC DÀNH CHO DEVELOPER & AI AGENTS

> **QUY TẮC BẤT DI BẤT DỊCH:**
> Các file và trường dữ liệu được liệt kê dưới đây đã được kiểm thử toàn diện, đối soát thực tế và đang chạy ổn định trên môi trường Production.
> 
> **TUYỆT ĐỐI KHÔNG** tự ý chỉnh sửa, định dạng lại (format), xóa bỏ, hoặc thay đổi bất kỳ nội dung/thông số nào trong các file này, **TRỪ KHI** người yêu cầu (Quan) nêu rõ ràng, cụ thể là muốn chỉnh sửa đúng file/trường dữ liệu đó.
> 
> Nếu một yêu cầu chung chung (ví dụ: *"sửa lỗi"*, *"audit lại toàn bộ code"*, *"dọn dẹp code thừa"*, *"refactor codebase"*) vô tình chạm tới các file trong danh sách này: **DỪNG LẠI NGAY VÀ HỎI XÁC NHẬN CỦA QUAN TRƯỚC KHI THỰC HIỆN BẤT KỲ THAO TÁC NÀO.**

---

## 📋 DANH SÁCH FILE VÀ DỮ LIỆU ĐƯỢC BẢO VỆ

### 1. Catalog Sản Phẩm, Giá Bán & Tồn Kho Gốc
- **File:** `src/data/products.js`
- **Lý do khóa:** Đã chốt chính xác 3 sản phẩm chủ đạo (THE DAYBREAK SET, THE NOCTURNE SET, THE BOTANICA SET), giá niêm yết (390.000đ / 450.000đ), giá gốc, tỷ lệ giảm giá, bảng size (S/M), bảng màu và tồn kho ban đầu theo từng biến thể.

### 2. Thông Số Kỹ Thuật & Bảng Màu In Vải Xưởng Sản Xuất
- **Tham chiếu:** `TAI-LIEU-KY-THUAT-IN-VAI_QuanNguyenS.pdf`
- **Lý do khóa:** Thông số Pantone màu dệt, mã Hex (#EFAEA0, #1E293B, #FDFBF7), kích thước sọc và hoa văn đã chốt gửi nhà máy dệt & in vải. Không được điều chỉnh mã màu trong code gây lệch so với tài liệu kỹ thuật xưởng.

### 3. Hệ Thống Xác Thực & Gửi Email (Gmail SMTP & HTML Templates)
- **Files:**
  - `server/lib/emailConfig.js`
  - `server/lib/emailCustomer.js`
  - `server/lib/emailOwner.js`
  - `server/lib/emailStatusUpdates.js`
- **Lý do khóa:** Cấu hình SMTP Gmail (App Password 16 ký tự), cơ chế chẩn đoán độc lập và toàn bộ template HTML hóa đơn/thông báo cho khách hàng và chủ shop đã được xác minh hoạt động chính xác 100%.

### 4. Logic Kiểm Thử Toàn Vẹn Giá & Tồn Kho Server-side
- **Files:**
  - `server/lib/pricingValidator.js`
  - `server/lib/stockValidator.js`
- **Lý do khóa:** Thuật toán tính toán độc lập giá sản phẩm, chiết khấu VietQR 10%, phí vận chuyển (Freeship từ 500k), và trừ tồn kho thực tế chống gian lận client-side đã qua kiểm thử nghiệm ngặt.

### 5. Cấu Trúc Biến Môi Trường Mẫu
- **File:** `.env.example`
- **Lý do khóa:** Chuẩn hóa toàn bộ danh mục biến môi trường cần thiết (Gmail, Google Sheets, VietQR, SePay Webhook, CORS, Admin Auth) cho việc triển khai máy chủ.

---

## 🛡️ DẤU HIỆU NHẬN BIẾT TRONG CODE
Mỗi file thuộc diện bảo vệ đều có comment cảnh báo ở dòng đầu tiên:
```js
// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Chỉ chỉnh sửa khi có yêu cầu rõ ràng, cụ thể nhắm đúng vào nội dung file này.
```

---

## 📌 LƯU Ý VỀ CƠ CHẾ BẢO VỆ
- Đây là cơ chế bảo vệ dựa trên **quy ước và tài liệu dự án** (Project Convention & Governance), mọi AI Agent và lập trình viên khi đọc code đều sẽ nhận diện và tuân thủ.
- **Tùy chọn nâng cao (Hard Enforcement):** Nếu Quan muốn thiết lập cơ chế chặn kỹ thuật cứng hơn ở cấp Git (ví dụ Git Hook `pre-commit` tự động hủy commit nếu phát hiện thay đổi trong các file được bảo vệ khi commit message không có tag `[ALLOW-PROTECTED]`), có thể yêu cầu cài đặt thêm bất cứ lúc nào.
