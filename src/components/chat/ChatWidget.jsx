import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatPanel from './ChatPanel'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)

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
  }

  return (
    <>
      {/* Khung chat modal — bung toàn màn hình chuẩn trên mobile, thẻ nổi trên desktop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel-wrapper"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-5 z-[140] pointer-events-none"
          >
            <div className="pointer-events-auto w-full h-full">
              <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button: bottom-20 trên mobile để không che nút Thêm vào giỏ hàng dính đáy (Sticky ATC) */}
      {!isOpen && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-5 z-40 flex flex-col items-end">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleToggle}
            aria-label="Mở trợ lý ảo tư vấn"
            className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] bg-[#631521] shadow-luxury hover:shadow-2xl transition-all cursor-pointer group overflow-hidden flex items-center justify-center"
          >
            <img
              src="/images/logo.jpg"
              alt="QuanNguyenS Logo"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </motion.button>
        </div>
      )}
    </>
  )
}
