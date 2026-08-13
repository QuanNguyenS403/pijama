import HeroSection from './components/sections/HeroSection'
import FeatureSection from './components/sections/FeatureSection'
import DecorativeDivider from './components/sections/DecorativeDivider'
import TrustStrip from './components/sections/TrustStrip'
import PricingSection from './components/sections/PricingSection'
import ReviewsSection from './components/sections/ReviewsSection'

export default function App() {
  return (
    <main>
      <a
        href="#pricing-section"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-card"
      >
        Chuyển đến mua hàng
      </a>
      <HeroSection />
      <FeatureSection />
      <DecorativeDivider />
      <TrustStrip />
      <PricingSection />
      <DecorativeDivider />
      <ReviewsSection />
    </main>
  )
}
