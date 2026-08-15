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
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7A1D2B]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#4A0D17]/50 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Cột nội dung bên trái */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            {/* Tiêu đề phụ: Tiêu đề serif nhỏ màu vàng gold: "BỘ SƯU TẦM 2026" */}
            <span className="font-serif text-sm sm:text-base font-semibold tracking-[0.25em] text-[#D4AF37] uppercase mb-3">
              BỘ SƯU TẦM 2026
            </span>

            {/* Tiêu đề lớn: Tiêu đề serif lớn màu đen: "KHÁM PHÁ BỘ SƯU TẦM MỚI NHẤT" */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-bold text-[#111111] leading-[1.08] mb-6 tracking-tight">
              KHÁM PHÁ BỘ SƯU TẦM MỚI NHẤT
            </h1>

            {/* Mô tả: Văn bản inter màu trắng: "LUXURIOUS & COMFORTABLE..." */}
            <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-8 max-w-xl">
              LUXURIOUS & COMFORTABLE — Đắm chìm trong sự êm ái và mát mẻ thuần khiết của dòng vải đũi tự nhiên thượng hạng. Từng thớ vải dệt vi xốp thoáng khí nâng niu cơ thể trong không gian sống sang trọng, mang lại giấc ngủ thư thái và phong cách mặc nhà đỉnh cao.
            </p>

            {/* Nút CTA: Hai nút CTA: một nút nền trắng, chữ đỏ "Bộ Sưu Tầm"; một nút nền trong suốt, chữ vàng/nâu ấm "Tìm hiểu thêm" */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollTo('#section-products')}
                className="bg-white text-[#631521] hover:bg-[#FAF8F5] hover:shadow-lg font-sans text-sm font-bold tracking-wider px-7 py-3.5 rounded-[2px] transition-all duration-200 uppercase"
              >
                Bộ Sưu Tầm
              </button>

              <button
                onClick={() => scrollTo('#section-features')}
                className="bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-sans text-sm font-semibold tracking-wider px-7 py-3.5 rounded-[2px] transition-all duration-200"
              >
                Tìm hiểu thêm
              </button>
            </div>
          </motion.div>

          {/* Cột hình ảnh bên phải: Người phụ nữ ngồi trên ghế đẩu trong phòng dệt may + Inset New Wool Blends */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border border-[#D4AF37]/30 bg-[#4A0D17]">
              {/* Hình ảnh chính */}
              <img
                src={heroCampaignImg}
                alt="Người phụ nữ ngồi trên ghế đẩu trong phòng dệt may tựa vào chồng gối và chăn dệt"
                className="w-full h-[420px] sm:h-[500px] md:h-[540px] object-cover object-center"
              />

              {/* Chi tiết hình ảnh: Văn bản nhỏ "NEW ARRIVAL" */}
              <div className="absolute top-4 left-4 bg-[#631521]/90 backdrop-blur-sm text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 rounded-[2px] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-md">
                NEW ARRIVAL
              </div>

              {/* Khung nhỏ bên trong với kết cấu vải dệt được phóng to và văn bản: "New Wool Blends" */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 w-36 sm:w-44 bg-[#2C201A]/95 backdrop-blur-md rounded-[3px] p-2 border border-[#D4AF37] shadow-2xl">
                <div className="relative overflow-hidden rounded-[2px] aspect-[4/3] mb-1.5 border border-white/10">
                  <img
                    src={fabricMacroImg}
                    alt="Kết cấu vải dệt phóng to"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <span className="font-serif text-xs font-semibold text-[#D4AF37] tracking-wider block">
                    New Wool Blends
                  </span>
                  <span className="text-[9px] text-white/70 font-sans tracking-wide">
                    Kết cấu sợi vi xốp tự nhiên
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
