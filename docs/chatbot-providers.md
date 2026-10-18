# TÀI LIỆU ĐÁNH GIÁ VÀ HẠN MỨC CÁC NHÀ CUNG CẤP LLM MIỄN PHÍ (0Đ)
**Dự án**: Chatbot Trợ Lý Ảo Bán Hàng & CSKH 24/7 — QuanNguyenS  
**Ngày kiểm tra & xác minh**: 17/10/2026  
**Nguyên tắc cam kết**: Chi phí hạ tầng = 0đ. Tuyệt đối KHÔNG yêu cầu thẻ tín dụng/thanh toán.

---

## 1. TỔNG QUAN CÁC NHÀ CUNG CẤP ĐƯỢC ĐÁNH GIÁ

| Tiêu chí | ỨNG VIÊN 1: Google Gemini API (AI Studio) | ỨNG VIÊN 2: Groq Cloud API | ỨNG VIÊN 3: OpenRouter (Free Tier) |
| :--- | :--- | :--- | :--- |
| **Vai trò đề xuất** | **Provider Chính (Primary)** | **Provider Dự Phòng (Fallback)** | **Dự phòng mở rộng (Backup)** |
| **Model tối ưu** | `gemini-2.0-flash` / `gemini-1.5-flash` | `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` | `meta-llama/llama-3.3-70b-instruct:free` |
| **Yêu cầu thẻ tín dụng** | **KHÔNG** (Chỉ cần tài khoản Google cá nhân) | **KHÔNG** (Đăng ký tài khoản email/GitHub) | **KHÔNG** (Đăng ký tài khoản email) |
| **Chi phí** | 0 VNĐ | 0 VNĐ | 0 VNĐ |
| **Hạn mức RPM (Req/Min)**| 15 RPM | 30 RPM | 20 RPM (thay đổi theo tải) |
| **Hạn mức RPD (Req/Day)**| 1.500 RPD | 1.000 RPD (70B) / 14.400 RPD (8B) | ~200 RPD |
| **Hạn mức Token (TPM)** | 1.000.000 TPM | 6.000 TPM (70B) / 30.000 TPM (8B) | Dynamic |
| **Chất lượng Tiếng Việt** | **Xuất sắc** (Tự nhiên, hiểu ngữ cảnh văn hóa, sắc thái lịch sự xưng hô) | **Rất tốt** với model 70B; model 8B trả lời nhanh nhưng đôi khi hơi cứng | Tốt (tùy thuộc model được route) |
| **Thời gian phản hồi** | 600ms - 1.2s | 300ms - 800ms (Cực nhanh qua LPU) | 1.5s - 3s (Tùy hàng đợi) |
| **Chính sách dữ liệu** | Bản Free Tier cho phép Google dùng nội dung để cải thiện dịch vụ. **BẮT BUỘC lọc sạch PII trước khi gửi**. | Không dùng dữ liệu API để huấn luyện model; lưu log giám sát lạm dụng 30 ngày. | Phụ thuộc vào model provider phía sau. |

---

## 2. CHI TIẾT ĐIỀU KHOẢN DỮ LIỆU & RỦI RO BẢO MẬT

### 2.1 Google AI Studio (Gemini Free Tier)
- **Cơ chế**: Miễn phí đến 1.500 lượt gọi/ngày cho mỗi API Key mà không cần nhập thẻ Visa/Mastercard.
- **Điều khoản dữ liệu**: Trên tầng miễn phí, Google có quyền sử dụng dữ liệu hội thoại (đã khử định danh) để cải tiến sản phẩm.
- **Biện pháp đối phó bắt buộc (Đã lập trình sẵn)**:
  1. Module `scrubPII.js` tự động tìm và thay thế toàn bộ Số điện thoại, Email, Địa chỉ nhà, Số tài khoản ngân hàng bằng token giữ chỗ (`[SĐT]`, `[EMAIL]`, `[ĐỊA CHỈ]`) trước khi gửi lên API.
  2. Khách hàng để lại thông tin liên hệ chỉ qua Form Handoff riêng biệt (lưu trực tiếp vào SQLite nội bộ và gửi Email/Telegram cho chủ shop, KHÔNG đi qua LLM).

### 2.2 Groq Cloud (Free Tier)
- **Cơ chế**: Cung cấp tài nguyên tăng tốc suy luận LPU miễn phí với các mô hình mã nguồn mở hàng đầu (Llama 3.3 70B, Llama 3.1 8B).
- **Chính sách dữ liệu**: Groq cam kết không dùng nội dung gửi qua Inference API để đào tạo lại mô hình.
- **Ưu điểm**: Tốc độ phản hồi cực nhanh, độ trễ thấp, là phao cứu sinh hoàn hảo khi Gemini bị 429 quá tải.

---

## 3. CƠ CHẾ CHỐNG PHÁT SINH CHI PHÍ & TỰ ĐỘNG CHUYỂN TẦNG (CIRCUIT BREAKER)

Hệ thống chatbot QuanNguyenS áp dụng kiến trúc 3 tầng an toàn:

```
[Khách gửi tin nhắn]
       │
       ▼
[TẦNG 0] Kiểm tra Intent cục bộ (Chào hỏi, Sizing, Freeship, Voucher QNS10, Handoff, Hướng dẫn tra cứu)
       │───> Khớp intent: Trả lời tức thì từ KnowledgeBase nội bộ (0đ, 0ms, không gọi API ngoài)
       │
       ▼ Không khớp Tier 0
[Kiểm tra Quota Nội Bộ]
       │───> Quá hạn mức ngày (CHAT_DAILY_REQUEST_CAP = 1200) hoặc IP Rate Limit: Chuyển về Tầng 2
       │
       ▼
[TẦNG 1] Gọi Provider Chính: Google Gemini (Scrubbed PII)
       │───> Thành công: Kiểm duyệt Output (outputGuard) ───> Trả lời khách
       │
       ▼ Lỗi 429 / 5xx / Timeout (Sau 2 lần thử)
[Circuit Breaker Kích Hoạt]
       │───> Tự động chuyển sang Provider Phụ: Groq Llama 3.3 70B
       │───> Thành công: Kiểm duyệt Output (outputGuard) ───> Trả lời khách
       │
       ▼ Nếu cả 2 Provider đều gián đoạn
[TẦNG 2] Graceful Fallback
       │───> Trả lời nhã nhặn từ mẫu an toàn + Thẻ kết nối chủ shop (Zalo / Hotline / Form gọi lại)
       │───> KHÔNG BAO GIỜ hiển thị lỗi kỹ thuật thô cho khách hàng.
```

---

## 4. HƯỚNG DẪN DÀNH CHO CHỦ SHOP (ĐĂNG KÝ KEY 0 ĐỒNG)

Chủ shop chỉ cần làm 2 bước đơn giản (không tốn 1 xu, không cần thẻ ngân hàng):

### Bước 4.1: Lấy Google Gemini API Key
1. Truy cập: [Google AI Studio](https://aistudio.google.com/)
2. Đăng nhập bằng tài khoản Gmail của shop (`quannguyens403@gmail.com`).
3. Bấm **Get API Key** > **Create API key in new project**.
4. Sao chép API Key và dán vào file `.env` ở dòng `GEMINI_API_KEY=...`.

### Bước 4.2: Lấy Groq API Key (Dự phòng khẩn cấp)
1. Truy cập: [Groq Console](https://console.groq.com/)
2. Đăng ký tài khoản miễn phí bằng Google hoặc Email.
3. Vào mục **API Keys** > **Create API Key**.
4. Sao chép API Key và dán vào file `.env` ở dòng `GROQ_API_KEY=...`.
