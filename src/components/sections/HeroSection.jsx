import { motion } from 'framer-motion'
import SectionContainer from '../ui/SectionContainer'
import StarRow from '../ui/StarRow'
import PrimaryButton from '../ui/PrimaryButton'
import PlaceholderImage from '../ui/PlaceholderImage'
import { staggerContainer, fadeUpVariant } from '../../utils/animations'

export default function HeroSection() {
  return (
    <section id="hero-header" aria-label="Giới thiệu sản phẩm" className="bg-hero-bg w-full pt-16 pb-20 md:pt-20 md:pb-24">
      <SectionContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div
            className="flex justify-center items-center gap-2 mb-3"
            variants={fadeUpVariant}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <StarRow count={5} size="sm" />
            <span className="text-sm font-medium text-text-body">
              3,248+ Đánh giá 5 sao
            </span>
          </motion.div>

          <motion.h1
            className="text-hero-mobile md:text-hero-desktop font-extrabold text-text-primary text-center text-balance max-w-2xl mx-auto mb-6"
            variants={fadeUpVariant}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            Nghệ Thuật Giấc Ngủ Mát Lành
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-text-body text-center max-w-xl mx-auto mb-8 leading-relaxed"
            variants={fadeUpVariant}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            Pijama Đũi 10PM – mặc như không mặc, ngủ ngon như chưa từng ngủ ngon đến thế.
          </motion.p>

          <motion.div
            className="flex justify-center mb-10"
            variants={fadeUpVariant}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <PrimaryButton label="Trải Nghiệm Ngay" href="#pricing-section" />
          </motion.div>

          <motion.div
            className="w-full max-w-2xl mx-auto mt-4"
            variants={fadeUpVariant}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.4 }}
          >
            <PlaceholderImage
              alt="Phụ nữ thư giãn với pijama đũi 10PM"
              aspectClass="aspect-[16/9] md:aspect-[21/9]"
              className="w-full"
            />
          </motion.div>
        </motion.div>
      </SectionContainer>
    </section>
  )
}
