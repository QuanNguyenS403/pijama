import { motion } from 'framer-motion'
import productCollectionImg from '../../assets/images/product-collection.jpg'

// Needle & Thread Icon
function NeedleThreadIcon({ className = 'w-5 h-5' }) {
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
      <path d="M4 20L18.5 5.5a2.121 2.121 0 0 0-3-3L1 17l3 3z" />
      <path d="M18.5 5.5L20 4a1.5 1.5 0 0 1 2 2l-1.5 1.5" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
      <path d="M17.5 6.5C19 9 22 10 22 14c0 3-2 5-5 5-2 0-3.5-1-4-2.5" />
    </svg>
  )
}

export default function Section8DeepFeature() {
  const benefits = [
    {
      title: 'Bền Bỉ Theo Thời Gian',
      englishTitle: 'Made to Last',
      desc: 'Cấu trúc dệt sợi kép tăng cường độ dai bền, không xù lông và càng giặt nhiều lần sợi đũi càng mềm mại, dẻo dai.',
    },
    {
      title: 'Nguồn Gốc Đạo Đức & Minh Bạch',
      englishTitle: 'Ethically Sourced',
      desc: 'Cam kết 100% thu mua nguyên liệu từ nông hộ truyền thống với mức giá công bằng, bảo vệ nguồn nước và đất canh tác tự nhiên.',
    },
    {
      title: 'Đường May Giấu Chỉ Tinh Xảo',
      englishTitle: 'French Seams Tailoring',
      desc: 'Mọi mép vải đều được may cuộn giấu đường biên cẩn thận, loại bỏ hoàn toàn cảm giác cọ xát gây khó chịu cho làn da.',
    },
    {
      title: 'Kháng Khuẩn & Khử Mùi Tự Nhiên',
      englishTitle: 'Natural Antibacterial',
      desc: 'Chất liệu đũi tự nhiên chứa hoạt chất kháng ẩm mốc, giữ cho trang phục luôn thơm tho và sạch sẽ suốt ngày dài.',
    },
  ]

  return (
    <section
      id="section-deep-feature"
      aria-label="Deep Feature Value Section"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Bên trái: Hình ảnh một kết cấu vải dệt cận cảnh */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 bg-[#4A0D17]">
              <img
                src={productCollectionImg}
                alt="Cận cảnh kết cấu vải dệt đũi mộc cao cấp"
                className="w-full h-[450px] sm:h-[520px] object-cover object-center"
              />
              <div className="absolute top-4 left-4 bg-[#2C201A]/90 backdrop-blur-sm text-[#D4AF37] border border-[#D4AF37]/40 px-3 py-1 text-xs font-serif font-bold uppercase">
                Chất Lượng Thượng Hạng
              </div>
            </div>
          </motion.div>

          {/* Bên phải: Tiêu đề serif lớn màu trắng + Designed for Comfort, Crafted for Style + danh sách lợi ích */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-2">
              Giá Trị Cốt Lõi
            </span>

            {/* Tiêu đề serif lớn màu trắng: "CHẤT LƯỢNG VƯỢT TRỘI" và "VẢI DỆT ĐÍCH THỰC" */}
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-3">
              CHẤT LƯỢNG VƯỢT TRỘI
            </h2>
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#D4AF37] italic mb-6">
              VẢI DỆT ĐÍCH THỰC
            </h3>

            {/* Văn bản mô tả "Designed for Comfort, Crafted for Style" */}
            <p className="font-sans text-base sm:text-lg text-white/90 font-medium mb-8">
              Thiết kế vì sự thoải mái, kiến tạo từ phong cách — <span className="font-light text-white/80">Designed for Comfort, Crafted for Style. Chúng tôi tỉ mỉ trong từng chi tiết để mang đến giá trị đích thực cho người sử dụng.</span>
            </p>

            {/* Danh sách các lợi ích với biểu tượng kim-chỉ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-[2px] bg-[#D4AF37] text-[#2C201A] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <NeedleThreadIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-sans text-sm font-bold text-white block">
                      {b.title}
                    </span>
                    <span className="text-[10px] font-sans text-[#D4AF37] uppercase tracking-wider block -mt-0.5 mb-1">
                      {b.englishTitle}
                    </span>
                    <p className="text-xs text-white/75 font-sans leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
