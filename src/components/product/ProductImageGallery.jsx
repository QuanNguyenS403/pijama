import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

export default function ProductImageGallery({
  images = [],
  selectedColor = null,
  badge,
  preOrder,
  productName,
}) {
  // Resolve image list based on whether images is an object keyed by color name or an array
  const currentImages = useMemo(() => {
    if (!images) return []
    if (Array.isArray(images)) return images
    if (typeof images === 'object') {
      if (selectedColor?.name && images[selectedColor.name]) {
        return images[selectedColor.name]
      }
      const firstKey = Object.keys(images)[0]
      return firstKey ? images[firstKey] : []
    }
    return []
  }, [images, selectedColor?.name])

  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Reset activeIndex whenever the color variant changes
  useEffect(() => {
    setActiveIndex(0)
  }, [selectedColor?.name])

  const openLightbox = (i) => {
    setLightboxIndex(i)
    setLightboxOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    document.body.style.overflow = ''
  }, [])

  const lbPrev = () =>
    setLightboxIndex((i) => (i - 1 + currentImages.length) % currentImages.length)
  const lbNext = () =>
    setLightboxIndex((i) => (i + 1) % currentImages.length)

  const handleKeyLb = (e) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') lbPrev()
    if (e.key === 'ArrowRight') lbNext()
  }

  const currentMainImage = currentImages[activeIndex] || currentImages[0]

  return (
    <>
      <div className="flex flex-col gap-3.5">
        {/* Main hero image */}
        <div
          className="relative overflow-hidden bg-[#F5F0EB] border border-[#E8DFD5] cursor-zoom-in group rounded-[4px] w-full flex items-center justify-center aspect-[3/4] max-h-[700px]"
          onClick={() => openLightbox(activeIndex)}
          role="button"
          tabIndex={0}
          aria-label={`Mở ảnh lớn ${productName}`}
          onKeyDown={(e) => e.key === 'Enter' && openLightbox(activeIndex)}
        >
          {badge && (
            <div className="absolute top-4 left-4 z-10 bg-[#631521]/95 text-[#D4AF37] border border-[#D4AF37]/50 text-[0.7rem] font-sans font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-[2px] shadow-md backdrop-blur-sm">
              {badge}
            </div>
          )}

          {preOrder?.enabled && (
            <div className="absolute top-4 right-4 z-10 bg-[#D4AF37] text-[#1A1614] text-[0.7rem] font-sans font-bold uppercase tracking-[0.16em] px-3 py-1 rounded-[2px] shadow-md">
              Pre-order
            </div>
          )}

          {/* Quick Prev / Next navigation buttons on desktop */}
          {currentImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveIndex((i) => (i - 1 + currentImages.length) % currentImages.length)
                }}
                aria-label="Ảnh trước"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-[#1A1614] hover:bg-[#631521] hover:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-xs"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveIndex((i) => (i + 1) % currentImages.length)
                }}
                aria-label="Ảnh tiếp theo"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 text-[#1A1614] hover:bg-[#631521] hover:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-xs"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Image index counter badge */}
          {currentImages.length > 1 && (
            <div className="absolute bottom-3.5 left-3.5 z-10 bg-[#1A1614]/75 backdrop-blur-xs text-[#FAF8F5] text-[11px] font-sans font-medium px-2 py-0.5 rounded-[2px] tracking-wider pointer-events-none">
              {activeIndex + 1} / {currentImages.length}
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-10 text-[#2C201A] bg-white/80 backdrop-blur-sm p-1.5 rounded-[2px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            <ZoomIn className="w-4 h-4" />
          </div>

          <AnimatePresence mode="wait">
            <motion.img
              key={`${selectedColor?.name || 'default'}-${activeIndex}-${currentMainImage}`}
              src={currentMainImage}
              alt={`${productName} — ${selectedColor?.name || ''} ảnh ${activeIndex + 1}`}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            />
          </AnimatePresence>
        </div>

        {/* Thumbnail strip */}
        {currentImages.length > 1 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedColor?.name || 'thumbnails-default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2.5 overflow-x-auto pb-1 shrink-0 pt-0.5"
            >
              {currentImages.map((img, i) => (
                <motion.button
                  key={`${selectedColor?.name}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Chọn ảnh ${i + 1}`}
                  className={`shrink-0 w-16 sm:w-20 lg:w-[72px] xl:w-20 aspect-[3/4] overflow-hidden transition-all duration-150 rounded-[3px] cursor-pointer ${
                    i === activeIndex
                      ? 'border-2 border-[#631521] shadow-md opacity-100 ring-2 ring-[#D4AF37]/40 scale-[1.02]'
                      : 'border border-[#E8DFD5] opacity-70 hover:opacity-100 hover:border-[#631521]'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${productName} thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
            onKeyDown={handleKeyLb}
            tabIndex={-1}
            ref={(el) => el && el.focus()}
            role="dialog"
            aria-modal="true"
            aria-label="Xem ảnh phóng to"
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white/80 hover:text-[#D4AF37] z-10 p-2"
              aria-label="Đóng"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Prev */}
            {currentImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  lbPrev()
                }}
                className="absolute left-4 text-white/80 hover:text-[#D4AF37] z-10 p-2"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={lightboxIndex}
              src={currentImages[lightboxIndex]}
              alt={`${productName} — ảnh ${lightboxIndex + 1}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded-[2px] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {currentImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  lbNext()
                }}
                className="absolute right-4 text-white/80 hover:text-[#D4AF37] z-10 p-2"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {currentImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(i)
                  }}
                  aria-label={`Ảnh ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === lightboxIndex ? 'bg-[#D4AF37]' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
