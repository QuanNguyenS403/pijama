import { motion } from 'framer-motion'

export default function Section9LargeBlockText() {
  return (
    <section
      id="section-large-block-text"
      aria-label="Brand Manifesto Section"
      className="py-16 sm:py-20 md:py-24 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden text-center"
    >
      {/* Decorative overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4A0D17]/80 via-transparent to-[#4A0D17]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0, margin: "0px 0px 200px 0px" }}
          transition={{ duration: 0.8 }}
        >
          {/* Label */}
          <span className="font-serif text-sm sm:text-base font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-3">
            Brand Manifesto
          </span>

          {/* Main headline */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08] mb-6 sm:mb-7">
            Every girls deserve QuanNguyenS's Pyjama
          </h2>

          <div className="w-24 h-[2px] bg-[#D4AF37] mx-auto mb-8" />

          {/* Manifesto body */}
          <div className="space-y-5 text-base sm:text-lg md:text-xl font-sans text-white/90 font-normal leading-relaxed text-balance">
            <p>
              QuanNguyenS luôn tin rằng, vẻ đẹp cuốn hút nhất của một người phụ nữ chưa bao giờ chỉ nằm ở lớp trang điểm hay váy áo lộng lẫy để thế giới bên ngoài ngắm nhìn. Vẻ đẹp thực sự tỏa ra từ khí chất – và khí chất ấy được định hình rõ nét nhất trong cách nàng đối đãi với bản thân ngay cả khi chỉ có một mình.
            </p>
            <p>
              QuanNguyenS được tạo ra cho những ngày đó — Lấy cảm hứng từ phong cách sống châu Âu — nơi người ta mặc pijama lụa để đi chợ sáng, mặc set vải nhẹ để ra quán, và không ai thấy điều đó là lạ — chúng tôi mang triết lý đó về Hà Nội
            </p>
            <p>
              Chất liệu mềm mại tự nhiên — Đường cắt tinh tế — Màu sắc có chủ ý — Một bộ đồ, vô số câu chuyện
            </p>
          </div>

          {/* Brand slogan */}
          <div className="mt-8 mb-5">
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37] italic">
              " Style to be lived in "
            </p>
            <p className="font-sans text-sm text-white/60 mt-1.5 tracking-wider">
              Là con gái phải đẹp
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-sans tracking-[0.2em] uppercase text-[#D4AF37] flex-wrap">
            <span>◆ KHÔNG PHẢI ĐỒ NGỦ</span>
            <span>◆ LÀ ĐỒ SỐNG</span>
            <span>◆ STYLE TO BE LIVED IN</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
