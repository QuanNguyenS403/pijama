import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, HelpCircle } from 'lucide-react'

export default function CareFaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  const faqs = [
    {
      q: 'Vải đũi 10PM có bị nhăn nhiều hay rút nước khi giặt không?',
      a: 'Vải đũi 100% tự nhiên sở hữu độ nhăn gợn tự nhiên rất sang trọng đặc trưng của dòng sợi cao cấp. Đũi 10PM đã qua công nghệ giặt xả vi sinh co giặt trước, giúp tỷ lệ rút vải gần như bằng 0. Khi giặt xong, bạn chỉ cần giũ nhẹ phơi gió bóng râm là vải sẽ tự phẳng êm ái mà không cần ủi phức tạp.'
    },
    {
      q: 'Nếu mặc không vừa size thì 10PM xử lý đổi hàng thế nào?',
      a: '10PM cam kết chính sách "Đổi Size Tận Nhà 30 Ngày". Quý khách chỉ cần nhắn tin cho 10PM, shipper sẽ mang size mới tới tận nơi và lấy lại bộ cũ hoàn toàn miễn phí ship 1 chiều.'
    },
    {
      q: 'Nên giặt máy hay giặt tay để pijama đũi bền đẹp nhất?',
      a: 'Quý khách hoàn toàn có thể giặt máy ở chế độ giặt nhẹ (Chế độ Wool/Delicate) và dùng túi giặt. Nên dùng xà phòng dịu nhẹ, tránh dùng chất tẩy mạnh và phơi trong bóng râm thoáng gió.'
    },
    {
      q: 'Chất liệu đũi 10PM có phù hợp cho người có làn da nhạy cảm?',
      a: 'Tuyệt đối an toàn! Đũi 10PM là 100% xơ tự nhiên thuần khiết không pha tạp polyester tổng hợp, nhuộm màu thực vật lành tính đã qua kiểm định an toàn cho cả làn da em bé.'
    },
  ]

  return (
    <section
      id="faq-section"
      aria-label="Hướng dẫn bảo quản & Giải đáp thắc mắc FAQ"
      className="bg-[#F5F0EB] py-24 md:py-36 border-b border-[#E8DFD5] relative"
    >
      <div className="max-w-[900px] mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-3">
            FABRIC CARE & FAQ — HƯỚNG DẪN BẢO QUẢN
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1A1614] tracking-tight mb-4">
            Giải Đáp Thắc Mắc <br />
            <span className="font-serif-italic text-[#8C7E74]">& Chăm Sóc Vải Đũi</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="bg-[#FAF8F5] rounded-[3px] border border-[#E8DFD5] overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-serif text-lg sm:text-xl font-normal text-[#1A1614] hover:text-[#8C7E74] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#C5A059] shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#8C7E74] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#1A1614]' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 pt-0 text-xs sm:text-sm text-[#4A423C] font-light leading-relaxed border-t border-[#F5F0EB]"
                    >
                      <p className="pt-4">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
