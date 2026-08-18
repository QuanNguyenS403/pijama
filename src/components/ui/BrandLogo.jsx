export default function BrandLogo({ variant = 'horizontal', className = '', color = 'navy' }) {
  const isGold = color === 'gold'
  const isWhite = color === 'white'
  
  const textColor = isWhite ? 'text-[#FAF8F5]' : isGold ? 'text-[#C5A059]' : 'text-[#0F172A]'
  const subColor = isWhite ? 'text-[#E8DFD5]/80' : isGold ? 'text-[#D4AF37]' : 'text-[#64748B]'

  if (variant === 'circle') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#FAF8F5] border border-[#E8DFD5] shadow-sm flex flex-col items-center justify-center p-1.5 transition-transform hover:scale-105">
          <span className="font-serif text-base md:text-lg font-bold tracking-tight text-[#0F172A] leading-none">
            QNS
          </span>
          <div className="w-8 h-[1px] bg-[#0F172A] my-0.5" />
          <span className="text-[6px] md:text-[7px] font-serif font-semibold tracking-[0.18em] text-[#0F172A] uppercase leading-none">
            QUANNGUYENS
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'monogram') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="w-9 h-9 rounded-full bg-[#0F172A] text-[#FAF8F5] flex items-center justify-center font-serif text-sm font-bold tracking-wider shadow-sm">
          QNS
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-lg font-bold tracking-wider text-[#0F172A] leading-none">
            QuanNguyenS
          </span>
          <span className="text-[8px] font-sans font-semibold tracking-[0.25em] text-[#64748B] uppercase mt-0.5">
            10PM Sleepwear
          </span>
        </div>
      </div>
    )
  }

  // Default: Elegant horizontal typographic logo with circular monogram emblem
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#FAF8F5] border border-[#D9CDBF] shadow-sm flex flex-col items-center justify-center transition-all group-hover:border-[#C5A059] group-hover:shadow-md">
        <span className="font-serif text-xs md:text-sm font-bold tracking-tight text-[#0F172A] leading-none">
          QNS
        </span>
        <div className="w-6 h-[0.5px] bg-[#0F172A]/70 my-0.5" />
        <span className="text-[5px] md:text-[5.5px] font-serif font-bold tracking-[0.15em] text-[#0F172A] uppercase leading-none">
          QUANNGUYENS
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-serif text-xl md:text-2xl font-bold tracking-tight ${textColor} group-hover:opacity-90 transition-opacity leading-none`}>
            QuanNguyenS
          </span>
          <span className="text-[10px] font-serif italic text-[#C5A059] font-medium hidden sm:inline">
            10PM
          </span>
        </div>
        <span className={`text-[8px] md:text-[9px] font-sans uppercase tracking-[0.25em] ${subColor} mt-1 font-semibold`}>
          Chất Liệu Tự Nhiên Cao Cấp
        </span>
      </div>
    </div>
  )
}
