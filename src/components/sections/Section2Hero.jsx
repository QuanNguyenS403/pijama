import { motion } from 'framer-motion'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'

export default function Section2Hero() {
  const scrollTo = (id) => {
    const elem = document.querySelector(id)
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="section-hero"
      aria-label="Hero Section"
      className="relative bg-[#631521] pt-28 pb-16 sm:pt-36 sm:pb-24 md:pt-40 md:pb-28 overflow-hidden text-white border-b border-white/10"
    >
      {/* Ambient lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7A1D2B]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#4A0D17]/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Content column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            {/* Pre-headline */}
            <span className="font-serif text-sm sm:text-base font-semibold tracking-[0.25em] text-[#D4AF37] uppercase mb-3">
              AUTUMN / WINTER COLLECTION 2026
            </span>

            {/* Main headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-bold text-white leading-[1.08] mb-4 tracking-tight">
              Pijama không chỉ để ngủ
              <span className="block text-[#FAF8F5]/90 italic mt-1">Mặc ra ngoài đi</span>
            </h1>

            {/* Sub-headline */}
            <p className="font-sans text-base sm:text-lg text-white/85 font-light leading-relaxed mb-8 max-w-xl">
              Chất liệu được tuyển chọn — Phong cách châu Âu<br />
              Thoải mái từ nhà ra phố — không cần thay đồ
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollTo('#section-products')}
                className="inline-flex items-center justify-center gap-2 bg-[#FAF8F5] hover:bg-[#D4AF37] text-[#1A1614] hover:text-[#1A1614] border border-[#FAF8F5] hover:border-[#D4AF37] font-sans text-sm font-bold tracking-wider px-7 py-3.5 rounded-[2px] shadow-luxury hover:shadow-gold-glow transition-all duration-200 uppercase cursor-pointer active:scale-[0.98] focus:outline-none"
              >
                <span>→ KHÁM PHÁ</span>
              </button>

              <button
                type="button"
                onClick={() => scrollTo('#section-deep-feature')}
                className="inline-flex items-center justify-center bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/15 font-sans text-sm font-semibold tracking-wider px-7 py-3.5 rounded-[2px] transition-all duration-200 cursor-pointer active:scale-[0.98] focus:outline-none uppercase"
              >
                XEM CHI TIẾT
              </button>
            </div>

            {/* Slogan */}
            <div className="mt-8 pt-6 border-t border-white/15">
              <p className="font-serif text-sm italic text-white/60 tracking-wide">
                "Dressed for Life — Even at Home"
              </p>
            </div>
          </motion.div>

          {/* Image column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border border-[#D4AF37]/30 bg-[#4A0D17]">
              {/* Main image */}
              <img
                src={heroCampaignImg}
                alt="Cô gái mặc set pijama màu kem uống cà phê buổi sáng — phong cách European Casual Luxury"
                className="w-full h-[420px] sm:h-[500px] md:h-[540px] object-cover object-center"
              />

              {/* Badge */}
              <div className="absolute top-4 left-4 bg-[#631521]/90 backdrop-blur-sm text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 rounded-[2px] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-md">
                NEW COLLECTION
              </div>

              {/* Inset card */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-36 sm:w-44 bg-[#2C201A]/95 backdrop-blur-md rounded-[3px] p-2 border border-[#D4AF37] shadow-2xl">
                <div className="relative overflow-hidden rounded-[2px] aspect-[4/3] mb-1.5 border border-white/10">
                  <img
                    src={fabricMacroImg}
                    alt="Kết cấu vải tự nhiên cao cấp"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <span className="font-serif text-xs font-semibold text-[#D4AF37] tracking-wider block">
                    Chất Liệu Tuyển Chọn
                  </span>
                  <span className="text-[9px] text-white/70 font-sans tracking-wide">
                    Mềm hơn theo thời gian
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
