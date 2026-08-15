import { motion } from 'framer-motion'
import { Check, X, Crown, Sparkles } from 'lucide-react'

export default function Section10ComparisonTable({ onSelectTier }) {
  const tiers = [
    {
      name: 'Tiêu Chuẩn',
      englishName: 'Standard Slub',
      price: '450.000₫',
      desc: 'Dòng vải đũi cơ bản cho nhu cầu sinh hoạt hàng ngày.',
      isHighlighted: false,
      buttonText: 'CHỌN GÓI NÀY',
      features: [
        { label: 'Sợi đũi tự nhiên 80%', included: true },
        { label: 'Cấu trúc vi xốp thoáng khí cơ bản', included: true },
        { label: 'Kháng khuẩn khử mùi nhẹ', included: true },
        { label: 'May viền giấu chỉ French seams', included: false },
        { label: 'Cúc mộc dừa đánh bóng thủ công', included: false },
        { label: 'Hộp quà cao cấp & thẻ bảo hành 1 năm', included: false },
        { label: 'Dịch vụ thêu tên riêng độc bản', included: false },
      ],
    },
    {
      name: 'Cao Cấp',
      englishName: 'Premium Slub Silk',
      price: '599.000₫',
      badge: 'LỰA CHỌN PHỔ BIẾN NHẤT',
      desc: 'Kết hợp sợi đũi tuyển chọn pha tơ tằm mềm mát tuyệt hảo.',
      isHighlighted: true,
      buttonText: 'ĐẶT MUA NGAY',
      features: [
        { label: '100% Sợi đũi mộc tự nhiên pha tơ tằm', included: true },
        { label: 'Cấu trúc vi xốp làm mát cấp tốc', included: true },
        { label: 'Kháng khuẩn & chống dị ứng da tuyệt đối', included: true },
        { label: 'May viền giấu chỉ French seams thủ công', included: true },
        { label: 'Cúc mộc dừa đánh bóng thủ công', included: true },
        { label: 'Hộp quà cao cấp & thẻ bảo hành 1 năm', included: true },
        { label: 'Dịch vụ thêu tên riêng độc bản', included: false },
      ],
    },
    {
      name: 'Thượng Hạng',
      englishName: 'Ultimate Haute Silk',
      price: '890.000₫',
      desc: 'Phiên bản giới hạn thượng phẩm dành cho khách hàng sành sỏi.',
      isHighlighted: false,
      buttonText: 'CHỌN GÓI NÀY',
      features: [
        { label: '100% Sợi tơ tằm đũi cổ truyền thượng hạng', included: true },
        { label: 'Cấu trúc vi xốp điều hòa thân nhiệt 4 mùa', included: true },
        { label: 'Kháng khuẩn, xoa dịu làn da nhạy cảm', included: true },
        { label: 'May viền giấu chỉ French seams thủ công', included: true },
        { label: 'Cúc vỏ ốc xà cừ khắc chìm logo vàng', included: true },
        { label: 'Hộp quà cao cấp & thẻ bảo hành 1 năm', included: true },
        { label: 'Dịch vụ thêu tên riêng độc bản miễn phí', included: true },
      ],
    },
  ]

  const handleSelect = (tier) => {
    if (onSelectTier) onSelectTier(tier)
    const elem = document.querySelector('#section-contact')
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="section-table"
      aria-label="Comparison Table Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Tiêu đề phần */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-2">
            Bảng So Sánh Chi Tiết
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            CÁC PHÂN KHÚC VẢI DỆT
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Bảng so sánh 3 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`rounded-[4px] p-8 flex flex-col justify-between relative transition-all duration-300 ${
                tier.isHighlighted
                  ? 'bg-[#D4AF37] text-[#2C201A] shadow-2xl scale-100 lg:-translate-y-3 border-2 border-white'
                  : 'bg-[#1E1510] text-white border border-white/10 hover:border-[#D4AF37]/50 shadow-lg'
              }`}
            >
              {/* Badge cho cột Premium nổi bật */}
              {tier.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#631521] text-white text-[10px] font-sans font-bold tracking-widest px-4 py-1 rounded-[2px] uppercase shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <Crown className="w-3 h-3 text-[#D4AF37]" />
                  <span>{tier.badge}</span>
                </div>
              )}

              <div>
                {/* Header thẻ */}
                <div className="border-b pb-6 mb-6 border-current/20">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-serif text-2xl font-bold ${tier.isHighlighted ? 'text-[#2C201A]' : 'text-white'}`}>
                      {tier.name}
                    </h3>
                    {tier.isHighlighted && <Sparkles className="w-5 h-5 text-[#631521]" />}
                  </div>
                  <span className={`text-[11px] font-sans uppercase tracking-widest block mb-3 ${tier.isHighlighted ? 'text-[#4A3F38]' : 'text-white/60'}`}>
                    {tier.englishName}
                  </span>
                  
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
                      {tier.price}
                    </span>
                    <span className={`text-xs font-sans ${tier.isHighlighted ? 'text-[#4A3F38]' : 'text-white/60'}`}>
                      / sản phẩm
                    </span>
                  </div>

                  <p className={`text-xs font-sans mt-3 leading-relaxed ${tier.isHighlighted ? 'text-[#3D2E26]' : 'text-white/75'}`}>
                    {tier.desc}
                  </p>
                </div>

                {/* Danh sách tính năng so sánh (Dấu tích / Dấu x) */}
                <div className="space-y-3.5 mb-8">
                  {tier.features.map((feat) => (
                    <div key={feat.label} className="flex items-start gap-3 text-xs sm:text-sm font-sans">
                      {feat.included ? (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          tier.isHighlighted ? 'bg-[#631521] text-white' : 'bg-[#D4AF37] text-[#2C201A]'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-white/10 text-white/40 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-3 h-3 stroke-[2]" />
                        </div>
                      )}
                      <span className={feat.included ? 'font-medium' : 'opacity-40 line-through'}>
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút hành động */}
              <button
                onClick={() => handleSelect(tier)}
                className={`w-full py-3.5 rounded-[2px] font-sans text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
                  tier.isHighlighted
                    ? 'bg-[#631521] hover:bg-[#4A0D17] text-white shadow-lg'
                    : 'bg-white/10 hover:bg-white hover:text-[#2C201A] text-white'
                }`}
              >
                {tier.buttonText}
              </button>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
