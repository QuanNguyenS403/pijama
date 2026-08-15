import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote, ArrowRight, X } from 'lucide-react'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function Section7CustomerStory() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section
      id="section-customer-story"
      aria-label="Customer Story Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Bên trái: Văn bản mô tả về trải nghiệm của khách hàng và một nút CTA "Đọc Câu Chuyện" màu vàng gold */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <div className="flex items-center gap-1 text-[#D4AF37] mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-xs font-sans font-semibold text-white/80 ml-2">
                5.0 Đánh Giá Trải Nghiệm
              </span>
            </div>

            {/* Tiêu đề: Tiêu đề serif "SẢN PHẨM DỆT MAY CỦA CHÚNG TÔI TRONG NGÔI NHÀ BẠN" */}
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.15] mb-6">
              SẢN PHẨM DỆT MAY CỦA CHÚNG TÔI TRONG NGÔI NHÀ BẠN
            </h2>

            <div className="relative pl-6 border-l-2 border-[#D4AF37] mb-8">
              <Quote className="w-8 h-8 text-[#D4AF37]/30 absolute -top-3 left-4 -z-10" />
              <p className="font-sans text-base sm:text-lg text-white/90 italic leading-relaxed mb-3">
                "Bộ pijama và tấm chăn đũi dệt mộc này đã hoàn toàn thay đổi cảm giác thư giãn mỗi tối của tôi. Cảm giác mặc vào nhẹ bẫng, êm ái và mát lành tựa như làn gió nhẹ mùa thu."
              </p>
              <div className="font-sans text-sm font-semibold text-[#D4AF37]">
                Chị Mai Anh — <span className="font-normal text-white/70">Kiến trúc sư nội thất, Hà Nội</span>
              </div>
            </div>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Hơn 10.000 gia đình đã tin chọn sản phẩm đũi cao cấp của chúng tôi để đồng hành cùng từng khoảnh khắc nghỉ ngơi, uống trà, đọc sách và tận hưởng trọn vẹn sự bình yên trong chính tổ ấm của mình.
            </p>

            {/* Nút CTA "Đọc Câu Chuyện" màu vàng gold */}
            <div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2.5 bg-[#D4AF37] hover:bg-[#B8860B] text-[#2C201A] font-sans text-sm font-bold tracking-wider px-8 py-3.5 rounded-[2px] transition-all duration-300 shadow-md uppercase"
              >
                <span>Đọc Câu Chuyện</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Bên phải: Một bức ảnh ấm áp của một người phụ nữ trong một căn phòng khách thoải mái, được bao quanh bởi các sản phẩm dệt, nhìn ra cửa sổ, cầm một tách trà */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 bg-[#1E1510]">
              <img
                src={lifestyleNightImg}
                alt="Người phụ nữ trong phòng khách thoải mái bao quanh bởi các sản phẩm dệt may, nhìn ra cửa sổ cầm tách trà"
                className="w-full h-[420px] sm:h-[500px] object-cover object-center"
              />
              
              {/* Badge góc */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#2C201A]/90 backdrop-blur-sm p-3.5 rounded-[2px] border border-white/10">
                <span className="font-serif text-sm font-bold text-[#D4AF37] block">
                  Không Gian Sống Thư Thái
                </span>
                <span className="text-xs text-white/80 font-sans">
                  Sự hòa quyện giữa chất liệu tự nhiên và ánh sáng ấm áp trong ngôi nhà.
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Story Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#2C201A] border-2 border-[#D4AF37] p-6 sm:p-8 rounded-[4px] max-w-xl w-full relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="font-serif text-xs font-semibold text-[#D4AF37] uppercase tracking-widest block mb-2">
              Câu chuyện từ khách hàng
            </span>
            <h3 className="font-serif text-2xl font-bold text-white mb-4">
              "Tìm Thấy Sự An Yên Giữa Nhịp Sống Hối Hả"
            </h3>
            <div className="space-y-3 text-sm text-white/80 font-sans leading-relaxed mb-6">
              <p>
                "Sau những giờ làm việc căng thẳng tại văn phòng thiết kế, điều tôi mong mỏi nhất là được trở về nhà, khoác lên mình bộ đồ đũi mềm mại và thưởng thức một tách trà nóng bên khung cửa sổ."
              </p>
              <p>
                "Vải đũi mộc mang lại cảm giác thân thuộc, không gò bó, giúp tôi thả lỏng hoàn toàn các giác quan và có những giấc ngủ sâu thực sự chất lượng."
              </p>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="bg-[#D4AF37] text-[#2C201A] font-sans text-xs font-bold px-6 py-2.5 rounded-[2px] uppercase hover:bg-[#B8860B]"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
