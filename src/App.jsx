import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/san-pham/:productSlug" element={<ProductDetailPage />} />
      <Route path="/gio-hang" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/dat-hang-thanh-cong" element={<OrderSuccessPage />} />
      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
