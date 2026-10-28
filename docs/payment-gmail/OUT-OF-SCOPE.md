# Danh Mục Các Vấn Đề Ngoài Phạm Vi (Out-Of-Scope) — QuanNguyenS
*Ghi nhận các điểm phát hiện trong quá trình kiểm tra mã nguồn nhưng nằm ngoài phạm vi xử lý thanh toán VietQR qua email.*

| File | Dòng | Mô tả hiện tượng | Lý do không sửa |
|---|---|---|---|
| `tests/chat/eval-set.json` | Câu #41 | Test đánh giá hội thoại AI: `[Item #41 - chọn size] Chứa từ cấm: "Size S"` (tỷ lệ pass 97.6%). | Thuộc tính năng Chat AI Advisor, không ảnh hưởng đến luồng thanh toán VietQR. |
| `server/lib/viettelPostService.js` | Dòng 398 | Tạo mã vận đơn dự phòng giả định `VT${orderId.replace(/[^0-9]/g, '')}` khi chưa cấu hình tài khoản Viettel Post thật. | Thuộc phân hệ tích hợp vận chuyển Viettel Post API. |
| `src/components/sections/Section12Footer.jsx` | - | Chứa một số liên kết chính sách chân trang có đường dẫn tĩnh. | Giao diện chung ngoài phạm vi thanh toán. |
| `server/lib/loyalty/*` | - | Logic tính điểm hội viên và thăng hạng khách hàng thân thiết. | Được bảo vệ bởi nguyên tắc không sửa đổi phân hệ loyalty khi chưa có yêu cầu riêng từ Quân. |
