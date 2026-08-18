import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import QuickViewModal from './QuickViewModal'

export default function RelatedProducts({ products = [], onAddToCart }) {
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [startIdx, setStartIdx] = useState(0)
  const visible = 4

  const canPrev = startIdx > 0
  const canNext = startIdx + visible < products.length

  return (
    <>
      <section className="py-16 md:py-24 bg-[#F5F0EB] border-t border-[#E8DFD5]" aria-label="Sản phẩm liên quan">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
                CÓ THỂ BẠN THÍCH
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
                Hoàn thiện bộ sưu tập của bạn
              </h2>
            </div>
            {products.length > visible && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStartIdx((i) => Math.max(0, i - 1))}
                  disabled={!canPrev}
                  aria-label="Sản phẩm trước"
                  className="w-10 h-10 border border-[#E8DFD5] bg-white rounded-[2px] flex items-center justify-center text-[#4A3F38] hover:border-[#631521] hover:text-[#631521] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStartIdx((i) => Math.min(products.length - visible, i + 1))}
                  disabled={!canNext}
                  aria-label="Sản phẩm tiếp theo"
                  className="w-10 h-10 border border-[#E8DFD5] bg-white rounded-[2px] flex items-center justify-center text-[#4A3F38] hover:border-[#631521] hover:text-[#631521] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.slice(startIdx, startIdx + visible).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <ProductCard
                  product={product}
                  onQuickView={setQuickViewProduct}
                  onAddToCart={(p) => {
                    const img = Array.isArray(p.images)
                      ? p.images[0]
                      : (p.images?.[p.colors?.[0]?.name]?.[0] || Object.values(p.images || {})[0]?.[0])
                    onAddToCart?.({
                      productName: p.name,
                      variant: `${p.colors?.[0]?.label || p.colors?.[0]?.name || ''} | Size ${p.sizes?.[0] || 'S'}`,
                      price: p.price,
                      image: img,
                    })
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick View */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </>
  )
}
