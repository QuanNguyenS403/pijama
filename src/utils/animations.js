export const fadeUpVariant = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export const staggerContainer = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren:   0.1,
    },
  },
}

export const defaultTransition = {
  duration: 0.55,
  ease: 'easeOut',
}
