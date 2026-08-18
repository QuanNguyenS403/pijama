import { motion } from 'framer-motion'
import { Store, Users, Globe } from 'lucide-react'

export default function Section10ComparisonTable({ onSelectTier }) {
  const partnerTypes = [
    {
      icon: Store,
      title: 'Reseller',
      desc: 'Bạn có cửa hàng thời trang muốn phân phối pijama cao cấp với thương hiệu đã có sẵn concept.',
    },
    {
      icon: Users,
      title: 'KOL / Influencer',
      desc: 'Bạn có lượng theo dõi tốt và muốn collab cùng thương hiệu pijama phong cách châu Âu.',
    },
    {
      icon: Globe,
      title: 'Đại lý',
      desc: 'Bạn muốn mở đại lý phân phối chính thức tại tỉnh thành của bạn.',
    },
  ]

  return (
    <section
      id="section-table"
      aria-label="Partner Program Section"
      className="py-20 sm:py-24 md:py-28 bg-[#2C201A] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-2">
            ĐỐI TÁC / RESELLER
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            Trở thành đối tác
            <span className="block text-[#D4AF37] italic font-light mt-1 text-2xl sm:text-3xl">
              cùng QuanNguyenS
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4" />
          <p className="font-sans text-sm sm:text-base text-white/70 mt-4 leading-relaxed max-w-lg mx-auto">
            Bạn có cửa hàng thời trang? Bạn là KOL/Influencer? Bạn muốn kinh doanh pijama cao cấp với thương hiệu đã có sẵn concept? Hãy nói chuyện với chúng tôi.
          </p>
        </div>

        {/* Partner type cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {partnerTypes.map((type, idx) => {
            const IconComp = type.icon
            return (
              <motion.div
                key={type.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-[#1E1510] border border-white/10 hover:border-[#D4AF37]/50 rounded-[4px] p-8 text-center transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#631521] text-[#D4AF37] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <IconComp className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white mb-3">{type.title}</h3>
                <p className="font-sans text-sm text-white/70 leading-relaxed">{type.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* CTA to form */}
        <div className="text-center">
          <a
            href="#section-contact"
            onClick={(e) => {
              e.preventDefault()
              const elem = document.querySelector('#section-contact')
              if (elem) elem.scrollIntoView({ behavior: 'smooth' })
            }}
            className="inline-flex items-center justify-center bg-[#D4AF37] hover:bg-[#B8860B] text-[#2C201A] font-sans text-sm font-bold tracking-wider px-10 py-4 rounded-[2px] transition-all duration-300 shadow-lg uppercase"
          >
            → GỬI YÊU CẦU HỢP TÁC
          </a>
        </div>

      </div>
    </section>
  )
}
