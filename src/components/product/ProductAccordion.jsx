import { Link } from 'react-router-dom'
import Accordion from '../ui/Accordion'
import {
  Droplets,
  Thermometer,
  Ban,
  Sun,
  Wind,
  Flame,
  RotateCcw,
  CalendarClock,
} from 'lucide-react'

export default function ProductAccordion({ product }) {
  const detailedText = product.detailedDescription || product.longDescription || product.description

  // ─── Ký hiệu giặt ủi quốc tế ──────────────────────────────────────────────
  const getCareIcon = (text) => {
    const lower = text.toLowerCase()
    if (lower.includes('khô') || lower.includes('bảo quản')) return Sun
    if (lower.includes('vắt') || lower.includes('xoắn')) return RotateCcw
    if (lower.includes('ngâm') || lower.includes('loang')) return Thermometer
    if (lower.includes('tẩy')) return Ban
    if (lower.includes('sấy') || lower.includes('ủi') || lower.includes('là')) return Flame
    if (lower.includes('giặt')) return Droplets
    if (lower.includes('phơi') || lower.includes('nắng') || lower.includes('bóng mát')) return Sun
    return RotateCcw
  }

  const items = [
    // ─── MỤC 1: MÔ TẢ CHI TIẾT SẢN PHẨM ──────────────────────────────────
    {
      label: 'Mô Tả Chi Tiết Sản Phẩm',
      content: (
        <div className="space-y-6 text-sm text-[#4A3F38]">
          {/* Detailed Description Paragraphs */}
          <div className="font-sans font-normal text-sm text-[#4A3F38] leading-relaxed space-y-3">
            {detailedText ? (
              detailedText.split('\n\n').map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))
            ) : (
              <p>
                Được làm từ chất vải tự nhiên cao cấp mà chúng tôi tự tay tuyển chọn, {product.name} mang lại cảm giác nhẹ nhàng, thoáng mát như không mặc gì — trong khi vẫn đủ thanh lịch để bước ra ngoài mà không cần thay đồ.
              </p>
            )}
          </div>
        </div>
      ),
    },

    // ─── MỤC 2: HƯỚNG DẪN CHỌN SIZE ──────────────────────────────────────
    {
      id: 'size-guide-accordion',
      label: 'Hướng Dẫn Chọn Size',
      content: (
        <div className="space-y-4 text-sm text-[#4A3F38]">
          <p className="font-normal text-xs sm:text-sm leading-relaxed">
            Đối với phom dáng pijama suông cổ điển châu Âu của QuanNguyenS, bạn có thể dễ dàng đối chiếu số đo cơ thể để lựa chọn kích cỡ phù hợp nhất. Nếu nằm giữa 2 size, chúng tôi khuyên bạn nên chọn <strong>size lớn hơn</strong> để có trải nghiệm mặc thư thái nhất.
          </p>

          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#4A3F38]">
            <li>Vòng ngực: đo ở điểm rộng nhất của ngực</li>
            <li>Vòng eo: đo ở điểm nhỏ nhất của eo</li>
            <li>Vòng hông: đo ở điểm rộng nhất của hông</li>
          </ul>
        </div>
      ),
    },

    // ─── MỤC 3: HƯỚNG DẪN BẢO QUẢN ───────────────────────────────────────
    {
      label: 'HƯỚNG DẪN BẢO QUẢN',
      content: (
        <div className="space-y-4 text-sm text-[#4A3F38]">
          {/* Care Instructions - Laundry Care Symbol Grid */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(product.careInstructions || [
                'Bảo quản nơi khô ráo',
                'Giặt máy chế độ nhẹ, tốt nhất khi giặt tay',
                'Không sử dụng chất tẩy quần áo',
                'Không vắt hoặc xoắn mạnh vì điều này có thể gây ra các nếp nhăn và ảnh hưởng đến độ bền, cấu trúc của vải.',
                'Không ngâm bột giặt có chất tẩy mạnh để tránh loang màu vải.',
                'Hạn chế sử dụng máy sấy nóng và ủi ở nhiệt độ thích hợp.',
              ]).map((ins, i) => {
                const Icon = getCareIcon(ins)
                return (
                  <div
                    key={i}
                    className="bg-[#FAF5F0] border border-[#E8DFD5] p-3 rounded-[3px] flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-white border border-[#E8DFD5] text-[#631521] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-[#631521]" />
                    </div>
                    <p className="font-sans text-xs text-[#3A3535] leading-relaxed">
                      {ins}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ),
    },

    // ─── MỤC 4: CHÍNH SÁCH ĐỔI TRẢ & GIAO HÀNG ────────────────────────────
    {
      label: 'CHÍNH SÁCH GIAO HÀNG & ĐỔI TRẢ',
      content: (
        <div className="space-y-4 text-sm text-[#4A3F38]">
          {/* Pre-order Special Notice */}
          {product.preOrder?.enabled && (
            <div className="bg-[#FAF5F0] border-2 border-[#D4AF37] p-3.5 rounded-[3px] flex items-start gap-3 text-xs text-[#631521] shadow-xs">
              <CalendarClock className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <p className="font-serif font-bold text-xs uppercase tracking-wider text-[#631521] mb-0.5">
                  LƯU Ý ĐẶT TRƯỚC (PRE-ORDER)
                </p>
                <p className="font-normal text-[#4A3F38] leading-relaxed">
                  {product.name} là phiên bản giới hạn được chuẩn bị theo đơn riêng. Thời gian hoàn thiện và giao hàng dự kiến trong <strong>7–10 ngày làm việc</strong>. Toàn bộ quyền lợi đổi trả theo quy định vẫn có hiệu lực đầy đủ kể từ ngày bạn nhận hàng.
                </p>
              </div>
            </div>
          )}

          <div className="bg-[#FAF5F0] border border-[#E8DFD5] p-5 sm:p-6 rounded-[3px] space-y-4">
            <div>
              <p className="font-serif font-bold text-xs uppercase tracking-wider text-[#631521] mb-3">
                Điều kiện áp dụng:
              </p>
              <ul className="space-y-2.5 font-sans text-xs sm:text-sm text-[#4A3F38] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>Sản phẩm nằm trong thời hạn đổi / trả đã quy định</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>01 đơn hàng áp dụng đổi / trả 01 lần</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>Sản phẩm còn hoá đơn và nguyên tag mác</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>Sản phẩm chưa qua sử dụng, giặt tẩy, không dơ bẩn và không có mùi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>Không áp dụng cho các sản phẩm phụ kiện</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#631521] font-bold shrink-0 mt-0.5">•</span>
                  <span>Không áp dụng đổi / trả hàng với các sản phẩm sale đồng giá (99k, 199, 299k, 399k,...) và các sản phẩm sale từ 30% trở lên</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#E8DFD5]">
              <p className="font-sans font-bold text-xs text-[#631521] leading-relaxed tracking-wide uppercase">
                LƯU Ý: CHI TIẾT XEM Ở{' '}
                <Link
                  to="/chinh-sach?tab=exchange"
                  className="underline hover:text-[#D4AF37] transition-colors"
                >
                  CHÍNH SÁCH ĐỔI HÀNG
                </Link>{' '}
                VÀ{' '}
                <Link
                  to="/chinh-sach?tab=return"
                  className="underline hover:text-[#D4AF37] transition-colors"
                >
                  CHÍNH SÁCH TRẢ HÀNG
                </Link>
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="border-t border-[#E8DFD5]">
      <Accordion items={items} allowMultiple={true} />
    </div>
  )
}
