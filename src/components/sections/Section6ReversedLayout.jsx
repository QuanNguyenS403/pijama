import { motion } from 'framer-motion'
import lifestyleNavyFlatlayImg from '../../assets/images/lifestyle-navy-flatlay.jpg'

export default function Section6ReversedLayout() {
  const moments = [
    {
      time: '☕ 7:00 sáng — Tại nhà',
      desc: 'Pha cà phê, scroll Instagram, đọc sách — Không cần thay đồ, bạn đã đẹp rồi',
    },
    {
      time: '🛍️ 2:00 chiều — Ra phố',
      desc: 'Khoác thêm chiếc áo nhẹ bên ngoài — Tự tin bước ra phố, ai cũng tò mò bạn mặc gì',
    },
    {
      time: '🌙 8:00 tối — Gặp bạn bè',
      desc: 'Một bữa tối nhỏ ấm cúng, một buổi tụ tập bạn bè — mặc nguyên set mà vẫn phong cách nhất phòng',
    },
  ]

  return (
    <section
      id="section-reversed"
      aria-label="Lifestyle Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 order-2 lg:order-1"
          >
            <div className="relative rounded-[4px] overflow-hidden shadow-2xl border border-[#D4AF37]/30 bg-[#1E1510] aspect-[4/3] w-full group">
              <img
                src={lifestyleNavyFlatlayImg}
                alt="The Stillwater Set caro navy QuanNguyenS — phong cách sống từ ban công buổi sáng đến quán cà phê"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E1510]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <span className="inline-block bg-[#D4AF37] text-[#2C201A] text-xs font-sans font-bold px-4 py-1.5 rounded-[2px] tracking-wider uppercase shadow-md">
                  Một bộ — trọn ngày
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Lifestyle content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center"
          >
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
              LIFESTYLE
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.12] mb-2">
              QuanNguyenS
            </h2>
            <h3 className="font-serif text-xl sm:text-2xl font-light text-[#D4AF37] italic mb-4">
              trong cuộc sống của bạn
            </h3>
            <p className="font-sans text-sm sm:text-base text-white/75 font-light leading-relaxed mb-8">
              Chất liệu đủ mềm để bạn không muốn thay ra — đủ đẹp để bạn không cần. Từ ban công buổi sáng đến quán cà phê buổi chiều — một bộ, trọn ngày
            </p>

            {/* Timeline moments */}
            <div className="space-y-5">
              {moments.map((moment, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * idx }}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-[3px] border border-white/10 hover:border-[#D4AF37]/40 transition-colors"
                >
                  <div className="w-1 h-full min-h-[2.5rem] bg-[#D4AF37] rounded-full shrink-0 mt-0.5" />
                  <div>
                    <span className="font-sans text-xs font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">
                      {moment.time}
                    </span>
                    <p className="font-sans text-sm text-white/80 leading-relaxed">
                      {moment.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
