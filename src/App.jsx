import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import ScrollToTop from './components/ui/ScrollToTop'
import PageTransition from './components/ui/PageTransition'
import BackToTopButton from './components/ui/BackToTopButton'
import PageLoader from './components/ui/PageLoader'
import { initSmoothScroll } from './lib/smoothScroll'
import LandingPage from './pages/LandingPage'
import AuthModal from './components/auth/AuthModal'
import { initOrderSync } from './lib/orderSync'

const ChatWidget = lazy(() => import('./components/chat/ChatWidget'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const BankTransferPaymentPage = lazy(() => import('./pages/BankTransferPaymentPage'))
const QrPaymentWaitingPage = lazy(() => import('./pages/QrPaymentWaitingPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminBroadcastPage = lazy(() => import('./pages/admin/AdminBroadcastPage'))
const AdminMembersPage = lazy(() => import('./pages/admin/AdminMembersPage'))
const AdminLoginGate = lazy(() => import('./pages/admin/AdminLoginGate'))
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'))
const LoyaltyRegisterPage = lazy(() => import('./pages/LoyaltyRegisterPage'))
const VerifyLoyaltyPhonePage = lazy(() => import('./pages/VerifyLoyaltyPhonePage'))
const PolicyPage = lazy(() => import('./pages/PolicyPage'))

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    // Khởi tạo kênh đồng bộ realtime (SSE + BroadcastChannel)
    initOrderSync()

    // Khởi tạo engine cuộn mượt mà chuẩn thượng lưu (Lenis)
    const scrollInstance = initSmoothScroll()

    const handleOpenAuth = () => setIsAuthModalOpen(true)
    window.addEventListener('open_auth_modal', handleOpenAuth)
    return () => {
      window.removeEventListener('open_auth_modal', handleOpenAuth)
      scrollInstance?.destroy?.()
    }
  }, [])

  return (
    <>
      <ScrollToTop />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false)
          window.location.href = '/tai-khoan'
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
            <Route path="/san-pham/:productSlug" element={<PageTransition><ProductDetailPage /></PageTransition>} />
            <Route path="/gio-hang" element={<PageTransition><CartPage /></PageTransition>} />
            <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
            <Route path="/thanh-toan-chuyen-khoan" element={<PageTransition><BankTransferPaymentPage /></PageTransition>} />
            <Route path="/cho-xac-nhan-thanh-toan" element={<PageTransition><QrPaymentWaitingPage /></PageTransition>} />
            <Route path="/dat-hang-thanh-cong" element={<PageTransition><OrderSuccessPage /></PageTransition>} />
            <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
            <Route path="/admin/login" element={<Navigate to="/admin/orders" replace />} />
            <Route path="/admin/orders" element={<AdminLoginGate><AdminOrdersPage /></AdminLoginGate>} />
            <Route path="/admin/broadcast" element={<AdminLoginGate><AdminBroadcastPage /></AdminLoginGate>} />
            <Route path="/admin/members" element={<AdminLoginGate><AdminMembersPage /></AdminLoginGate>} />
            <Route path="/tai-khoan" element={<PageTransition><AccountPage /></PageTransition>} />
            <Route path="/hoi-vien" element={<PageTransition><LoyaltyPage /></PageTransition>} />
            <Route path="/uu-dai-hoi-vien" element={<PageTransition><LoyaltyRegisterPage /></PageTransition>} />
            <Route path="/dang-ky-hoi-vien" element={<PageTransition><LoyaltyRegisterPage /></PageTransition>} />
            <Route path="/xac-minh-hoi-vien" element={<PageTransition><VerifyLoyaltyPhonePage /></PageTransition>} />
            <Route path="/hoi-vien/xac-minh" element={<PageTransition><VerifyLoyaltyPhonePage /></PageTransition>} />
            <Route path="/chinh-sach" element={<PageTransition><PolicyPage /></PageTransition>} />
            <Route path="/chinh-sach-bao-mat" element={<PageTransition><PolicyPage /></PageTransition>} />
            <Route path="/privacy-policy" element={<PageTransition><PolicyPage /></PageTransition>} />
            <Route path="/dieu-khoan" element={<Navigate to="/chinh-sach" replace />} />
            <Route path="/terms" element={<Navigate to="/chinh-sach" replace />} />
            <Route path="/huy-dang-ky" element={<PageTransition><UnsubscribePage /></PageTransition>} />
            {/* Fallback */}
            <Route path="*" element={<PageTransition><LandingPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!isAdminRoute && (
        <>
          <BackToTopButton />
          <Suspense fallback={null}>
            <ChatWidget />
          </Suspense>
        </>
      )}
    </>
  )
}
