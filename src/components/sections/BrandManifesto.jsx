import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2, ShieldCheck, Sparkles, Feather, Wind, HeartHandshake } from 'lucide-react'

export default function BrandManifesto() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const benefits = [
    {
      title: 'Thiết kế đồ ngủ vải đũi tự nhiên cao cấp',
      desc: '100% sợi đũi thiên nhiên (linen / slub silk blend), may giấu chỉ French seams không cọ xát da, đính cúc mộc dừa thủ công sang trọng.',
      icon: Sparkles,
    },
    {
      title: 'Thoáng khí, mềm mại cho những đêm nhẹ tênh',
      desc: 'Cấu trúc sợi vi xốp tự điều hòa thân nhiệt, thấm hút ẩm 20% trọng lượng cơ thể. Công nghệ giặt xả vi sinh giúp vải càng dùng càng mềm mịn.',
      icon: Wind,
    },
    {
      title: 'Nghệ thuật sống chậm Slow-Living & Quiet Luxury',
      desc: 'Phom dáng relaxed fit giải phóng cơ thể khỏi mọi gò bó gối chăn, đem lại cảm giác tự do, bình yên và sang trọng ngay tại nhà.',
      icon: Feather,
    },
    {
      title: 'Lành tính tuyệt đối cho làn da nhạy cảm',
      desc: 'Không pha trộn sợi tổng hợp polyester, không nhuộm hóa chất độc hại, chứng nhận an toàn cho cả làn da em bé.',
      icon: ShieldCheck,
    }
  ]

  return (
    <section
      id="ve-chung-toi"
      aria-label="Về chúng tôi & Triết lý thương hiệu QuanNguyenS"
      className="bg-[#FAF8F5] py-14 sm:py-18 md:py-24 border-b border-[#E8DFD5] relative overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10" ref={ref}>
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-2">
              VỀ CHÚNG TÔI — TRIẾT LÝ QUANNGUYENS
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] tracking-tight leading-snug mb-4 text-balance">
              “Giấc ngủ đẹp cũng là một cách <br />
              <span className="font-serif-italic text-[#8C7E74]">yêu thương chính mình.</span>”
            </h2>
            <p className="text-sm sm:text-base text-[#475569] font-light leading-relaxed">
              Thương hiệu <strong className="font-semibold text-[#1A1614]">QuanNguyenS</strong> kiến tạo dòng sản phẩm 10PM Pijama Đũi từ tình yêu sâu sắc với chất liệu tự nhiên thuần khiết của Việt Nam. Mỗi bộ đồ ngủ là một lời vỗ về dịu dàng cho cơ thể sau ngày dài bận rộn.
            </p>
          </motion.div>
        </div>

        {/* Well-Formatted Benefit Bullet Points (Tight, balanced, 2x2 grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {benefits.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#FFFFFF] p-6 rounded-[3px] border border-[#E8DFD5] shadow-sm hover:border-[#0F172A]/30 transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-[2px] bg-[#F5F0EB] text-[#0F172A] flex items-center justify-center shrink-0 border border-[#E8DFD5]">
                  <Icon className="w-5 h-5 text-[#0F172A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1614] mb-1.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#475569] font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Direct Quote Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 max-w-4xl mx-auto bg-[#F5F0EB] p-6 sm:p-8 rounded-[3px] border border-[#E8DFD5] text-center"
        >
          <p className="font-serif text-lg sm:text-xl text-[#1A1614] italic mb-3">
            “Cảm giác chạm làn da vào thớ vải đũi mát lạnh lúc 10 giờ đêm là khoảnh khắc kỳ diệu nhất trong ngày.”
          </p>
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#64748B] uppercase">
            — ĐỘI NGŨ THIẾT KẾ QUANNGUYENS
          </span>
        </motion.div>
      </div>
    </section>
  )
}
