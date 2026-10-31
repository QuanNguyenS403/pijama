import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function Accordion({ items, allowMultiple = true, defaultOpen = [] }) {
  const [openIndices, setOpenIndices] = useState(() => new Set(defaultOpen))

  const toggleIndex = (index) => {
    setOpenIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (!allowMultiple) {
          next.clear()
        }
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="divide-y divide-[#E8DFD5]">
      {items.map((item, i) => {
        const isOpen = openIndices.has(i)
        return (
          <div key={i}>
            <button
              onClick={() => toggleIndex(i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between py-4 text-left group focus:outline-none"
            >
              <span className="font-sans font-semibold text-sm uppercase tracking-[0.1em] text-[#1A1614] group-hover:text-[#631521] transition-colors">
                {item.label}
              </span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[#8C7E74] group-hover:text-[#631521] transition-colors shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 text-sm font-normal leading-relaxed text-[#4A3F38]">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
