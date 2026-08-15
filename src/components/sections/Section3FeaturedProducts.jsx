import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Check } from 'lucide-react'
import productCollectionImg from '../../assets/images/product-collection.jpg'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function Section3FeaturedProducts({ onAddToCart }) {
  const [addedId, setAddedId] = useState(null)

  const featuredProducts = [
    {
      id: 'prod-cushion',
      name: 'Gối Tựa Dệt Đũi Cao Cấp',
      subtitle: 'Luxury Woven Slub Cushion',
      price: '380.000₫',
      image: productCollectionImg,
      badge: 'SẢN PHẨM MỚI RA MẮT',
    },
    {
      id: 'prod-loungewear',
      name: 'Bộ Pijama Đũi Mặc Nhà Thư Thái',
      subtitle: 'Artisanal Natural Loungewear',
      price: '599.000₫',
      image: heroCampaignImg,
      badge: 'SẢN PHẨM MỚI RA MẮT',
    },
    {
      id: 'prod-blanket',
      name: 'Chăn Dệt Đũi Tự Nhiên Mộc',
      subtitle: 'Breathable Slub Woven Blanket',
      price: '790.000₫',
      image: lifestyleNightImg,
      badge: 'SẢN PHẨM MỚI RA MẮT',
    },
  ]

  const handleAdd = (prod) => {
    setAddedId(prod.id)
    if (onAddToCart) onAddToCart(prod)
    setTimeout(() => setAddedId(null), 2000)
  }

  return (
    <section
      id="section-products"
      aria-label="Featured Products"
      className="py-20 sm:py-24 md:py-28 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Tiêu đề: Tiêu đề serif: "SẢN PHẨM NỔI BẬT" */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            Haute Home & Lounge
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            SẢN PHẨM NỔI BẬT
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Lưới sản phẩm: Một lưới 3x2 (3 cột) gồm 3 sản phẩm */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-14">
          {featuredProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="bg-white rounded-[4px] border border-[#E8DFD5] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Hình ảnh chất lượng cao */}
              <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F0EB]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Nhãn nhỏ: "SẢN PHẨM MỚI RA MẮT" */}
                <div className="absolute top-3 left-3 bg-[#631521] text-white text-[10px] font-sans font-bold tracking-wider px-2.5 py-1 rounded-[2px] uppercase shadow-sm">
                  {product.badge}
                </div>
              </div>

              {/* Thông tin sản phẩm */}
              <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between bg-white">
                <div>
                  <span className="text-[11px] text-[#8C7E74] font-sans uppercase tracking-widest block mb-1">
                    {product.subtitle}
                  </span>
                  {/* Tên sản phẩm inter */}
                  <h3 className="font-sans text-base sm:text-lg font-semibold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F5F0EB] flex items-center justify-between">
                  {/* Giá cả */}
                  <span className="font-sans text-lg font-bold text-[#631521]">
                    {product.price}
                  </span>

                  {/* Nút "Thêm vào giỏ hàng" nhỏ */}
                  <button
                    onClick={() => handleAdd(product)}
                    className="inline-flex items-center gap-1.5 bg-[#2C201A] hover:bg-[#631521] text-white font-sans text-xs font-semibold px-3.5 py-2 rounded-[2px] transition-colors"
                  >
                    {addedId === product.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Đã thêm</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Thêm vào giỏ hàng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nút CTA dưới lưới: Nút "Xem tất cả sản phẩm" */}
        <div className="text-center">
          <a
            href="#section-table"
            className="inline-flex items-center justify-center bg-[#631521] hover:bg-[#4A0D17] text-white font-sans text-sm font-bold tracking-wider px-8 py-3.5 rounded-[2px] transition-all duration-300 shadow-md uppercase"
          >
            Xem tất cả sản phẩm
          </a>
        </div>
      </div>
    </section>
  )
}
