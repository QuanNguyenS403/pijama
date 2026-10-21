import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Heart, Package, User } from 'lucide-react'
import { useCart } from '../../hooks/useCart'
import WishlistDrawer from '../ui/WishlistDrawer'
import OrdersHistoryDrawer from '../ui/OrdersHistoryDrawer'
import { getSavedOrders } from '../../lib/orderSync'

export default function Header({ onCartOpen, onAddToCart, onOpenOrdersDrawer }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false)
  const [ordersCount, setOrdersCount] = useState(0)

  const { totalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const isLanding = location.pathname === '/'

  const updateWishlistCount = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('qns_wishlist') || '[]')
      setWishlistCount(saved.length)
    } catch {
      setWishlistCount(0)
    }
  }

  const updateOrdersCount = () => {
    try {
      const saved = getSavedOrders()
      setOrdersCount(Array.isArray(saved) ? saved.length : 0)
    } catch {
      setOrdersCount(0)
    }
  }

  useEffect(() => {
    updateWishlistCount()
    updateOrdersCount()

    const handleStorage = () => {
      updateWishlistCount()
      updateOrdersCount()
    }
    const handleOrdersUpdated = () => updateOrdersCount()
    const handleWishlistUpdated = () => updateWishlistCount()
    const handleOpenOrdersEvent = () => setOrdersDrawerOpen(true)
    const interval = setInterval(() => {
      updateWishlistCount()
      updateOrdersCount()
    }, 3000)

    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('wishlist_updated', handleWishlistUpdated)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orders_updated', handleOrdersUpdated)
      window.removeEventListener('wishlist_updated', handleWishlistUpdated)
      window.removeEventListener('open_orders_drawer', handleOpenOrdersEvent)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const navLinks = isLanding
    ? [
        { label: 'Trang Chủ', href: '/' },
        { label: 'Bộ Sưu Tập', href: '#section-products', scroll: true },
        { label: 'Về Chúng Tôi', href: '#section-dark-contrast', scroll: true },
        { label: 'Chính Sách', href: '/chinh-sach' },
        { label: 'Liên Hệ', href: '#section-footer', scroll: true },
      ]
    : [
        { label: 'Trang Chủ', href: '/' },
        { label: 'Bộ Sưu Tập', href: '/' },
        { label: 'Về Chúng Tôi', href: '/' },
        { label: 'Chính Sách', href: '/chinh-sach' },
        { label: 'Liên Hệ', href: '/' },
      ]

  const handleLogoClick = (e) => {
    setMobileMenuOpen(false)
    if (location.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleNavClick = (e, link) => {
    setMobileMenuOpen(false)
    if (link.href === '/' || link.href === '#hero' || link.href === '#section-hero') {
      e.preventDefault()
      if (location.pathname !== '/') {
        navigate('/')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#631521]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-luxury'
            : 'bg-[#631521] border-b border-white/10'
        }`}
      >
        {/* Top Announcement Bar: Vàng Gold, chữ trắng, vệt trắng chạy 1s lặp lại 3s/lần (Chỉ hiển thị trên Trang Chủ, tự động trôi đi/thu lại khi cuộn trang) */}
        {isLanding && (
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              scrolled
                ? 'max-h-0 opacity-0 pointer-events-none'
                : 'max-h-16 opacity-100'
            }`}
          >
            <div className="relative overflow-hidden bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] border-b border-[#F5E1A4]/40 py-2.5 sm:py-3 min-h-[38px] sm:min-h-[42px] px-4 flex items-center justify-center text-center select-none shadow-xs">
              {/* Vệt sáng trắng chạy từ trái qua phải trong 1s, lặp lại 3s/lần */}
              <div
                className="absolute inset-y-0 w-1/4 sm:w-1/5 bg-gradient-to-r from-transparent via-white/85 to-transparent pointer-events-none animate-gold-shimmer"
              />
              <div className="relative z-10 flex items-center justify-center gap-2 text-white font-serif tracking-[0.16em] sm:tracking-[0.22em] uppercase text-xs sm:text-[13px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                <span>Freeship với đơn hàng trên 500k</span>
              </div>
            </div>
          </div>
        )}

        <div className={`w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'py-3' : 'py-3.5 md:py-4'
        }`}>
          {/* Logo */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
            aria-label="QuanNguyenS — Trang chủ"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-[#D4AF37] shadow-sm shrink-0 group-hover:scale-105 group-hover:border-[#F5E1A4] group-hover:shadow-[0_0_14px_rgba(212,175,55,0.45)] transition-all">
              <img
                src="/images/logo.jpg"
                alt="QuanNguyenS Monogram Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-base sm:text-xl font-bold tracking-[0.15em] sm:tracking-[0.18em] text-[#FAF8F5] uppercase group-hover:text-[#D4AF37] transition-colors whitespace-nowrap">
                QuanNguyenS
              </span>
              <span className="text-[8.5px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.25em] text-[#D4AF37] uppercase font-normal -mt-0.5 sm:-mt-1 whitespace-nowrap">
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
            <div className="flex items-center gap-2.5 sm:gap-3.5">

              {/* Wishlist Button */}
              <button
                onClick={() => setWishlistOpen(true)}
                aria-label={`Danh sách yêu thích — ${wishlistCount} mục`}
                className="relative text-white/80 hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                title="Mục đã lưu yêu thích"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <motion.span
                    key={wishlistCount}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-[#2C201A] text-[9.5px] font-sans font-bold w-[17px] h-[17px] rounded-full flex items-center justify-center shadow-sm"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </button>

              {/* Customer Account Button (Enterprise Auth UX) */}
              <Link
                to="/tai-khoan"
                onMouseEnter={() => {
                  fetch('/api/auth/me', { credentials: 'include' }).catch(() => {})
                }}
                aria-label="Tài khoản & Đặc quyền thành viên"
                className="relative hidden sm:flex text-white/80 hover:text-[#D4AF37] transition-colors p-1 cursor-pointer items-center justify-center"
                title="Tài khoản & Ưu đãi thành viên"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Cart Button (Biểu tượng giỏ hàng — Bỏ chữ) */}
              <button
                onClick={onCartOpen}
                aria-label={`Giỏ hàng — ${totalItems} sản phẩm`}
                className="relative text-white/85 hover:text-[#D4AF37] transition-colors p-1 cursor-pointer flex items-center justify-center"
                title="Giỏ hàng của bạn"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-[#2C201A] text-[9.5px] font-sans font-bold w-[17px] h-[17px] rounded-full flex items-center justify-center shadow-sm"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </button>

              {/* Order Tracking & Tracking Code Input Button */}
              <button
                onClick={() => setOrdersDrawerOpen(true)}
                aria-label={`Theo dõi đơn hàng & Nhập mã tracking — ${ordersCount} đơn`}
                className="relative hidden sm:flex text-white/85 hover:text-[#D4AF37] transition-colors p-1 cursor-pointer items-center justify-center"
                title="Theo dõi đơn hàng & Nhập mã tracking"
              >
                <Package className="w-5 h-5" />
                {ordersCount > 0 && (
                  <motion.span
                    key={ordersCount}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-[#2C201A] text-[9.5px] font-sans font-bold w-[17px] h-[17px] rounded-full flex items-center justify-center shadow-sm"
                  >
                    {ordersCount > 9 ? '9+' : ordersCount}
                  </motion.span>
                )}
              </button>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-white hover:text-[#D4AF37] focus:outline-none cursor-pointer"
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


                {/* Mobile Wishlist Link */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setWishlistOpen(true)
                  }}
                  className="flex items-center justify-between text-white/90 hover:text-[#D4AF37] py-2 border-b border-white/10 text-sm font-sans font-medium uppercase tracking-wider text-left"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#D4AF37]" />
                    <span>Mục yêu thích đã lưu</span>
                  </span>
                  {wishlistCount > 0 && (
                    <span className="bg-[#D4AF37] text-[#2C201A] text-xs font-bold px-2 py-0.5 rounded-full">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                {/* Mobile Orders History Link */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setOrdersDrawerOpen(true)
                  }}
                  className="flex items-center justify-between text-white/90 hover:text-[#D4AF37] py-2 border-b border-white/10 text-sm font-sans font-medium uppercase tracking-wider text-left"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#D4AF37]" />
                    <span>Đơn đã đặt của bạn</span>
                  </span>
                  {ordersCount > 0 && (
                    <span className="bg-[#D4AF37] text-[#2C201A] text-xs font-bold px-2 py-0.5 rounded-full">
                      {ordersCount}
                    </span>
                  )}
                </button>

                {/* Mobile Account Link */}
                <Link
                  to="/tai-khoan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-white/90 hover:text-[#D4AF37] py-2 border-b border-white/10 text-sm font-sans font-medium uppercase tracking-wider"
                >
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span>Tài khoản & Ưu đãi CLB</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Wishlist Drawer */}
      <WishlistDrawer
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        onAddToCart={onAddToCart}
      />

      {/* Placed Orders History Drawer */}
      <OrdersHistoryDrawer
        isOpen={ordersDrawerOpen}
        onClose={() => setOrdersDrawerOpen(false)}
      />
    </>
  )
}
