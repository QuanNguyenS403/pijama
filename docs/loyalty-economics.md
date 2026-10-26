# BÁO CÁO PHÂN TÍCH KINH TẾ CHƯƠNG TRÌNH HỘI VIÊN (LOYALTY ECONOMICS)
**Dự án:** QuanNguyenS Homewear & Pajamas  
**Tài liệu:** `docs/loyalty-economics.md`  
**Ngày lập:** 25/10/2026  
**Mục đích:** Đánh giá tác động tài chính, kịch bản giảm giá xấu nhất (Worst-Case Stacking), nợ điểm tích lũy và chi phí viễn thông OTP trước khi kích hoạt cờ `LOYALTY_ENABLED`.

---

## 1. DỮ LIỆU ĐẦU VÀO TỪ HỆ THỐNG

### 1.1 Giá niêm yết sản phẩm thực tế (`src/data/products.js`)
| Sản phẩm | Mã / Slug | Giá bán lẻ (VND) | Phí ship tiêu chuẩn |
|---|---|---|---|
| **THE DAYBREAK SET** (Sọc Hồng) | `the-classic-set` | **390.000đ** | 30.000đ (miễn phí nếu ≥ 500k) |
| **THE STILLWATER SET** (Caro Navy) | `the-cafe-look` | **550.000đ** | Miễn phí (đơn ≥ 500k) |
| **THE HEARTH SET** (Sọc Nâu) | `the-evening-edit` | **750.000đ** | Miễn phí (đơn ≥ 500k) |

*Ghi chú về Giá vốn hàng bán (COGS):* Trong repository hiện tại không chứa dữ liệu giá vốn sản xuất/nhập hàng của từng bộ. Báo cáo này tính toán trên **Doanh thu thực thu (Net Revenue)** và **Tỷ lệ chiết khấu gộp (%)**. Khi Quan cung cấp giá vốn cụ thể, biên lợi nhuận ròng sẽ được tính chuẩn xác từng đồng.

### 1.2 Các lớp ưu đãi có thể cộng dồn
1. **Ưu đãi Hạng Hội Viên:**
   - Hạng 1 (Thân Thiết): **0%**
   - Hạng 2 (Bạc): **5%**
   - Hạng 3 (Vàng): **10%**
   - Hạng 4 (Kim Cương): **15%**
2. **Ưu đãi Phương thức Thanh toán:**
   - COD: **0%**
   - Chuyển khoản VietQR: **10%** trên tạm tính tiền hàng.
3. **Ưu đãi Điểm thưởng (Cashback tương đương):**
   - Tích điểm: 100.000đ thực trả = 1 điểm.
   - Đổi điểm: 10 điểm = Voucher 50.000đ (đơn từ 0đ).
   - Tỷ lệ hoàn tiền tương đương: **5%** trên số tiền đủ điều kiện tích lũy.
4. **Voucher sự kiện (Mỗi đơn tối đa 1 voucher):**
   - Voucher đổi điểm: **50.000đ** (đơn từ 0đ, hạn 90 ngày).
   - Voucher sinh nhật: **50.000đ** (Hạng 1), **200.000đ** (Hạng 2), **300.000đ** (Hạng 3), **500.000đ** (Hạng 4).
   - Voucher thăng hạng: **200.000đ** (Hạng 2), **300.000đ** (Hạng 3), **500.000đ** (Hạng 4).

---

## 2. MA TRẬN KỊCH BẢN GIẢM GIÁ (TỪNG HẠNG × TỪNG BỘ × THANH TOÁN)

### Kịch bản 1: Mua hàng thông thường (Giảm theo Hạng + Phương thức thanh toán)
*Không áp dụng thêm voucher tiền mặt.*

