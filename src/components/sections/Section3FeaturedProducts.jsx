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
      subtitle: 'Sọc Hồng · Năng Lượng Hỏa',
      color: 'Sọc Hồng · Năng lượng Hỏa ấm áp · 390.000đ',
      desc: 'Sọc hồng rạng rỡ như nắng sớm mai.\nChất liệu tự nhiên thoáng khí, viền trắng tinh tế.\nKhởi đầu ngày mới tràn đầy sinh khí.',
      image: '/images/classic-set-pink-main.jpg',
      badge: 'MỚI RA MẮT',
      swatches: [
        {
          type: 'stripe',
          bg: `repeating-linear-gradient(0deg, #F2C4CE 0px, #F2C4CE 2px, #FFFFFF 2px, #FFFFFF 4px)`,
          label: 'Sọc Hồng (Hành Hỏa)',
        },
      ],
    },
    {
      id: 'cafe-look',
      slug: 'the-cafe-look',
      mood: 'THE CAFÉ LOOK',
      name: 'THE CAFÉ LOOK',
      subtitle: 'Caro Navy · Năng Lượng Thủy',
      color: 'Caro Navy · Năng lượng Thủy tĩnh tại · 550.000đ',
      desc: 'Họa tiết Caro Navy trầm lắng, an yên như mặt nước lặng.\nCổ V thanh lịch cùng viền phối sắc nét.\nMặc thẳng từ nhà đến quán café sáng.',
      image: '/images/classic-set-navy-main.jpg',
      badge: 'BÁN CHẠY NHẤT',
      swatches: [
        {
          type: 'plaid',
          bg: `repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, #1B2A4A 1px, #1B2A4A 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 4px)`,
          color: '#1B2A4A',
          label: 'Caro Navy (Hành Thủy)',
        },
      ],
    },
    {
      id: 'evening-edit',
      slug: 'the-evening-edit',
      mood: 'THE EVENING EDIT',
      name: 'THE EVENING EDIT',
      subtitle: 'Sọc Nâu · Năng Lượng Thổ',
      color: 'Sọc Nâu · Năng lượng Thổ vững chãi · 750.000đ',
      desc: 'Sọc Nâu mocha ấm áp — cảm giác "về nhà" nuôi dưỡng năng lượng.\nDáng wide-leg buông rủ thượng hạng.\nSang trọng tuyệt đối cho những buổi tối chill.',
      image: '/images/classic-set-brown-main.jpg',
      badge: 'PHIÊN BẢN GIỚI HẠN',
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
