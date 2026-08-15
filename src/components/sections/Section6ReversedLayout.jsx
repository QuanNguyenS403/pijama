import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Sparkles, X } from 'lucide-react'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'

export default function Section6ReversedLayout() {
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  return (
    <section
      id="section-reversed"
      aria-label="Reversed Layout Section"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Bên trái: Hình ảnh cận cảnh của kết cấu vải dệt có một biểu tượng play button video nhỏ */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 order-2 lg:order-1"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border border-[#D4AF37]/30 bg-[#4A0D17] group cursor-pointer"
                 onClick={() => setVideoModalOpen(true)}>
              <img
                src={fabricMacroImg}
                alt="Cận cảnh kết cấu vải dệt tự nhiên vi xốp"
                className="w-full h-[380px] sm:h-[450px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />

              {/* Lớp phủ mờ nhẹ */}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

              {/* Biểu tượng play button video nhỏ */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#D4AF37] text-[#2C201A] flex items-center justify-center shadow-gold-glow group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                </div>
              </div>

              {/* Nhãn video nhỏ */}
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="inline-block bg-[#2C201A]/80 backdrop-blur-sm text-[#D4AF37] text-xs font-sans font-medium px-4 py-1.5 rounded-[2px] border border-[#D4AF37]/30">
                  Xem phim tài liệu quy trình dệt thoi thủ công (01:45)
                </span>
              </div>
            </div>
          </motion.div>

          {/* Bên phải: Tiêu đề serif "SỰ KẾT HỢP HOÀN HẢO" và văn bản mô tả */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-center"
          >
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              Haute Harmony
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-6">
              SỰ KẾT HỢP HOÀN HẢO
            </h2>

            <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-6">
              Sự hòa quyện tuyệt đối giữa kỹ thuật dệt truyền thống và tư duy thiết kế hiện đại. Chúng tôi chắt lọc những sợi đũi tốt nhất, kết hợp độ rủ tự nhiên với cấu trúc sợi thông thoáng, tạo nên cảm giác mặc nhẹ như không khí.
            </p>

            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Mỗi mét vải mang trong mình độ đàn hồi tự nhiên và khả năng thấm hút vượt bậc, giúp giữ cho thân nhiệt luôn ở trạng thái cân bằng lý tưởng nhất dù trong mùa hè nóng nực hay tiết trời se lạnh giao mùa.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                <div>
                  <span className="font-sans text-sm font-semibold text-white block">Thoáng Khí Tự Nhiên</span>
                  <span className="font-sans text-xs text-white/70">Không bết dính mồ hôi</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
                <div>
                  <span className="font-sans text-sm font-semibold text-white block">Thân Thiện Làn Da</span>
                  <span className="font-sans text-xs text-white/70">Dịu nhẹ cho da nhạy cảm</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Video Modal Preview */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#2C201A] border border-[#D4AF37] p-6 rounded-[4px] max-w-lg w-full relative text-center">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-3 right-3 text-white/70 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-serif text-xl font-bold text-[#D4AF37] mb-3">
              Thước Phim Chế Tác Vải Đũi Thủ Công
            </h3>
            <p className="font-sans text-sm text-white/80 mb-6">
              Xem chi tiết hành trình từ sợi tơ mộc đến những tấm vải đũi tuyệt mỹ qua bàn tay tài hoa của người thợ thủ công.
            </p>
            <div className="aspect-video bg-black/60 rounded-[2px] flex items-center justify-center border border-white/10 mb-4">
              <span className="font-serif text-[#D4AF37] text-sm">
                [Trình phát video đang sẵn sàng phát]
              </span>
            </div>
            <button
              onClick={() => setVideoModalOpen(false)}
              className="bg-[#631521] text-white font-sans text-xs font-bold px-6 py-2.5 rounded-[2px] uppercase hover:bg-[#7A1D2B]"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
