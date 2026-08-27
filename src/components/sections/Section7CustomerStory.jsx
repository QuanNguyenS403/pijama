import { motion } from 'framer-motion'
import storyPinkTeaImg from '../../assets/images/story-pink-tea.jpg'

export default function Section7CustomerStory() {
  return (
    <section
      id="section-customer-story"
      aria-label="Authenticity and Craftsmanship Section"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Ambient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              AUTHENTIC & CRAFTSMANSHIP
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-6">
              Không mass production
              <span className="block text-[#D4AF37] italic font-light mt-1 text-2xl sm:text-3xl">
                Mỗi đường may là một quyết định
              </span>
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-4">
              Chúng tôi không sản xuất hàng loạt để bán rẻ. Chúng tôi chọn từng mét vải, kiểm từng đường chỉ, và quyết định từng màu sắc — để mỗi bộ QuanNguyenS đến tay bạn đều xứng đáng được mặc nhiều lần hơn, không chỉ một lần
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Từng mét vải được chọn lọc thủ công. Thiết kế được kiểm duyệt nghiêm. Số lượng có giới hạn — vì chúng tôi muốn làm tốt, không chỉ làm nhiều
            </p>

            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37] text-lg">✦</span>
                <span className="font-sans text-sm font-semibold text-white">Thiết kế giới hạn theo mùa</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37] text-lg">✦</span>
                <span className="font-sans text-sm font-semibold text-white">Chất liệu tuyển chọn thủ công, kiểm định chất lượng nghiêm ngặt</span>
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
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 bg-[#1E1510] aspect-[4/3] w-full group">
              <img
                src={storyPinkTeaImg}
                alt="Bộ pijama The Daybreak Set sọc hồng QuanNguyenS — Không mass production, tinh tế từng chi tiết"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-[#1E1510]/90 backdrop-blur-sm p-3.5 rounded-[2px] border border-white/10">
                <span className="font-serif text-sm font-bold text-[#D4AF37] block">
                  Limited Edition — Seasonal
                </span>
                <span className="text-xs text-white/80 font-sans">
                  Mỗi mùa ra mắt một số lượng có giới hạn — vì chất lượng không thể vội
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
