import { Minus, Plus } from 'lucide-react'

export default function QuantitySelector({ quantity, onChange, max = 99 }) {
  const decrement = () => quantity > 1 && onChange(quantity - 1)
  const increment = () => quantity < max && onChange(quantity + 1)

  return (
    <div>
      <p className="font-serif text-[0.8rem] uppercase tracking-[0.25em] font-semibold text-[#631521] mb-2.5">
        SỐ LƯỢNG
      </p>
      <div className="inline-flex items-center border border-[#E8DFD5] bg-white rounded-[2px]">
        <button
          onClick={decrement}
          disabled={quantity <= 1}
          aria-label="Giảm số lượng"
          className="w-10 h-10 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-inset focus:ring-1 focus:ring-[#631521]"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span
          aria-live="polite"
          aria-label={`Số lượng: ${quantity}`}
          className="w-12 h-10 flex items-center justify-center font-sans font-bold text-base text-[#1A1614] border-x border-[#E8DFD5]"
        >
          {quantity}
        </span>

        <button
          onClick={increment}
          disabled={quantity >= max}
          aria-label="Tăng số lượng"
          className="w-10 h-10 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-inset focus:ring-1 focus:ring-[#631521]"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
