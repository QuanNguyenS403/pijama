import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Search } from 'lucide-react'
import { useCart } from '../../hooks/useCart'

export default function Header({ onCartOpen }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const isLanding = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = isLanding
    ? [
        { label: 'Trang Chủ', href: '/' },
        { label: 'Bộ Sưu Tập', href: '#section-products', scroll: true },
        { label: 'Về Chúng Tôi', href: '#section-dark-contrast', scroll: true },
        { label: 'Liên Hệ', href: '#section-footer', scroll: true },
      ]
    : [
        { label: 'Trang Chủ', href: '/' },
        { label: 'Bộ Sưu Tập', href: '/' },
        { label: 'Về Chúng Tôi', href: '/' },
        { label: 'Liên Hệ', href: '/' },
      ]

  const handleNavClick = (e, link) => {
    setMobileMenuOpen(false)
    if (link.scroll) {
      e.preventDefault()
      if (location.pathname !== '/') {
        navigate('/')
        setTimeout(() => {
          const el = document.querySelector(link.href)
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }, 300)
      } else {
        const el = document.querySelector(link.href)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
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
        <Link to="/" className="flex items-center gap-3 group focus:outline-none" aria-label="QuanNguyenS — Trang chủ">
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
        </Link>

        {/* Nav + actions */}
        <div className="flex items-center gap-4 lg:gap-8">
          <nav className="hidden md:flex items-center space-x-8" aria-label="Menu điều hướng chính">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href.startsWith('#') ? location.pathname : link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="font-sans text-xs font-medium tracking-[0.08em] text-white/90 hover:text-[#D4AF37] transition-colors uppercase link-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Icon row */}
          <div className="flex items-center gap-3">
            <button aria-label="Tìm kiếm" className="text-white/80 hover:text-[#D4AF37] transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Cart icon */}
            <button
              onClick={onCartOpen}
              aria-label={`Giỏ hàng — ${totalItems} sản phẩm`}
              className="relative text-white/80 hover:text-[#D4AF37] transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute -top-2 -right-2 bg-[#7B2D3E] text-white text-[10px] font-sans font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center"
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </motion.span>
              )}
            </button>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-white hover:text-[#D4AF37] focus:outline-none"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
                <Link
                  key={link.label}
                  to={link.href.startsWith('#') ? location.pathname : link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className="font-sans text-sm font-medium text-white/90 hover:text-[#D4AF37] py-2 border-b border-white/10 uppercase tracking-wider"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
