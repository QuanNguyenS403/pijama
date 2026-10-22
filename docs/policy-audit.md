# BẢNG ĐỐI CHIẾU CHÍNH SÁCH & ĐIỀU KHOẢN VỚI HỆ THỐNG THỰC TẾ — QuanNguyenS
*Tài liệu kiểm toán độc lập phục vụ chuẩn hóa chính sách và điều khoản pháp lý*
*Ngày thực hiện: 22/10/2026*
*Nhánh Git: `feature/policies-and-reviews`*

---

## 1. TỔNG QUAN & NGUYÊN TẮC KIỂM TOÁN

Bảng đối chiếu này rà soát **100% các cam kết** xuất hiện trong các mục chính sách tại `src/data/policies.js` và đối chiếu trực tiếp với mã nguồn thực thi tại backend (`server/index.js`, `server/lib/*`), dữ liệu sản phẩm (`src/data/products.js`), và giao diện frontend.

### Tiêu chí phân loại kết quả:
- **`KHỚP`**: Cam kết trong chính sách đã có mã nguồn hoặc cấu hình thực thi chính xác 100%.
- **`LỆCH`**: Có sự mâu thuẫn giữa câu chữ trong chính sách và hành vi thực tế của mã nguồn/hệ thống. Cần sửa chữ trong chính sách cho khớp với hệ thống hoặc cập nhật mã nguồn theo phê duyệt.
- **`KHÔNG KIỂM CHỨNG ĐƯỢC`**: Cam kết phụ thuộc vào thực tế kinh doanh bên ngoài (pháp nhân, MST, hợp đồng bưu cục, giờ trực hotline) mà trong mã nguồn chưa có căn cứ chứng minh. Đưa vào **Hàng chờ Quan** và tạm thời lược bỏ các khẳng định tuyệt đối để tránh rủi ro pháp lý.

---

## 2. BẢNG ĐỐI CHIẾU CHI TIẾT THEO TỪNG CHÍNH SÁCH

### 2.1 Điều Khoản & Điều Kiện Dịch Vụ (`terms`)

