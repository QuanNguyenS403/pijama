import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ui/ScrollToTop'
import LandingPage from './pages/LandingPage'
import { initOrderSync } from './lib/orderSync'

const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const BankTransferPaymentPage = lazy(() => import('./pages/BankTransferPaymentPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'))
const AdminLoginGate = lazy(() => import('./pages/admin/AdminLoginGate'))

function PageFallback() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#631521]/20 border-t-[#631521] rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    // Khởi tạo kênh đồng bộ realtime (SSE + BroadcastChannel)
    initOrderSync()

    // Reset past test orders once
    if (typeof window !== 'undefined' && !localStorage.getItem('qns_orders_reset_2026')) {
      localStorage.removeItem('pijama_orders')
      localStorage.setItem('qns_orders_reset_2026', 'true')
      window.dispatchEvent(new Event('orders_updated'))
    }
  }, [])

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/san-pham/:productSlug" element={<ProductDetailPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/thanh-toan-chuyen-khoan" element={<BankTransferPaymentPage />} />
          <Route path="/dat-hang-thanh-cong" element={<OrderSuccessPage />} />
          <Route path="/admin/orders" element={<AdminLoginGate><AdminOrdersPage /></AdminLoginGate>} />
          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </>
  )
}


