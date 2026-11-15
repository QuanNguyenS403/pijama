import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { smoothScrollTo } from '../../lib/smoothScroll'

/**
 * Nút cuộn nhanh về đầu trang siêu êm ái (Luxury Smooth Back To Top).
 * Tự động xuất hiện khi người dùng cuộn xuống dưới, lướt từ cuối trang lên đầu trang nhẹ nhàng.
 */
export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Hiển thị khi người dùng đã cuộn xuống hơn 320px
      const currentY = window.scrollY || document.documentElement.scrollTop
      setIsVisible(currentY > 320)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollToTop = () => {
    smoothScrollTo(0, { duration: 1.3 })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-34 lg:bottom-22 right-4 sm:right-5 z-40"
        >
          <motion.button
            whileHover={{ scale: 1.1, boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)' }}
            whileTap={{ scale: 0.92 }}
            onClick={handleScrollToTop}
            aria-label="Cuộn về đầu trang mượt mà"
            title="Về đầu trang"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#631521]/90 hover:bg-[#7A1D2B] backdrop-blur-md border border-[#D4AF37]/80 text-[#D4AF37] flex items-center justify-center shadow-lg transition-colors cursor-pointer group"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
