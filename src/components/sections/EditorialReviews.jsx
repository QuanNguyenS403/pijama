import { motion } from 'framer-motion'
import { Star, CheckCircle2, Quote } from 'lucide-react'
import { editorialQuote, reviews } from '../../data/reviews'

export default function EditorialReviews() {
  return (
    <section
      id="reviews-section"
      aria-label="Đánh giá & Trải nghiệm thực tế từ khách hàng 10PM"
      className="bg-[#FAF8F5] py-24 md:py-36 border-b border-[#E8DFD5] relative overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-[11px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-3">
            SOCIAL PROOF — ĐÁNH GIÁ TỰ NHIÊN
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1A1614] tracking-tight mb-4">
            Hơn 1 Triệu Đêm <br />
            <span className="font-serif-italic text-[#8C7E74]">Ngủ Ngon Nhẹ Tênh</span>
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#8C7E74]">
            <div className="flex text-[#C5A059]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span>3,248+ Đánh Giá 5 Sao Xác Thực</span>
          </div>
        </div>

        {/* Centerpiece Editorial Spotlight Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto bg-[#F5F0EB] p-10 sm:p-14 rounded-[3px] border border-[#E8DFD5] shadow-luxury text-center relative mb-16"
        >
          <Quote className="w-12 h-12 text-[#C5A059]/30 mx-auto mb-6" />
          <p className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#1A1614] font-normal italic leading-snug mb-8">
            “{editorialQuote.quote}”
          </p>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold tracking-[0.2em] text-[#1A1614] uppercase">
              {editorialQuote.author}
            </span>
            <span className="text-[11px] text-[#C5A059] font-semibold mt-1">
              {editorialQuote.metric}
            </span>
          </div>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((rev, index) => (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="bg-[#FFFFFF] p-8 rounded-[3px] border border-[#E8DFD5] shadow-luxury flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-[#C5A059]">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-[#788779] bg-[#E8F0E9] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã Mua Hàng
                  </span>
                </div>

                <p className="text-sm text-[#4A423C] font-light italic leading-relaxed mb-6">
                  {rev.quote}
                </p>
              </div>

              <div className="pt-4 border-t border-[#F5F0EB] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1614] block">
                    {rev.name}
                  </span>
                  <span className="text-[10px] text-[#8C7E74]">
                    {rev.location}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#8C7E74] bg-[#F5F0EB] px-2 py-1 rounded-[2px]">
                  {rev.purchased}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
