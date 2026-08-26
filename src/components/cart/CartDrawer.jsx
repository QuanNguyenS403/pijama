import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import CartItemRow from './CartItemRow'
import CartSummary from './CartSummary'

export default function CartDrawer({ isOpen, onClose }) {
  const { items, totalItems, subtotal, freeShippingProgress, remainingForFreeShipping, shippingFee, removeItem, updateQuantity } = useCart()
  const navigate = useNavigate()

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ESC close
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-0 right-0 bottom-0 z-[91] w-full sm:w-[420px] bg-[#FAF8F5] border-l border-[#E8DFD5] shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Giỏ hàng của bạn"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E8DFD5] bg-[#FAF8F5] shrink-0">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#631521]">
                  Giỏ Hàng Của Bạn
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="font-sans text-xs font-light text-[#8C7E74]">
                    ({totalItems} sản phẩm)
                  </p>
                  {totalItems > 0 && (
                    <Link
                      to="/gio-hang"
                      onClick={onClose}
                      className="font-sans text-xs font-semibold text-[#631521] hover:underline"
                    >
                      Xem trang giỏ hàng →
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Đóng giỏ hàng"
                className="text-[#8C7E74] hover:text-[#631521] transition-colors p-1.5 rounded-full hover:bg-[#F5F0EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#8C7E74] mb-2 border border-[#E8DFD5]">
                  <ShoppingBag className="w-9 h-9" />
                </div>
                <div>
                  <p className="font-serif text-2xl font-bold text-[#1A1614]">Giỏ hàng đang trống</p>
                  <p className="font-sans text-sm font-light text-[#8C7E74] mt-1 max-w-xs">
                    Hãy khám phá những bộ pijama tự nhiên cao cấp phong cách châu Âu
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose()
                    setTimeout(() => {
                      if (window.location.pathname === '/') {
                        const el = document.getElementById('mot-bo-la-mot-mood') || document.getElementById('section-products')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      } else {
                        navigate('/#mot-bo-la-mot-mood')
                      }
                    }, 100)
                  }}
                  className="mt-3 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] px-8 py-3.5 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer"
                >
                  Khám Phá Bộ Sưu Tập
                </button>
              </div>
            ) : (
              <>
                {/* Scrollable items */}
                <div className="flex-1 overflow-y-auto pdp-scrollbar px-6 py-2">
                  {items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      compact
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>

                {/* Summary + actions */}
                <div className="shrink-0 border-t border-[#E8DFD5] bg-[#FAF8F5]">
                  <CartSummary
                    subtotal={subtotal}
                    shippingFee={shippingFee}
                    freeShippingProgress={freeShippingProgress}
                    remainingForFreeShipping={remainingForFreeShipping}
                    onCheckout={handleCheckout}
                    showVoucher
                  />

                  <div className="px-6 pb-6 pt-2 bg-[#FAF8F5]">
                    <button
                      onClick={onClose}
                      className="w-full border border-[#631521] text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3 rounded-[2px] hover:bg-[#631521] hover:text-[#FAF8F5] transition-colors"
                    >
                      Tiếp Tục Mua Sắm
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
