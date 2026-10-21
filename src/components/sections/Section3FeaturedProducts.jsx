import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function Section3FeaturedProducts() {
  const navigate = useNavigate()

  const scrollTo = (id) => {
    const elem = document.querySelector(id)
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  const products = [
    {
      id: 'classic-set',
      slug: 'the-classic-set',
      name: 'THE DAYBREAK SET',
      subtitle: 'Sọc Hồng · Năng Lượng Hỏa',
      color: 'Sọc Hồng · Năng lượng Hỏa ấm áp',
      desc: 'Sọc hồng rạng rỡ như nắng sớm mai.\nChất liệu tự nhiên thoáng khí, viền trắng tinh tế.\nKhởi đầu ngày mới tràn đầy sinh khí.',
      image: '/images/classic-set-pink-main.jpg',
      badge: 'MỚI RA MẮT',
      preOrderBadge: 'Pre-order',
      swatches: [
        {
          type: 'stripe',
          bg: `repeating-linear-gradient(0deg, #EFAEA0 0px, #EFAEA0 2px, #FFFFFF 2px, #FFFFFF 4px)`,
          label: 'Sọc Hồng (Hành Hỏa)',
        },
      ],
    },
    {
      id: 'cafe-look',
      slug: 'the-cafe-look',
      name: 'THE STILLWATER SET',
      subtitle: 'Caro Navy · Năng Lượng Thủy',
      color: 'Caro Navy · Năng lượng Thủy tĩnh tại',
      desc: 'Họa tiết Caro Navy trầm lắng, an yên như mặt nước lặng.\nCổ V thanh lịch cùng viền phối sắc nét.\nMặc thẳng từ nhà đến quán café sáng.',
      image: '/images/classic-set-navy-main.jpg',
      badge: 'BÁN CHẠY NHẤT',
      swatches: [
        {
          type: 'plaid',
          bg: `repeating-linear-gradient(0deg, rgba(245, 225, 164, 0.6) 0px, rgba(245, 225, 164, 0.6) 1px, #222636 1px, #222636 4px), repeating-linear-gradient(90deg, rgba(245, 225, 164, 0.6) 0px, rgba(245, 225, 164, 0.6) 1px, transparent 1px, transparent 4px)`,
          color: '#222636',
          label: 'Caro Navy (Hành Thủy)',
        },
      ],
    },
    {
      id: 'evening-edit',
      slug: 'the-evening-edit',
      name: 'THE HEARTH SET',
      subtitle: 'Sọc Nâu · Năng Lượng Thổ',
      color: 'Sọc Nâu · Năng lượng Thổ vững chãi',
      desc: 'Sọc Nâu mocha ấm áp — cảm giác "về nhà" nuôi dưỡng năng lượng.\nDáng wide-leg buông rủ thượng hạng.\nSang trọng tuyệt đối cho những buổi tối chill.',
      image: '/images/classic-set-brown-main.jpg',
      badge: 'PHIÊN BẢN GIỚI HẠN',
      preOrderBadge: 'Pre-order',
      swatches: [
        {
          type: 'stripe',
          bg: `repeating-linear-gradient(90deg, #5C3A21 0px, #5C3A21 2px, #FFFFFF 2px, #FFFFFF 3px, #5C3A21 3px, #5C3A21 5px)`,
          label: 'Sọc Nâu (Hành Thổ)',
        },
      ],
    },
  ]

  return (
    <section
      id="mot-bo-la-mot-mood"
      aria-label="Featured Products"
      className="py-12 sm:py-14 md:py-18 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5] scroll-mt-16"
    >
      <div id="section-products" className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-1.5">
            BỘ SƯU TẬP MỚI NHẤT
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Mỗi bộ là một mood
            <span className="block text-[#631521] italic font-normal mt-0.5 text-2xl sm:text-3xl">
              Hôm nay bạn chọn mặc gì?
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-3 sm:mt-3.5" />
        </div>

        {/* Product grid - elegant and compact showcase */}
        <div className="max-w-[1040px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-white rounded-[4px] border border-[#E8DFD5] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer w-full max-w-[340px] mx-auto"
                onClick={() => navigate(`/san-pham/${product.slug}`)}
              >
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F0EB]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Badge Left */}
                  {product.badge && (
                    <div className="absolute top-2.5 left-2.5 bg-[#631521] text-white text-[9px] font-sans font-bold tracking-wider px-2 py-0.5 rounded-[2px] uppercase shadow-sm">
                      {product.badge}
                    </div>
                  )}
                  {/* Pre-order Badge Right */}
                  {product.preOrderBadge && (
                    <div className="absolute top-2.5 right-2.5 bg-[#D4AF37] text-[#1A1614] text-[9px] font-sans font-bold tracking-wider px-2 py-0.5 rounded-[2px] uppercase shadow-sm">
                      {product.preOrderBadge}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 sm:p-4.5 flex flex-col flex-grow justify-between bg-white">
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
                      {product.name}
                    </h3>
                    <span className="text-[11px] font-sans text-[#8C7E74] block mt-0.5">{product.color}</span>
                    <p className="font-sans text-xs sm:text-[0.825rem] text-[#4A3F38] italic mt-1.5 leading-relaxed whitespace-pre-line">
                      "{product.desc}"
                    </p>

                    {/* Swatches */}
                    {product.swatches && (
                      <div className="flex items-center gap-2 mt-2 pt-1">
                        {product.swatches.map((sw, sIdx) => (
                          <span
                            key={sIdx}
                            title={sw.label}
                            className="w-3.5 h-3.5 border border-[#E8DFD5] shadow-xs inline-block"
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

                  <div className="mt-3 pt-2.5 border-t border-[#F5F0EB]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/san-pham/${product.slug}`)
                      }}
                      className="w-full inline-flex items-center justify-center bg-[#2C201A] hover:bg-[#631521] text-white font-sans text-[11px] font-bold tracking-wider px-3.5 py-2 rounded-[2px] transition-colors uppercase cursor-pointer"
                    >
                      KHÁM PHÁ {product.name}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
