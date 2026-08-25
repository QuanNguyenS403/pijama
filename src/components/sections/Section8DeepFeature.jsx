import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const tiers = [
  {
    roman: 'I',
    element: 'HÀNH HỎA',
    icon: '🔥',
    name: 'THE DAYBREAK SET',
    sub: 'Khởi đầu ngày mới tràn đầy sinh khí',
    question: 'Bạn cần được thắp sáng?',
    desc: 'Sọc Hồng ấm áp — năng lượng Hỏa bừng tỉnh cùng mỗi bình minh. Phom suông châu Âu kinh điển, viền tương phản sắc nét.',
    pattern: 'Sọc Hồng · Pink Stripe',
    accentColor: '#D4AF37',
    slug: 'the-classic-set',
    swatchBg: 'repeating-linear-gradient(0deg, #F2C4CE 0px, #F2C4CE 2px, #FFFFFF 2px, #FFFFFF 4px)',
  },
  {
    roman: 'II',
    element: 'HÀNH THỦY',
    icon: '💧',
    name: 'THE STILLWATER SET',
    sub: 'Tĩnh tại và an yên sâu lắng',
    question: 'Bạn cần được lắng yên?',
    desc: 'Caro Navy sâu thẳm — chiều sâu của Thủy, tĩnh như mặt hồ lúc sớm mai. Cổ V thanh lịch, chất modal mềm mướt tựa nước.',
    pattern: 'Caro Navy · Navy Plaid',
    accentColor: '#D4AF37',
    slug: 'the-cafe-look',
    swatchBg: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, #1B2A4A 1px, #1B2A4A 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 4px)',
  },
  {
    roman: 'III',
    element: 'HÀNH THỔ',
    icon: '🪵',
    name: 'THE HEARTH SET',
    sub: 'Vững chãi, nuôi dưỡng, trở về nhà',
    question: 'Bạn cần được vỗ về?',
    desc: 'Sọc Nâu mocha ấm — hành Thổ che chở như vòng tay đất mẹ. Wide-leg buông rủ thượng hạng, sang trọng tự nhiên.',
    pattern: 'Sọc Nâu · Brown Stripe',
    accentColor: '#D4AF37',
    slug: 'the-evening-edit',
    swatchBg: 'repeating-linear-gradient(90deg, #5C3A21 0px, #5C3A21 2px, #FFFFFF 2px, #FFFFFF 3px, #5C3A21 3px, #5C3A21 5px)',
  },
]

