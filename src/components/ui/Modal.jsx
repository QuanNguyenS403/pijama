import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = '640px' }) {
  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKey])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ maxWidth }}
            className="fixed inset-0 z-[101] m-auto h-fit max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto bg-[#FAF8F5] border border-[#E8DFD5] shadow-2xl pdp-scrollbar rounded-[4px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8DFD5] bg-[#FAF8F5] px-6 py-4">
              <h2 className="font-serif text-xl font-bold text-[#631521] uppercase tracking-wider">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="text-[#8C7E74] hover:text-[#631521] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Content */}
            <div className="px-6 py-6 text-[#1A1614]">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
