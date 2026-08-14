import { motion } from 'framer-motion'
import { Moon, Coffee, BookOpen, Sun, Heart, CheckCircle2 } from 'lucide-react'
import lifestyleNightImg from '../../assets/images/lifestyle-night.jpg'

export default function NightRitualSection() {
  const timelineSteps = [
    {
      time: '18:30',
      title: 'Trở Về Nhà & Thả Lỏng',
      desc: 'Trút bỏ hoàn toàn áp lực công việc, tiếng ồn phố thị bên ngoài cánh cửa.',
      icon: Sun,
    },
    {
      time: '20:00',
      title: 'Tắm Nước Ấm & Chăm Sóc Bản Thân',
      desc: 'Làn nước ấm nóng cuốn trôi sự mệt mỏi, xoa dịu các bó cơ căng thẳng.',
      icon: Coffee,
    },
    {
      time: '21:00',
      title: 'Khoác Lên Pijama Đũi 10PM',
      desc: 'Sợi đũi tự nhiên mát lành chạm nhẹ vào làn da. Cảm giác nhẹ tênh như không mặc.',
      icon: Heart,
      highlight: true,
    },
    {
      time: '22:00',
      title: 'Đọc Sách & Trà Hoa Cúc',
      desc: 'Tận hưởng từng trang sách yêu thích bên ngọn đèn ngủ dịu ấm áp.',
      icon: BookOpen,
    },
    {
      time: '22:30',
      title: 'Tắt Đèn & Khép Lại Đêm',
      desc: 'Thả lỏng tâm trí, chìm vào giấc ngủ tự nhiên sâu thẳm không mộng mị.',
      icon: Moon,
    },
    {
      time: '23:00',
      title: 'Giấc Ngủ Mát Lành Trọn Vẹn',
      desc: 'Thức dậy vào sáng hôm sau tràn đầy năng lượng tươi mới.',
      icon: CheckCircle2,
    },
  ]

  return (
    <section
      id="night-ritual"
      aria-label="Hành trình đêm nghi thức giấc ngủ 10PM"
      className="bg-[#1A1614] text-[#FAF8F5] py-24 md:py-36 relative overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-3">
            CINEMATIC LIFESTYLE — A NIGHT IN 10PM
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-[#FAF8F5] tracking-tight mb-6">
            Nghi Thức Giấc Ngủ Đêm <br />
            <span className="font-serif-italic text-[#E8DFD5]">The 10PM Night Ritual</span>
          </h2>
          <p className="text-sm md:text-base text-[#E8DFD5]/80 font-light leading-relaxed">
            Chúng tôi không chỉ bán một bộ pijama. Chúng tôi mang đến nghi thức trở về với chính mình — thảnh thơi, nhẹ nhàng và ngập tràn tình yêu thương.
          </p>
        </div>

        {/* Grid Showcase: Left Timeline (6 cols) & Right Atmospheric Photo (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left Timeline Cards */}
          <div className="lg:col-span-6 space-y-4">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.time}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={`p-5 rounded-[2px] border transition-all ${
                    step.highlight
                      ? 'bg-[#26201C] border-[#C5A059] shadow-luxury'
                      : 'bg-[#1A1614] border-[#4A3F38]/50 hover:border-[#8C7E74]/60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="font-serif text-xl font-bold text-[#C5A059] tracking-wider">
                        {step.time}
                      </span>
                      <Icon className="w-4 h-4 text-[#8C7E74] mt-1" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-wide text-[#FAF8F5] mb-1">
                        {step.title}
                      </h4>
                      <p className="text-xs text-[#E8DFD5]/80 font-light leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Right Atmospheric Lifestyle Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[3px] overflow-hidden border border-[#4A3F38] shadow-luxury">
              <img
                src={lifestyleNightImg}
                alt="Phụ nữ tận hưởng đêm yên bình cùng pijama đũi 10PM"
                className="w-full h-[520px] sm:h-[600px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1614]/80 via-transparent to-transparent pointer-events-none" />
              
              <div className="absolute bottom-8 left-8 right-8 bg-[#1A1614]/85 backdrop-blur-md p-6 rounded-[2px] border border-[#4A3F38]">
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-1">
                  10PM NIGHT EXPERIENCE
                </span>
                <p className="font-serif text-xl text-[#FAF8F5] font-light leading-snug">
                  “Cảm giác sau một ngày dài mệt mỏi được thay bộ đũi 10PM thơm mùi nắng nhẹ là khoảnh khắc bình yên nhất trong ngày.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
