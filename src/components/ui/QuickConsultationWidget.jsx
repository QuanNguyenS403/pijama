import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageCircle, X, Sparkles } from 'lucide-react'

export default function QuickConsultationWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-72 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] shadow-2xl p-4 text-[#1A1614] overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5] mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-serif text-sm font-bold text-[#631521] uppercase tracking-wider">
                  Tư Vấn Phong Cách 24/7
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8C7E74] hover:text-[#631521] p-0.5 cursor-pointer"
                aria-label="Đóng bảng tư vấn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-sans text-xs text-[#4A3F38] font-light leading-relaxed mb-3.5">
              Bạn phân vân về size hoặc chất liệu? Đội ngũ chuyên viên QuanNguyenS sẵn sàng hỗ trợ bạn ngay tức thì.
            </p>

            <div className="space-y-2">
              <a
                href="https://zalo.me/0981753082"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#0068FF] text-white font-sans text-xs font-bold py-2.5 px-3 rounded-[2px] hover:bg-[#0052cc] transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                Chat Zalo Tư Vấn Size
              </a>

              <a
                href="tel:0981753082"
                className="flex items-center justify-center gap-2 w-full bg-[#631521] text-[#FAF8F5] font-sans text-xs font-bold py-2.5 px-3 rounded-[2px] hover:bg-[#4A0D17] transition-colors shadow-xs"
              >
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                Gọi Hotline: 0981 753 082
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Mở bảng hỗ trợ tư vấn nhanh"
        className="flex items-center gap-2 bg-[#631521] text-[#FAF8F5] px-4 py-3 rounded-full border border-[#D4AF37]/50 shadow-luxury hover:bg-[#4A0D17] transition-all cursor-pointer group"
      >
        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <Phone className="w-4 h-4 text-[#D4AF37]" />
        <span className="font-sans text-xs font-bold tracking-wide uppercase hidden sm:inline">
          Tư Vấn Nhanh
        </span>
      </motion.button>
    </div>
  )
}
