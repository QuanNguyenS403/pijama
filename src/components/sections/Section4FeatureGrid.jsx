import { motion } from 'framer-motion'
import { Heart, Scale, Leaf } from 'lucide-react'

// Custom Needle and Thread icon
function NeedleThreadIcon({ className = 'w-6 h-6' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Needle */}
      <path d="M4 20L18.5 5.5a2.121 2.121 0 0 0-3-3L1 17l3 3z" />
      <path d="M18.5 5.5L20 4a1.5 1.5 0 0 1 2 2l-1.5 1.5" />
      {/* Eye hole */}
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
      {/* Thread loop */}
      <path d="M17.5 6.5C19 9 22 10 22 14c0 3-2 5-5 5-2 0-3.5-1-4-2.5" />
    </svg>
  )
}

export default function Section4FeatureGrid() {
  const features = [
    {
      icon: Heart,
      isCustom: false,
      title: '100% Dệt Thủ Công',
      englishSubtitle: '100% Hand-woven',
      description: 'Mỗi mét vải đũi được dệt tỉ mỉ trên khung cửi truyền thống, tạo nên kết cấu vi xốp độc bản không máy móc công nghiệp nào có thể sao chép.',
    },
    {
      icon: Scale,
      isCustom: false,
      title: 'Nguồn Gốc Bền Vững',
      englishSubtitle: 'Sustainably Sourced',
      description: 'Quy trình khai thác sợi tự nhiên có trách nhiệm với môi trường, cân bằng hệ sinh thái và bảo tồn làng nghề dệt truyền thống lâu đời.',
    },
    {
      icon: Leaf,
      isCustom: false,
      title: 'Nguyên Liệu Thân Thiện Môi Trường',
      englishSubtitle: 'Eco-friendly Materials',
      description: '100% sợi thực vật hữu cơ phân hủy sinh học, hoàn toàn không chứa hóa chất độc hại, bảo vệ làn da nhạy cảm và an lành cho gia đình.',
    },
    {
      icon: NeedleThreadIcon,
      isCustom: true,
      title: 'Nghệ Nhân Bậc Thầy Chứng Nhận',
      englishSubtitle: 'Master Craftsman Approved',
      description: 'Từng đường kim mũi chỉ, mép gấp giấu viền và cúc mộc đều được kiểm định khắt khe bởi các nghệ nhân may dệt giàu kinh nghiệm.',
    },
  ]

  return (
    <section
      id="section-features"
      aria-label="Feature Grid"
      className="py-20 sm:py-24 md:py-28 bg-[#FAF8F5] text-[#2C201A] border-b border-[#E8DFD5]"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Tiêu đề: Tiêu đề serif lớn: "CÁCH CHÚNG TÔI TẠO RA CHẤT VẢI CỦA MÌNH" */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            Quy Trình & Tôn Chỉ Chế Tác
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            CÁCH CHÚNG TÔI TẠO RA CHẤT VẢI CỦA MÌNH
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
        </div>

        {/* Lưới tính năng: Một lưới 2x2 (4 ô) với các biểu tượng tinh tế và văn bản mô tả */}
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
                  {/* Biểu tượng tinh tế */}
                  <div className="w-14 h-14 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <IconComp className="w-6 h-6" />
                  </div>

                  {/* Tiêu đề ô */}
                  <div className="mb-3">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] group-hover:text-[#631521] transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[11px] font-sans font-medium text-[#8C7E74] uppercase tracking-wider block mt-0.5">
                      {item.englishSubtitle}
                    </span>
                  </div>

                  {/* Mô tả ngắn */}
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
