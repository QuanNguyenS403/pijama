import { motion } from 'framer-motion'

/**
 * Hiệu ứng chuyển cảnh trang web QuanNguyenS mềm mại và thanh lịch (Luxury Silk Page Transition).
 * Giúp việc di chuyển giữa các trang (Trang chủ, Chi tiết sản phẩm, Giỏ hàng, Hội viên...)
 * diễn ra êm dịu, không bị chớp hay giật cục.
 */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1], // Đường cong giảm tốc lụa mềm
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  )
}
