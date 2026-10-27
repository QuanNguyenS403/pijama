import { motion } from 'framer-motion'

export default function Section9LargeBlockText() {
  return (
    <section
      id="section-large-block-text"
      aria-label="Brand Manifesto Section"
      className="py-10 sm:py-12 md:py-14 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden text-center"
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
          <span className="font-serif text-sm sm:text-base font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-2 sm:mb-2.5">
            Brand Manifesto
          </span>

          {/* Main headline */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08] mb-4 sm:mb-5">
            Every girls deserve QuanNguyenS's Sleepwear
          </h2>

          <div className="w-24 h-[2px] bg-[#D4AF37] mx-auto mb-5 sm:mb-6" />

          {/* Manifesto body */}
          <div className="space-y-3.5 sm:space-y-4 text-base sm:text-lg md:text-xl font-sans text-white/90 font-normal leading-relaxed text-balance">
            <p>
              Là con gái, đặc quyền lớn nhất chính là được yêu chiều bản thân trong mọi khoảnh khắc. Đừng đợi đến những dịp đặc biệt mới cho phép mình xinh đẹp; nàng xứng đáng được rạng rỡ ngay cả khi ở nhà một mình — bởi suy cho cùng, mình đẹp là để cho chính mình ngắm nhìn và tận hưởng trước tiên.
            </p>
            <p>
              Thấu hiểu điều đó, QuanNguyenS mang đến những thiết kế Sleepwear không chỉ dừng lại ở khái niệm 'đồ ngủ'{ '\u00a0' }. Sleepwear của chúng tôi là sự kết hợp hoàn hảo giữa chất liệu mềm mại và form dáng thanh lịch giúp nàng luôn cảm thấy tự tin, thoải mái tối đa nhưng vẫn đủ kín đáo, lịch sự để tự tin sải bước trên từng con phố.{ '\u00a0\u00a0' }
            </p>
            <p>
              Trên hành trình học cách yêu chiều bản thân, hãy để QuanNguyenS đồng hành cùng nàng nhé!{'\u00a0'}
            </p>
          </div>

          {/* Brand slogan */}
          <div className="mt-6 mb-2">
            <p className="font-sans text-sm text-white/60 tracking-wider">
              Là con gái phải yêu lấy mình - gửi các quý cô xinh đẹp{'\u00a0'}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
