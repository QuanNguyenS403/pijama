import { motion } from 'framer-motion'

export default function FreeShippingBar({ progress, remaining }) {
  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n)
  const isFree = remaining === 0

  return (
    <div className="px-5 py-3.5 bg-[#F5F0EB] border-b border-[#E8DFD5]">
      <p className="font-sans text-xs text-[#1A1614] mb-2 font-medium">
        {isFree ? (
          <span className="text-[#631521] font-bold">🎉 Chúc mừng! Bạn được MIỄN PHÍ giao hàng</span>
        ) : (
          <>
            Còn <span className="font-bold text-[#631521]">{fmt(remaining)}đ</span> nữa để được giao hàng miễn phí
          </>
        )}
      </p>
      <div className="h-1.5 bg-[#E8DFD5] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full bg-[#D4AF37]"
        />
      </div>
    </div>
  )
}