function EnergyCard({ tier, idx }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, delay: idx * 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden rounded-[4px] cursor-pointer group"
      style={{ background: '#2C201A' }}
      onClick={() => navigate(`/san-pham/${tier.slug}`)}
      aria-label={`${tier.name} — ${tier.element}`}
    >
      {/* Gold top border — animates on hover */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] origin-left"
        style={{ background: '#D4AF37' }}
        initial={{ scaleX: 0.3, opacity: 0.5 }}
        animate={hovered ? { scaleX: 1, opacity: 1 } : { scaleX: 0.3, opacity: 0.5 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      {/* Roman numeral watermark */}
      <div
        className="absolute bottom-[-12px] right-2 font-serif font-bold leading-none pointer-events-none select-none"
        style={{
          fontSize: 'clamp(80px, 12vw, 130px)',
          color: 'rgba(212, 175, 55, 0.06)',
          letterSpacing: '-0.02em',
        }}
      >
        {tier.roman}
      </div>

      {/* Card body */}
      <div className="relative z-10 flex flex-col flex-1 p-7 sm:p-8">

        {/* Top: element label + swatch */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase"
            style={{ color: '#D4AF37' }}
          >
            {tier.element}
          </span>
          {/* Pattern swatch */}
          <div
            className="w-7 h-7 rounded-[2px] border"
            style={{
              background: tier.swatchBg,
              borderColor: 'rgba(212, 175, 55, 0.35)',
            }}
          />
        </div>

        {/* The question — main hook */}
        <div className="mb-4">
          <motion.p
            className="font-serif font-light leading-snug"
            style={{
              color: 'rgba(250, 248, 245, 0.5)',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
            }}
            animate={hovered ? { opacity: 0.9, y: 0 } : { opacity: 0.5, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {tier.icon} {tier.question}
          </motion.p>
          <motion.h3
            className="font-serif font-bold tracking-tight mt-1"
            style={{ color: '#FAF8F5', fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)', lineHeight: 1.15 }}
            animate={hovered ? { color: '#D4AF37' } : { color: '#FAF8F5' }}
            transition={{ duration: 0.35 }}
          >
            {tier.name}
          </motion.h3>
          <p
            className="font-serif italic font-light mt-1.5"
            style={{ color: 'rgba(212, 175, 55, 0.7)', fontSize: '0.72rem', letterSpacing: '0.06em' }}
          >
            {tier.sub}
          </p>
        </div>

        {/* Divider */}
        <div className="w-10 h-[1px] mb-4" style={{ background: 'rgba(212, 175, 55, 0.3)' }} />

        {/* Desc — slides in on hover */}
        <div className="overflow-hidden mb-5" style={{ minHeight: '4.5rem' }}>
          <AnimatePresence initial={false}>
            {hovered ? (
              <motion.p
                key="desc-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="font-sans leading-relaxed"
                style={{ color: 'rgba(250, 248, 245, 0.78)', fontSize: '0.82rem' }}
              >
                {tier.desc}
              </motion.p>
            ) : (
              <motion.p
                key="desc-pattern"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-sans"
                style={{ color: 'rgba(140, 126, 116, 0.9)', fontSize: '0.76rem', letterSpacing: '0.06em' }}
              >
                {tier.pattern}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/san-pham/${tier.slug}`)
          }}
          className="relative mt-auto w-full py-3 font-sans text-[11px] font-bold tracking-[0.2em] uppercase overflow-hidden rounded-[2px] cursor-pointer"
          style={{
            border: '1px solid rgba(212, 175, 55, 0.45)',
            color: hovered ? '#2C201A' : '#D4AF37',
          }}
          animate={hovered
            ? { borderColor: '#D4AF37', color: '#2C201A' }
            : { borderColor: 'rgba(212, 175, 55, 0.45)', color: '#D4AF37' }}
          transition={{ duration: 0.3 }}
        >
          {/* Fill on hover */}
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{ background: '#D4AF37', originX: 0 }}
            initial={{ scaleX: 0 }}
            animate={hovered ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="relative z-10">MUA NGAY</span>
        </motion.button>
      </div>
    </motion.article>
  )
}

export default function Section8DeepFeature() {
  return (
    <section
      id="section-deep-feature"
      aria-label="Khám Phá Theo Năng Lượng"
      className="py-20 sm:py-24 md:py-28 border-b border-[#E8DFD5] relative overflow-hidden"
      style={{ background: '#1A1614' }}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(99,21,33,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)' }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">

        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span
            className="font-serif text-[11px] font-semibold tracking-[0.3em] uppercase block mb-3"
            style={{ color: '#D4AF37' }}
          >
            NĂNG LƯỢNG & PHONG THỦY
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
            style={{ color: '#FAF8F5' }}
          >
            Tối nay bạn cần
            <span
              className="block italic font-light mt-1"
              style={{ color: '#D4AF37' }}
            >
              năng lượng gì?
            </span>
          </h2>
          <p
            className="font-sans text-sm sm:text-base mt-4 leading-relaxed"
            style={{ color: 'rgba(250, 248, 245, 0.55)' }}
          >
            3 sắc thái Ngũ Hành — 3 trạng thái cảm xúc. Rê chuột để khám phá.
          </p>
          <div className="w-12 h-[1px] mx-auto mt-5" style={{ background: 'rgba(212, 175, 55, 0.5)' }} />
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {tiers.map((tier, idx) => (
            <EnergyCard key={tier.name} tier={tier} idx={idx} />
          ))}
        </div>

        {/* Bottom label */}
        <motion.p
          className="text-center font-sans text-[11px] tracking-[0.18em] uppercase mt-10"
          style={{ color: 'rgba(140, 126, 116, 0.6)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Thu Đông 2026 · Chất liệu tự nhiên · Phong cách châu Âu
        </motion.p>

      </div>
    </section>
  )
}
