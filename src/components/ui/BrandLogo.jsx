export default function BrandLogo({ variant = 'horizontal', className = '', color = 'navy', size = 'default' }) {
  const isGold = color === 'gold'
  const isWhite = color === 'white'
  
  const textColor = isWhite ? 'text-[#FAF8F5]' : isGold ? 'text-[#C5A059]' : 'text-[#0F172A]'
  const subColor = isWhite ? 'text-[#E8DFD5]/80' : isGold ? 'text-[#D4AF37]' : 'text-[#64748B]'
  const borderColor = isWhite ? 'border-[#D4AF37]/60' : isGold ? 'border-[#C5A059]' : 'border-[#D4AF37]/50'

  if (variant === 'circle' || variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <div className={`w-11 h-11 md:w-13 md:h-13 rounded-full overflow-hidden border ${borderColor} shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]`}>
          <img
            src="/images/logo.jpg"
            alt="QuanNguyenS Monogram Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    )
  }

  if (variant === 'image') {
    return (
      <div className={`relative inline-block ${className}`}>
        <img
          src="/images/logo.jpg"
          alt="QuanNguyenS Official Logo"
          className="w-auto h-10 md:h-12 object-contain rounded-md shadow-sm border border-[#D4AF37]/40"
        />
      </div>
    )
  }

  if (variant === 'monogram') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37] shadow-sm shrink-0">
          <img
            src="/images/logo.jpg"
            alt="QuanNguyenS Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <span className={`font-serif text-lg font-bold tracking-wider ${textColor} leading-none`}>
            QuanNguyenS
          </span>
          <span className={`text-[8px] font-sans font-semibold tracking-[0.25em] ${subColor} uppercase mt-1`}>
            European Casual Luxury
          </span>
        </div>
      </div>
    )
  }

  // Default: Elegant horizontal typographic logo with circular luxury monogram emblem
  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div className={`relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border ${borderColor} shadow-sm shrink-0 transition-all duration-300 group-hover:border-[#D4AF37] group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.4)]`}>
        <img
          src="/images/logo.jpg"
          alt="QuanNguyenS Logo"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-serif text-lg sm:text-xl md:text-2xl font-bold tracking-tight ${textColor} group-hover:opacity-95 transition-opacity leading-none`}>
            QuanNguyenS
          </span>
          <span className="text-[10px] font-serif italic text-[#C5A059] font-medium hidden sm:inline">
            10PM
          </span>
        </div>
        <span className={`text-[8px] md:text-[9px] font-sans uppercase tracking-[0.22em] ${subColor} mt-1 font-semibold`}>
          European Casual Luxury
        </span>
      </div>
    </div>
  )
}

