import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function StickyMobileAtc({
  product,
  selectedColor,
  selectedSize,
  onAddToCart,
  onOpenSizeGuide,
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down more than 480px
      if (window.scrollY > 480) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const displayImage = Array.isArray(product.images)
    ? product.images[0]
    : typeof product.images === 'object'
    ? (selectedColor?.name && product.images[selectedColor.name]?.[0]) || Object.values(product.images)[0]?.[0]
    : ''

  const isReady = !!selectedSize

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/98 backdrop-blur-md border-t border-[#E8DFD5] p-3 sm:p-4 shadow-2xl lg:hidden"
        >
          <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-3">
            {/* Left: Thumbnail & Price */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={displayImage}
                alt={product.name}
                className="w-12 h-14 object-cover rounded-[2px] border border-[#E8DFD5] shrink-0 bg-[#F5F0EB]"
              />
              <div className="min-w-0">
                <p className="font-serif font-bold text-xs sm:text-sm text-[#1A1614] truncate leading-tight">
                  {product.name}
                </p>
                <p className="font-sans text-[11px] text-[#8C7E74] truncate">
                  {selectedColor?.label || selectedColor?.name || ''} {selectedSize ? `· Size ${selectedSize}` : ''}
                </p>
                <p className="font-serif text-sm font-bold text-[#631521] leading-none mt-0.5">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>

            {/* Right: CTA Button */}
            <div className="flex items-center gap-2 shrink-0">
              {!selectedSize && (
                <button
                  type="button"
                  onClick={onOpenSizeGuide}
                  className="font-sans text-[11px] font-semibold text-[#631521] underline px-2 py-1"
                >
                  Chọn size
                </button>
              )}
              <button
                type="button"
                onClick={onAddToCart}
                className={`flex items-center justify-center gap-1.5 font-sans font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-[2px] transition-all cursor-pointer ${
                  isReady
                    ? 'bg-[#631521] text-white hover:bg-[#4A0D17] shadow-md active:scale-95'
                    : 'bg-[#631521]/80 text-white shadow-sm'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{selectedSize ? 'Thêm Vào Giỏ' : 'Chọn Size & Mua'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