| STT | Vị trí văn bản | Cam kết trong chính sách cũ | Bằng chứng mã nguồn / Hệ thống | Đánh giá | Phương án xử lý |
|---|---|---|---|---|---|
| T-01 | Terms §1 | "Toàn bộ sản phẩm... chất liệu tự nhiên cao cấp, an toàn cho mọi làn da" | `src/data/products.js`: THE DAYBREAK (Cotton-Modal Blend), THE STILLWATER (95% Modal & 5% Spandex), THE HEARTH (100% Tencel Lyocell). Spandex là sợi tổng hợp; "an toàn cho mọi làn da" là cam kết y tế/tuyệt đối chưa có kiểm định lâm sàng. | **LỆCH** | Bỏ từ "tuyệt đối", "an toàn cho mọi làn da". Viết chính xác theo thông số catalog đã công bố: chất liệu tuyển chọn từ sợi thực vật cao cấp (Cotton-Modal, Tencel) kết hợp sợi co giãn tiêu chuẩn. |
| T-02 | Terms §2 | "Được kiểm tra tình trạng ngoại quan gói hàng (đồng kiểm COD)... đối với mọi đơn hàng trên toàn quốc" | `server/index.js:596-614` (`checkCodHandler` gọi `calculateShippingDistance`): COD chỉ áp dụng trong bán kính 30km quanh kho (Amber Riverside, 622 Minh Khai, Hà Nội). Ngoài phạm vi bắt buộc thanh toán chuyển khoản. | **LỆCH** | Viết lại chính xác: Đồng kiểm ngoại quan áp dụng khi nhận hàng; COD áp dụng theo khu vực được hệ thống chấp nhận tại bước thanh toán (nội thành/bán kính 30km Hà Nội). Ngoài khu vực áp dụng chuyển khoản ngân hàng. |
| T-03 | Terms §2, §4 | "Mọi yêu cầu thay đổi thông tin... hoặc hủy đơn cần liên hệ trong vòng 1 giờ" | `server/index.js:657-700` (`/api/orders/cancel-request`): Khách có thể gửi yêu cầu hủy trực tuyến khi đơn ở trạng thái `PENDING` hoặc `AWAITING_PAYMENT`. Hệ thống không đếm ngược 1 giờ cứng. | **LỆCH** | Viết theo hành vi thực tế của hệ thống: Khách hàng có thể tự hủy đơn trực tuyến khi đơn hàng đang ở trạng thái Chờ xử lý hoặc Chờ thanh toán; khi đơn đã chuyển sang trạng thái đóng gói/vận chuyển, khách hàng liên hệ hotline để được hỗ trợ. Bỏ con số "1 giờ" mang tính cam kết cứng không có timer thực thi. |
| T-04 | Terms §3 | "Giá niêm yết... đã bao gồm thuế phí theo quy định" | Chưa có mã số thuế, chưa có cấu hình xuất hóa đơn VAT trong code (`accountDb.js`, `orderPersistence.js`). | **KHÔNG KIỂM CHỨNG ĐƯỢC** | Bỏ khẳng định "đã bao gồm thuế phí"; ghi rõ giá niêm yết bằng Việt Nam Đồng (VNĐ) là giá thanh toán cho sản phẩm. Đưa việc cung cấp thông tin thuế vào Hàng chờ Quan (Q4, Q6). |
| T-05 | Terms §3 | "Chuyển khoản ngân hàng (VietQR - Ưu đãi giảm ngay 10% trực tiếp)" | `server/lib/pricingValidator.js:110-113`: `if (paymentMethod === 'BANK_TRANSFER') bankTransferDiscount = Math.round(calculatedSubtotal * 0.10)`. | **KHỚP** | Giữ nguyên cam kết giảm 10% khi chọn VietQR. Bổ sung quy định rõ ràng về nội dung chuyển khoản và thời hạn thanh toán. |
| T-06 | Terms §3 | "Mọi giao dịch trực tuyến đều được mã hóa bảo mật SSL theo tiêu chuẩn quốc tế" | `server/index.js:35-37` (trust proxy, TLS/HTTPS qua Reverse Proxy), `helmet()` bảo vệ headers. | **KHỚP** | Viết lại chuẩn xác kỹ thuật: Mã hóa đường truyền HTTPS/TLS tiêu chuẩn ngành. |
| T-07 | Terms §4 | "Thời gian giao hàng: Nội thành Hà Nội 1–2 ngày; Các tỉnh thành khác 2–4 ngày làm việc" | Phù hợp với thời gian vận chuyển bưu chính thông thường của Viettel Post (`server/lib/viettelPostService.js`). | **KHỚP** | Giữ nguyên mốc thời gian ước tính 1–2 ngày và 2–4 ngày làm việc. |
| T-08 | Terms §4 | "Sản phẩm đặt may thủ công giới hạn (Pre-order): Thời gian... từ 7–10 ngày làm việc" | `src/data/products.js`: `preOrder.leadTimeDays: [7, 10]`. | **KHỚP** | Giữ nguyên mốc 7–10 ngày làm việc cho sản phẩm Pre-order. |
| T-09 | Terms §5 | "Hotline hỗ trợ 24/7: 0981 753 082" | Hotline cá nhân/chủ shop, thực tế khó đảm bảo trực máy 24 giờ liên tục 7 ngày mỗi tuần. | **KHÔNG KIỂM CHỨNG ĐƯỢC** | Bỏ nhãn "24/7"; viết "Hotline hỗ trợ khách hàng: 0981 753 082 (trong giờ làm việc)". |
| T-10 | Terms (thiếu) | Điều khoản voucher, cộng dồn ưu đãi | `server/lib/pricingValidator.js:115`: `calculatedDiscount = bankTransferDiscount + voucherDiscount`. `voucherValidator.js`: 1 lần/tài khoản, đơn đầu tiên. | **LỆCH (Thiếu)** | Bổ sung mục riêng quy định rõ: Voucher chào mừng chỉ dùng 1 lần cho đơn đầu tiên, được phép cộng dồn với ưu đãi chuyển khoản VietQR 10%, không quy đổi thành tiền mặt. |
| T-11 | Terms (thiếu) | Sai lệch màu sắc, họa tiết màn hình và vải thực | Chưa có điều khoản miễn trừ sai lệch hiển thị thiết bị. | **LỆCH (Thiếu)** | Bổ sung quy định: Màu sắc thực tế có thể chênh lệch nhẹ do độ hiển thị màn hình và ánh sáng chụp lookbook. |
| T-12 | Terms (thiếu) | Quy tắc đánh giá của khách hàng | Frontend trước đây chỉ hiển thị review mẫu; form đánh giá không gửi dữ liệu. | **LỆCH (Thiếu)** | Bổ sung quy tắc minh bạch về đánh giá sản phẩm (mục 11 Điều khoản): Chỉ khách đã nhận hàng mới được gửi đánh giá, hiển thị công khai mọi đánh giá trung thực, từ chối nội dung vi phạm pháp luật/xúc phạm/spam. |

