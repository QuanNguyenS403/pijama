import { motion } from 'framer-motion'
import { Truck, RefreshCw, Shield, Leaf } from 'lucide-react'
import SectionContainer from '../ui/SectionContainer'
import { trustPoints } from '../../data/pricing'

const iconMap = {
  Truck,
  RefreshCw,
  Shield,
  Leaf,
}

export default function TrustStrip() {
  return (
    <section id="trust-strip" aria-label="Cam kết dịch vụ" className="bg-trust-bg py-10 md:py-12 border-y border-gray-100">
      <SectionContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {trustPoints.map((point, index) => {
            const IconComponent = iconMap[point.icon]
            return (
              <motion.div
                key={point.icon}
                className="flex flex-col items-center text-center gap-3"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div
                  className="w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center"
                  role="img"
                  aria-label={point.label}
                >
                  <IconComponent className="w-5 h-5 text-accent-green" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-text-primary text-center">
                  {point.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      </SectionContainer>
    </section>
  )
}
