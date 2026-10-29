# Phân Tích Kinh Tế & Kiểm Soát Rủi Ro Hệ Thống Hội Viên — QuanNguyenS

Tài liệu hạch toán kinh tế, trần chi phí tối đa (Worst-Case Budget Cap) và phân tích đối kháng cho chương trình Hội viên & Đặc quyền của **QuanNguyenS / 10PM Pijama**.

---

## 1. Trần Chi Phí Vận Hành Tối Đa (Worst-Case Budget Cap)

### 1.1 Chi phí gửi tin nhắn xác thực (Zalo ZNS OTP)
Hệ thống thiết lập 3 tầng chốt chặn cứng trong mã nguồn để bảo đảm không bao giờ bị tràn ngân sách gửi tin ZNS:
- **Tầng 1 (Per Phone Cooldown & Daily Limit):** Tối đa 5 tin / SĐT / 24 giờ. Cooldown 60 giây giữa 2 lần gửi liên tiếp.
- **Tầng 2 (Per IP Rate Limit):** Tối đa 5 request / phút và 20 tin / IP / 24 giờ.
- **Tầng 3 (System Daily Budget):** Trần cứng `LOYALTY_OTP_DAILY_BUDGET_COUNT = 200` tin / toàn hệ thống / 24 giờ. Khi chạm trần, hệ thống tự động khóa cổng gửi OTP, trả mã `429 DAILY_BUDGET_EXCEEDED` và phát cảnh báo cấp độ `critical` cho admin.
- **Trần chi phí ZNS tối đa mỗi ngày:**
  $$\text{Chi phí tối đa/ngày} = 200 \times \text{Đơn giá ZNS}$$
  *(Ví dụ nếu đơn giá ZNS khoảng 200đ–300đ/tin, chi phí tối đa mỗi ngày bị chặn ở mức ~40.000đ – 60.000đ, chủ shop hoàn toàn làm chủ rủi ro tài chính).*

---

### 1.2 Tỷ lệ hoàn tiền từ tích lũy điểm thưởng
- Quy tắc: Cứ **100.000đ** tiền hàng thanh toán thực tế = **1 điểm**.
- Đổi thưởng: **10 điểm** = **Voucher 50.000đ** (áp dụng cho đơn từ 0đ, hạn 90 ngày).
- Tỷ lệ chiết khấu tích lũy:
  $$\text{Tỷ lệ Cash-back} = \frac{50.000đ}{10 \times 100.000đ} = 5.0\%$$
- **Điều kiện ràng buộc an toàn:**
  - Điểm chỉ được cộng sau khi đơn hàng chuyển sang trạng thái `DELIVERED` (Đã giao thành công).
  - Khách trả hàng/hủy đơn: Hệ thống tự động ghi giao dịch `REVERSAL` để thu hồi điểm đã cộng.

---

### 1.3 Phân tích biên lợi nhuận khi cộng dồn ưu đãi (Stacking Discount)
Trong kịch bản khách hàng đạt hạng cao nhất (**Kim Cương - Diamond**) và thanh toán qua hình thức tối ưu:
1. Chiết khấu Hạng Kim Cương: **15%**
2. Chiết khấu chuyển khoản VietQR: **10%** (tính trên số tiền còn lại sau chiết khấu hạng)
3. Điểm thưởng tích lũy (tương đương **5%** cho các đơn tiếp theo)
- **Tổng mức giảm giá tối đa trên một đơn hàng:**
  $$\text{Mức giảm} = 1 - (1 - 0.15) \times (1 - 0.10) = 1 - 0.765 = 23.5\%$$
- Đối với sản phẩm pijama thiết kế phân khúc lụa cao cấp, biên lợi nhuận gộp thông thường trên 50%, mức chiết khấu tối đa **23.5%** dành riêng cho nhóm khách hàng thân thiết nhất (đã chi tiêu trên 25.000.000đ) vẫn đảm bảo mức sinh lời ròng an toàn cho shop, đồng thời tạo lực kéo giữ chân khách hàng (Customer Retention) vượt trội so với thị trường.

---

## 2. Kịch Bản Gian Lận & Cơ Chế Phòng Vệ Thực Tế Đã Lập Trình

