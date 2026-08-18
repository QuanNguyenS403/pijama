import { motion } from 'framer-motion'
import craftsmanshipImg from '../../assets/images/craftsmanship-detail.jpg'

export default function Section5DarkContrast() {
  return (
    <section
      id="section-dark-contrast"
      aria-label="Brand Story Section"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#4A0D17]/60 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left: Brand Story text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              CÂU CHUYỆN PHÍA SAU
            </span>
            
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-6">
              NGHỆ THUẬT & TÂY
              <span className="block text-[#D4AF37] italic font-light mt-1">
                MÀ VẪN LÀ MÌNH
              </span>
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-4">
              QuanNguyenS bắt đầu từ một câu hỏi đơn giản: Tại sao mình phải chọn giữa thoải mái và trông đẹp?
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-4">
              Ở Paris, ở Milan, ở Copenhagen — người ta mặc set đồ nhẹ tênh ra phố mua bánh mì buổi sáng và không ai nhìn. Ở Hà Nội, mặc pijama ra ngoài vẫn còn là chủ đề bàn tán
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Với chất vải tự nhiên được tuyển chọn kỹ lưỡng, đường may tinh tế, và thiết kế lấy cảm hứng từ phong cách châu Âu — QuanNguyenS tạo ra những bộ pijama đủ đẹp để mặc ra ngoài, đủ thoải mái để ngủ trong đó
            </p>

            <div className="flex items-center gap-8 pt-4 border-t border-white/10">
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37] block">
                  100%
                </span>
                <span className="text-xs font-sans text-white/70 uppercase tracking-wider">
                  Sợi tự nhiên thuần khiết
                </span>
              </div>
              <div className="w-[1px] h-10 bg-white/20" />
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37] block">
                  0
                </span>
                <span className="text-xs font-sans text-white/70 uppercase tracking-wider">
                  lý do để không mặc ra ngoài
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#1E1510] group">
              <img
                src={craftsmanshipImg}
                alt="Set pijama cao cấp QuanNguyenS — European Casual Luxury phong cách sống"
                className="w-full h-[400px] sm:h-[480px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-[#1E1510]/85 backdrop-blur-md p-4 rounded-[2px] border border-[#D4AF37]/30">
                <span className="font-serif text-sm font-semibold text-[#D4AF37] block">
                  European Casual Luxury
                </span>
                <span className="text-xs text-white/80 font-sans mt-0.5 block">
                  Pijama không chỉ để ngủ — mà để sống trong đó
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
