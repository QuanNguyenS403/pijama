# ĐẶC TẢ HỆ THỐNG ƯU ĐÃI HỘI VIÊN (LOYALTY PROGRAM SPECIFICATION) — QUANNGUYENS

*Phiên bản: 1.0.0 (Ngày 25/10/2026)*  
*Nguồn tham chiếu: Bảng quyền lợi chuẩn QuanNguyenS (4 hạng, tích điểm, đổi điểm thành voucher, ưu đãi theo hạng, sinh nhật, thăng hạng, quà tặng, duy trì hạng/điểm 365 ngày)*

---

## 1. NGUYÊN TẮC CỐT LÕI

1. **Tự nguyện, không ép, không tự kích hoạt:** Chỉ khách chủ động đăng ký mới trở thành hội viên. Không tự ý gán tài khoản/số điện thoại hiện có vào chương trình, không popup cưỡng ép, không tick sẵn checkbox đồng ý.
2. **Số điện thoại có thật và xác minh OTP:** Số điện thoại (chuẩn hóa `0xxxxxxxxx`) là định danh duy nhất (khóa) để tích điểm và thanh toán bằng điểm.
3. **Tự động hoàn toàn:** Tích lũy, nâng hạng, hạ hạng, hết hạn điểm, cấp voucher sinh nhật/thăng hạng, nhận diện hội viên đều tự động hóa dựa trên dữ liệu database.
4. **Minh bạch ưu đãi:** Khách luôn nhìn thấy rõ ưu đãi nào dùng được ngay, ưu đãi nào chưa dùng được và lý do cụ thể.
5. **Sổ cái chỉ-ghi-thêm (Append-only Ledger):** Mọi biến động điểm phải đi qua `loyalty_ledger` với `idempotency_key` chống ghi đúp.
6. **Bảo mật giao dịch điểm:** Thao tác đổi điểm tiêu tiền bắt buộc xác thực OTP bước nâng cao (Step-up OTP) gửi tới chính số điện thoại của hội viên.

---

## 2. QUY TẮC CHƯƠNG TRÌNH

### 2.1 Các hạng hội viên và tiêu chí chi tiêu

| Hạng | Tên hiển thị | Mã hạng (tier code) | Chi tiêu tích lũy (Cửa sổ 365 ngày) | Điểm hạng quy đổi | Giảm giá theo hạng |
|---|---|---|---|---|---|
| **Hạng 1** | Thân Thiết (Member) | `MEMBER` | 0đ (Ngay khi đăng ký) | 0 | 0% |
| **Hạng 2** | Bạc (Silver) | `SILVER` | 5.000.000đ | 50 | 5% |
| **Hạng 3** | Vàng (Gold) | `GOLD` | 10.000.000đ | 100 | 10% |
| **Hạng 4** | Kim Cương (Diamond) | `DIAMOND` | 25.000.000đ | 250 | 15% |

### 2.2 Tích điểm & Đổi điểm

- **Tỷ lệ tích điểm:** 100.000đ giá trị hàng thực trả = 1 điểm thưởng (`points_delta = floor(spend / 100.000)`).
- **Tỷ lệ đổi điểm:** 10 điểm thưởng = 1 voucher 50.000đ (áp dụng đơn từ 0đ, hạn sử dụng 90 ngày).
- **Phân tách hai loại điểm:**
  1. *Điểm hạng (Tier Spend/Points):* Tính từ tổng chi tiêu thực trả trong cửa sổ trượt 365 ngày gần nhất. Không giảm khi đổi voucher.
  2. *Điểm thưởng (Reward Points):* Số dư khả dụng để đổi voucher. Bị giảm khi đổi voucher hoặc hết hạn nếu không mua hàng sau 365 ngày.

### 2.3 Ưu đãi Sinh nhật & Thăng hạng

| Hạng | Voucher Sinh Nhật | Voucher Thăng Hạng | Đặc quyền quà tặng |
|---|---|---|---|
| **Hạng 1 · Thân Thiết** | 50.000đ | Không có | Chăm sóc khách hàng ưu tiên |
| **Hạng 2 · Bạc** | 200.000đ | 200.000đ | Quà sinh nhật hàng năm |
| **Hạng 3 · Vàng** | 300.000đ | 300.000đ | Quà sinh nhật hàng năm |
| **Hạng 4 · Kim Cương** | 500.000đ | 500.000đ | Private Party & Bộ quà đặc biệt theo từng BST |

