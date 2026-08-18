import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function Section3FeaturedProducts() {
  const navigate = useNavigate()

  const products = [
    {
      id: 'classic-set',
      slug: 'the-classic-set',
      mood: 'THE CLASSIC SET',
      name: 'THE CLASSIC SET',
      subtitle: 'Sọc Hồng & Caro Navy',
      color: 'Sọc Hồng & Caro Navy · Giá từ 390.000đ',
      desc: 'Hai mẫu hoa văn — một mood.\nChất liệu mềm mại tự nhiên, viền tương phản tinh tế.\nMặc từ nhà ra phố, không cần thay.',
      image: '/images/classic-set-pink-main.jpg',
      badge: 'MỚI RA MẮT',
      swatches: [
        {
          type: 'stripe',
          bg: `repeating-linear-gradient(0deg, #F2C4CE 0px, #F2C4CE 2px, #FFFFFF 2px, #FFFFFF 4px)`,
          label: 'Sọc Hồng',
        },
        {
          type: 'plaid',
          bg: `repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, #1B2A4A 1px, #1B2A4A 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 4px)`,
          color: '#1B2A4A',
          label: 'Caro Navy',
        },
      ],
    },
    {
      id: 'cafe-look',
      slug: 'the-cafe-look',
      mood: 'THE CAFÉ LOOK',
      name: 'Set pijama cổ V viền tương phản',
      subtitle: 'Ivory Cream & Sand',
      color: 'Màu Dusty Rose / Ivory Cream · 550.000đ',
      desc: 'Mặc thẳng từ nhà đến quán — không ai biết đây là đồ ngủ',
      image: heroCampaignImg,
      badge: 'BÁN CHẠY NHẤT',
      swatches: [
        { type: 'solid', color: '#FAF8F5', label: 'Ivory Cream' },
        { type: 'solid', color: '#D4AF37', label: 'Sand' },
      ],
    },
    {
      id: 'evening-edit',
      slug: 'the-evening-edit',
      mood: 'THE EVENING EDIT',
      name: 'Set pijama dáng wide-leg',
      subtitle: 'Deep Wine & Charcoal',
      color: 'Màu Burgundy Deep / Charcoal · 750.000đ',
      desc: 'Đi ăn tối bạn bè mà vẫn chill nhất phòng',
      image: lifestyleNightImg,
      badge: 'PHIÊN BẢN GIỚI HẠN',
      swatches: [
        { type: 'solid', color: '#4A0D17', label: 'Deep Wine' },
        { type: 'solid', color: '#2C201A', label: 'Charcoal' },
      ],
    },
  ]

  return (
    <section
      id="section-products"
      aria-label="Featured Products"
      className="py-20 sm:py-24 md:py-28 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            BỘ SƯU TẬP MỚI NHẤT
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Mỗi bộ là một mood
            <span className="block text-[#631521] italic font-light mt-1 text-2xl sm:text-3xl">
              Bạn chọn ngày hôm nay là gì?
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-14">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="bg-white rounded-[4px] border border-[#E8DFD5] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              onClick={() => navigate(`/san-pham/${product.slug}`)}
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F0EB]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 bg-[#631521] text-white text-[10px] font-sans font-bold tracking-wider px-2.5 py-1 rounded-[2px] uppercase shadow-sm">
                  {product.badge}
                </div>
              </div>

              {/* Info */}
              <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between bg-white">
                <div>
                  <span className="font-serif text-xs font-bold tracking-[0.2em] text-[#D4AF37] uppercase block mb-1">
                    {product.mood}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
                    {product.name}
                  </h3>
                  <span className="text-[11px] text-[#8C7E74] font-sans block mt-0.5">{product.color}</span>
                  <p className="font-sans text-sm text-[#4A3F38] italic mt-2.5 leading-relaxed whitespace-pre-line">
                    "{product.desc}"
                  </p>

                  {/* Swatches */}
                  {product.swatches && (
                    <div className="flex items-center gap-2 mt-3 pt-2">
                      {product.swatches.map((sw, sIdx) => (
                        <span
                          key={sIdx}
                          title={sw.label}
                          className="w-4 h-4 border border-[#E8DFD5] shadow-xs inline-block"
                          style={{
                            borderRadius: sw.type === 'solid' ? '50%' : '0px',
                            background: sw.bg || sw.color,
                            backgroundColor: sw.color,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[#F5F0EB]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/san-pham/${product.slug}`)
                    }}
                    className="w-full inline-flex items-center justify-center bg-[#2C201A] hover:bg-[#631521] text-white font-sans text-xs font-bold tracking-wider px-4 py-2.5 rounded-[2px] transition-colors uppercase cursor-pointer"
                  >
                    XEM CHI TIẾT
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
