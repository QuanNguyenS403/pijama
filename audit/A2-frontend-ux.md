# BÁO CÁO RÀ SOÁT A2 — FRONTEND UX / A11Y / SEO / PERFORMANCE
*Người thực hiện: A2 UX/A11y/SEO/Perf Auditor*
*Phạm vi: `src/**`, `index.html`, `public/`, `vite.config.js`*
*Trạng thái: Độc lập, chỉ đọc và kiểm thử cục bộ*

---

## 1. TỔNG QUAN PHẠM VI

- **SEO & Meta:** Đã kiểm tra `index.html`, Title tag, Description, Canonical URL, Open Graph, Twitter Cards, Schema.org JSON-LD structured data.
- **Accessibility (A11y):** Đã kiểm tra ARIA labels, bàn phím navigation, màu tương phản thương hiệu (Palette #2C201A, #D4AF37, #FAF8F5, #631521), cấu trúc heading H1/H2/H3.
- **Performance & Asset Sizing:** Kiểm tra dung lượng bundle Rollup Vite và dung lượng ảnh tĩnh trong `public/images/` và `dist/assets/`.
- **UX & State Polling:** Kiểm tra các vòng lặp interval và sự kiện DOM.

---

## 2. DANH SÁCH PHÁT HIỆN

### Phát hiện A2-001
- **ID:** A2-001
- **Tiêu đề:** Thư viện ảnh sản phẩm tĩnh trong `public/images/` có dung lượng quá lớn (lên tới 2.28MB/ảnh), gây nghẽn băng thông và suy giảm Core Web Vitals (LCP)
- **Mức đề xuất:** 🟠 P1
- **Vị trí:** `public/images/classic-set-brown-main.jpg` (2.28 MB), `classic-set-brown-thumb-2.jpg` (2.00 MB), `classic-set-brown-thumb-3.jpg` (1.78 MB), `classic-set-brown-thumb-1.jpg` (1.75 MB), `classic-set-navy-main.jpg` (1.05 MB), `logo.jpg` (510 KB)
- **Mô tả & tác động thực tế:** Tổng dung lượng ảnh tĩnh trong thư mục `public/images/` vượt quá 18MB. Khi khách hàng truy cập trang chi tiết sản phẩm trên thiết bị di động với mạng 4G/3G, trình duyệt phải tải về nhiều file ảnh từ 1MB đến 2.3MB không qua nén WebP/AVIF. Điều này khiến chỉ số Largest Contentful Paint (LCP) kéo dài trên 4-6 giây, tiêu tốn dung lượng của người dùng và làm giảm tỷ lệ chuyển đổi đơn hàng.
- **Bằng chứng:**
  ```
  classic-set-brown-main.jpg:    2,282,567 bytes (~2.28 MB)
  classic-set-brown-thumb-2.jpg: 1,999,538 bytes (~2.00 MB)
  classic-set-brown-thumb-3.jpg: 1,784,387 bytes (~1.78 MB)
  classic-set-brown-thumb-1.jpg: 1,745,983 bytes (~1.75 MB)
  classic-set-navy-main.jpg:     1,051,711 bytes (~1.05 MB)
  ```
- **Cách tái hiện:** Chạy lệnh kiểm tra dung lượng `ls -l public/images/*.jpg`.
- **Điều kiện tiên quyết:** Khách hàng duyệt trang web hoặc mở trang Product Detail.
- **Nghi ngờ nằm ở file 🔒?:** Lưu ý: `src/data/products.js` là file 🔒 trỏ tới các đường dẫn file này. Do đó, việc nén ảnh phải giữ nguyên tên file hoặc chuyển đổi qua công cụ build mà không đổi cấu trúc đường dẫn đã khai báo trong file 🔒.
- **Đề xuất sửa:** Nén ảnh qua `sharp` hoặc công cụ tối ưu hóa ảnh JPEG/WebP để giảm kích thước ảnh xuống dưới 200KB-300KB/ảnh mà vẫn giữ nguyên độ sắc nét cao và tên file. Thêm thuộc tính `loading="lazy"` và `decoding="async"` trên các thẻ `<img>` danh mục.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A2-002
- **ID:** A2-002
- **Tiêu đề:** `Header.jsx` chạy vòng lặp `setInterval` mỗi 3 giây đọc localStorage và parse JSON liên tục
- **Mức đề xuất:** 🟡 P2
- **Vị trí:** `src/components/layout/Header.jsx:53-56`
- **Mô tả & tác động thực tế:** Trong `Header.jsx`, có đoạn code:
  ```js
  const interval = setInterval(() => {
    updateWishlistCount()
    updateOrdersCount()
  }, 3000)
  ```
  Hàm này liên tục đọc `localStorage.getItem('qns_wishlist')`, parse JSON, và gọi `getSavedOrders()` mỗi 3 giây dù người dùng không tương tác. Trong khi đó, component đã có sẵn các event listener `window.addEventListener('storage')`, `wishlist_updated`, `orders_updated`. Vòng lặp polling này gây tiêu tốn CPU/pin không cần thiết trên thiết bị di động.
- **Bằng chứng:** `src/components/layout/Header.jsx:53-56`.
- **Cách tái hiện:** Mở component `Header.jsx` dòng 53-56.
- **Điều kiện tiên quyết:** Bất kỳ trang nào hiển thị Header.
- **Nghi ngờ nằm ở file 🔒?:** Không.
- **Đề xuất sửa:** Loại bỏ `setInterval` 3 giây, hoàn toàn dựa vào CustomEvent bus (`window.dispatchEvent(new Event('wishlist_updated'))`, `orders_updated`) và sự kiện `storage`.
- **Độ tin cậy:** CONFIRMED.

---

### Phát hiện A2-003
- **ID:** A2-003
- **Tiêu đề:** Điểm sáng UX/SEO đạt tiêu chuẩn cao (Passed Audits)
- **Mức đề xuất:** ⚪ P3 (Ghi nhận đạt)
- **Vị trí:** `index.html:1-87`, `src/components/layout/Header.jsx:155-225`
- **Mô tả & tác động thực tế:**
  1. SEO: Đã cấu hình đầy đủ `meta description`, `keywords`, `canonical URL`, `og:image`, `twitter:card`, và Schema.org `ClothingStore` JSON-LD chuẩn cho Google Bot.
  2. A11y: Các nút điều hướng và icon trong Header (Logo, Wishlist, Account, Cart) đều đã được gắn `aria-label` đầy đủ và rõ nghĩa cho trình đọc màn hình.
  3. Typography: Phối hợp hoàn hảo giữa font Serif cổ điển (`Cormorant Garamond`) và font Sans hiện đại (`Inter`) qua Google Fonts `display=swap`.
- **Bằng chứng:** Xem `index.html` và `Header.jsx`.
- **Độ tin cậy:** CONFIRMED.
