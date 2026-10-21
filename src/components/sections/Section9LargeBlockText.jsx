import { motion } from 'framer-motion'

export default function Section9LargeBlockText() {
  return (
    <section
      id="section-large-block-text"
      aria-label="Brand Manifesto Section"
      className="py-14 sm:py-16 md:py-20 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden text-center"
    >
      {/* Decorative overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4A0D17]/80 via-transparent to-[#4A0D17]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Label */}
          <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-2.5">
            Brand Manifesto
          </span>

          {/* Main headline */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5 sm:mb-6">
            AUTHENTICITY & CRAFTSMANSHIP
          </h2>

          <div className="w-20 h-[2px] bg-[#D4AF37] mx-auto mb-6 sm:mb-7" />

          {/* Manifesto body */}
          <div className="space-y-4 sm:space-y-4.5 text-sm sm:text-base md:text-lg font-sans text-white/90 font-normal leading-relaxed text-balance">
            <p>
              Có những ngày bạn không muốn mặc gì quá phức tạp — Không muốn chọn lựa giữa thoải mái và trông đẹp — Không muốn thay đồ chỉ để bước ra ngoài mua cà phê
            </p>
            <p>
              QuanNguyenS được tạo ra cho những ngày đó — Lấy cảm hứng từ phong cách sống châu Âu — nơi người ta mặc pijama lụa để đi chợ sáng, mặc set vải nhẹ để ra quán, và không ai thấy điều đó là lạ — chúng tôi mang triết lý đó về Hà Nội
            </p>
            <p>
              Chất liệu mềm mại tự nhiên — Đường cắt tinh tế — Màu sắc có chủ ý — Một bộ đồ, vô số câu chuyện
            </p>
          </div>

          {/* Brand slogan */}
          <div className="mt-7 sm:mt-8 mb-4 sm:mb-5">
            <p className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#D4AF37] italic">
              "Dressed for Life — Even at Home"
            </p>
            <p className="font-sans text-xs sm:text-sm text-white/60 mt-1.5 tracking-wider">
              Mặc đẹp — kể cả khi ở nhà
            </p>
          </div>

          <div className="mt-6 sm:mt-7 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-sans tracking-[0.18em] sm:tracking-[0.2em] uppercase text-[#D4AF37] flex-wrap">
            <span>◆ KHÔNG PHẢI ĐỒ NGỦ</span>
            <span>◆ LÀ ĐỒ SỐNG</span>
            <span>◆ EUROPEAN CASUAL LUXURY</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
