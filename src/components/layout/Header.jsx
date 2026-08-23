import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, Heart, Package } from 'lucide-react'
import { useCart } from '../../hooks/useCart'
import WishlistDrawer from '../ui/WishlistDrawer'
import OrdersHistoryDrawer from '../ui/OrdersHistoryDrawer'

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
      const saved = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
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
    const handleOpenOrdersEvent = () => setOrdersDrawerOpen(true)

    window.addEventListener('storage', handleStorage)
    window.addEventListener('orders_updated', handleOrdersUpdated)
    window.addEventListener('open_orders_drawer', handleOpenOrdersEvent)
    const interval = setInterval(() => {
      updateWishlistCount()
      updateOrdersCount()
    }, 1500)

    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('orders_updated', handleOrdersUpdated)
      window.removeEventListener('open_orders_drawer', handleOpenOrdersEvent)
      window.removeEventListener('scroll', handleScroll)
      clearInterval(interval)
    }
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
            ? 'bg-[#631521]/95 backdrop-blur-md py-3.5 border-b border-[#D4AF37]/30 shadow-luxury'
            : 'bg-[#631521] py-4 md:py-5 border-b border-white/10'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
            aria-label="QuanNguyenS — Trang chủ"
          >
            <div className="w-8 h-8 rounded-full border border-[#D4AF37] flex items-center justify-center bg-[#4A0D17] text-[#D4AF37] font-serif font-bold text-sm tracking-tighter shadow-xs group-hover:scale-105 transition-transform">
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
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Placed Orders Button */}
              <button
                onClick={() => setOrdersDrawerOpen(true)}
                aria-label={`Đơn đã đặt — ${ordersCount} đơn`}
                className="flex items-center gap-1.5 text-white/85 hover:text-[#D4AF37] px-2.5 py-1 rounded-[2px] border border-white/20 hover:border-[#D4AF37]/50 bg-white/5 text-[11px] font-sans font-medium tracking-wider uppercase transition-colors cursor-pointer"
                title="Xem đơn hàng đã đặt"
              >
                <Package className="w-4 h-4 text-[#D4AF37]" />
                <span className="hidden sm:inline">Đơn đã đặt</span>
                {ordersCount > 0 && (
                  <motion.span
                    key={ordersCount}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="bg-[#D4AF37] text-[#2C201A] text-[9.5px] font-sans font-bold px-1.5 py-0.2 rounded-full flex items-center justify-center shadow-xs"
                  >
                    {ordersCount > 9 ? '9+' : ordersCount}
                  </motion.span>
                )}
              </button>

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

              {/* Cart icon */}
              <button
                onClick={onCartOpen}
                aria-label={`Giỏ hàng — ${totalItems} sản phẩm`}
                className="relative text-white/80 hover:text-[#D4AF37] transition-colors p-1 cursor-pointer"
                title="Giỏ hàng"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-1.5 -right-1.5 bg-[#7B2D3E] text-white text-[9.5px] font-sans font-bold w-[17px] h-[17px] rounded-full flex items-center justify-center shadow-sm"
                  >
                    {totalItems > 9 ? '9+' : totalItems}
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
