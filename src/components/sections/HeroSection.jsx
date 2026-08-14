import { motion } from 'framer-motion'
import { ArrowRight, Star, ShieldCheck, Sparkles, Eye, CheckCircle2, Wind } from 'lucide-react'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'

export default function HeroSection({ onOpenSizeGuide }) {
  return (
    <section
      id="hero"
      aria-label="QuanNguyenS 10PM Pijama Đũi"
      className="relative bg-[#FAF8F5] pt-24 pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20 overflow-hidden border-b border-[#E8DFD5]/60"
    >
      {/* Soft natural diffused light ambient background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E8DFD5]/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#F5F0EB]/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Top Micro Notification Strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-[#E8DFD5]"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#475569] uppercase">
              BỘ SƯU TẬP ĐỒ NGỦ ĐŨI TỰ NHIÊN CAO CẤP 2026
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex text-[#C5A059]" aria-label="5 sao chất lượng">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#1E293B]">
              4.9/5.0 (3.248+ khách hàng tin chọn)
            </span>
          </div>
        </motion.div>

        {/* Main Editorial Grid: Left Text (7 cols) + Right Image Showcase with Inset Macro (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            {/* Tagline pill */}
            <div className="inline-flex items-center gap-2 bg-[#F5F0EB] text-[#0F172A] px-3.5 py-1.5 rounded-[2px] w-fit mb-4 border border-[#E8DFD5]">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase">
                QUANNGUYENS LUXURY SLEEPWEAR
              </span>
            </div>

            {/* Main Headline: Serif Cormorant Garamond, Dark Charcoal */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-normal tracking-tight text-[#1A1614] leading-[1.08] mb-5 text-balance">
              10PM Pijama Đũi – <br />
              <span className="font-serif-italic text-[#8C7E74]">
                Nghệ Thuật Giấc Ngủ Mát Lành
              </span>
            </h1>

            {/* Subtext: Modern Clean Sans-Serif */}
            <p className="text-base sm:text-lg text-[#475569] font-light leading-relaxed mb-8 max-w-xl">
              Được dệt từ <strong className="font-semibold text-[#1A1614]">100% sợi vải đũi tự nhiên</strong> (linen/slub silk blend) với cấu trúc vi xốp thoáng khí độc đáo. Tự động điều hòa thân nhiệt, thấm hút mồ hôi vượt trội và xoa dịu làn da nhạy cảm cho những đêm nhẹ tênh.
            </p>

            {/* Primary & Secondary Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
              <a
                href="#san-pham-noi-bat"
                className="inline-flex items-center justify-center gap-3 bg-[#0F172A] hover:bg-[#1E293B] text-[#FAF8F5] text-xs font-bold tracking-[0.2em] uppercase px-8 py-4 rounded-[2px] transition-all duration-300 shadow-luxury hover:shadow-luxury-hover group"
              >
                <span>KHÁM PHÁ NGAY</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059] group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#fabric-story"
                className="inline-flex items-center justify-center gap-2 border border-[#8C7E74]/50 hover:border-[#0F172A] text-[#1A1614] text-xs font-semibold tracking-[0.18em] uppercase px-6 py-4 rounded-[2px] transition-colors bg-[#FFFFFF]/60 hover:bg-[#FFFFFF]"
              >
                <Wind className="w-4 h-4 text-[#64748B]" />
                <span>CHẤT ĐŨI VI XỐP</span>
              </a>
            </div>

            {/* Key Bullet Highlights (Tight, balanced, incorporating exact Vietnamese requirements) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-[#E8DFD5] text-xs">
              <div className="flex items-start gap-2.5 bg-[#FFFFFF]/70 p-3 rounded-[2px] border border-[#E8DFD5]">
                <CheckCircle2 className="w-4 h-4 text-[#788779] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#1A1614] block">Thiết kế đồ ngủ vải đũi tự nhiên cao cấp</span>
                  <span className="text-[#64748B] text-[11px]">May giấu chỉ French seams, cúc mộc dừa tinh tế</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#FFFFFF]/70 p-3 rounded-[2px] border border-[#E8DFD5]">
                <CheckCircle2 className="w-4 h-4 text-[#788779] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#1A1614] block">Thoáng khí, mềm mại cho những đêm nhẹ tênh</span>
                  <span className="text-[#64748B] text-[11px]">Công nghệ giặt xả vi sinh, càng giặt càng mềm êm</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Product & Model Showcase with Macro Close-Up Fabric Inset */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            {/* Main Bedroom Lifestyle Visual */}
            <div className="relative rounded-[4px] overflow-hidden shadow-luxury border border-[#E8DFD5] bg-[#FFFFFF]">
              <img
                src={heroCampaignImg}
                alt="Người mẫu mặc pijama vải đũi QuanNguyenS thư thái trong phòng ngủ tự nhiên"
                className="w-full h-[460px] sm:h-[520px] lg:h-[560px] object-cover object-center transition-transform duration-700 hover:scale-102"
              />

              {/* Top Floating Badge */}
              <div className="absolute top-4 left-4 bg-[#0F172A]/85 backdrop-blur-md text-[#FAF8F5] px-3.5 py-1.5 rounded-[2px] border border-white/10 text-[10px] font-bold tracking-[0.2em] uppercase shadow-sm">
                QUANNGUYENS LOOK 01
              </div>

              {/* Crucial Material Detail: High-Resolution Macro Close-up Inset Image */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-44 sm:w-52 bg-[#FAF8F5]/95 backdrop-blur-md rounded-[3px] p-2 sm:p-2.5 border-2 border-[#C5A059] shadow-2xl z-20 group"
              >
                <div className="relative overflow-hidden rounded-[2px] aspect-[4/3] mb-1.5">
                  <img
                    src={fabricMacroImg}
                    alt="Cận cảnh thớ vải đũi tự nhiên slubby breathable"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-1 left-1 bg-[#0F172A] text-[#FAF8F5] text-[8px] font-bold px-1.5 py-0.5 rounded-[1px] tracking-wider uppercase">
                    MACRO 10X
                  </div>
                </div>

                <div className="text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-[#0F172A] uppercase tracking-wider block">
                      Thớ Vải Đũi Slubby
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#788779]" />
                  </div>
                  <p className="text-[8.5px] text-[#64748B] leading-tight font-medium mt-0.5">
                    Thoáng khí vi xốp, sợi mộc tự nhiên mềm êm không bóng cứng.
                  </p>
                </div>
              </motion.div>

              {/* Bottom Left Product Title Overlay */}
              <div className="absolute bottom-4 left-4 max-w-[170px] sm:max-w-[190px] bg-[#FAF8F5]/90 backdrop-blur-md p-2.5 rounded-[2px] border border-[#E8DFD5] shadow-sm">
                <span className="text-[9px] font-bold tracking-wider text-[#64748B] uppercase block">
                  BỘ PIJAMA ĐŨI DÀI
                </span>
                <span className="font-serif text-sm font-semibold text-[#1A1614] block">
                  Trắng Ngà / Oatmeal
                </span>
                <span className="text-xs font-bold text-[#0F172A]">
                  599.000₫
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