| Sản phẩm & Giá gốc | Hạng hội viên | Giảm hạng (%) | Giảm VietQR (%) | Tổng giảm (%) | Khách thực trả (VND) | Doanh thu giữ lại |
|---|---|---|---|---|---|---|
| **DAYBREAK (390k)** | Thân Thiết | 0% | 0% (COD) | 0% | 420.000đ (gồm 30k ship) | 100% |
| | Thân Thiết | 0% | 10% (VietQR) | 10% | 381.000đ (gồm 30k ship) | 90% |
| | Bạc | 5% | 10% (VietQR) | 15% | 361.500đ (gồm 30k ship) | 85% |
| | Vàng | 10% | 10% (VietQR) | 20% | 342.000đ (gồm 30k ship) | 80% |
| | Kim Cương | 15% | 10% (VietQR) | 25% | 322.500đ (gồm 30k ship) | 75% |
| **STILLWATER (550k)** | Thân Thiết | 0% | 0% (COD) | 0% | 550.000đ (Freeship) | 100% |
| | Thân Thiết | 0% | 10% (VietQR) | 10% | 495.000đ (Freeship) | 90% |
| | Bạc | 5% | 10% (VietQR) | 15% | 467.500đ (Freeship) | 85% |
| | Vàng | 10% | 10% (VietQR) | 20% | 440.000đ (Freeship) | 80% |
| | Kim Cương | 15% | 10% (VietQR) | 25% | 412.500đ (Freeship) | 75% |
| **HEARTH (750k)** | Thân Thiết | 0% | 0% (COD) | 0% | 750.000đ (Freeship) | 100% |
| | Thân Thiết | 0% | 10% (VietQR) | 10% | 675.000đ (Freeship) | 90% |
| | Bạc | 5% | 10% (VietQR) | 15% | 637.500đ (Freeship) | 85% |
| | Vàng | 10% | 10% (VietQR) | 20% | 600.000đ (Freeship) | 80% |
| | Kim Cương | 15% | 10% (VietQR) | 25% | 562.500đ (Freeship) | 75% |

---

### Kịch bản 2: Hội viên dùng Voucher Đổi Điểm 50.000đ + VietQR 10% + Giảm Hạng

*Ví dụ khách dùng 10 điểm thưởng đã tích lũy từ các đơn trước để đổi voucher 50.000đ:*

| Sản phẩm & Giá gốc | Hạng | Chiết khấu % (Hạng + QR) | Giảm tiền mặt voucher | Khách thực trả (VND) | Tỷ lệ giảm thực tế trên giá gốc |
|---|---|---|---|---|---|
| **DAYBREAK (390k)** | Hạng 2 Bạc (5% + 10%) | -58.500đ (15%) | -50.000đ | **311.500đ** (+ 30k ship) | **27.8%** |
| | Hạng 3 Vàng (10% + 10%) | -78.000đ (20%) | -50.000đ | **292.000đ** (+ 30k ship) | **32.8%** |
| | Hạng 4 Kim Cương (15% + 10%) | -97.500đ (25%) | -50.000đ | **272.500đ** (+ 30k ship) | **37.8%** |
| **STILLWATER (550k)** | Hạng 2 Bạc (5% + 10%) | -82.500đ (15%) | -50.000đ | **417.500đ** (Freeship) | **24.1%** |
| | Hạng 3 Vàng (10% + 10%) | -110.000đ (20%) | -50.000đ | **390.000đ** (Freeship) | **29.1%** |
| | Hạng 4 Kim Cương (15% + 10%) | -137.500đ (25%) | -50.000đ | **362.500đ** (Freeship) | **34.1%** |
| **HEARTH (750k)** | Hạng 2 Bạc (5% + 10%) | -112.500đ (15%) | -50.000đ | **587.500đ** (Freeship) | **21.7%** |
| | Hạng 3 Vàng (10% + 10%) | -150.000đ (20%) | -50.000đ | **550.000đ** (Freeship) | **26.7%** |
| | Hạng 4 Kim Cương (15% + 10%) | -187.500đ (25%) | -50.000đ | **512.500đ** (Freeship) | **31.7%** |

---

### Kịch bản 3: KỊCH BẢN XẤU NHẤT (WORST-CASE STACKING SCENARIO)

**Tình huống:** Khách hàng **Hạng 4 (Kim Cương)** đặt mua 1 bộ **THE HEARTH SET (750.000đ)** vào tháng sinh nhật hoặc ngay sau khi vừa thăng hạng:
1. Giảm hạng Kim Cương 15%: **-112.500đ**
2. Thanh toán Chuyển khoản VietQR 10%: **-75.000đ**
3. Áp dụng Voucher Sinh nhật hoặc Thăng hạng Hạng 4: **-500.000đ**
4. Miễn phí vận chuyển: **30.000đ** (Shop chịu)

**Bản tính chi tiết:**
- Tạm tính tiền hàng: **750.000đ**
- Tổng chiết khấu %: 15% + 10% = 25% của 750k = **-187.500đ**
- Trừ voucher cố định: **-500.000đ**
- **Tổng tiền khách trả:** `750.000 - 187.500 - 500.000 =` **62.500đ**
- **Tỷ lệ giảm giá trên giá niêm yết:** `(750.000 - 62.500) / 750.000 =` **91.67%**!

