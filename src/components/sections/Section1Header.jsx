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
    { label: 'Bộ sưu tập', href: '#section-products' },
    { label: 'Chất liệu', href: '#section-features' },
    { label: 'Về chúng tôi', href: '#section-dark-contrast' },
    { label: 'Liên hệ', href: '#section-footer' },
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
        {/* Logo */}
        <a
          href="#section-hero"
          onClick={(e) => handleNavClick(e, '#section-hero')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full border border-[#D4AF37] flex items-center justify-center bg-[#4A0D17] text-[#D4AF37] font-serif font-bold text-sm tracking-tighter">
            QNS
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-[0.18em] text-[#FAF8F5] uppercase group-hover:text-[#D4AF37] transition-colors">
              QuanNguyenS
            </span>
            <span className="text-[9px] tracking-[0.25em] text-[#D4AF37] uppercase font-light -mt-1">
              European Casual Luxury
            </span>
          </div>
        </a>

        {/* Nav */}
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

          {/* CTA: White background frame with gold text */}
          <a
            href="#section-deep-feature"
            onClick={(e) => {
              e.preventDefault()
              if (onOpenCta) onOpenCta()
              const elem = document.querySelector('#section-deep-feature')
              if (elem) elem.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center justify-center bg-white text-[#D4AF37] border border-[#D4AF37] hover:bg-[#FAF8F5] hover:text-[#B8860B] hover:shadow-gold-glow font-sans text-xs sm:text-sm font-bold tracking-wider px-5 sm:px-6 py-2.5 rounded-[2px] transition-all duration-200 uppercase shadow-md"
          >
            MUA NGAY
          </a>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-white hover:text-[#D4AF37] focus:outline-none"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
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
