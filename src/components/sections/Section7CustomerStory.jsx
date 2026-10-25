import { motion } from 'framer-motion'
import storyPinkTeaImg from '../../assets/images/story-pink-tea.jpg'

export default function Section7CustomerStory() {
  return (
    <section
      id="section-customer-story"
      aria-label="Authenticity and Craftsmanship Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Ambient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0, margin: "0px 0px 200px 0px" }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              AUTHENTIC & CRAFTSMANSHIP
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-6">
              SỨ MỆNH
              <span className="block text-[#D4AF37] italic font-normal mt-1 text-2xl sm:text-3xl">
                Every girls deserve QuanNguyenS's Pyjama
              </span>
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-normal leading-relaxed mb-4">
              QuanNguyenS tin rằng, vẻ đẹp cuốn hút nhất của người phụ nữ không nằm ở lớp váy áo lộng lẫy để chiều lòng thế giới ngoài kia, mà tỏa ra từ khí chất tự tại khi nàng khép cánh cửa nhà và trở về với chính mình. Sứ mệnh của thương hiệu không đơn thuần là tạo ra những thiết kế đồ ngủ chỉn chu về ngoại hình, mà là đánh thức thần thái thanh lịch và sự kiêu hãnh ngầm bên trong mỗi cô gái. Bằng những phom dáng chuẩn mực giúp giải phóng cơ thể trong sự thoải mái tuyệt đối, chúng mình đồng hành cùng nàng nuôi dưỡng thói quen yêu chiều bản thân — bởi khi một người phụ nữ biết trân quý cả những khoảnh khắc riêng tư nhất, khí chất của nàng sẽ tự khắc tỏa sáng mà chẳng cần bất kỳ sự phô trương nào.
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-normal leading-relaxed mb-8">
              QuanNguyenS tin rằng vẻ đẹp đích thực cần thời gian để thành hình. Thay vì sản xuất ồ ạt, QuanNguyenS gói ghém tâm huyết vào từng bộ sưu tập mang đến mọi người.
            </p>

            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37] text-lg">✦</span>
                <span className="font-sans text-sm font-semibold text-white">Là con gái phải đẹp</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#D4AF37] text-lg">✦</span>
                <span className="font-sans text-sm font-semibold text-white">QuanNguyenS</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0, margin: "0px 0px 200px 0px" }}
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
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
