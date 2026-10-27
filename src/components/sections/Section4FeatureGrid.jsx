import { motion } from 'framer-motion'
import { Wind, Droplets, Sparkles, Heart } from 'lucide-react'

export default function Section4FeatureGrid() {
  const features = [
    {
      icon: Wind,
      title: 'Cam kết chất lượng',
      englishSubtitle: 'SẢN PHẨM MAY THỦ CÔNG TỈ MỈ',
      description:
        'Cam kết sản phẩm thực tế giống hình ảnh quảng cáo, từ từng đường kim mũi chỉ, đường may tỉ mỉ, cho đến form dáng.',
    },
    {
      icon: Droplets,
      title: 'Miễn phí vận chuyển',
      englishSubtitle: 'NHẬN HÀNG TRONG 2-4 NGÀY',
      description:
        'Miễn phí vận chuyển toàn quốc với đơn hàng từ 500.000VNĐ',
    },
    {
      icon: Sparkles,
      title: 'Bảo hành miễn phí',
      englishSubtitle: '',
      description:
        '1 đổi 1 trong vòng 7 ngày kể từ ngày nhận hàng đối với các lỗi theo chính sách đổi trả.',
    },
    {
      icon: Heart,
      title: 'Ưu đãi hội viên',
      englishSubtitle: 'HÀNG NGÀN VOUCHER ĐỘC QUYỀN MEMBERSHIP',
      description:
        'Nhận ngay ưu đãi giảm giá cho đơn hàng đầu tiên khi đăng ký. Tận hưởng chính sách tích điểm thăng hạng, quà tặng sinh nhật cá nhân hóa và đặc quyền sở hữu sớm các bộ sưu tập mới nhất.',
    },
  ]

  return (
    <section
      id="section-features"
      aria-label="Feature Grid"
      className="py-12 sm:py-14 md:py-16 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            ƯU ĐÃI ĐỘC QUYỀN
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            ĐẶC QUYỀN KHÁCH HÀNG
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-3" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-7">
          {features.map((item, index) => {
            const IconComp = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0, margin: '0px 0px 200px 0px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 sm:p-7 md:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="mb-2.5">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1614] group-hover:text-[#631521] transition-colors">
                      {item.title}
                    </h3>
                    {item.englishSubtitle && item.englishSubtitle.trim() && (
                      <span className="text-[10.5px] font-sans font-medium text-[#8C7E74] uppercase tracking-wider block mt-0.5">
                        {item.englishSubtitle}
                      </span>
                    )}
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
    </section>
  )
}