| Kịch bản gian lận | Hậu quả tiềm ẩn | Cơ chế phòng vệ trong mã nguồn |
|-------------------|-----------------|--------------------------------|
| **1. Đổi ngày sinh liên tục** | Khách thay đổi ngày sinh mỗi tháng để nhận voucher sinh nhật nhiều lần. | **Khóa 1 lần duy nhất (One-time write):** Sau khi lưu ngày và tháng sinh vào database, endpoint `PATCH /api/loyalty/birthday` từ chối mọi yêu cầu chỉnh sửa tiếp theo. |
| **2. Tấn công Brute-force OTP** | Đoán mã 6 số để chiếm đoạt tài khoản hoặc điểm thưởng. | **Max 5 attempts & TimingSafe:** Mỗi mã OTP chỉ cho phép thử sai tối đa 5 lần. Sai quá 5 lần, mã bị xóa và hủy hiệu lực. So khớp bằng `crypto.timingSafeEqual` chống tấn công kênh phụ (Side-channel attack). |
| **3. SMS/ZNS Flooding** | Kẻ xấu viết bot spam SĐT lạ để làm cạn tiền Zalo OA của shop. | **3 Lớp Rate Limiting:** Cooldown 60s/SĐT, trần 5 tin/ngày/SĐT, trần 20 tin/ngày/IP, trần 200 tin/ngày toàn server. |
| **4. Dò quét thành viên (User Enumeration)** | Kẻ xấu gửi OTP đăng nhập để xem số điện thoại nào đã là hội viên. | **Phản hồi trung tính (Neutral Response):** Endpoint `POST /api/loyalty/phone/send-otp` khi gửi với mục đích `login` cho số chưa đăng ký sẽ trả về `200 OK` với thông báo trung tính, không lưu record và không gọi gửi tin ZNS. |
| **5. Rút điểm âm qua việc hủy đơn** | Khách nhận hàng -> nhận điểm -> đổi voucher xài ngay -> rồi trả hàng hoàn tiền. | **Sổ cái điểm Append-Only & Khóa số dư:** Sổ cái `loyalty_ledger` ghi nhận lịch sử bất biến. Khi hoàn tiền, hệ thống trừ đúng số điểm đã cấp. Nếu số dư điểm khả dụng không đủ, hệ thống ghi nhận và khấu trừ vào giá trị hoàn tiền đơn hàng. |
| **6. Chiếm đoạt mã OTP trong quá trình truyền** | Đánh cắp mã xác thực qua response API hoặc log hệ thống. | **Fail-Closed & Không lộ mã:** Máy chủ tuyệt đối không trả mã OTP trong JSON response kể cả môi trường dev/test. Trên Production, các test/mock provider bị cấm tiệt; mọi số điện thoại đều được che (masking: `0981 *** 082`). |

---

## 3. Lý Do Không Áp Dụng Vòng Quay / Referral / Bảng Xếp Hạng

Chương trình hội viên của **QuanNguyenS** tập trung vào phong cách **Sang trọng thầm lặng (Quiet Luxury)** và tuân thủ nghiêm ngặt chuẩn mực đạo đức kinh doanh:

1. **Không áp dụng Vòng quay may mắn (Lucky Wheel / Gacha):**
   - Tránh tính chất may rủi/đánh bạc vi phạm quy định pháp luật về khuyến mại tại Việt Nam.
   - Tránh làm loãng hình ảnh thương hiệu pijama thiết kế cao cấp thành ứng dụng trò chơi giải trí rẻ tiền.
2. **Không áp dụng Bảng xếp hạng thi đua (Leaderboard):**
   - Tôn trọng quyền riêng tư và dữ liệu cá nhân của khách hàng (không công khai danh tính, chi tiêu của người khác).
   - Tránh áp lực tiêu dùng ảo cho khách hàng.
3. **Không dùng Dark Patterns (Chiêu trò tâm lý):**
   - Tuyệt đối không đếm ngược thời gian giả tạo ("chỉ còn 5 phút").
   - Tuyệt đối không bịa số liệu ảo ("đã có 10.000 người tham gia").
   - Tham gia hoàn toàn tự nguyện, cho phép khách hàng chủ động rời chương trình bất kỳ lúc nào chỉ bằng một nút bấm.

