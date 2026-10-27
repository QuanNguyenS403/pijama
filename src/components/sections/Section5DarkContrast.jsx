import { motion } from 'framer-motion'
import storyBrownCraftsmanshipImg from '../../assets/images/story-brown-craftsmanship.jpg'

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
            viewport={{ once: true, amount: 0, margin: "0px 0px 200px 0px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              CÂU CHUYỆN THƯƠNG HIỆU
            </span>
            
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-6">
              THỜI TRANG
              <span className="block text-[#D4AF37] italic font-normal mt-1">
                MÀ VẪN LÀ CHÍNH MÌNH
              </span>
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-normal leading-relaxed mb-4">
              QuanNguyenS bắt đầu từ một câu hỏi đơn giản: Liệu sự thoải mái có thể song hành cùng cái đẹp?
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-normal leading-relaxed mb-4">
              Giữa lòng Paris, ở Milan hay Copenhagen — người ta tìm thấy vẻ đẹp trong chính sự ngẫu hứng đầy thanh lịch: mặc set đồ nhẹ tênh ra phố mua bánh mì buổi sáng và không ai nhìn. Ở Hà Nội, mặc sleepwear ra ngoài vẫn còn là chủ đề bàn tán
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-normal leading-relaxed mb-8">
              Mang nguồn cảm hứng thẩm mỹ đương đại từ Châu Âu cùng ngôn ngữ thiết kế tinh tế, QuanNguyenS định nghĩa lại chuẩn mực mặc đẹp thường thấy. Chúng tôi tạo ra những thiết kế đủ thời thượng để tôn vinh bản sắc riêng khi đi dạo phố, và đủ thoải mái để bạn luôn là chính mình trong mọi khoảnh khắc.
            </p>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0, margin: "0px 0px 200px 0px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#1E1510] aspect-[4/3] w-full group">
              <img
                src={storyBrownCraftsmanshipImg}
                alt="The Hearth Set sọc nâu QuanNguyenS — Style To Be Lived In tay nghề may đo tinh xảo"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
