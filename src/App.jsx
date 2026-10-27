import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ScrollToTop from './components/ui/ScrollToTop'
import LandingPage from './pages/LandingPage'
import AuthModal from './components/auth/AuthModal'
import { initOrderSync } from './lib/orderSync'

const ChatWidget = lazy(() => import('./components/chat/ChatWidget'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const BankTransferPaymentPage = lazy(() => import('./pages/BankTransferPaymentPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminBroadcastPage = lazy(() => import('./pages/admin/AdminBroadcastPage'))
const AdminMembersPage = lazy(() => import('./pages/admin/AdminMembersPage'))
const AdminLoginGate = lazy(() => import('./pages/admin/AdminLoginGate'))
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'))
const PolicyPage = lazy(() => import('./pages/PolicyPage'))

function PageFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#631521]/20 border-t-[#631521] rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    // Khởi tạo kênh đồng bộ realtime (SSE + BroadcastChannel)
    initOrderSync()

    const handleOpenAuth = () => setIsAuthModalOpen(true)
    window.addEventListener('open_auth_modal', handleOpenAuth)
    return () => window.removeEventListener('open_auth_modal', handleOpenAuth)
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/san-pham/:productSlug" element={<ProductDetailPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/thanh-toan-chuyen-khoan" element={<BankTransferPaymentPage />} />
          <Route path="/dat-hang-thanh-cong" element={<OrderSuccessPage />} />
          <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/login" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/orders" element={<AdminLoginGate><AdminOrdersPage /></AdminLoginGate>} />
          <Route path="/admin/broadcast" element={<AdminLoginGate><AdminBroadcastPage /></AdminLoginGate>} />
          <Route path="/admin/members" element={<AdminLoginGate><AdminMembersPage /></AdminLoginGate>} />
          <Route path="/tai-khoan" element={<AccountPage />} />
          <Route path="/hoi-vien" element={<LoyaltyPage />} />
          <Route path="/chinh-sach" element={<PolicyPage />} />
          <Route path="/chinh-sach-bao-mat" element={<PolicyPage />} />
          <Route path="/privacy-policy" element={<PolicyPage />} />
          <Route path="/dieu-khoan" element={<Navigate to="/chinh-sach" replace />} />
          <Route path="/terms" element={<Navigate to="/chinh-sach" replace />} />
          <Route path="/huy-dang-ky" element={<UnsubscribePage />} />
          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && (
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      )}
    </>
  )
}


