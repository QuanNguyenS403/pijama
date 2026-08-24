import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Section8DeepFeature() {
  const tiers = [
    {
      emoji: '🌿',
      name: 'ENTRY SET',
      sub: 'Trải nghiệm đầu tiên',
      desc: 'Set pijama phong cách châu Âu, dáng suông',
      colors: 'Sọc Hồng (Pink Stripe) · Hành Hỏa',
      price: 'Từ 390.000đ',
      note: 'Phù hợp: Muốn thử phong cách châu Âu ấm áp, thanh lịch',
      cta: 'THỬ NGAY',
      highlight: false,
      slug: 'the-classic-set',
    },
    {
      emoji: '✦',
      name: 'SIGNATURE SET',
      sub: 'Bán chạy nhất',
      desc: 'Set pijama cao cấp, chi tiết viền tương phản',
      colors: 'Caro Navy (Navy Plaid) · Hành Thủy',
      price: 'Từ 550.000đ',
      note: 'Phù hợp: Muốn mặc cả ra ngoài, tĩnh tại & sành điệu',
      cta: 'MUA NGAY — BÁN CHẠY',
      highlight: true,
      slug: 'the-cafe-look',
    },
    {
      emoji: '◆',
      name: 'PREMIUM EDIT',
      sub: 'Phiên bản giới hạn',
      desc: 'Set pijama phiên bản giới hạn, dáng wide-leg',
      colors: 'Sọc Nâu (Brown Stripe) · Hành Thổ',
      price: 'Từ 750.000đ',
      note: 'Phù hợp: Muốn đẳng cấp, ấm áp & tái tạo năng lượng',
      cta: 'XEM PHIÊN BẢN GIỚI HẠN',
      highlight: false,
      slug: 'the-evening-edit',
    },
  ]

  const navigate = useNavigate()

  return (
    <section
      id="section-deep-feature"
      aria-label="Size Guide and Pricing"
      className="py-20 sm:py-24 md:py-28 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5] relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            CHỌN BỘ PHÙ HỢP VỚI BẠN
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Tìm bộ dành cho bạn
          </h2>
          <p className="font-sans text-sm sm:text-base text-[#4A3F38] mt-3 leading-relaxed">
            QuanNguyenS thiết kế cho mọi dáng người — không phải chỉ cho người mặc đẹp sẵn
          </p>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className={`rounded-[4px] p-8 flex flex-col justify-between border transition-all duration-300 ${
                tier.highlight
                  ? 'bg-[#631521] text-white border-[#D4AF37] shadow-2xl lg:-translate-y-2'
                  : 'bg-white text-[#2C201A] border-[#E8DFD5] shadow-sm hover:shadow-lg'
              }`}
            >
              {tier.highlight && (
                <div className="text-center mb-4">
                  <span className="inline-block bg-[#D4AF37] text-[#2C201A] text-[10px] font-sans font-bold tracking-widest px-4 py-1 rounded-[2px] uppercase">
                    BÁN CHẠY NHẤT
                  </span>
                </div>
              )}

              <div>
                <div className="text-3xl mb-3">{tier.emoji}</div>
                <h3 className={`font-serif text-xl font-bold mb-1 ${tier.highlight ? 'text-[#D4AF37]' : 'text-[#631521]'}`}>
                  {tier.name}
                </h3>
                <span className={`text-xs font-sans uppercase tracking-wider block mb-4 ${tier.highlight ? 'text-white/70' : 'text-[#8C7E74]'}`}>
                  {tier.sub}
                </span>

                <p className={`font-sans text-sm leading-relaxed mb-2 ${tier.highlight ? 'text-white/90' : 'text-[#4A3F38]'}`}>
                  {tier.desc}
                </p>
                <p className={`font-sans text-xs mb-4 ${tier.highlight ? 'text-white/60' : 'text-[#8C7E74]'}`}>
                  Màu sắc: {tier.colors}
                </p>

                <div className={`text-2xl font-serif font-bold mb-2 ${tier.highlight ? 'text-white' : 'text-[#631521]'}`}>
                  {tier.price}
                </div>
                <p className={`text-xs font-sans italic ${tier.highlight ? 'text-white/60' : 'text-[#8C7E74]'}`}>
                  {tier.note}
                </p>
              </div>

              <button
                onClick={() => navigate(`/san-pham/${tier.slug}`)}
                className={`mt-6 w-full py-3.5 rounded-[2px] font-sans text-xs font-bold tracking-widest uppercase transition-all duration-200 ${
                  tier.highlight
                    ? 'bg-white text-[#D4AF37] border-2 border-[#D4AF37] hover:bg-[#FAF8F5] hover:text-[#B8860B] hover:border-[#B8860B] hover:shadow-gold-glow shadow-lg'
                    : 'bg-[#631521] text-white hover:bg-[#4A0D17]'
                }`}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
