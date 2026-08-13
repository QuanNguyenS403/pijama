import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import SectionContainer from '../ui/SectionContainer'
import PrimaryButton from '../ui/PrimaryButton'
import { pricingTiers } from '../../data/pricing'

function PricingCard({ tier, index }) {
  const isHighlighted = tier.highlight

  const cardContent = (
    <div
      className={`
        rounded-card p-8 flex flex-col gap-4 h-full min-w-0
        ${isHighlighted
          ? 'bg-btn-primary border-2 border-accent-gold ring-2 ring-accent-gold ring-offset-2 md:scale-105 relative z-10'
          : 'bg-card-bg shadow-card border border-transparent'
        }
      `}
    >
      <span
        className={`text-sm font-bold uppercase tracking-wider ${isHighlighted ? 'text-gray-300' : 'text-text-muted'}`}
      >
        {tier.label}
      </span>

      <span
        className={`text-4xl font-extrabold ${isHighlighted ? 'text-white' : 'text-text-primary'}`}
      >
        {tier.price}
      </span>

      <p
        className={`text-sm leading-snug ${isHighlighted ? 'text-gray-300' : 'text-text-body'}`}
      >
        {tier.description}
      </p>

      {tier.savings && (
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-badge w-fit ${
            isHighlighted
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'text-accent-green bg-green-50'
          }`}
        >
          {tier.savings}
        </span>
      )}

      {tier.gift && (
        <div className={`flex items-center gap-2 text-xs ${isHighlighted ? 'text-gray-300' : 'text-text-muted'}`}>
          <Gift className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{tier.gift}</span>
        </div>
      )}

      <div className="mt-auto pt-2">
        <PrimaryButton
          label={tier.ctaLabel}
          href="#"
          inverted={isHighlighted}
        />
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative min-w-0"
    >
      {tier.badge && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-gold text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full whitespace-nowrap z-20"
          role="status"
        >
          {tier.badge}
        </div>
      )}
      {cardContent}
    </motion.div>
  )
}

export default function PricingSection() {
  return (
    <section id="pricing-section" aria-label="Bảng giá sản phẩm" className="bg-white py-16 md:py-24">
      <SectionContainer>
        <div className="text-center mb-12">
          <h2 className="text-reviews-mobile md:text-reviews-desktop font-extrabold text-text-primary mb-3">
            Chọn Gói Phù Hợp Với Bạn
          </h2>
          <p className="text-sm md:text-base text-text-muted max-w-md mx-auto">
            Giá đã bao gồm VAT. Miễn phí giao hàng cho đơn từ 2 bộ trở lên.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start pt-6">
          {pricingTiers.map((tier, index) => (
            <PricingCard key={tier.id} tier={tier} index={index} />
          ))}
        </div>
      </SectionContainer>
    </section>
  )
}
