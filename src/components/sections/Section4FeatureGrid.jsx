import { motion } from 'framer-motion'
import { Wind, Droplets, Sparkles, Heart } from 'lucide-react'

export default function Section4FeatureGrid() {
  const features = [
    {
      icon: Wind,
      title: 'Cam kết chất lượng',
      englishSubtitle: 'SẢN PHẨM MAY THỦ CÔNG TỈ MỈ',
      description:
        'Chất vải được dệt thưa tự nhiên — thoáng theo từng nhịp thở mà không mỏng manh. Bạn sẽ mát về mùa hè, ấm vừa đủ về mùa thu. Cơ thể tự điều chỉnh, bạn không cần lo',
    },
    {
      icon: Droplets,
      title: 'Miễn phí vận chuyển',
      englishSubtitle: 'NHẬN HÀNG TRONG 1-3 NGÀY',
      description:
        'Miễn phí vận chuyển toàn quốc với đơn hàng từ 500.000VNĐ',
    },
    {
      icon: Sparkles,
      title: 'Nhăn một cách có chủ ý',
      englishSubtitle: 'Effortless Texture',
      description:
        'Bề mặt vải mịn màng, kết cấu gợn nhẹ tự nhiên — không phải lỗi, đó là đặc điểm. Tạo cảm giác effortless chic mà bạn không cần cố',
    },
    {
      icon: Heart,
      title: 'Thân thiện với da nhạy cảm',
      englishSubtitle: 'Sensitive Skin Safe',
      description:
        'Không hóa chất tổng hợp. Không tĩnh điện. Không gây ngứa. Phù hợp với da nhạy cảm và làn da trẻ năng động',
    },
  ]

  return (
    <section
      id="section-features"
      aria-label="Feature Grid"
      className="py-14 sm:py-16 md:py-20 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-12">
          <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            CHẤT VẢI CỦA CHÚNG TÔI
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Không phải may mặc thông thường
            <span className="block text-[#631521] italic font-normal mt-1 text-2xl sm:text-3xl md:text-4xl">
              Đây là lý do chất liệu của chúng tôi thay đổi mọi thứ
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-3.5" />
        </div>

        {/* Grid - Refined & slightly more compact */}
        <div className="max-w-[1180px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7">
            {features.map((item, index) => {
              const IconComp = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white p-6 sm:p-7 md:p-8 rounded-[4px] border border-[#E8DFD5] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="mb-2 sm:mb-2.5">
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1614] group-hover:text-[#631521] transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-[10px] sm:text-[11px] font-sans font-medium text-[#8C7E74] uppercase tracking-wider block mt-0.5">
                        {item.englishSubtitle}
                      </span>
                    </div>

                    <p className="font-sans text-xs sm:text-sm text-[#4A3F38] font-normal leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="w-10 h-[1px] bg-[#D4AF37]/50 mt-4 sm:mt-5 group-hover:w-16 transition-all duration-300" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
