import { motion } from 'framer-motion'

export default function PrimaryButton({ label, href, onClick, className = '', inverted = false }) {
  const baseClasses = inverted
    ? 'inline-flex items-center gap-2 py-3 px-7 rounded-none font-bold tracking-wide uppercase text-xs cursor-pointer bg-white text-btn-primary border-2 border-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-gold focus:ring-offset-2'
    : 'inline-flex items-center gap-2 py-3 px-7 rounded-none font-bold tracking-wide uppercase text-xs cursor-pointer bg-btn-primary text-white border-2 border-btn-primary focus:outline-none focus:ring-2 focus:ring-accent-gold focus:ring-offset-2'

  const combinedClasses = `${baseClasses} ${className}`

  if (href) {
    return (
      <motion.a
        href={href}
        className={combinedClasses}
        aria-label={label}
        whileHover={{ backgroundColor: inverted ? '#F3F4F6' : '#2D2D2D' }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        {label}
      </motion.a>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={combinedClasses}
      aria-label={label}
      whileHover={{ backgroundColor: inverted ? '#F3F4F6' : '#2D2D2D' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {label}
    </motion.button>
  )
}
