import { useState } from 'react'
import Header from '../components/layout/Header'
import Section2Hero from '../components/sections/Section2Hero'
import CraftsmanshipStrip from '../components/sections/CraftsmanshipStrip'
import Section3FeaturedProducts from '../components/sections/Section3FeaturedProducts'
import EditorialReviews from '../components/sections/EditorialReviews'
import Section4FeatureGrid from '../components/sections/Section4FeatureGrid'
import Section5DarkContrast from '../components/sections/Section5DarkContrast'
import Section6ReversedLayout from '../components/sections/Section6ReversedLayout'
import Section7CustomerStory from '../components/sections/Section7CustomerStory'
import Section8DeepFeature from '../components/sections/Section8DeepFeature'
import Section9LargeBlockText from '../components/sections/Section9LargeBlockText'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { Toast } from '../components/ui/Toast'
import QuickConsultationWidget from '../components/ui/QuickConsultationWidget'

export default function LandingPage() {
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const handleAddToCart = (info) => {
    setToast({ ...info, id: Date.now() })
  }

  return (
    <div className="bg-[#2C201A] text-white min-h-screen font-sans selection:bg-[#D4AF37] selection:text-[#2C201A] overflow-x-hidden">
      {/* SEO & OpenGraph Meta Tags */}
      <title>QuanNguyenS — Pijama Thiết Kế & Homewear Cao Cấp</title>
      <meta name="description" content="Thương hiệu pijama thiết kế cao cấp QuanNguyenS. Chất liệu tự nhiên, sợi dệt chuẩn xuất khẩu châu Âu, phom dáng suông phóng khoáng từ nhà ra phố." />
      <meta property="og:title" content="QuanNguyenS — Pijama Thiết Kế & Homewear Cao Cấp" />
      <meta property="og:description" content="Thương hiệu pijama thiết kế cao cấp QuanNguyenS. Chất liệu tự nhiên, sợi dệt chuẩn xuất khẩu châu Âu, phom dáng suông phóng khoáng từ nhà ra phố." />
      <meta property="og:url" content="https://quannguyens.vn/" />
      <meta property="og:type" content="website" />
      <link rel="canonical" href="https://quannguyens.vn/" />

      {/* Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Unified Header with Wishlist & Cart Access */}
      <Header
        onCartOpen={() => setCartDrawerOpen(true)}
        onAddToCart={handleAddToCart}
      />

      <main id="main-content">
        <Section2Hero />
        <CraftsmanshipStrip />
        <Section3FeaturedProducts />
        <EditorialReviews />
        <Section4FeatureGrid />
        <Section5DarkContrast />
        <Section6ReversedLayout />
        <Section7CustomerStory />
        <Section8DeepFeature />
        <Section9LargeBlockText />
      </main>

      {/* Floating 24/7 Consultation Widget */}
      <QuickConsultationWidget />

      <Section12Footer />
    </div>
  )
}
