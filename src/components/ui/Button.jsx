export default function Button({ variant = 'primary', children, className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 font-sans font-medium text-[0.8rem] uppercase tracking-[0.12em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed rounded-[2px]'

  const variants = {
    primary:
      'bg-[#631521] text-[#FAF8F5] px-9 py-[14px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury focus:ring-[#631521]',
    secondary:
      'bg-[#2C201A] text-white px-9 py-[14px] hover:bg-[#1E1510] hover:text-[#D4AF37] border border-white/20 focus:ring-[#2C201A]',
    gold:
      'bg-[#D4AF37] text-[#2C201A] px-9 py-[14px] hover:bg-[#B8860B] font-bold focus:ring-[#D4AF37]',
    ghost:
      'bg-transparent border border-[#631521] text-[#631521] px-8 py-[12px] hover:bg-[#631521] hover:text-[#FAF8F5] focus:ring-[#631521]',
    'ghost-dark':
      'bg-transparent border border-[#D4AF37] text-[#D4AF37] px-8 py-[12px] hover:bg-[#D4AF37] hover:text-[#2C201A] focus:ring-[#D4AF37]',
    icon:
      'bg-transparent text-[#8C7E74] px-3 py-2 hover:text-[#631521] text-xs font-light normal-case tracking-normal',
  }

  return (
    <button className={`${base} ${variants[variant] || ''} ${className}`} {...props}>
      {children}
    </button>
  )
}
