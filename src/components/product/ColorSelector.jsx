import { motion } from 'framer-motion'

export default function ColorSelector({ colors = [], selected, onChange }) {
  const isAnyPattern = colors.some((c) => c.patternPreview)

  return (
    <div>
      <p className="font-serif text-[0.8rem] uppercase tracking-[0.25em] font-semibold text-[#631521] mb-2.5">
        MÀU SẮC —{' '}
        <span className="text-[#1A1614] font-bold font-sans tracking-normal normal-case">
          {selected?.label || selected?.name || ''}
        </span>
      </p>

      <div
        className="flex flex-wrap gap-4 items-start"
        role="radiogroup"
        aria-label="Chọn màu sắc"
      >
        {colors.map((color) => {
          const isSelected = selected?.name === color.name
          const isPattern = color.patternPreview === true

          // Pattern styles
          let swatchBackground = color.hex
          if (isPattern && color.patternType === 'stripe') {
            swatchBackground = `repeating-linear-gradient(
              0deg,
              #F2C4CE 0px, #F2C4CE 4px,
              #FFFFFF 4px, #FFFFFF 8px
            )`
          } else if (isPattern && color.patternType === 'plaid') {
            swatchBackground = `repeating-linear-gradient(
              0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 2px,
              #1B2A4A 2px, #1B2A4A 12px
            ),
            repeating-linear-gradient(
              90deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 2px,
              transparent 2px, transparent 12px
            )`
          } else if (isPattern && (color.patternType === 'brown-stripe' || color.patternType === 'mocha-stripe')) {
            swatchBackground = `repeating-linear-gradient(
              90deg,
              #5C3A21 0px, #5C3A21 4px,
              #FFFFFF 4px, #FFFFFF 6px,
              #5C3A21 6px, #5C3A21 10px
            )`
          }

          if (isPattern) {
            return (
              <div key={color.name} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange(color)}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={color.label || color.name}
                  title={color.label || color.name}
                  className="relative transition-all duration-150 cursor-pointer focus:outline-none"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0px',
                    background: swatchBackground,
                    backgroundColor: color.hex,
                    border: isSelected
                      ? '2px solid #631521'
                      : '1.5px solid #E8DFD5',
                    boxShadow: isSelected
                      ? 'inset 0 0 0 2px #FFFFFF, 0 0 0 2px #631521'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#8C7E74'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = '#E8DFD5'
                  }}
                />
                <span
                  className={`font-sans text-[0.7rem] text-center transition-colors font-light ${
                    isSelected ? 'text-[#631521] font-medium' : 'text-[#8C7E74]'
                  }`}
                >
                  {color.label || color.name}
                </span>
              </div>
            )
          }

          // Solid color rendering for other products
          return (
            <div key={color.name} className="flex flex-col items-center gap-1">
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.15 }}
                onClick={() => onChange(color)}
                role="radio"
                aria-checked={isSelected}
                aria-label={color.name}
                title={color.name}
                className="relative w-8 h-8 rounded-full focus:outline-none transition-shadow cursor-pointer"
                style={{
                  backgroundColor: color.hex,
                  boxShadow: isSelected
                    ? '0 0 0 2px #FAF8F5, 0 0 0 4px #631521'
                    : '0 0 0 1px #E8DFD5',
                }}
              />
              <span className="font-sans text-[0.65rem] text-[#8C7E74] font-light">
                {color.label || color.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