---

### 2.2 Chính Sách Giao Hàng & Vận Chuyển (`shipping`)

| STT | Vị trí văn bản | Cam kết trong chính sách cũ | Bằng chứng mã nguồn / Hệ thống | Đánh giá | Phương án xử lý |
|---|---|---|---|---|---|
| S-01 | Shipping §1 | "Khách hàng có thời gian 1 giờ để liên hệ điều chỉnh thông tin hoặc hủy đơn" | `server/index.js:690-696`: Endpoint hủy đơn chỉ kiểm tra trạng thái đơn (`PENDING`/`AWAITING_PAYMENT`), không có ràng buộc 1 giờ. | **LỆCH** | Sửa thành: Khách hàng có thể hủy đơn trực tuyến hoặc liên hệ đổi thông tin trước khi đơn hàng chuyển sang trạng thái đóng gói và xuất kho giao bưu tá. |
| S-02 | Shipping §2 | "Nội thành Hà Nội: 1–2 ngày; Tỉnh khác: 2–4 ngày; Pre-order: 7–10 ngày làm việc" | Khớp thông số `products.js` và dịch vụ chuyển phát Viettel Post tiêu chuẩn. | **KHỚP** | Giữ nguyên các mốc thời gian ước tính. |
| S-03 | Shipping §3 | "Đồng kiểm COD... kiểm tra niêm phong kiện hàng bên ngoài cùng bưu tá" | `server/index.js:596-614`: Giới hạn bán kính COD 30km quanh kho. Bưu tá cho kiểm tra ngoại quan gói hàng. | **LỆCH** | Sửa thành: Khách hàng được quyền đồng kiểm ngoại quan hộp hàng khi nhận. Áp dụng thanh toán COD tại các khu vực được hỗ trợ theo phạm vi bán kính kho vận (Hà Nội và vùng lân cận trong bán kính 30km). |
| S-04 | Shipping §4 | "Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ trở lên hoặc chương trình ưu đãi combo" | `server/lib/pricingValidator.js:95`: `calculatedShippingFee = calculatedSubtotal >= 500000 ? 0 : 30000`. Không tìm thấy logic ưu đãi combo nào trong code. | **LỆCH** | Giữ nguyên quy định: Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ; đơn dưới 500.000đ áp dụng phí vận chuyển 30.000đ. **Lược bỏ cụm từ "hoặc chương trình ưu đãi combo"** vì chưa có mã nguồn triển khai combo. |
| S-05 | Shipping §4 | "Phí vận chuyển ban đầu không được hoàn lại... Chi phí vận chuyển gửi hàng trả lại do khách hàng chịu trách nhiệm" | Nằm trong phạm vi nội dung đổi trả. | **GIỮ NGUYÊN** | Giữ nguyên nguyên văn theo Luật Thép 2 (không can thiệp nội dung đổi trả). |

---

### 2.3 Chính Sách Bảo Mật Quyền Riêng Tư (`privacy`)

