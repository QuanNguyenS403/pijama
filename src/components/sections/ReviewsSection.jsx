import { motion } from 'framer-motion'
import SectionContainer from '../ui/SectionContainer'
import StarRow from '../ui/StarRow'
import VerifiedBadge from '../ui/VerifiedBadge'
import { reviews } from '../../data/reviews'

function ReviewCard({ review, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
    >
      <div className="bg-card-bg rounded-card p-6 md:p-8 flex flex-col items-center text-center shadow-card h-full gap-3">
        <div
          className="w-[72px] h-[72px] rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 mb-1 shrink-0"
          role="img"
          aria-label={`Ảnh đại diện ${review.name}`}
        >
          {review.name.charAt(0)}
        </div>

        <div aria-label={`${review.name} đánh giá 5 sao trên 5`}>
          <StarRow count={5} size="sm" />
        </div>

        <p className="text-sm md:text-body-sm text-text-body leading-relaxed italic flex-1">
          {review.quote}
        </p>

        <p className="text-sm font-bold text-text-primary mt-1">
          {review.name}
        </p>

        {review.verified && <VerifiedBadge />}
      </div>
    </motion.div>
  )
}

export default function ReviewsSection() {
  return (
    <section id="reviews-section" aria-label="Đánh giá từ khách hàng" className="bg-reviews-bg py-16 md:py-24">
      <SectionContainer>
        <div className="text-center mb-12">
          <h2 className="text-reviews-mobile md:text-reviews-desktop font-extrabold text-text-primary mb-2">
            Đánh Giá Từ Khách Hàng Thực
          </h2>
          <p className="text-sm text-text-muted">
            Hơn 1 triệu đêm ngủ ngon – 3,248+ đánh giá 5 sao
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <ReviewCard key={review.id} review={review} index={index} />
          ))}
        </div>
      </SectionContainer>
    </section>
  )
}