> [!WARNING]
> **CẢNH BÁO TÀI CHÍNH QUAN TRỌNG CHO QUAN (Q4):**
> Nếu hội viên Hạng 4 mua 1 bộ lẻ 750k và áp dụng voucher 500k cùng với VietQR 10% + Giảm hạng 15%, khách chỉ phải trả **62.500đ**.
> Để bảo vệ lợi nhuận của shop, hệ thống kiến nghị Quan xem xét một trong các giải pháp sau:
> 1. **Áp dụng Đơn hàng tối thiểu (min_subtotal) cho Voucher lớn:**
>    - Voucher 200k (Bạc): Áp dụng cho đơn từ **1.000.000đ** trở lên.
>    - Voucher 300k (Vàng): Áp dụng cho đơn từ **1.500.000đ** trở lên.
>    - Voucher 500k (Kim Cương): Áp dụng cho đơn từ **2.500.000đ** trở lên.
> 2. **Trần giảm giá cộng dồn tối đa (Maximum Discount Cap):** Ví dụ trần tối đa 35% hoặc 40% trên tổng giá trị đơn hàng.
> 3. **Quy tắc không cộng dồn Voucher lớn với Giảm hạng:** Voucher quà tặng sinh nhật/thăng hạng thay thế giảm giá hạng cho đơn hàng đó.

---

## 3. ĐỊNH GIÁ NỢ ĐIỂM THƯỞNG (POINTS LIABILITY)

- Mỗi **100.000đ** chi tiêu tích lũy ra **1 điểm**.
- Mỗi **1 điểm** có giá trị quy đổi: `50.000đ / 10 =` **5.000đ tiền mặt**.
- Do đó, tỷ lệ trích lập chi phí ưu đãi điểm là: `5.000đ / 100.000đ =` **5.0% doanh thu thực thu**.
- **Cơ chế tự bảo vệ nguồn vốn (Built-in Risk Mitigations):**
  1. **Khóa 365 ngày:** Điểm thưởng không dùng trong 365 ngày sẽ bị xóa tự động (`EXPIRE`). Shop không bị gánh nợ điểm vô thời hạn.
  2. **Làm tròn xuống theo từng đơn (`floor`):** Đơn 190.000đ chỉ được 1 điểm (dư 90k không làm tròn lên), giúp kiểm soát tỷ lệ điểm thực tế dao động từ 2.6% – 5.0%, bình quân khoảng **3.8% – 4.2%**.
  3. **Không tính điểm trên phí ship và chiết khấu:** Điểm chỉ tính trên giá trị hàng khách thực trả.

---

## 4. CHI PHÍ HẠ TẦNG VIỄN THÔNG (OTP COSTS)

| Kênh gửi OTP | Đơn giá ước tính | Số OTP dự kiến/tháng (1.000 khách) | Tổng chi phí ước tính/tháng |
|---|---|---|---|
| **Zalo ZNS** (Khuyên dùng khi có OA) | ~200đ – 350đ / tin | 500 – 1.000 tin | **100.000đ – 350.000đ** |
| **SMS Brandname** (Viettel/VNPT) | ~450đ – 700đ / tin | 500 – 1.000 tin | **225.000đ – 700.000đ** |

**Cơ chế chống lạm dụng & SMS Pumping đã tích hợp trong code:**
- Khóa 60 giây giữa 2 lần gửi mã liên tiếp.
- Giới hạn tối đa 5 OTP / số điện thoại / ngày.
- Giới hạn tần suất IP nghiêm ngặt.
- Mã OTP chỉ có thời hạn 5 phút và khóa tạm 15 phút nếu nhập sai quá 5 lần.

---

## 5. TỔNG KẾT VÀ QUYẾT ĐỊNH CỦA CHỦ SHOP (QUAN)

| Vấn đề | Đề xuất của Kỹ thuật | Trạng thái |
|---|---|---|
| **Cộng dồn VietQR 10% + Giảm hạng** | Cho phép cộng dồn (tối đa 25% với Hạng 4) | Chờ Quan phê duyệt (Q4) |
| **Điều kiện đơn tối thiểu cho Voucher 200k/300k/500k** | Đặt `min_subtotal` tương ứng 1.000.000đ / 1.500.000đ / 2.500.000đ | Chờ Quan phê duyệt (Q4) |
| **Trần giảm gộp mỗi đơn** | Không vượt quá 35% - 40% giá trị đơn hàng | Chờ Quan phê duyệt (Q4) |
| **Bật cờ `LOYALTY_ENABLED`** | Giữ `false` cho đến khi Quan duyệt kinh tế & vá Q0 | **Đang khóa an toàn** |