| STT | Vị trí văn bản | Cam kết trong chính sách cũ | Bằng chứng mã nguồn / Hệ thống | Đánh giá | Phương án xử lý |
|---|---|---|---|---|---|
| P-01 | Privacy §1 | "Đơn vị chủ quản: Thương hiệu thời trang QuanNguyenS. Địa chỉ: Amber Riverside, 622 Minh Khai..." | Chưa có thông tin mã số thuế, đăng ký kinh doanh. | **KHÔNG KIỂM CHỨNG ĐƯỢC** | Giữ nguyên thông tin địa chỉ và thương hiệu; ghi nhận vào Hàng chờ Quan để bổ sung pháp nhân khi có giấy phép. |
| P-02 | Privacy §2, §3 | Chỉ nêu dữ liệu thu thập từ Google Sign-In | Hệ thống thực tế còn hỗ trợ: Đăng nhập Facebook (`enterprise_accounts`), Đăng ký mật khẩu bằng Email (`users`), Xác minh số điện thoại OTP (`verification_codes`), Email marketing (`marketing_email_opt_in`), Đơn hàng (`orderPersistence.js`). | **LỆCH (Thiếu)** | Bổ sung đầy đủ các phương thức xác thực và dữ liệu thu thập thật: Email, Mật khẩu băm Argon2id, Facebook Sign-In, Số điện thoại nhận mã giao hàng, Dữ liệu đánh giá sản phẩm. |
| P-03 | Privacy §4 | Cam kết Không Bán, Không Cho Thuê, Không Quảng Cáo Theo Dõi, Không Dùng Dữ Liệu Đào Tạo AI Chung | Nguyên tắc bảo vệ dữ liệu chuẩn mực. | **KHỚP** | **Giữ nguyên 100% không bớt**, chỉ bổ sung bảo vệ mở rộng cho toàn bộ người dùng. |
| P-04 | Privacy §5 | Google Limited Use Disclosure (Nguyên văn tiếng Việt và tiếng Anh) | Yêu cầu bắt buộc tuân thủ chính sách Google API Services User Data Policy. | **KHỚP** | **Giữ nguyên từng ký tự nguyên văn** theo Luật Thép 6. |
| P-05 | Privacy §6 | "Mã hóa TLS 1.3... Session Cookie HttpOnly, Secure, SameSite=Lax... Sao lưu tự động" | `server/index.js`, `customerSessionMiddleware.js`, `backupService.js` (lưu tối đa 14 bản sao lưu SQLite). | **KHỚP** | Giữ nguyên và mô tả chính xác hạ tầng an ninh mạng. |
| P-06 | Privacy §7 | "Cách 2: Truy cập https://quannguyens.com/tai-khoan và chọn mục 'Cài đặt tài khoản' để gửi yêu cầu đóng tài khoản" | Trong giao diện `AccountPage.jsx` và API chưa có nút tự bấm xóa tài khoản. | **LỆCH** | Sửa quy trình thành: Gửi yêu cầu qua email chính thức `quannguyens403@gmail.com` để đội ngũ kỹ thuật đối soát đơn hàng và xóa vĩnh viễn dữ liệu tài khoản trong 24–48 giờ làm việc. Ghi nhận tính năng tự phục vụ vào backlog. |
| P-07 | Privacy (thiếu) | Danh sách bên thứ ba xử lý dữ liệu (Sub-processors) | Mã nguồn sử dụng: Google API, Meta API, Zalo ZNS / SMS Gateway, Viettel Post, SePay (webhook chuyển khoản), Supabase (đồng bộ cloud), Cloudflare Turnstile (chống bot). | **LỆCH (Thiếu)** | Bổ sung danh sách bên xử lý dữ liệu minh bạch, nêu rõ mục đích của từng bên (vận chuyển, thanh toán, bảo mật, gửi thư). |
| P-08 | Privacy (thiếu) | Lưu trữ cục bộ (Local Storage & Cookies) | `localStorage` được dùng để lưu Giỏ hàng (`cart`), Danh sách yêu thích (`wishlist`). | **LỆCH (Thiếu)** | Bổ sung giải thích minh bạch về Cookie kỹ thuật và Lưu trữ cục bộ. |
| P-09 | Privacy (thiếu) | Quyền từ chối nhận email quảng cáo (Unsubscribe) | Endpoint `/api/auth/unsubscribe` và trang `/huy-dang-ky` đã hoạt động trong hệ thống. | **LỆCH (Thiếu)** | Bổ sung điều khoản rõ ràng về quyền hủy nhận email marketing 1-click bất kỳ lúc nào qua liên kết `/huy-dang-ky`. |

---

## 3. MỤC ĐỔI TRẢ HÀNG (`return`) — BÁO CÁO & CHỜ QUYẾT ĐỊNH CỦA QUAN

> ⚠️ **TUÂN THỦ TUYỆT ĐỐI LUẬT THÉP 2:**
> Agent không thiết lập, không viết lại, không sửa đổi, không mở rộng bất kỳ nội dung nào trong mục `return` của `src/data/policies.js` cũng như trường `returnPolicy` trong `src/data/products.js`. Dưới đây chỉ là báo cáo kỹ thuật khách quan để Quan xem xét.

