import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star, ShieldCheck, Gift, Truck, RefreshCw, Sparkles, Heart } from 'lucide-react'
import { pricingTiers, trustPoints } from '../../data/pricing'
import SizeGuideModal from '../ui/SizeGuideModal'
import { useCart } from '../../hooks/useCart'
import { products } from '../../data/products'

export default function PricingSection({ onAddToCart }) {
  const [selectedTier, setSelectedTier] = useState('combo-2')
  const [selectedColor, setSelectedColor] = useState('Màu Ngà (Classic Ivory)')
  const [selectedSize, setSelectedSize] = useState('M')
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const { addItem } = useCart()

  const colors = [
    { name: 'Màu Ngà (Classic Ivory)', hex: '#FAF8F5' },
    { name: 'Xanh Sage (Sage Green)', hex: '#8A9E8A' },
    { name: 'Hồng Đất (Dusty Rose)', hex: '#C9998A' },
    { name: 'Đỏ Rượu (Burgundy)', hex: '#631521' },
  ]

  const sizes = ['S', 'M', 'L', 'XL', 'XXL']

  const handleOrder = (tier) => {
    // Map tier to Sunday Set as primary product representation
    const defaultProduct = products[0]
    const matchedColor = defaultProduct.colors?.find(c => c.name.includes('Ivory') || c.hex === '#FAF8F5') || defaultProduct.colors?.[0]
    
    const defaultImg = Array.isArray(defaultProduct.images)
      ? defaultProduct.images[0]
      : (defaultProduct.images?.[matchedColor?.name]?.[0] || Object.values(defaultProduct.images || {})[0]?.[0])

    const cartItem = {
      id: `${tier.id}-${selectedColor}-${selectedSize}`,
      productId: defaultProduct.id,
      name: `[${tier.label}] ${defaultProduct.name}`,
      subtitle: `${selectedColor} | Size ${selectedSize}`,
      color: matchedColor,
      size: selectedSize,
      quantity: 1,
      price: tier.priceRaw || defaultProduct.price,
      originalPrice: defaultProduct.originalPrice,
      image: defaultImg,
      slug: defaultProduct.slug,
    }

    addItem(cartItem)

    if (onAddToCart) {
      onAddToCart({
        productName: `[${tier.label}] ${defaultProduct.name}`,
        variant: `${selectedColor} | Size ${selectedSize}`,
        price: tier.priceRaw || defaultProduct.price,
        image: defaultImg,
      })
    }
  }

  return (
    <section
      id="pricing-section"
      aria-label="Bảng giá ưu đãi & Đặt hàng Pijama QuanNguyenS"
      className="bg-[#FAF8F5] py-24 md:py-36 relative overflow-hidden border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-3">
            BẢNG GIÁ ƯU ĐÃI & ĐẶT HÀNG TRỰC TIẾP
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1A1614] tracking-tight mb-4">
            Chọn Gói Trải Nghiệm <br />
            <span className="font-serif-italic text-[#8C7E74]">Cho Giấc Ngủ Hoàn Hảo</span>
          </h2>
          <p className="text-sm sm:text-base text-[#4A423C] font-light max-w-xl mx-auto">
            Hỗ trợ đổi size tận nhà trong 30 ngày — Tặng kèm hộp quà sang trọng và phụ kiện thêu tay cao cấp cho mọi combo.
          </p>
        </div>

        {/* Pricing Cards Grid (3 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-16">
          {pricingTiers.map((tier) => {
            const isHighlighted = tier.highlight
            return (
              <div
                key={tier.id}
                className={`relative rounded-[3px] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-[#1A1614] text-[#FAF8F5] shadow-luxury border-2 border-[#C5A059] lg:-translate-y-3'
                    : 'bg-[#FAF8F5] text-[#1A1614] border border-[#E8DFD5] shadow-sm hover:border-[#8C7E74]'
                }`}
              >
                {/* Popular Badge */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C5A059] text-[#1A1614] text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-1 rounded-[2px] shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    <span>{tier.badge}</span>
                  </div>
                )}

                <div>
                  {/* Tier Title Header */}
                  <div className="border-b border-[#E8DFD5]/20 pb-6 mb-6">
                    <span className={`text-[10px] font-bold tracking-[0.2em] uppercase block mb-1 ${isHighlighted ? 'text-[#C5A059]' : 'text-[#8C7E74]'}`}>
                      {tier.label}
                    </span>
                    <h3 className="font-serif text-2xl font-normal mb-2">
                      {tier.title}
                    </h3>
                    <p className={`text-xs font-light ${isHighlighted ? 'text-[#E8DFD5]/80' : 'text-[#8C7E74]'}`}>
                      {tier.description}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-3">
                      <span className={`font-serif text-4xl font-normal ${isHighlighted ? 'text-[#FAF8F5]' : 'text-[#1A1614]'}`}>
                        {tier.price}
                      </span>
                      {tier.originalPrice && (
                        <span className="text-sm line-through text-[#8C7E74] font-light">
                          {tier.originalPrice}
                        </span>
                      )}
                    </div>
                    {tier.savings && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-[#C5A059] tracking-wider">
                        {tier.savings}
                      </span>
                    )}
                  </div>

                  {/* Gift Announcement */}
                  {tier.gift && (
                    <div className={`p-3.5 rounded-[2px] mb-6 flex items-start gap-2.5 text-xs ${
                      isHighlighted ? 'bg-[#26201C] border border-[#C5A059]/40 text-[#E8DFD5]' : 'bg-[#F5F0EB] border border-[#E8DFD5] text-[#1A1614]'
                    }`}>
                      <Gift className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                      <span className="font-medium">{tier.gift}</span>
                    </div>
                  )}

                  {/* Feature Checklist */}
                  <ul className="space-y-3 mb-8 text-xs sm:text-sm font-light">
                    {tier.perks.map((perk, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                        <span className={isHighlighted ? 'text-[#E8DFD5]' : 'text-[#4A423C]'}>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Action Button */}
                <button
                  onClick={() => handleOrder(tier)}
                  className={`w-full py-4 rounded-[2px] text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm ${
                    isHighlighted
                      ? 'bg-white text-[#D4AF37] border-2 border-[#D4AF37] hover:bg-[#FAF8F5] hover:text-[#B8860B] hover:border-[#B8860B] hover:shadow-gold-glow'
                      : 'bg-[#1A1614] text-[#FAF8F5] hover:bg-[#2C2420]'
                  }`}
                  aria-label={tier.ctaLabel}
                >
                  {tier.ctaLabel}
                </button>
              </div>
            )
          })}
        </div>

        {/* 4 Key Trust Pillars Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-[#E8DFD5]">
          {trustPoints.map((tp, idx) => (
            <div key={idx} className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-[2px] bg-[#F5F0EB] text-[#1A1614] flex items-center justify-center shrink-0 border border-[#E8DFD5]">
                <ShieldCheck className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#1A1614] mb-1">
                  {tp.title}
                </h4>
                <p className="text-[11px] text-[#8C7E74] font-light leading-snug">
                  {tp.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Size Guide Modal Popup */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </section>
  )
}
