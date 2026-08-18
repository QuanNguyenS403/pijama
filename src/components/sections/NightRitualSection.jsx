import { motion } from 'framer-motion'
import { Sparkles, Moon, Coffee, Heart, ArrowRight } from 'lucide-react'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function NightRitualSection() {
  const steps = [
    {
      time: '10:00 PM',
      title: 'Tắt Ánh Sáng Xanh & Thả Lỏng',
      desc: 'Rời xa màn hình công việc, nhâm nhi tách trà hoa cúc ấm và kích hoạt trạng thái thư giãn sâu của hệ thần kinh.',
      icon: Moon,
    },
    {
      time: '10:15 PM',
      title: 'Chạm Vào Làn Vải Mát Lành',
      desc: 'Khoác lên mình bộ pijama QuanNguyenS. Cảm giác nhẹ tênh, mịn màng lập tức giải tỏa mọi căng thẳng trên da thịt.',
      icon: Sparkles,
    },
    {
      time: '10:30 PM',
      title: 'Chìm Vào Giấc Ngủ Sâu',
      desc: 'Nhiệt độ cơ thể tự điều hòa lý tưởng, duy trì nhịp thở thư thái cho một giấc ngủ không mộng mị tới sáng hôm sau.',
      icon: Heart,
    },
  ]

  return (
    <section
      id="night-ritual"
      aria-label="Nghi thức giấc ngủ 10PM"
      className="bg-[#FAF8F5] py-20 sm:py-28 md:py-36 border-b border-[#E8DFD5] relative overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Image with Elegant Floating Vignette (6 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-[3px] overflow-hidden shadow-luxury border border-[#E8DFD5]">
              <img
                src={lifestyleNightImg}
                alt="Nghi thức giấc ngủ thư thái cùng pijama cao cấp"
                className="w-full h-[460px] sm:h-[540px] md:h-[580px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1614]/70 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-6 left-6 right-6 text-[#FAF8F5]">
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-1">
                  10PM BEDTIME RITUAL
                </span>
                <p className="font-serif text-xl sm:text-2xl font-normal italic">
                  “Một đêm ngon giấc bắt đầu từ khoảnh khắc bạn khoác lên sự dịu dàng.”
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Step by step Timeline (6 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-3">
              NGHI THỨC GIẤC NGỦ — 10PM NIGHT RITUAL
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1A1614] mb-6 leading-tight">
              3 Bước Cho Một Đêm <br />
              <span className="font-serif-italic text-[#8C7E74]">Trọn Vẹn Bình Yên</span>
            </h2>

            <p className="text-base text-[#4A423C] font-light leading-relaxed mb-10">
              Trút bỏ âu lo, khoác lên bộ pijama mát lạnh, đốt ngọn nến thơm và để cơ thể được vỗ về dịu êm.
            </p>

            {/* Timeline Item list */}
            <div className="space-y-6">
              {steps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-[3px] bg-[#FFFFFF] border border-[#E8DFD5] hover:border-[#8C7E74] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-[2px] bg-[#F5F0EB] text-[#1A1614] flex items-center justify-center shrink-0 border border-[#E8DFD5] font-serif font-bold text-xs">
                      {step.time.split(' ')[0]}
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-bold text-[#1A1614] mb-1">
                        {step.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#4A423C] font-light leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8">
              <a
                href="#pricing-section"
                className="inline-flex items-center gap-2.5 bg-[#1A1614] hover:bg-[#2C2420] text-[#FAF8F5] text-xs font-bold tracking-[0.2em] uppercase px-7 py-4 rounded-[2px] transition-colors"
              >
                <span>BẮT ĐẦU NGHI THỨC GIẤC NGỦ 10PM</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
