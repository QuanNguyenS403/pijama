import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Section3FeaturedProducts() {
  const navigate = useNavigate()

  const handleProductAction = (product) => {
    navigate(`/san-pham/${product.slug}`)
  }

  const products = [
    {
      id: 'classic-set',
      slug: 'the-classic-set',
      name: 'THE DAYBREAK SET',
      image: '/images/classic-set-red-main.jpg',
      price: 490000,
      originalPrice: null,
    },
    {
      id: 'cafe-look',
      slug: 'the-cafe-look',
      name: 'THE STILLWATER SET',
      image: '/images/classic-set-navy-main.jpg',
      price: 550000,
      originalPrice: null,
    },
    {
      id: 'evening-edit',
      slug: 'the-evening-edit',
      name: 'THE HEARTH SET',
      image: '/images/classic-set-brown-main.jpg',
      price: 750000,
      originalPrice: null,
    },
  ]

  return (
    <section
      id="mot-bo-la-mot-mood"
      aria-label="Featured Products"
      className="py-12 sm:py-14 md:py-16 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5] scroll-mt-16"
    >
      <div id="section-products" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <span className="font-sans text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            BỘ SƯU TẬP MỚI NHẤT
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Chuẩn Mực Thoải Mái, Trọn Nét Thanh Lịch
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-3" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 mb-4">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="bg-white rounded-[4px] border border-[#E8DFD5] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              onClick={() => handleProductAction(product)}
            >
              {/* Image */}
              <div className="relative aspect-[1/1.1] overflow-hidden bg-[#F5F0EB]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Info */}
              <div className="p-4 sm:p-5 flex flex-col bg-white">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
                  {product.name}
                </h3>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-serif text-lg sm:text-xl font-bold text-[#631521]">
                    {product.price ? product.price.toLocaleString('vi-VN') + 'đ' : ''}
                  </span>
                  {product.originalPrice && (
                    <span className="font-sans text-xs text-[#8C7E74] line-through">
                      {product.originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
