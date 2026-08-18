import { motion } from 'framer-motion'
import { Wind, Droplets, Sparkles, Heart } from 'lucide-react'

export default function Section4FeatureGrid() {
  const features = [
    {
      icon: Wind,
      title: 'Thoáng khí tự nhiên',
      englishSubtitle: 'Naturally Breathable',
      description:
        'Chất vải được dệt thưa tự nhiên — thoáng theo từng nhịp thở mà không mỏng manh. Bạn sẽ mát về mùa hè, ấm vừa đủ về mùa thu. Cơ thể tự điều chỉnh, bạn không cần lo',
    },
    {
      icon: Droplets,
      title: 'Mềm hơn theo thời gian',
      englishSubtitle: 'Gets Better with Wear',
      description:
        'Khác với chất liệu thông thường, vải tự nhiên càng giặt càng mềm. Một bộ QuanNguyenS sẽ trở thành người bạn thân nhất của bạn sau 3 tháng mặc',
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
      className="py-20 sm:py-24 md:py-28 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            CHẤT VẢI CỦA CHÚNG TÔI
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Không phải may mặc thông thường
            <span className="block text-[#631521] italic font-light mt-1 text-2xl sm:text-3xl md:text-4xl">
              Đây là lý do chất liệu của chúng tôi thay đổi mọi thứ
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {features.map((item, index) => {
            const IconComp = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-8 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-14 h-14 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <IconComp className="w-6 h-6" />
                  </div>

                  <div className="mb-3">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] group-hover:text-[#631521] transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[11px] font-sans font-medium text-[#8C7E74] uppercase tracking-wider block mt-0.5">
                      {item.englishSubtitle}
                    </span>
                  </div>

                  <p className="font-sans text-sm sm:text-base text-[#4A3F38] font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="w-12 h-[1px] bg-[#D4AF37]/50 mt-6 group-hover:w-20 transition-all duration-300" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