### 3.1 Dấu hiệu bất cập trong văn bản hiện tại
1. **Dấu hiệu văn phong dịch máy từ shop thương mại điện tử nước ngoài:**
   - Cụm từ *"Các khoản hoàn tiền dựa trên sự hài lòng được chấp thuận sẽ phải chịu phí xử lý môi trường 15%"* (Return §1, dòng 153). "Phí xử lý môi trường 15%" là khái niệm của các trang dropship/nước ngoài, không phù hợp với thông lệ bán lẻ thời trang thiết kế cao cấp tại Việt Nam.
   - Cụm từ *"kết quả đạt được"* (Return §2, dòng 160) dịch thô từ *"results achieved"*.
   - Tiêu đề mục 4 có ký tự dấu hỏi cách rời: *"Hàng hóa bị hư hỏng hoặc thiếu ?"* (Return §4, dòng 174).
2. **Sự mâu thuẫn nội tại trong chính sách:**
   - Mục 1 nêu: *"Nếu bạn không hài lòng với kết quả trong vòng 30 ngày kể từ khi nhận được đơn hàng, hãy liên hệ..."* (hứa hẹn đổi trả 30 ngày).
   - Mục 2 lại nêu: *"Chính sách bảo hành của chúng tôi chỉ áp dụng cho kết quả đạt được... Chúng tôi đề nghị quý khách dùng thử và trải nghiệm sản phẩm trước khi yêu cầu hoàn tiền."* (gây khó hiểu cho khách hàng).
   - Sản phẩm tại PDP ghi: *"Hỗ trợ đổi trả trong 30 ngày — Áp dụng theo chính sách đổi trả & cam kết chất lượng QuanNguyenS"*.

### 3.2 Khuyến nghị từ góc độ pháp lý và quản trị rủi ro
*(Lưu ý: Đây là nhận định phân tích kỹ thuật dựa trên hiểu biết chung về thương mại điện tử, không cấu thành tư vấn pháp lý chuyên nghiệp. Quan nên tham vấn chuyên gia pháp lý trước khi ra quyết định kinh doanh).*
- Theo Nghị định 52/2013/NĐ-CP (được sửa đổi bởi Nghị định 85/2021/NĐ-CP) và Luật Bảo vệ quyền lợi người tiêu dùng tại Việt Nam, các website thương mại điện tử bán hàng trực tiếp bắt buộc phải công bố điều kiện, thời hạn, quy trình trả hàng, hoàn tiền và chi phí phát sinh một cách minh bạch, nhất quán.
- Nếu gỡ bỏ hoàn toàn chính sách đổi trả hoặc để chính sách có điều khoản mâu thuẫn/bất lợi bất thường cho người tiêu dùng (như phí môi trường 15% không báo trước), shop có thể gặp rủi ro khi có tranh chấp khiếu nại hoặc khi đăng ký thông báo với Bộ Công Thương.

### 3.3 Danh sách toàn bộ các vị trí trong mã nguồn đang tham chiếu đến "đổi trả":
1. `src/data/policies.js`: Dòng 21, 85, và toàn bộ block `return` (dòng 142–180).
2. `src/data/products.js`: Trường `returnPolicy` tại dòng 94, 211, 304.
3. `src/components/product/ProductInfo.jsx`: Dòng 38 (`trustItems`: "Đổi trả 30 ngày").
4. `src/components/product/ProductAccordion.jsx`: Dòng 235–256 (Mục accordion "Chính Sách Đổi Trả & Giao Hàng").
5. `src/pages/CheckoutPage.jsx`: Dòng 869 (Cam kết đổi trả 30 ngày bên cột tóm tắt đơn).
6. `src/pages/PolicyPage.jsx`: Dòng 44 (Tab danh mục đổi trả).
7. `src/components/ui/PolicyModal.jsx`: Dòng 22 (Tab đổi trả).
8. `src/components/sections/Section12Footer.jsx`: Dòng 54, 238 (Liên kết chân trang).
9. `src/components/chat/ChatPanel.jsx` & `HandoffCard.jsx`: Dòng 15, 149 (Phím tắt gợi ý chat và lý do chuyển tiếp hỗ trợ).
10. `server/lib/chat/*`: Các file kiến thức chatbot (`knowledgeBase.js`, `persona.js`, `intents.js`).

