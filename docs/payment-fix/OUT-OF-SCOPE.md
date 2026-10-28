# Các Vấn Đề Ngoài Phạm Vi (Out-Of-Scope) — QuanNguyenS

*Tài liệu ghi nhận các hiện tượng/lỗi phát hiện trong quá trình kiểm tra mã nguồn nhưng nằm ngoài phạm vi sửa lỗi thanh toán VietQR.*

| File | Dòng | Mô tả hiện tượng | Lý do không sửa |
|---|---|---|---|
| `tests/chat/eval-set.json` | Câu #41 | Test đánh giá hội thoại AI: `[Item #41 - chọn size] Chứa từ cấm: "Size S"` khiến tỷ lệ pass là 97.6% (41/42 câu). | Thuộc tính năng Chat AI Advisor, không ảnh hưởng đến luồng thanh toán VietQR. |
| `server/lib/viettelPostService.js` | Dòng 398 | Tạo mã vận đơn dự phòng giả định `VT${orderId.replace(/[^0-9]/g, '')}` khi chưa cấu hình tài khoản Viettel Post thật. | Thuộc tích hợp vận chuyển Viettel Post API, không thuộc phạm vi xử lý thanh toán chuyển khoản. |
| `src/components/sections/Section12Footer.jsx` | - | Chứa một số liên kết chính sách chân trang có đường dẫn tĩnh. | Giao diện chung ngoài phạm vi thanh toán. |

