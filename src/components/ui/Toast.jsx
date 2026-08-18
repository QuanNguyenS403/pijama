import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag } from 'lucide-react'

export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ x: 120, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 120, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-[76px] right-4 z-[200] bg-[#2C201A] text-[#FAF8F5] border border-[#D4AF37]/50 shadow-2xl flex items-center gap-3.5 p-4 max-w-sm rounded-[3px]"
          role="alert"
          aria-live="polite"
        >
          {/* Product image or icon */}
          {toast.image ? (
            <img
              src={toast.image}
              alt={toast.productName}
              className="w-12 h-12 object-cover shrink-0 rounded-[2px] border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#631521] flex items-center justify-center text-[#D4AF37] shrink-0 border border-[#D4AF37]/40">
              <ShoppingBag className="w-5 h-5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-bold leading-snug text-[#FAF8F5] truncate">
              {toast.productName} đã thêm vào giỏ!
            </p>
            <p className="font-sans text-[0.75rem] font-light text-[#D4AF37] mt-0.5">
              {toast.variant} —{' '}
              {new Intl.NumberFormat('vi-VN').format(toast.price)}đ
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={onDismiss}
              aria-label="Đóng thông báo"
              className="text-white/60 hover:text-[#D4AF37] transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
