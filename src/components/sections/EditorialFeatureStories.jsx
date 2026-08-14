import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowDownRight, Sparkles, Check } from 'lucide-react'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'
import craftsmanshipImg from '../../assets/images/craftsmanship-detail.jpg'

export default function EditorialFeatureStories() {
  const ref1 = useRef(null)
  const ref2 = useRef(null)
  const ref3 = useRef(null)

  const inView1 = useInView(ref1, { once: true, margin: '-80px' })
  const inView2 = useInView(ref2, { once: true, margin: '-80px' })
  const inView3 = useInView(ref3, { once: true, margin: '-80px' })

  return (
    <div id="features" className="bg-[#FAF8F5] overflow-hidden">
      {/* ========================================================================= */}
      {/* STORY 01: Large Image Showcase + Oversized Number '01' Overlay */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-32 border-b border-[#E8DFD5]/60" ref={ref1}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left Column: Huge Visual with Number overlay (7 cols) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView1 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="lg:col-span-7 relative"
            >
              <div className="relative rounded-[3px] overflow-hidden shadow-luxury border border-[#E8DFD5]">
                <img
                  src={fabricMacroImg}
                  alt="Vải đũi thoáng mát cả đêm dài"
                  className="w-full h-[420px] sm:h-[500px] object-cover object-center"
                />
                {/* Giant Serif Number Overlay */}
                <div className="absolute top-2 left-4 font-serif text-[140px] sm:text-[180px] font-bold text-[#FAF8F5]/80 select-none pointer-events-none leading-none drop-shadow-sm">
                  01
                </div>
              </div>
            </motion.div>

            {/* Right Column: Editorial Text (5 cols) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView1 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 flex flex-col justify-center"
            >
              <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase mb-3 block">
                CÂU CHUYỆN 01 — ĐIỀU HÒA THÂN NHIỆT
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] mb-6 leading-[1.1]">
                Thoáng Mát <br />
                <span className="font-serif-italic text-[#8C7E74]">Cả Đêm Dài</span>
              </h2>

              <p className="text-base text-[#4A423C] font-light leading-relaxed mb-8">
                Vải đũi 100% thiên nhiên có cấu trúc sợi vi xốp đặc biệt, tự động hút ẩm lên đến 20% trọng lượng cơ thể — giải phóng hơi nóng dư thừa cho giấc ngủ luôn mát lành sâu thẳm.
              </p>

              <div className="bg-[#F5F0EB] p-5 rounded-[2px] border border-[#E8DFD5] mb-8">
                <div className="flex items-center gap-3 text-xs font-bold tracking-wider text-[#1A1614] mb-2 uppercase">
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>SỰ KHÁC BIỆT CỦA SỢI ĐŨI 10PM</span>
                </div>
                <p className="text-xs text-[#4A423C] leading-relaxed">
                  Cảm giác "nhẹ tênh như không mặc" giúp cơ thể hô hấp tự nhiên mà chỉ sợi đũi thuần khiết mới có thể mang lại.
                </p>
              </div>

              <a
                href="#pricing-section"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#1A1614] hover:text-[#8C7E74] uppercase transition-colors link-underline w-fit"
              >
                <span>CHỌN BỘ PIJAMA THOÁNG MÁT</span>
                <ArrowDownRight className="w-4 h-4 text-[#C5A059]" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* STORY 02: Full-Width Visual Banner + Floating Editorial Card */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-32 relative bg-[#1A1614] text-[#FAF8F5]" ref={ref2}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="relative rounded-[3px] overflow-hidden min-h-[550px] md:min-h-[620px] flex items-center justify-end p-6 sm:p-12 md:p-16 shadow-luxury">
            {/* Background Image Banner */}
            <img
              src={heroCampaignImg}
              alt="Phụ nữ thư giãn cùng pijama đũi mềm mại"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7]"
            />

            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1614]/90 via-[#1A1614]/50 to-transparent pointer-events-none" />

            {/* Floating Editorial Text Box (Asymmetric Right Overlay) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={inView2 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 max-w-lg bg-[#1A1614]/90 backdrop-blur-md p-8 sm:p-10 rounded-[3px] border border-[#4A3F38] shadow-luxury"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                  CÂU CHUYỆN 02 — SỰ ÊM ÁI
                </span>
                <span className="font-serif text-3xl font-bold text-[#4A3F38]">02</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl text-[#FAF8F5] font-normal mb-5 leading-tight">
                Mềm Mại <br />
                <span className="font-serif-italic text-[#E8DFD5]">Theo Thời Gian</span>
              </h2>

              <p className="text-sm sm:text-base text-[#E8DFD5]/90 font-light leading-relaxed mb-6">
                Khác với các loại vải thông thường thô ráp theo năm tháng, sợi đũi tự nhiên 10PM đã qua xử lý giặt xả vi sinh lành tính — càng giặt càng trở nên mềm mịn và êm ái xoa dịu làn da.
              </p>

              <ul className="space-y-2.5 mb-8 text-xs text-[#E8DFD5]">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Không mất phom dáng sau hàng trăm lần giặt</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Không bị tích điện hay bám dính vào cơ thể</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Cảm giác êm ái tự nhiên cho giấc ngủ ngon</span>
                </li>
              </ul>

              <a
                href="#pricing-section"
                className="inline-flex items-center gap-2 bg-[#C5A059] hover:bg-[#B38F48] text-[#1A1614] text-xs font-bold tracking-[0.2em] uppercase px-6 py-3.5 rounded-[2px] transition-colors"
              >
                <span>XEM BỘ SƯU TẬP MỀM MẠI</span>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* STORY 03: Asymmetric Craft Composition */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-32 border-b border-[#E8DFD5]/60" ref={ref3}>
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left Editorial Content (5 cols) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={inView3 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="lg:col-span-5 order-2 lg:order-1 flex flex-col justify-center"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase">
                  CÂU CHUYỆN 03 — QUIET LUXURY
                </span>
                <span className="font-serif text-3xl font-bold text-[#E8DFD5]">03</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] mb-6 leading-[1.1]">
                Phong Cách Thanh Lịch <br />
                <span className="font-serif-italic text-[#8C7E74]">Mỗi Đêm Nghỉ Nơi</span>
              </h2>

              <p className="text-base text-[#4A423C] font-light leading-relaxed mb-6">
                Hơn cả một bộ đồ ngủ, Pijama Đũi 10PM đại diện cho một phong cách sống chỉn chu. Đường may giấu tinh tế (French seams), cúc mộc dừa thủ công mộc mạc mà sang trọng — mặc ở nhà hay dạo phố sớm đều tràn đầy tự tin.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E8DFD5] mb-8 text-xs text-[#26201C]">
                <div>
                  <span className="font-bold block mb-1">Cúc Mộc Dừa</span>
                  <span className="text-[#8C7E74] font-light">Chất liệu tự nhiên thân thiện môi trường</span>
                </div>
                <div>
                  <span className="font-bold block mb-1">Đường May Ẩn</span>
                  <span className="text-[#8C7E74] font-light">Không cọ xát gây ngứa làn da</span>
                </div>
              </div>

              <a
                href="#pricing-section"
                className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#1A1614] hover:text-[#8C7E74] uppercase transition-colors link-underline w-fit"
              >
                <span>KHÁM PHÁ THIẾT KẾ THANH LỊCH</span>
                <ArrowDownRight className="w-4 h-4 text-[#C5A059]" />
              </a>
            </motion.div>

            {/* Right Asymmetric Craftsmanship Visual (7 cols) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView3 ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-7 order-1 lg:order-2"
            >
              <div className="relative rounded-[3px] overflow-hidden shadow-luxury border border-[#E8DFD5]">
                <img
                  src={craftsmanshipImg}
                  alt="Chi tiết đường may thủ công và cúc mộc dừa pijama 10PM"
                  className="w-full h-[420px] sm:h-[500px] object-cover object-center"
                />
                <div className="absolute bottom-6 right-6 bg-[#FAF8F5]/90 backdrop-blur-md p-4 rounded-[2px] border border-[#E8DFD5] text-[11px] text-[#1A1614] font-medium tracking-wide">
                  100% HANDCRAFTED TAILORING & NATURAL BUTTONS
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
