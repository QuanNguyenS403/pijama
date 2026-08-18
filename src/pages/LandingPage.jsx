import Section1Header from '../components/sections/Section1Header'
import Section2Hero from '../components/sections/Section2Hero'
import CraftsmanshipStrip from '../components/sections/CraftsmanshipStrip'
import Section3FeaturedProducts from '../components/sections/Section3FeaturedProducts'
import Section4FeatureGrid from '../components/sections/Section4FeatureGrid'
import Section5DarkContrast from '../components/sections/Section5DarkContrast'
import Section6ReversedLayout from '../components/sections/Section6ReversedLayout'
import Section7CustomerStory from '../components/sections/Section7CustomerStory'
import Section8DeepFeature from '../components/sections/Section8DeepFeature'
import Section9LargeBlockText from '../components/sections/Section9LargeBlockText'
import Section12Footer from '../components/sections/Section12Footer'

export default function LandingPage() {
  return (
    <div className="bg-[#2C201A] text-white min-h-screen font-sans selection:bg-[#D4AF37] selection:text-[#2C201A] overflow-x-hidden">
      <Section1Header />
      <main id="main-content">
        <Section2Hero />
        <CraftsmanshipStrip />
        <Section3FeaturedProducts />
        <Section4FeatureGrid />
        <Section5DarkContrast />
        <Section6ReversedLayout />
        <Section7CustomerStory />
        <Section8DeepFeature />
        <Section9LargeBlockText />
      </main>
      <Section12Footer />
    </div>
  )
}
