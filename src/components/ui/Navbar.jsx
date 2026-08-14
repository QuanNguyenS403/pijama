import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Search, Menu, X, Check, ArrowRight } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Navbar({ onOpenSizeGuide, cartCount = 2, onOpenCart }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'TRANG CHỦ', href: '#hero' },
    { label: 'BỘ SƯU TẬP', href: '#san-pham-noi-bat' },
    { label: 'VỀ CHÚNG TÔI', href: '#ve-chung-toi' },
    { label: 'LIÊN HỆ', href: '#lien-he' },
  ]

  const quickSearchSuggestions = [
    'Pijama Đũi Dài Kẻ Sọc Navy',
    'Bộ Pijama Sọc Hồng Pastel',
    'Bộ Đũi Trắng Ngà Classic',
    'Pijama Đũi Cộc Mát Lành',
    'Bảng Size Pijama Nam Nữ'
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#FAF8F5]/95 backdrop-blur-md py-3.5 border-b border-[#E8DFD5] shadow-glass'
            : 'bg-[#FAF8F5]/80 backdrop-blur-sm py-4 md:py-5 border-b border-[#E8DFD5]/40'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          {/* Top Left: Sophisticated minimalist QuanNguyenS Logo */}
          <a href="#hero" className="flex items-center gap-2 focus:outline-none" aria-label="QuanNguyenS Trang chủ">
            <BrandLogo variant="horizontal" color="navy" />
          </a>

          {/* Center: Simple, centered navigation links */}
          <nav className="hidden md:flex items-center space-x-8 lg:space-x-10" aria-label="Menu chính">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[12px] font-semibold tracking-[0.16em] text-[#1E293B] hover:text-[#0F172A] transition-colors relative py-1 link-underline uppercase"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Side: Search, Cart Icon, and CTA Button */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#F5F0EB] rounded-full transition-colors"
              aria-label="Tìm kiếm sản phẩm"
              title="Tìm kiếm"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Cart Button with Count Badge */}
            <a
              href="#pricing-section"
              onClick={onOpenCart}
              className="relative p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#F5F0EB] rounded-full transition-colors"
              aria-label="Giỏ hàng"
              title="Giỏ hàng"
            >
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#0F172A] text-[#FAF8F5] text-[9px] font-bold rounded-full flex items-center justify-center border border-[#FAF8F5]">
                  {cartCount}
                </span>
              )}
            </a>

            {/* Prominent Shop Now CTA */}
            <a
              href="#pricing-section"
              className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-[11px] font-bold tracking-[0.18em] px-4 sm:px-5 py-2.5 rounded-[2px] transition-all duration-300 shadow-sm hover:shadow-md uppercase"
            >
              <span>MUA NGAY</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#0F172A] hover:bg-[#F5F0EB] rounded-[2px] focus:outline-none"
              aria-label="Mở danh mục menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#FAF8F5] border-b border-[#E8DFD5] px-6 py-5 shadow-lg"
            >
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-semibold tracking-[0.16em] text-[#0F172A] py-2 border-b border-[#E8DFD5]/50 flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#64748B]" />
                  </a>
                ))}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onOpenSizeGuide?.()
                    }}
                    className="text-xs text-left font-semibold tracking-wider text-[#64748B] hover:text-[#0F172A] py-1"
                  >
                    📐 Bảng Hướng Dẫn Kích Cỡ (Size Guide)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Interactive Search Modal Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-xl bg-[#FAF8F5] rounded-[4px] border border-[#E8DFD5] shadow-2xl p-6 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E8DFD5]">
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#64748B] uppercase">
                  <Search className="w-4 h-4 text-[#0F172A]" />
                  <span>Tìm kiếm sản phẩm QuanNguyenS</span>
                </div>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nhập tên bộ pijama, màu sắc (navy, hồng, trắng ngà...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FFFFFF] border border-[#D9CDBF] rounded-[2px] text-sm text-[#0F172A] placeholder-[#8C7E74] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
                  Gợi ý phổ biến:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickSearchSuggestions.map((item) => (
                    <a
                      key={item}
                      href="#san-pham-noi-bat"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs bg-[#F5F0EB] hover:bg-[#E8DFD5] text-[#1E293B] px-3 py-1.5 rounded-[2px] transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
