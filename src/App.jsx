import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ui/ScrollToTop'
import LandingPage from './pages/LandingPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import BankTransferPaymentPage from './pages/BankTransferPaymentPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'

export default function App() {
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
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        {/* Fallback */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  )
}


