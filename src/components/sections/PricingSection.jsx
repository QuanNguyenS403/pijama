import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gift, Check, Sparkles, ShieldCheck, Truck, RefreshCw } from 'lucide-react'
import { pricingTiers, trustPoints } from '../../data/pricing'

export default function PricingSection({ onOpenSizeGuide, preselectedProduct }) {
  const [selectedTierId, setSelectedTierId] = useState('combo-2')
  const [orderSubmitted, setOrderSubmitted] = useState(false)

  // Item selections per tier (up to 3 items)
  const [itemSelections, setItemSelections] = useState([
    { color: 'Xanh Than Kẻ', size: 'M' },
    { color: 'Sọc Hồng Pastel', size: 'M' },
    { color: 'Trắng Ngà Classic', size: 'L' }
  ])

  const colors = [
    'Xanh Than Kẻ (Navy Check)',
    'Sọc Hồng Pastel (Pink Stripe)',
    'Trắng Ngà Classic (Oatmeal)',
    'Xám Than Cộc (Slate Charcoal)',
    'Xanh Sage (Pale Sage)',
    'Nâu Đất (Muted Taupe)'
  ]
  const sizes = ['S', 'M', 'L', 'XL', '2XL']

  const activeTier = pricingTiers.find((t) => t.id === selectedTierId) || pricingTiers[1]
  const itemCount = selectedTierId === 'single' ? 1 : selectedTierId === 'combo-2' ? 2 : 3

  const handleItemColorChange = (index, color) => {
    const updated = [...itemSelections]
    updated[index] = { ...updated[index], color }
    setItemSelections(updated)
  }

  const handleItemSizeChange = (index, size) => {
    const updated = [...itemSelections]
    updated[index] = { ...updated[index], size }
    setItemSelections(updated)
  }

  const handleOrder = (e) => {
    e.preventDefault()
    setOrderSubmitted(true)
    setTimeout(() => setOrderSubmitted(false), 5000)
  }

  return (
    <section
      id="pricing-section"
      aria-label="Bảng giá & Đặt hàng Pijama Đũi QuanNguyenS"
      className="bg-[#FAF8F5] py-14 sm:py-18 md:py-24 relative overflow-hidden border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-2">
            BẢNG GIÁ ƯU ĐÃI TRỰC TIẾP TỪ XƯỞNG
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] tracking-tight mb-3">
            Chọn Gói Trải Nghiệm <br />
            <span className="font-serif-italic text-[#8C7E74]">Phù Hợp Cho Bạn & Gia Đình</span>
          </h2>
          <p className="text-sm text-[#475569] font-light leading-relaxed">
            Ưu đãi độc quyền trực tiếp từ thương hiệu QuanNguyenS. Miễn phí giao hàng toàn quốc và hỗ trợ đổi size tận nhà trong 30 ngày.
          </p>
        </div>

        {/* Pricing Cards Grid (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch mb-14">
          {pricingTiers.map((tier, index) => {
            const isSelected = selectedTierId === tier.id

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                onClick={() => setSelectedTierId(tier.id)}
                className={`relative cursor-pointer rounded-[3px] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#0F172A] text-[#FAF8F5] shadow-luxury border-2 border-[#C5A059] lg:-translate-y-2'
                    : 'bg-[#FFFFFF] text-[#1A1614] shadow-sm border border-[#E8DFD5] hover:border-[#0F172A]'
                }`}
              >
                {/* Popular Badge */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C5A059] text-[#0F172A] text-[9.5px] font-bold tracking-[0.2em] uppercase px-3.5 py-1 rounded-[2px] shadow-sm whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}

                <div>
                  <span
                    className={`text-[10px] font-bold tracking-[0.2em] uppercase block mb-1.5 ${
                      isSelected ? 'text-[#C5A059]' : 'text-[#64748B]'
                    }`}
                  >
                    {tier.label}
                  </span>

                  <h3 className="font-serif text-2xl font-normal mb-3">
                    {tier.title}
                  </h3>

                  {/* Price Row */}
                  <div className="flex items-baseline gap-2.5 mb-4 pb-4 border-b border-[#E8DFD5]/20">
                    <span className="font-serif text-3xl sm:text-4xl font-bold">
                      {tier.price}
                    </span>
                    <span className={`text-xs line-through ${isSelected ? 'text-[#94A3B8]' : 'text-[#8C7E74]'}`}>
                      {tier.originalPrice}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold tracking-wider px-2 py-0.5 rounded-[1px] ${
                        isSelected
                          ? 'bg-[#C5A059]/20 text-[#C5A059]'
                          : 'bg-[#FAF8F5] text-[#C5A059] border border-[#E8DFD5]'
                      }`}
                    >
                      {tier.savings}
                    </span>
                  </div>

                  <p className={`text-xs font-light leading-relaxed mb-4 ${isSelected ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                    {tier.description}
                  </p>

                  {/* Gift Tag */}
                  {tier.gift && (
                    <div className="bg-[#C5A059]/10 border border-[#C5A059]/30 p-2.5 rounded-[2px] mb-4 flex items-start gap-2 text-xs text-[#C5A059]">
                      <Gift className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-semibold text-[11px]">{tier.gift}</span>
                    </div>
                  )}

                  {/* Perks List */}
                  <ul className="space-y-2 mb-6 text-xs">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                        <span className={isSelected ? 'text-[#E2E8F0]' : 'text-[#475569]'}>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className={`w-full py-3 px-4 rounded-[2px] text-xs font-bold tracking-[0.18em] uppercase transition-all ${
                    isSelected
                      ? 'bg-[#C5A059] hover:bg-[#B38F48] text-[#0F172A]'
                      : 'bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5]'
                  }`}
                >
                  {isSelected ? 'ĐÃ CHỌN GÓI NÀY' : tier.ctaLabel}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Order Form Area */}
        <div className="bg-[#FFFFFF] p-6 sm:p-10 rounded-[3px] border border-[#E8DFD5] shadow-luxury max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-[10px] font-bold tracking-[0.22em] text-[#C5A059] uppercase block mb-1">
              ĐẶT HÀNG NHANH — GÓI ĐANG CHỌN: {activeTier.label} ({activeTier.price})
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1A1614]">
              Thông Tin Đặt Hàng Trực Tiếp
            </h3>
          </div>

          <form onSubmit={handleOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10.5px] font-bold tracking-wider text-[#1A1614] uppercase block mb-1.5">
                  HỌ & TÊN KHÁCH HÀNG:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D9CDBF] rounded-[2px] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold tracking-wider text-[#1A1614] uppercase block mb-1.5">
                  SỐ ĐIỆN THOẠI NHẬN HÀNG:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0987 654 321"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D9CDBF] rounded-[2px] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold tracking-wider text-[#1A1614] uppercase block mb-1.5">
                ĐỊA CHỈ GIAO HÀNG TẬN NƠI:
              </label>
              <input
                type="text"
                required
                placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D9CDBF] rounded-[2px] text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            {/* Dynamic Multi-Item Color & Size Selection */}
            <div className="bg-[#FAF8F5] p-4 rounded-[2px] border border-[#E8DFD5]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10.5px] font-bold tracking-[0.18em] text-[#0F172A] uppercase">
                  TÙY CHỌN MÀU & SIZE ({itemCount} BỘ PIJAMA):
                </span>
                <button
                  type="button"
                  onClick={onOpenSizeGuide}
                  className="text-[10.5px] text-[#64748B] hover:text-[#0F172A] underline"
                >
                  Xem bảng hướng dẫn size
                </button>
              </div>

              <div className="space-y-3">
                {[...Array(itemCount)].map((_, idx) => (
                  <div key={idx} className="p-2.5 bg-[#FFFFFF] rounded-[2px] border border-[#E8DFD5] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <span className="sm:col-span-3 text-xs font-bold text-[#C5A059] uppercase tracking-wider">
                      Bộ #{idx + 1}:
                    </span>

                    <div className="sm:col-span-5">
                      <select
                        value={itemSelections[idx]?.color || colors[0]}
                        onChange={(e) => handleItemColorChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D9CDBF] rounded-[2px] text-xs text-[#0F172A]"
                      >
                        {colors.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={itemSelections[idx]?.size || 'M'}
                        onChange={(e) => handleItemSizeChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#D9CDBF] rounded-[2px] text-xs text-[#0F172A]"
                      >
                        {sizes.map((s) => (
                          <option key={s} value={s}>Size {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-xs font-bold tracking-[0.2em] uppercase py-3.5 rounded-[2px] transition-colors shadow-luxury flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>XÁC NHẬN ĐẶT HÀNG ({activeTier.price}) — KIỂM HÀNG MỚI THANH TOÁN</span>
            </button>

            {orderSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#788779] text-[#FAF8F5] p-3 rounded-[2px] text-center text-xs font-medium"
              >
                Cảm ơn quý khách! Đơn hàng của quý khách đã được ghi nhận. Chuyên viên QuanNguyenS sẽ gọi điện xác nhận trong 15 phút.
              </motion.div>
            )}
          </form>
        </div>

        {/* Minimalist Trust Points Strip */}
        <div className="mt-12 pt-8 border-t border-[#E8DFD5] grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustPoints.map((pt) => (
            <div key={pt.title} className="flex flex-col items-center text-center p-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F0EB] flex items-center justify-center mb-2 text-[#C5A059]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-[#1A1614] tracking-wider uppercase mb-0.5">
                {pt.title}
              </h4>
              <p className="text-[10.5px] text-[#64748B] font-light">
                {pt.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
