# SỔ TAY VẬN HÀNH CHATBOT TRỢ LÝ ẢO QUANNGUYENS (RUNBOOK)
**Dành cho**: Chủ shop & Đội ngũ Kỹ thuật QuanNguyenS  
**Cam kết chi phí**: 0đ hạ tầng (Hoạt động hoàn toàn trên Free Tier / Rule-based).

---

## 1. CÔNG TẮC KHẨN CẤP (EMERGENCY KILLSWITCH)

Khi phát hiện có sự cố, spam hoặc chủ shop muốn tạm dừng chatbot mà không cần deploy lại code:

1. Mở file `.env` trên máy chủ.
2. Đổi dòng sau:
   ```env
   CHAT_ENABLED=false
   ```
3. Khởi động lại server:
   - Backend sẽ ngay lập tức trả về mã `503 Service Unavailable` kèm thông báo bảo trì nhã nhặn.
   - Frontend sẽ tự động ẩn hoàn toàn nút chat nổi khỏi giao diện mọi trang khách hàng.
4. Khi muốn bật lại: Đổi `CHAT_ENABLED=true` và khởi động lại server.

---

## 2. HƯỚNG DẪN ĐỔI NHÀ CUNG CẤP AI (PROVIDER SWITCHING)

Kiến trúc chatbot của QuanNguyenS được thiết kế theo chuẩn **Provider-Agnostic** (độc lập với model). Bạn có thể đổi sang nhà cung cấp khác bất kỳ lúc nào chỉ bằng việc sửa biến môi trường:

### 2.1 Cấu hình mặc định (Khuyên dùng)
- **Chính**: Google Gemini 2.0 Flash (`GEMINI_API_KEY`)
- **Dự phòng**: Groq Llama 3.3 70B (`GROQ_API_KEY`)
```env
CHAT_PROVIDER=gemini
CHAT_FALLBACK_PROVIDER=groq
```

### 2.2 Chuyển Groq lên làm Provider chính (Tốc độ phản hồi < 0.5s)
```env
CHAT_PROVIDER=groq
CHAT_FALLBACK_PROVIDER=gemini
```

### 2.3 Chế độ Tầng 0 thuần túy (100% Offline, không gọi AI ngoài)
Nếu bạn không muốn sử dụng bất kỳ API key nào, chỉ cần để trống:
```env
GEMINI_API_KEY=
GROQ_API_KEY=
```
Hệ thống sẽ tự động chạy ở **Tầng 0**: Trả lời chính xác mọi câu hỏi về bảng size, chính sách giao hàng, đổi trả, voucher hợp lệ, địa chỉ shop và nút kết nối chủ shop (Zalo/Hotline/Form gọi lại) mà không bao giờ báo lỗi kỹ thuật.

---

## 3. CẤU HÌNH THÔNG BÁO TỨC THÌ QUA TELEGRAM BOT (MIỄN PHÍ)

Khi khách hàng bấm "Để lại SĐT" trong khung chat, hệ thống sẽ tự động đẩy thông báo ngay lập tức về điện thoại của chủ shop:

### Các bước cài đặt:
1. Mở ứng dụng Telegram trên điện thoại, tìm bot `@BotFather`.
2. Gửi lệnh `/newbot`, đặt tên bot (ví dụ: `QuanNguyenS Assistant Bot`) và username kết thúc bằng `bot`.
3. Sao chép chuỗi mã Token (dạng `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Tìm bot `@userinfobot` trên Telegram, bấm `Start` để lấy `Id` của bạn (dạng số nguyên, ví dụ `987654321`).
5. Dán vào `.env`:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   TELEGRAM_OWNER_CHAT_ID="987654321"
   ```
6. Bấm `Start` vào con bot bạn vừa tạo để cho phép bot gửi tin nhắn riêng cho bạn.

---

## 4. QUẢN LÝ QUOTA & CHỐNG PHÁT SINH CHI PHÍ

Hệ thống được cài đặt các van an toàn tự động (Circuit Breaker & Rate Limiter):
- `CHAT_DAILY_REQUEST_CAP=1200`: Hạn mức tối đa 1.200 lượt gọi AI mỗi ngày (thấp hơn trần 1.500 của Google để tạo đệm an toàn). Khi chạm trần, bot tự rơi về Tầng 2 nhã nhặn đề nghị khách kết nối chủ shop.
- `CHAT_PER_IP_PER_MIN=10`: Tối đa 10 tin nhắn/phút từ cùng một IP nhằm ngăn ngừa các cuộc tấn công DDoS/spam script.
- **Circuit Breaker**: Khi nhà cung cấp AI trả về lỗi `429 Too Many Requests` hoặc `5xx` liên tiếp 2 lần, hệ thống sẽ tự động ngắt kết nối với provider đó trong 120 giây và chuyển tải tức thì sang provider dự phòng.

---

## 5. BÁO CÁO NGHIỆP VỤ QUAN TRỌNG: MÃ VOUCHER HỆ THỐNG `QNS10`

> ⚠️ **LƯU Ý NGHIỆP VỤ DÀNH CHO CHỦ SHOP**:
> 
> Trong file `server/lib/accountDb.js`, hàm `markVoucherUsed(code, orderId)` cập nhật trạng thái:
> ```sql
> UPDATE vouchers SET used = 1, status = 'used' WHERE UPPER(code) = ? AND used = 0
> ```
> Đối với các mã voucher cá nhân (Welcome Voucher), logic này hoạt động chuẩn xác (mỗi khách dùng 1 lần).  
> Tuy nhiên, đối với mã chiến dịch hệ thống dùng chung như `QNS10` (dành cho mọi người), khi một đơn hàng đầu tiên áp dụng mã và hoàn tất, câu lệnh trên sẽ chuyển `used = 1` trong bảng `vouchers`, khiến những khách hàng tiếp theo khi nhập `QNS10` sẽ bị báo là "mã đã qua sử dụng".
> 
> **Đề xuất giải pháp an toàn**:
> Trong phiên bản nâng cấp backend tiếp theo, có thể phân tách: nếu `account_id === 'system'`, ghi nhận lịch sử dùng vào bảng phụ `voucher_usages` thay vì set `used = 1` trên chính dòng cấu hình chiến dịch.
