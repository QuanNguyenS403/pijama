import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import SectionContainer from '../ui/SectionContainer'
import PrimaryButton from '../ui/PrimaryButton'
import PlaceholderImage from '../ui/PlaceholderImage'
import { features } from '../../data/features'
import { defaultTransition } from '../../utils/animations'

function SingleFeature({ feature }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const isImageRight = feature.imagePosition === 'right'

  return (
    <section id={feature.id} aria-label={feature.heading} className="bg-white py-16 md:py-20">
      <SectionContainer>
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center"
        >
          <motion.div
            className={`${isImageRight ? 'md:order-1' : 'md:order-2'} order-2`}
            initial={{ opacity: 0, x: isImageRight ? -32 : 32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={defaultTransition}
          >
            <span className="text-label uppercase tracking-widest font-semibold text-accent-gold mb-3 block">
              Lý Do {feature.number}
            </span>
            <h2 className="text-section-mobile md:text-section-desktop font-bold text-text-primary mb-5 text-balance">
              {feature.heading}
            </h2>
            <p className="text-body text-text-body leading-relaxed mb-8">
              {feature.body}
            </p>
            <PrimaryButton label={feature.ctaLabel} href={feature.ctaHref} />
          </motion.div>

          <motion.div
            className={`${isImageRight ? 'md:order-2' : 'md:order-1'} order-1`}
            initial={{ opacity: 0, x: isImageRight ? 32 : -32 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.12 }}
          >
            <div className="w-full overflow-hidden rounded-card">
              <PlaceholderImage
                alt={feature.imageAlt}
                aspectClass="aspect-[4/3]"
                className="w-full shadow-card"
              />
            </div>
          </motion.div>
        </div>
      </SectionContainer>
    </section>
  )
}

export default function FeatureSection() {
  return (
    <>
      {features.map((feature) => (
        <SingleFeature key={feature.id} feature={feature} />
      ))}
    </>
  )
}
