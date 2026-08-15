import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

export default function Section1Header({ onOpenCta }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Trang chủ', href: '#section-hero' },
    { label: 'Sản phẩm', href: '#section-products' },
    { label: 'Tính năng', href: '#section-features' },
    { label: 'Liên hệ', href: '#section-contact' },
  ]

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const elem = document.querySelector(href)
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#631521]/95 backdrop-blur-md py-3.5 border-b border-[#D4AF37]/30 shadow-luxury'
          : 'bg-[#631521] py-4 md:py-5 border-b border-white/10'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Logo thương hiệu tinh tế nằm ở bên trái */}
        <a
          href="#section-hero"
          onClick={(e) => handleNavClick(e, '#section-hero')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full border border-[#D4AF37] flex items-center justify-center bg-[#4A0D17] text-[#D4AF37] font-serif font-bold text-sm tracking-tighter">
            QN
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-[0.18em] text-[#FAF8F5] uppercase group-hover:text-[#D4AF37] transition-colors">
              QuanNguyenS
            </span>
            <span className="text-[9px] tracking-[0.25em] text-[#D4AF37] uppercase font-light -mt-1">
              Haute Textiles & Lounge
            </span>
          </div>
        </a>

        {/* Menu điều hướng: Một menu văn bản inter nằm ở bên phải */}
        <div className="flex items-center space-x-6 lg:space-x-10">
          <nav className="hidden md:flex items-center space-x-8" aria-label="Menu điều hướng chính">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="font-sans text-sm font-medium tracking-wide text-white/90 hover:text-[#D4AF37] transition-colors py-1 link-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA: Nút hình chữ nhật màu trắng với văn bản đỏ burgundy: "MUA NGAY" */}
          <a
            href="#section-products"
            onClick={(e) => {
              e.preventDefault()
              if (onOpenCta) onOpenCta()
              const elem = document.querySelector('#section-products')
              if (elem) elem.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center justify-center bg-white text-[#631521] hover:bg-[#FAF8F5] hover:shadow-lg font-sans text-xs sm:text-sm font-bold tracking-wider px-5 sm:px-6 py-2.5 rounded-[2px] transition-all duration-200 uppercase"
          >
            MUA NGAY
          </a>

          {/* Nút bật tắt menu di động */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-white hover:text-[#D4AF37] focus:outline-none"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu xổ xuống trên thiết bị di động */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#4A0D17] border-b border-[#D4AF37]/30 px-6 py-5 shadow-2xl"
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-sans text-sm font-medium text-white/90 hover:text-[#D4AF37] py-2 border-b border-white/10"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
