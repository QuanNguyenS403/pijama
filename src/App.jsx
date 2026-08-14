import { useState } from 'react'
import Navbar from './components/ui/Navbar'
import SizeGuideModal from './components/ui/SizeGuideModal'
import HeroSection from './components/sections/HeroSection'
import ProductEditSection from './components/sections/ProductEditSection'
import BrandManifesto from './components/sections/BrandManifesto'
import FabricStorySection from './components/sections/FabricStorySection'
import EditorialFeatureStories from './components/sections/EditorialFeatureStories'
import NightRitualSection from './components/sections/NightRitualSection'
import EditorialReviews from './components/sections/EditorialReviews'
import PricingSection from './components/sections/PricingSection'
import CareFaqSection from './components/sections/CareFaqSection'
import FinalCtaFooter from './components/sections/FinalCtaFooter'

export default function App() {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
    const pricingElem = document.getElementById('pricing-section')
    if (pricingElem) {
      pricingElem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="bg-[#FAF8F5] text-[#1A1614] min-h-screen selection:bg-[#E8DFD5] selection:text-[#0F172A] font-sans antialiased">
      {/* Skip link for accessibility */}
      <a
        href="#pricing-section"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#0F172A] focus:text-[#FAF8F5] focus:px-4 focus:py-2 focus:text-xs focus:font-bold uppercase tracking-wider"
      >
        Chuyển đến đặt hàng
      </a>

      {/* Sticky Luxury Navbar with QuanNguyenS Branding */}
      <Navbar
        onOpenSizeGuide={() => setSizeGuideOpen(true)}
      />

      {/* Main Experience Flow */}
      <main id="main-content">
        {/* 1. Hero Section (Headline, Model Image + Macro Fabric Inset, CTA) */}
        <HeroSection onOpenSizeGuide={() => setSizeGuideOpen(true)} />

        {/* 2. Product Showcase Section (SẢN PHẨM NỔI BẬT - Tight 3-Column Grid) */}
        <ProductEditSection
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
          onSelectProductForOrder={handleSelectProduct}
        />

        {/* 3. Benefit & Brand Manifesto Section (Well-formatted bullet points) */}
        <BrandManifesto />

        {/* 4. Fabric Story (Deep dive into 100% natural slub linen attributes) */}
        <FabricStorySection />

        {/* 5. Editorial Stories & Craftsmanship */}
        <EditorialFeatureStories />

        {/* 6. Night Ritual Experience */}
        <NightRitualSection />

        {/* 7. Social Proof & Customer Reviews */}
        <EditorialReviews />

        {/* 8. Pricing Tiers & Direct Checkout */}
        <PricingSection
          onOpenSizeGuide={() => setSizeGuideOpen(true)}
          preselectedProduct={selectedProduct}
        />

        {/* 9. Fabric Care & FAQ */}
        <CareFaqSection />
      </main>

      {/* 10. Cinematic Final CTA & Minimalist Footer */}
      <FinalCtaFooter />

      {/* Interactive Size Guide Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </div>
  )
}
