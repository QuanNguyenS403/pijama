import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Heart } from 'lucide-react'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'
import craftsmanshipImg from '../../assets/images/craftsmanship-detail.jpg'

export default function HeroSection() {
  const scrollTo = (selector) => {
    const el = document.querySelector(selector)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      aria-label="Hero Section"
      className="relative min-h-[92vh] flex items-center justify-center bg-[#FAF8F5] pt-24 pb-16 md:py-28 overflow-hidden border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Premium Editorial Copywriting (6 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            {/* Top Micro Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 bg-[#F5F0EB] text-[#1A1614] border border-[#E8DFD5] px-3.5 py-1.5 rounded-[2px] mb-5 w-fit shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="text-[10.5px] font-bold tracking-[0.2em] uppercase font-sans">
                SET PIJAMA TỰ NHIÊN • BỘ SƯU TẬP MỚI
              </span>
            </div>

            {/* Giant Editorial Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-normal leading-[1.08] text-[#1A1614] tracking-tight mb-5 text-balance">
              Dressed for Life. <br />
              <span className="font-serif-italic font-normal text-[#8C7E74]">
                Even at Home.
              </span>
            </h1>

            {/* Lead Narrative Subtitle */}
            <p className="text-base sm:text-lg text-[#475569] font-light leading-relaxed mb-8 max-w-xl">
              Set pijama tự nhiên QuanNguyenS phong cách European Casual Luxury mang lại cảm giác mềm mại, thoáng mát suốt đêm dài — thoải mái dạo phố, thanh lịch đón khách ngay tại nhà.
            </p>

            {/* CTA Buttons Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
              <button
                onClick={() => scrollTo('#pricing-section')}
                className="inline-flex items-center justify-center gap-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-xs font-bold tracking-[0.2em] uppercase px-7 py-4 rounded-[2px] transition-all shadow-luxury group"
                aria-label="Chọn bộ pijama ngay"
              >
                <span>CHỌN BỘ PIJAMA NGAY</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => scrollTo('#fabric-story')}
                className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-[#F5F0EB] text-[#1A1614] border border-[#D9CDBF] text-xs font-bold tracking-[0.16em] uppercase px-6 py-4 rounded-[2px] transition-colors"
                aria-label="Tìm hiểu chất liệu"
              >
                <span>Khám Phá Chất Liệu</span>
              </button>
            </div>

            {/* Reassurance Trust Metrics */}
            <div className="pt-6 border-t border-[#E8DFD5] grid grid-cols-3 gap-3 text-center sm:text-left">
              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] block">4.9★</span>
                <span className="text-[11px] text-[#64748B] font-light">Từ 1.200+ đánh giá</span>
              </div>
              <div className="border-x border-[#E8DFD5] px-2">
                <span className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] block">30 Ngày</span>
                <span className="text-[11px] text-[#64748B] font-light">Đổi trả tại nhà</span>
              </div>
              <div>
                <span className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] block">100%</span>
                <span className="text-[11px] text-[#64748B] font-light">Sợi tự nhiên cao cấp</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Visual & Floating Micro Proof Cards (6 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            {/* Main Editorial Campaign Image with Gold Accent Frame */}
            <div className="relative rounded-[3px] overflow-hidden shadow-luxury border border-[#E8DFD5] bg-[#F5F0EB]">
              <img
                src={heroCampaignImg}
                alt="Bộ Pijama QuanNguyenS thanh lịch và thoải mái"
                className="w-full h-[460px] sm:h-[540px] md:h-[580px] object-cover object-center"
              />

              {/* Top Floating Badge */}
              <div className="absolute top-4 left-4 bg-[#0F172A]/90 backdrop-blur-md text-[#FAF8F5] px-3.5 py-1.5 rounded-[2px] text-[10px] font-bold tracking-[0.2em] uppercase border border-[#C5A059]/40">
                EUROPEAN CASUAL LUXURY
              </div>

              {/* Bottom Inset Floating Card: Macro Texture Preview */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[#FAF8F5]/95 backdrop-blur-md p-3.5 rounded-[3px] border border-[#E8DFD5] shadow-luxury max-w-[200px] sm:max-w-[230px]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={fabricMacroImg}
                    alt="Kết cấu sợi tự nhiên"
                    className="w-12 h-12 rounded-[2px] object-cover border border-[#E8DFD5] shrink-0"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-[#1A1614] block leading-tight">
                      100% Sợi Tự Nhiên
                    </span>
                    <span className="text-[10px] text-[#64748B] font-light block mt-0.5">
                      Xử lý vi sinh xoa mềm
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
