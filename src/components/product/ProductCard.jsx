import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import WishlistButton from '../ui/WishlistButton'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function ProductCard({ product, onQuickView, onAddToCart }) {
  const [hovered, setHovered] = useState(false)

  // Resolve thumbnail image
  const displayImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'object'
    ? (product.images?.[product.colors?.[0]?.name]?.[0] || Object.values(product.images || {})[0]?.[0])
    : ''

  return (
    <div
      className="relative bg-white border border-[#E8DFD5] rounded-[4px] overflow-hidden group flex flex-col shadow-sm hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative overflow-hidden bg-[#F5F0EB]" style={{ aspectRatio: '3/4' }}>
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3 z-10 bg-[#631521]/95 backdrop-blur-sm text-[#D4AF37] border border-[#D4AF37]/40 text-[0.65rem] font-sans font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-[2px] shadow-sm">
            {product.badge}
          </div>
        )}

        {/* Wishlist Button (Small variant, top-right) */}
        <div className="absolute top-3 right-3 z-10">
          <WishlistButton
            productId={product.id}
            colorName={product.colors?.[0]?.name || 'default'}
            size="small"
          />
        </div>

        {/* Quick view overlay */}
        <motion.div
          initial={false}
          animate={{ y: hovered ? 0 : '100%', opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-2 p-3 bg-white/95 backdrop-blur-sm border-t border-[#E8DFD5]"
        >
          <button
            type="button"
            onClick={() => onQuickView?.(product)}
            className="w-full font-sans text-[0.7rem] uppercase tracking-[0.12em] font-bold border border-[#631521] text-[#631521] py-2.5 hover:bg-[#631521] hover:text-[#FAF8F5] transition-colors rounded-[2px] cursor-pointer"
          >
            XEM NHANH
          </button>
          <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            className="w-full font-sans text-[0.7rem] uppercase tracking-[0.12em] font-bold bg-[#631521] text-white py-2.5 hover:bg-[#4A0D17] transition-colors flex items-center justify-center gap-2 rounded-[2px] cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Thêm vào giỏ
          </button>
        </motion.div>
      </div>

      {/* Card info */}
      <div className="p-4 flex flex-col gap-1 flex-grow justify-between">
        <div>
          <Link to={`/san-pham/${product.slug}`} className="hover:text-[#631521] transition-colors">
            <h3 className="font-serif text-[1.2rem] font-bold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="font-sans text-[0.8rem] font-light text-[#8C7E74]">{product.subtitle}</p>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-serif text-[1.15rem] font-bold text-[#631521]">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="font-sans text-xs text-[#8C7E74] line-through font-light">{formatPrice(product.originalPrice)}</span>
            )}
          </div>
        </div>

        {/* Color / Pattern swatches */}
        {product.colors && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#F5F0EB]">
            {product.colors.map((c) => {
              if (c.patternPreview && c.patternType === 'stripe') {
                return (
                  <span
                    key={c.name}
                    aria-label={c.label || c.name}
                    title={c.label || c.name}
                    className="w-4 h-4 border border-[#E8DFD5] shadow-xs"
                    style={{
                      borderRadius: '0px',
                      background: `repeating-linear-gradient(
                        0deg,
                        #F2C4CE 0px, #F2C4CE 2px,
                        #FFFFFF 2px, #FFFFFF 4px
                      )`,
                    }}
                  />
                )
              }
              if (c.patternPreview && c.patternType === 'plaid') {
                return (
                  <span
                    key={c.name}
                    aria-label={c.label || c.name}
                    title={c.label || c.name}
                    className="w-4 h-4 border border-[#E8DFD5] shadow-xs"
                    style={{
                      borderRadius: '0px',
                      background: `repeating-linear-gradient(
                        0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px,
                        #1B2A4A 1px, #1B2A4A 4px
                      ),
                      repeating-linear-gradient(
                        90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px,
                        transparent 1px, transparent 4px
                      )`,
                      backgroundColor: '#1B2A4A',
                    }}
                  />
                )
              }
              if (c.patternPreview && (c.patternType === 'brown-stripe' || c.patternType === 'mocha-stripe')) {
                return (
                  <span
                    key={c.name}
                    aria-label={c.label || c.name}
                    title={c.label || c.name}
                    className="w-4 h-4 border border-[#E8DFD5] shadow-xs"
                    style={{
                      borderRadius: '0px',
                      background: `repeating-linear-gradient(
                        90deg,
                        #5C3A21 0px, #5C3A21 2px,
                        #FFFFFF 2px, #FFFFFF 3px,
                        #5C3A21 3px, #5C3A21 5px
                      )`,
                      backgroundColor: '#5C3A21',
                    }}
                  />
                )
              }
              return (
                <span
                  key={c.name}
                  aria-label={c.label || c.name}
                  title={c.label || c.name}
                  className="w-3.5 h-3.5 rounded-full border border-[#E8DFD5] shadow-xs"
                  style={{ backgroundColor: c.hex }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
