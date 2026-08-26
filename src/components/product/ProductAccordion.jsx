import Accordion from '../ui/Accordion'
import {
  Sparkles,
  Heart,
  CheckCircle2,
  Leaf,
  BadgeCheck,
  ShieldCheck,
  Droplets,
  Thermometer,
  Ban,
  Sun,
  Wind,
  Flame,
  RotateCcw,
  Truck,
  PhoneCall,
  PackageCheck,
  CalendarClock,
} from 'lucide-react'

export default function ProductAccordion({ product }) {
  const detailedText = product.detailedDescription || product.longDescription || product.description

  // ─── B1: Highlights 3 thẻ trực quan ──────────────────────────────────────
  const highlightIcons = [Sparkles, Heart, CheckCircle2]

  // ─── B2: Bảng Size Helper ────────────────────────────────────────────────
  const sizeEntries = product.sizeGuide ? Object.entries(product.sizeGuide) : []
  const hasWeight = sizeEntries.some(([, g]) => g.weight)
  const hasHeight = sizeEntries.some(([, g]) => g.height)
  const hasChest = sizeEntries.some(([, g]) => g.chest)
  const hasWaist = sizeEntries.some(([, g]) => g.waist)
  const hasTrouser = sizeEntries.some(([, g]) => g.trouserLength)
  const hasSleeve = sizeEntries.some(([, g]) => g.sleeveLength)

  // ─── B3: Icon cho ký hiệu giặt ủi quốc tế ────────────────────────────────
  const getCareIcon = (text) => {
    const lower = text.toLowerCase()
    if (lower.includes('giặt')) return Droplets
    if (lower.includes('nhiệt') || lower.includes('độ') || lower.includes('°c') || lower.includes('nước')) return Thermometer
    if (lower.includes('tẩy')) return Ban
    if (lower.includes('phơi') || lower.includes('nắng') || lower.includes('bóng mát')) return Sun
    if (lower.includes('sấy')) return Wind
    if (lower.includes('ủi') || lower.includes('là')) return Flame
    return RotateCcw
  }

  const items = [
    // ─── MỤC 1: MÔ TẢ CHI TIẾT SẢN PHẨM ──────────────────────────────────
    {
      label: 'Mô Tả Chi Tiết Sản Phẩm',
      content: (
        <div className="space-y-6 text-sm text-[#4A3F38]">
          {/* 3 Lý Do Yêu Thích — Visual Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <div>
              <span className="font-serif text-xs font-bold uppercase tracking-[0.18em] text-[#631521] block mb-3">
                ✦ 3 ĐẶC ĐIỂM NỔI BẬT NHẤT
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {product.highlights.map((hl, idx) => {
                  const Icon = highlightIcons[idx % highlightIcons.length]
                  return (
                    <div
                      key={idx}
                      className="bg-[#FAF5F0] border border-[#E8DFD5] p-3.5 rounded-[3px] flex flex-col justify-between shadow-xs hover:border-[#D4AF37] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-white text-[#631521] border border-[#E8DFD5] flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </span>
                        <span className="font-serif text-xs font-bold text-[#631521] tracking-wide">
                          Ưu Điểm 0{idx + 1}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-[#4A3F38] font-light leading-relaxed">
                        {hl}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Description Paragraphs */}
          <div className="font-sans font-light text-sm text-[#4A3F38] leading-relaxed space-y-3 pt-2 border-t border-[#F0EAE1]">
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
      label: 'Hướng Dẫn Chọn Size',
      content: (
        <div className="space-y-4 text-sm text-[#4A3F38]">
          <p className="font-light text-xs sm:text-sm leading-relaxed">
            Đối với phom dáng pijama suông cổ điển châu Âu của QuanNguyenS, bạn có thể dễ dàng đối chiếu số đo cơ thể theo bảng quy chuẩn bên dưới. Nếu nằm giữa 2 size, chúng tôi khuyên bạn nên chọn <strong>size lớn hơn</strong> để có trải nghiệm mặc thư thái nhất.
          </p>

          {sizeEntries.length > 0 ? (
            <div className="overflow-x-auto border border-[#E8DFD5] rounded-[3px] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF5F0] border-b border-[#E8DFD5] text-[#631521] font-serif font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Size</th>
                    {hasWeight && <th className="py-2.5 px-3">Cân Nặng</th>}
                    {hasHeight && <th className="py-2.5 px-3">Chiều Cao</th>}
                    {hasChest && <th className="py-2.5 px-3">Vòng Ngực</th>}
                    {hasWaist && <th className="py-2.5 px-3">Vòng Eo</th>}
                    {hasTrouser && <th className="py-2.5 px-3">Dài Quần</th>}
                    {hasSleeve && <th className="py-2.5 px-3">Dài Tay</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DFD5] font-sans">
                  {sizeEntries.map(([sz, guide]) => (
                    <tr key={sz} className="hover:bg-[#FAF8F5] transition-colors odd:bg-white even:bg-[#FAF8F5]/60">
                      <td className="py-2.5 px-3 font-serif font-bold text-sm text-[#631521]">{sz}</td>
                      {hasWeight && <td className="py-2.5 px-3 font-medium text-[#1A1614]">{guide.weight || '—'}</td>}
                      {hasHeight && <td className="py-2.5 px-3 text-[#4A3F38]">{guide.height || '—'}</td>}
                      {hasChest && <td className="py-2.5 px-3 text-[#4A3F38]">{guide.chest || '—'}</td>}
                      {hasWaist && <td className="py-2.5 px-3 text-[#4A3F38]">{guide.waist || '—'}</td>}
                      {hasTrouser && <td className="py-2.5 px-3 text-[#4A3F38]">{guide.trouserLength || '—'}</td>}
                      {hasSleeve && <td className="py-2.5 px-3 text-[#4A3F38]">{guide.sleeveLength || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Vòng ngực: đo ở điểm rộng nhất của ngực</li>
              <li>Vòng eo: đo ở điểm nhỏ nhất của eo</li>
              <li>Vòng hông: đo ở điểm rộng nhất của hông</li>
            </ul>
          )}

          <div className="bg-[#FAF5F0] p-3 rounded-[2px] border border-[#E8DFD5] text-xs text-[#631521] flex items-center gap-2">
            <span>💡</span>
            <span>Cần tư vấn size chuẩn xác theo vóc dáng riêng? Gọi ngay Hotline <a href="tel:0981753082" className="font-bold underline">0981 753 082</a> để được hỗ trợ 24/7.</span>
          </div>
        </div>
      ),
    },

    // ─── MỤC 3: CHẤT LIỆU & HƯỚNG DẪN BẢO QUẢN ───────────────────────────
    {
      label: 'Chất Liệu & Hướng Dẫn Bảo Quản',
      content: (
        <div className="space-y-6 text-sm text-[#4A3F38]">
          {/* Material Overview */}
          <div>
            <p className="font-serif font-bold text-[#631521] uppercase text-xs tracking-wider mb-1.5">
              TIÊU CHUẨN CHẤT LIỆU CAO CẤP
            </p>
            <p className="font-light leading-relaxed mb-3">
              {product.fabric || 'QuanNguyenS sử dụng chất liệu sợi tự nhiên cao cấp được tuyển chọn kỹ lưỡng.'}{' '}
              {product.fabricDetail || ''}
            </p>

            {/* 4 Distinct Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-white border border-[#E8DFD5] p-2.5 rounded-[2px] flex items-center gap-2 text-xs text-[#1A1614] shadow-xs">
                <Leaf className="w-4 h-4 text-[#2E7D32] shrink-0" />
                <span className="font-medium">100% Tự Nhiên</span>
              </div>
              <div className="bg-white border border-[#E8DFD5] p-2.5 rounded-[2px] flex items-center gap-2 text-xs text-[#1A1614] shadow-xs">
                <BadgeCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span className="font-medium">Chuẩn Xuất Khẩu</span>
              </div>
              <div className="bg-white border border-[#E8DFD5] p-2.5 rounded-[2px] flex items-center gap-2 text-xs text-[#1A1614] shadow-xs">
                <Heart className="w-4 h-4 text-[#631521] shrink-0" />
                <span className="font-medium">Lành Cho Da</span>
              </div>
              <div className="bg-white border border-[#E8DFD5] p-2.5 rounded-[2px] flex items-center gap-2 text-xs text-[#1A1614] shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#1565C0] shrink-0" />
                <span className="font-medium">Bền Phom Dáng</span>
              </div>
            </div>
          </div>

          {/* Care Instructions - Laundry Care Symbol Grid */}
          <div className="pt-4 border-t border-[#E8DFD5]">
            <p className="font-serif font-bold text-[#631521] uppercase text-xs tracking-wider mb-3">
              KÝ HIỆU & HƯỚNG DẪN GIẶT ỦI CHUẨN QUỐC TẾ
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(product.careInstructions || [
                'Giặt tay hoặc máy chế độ nhẹ (delicate)',
                'Nước lạnh hoặc ấm — tối đa 30°C',
                'Không sử dụng chất tẩy mạnh',
                'Phơi trong bóng mát, tránh ánh nắng trực tiếp',
                'Không sấy máy — để vải giữ form tự nhiên',
                'Ủi ở nhiệt độ thấp nếu cần',
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

    // ─── MỤC 4: CHÍNH SÁCH ĐỔI TRẢ ─────────────────────────────────────────
    {
      label: 'Chính Sách Đổi Trả & Giao Hàng',
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
                <p className="font-light text-[#4A3F38] leading-relaxed">
                  {product.name} là phiên bản giới hạn được chuẩn bị theo đơn riêng. Thời gian hoàn thiện và giao hàng dự kiến trong <strong>7–10 ngày làm việc</strong>. Toàn bộ quyền lợi đổi trả miễn phí trong 30 ngày vẫn có hiệu lực đầy đủ kể từ ngày bạn nhận hàng.
                </p>
              </div>
            </div>
          )}

          <p className="font-serif font-bold text-[#631521] uppercase text-xs tracking-wider mb-2">
            QUY TRÌNH ĐỔI SIZE / ĐỔI MẪU 3 BƯỚC TẬN NHÀ (MIỄN PHÍ)
          </p>

          {/* 3 Step Visual Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#FAF5F0] border border-[#E8DFD5] p-4 rounded-[3px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#631521] text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-serif font-bold text-xs text-[#1A1614] uppercase">
                    Liên Hệ Trong 30 Ngày
                  </span>
                </div>
                <p className="font-sans text-xs text-[#4A3F38] font-light leading-relaxed">
                  Sản phẩm còn nguyên tem mác, chưa giặt tẩy. Gọi hotline hoặc nhắn tin thông báo nhu cầu đổi size/màu.
                </p>
              </div>
              <div className="pt-2 mt-2 border-t border-[#E8DFD5]/60 flex items-center gap-1 text-[11px] text-[#631521] font-medium">
                <PhoneCall className="w-3.5 h-3.5" /> Hotline 0981 753 082
              </div>
            </div>

            <div className="bg-[#FAF5F0] border border-[#E8DFD5] p-4 rounded-[3px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#631521] text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-serif font-bold text-xs text-[#1A1614] uppercase">
                    Đổi Trả Tận Nhà Miễn Phí
                  </span>
                </div>
                <p className="font-sans text-xs text-[#4A3F38] font-light leading-relaxed">
                  Bưu tá sẽ đến tận địa chỉ của bạn để giao bộ mới và nhận lại bộ cũ. Bạn không cần ra bưu cục gửi hàng.
                </p>
              </div>
              <div className="pt-2 mt-2 border-t border-[#E8DFD5]/60 flex items-center gap-1 text-[11px] text-[#2E7D32] font-medium">
                <Truck className="w-3.5 h-3.5" /> 100% Miễn phí vận chuyển
              </div>
            </div>

            <div className="bg-[#FAF5F0] border border-[#E8DFD5] p-4 rounded-[3px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#631521] text-white text-xs font-bold font-mono flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-serif font-bold text-xs text-[#1A1614] uppercase">
                    Hoàn Tiền / Đổi Mới
                  </span>
                </div>
                <p className="font-sans text-xs text-[#4A3F38] font-light leading-relaxed">
                  Đổi sang mẫu mới ngay lập tức hoặc hoàn tiền 100% trong vòng 24–48 giờ làm việc nếu không hài lòng.
                </p>
              </div>
              <div className="pt-2 mt-2 border-t border-[#E8DFD5]/60 flex items-center gap-1 text-[11px] text-[#631521] font-medium">
                <PackageCheck className="w-3.5 h-3.5" /> An tâm tuyệt đối
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="border-t border-[#E8DFD5]">
      <Accordion items={items} />
    </div>
  )
}
