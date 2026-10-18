import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, MessageCircle, X } from 'lucide-react'
import ChatPanel from './ChatPanel'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [hasNewMessageBadge, setHasNewMessageBadge] = useState(true)

  // Kiểm tra cấu hình bật/tắt từ server
  useEffect(() => {
    fetch('/api/chat/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.enabled === false) {
          setIsEnabled(false)
        }
      })
      .catch(() => {
        // Mặc định bật nếu fetch thất bại trong dev
      })
  }, [])

  if (!isEnabled) return null

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
    setHasNewMessageBadge(false)
  }

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end">
      {/* Khung chat modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggle}
          aria-label="Mở trợ lý ảo tư vấn 24/7"
          className="flex items-center gap-2.5 bg-[#631521] text-[#FAF8F5] px-4 py-3 rounded-full border border-[#D4AF37]/60 shadow-luxury hover:bg-[#4A0D17] transition-all cursor-pointer group"
        >
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            {hasNewMessageBadge && (
              <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4AF37]" />
              </span>
            )}
          </div>
          <div className="w-5 h-5 rounded-full overflow-hidden border border-[#D4AF37] shrink-0 shadow-xs">
            <img
              src="/images/logo.jpg"
              alt="QuanNguyenS Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-sans text-xs font-bold tracking-wide uppercase hidden sm:inline text-white">
            Trợ Lý Ảo 24/7
          </span>
        </motion.button>
      )}
    </div>
  )
}
