# Cấu Hình Biến Môi Trường Bổ Sung (Gmail Bridge & VietQR) — QuanNguyenS
*Cập nhật: 27/10/2026*

> [!NOTE]
> File `.env.example` thuộc danh sách bảo vệ `PROTECTED-DATA.md`. Các biến môi trường mới cần thiết lập cho hệ thống thanh toán qua Email được liệt kê tại đây.

| Biến môi trường | Bắt buộc | Giá trị mẫu / Mặc định | Ý nghĩa & Mục đích |
|---|---|---|---|
| `GMAIL_BRIDGE_SECRET` | Có | `a-very-strong-secret-token-64-bytes` | Khóa bí mật dùng để xác thực chữ ký HMAC-SHA256 từ Google Apps Script gọi về `/api/payment/bank-email`. |
| `GMAIL_BRIDGE_SECRET_PREV` | Không | `previous-secret-key-if-rotating` | Khóa bí mật trước đó nhằm hỗ trợ xoay khóa (Zero-Downtime Secret Rotation). |
| `BANK_EMAIL_ALLOWED_SENDERS` | Có | `vietcombank@vietcombank.com.vn,ibanking@vietcombank.com.vn` | Danh sách email hoặc domain của ngân hàng được phép gửi thông báo biến động số dư. |
| `BANK_EMAIL_AUTO_SETTLE` | Có | `false` (mặc định S1) | Cờ cho phép tự động chuyển trạng thái đơn sang `PAID`. Khi chưa kiểm chứng mẫu thư thật, cờ này bắt buộc là `false` để chạy chế độ đối soát thủ công. |
| `BANK_ACCOUNT_LAST4` | Có | `3506` | 4 chữ số cuối của tài khoản ngân hàng nhận tiền (VCB) để đối soát chống nhầm lẫn tài khoản. |
| `BANK_CODE` | Có | `VCB` | Mã ngân hàng thụ hưởng (Vietcombank). |
| `BANK_ACCOUNT_NUMBER` | Có | `1050773506` | Số tài khoản ngân hàng thụ hưởng (khóa cứng trên server, không cho client tự sửa). |
| `BANK_ACCOUNT_NAME` | Có | `NGUYEN DUC QUAN` | Tên chủ tài khoản thụ hưởng. |
