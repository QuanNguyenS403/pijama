export default function SizeSelector({ sizes = [], selectedColor, selected, onChange, onSizeGuide }) {
  const getStock = (size) => {
    if (!selectedColor?.stock) return 99
    return selectedColor.stock[size] ?? 0
  }

  const handleKeyDown = (e, size, isOos) => {
    if (isOos) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(size)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-serif text-[0.8rem] uppercase tracking-[0.25em] font-semibold text-[#631521]">
          SIZE —{' '}
          <span className="text-[#1A1614] font-bold font-sans tracking-normal">{selected || ''}</span>
        </p>
        <button
          onClick={onSizeGuide}
          className="font-sans text-[0.8rem] font-medium underline text-[#8C7E74] hover:text-[#631521] transition-colors"
        >
          Hướng dẫn chọn size →
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn size">
        {sizes.map((size) => {
          const stock = getStock(size)
          const isOos = stock === 0
          const isSelected = selected === size

          return (
            <button
              key={size}
              role="radio"
              aria-checked={isSelected}
              aria-label={`Size ${size}${isOos ? ' — hết hàng' : ''}`}
              disabled={isOos}
              onClick={() => !isOos && onChange(size)}
              onKeyDown={(e) => handleKeyDown(e, size, isOos)}
              className={`relative w-11 h-11 font-sans text-sm font-semibold rounded-[2px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#631521] focus:ring-offset-1
                ${isOos ? 'size-oos border border-[#E8DFD5] text-[#8C7E74] bg-[#FAF8F5]' : ''}
                ${isSelected && !isOos ? 'bg-[#631521] text-[#FAF8F5] border border-[#631521] shadow-md' : ''}
                ${!isSelected && !isOos ? 'bg-white border border-[#E8DFD5] text-[#1A1614] hover:border-[#631521] hover:text-[#631521]' : ''}
              `}
            >
              {size}
            </button>
          )
        })}
      </div>

      {selected && getStock(selected) > 0 && getStock(selected) <= 5 && (
        <p className="mt-2 text-xs font-sans text-[#631521] font-bold">
          ⚡ Chỉ còn {getStock(selected)} sản phẩm trong kho!
        </p>
      )}
    </div>
  )
}
