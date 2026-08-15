import { motion } from 'framer-motion'
import craftsmanshipImg from '../../assets/images/craftsmanship-detail.jpg'

export default function Section5DarkContrast() {
  return (
    <section
      id="section-dark-contrast"
      aria-label="Dark Contrast Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Bên trái: Văn bản mô tả inter màu trắng về câu chuyện thương hiệu */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            {/* Tiêu đề: Tiêu đề serif lớn màu vàng gold */}
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              Câu Chuyện Nghệ Nhân
            </span>
            
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#D4AF37] leading-[1.12] mb-6">
              NGHỆ THUẬT & TAY NGHỀ THỦ CÔNG CỦA CHÚNG TÔI
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-6">
              Mỗi sản phẩm dệt may của chúng tôi là kết tinh từ niềm đam mê gìn giữ nghề dệt đũi thủ công truyền thống. Chúng tôi tin rằng trang phục mặc nhà và các vật dụng dệt may gia đình không chỉ đơn thuần là đồ dùng thường nhật, mà là biểu tượng của phong cách sống chậm, tinh tế và an yên.
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Bằng cách kết hợp giữa kỹ thuật kéo sợi mộc vi xốp và phương pháp cắt may giấu chỉ chuẩn Haute Couture, chúng tôi kiến tạo nên những tác phẩm mềm mại, thoáng mát theo từng nhịp thở của thời gian.
            </p>

            <div className="flex items-center gap-6 pt-4 border-t border-white/10">
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37] block">
                  30+ Năm
                </span>
                <span className="text-xs font-sans text-white/70 uppercase tracking-wider">
                  Kinh Nghiệm Dệt May
                </span>
              </div>
              <div className="w-[1px] h-10 bg-white/20" />
              <div>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37] block">
                  100%
                </span>
                <span className="text-xs font-sans text-white/70 uppercase tracking-wider">
                  Sợi Đũi Tự Nhiên
                </span>
              </div>
            </div>
          </motion.div>

          {/* Bên phải: Bức ảnh cận cảnh chất lượng cao của kết cấu vải đũi hồng sọc trắng */}
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
                alt="Cận cảnh chất lượng cao của kết cấu vải đũi hồng sọc trắng"
                className="w-full h-[400px] sm:h-[480px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-[#1E1510]/85 backdrop-blur-md p-4 rounded-[2px] border border-[#D4AF37]/30">
                <span className="font-serif text-sm font-semibold text-[#D4AF37] block">
                  Kết Cấu Vải Đũi Hồng Sọc Trắng
                </span>
                <span className="text-xs text-white/80 font-sans mt-0.5 block">
                  Sợi đũi vi xốp mềm mại với đường kẻ thanh thoát dệt nhuộm thủ công.
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
