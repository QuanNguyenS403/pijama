import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ui/ScrollToTop'
import LandingPage from './pages/LandingPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import BankTransferPaymentPage from './pages/BankTransferPaymentPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminLoginGate from './pages/admin/AdminLoginGate'

export default function App() {
  useEffect(() => {
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
    </>
  )
}


