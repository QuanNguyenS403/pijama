import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Eye, Star, Sparkles, Check, ArrowRight } from 'lucide-react'
import { products } from '../../data/products'

export default function ProductEditSection({ onOpenSizeGuide, onSelectProductForOrder }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [addedItemName, setAddedItemName] = useState(null)

  const filteredProducts = activeFilter === 'all'
    ? products
    : activeFilter === 'dai'
    ? products.filter(p => p.category === 'Bộ Dài Tay')
    : products.filter(p => p.category === 'Bộ Cộc Tay')

  const handleQuickAdd = (product, e) => {
    e.stopPropagation()
    setAddedItemName(product.name)
    onSelectProductForOrder?.(product)
    setTimeout(() => setAddedItemName(null), 3000)
  }

  return (
    <section
      id="san-pham-noi-bat"
      aria-label="Sản phẩm nổi bật QuanNguyenS"
      className="bg-[#FAF8F5] py-14 sm:py-18 md:py-24 border-b border-[#E8DFD5] relative"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4 pb-4 border-b border-[#E8DFD5]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
              <span className="text-[10.5px] font-bold tracking-[0.22em] text-[#64748B] uppercase">
                QUANNGUYENS COLLECTION 2026
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] tracking-tight">
              SẢN PHẨM NỔI BẬT
            </h2>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-[2px] transition-all tracking-wider uppercase ${
                activeFilter === 'all'
                  ? 'bg-[#0F172A] text-[#FAF8F5]'
                  : 'bg-[#FFFFFF] text-[#475569] border border-[#D9CDBF] hover:border-[#0F172A]'
              }`}
            >
              TẤT CẢ ({products.length})
            </button>
            <button
              onClick={() => setActiveFilter('dai')}
              className={`px-4 py-2 text-xs font-bold rounded-[2px] transition-all tracking-wider uppercase ${
                activeFilter === 'dai'
                  ? 'bg-[#0F172A] text-[#FAF8F5]'
                  : 'bg-[#FFFFFF] text-[#475569] border border-[#D9CDBF] hover:border-[#0F172A]'
              }`}
            >
              BỘ DÀI TAY
            </button>
            <button
              onClick={() => setActiveFilter('coc')}
              className={`px-4 py-2 text-xs font-bold rounded-[2px] transition-all tracking-wider uppercase ${
                activeFilter === 'coc'
                  ? 'bg-[#0F172A] text-[#FAF8F5]'
                  : 'bg-[#FFFFFF] text-[#475569] border border-[#D9CDBF] hover:border-[#0F172A]'
              }`}
            >
              BỘ CỘC MÁT LÀNH
            </button>
          </div>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group bg-[#FFFFFF] rounded-[3px] border border-[#E8DFD5] overflow-hidden shadow-sm hover:shadow-luxury hover:border-[#C5A059]/60 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Product Visual Container */}
              <div className="relative aspect-[4/3.8] bg-[#F5F0EB] overflow-hidden">
                <img
                  src={
                    product.image ||
                    (Array.isArray(product.images)
                      ? product.images[0]
                      : (product.images?.[product.colors?.[0]?.name]?.[0] || Object.values(product.images || {})[0]?.[0]))
                  }
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badge Overlay */}
                {product.badge && (
                  <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    <span className="bg-[#0F172A] text-[#FAF8F5] text-[9px] font-bold tracking-[0.16em] uppercase px-2.5 py-1 rounded-[2px]">
                      {product.badge}
                    </span>
                  </div>
                )}

                {/* Fabric Material Tag */}
                <div className="absolute bottom-3 left-3 bg-[#FAF8F5]/90 backdrop-blur-sm text-[#1A1614] text-[9px] font-semibold tracking-wider px-2.5 py-1 rounded-[2px] border border-[#E8DFD5]">
                  100% Sợi Tự Nhiên
                </div>

                {/* Quick View Button on Hover */}
                <div className="absolute inset-0 bg-[#0F172A]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                  <button
                    onClick={() => setQuickViewProduct(product)}
                    className="bg-[#FAF8F5] hover:bg-[#FFFFFF] text-[#0F172A] text-xs font-bold px-4 py-2 rounded-[2px] shadow-md flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Nhanh</span>
                  </button>
                </div>
              </div>

              {/* Product Details Section */}
              <div className="p-5 sm:p-6 flex flex-col flex-1 justify-between bg-[#FFFFFF]">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-[#64748B] uppercase">
                      {product.subtitle}
                    </span>
                    <div className="flex items-center gap-1 text-[#C5A059] text-[11px] font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{product.rating || '5.0'}</span>
                    </div>
                  </div>

                  <h3 className="font-serif text-xl sm:text-[22px] font-normal text-[#1A1614] mb-2 leading-snug group-hover:text-[#0F172A] transition-colors">
                    {product.name}
                  </h3>

                  <p className="text-xs text-[#475569] font-light line-clamp-2 leading-relaxed mb-4">
                    {product.description}
                  </p>
                </div>

                <div>
                  {/* Price & Action Row */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-2xl font-bold text-[#0F172A]">
                          {typeof product.price === 'number' ? new Intl.NumberFormat('vi-VN').format(product.price) + '₫' : product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-[#8C7E74] line-through">
                            {typeof product.originalPrice === 'number' ? new Intl.NumberFormat('vi-VN').format(product.originalPrice) + '₫' : product.originalPrice}
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] font-bold text-[#C5A059] bg-[#FAF8F5] px-1.5 py-0.5 rounded-[1px] border border-[#E8DFD5]">
                        -20% Ưu Đãi Mùa Hè
                      </span>
                    </div>

                    <a
                      href="#pricing-section"
                      onClick={(e) => handleQuickAdd(product, e)}
                      className="inline-flex items-center gap-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-[11px] font-bold px-4 py-2.5 rounded-[2px] transition-all shadow-sm hover:shadow uppercase tracking-wider"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>MUA</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global notification toast when item selected */}
        {addedItemName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-[#FAF8F5] p-4 rounded-[3px] shadow-2xl border border-[#C5A059] flex items-center gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-[#788779] flex items-center justify-center text-white shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold block text-[#FAF8F5]">Đã chọn: {addedItemName}</span>
              <span className="text-[#E8DFD5] text-[11px]">Chuyển đến bảng ưu đãi & đặt hàng bên dưới.</span>
            </div>
          </motion.div>
        )}

        {/* Quick View Modal */}
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FAF8F5] max-w-2xl w-full rounded-[4px] border border-[#E8DFD5] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <button
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 text-sm font-bold text-[#64748B] hover:text-[#0F172A] p-2"
              >
                ✕ ĐÓNG
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <img
                  src={quickViewProduct.image || quickViewProduct.images?.[0]}
                  alt={quickViewProduct.name}
                  className="w-full h-72 object-cover rounded-[3px] border border-[#E8DFD5]"
                />

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-[#C5A059] uppercase block mb-1">
                      {quickViewProduct.badge || 'PREMIUM'} • CHẤT LIỆU TỰ NHIÊN
                    </span>
                    <h3 className="font-serif text-2xl font-normal text-[#1A1614] mb-2">
                      {quickViewProduct.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-serif text-2xl font-bold text-[#0F172A]">
                        {typeof quickViewProduct.price === 'number' ? new Intl.NumberFormat('vi-VN').format(quickViewProduct.price) + '₫' : quickViewProduct.price}
                      </span>
                      {quickViewProduct.originalPrice && (
                        <span className="text-xs text-[#8C7E74] line-through">
                          {typeof quickViewProduct.originalPrice === 'number' ? new Intl.NumberFormat('vi-VN').format(quickViewProduct.originalPrice) + '₫' : quickViewProduct.originalPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] font-light leading-relaxed mb-4">
                      {quickViewProduct.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[#E8DFD5]">
                    <a
                      href="#pricing-section"
                      onClick={() => {
                        setQuickViewProduct(null)
                        setAddedItemName(quickViewProduct.name)
                      }}
                      className="w-full text-center block bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-xs font-bold py-3 rounded-[2px] tracking-wider uppercase"
                    >
                      ĐẶT MUA SẢN PHẨM NÀY
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
