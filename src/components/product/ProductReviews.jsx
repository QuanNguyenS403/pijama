import { useState } from 'react'
import { motion } from 'framer-motion'
import { sampleReviews } from '../../data/products'

function StarRow({ rating }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} sao`}>
      {[...Array(5)].map((_, i) => (
        <span key={i} style={{ color: i < rating ? '#D4AF37' : '#E8DFD5' }} className="text-sm">★</span>
      ))}
    </span>
  )
}

function RatingBar({ stars, percentage }) {
  return (
    <div className="flex items-center gap-3 text-xs font-sans">
      <span className="text-[#8C7E74] w-5 text-right font-medium">{stars}★</span>
      <div className="flex-1 h-1.5 bg-[#E8DFD5] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="h-full bg-[#631521]"
        />
      </div>
      <span className="text-[#8C7E74] w-8 font-medium">{percentage}%</span>
    </div>
  )
}

export default function ProductReviews({ product }) {
  const reviews = sampleReviews.filter((r) => r.productId === product.id)
  const [visibleCount, setVisibleCount] = useState(3)

  const ratingBars = [
    { stars: 5, percentage: 89 },
    { stars: 4, percentage: 9 },
    { stars: 3, percentage: 2 },
    { stars: 2, percentage: 0 },
    { stars: 1, percentage: 0 },
  ]

  return (
    <section
      id="reviews"
      className="py-16 md:py-24 bg-[#FAF8F5] border-t border-[#E8DFD5]"
      aria-label="Đánh giá sản phẩm"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-12">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            ĐÁNH GIÁ TỪ KHÁCH HÀNG
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            {product.reviewCount} người đã yêu thích sản phẩm này
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
          {/* Left — rating summary */}
          <div className="lg:col-span-1 bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-sm">
            <div className="text-center mb-6">
              <p className="font-serif text-6xl sm:text-7xl font-bold text-[#631521]">{product.rating}</p>
              <div className="mt-2 mb-1">
                <StarRow rating={Math.round(product.rating)} />
              </div>
              <p className="font-sans text-xs text-[#8C7E74]">{product.reviewCount} đánh giá từ khách hàng đã mua</p>
            </div>
            <div className="space-y-2.5 pt-4 border-t border-[#E8DFD5]">
              {ratingBars.map((b) => (
                <RatingBar key={b.stars} {...b} />
              ))}
            </div>
          </div>

          {/* Right — review cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {reviews.slice(0, visibleCount).map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="border border-[#E8DFD5] p-5 sm:p-6 bg-white rounded-[4px] shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-bold text-sm text-[#1A1614]">{review.name}</span>
                    {review.verified && (
                      <span className="text-[0.65rem] font-sans text-[#631521] bg-[#631521]/10 px-2 py-0.5 rounded-[2px] font-bold">
                        ✓ Đã mua hàng
                      </span>
                    )}
                  </div>
                  <span className="font-sans text-xs text-[#8C7E74]">{review.date}</span>
                </div>
                <div className="my-1.5">
                  <StarRow rating={review.rating} />
                </div>
                <p className="font-sans text-sm font-light text-[#4A3F38] leading-relaxed mt-2">
                  "{review.text}"
                </p>
                <p className="font-sans text-xs italic text-[#8C7E74] mt-2.5 pt-2 border-t border-[#F5F0EB]">
                  Đã mua: <span className="text-[#631521] font-medium">{review.color}</span> | Size <span className="font-medium text-[#1A1614]">{review.size}</span>
                </p>
              </motion.div>
            ))}

            {visibleCount < reviews.length && (
              <button
                onClick={() => setVisibleCount((v) => v + 3)}
                className="self-center mt-4 font-sans text-xs uppercase tracking-[0.15em] font-bold border border-[#631521] text-[#631521] px-8 py-3.5 hover:bg-[#631521] hover:text-[#FAF8F5] transition-all rounded-[2px]"
              >
                XEM THÊM ĐÁNH GIÁ
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
