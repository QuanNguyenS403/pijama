import { useState } from 'react'
import Section1Header from './components/sections/Section1Header'
import Section2Hero from './components/sections/Section2Hero'
import Section3FeaturedProducts from './components/sections/Section3FeaturedProducts'
import Section4FeatureGrid from './components/sections/Section4FeatureGrid'
import Section5DarkContrast from './components/sections/Section5DarkContrast'
import Section6ReversedLayout from './components/sections/Section6ReversedLayout'
import Section7CustomerStory from './components/sections/Section7CustomerStory'
import Section8DeepFeature from './components/sections/Section8DeepFeature'
import Section9LargeBlockText from './components/sections/Section9LargeBlockText'
import Section10ComparisonTable from './components/sections/Section10ComparisonTable'
import Section11CtaForm from './components/sections/Section11CtaForm'
import Section12Footer from './components/sections/Section12Footer'

export default function App() {
  const [toastMessage, setToastMessage] = useState(null)

  const handleAddToCart = (product) => {
    setToastMessage(`Đã thêm "${product.name}" vào giỏ hàng`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSelectTier = (tier) => {
    setToastMessage(`Bạn đã chọn gói: "${tier.name}"`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div className="bg-[#2C201A] text-white min-h-screen font-sans selection:bg-[#D4AF37] selection:text-[#2C201A] overflow-x-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#D4AF37] text-[#2C201A] px-5 py-3 rounded-[3px] shadow-2xl font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Phần 1: Header (Đầu trang) */}
      <Section1Header />

      <main id="main-content">
        {/* 2. Phần 2: Hero Section (Phần đầu) */}
        <Section2Hero />

        {/* 3. Phần 3: Featured Products (Sản phẩm nổi bật) */}
        <Section3FeaturedProducts onAddToCart={handleAddToCart} />

        {/* 4. Phần 4: Feature Grid (Lưới tính năng) */}
        <Section4FeatureGrid />

        {/* 5. Phần 5: Dark Contrast Section (Phần nền tối phản chiếu) */}
        <Section5DarkContrast />

        {/* 6. Phần 6: Reversed Layout Section (Bố cục đảo ngược) */}
        <Section6ReversedLayout />

        {/* 7. Phần 7: Customer Story / Testimonial (Câu chuyện khách hàng) */}
        <Section7CustomerStory />

        {/* 8. Phần 8: Deep Feature / Value Section (Phần tính năng sâu hơn) */}
        <Section8DeepFeature />

        {/* 9. Phần 9: Large Block Text (Khối văn bản lớn) */}
        <Section9LargeBlockText />

        {/* 10. Phần 10: Comparison Table (Bảng so sánh) */}
        <Section10ComparisonTable onSelectTier={handleSelectTier} />

        {/* 11. Phần 11: Call to Action Form (Form đăng ký) */}
        <Section11CtaForm />
      </main>

      {/* 12. Phần 12: Footer (Chân trang) */}
      <Section12Footer />

    </div>
  )
}
