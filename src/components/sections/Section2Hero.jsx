import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import heroSlide01 from '../../assets/images/hero-slide-01.jpg'
import heroSlide02 from '../../assets/images/hero-slide-02.jpg'
import heroSlide03 from '../../assets/images/hero-slide-03.jpg'
import heroSlide04 from '../../assets/images/hero-slide-04.jpg'

const slides = [
  {
    id: 1,
    src: heroSlide01,
    alt: 'The Hearth Set — Set pijama sọc nâu ấm áp phong cách European Luxury',
    eyebrow: 'THE HEARTH SET',
    headline: 'Ấm Áp Như\nBuổi Sáng Đầu Tiên',
    sub: 'Chất liệu sọc nâu, phom dáng suông phóng khoáng — từ giường ngủ đến hiên nhà.',
    align: 'left',
  },
  {
    id: 2,
    src: heroSlide02,
    alt: 'The Stillwater Set — Set pijama caro navy thanh lịch phong cách European Luxury',
    eyebrow: 'THE STILLWATER SET',
    headline: 'Tĩnh Lặng,\nSâu Lắng',
    sub: 'Caro navy tinh tế với viền trắng tương phản — vẻ đẹp điềm tĩnh mà không kém phần tinh tế.',
    align: 'right',
  },
  {
    id: 3,
    src: heroSlide03,
    alt: 'The Daybreak Set — Set pijama sọc hồng nhẹ nhàng phong cách European Luxury',
    eyebrow: 'THE DAYBREAK SET — PRE-ORDER',
    headline: 'Bình Minh\nNhẹ Nhàng',
    sub: 'Sọc hồng nhẹ nhàng, dáng rộng thoải mái — phong cách buổi sáng bạn mong chờ.',
    align: 'left',
  },
  {
    id: 4,
    src: heroSlide04,
    alt: 'Bộ sưu tập pijama QuanNguyenS — Ba thiết kế trong một khung hình',
    eyebrow: 'BỘ SƯU TẬP 2026',
    headline: 'Dressed for Life.\nEven at Home.',
    sub: 'Ba thiết kế. Một phong cách. Chất liệu tự nhiên chuẩn xuất khẩu châu Âu.',
    align: 'left',
  },
]

const INTERVAL_MS = 5500

export default function Section2Hero() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(next, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [next, paused])

  const scrollTo = (id) => {
    const elem = document.querySelector(id)
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  const currentSlide = slides[current]
  const isRightAligned = currentSlide.align === 'right'

  return (
    <section
      id="section-hero"
      aria-label="Hero Slideshow"
      className="relative w-full overflow-hidden bg-[#1A1614] pt-[64px] sm:pt-[70px] md:pt-[76px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Hero Frame: exact 16:9 aspect ratio matching the 16:9 images without cropping */}
      <div className="relative w-full aspect-[16/9] min-h-[460px] sm:min-h-[520px] md:min-h-0 overflow-hidden bg-[#151210]">
        
        {/* Slide Images */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <img
              src={currentSlide.src}
              alt={currentSlide.alt}
              className="w-full h-full object-cover sm:object-cover object-center"
              loading="eager"
            />

            {/* Directional gradient overlay matching negative space alignment */}
            <div
              className={`absolute inset-0 transition-opacity duration-700 ${
                isRightAligned
                  ? 'bg-gradient-to-l from-[#0F0A08]/85 via-[#0F0A08]/40 sm:via-[#0F0A08]/20 to-transparent'
                  : 'bg-gradient-to-r from-[#0F0A08]/85 via-[#0F0A08]/40 sm:via-[#0F0A08]/20 to-transparent'
              }`}
            />
          </motion.div>
        </AnimatePresence>

        {/* Text Overlay — Smartly aligned per slide to sit in clean negative space */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${currentSlide.id}`}
            initial={{ opacity: 0, x: isRightAligned ? 25 : -25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRightAligned ? -20 : 20 }}
            transition={{ duration: 0.65, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute inset-y-0 flex flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-[540px] lg:max-w-[46%] z-10 ${
              isRightAligned ? 'right-0 items-start text-left' : 'left-0 items-start text-left'
            }`}
          >
            {/* Eyebrow badge */}
            <span className="inline-block font-sans text-[10px] sm:text-xs font-bold tracking-[0.25em] text-[#D4AF37] uppercase mb-2.5 sm:mb-4 drop-shadow-sm">
              {currentSlide.eyebrow}
            </span>

            {/* Main Headline */}
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-[46px] xl:text-5xl font-bold text-white leading-[1.12] mb-3 sm:mb-4 tracking-tight whitespace-pre-line drop-shadow-md">
              {currentSlide.headline}
            </h1>

            {/* Sub-headline */}
            <p className="font-sans text-xs sm:text-sm lg:text-base text-white/80 font-light leading-relaxed mb-5 sm:mb-7 max-w-sm sm:max-w-md drop-shadow-sm">
              {currentSlide.sub}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollTo('#section-products')}
                className="inline-flex items-center justify-center gap-2 bg-[#FAF8F5] hover:bg-[#D4AF37] text-[#1A1614] font-sans text-[11px] sm:text-xs font-bold tracking-[0.18em] px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-[2px] transition-all duration-200 uppercase cursor-pointer active:scale-[0.98] focus:outline-none shadow-luxury"
                aria-label="Khám phá bộ sưu tập"
              >
                → KHÁM PHÁ
              </button>
              <button
                type="button"
                onClick={() => scrollTo('#section-deep-feature')}
                className="inline-flex items-center justify-center bg-black/25 hover:bg-[#D4AF37]/20 backdrop-blur-xs border border-[#D4AF37]/80 text-[#D4AF37] font-sans text-[11px] sm:text-xs font-semibold tracking-[0.18em] px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-[2px] transition-all duration-200 cursor-pointer uppercase"
                aria-label="Xem chi tiết"
              >
                XEM CHI TIẾT
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Slide Counter & Dots */}
        <div className="absolute bottom-4 sm:bottom-6 left-6 sm:left-10 lg:left-16 flex items-center gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full focus:outline-none cursor-pointer ${
                i === current
                  ? 'bg-[#D4AF37] w-6 sm:w-7 h-1.5 shadow-gold-glow'
                  : 'bg-white/40 hover:bg-white/75 w-1.5 h-1.5'
              }`}
            />
          ))}
          <span className="ml-2 font-sans text-[10px] sm:text-[11px] font-medium text-white/60 tracking-widest select-none">
            {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </span>
        </div>

        {/* Navigation Arrows */}
        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-sm transition-all duration-200 focus:outline-none cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-sm transition-all duration-200 focus:outline-none cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Bottom Gold Progress Bar */}
        {!paused && (
          <motion.div
            key={`progress-${current}-${paused}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: INTERVAL_MS / 1000, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37] z-20"
          />
        )}
      </div>
    </section>
  )
}
