import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ProductImageGallery({
  images = [],
  selectedColor = null,
  badge,
  preOrder,
  productName,
}) {
  // Resolve image list based on whether images is an object keyed by color name or an array (tối đa 4 ảnh, loại bỏ thumbnail 5)
  const currentImages = useMemo(() => {
    let list = []
    if (!images) return []
    if (Array.isArray(images)) list = images
    else if (typeof images === 'object') {
      if (selectedColor?.name && images[selectedColor.name]) {
        list = images[selectedColor.name]
      } else {
        const firstKey = Object.keys(images)[0]
        list = firstKey ? images[firstKey] : []
      }
    }
    return list.slice(0, 4)
  }, [images, selectedColor?.name])

  const [activeIndex, setActiveIndex] = useState(0)
  const thumbnailRefs = useRef([])

  // Reset activeIndex whenever the color variant changes
  useEffect(() => {
    setActiveIndex(0)
  }, [selectedColor?.name])

  // Smooth scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailRefs.current[activeIndex]) {
      thumbnailRefs.current[activeIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }, [activeIndex])

  const currentMainImage = currentImages[activeIndex] || currentImages[0]

  return (
    <div className="flex flex-row gap-2.5 sm:gap-3.5 md:gap-4 items-start w-full">
      {/* Left: Vertical thumbnail strip */}
      {currentImages.length > 1 && (
        <div
          className="shrink-0 flex flex-col gap-2 sm:gap-2.5 w-14 sm:w-18 lg:w-20 xl:w-22 overflow-y-auto no-scrollbar max-h-[520px] sm:max-h-[600px] xl:max-h-[640px]"
          role="tablist"
          aria-label="Danh sách ảnh thu nhỏ"
        >
          {currentImages.map((img, i) => (
            <motion.button
              key={`${selectedColor?.name || 'default'}-${i}`}
              ref={(el) => (thumbnailRefs.current[i] = el)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              onClick={() => setActiveIndex(i)}
              aria-label={`Chọn ảnh ${i + 1}`}
              aria-selected={i === activeIndex}
              role="tab"
              className={`shrink-0 w-full aspect-[4/5] overflow-hidden transition-all duration-200 rounded-[2px] cursor-pointer bg-[#F5F0EB] ${
                i === activeIndex
                  ? 'border-2 border-[#1A1614] shadow-md opacity-100 ring-2 ring-[#631521]/25 scale-[1.02]'
                  : 'border border-[#E8DFD5] opacity-70 hover:opacity-100 hover:border-[#8C7E74]'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Right: Main hero image */}
      <div className="flex-1 min-w-0">
        <div className="relative overflow-hidden bg-[#F5F0EB] border border-[#E8DFD5] group rounded-[4px] w-full flex items-center justify-center aspect-[4/5] max-h-[520px] sm:max-h-[600px] xl:max-h-[640px]">
          {/* Quick Prev / Next navigation buttons on desktop & mobile */}
          {currentImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveIndex((i) => (i - 1 + currentImages.length) % currentImages.length)
                }}
                aria-label="Ảnh trước"
                className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-[#1A1614] hover:bg-[#631521] hover:text-white flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border border-[#E8DFD5]/80"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveIndex((i) => (i + 1) % currentImages.length)
                }}
                aria-label="Ảnh tiếp theo"
                className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-[#1A1614] hover:bg-[#631521] hover:text-white flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 border border-[#E8DFD5]/80"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            </>
          )}

          {/* Image index counter badge */}
          {currentImages.length > 1 && (
            <div className="absolute bottom-3 left-3 sm:bottom-3.5 sm:left-3.5 z-10 bg-[#1A1614]/75 backdrop-blur-xs text-[#FAF8F5] text-[10px] sm:text-[11px] font-sans font-medium px-2 py-0.5 rounded-[2px] tracking-wider pointer-events-none">
              {activeIndex + 1} / {currentImages.length}
            </div>
          )}

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
      </div>
    </div>
  )
}