- **Thời hạn voucher sinh nhật:** Hết hạn vào ngày cuối cùng của tháng sinh. Phát hành vào ngày đầu tháng sinh (hoặc ngay khi đăng ký/cập nhật nếu rơi vào tháng hiện tại, tối đa 1 lần/năm).
- **Thời hạn voucher thăng hạng:** 90 ngày kể từ ngày phát hành. Cấp 1 lần duy nhất cho mỗi mốc hạng (nếu tụt hạng rồi lên lại sẽ không cấp lại).
- **Quà tặng Hạng 4 (Private Party, BST):** Tạo tác vụ thủ công (task) trên trang Admin cho chủ shop trực tiếp liên hệ và chuẩn bị quà độc quyền.

---

## 3. CÁC QUY ƯỚC NGHIỆP VỤ ĐÃ LÀM RÕ (A1 — A13)

- **A1. Giá trị tính điểm:** Tính trên **giá trị hàng thực trả** = Tạm tính (subtotal) trừ toàn bộ giảm giá (chiết khấu VietQR 10%, giảm giá theo hạng, voucher, điểm). **Không tính phí vận chuyển**.
- **A2. Làm tròn:** `floor(giá trị / 100.000)` tính trên từng đơn hàng. Phần dư lẻ không dồn sang đơn sau.
- **A3. Thời điểm cộng điểm:** Chỉ cộng khi đơn hàng chuyển sang trạng thái **`DELIVERED`**. Trước đó hiển thị trạng thái "Điểm đang chờ" (Pending points).
- **A4. Thăng hạng:** Ngay khi tổng chi tiêu đủ điều kiện trong cửa sổ trượt 365 ngày tính đến thời điểm hiện tại (`now`). Voucher thăng hạng chỉ cấp một lần duy nhất cho mỗi mốc hạng.
- **A5. Hạ hạng:** Nếu quá 365 ngày kể từ đơn hàng hoàn tất gần nhất mà không phát sinh đơn hàng mới, hạ 1 hạng. Sau đó cứ mỗi 365 ngày tiếp tục hạ tiếp nếu không mua hàng. Khi mua lại, chi tiêu trong 365 ngày trượt sẽ quyết định hạng.
- **A6. Hết hạn điểm thưởng:** Quá 365 ngày kể từ đơn hàng đủ điều kiện gần nhất mà không mua hàng, toàn bộ điểm thưởng khả dụng sẽ bị xóa về 0 (`EXPIRE`). Hệ thống gửi email cảnh báo trước 30 ngày.
- **A7. Hạn dùng voucher:** Voucher đổi điểm có hạn 90 ngày; voucher thăng hạng có hạn 90 ngày; voucher sinh nhật có hạn đến hết tháng sinh.
- **A8. Cộng dồn ưu đãi:** Mỗi đơn hàng chỉ áp dụng tối đa 1 mã voucher. Giảm giá theo hạng và chiết khấu VietQR 10% được cộng dồn theo tỷ lệ % trên tạm tính.
- **A9. Tự động áp dụng giảm giá theo hạng:** Khi hội viên đăng nhập hoặc xác thực SĐT tại trang thanh toán, mức giảm theo hạng tự động áp dụng và hiển thị rõ ràng trên hóa đơn tạm tính.
- **A10. Voucher số tiền cố định:** Chỉ trừ vào tiền hàng (tạm tính), không trừ vào phí vận chuyển, không bao giờ làm tổng tiền thanh toán bị âm (tối thiểu 0đ).
- **A11. Không hồi tố:** Không tính điểm cho các đơn hàng hoàn tất trước thời điểm khách đăng ký tham gia chương trình.
- **A12. Ngày sinh nhật:** Chỉ thu thập Ngày và Tháng (không bắt buộc Năm). Khóa chỉnh sửa sau khi thiết lập (muốn sửa phải liên hệ Admin). Cấp voucher 1 lần/năm.
- **A13. Xử lý quà Hạng 4:** Quy trình thủ công tạo cảnh báo/nhiệm vụ trong hàng đợi `loyalty_alerts` để chủ shop chuẩn bị.

---

## 4. BẢO MẬT VÀ TOÀN VẸN DỮ LIỆU

- Bảng `loyalty_members` bảo đảm ràng buộc `UNIQUE` trên số điện thoại chuẩn hóa.
- Bảng `loyalty_ledger` là sổ cái chỉ thêm (insert-only), có ràng buộc `UNIQUE` trên `idempotency_key`.
- Mọi giao dịch đổi điểm đều yêu cầu xác thực OTP qua số điện thoại.
- Kiểm tra số dư điểm thực thi bằng database transaction (`BEGIN IMMEDIATE`) loại trừ hoàn toàn race conditions.
