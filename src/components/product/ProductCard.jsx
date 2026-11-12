import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import WishlistButton from '../ui/WishlistButton'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export default function ProductCard({ product, onQuickView, onAddToCart, className = '' }) {
  const [hovered, setHovered] = useState(false)

  // Resolve thumbnail image
  const displayImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'object'
    ? (product.images?.[product.colors?.[0]?.name]?.[0] || Object.values(product.images || {})[0]?.[0])
    : ''

  return (
    <div
      className={`relative bg-white border border-[#E8DFD5] rounded-[4px] overflow-hidden group flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 w-full max-w-[340px] ${className || 'mx-auto'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F0EB]">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
        />

        {/* Top-Right: Wishlist Button */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center">
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
          className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-1.5 p-2.5 bg-white/95 backdrop-blur-sm border-t border-[#E8DFD5]"
        >
          <button
            type="button"
            onClick={() => onQuickView?.(product)}
            className="w-full font-sans text-[0.68rem] uppercase tracking-[0.12em] font-bold border border-[#631521] text-[#631521] py-2 hover:bg-[#631521] hover:text-[#FAF8F5] transition-colors rounded-[2px] cursor-pointer"
          >
            XEM NHANH
          </button>
          <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            className="w-full font-sans text-[0.68rem] uppercase tracking-[0.12em] font-bold bg-[#631521] text-white py-2 hover:bg-[#4A0D17] transition-colors flex items-center justify-center gap-1.5 rounded-[2px] cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> {product.preOrder?.enabled ? 'Đặt trước ngay' : 'Thêm vào giỏ'}
          </button>
        </motion.div>
      </div>

      {/* Card info */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-1 flex-grow justify-between">
        <div>
          <Link to={`/san-pham/${product.slug}`} className="hover:text-[#631521] transition-colors">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1614] leading-snug group-hover:text-[#631521] transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-serif text-base sm:text-lg font-bold text-[#631521]">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="font-sans text-[11px] text-[#8C7E74] line-through font-normal">{formatPrice(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