---

## 4. HÀNG CHỜ QUAN (DANH MỤC CÂU HỎI & MẶC ĐỊNH AN TOÀN ĐÃ ÁP DỤNG)

| Mã | Vấn đề | Tình trạng áp dụng trong đợt chuẩn hóa này | Hành động chờ Quan phê duyệt chính thức |
|---|---|---|---|
| **Q1** | Phạm vi ship COD thực tế | **Đã áp dụng mặc định an toàn:** Viết chính sách chuẩn theo code (`calculateShippingDistance`): COD áp dụng trong bán kính 30km quanh kho Hà Nội, ngoài bán kính thanh toán chuyển khoản. | Xác nhận có muốn nới rộng phạm vi COD toàn quốc (cần cấu hình đối soát với Viettel Post) hay giữ 30km. |
| **Q2** | Thời hạn hủy đơn (1 giờ vs trạng thái) | **Đã áp dụng mặc định an toàn:** Bỏ con số "1 giờ"; viết theo code: Cho phép hủy đơn khi trạng thái là `PENDING` hoặc `AWAITING_PAYMENT`. | Xác nhận nếu muốn viết logic đếm ngược 1 giờ cứng trong backend. |
| **Q3** | Định danh thành phần vải | **Đã áp dụng mặc định an toàn:** Lược bỏ cụm từ "100% tự nhiên" và "an toàn cho mọi làn da"; dùng cụm từ trung thực khớp catalog (`products.js`): Cotton-Modal, Modal kết hợp Spandex, Tencel Lyocell. | Cung cấp phiếu kiểm định xưởng dệt nếu muốn khẳng định tiêu chuẩn cao hơn. |
| **Q4** | Thuế GTGT / Hóa đơn | **Đã áp dụng mặc định an toàn:** Bỏ câu "giá đã bao gồm thuế phí"; ghi giá niêm yết là giá thanh toán sản phẩm. | Cho biết mô hình kinh doanh (Hộ kinh doanh / Doanh nghiệp / Cá nhân) để cập nhật xuất hóa đơn. |
| **Q5** | Giờ trực Hotline hỗ trợ | **Đã áp dụng mặc định an toàn:** Bỏ chữ "24/7"; ghi "Hotline hỗ trợ: 0981 753 082". | Cung cấp khung giờ hỗ trợ cố định (ví dụ 8:30 – 21:30 hàng ngày). |
| **Q6** | Thông tin định danh pháp lý | **Đã áp dụng mặc định an toàn:** Giữ tên thương hiệu QuanNguyenS và địa chỉ Amber Riverside; không tự tạo MST/ĐKKD/Bộ Công Thương. | Cung cấp Tên doanh nghiệp/hộ kinh doanh, Mã số thuế, Giấy phép ĐKKD khi hoàn tất thủ tục. |
| **Q7** | Quy tắc cộng dồn Voucher | **Đã áp dụng mặc định an toàn:** Viết đúng theo code (`pricingValidator.js`): Giảm giá VietQR 10% và Voucher chào mừng được cộng dồn đồng thời. | Xác nhận quy tắc kinh doanh này là đúng mong muốn của Quan. |
| **Q8** | Đóng/xóa tài khoản cá nhân | **Đã áp dụng mặc định an toàn:** Nêu quy trình gửi email đến `quannguyens403@gmail.com` để xử lý xóa dữ liệu trong 24–48h. | Phê duyệt việc bổ sung nút tự xóa tài khoản trong trang cá nhân ở đợt nâng cấp tiếp theo. |
| **Q-REV** | Quyết định về `sampleReviews` cũ trong `products.js` | **Đã áp dụng mặc định an toàn:** Bật cờ `REVIEWS_SOURCE=api`; giao diện chỉ hiển thị đánh giá thật được duyệt từ database; `sampleReviews` trong file khóa không còn hiển thị ra ngoài; không hiển thị số sao giả khi chưa có đánh giá thật. | Xác nhận xóa hẳn mảng `sampleReviews` khỏi `products.js` khi Quan đồng ý sửa file 🔒. |
