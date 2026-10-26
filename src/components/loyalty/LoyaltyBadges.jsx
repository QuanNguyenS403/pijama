import React from 'react'

/**
 * Luxury SVG Badges for QuanNguyenS 4 Loyalty Tiers
 * - MEMBER: Thân Thiết (Warm Bronze & Champagne)
 * - SILVER: Bạc (Polished Silver & Platinum)
 * - GOLD: Vàng (Royal Gold #D4AF37)
 * - DIAMOND: Kim Cương (Imperial Burgundy #631521 & Brilliant Diamond)
 */

export function TierBadge({ tier = 'MEMBER', size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const dim = sizeMap[size] || sizeMap.md

  switch (tier?.toUpperCase()) {
    case 'DIAMOND':
      return (
        <div className={`relative inline-flex items-center justify-center ${dim} ${className}`} title="Hội Viên Kim Cương">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8A1E2D" />
                <stop offset="50%" stopColor="#631521" />
                <stop offset="100%" stopColor="#3E0A12" />
              </linearGradient>
              <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE082" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#997A15" />
              </linearGradient>
            </defs>
            {/* Outer Octagon Crest */}
            <polygon
              points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30"
              fill="url(#diamondGrad)"
              stroke="url(#goldRim)"
              strokeWidth="3.5"
            />
            {/* Inner Filigree Octagon */}
            <polygon
              points="33,12 67,12 88,33 88,67 67,88 33,88 12,67 12,33"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />
            {/* Brilliant Cut Diamond Center */}
            <polygon points="50,22 74,38 65,74 35,74 26,38" fill="none" stroke="#FFE082" strokeWidth="2" />
            <polygon points="50,22 65,74 35,74" fill="none" stroke="#FFE082" strokeWidth="1.5" />
            <line x1="26" y1="38" x2="74" y2="38" stroke="#FFE082" strokeWidth="1.5" />
            <line x1="50" y1="22" x2="50" y2="74" stroke="#FFE082" strokeWidth="1.5" />
            {/* Sparkle Glint */}
            <circle cx="50" cy="22" r="2.5" fill="#FFFFFF" />
            <circle cx="74" cy="38" r="1.5" fill="#FFFFFF" />
            <circle cx="26" cy="38" r="1.5" fill="#FFFFFF" />
          </svg>
        </div>
      )

    case 'GOLD':
      return (
        <div className={`relative inline-flex items-center justify-center ${dim} ${className}`} title="Hội Viên Vàng">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="goldBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2B2" />
                <stop offset="35%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#8C6E14" />
              </linearGradient>
              <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2C201A" />
                <stop offset="100%" stopColor="#1A1614" />
              </linearGradient>
            </defs>
            {/* Royal Circular Shield */}
            <circle cx="50" cy="50" r="44" fill="url(#goldDark)" stroke="url(#goldBg)" strokeWidth="4" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#D4AF37" strokeWidth="1.2" strokeDasharray="3,3" />
            {/* Royal Coronet Crown */}
            <path
              d="M28,62 L32,42 L42,50 L50,32 L58,50 L68,42 L72,62 Z"
              fill="url(#goldBg)"
              stroke="#FFF"
              strokeWidth="1"
            />
            {/* Crown Base Gems */}
            <rect x="28" y="62" width="44" height="6" rx="2" fill="#D4AF37" stroke="#FFE082" strokeWidth="1" />
            <circle cx="36" cy="65" r="1.5" fill="#631521" />
            <circle cx="50" cy="65" r="2" fill="#631521" />
            <circle cx="64" cy="65" r="1.5" fill="#631521" />
            {/* Crown Tips */}
            <circle cx="32" cy="40" r="2" fill="#FFFFFF" />
            <circle cx="50" cy="30" r="2.5" fill="#FFFFFF" />
            <circle cx="68" cy="40" r="2" fill="#FFFFFF" />
          </svg>
        </div>
      )

    case 'SILVER':
      return (
        <div className={`relative inline-flex items-center justify-center ${dim} ${className}`} title="Hội Viên Bạc">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="silverBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#C0C6CF" />
                <stop offset="100%" stopColor="#7E8794" />
              </linearGradient>
              <linearGradient id="silverInner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#333A42" />
                <stop offset="100%" stopColor="#1E2328" />
              </linearGradient>
            </defs>
            {/* Heraldic Shield */}
            <path
              d="M50,8 L84,20 L84,52 C84,72 68,88 50,94 C32,88 16,72 16,52 L16,20 Z"
              fill="url(#silverInner)"
              stroke="url(#silverBg)"
              strokeWidth="3.5"
            />
            {/* Inner Shield Line */}
            <path
              d="M50,15 L78,25 L78,51 C78,67 65,81 50,86 C35,81 22,67 22,51 L22,25 Z"
              fill="none"
              stroke="#D8DEE4"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />
            {/* Silver Star Crest */}
            <polygon
              points="50,28 55,42 70,42 58,51 62,65 50,56 38,65 42,51 30,42 45,42"
              fill="url(#silverBg)"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </svg>
        </div>
      )

    case 'MEMBER':
    default:
      return (
        <div className={`relative inline-flex items-center justify-center ${dim} ${className}`} title="Hội Viên Thân Thiết">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            <defs>
              <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E2A77A" />
                <stop offset="50%" stopColor="#A6673E" />
                <stop offset="100%" stopColor="#6E3D1D" />
              </linearGradient>
              <linearGradient id="memberDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF8F5" />
                <stop offset="100%" stopColor="#EFE8DD" />
              </linearGradient>
            </defs>
            {/* Elegant Scalloped Medallion */}
            <circle cx="50" cy="50" r="42" fill="url(#memberDark)" stroke="url(#bronzeGrad)" strokeWidth="3" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#A6673E" strokeWidth="1" strokeDasharray="3,3" />
            {/* Classic Monogram Q Ribbon Motif */}
            <path
              d="M50,26 C38,26 30,35 30,48 C30,61 39,70 50,70 C56,70 61,67 65,62 L71,70 L75,66 L68,59 C69,56 70,52 70,48 C70,35 62,26 50,26 Z M50,33 C58,33 63,40 63,48 C63,56 58,63 50,63 C42,63 37,56 37,48 C37,40 42,33 50,33 Z"
              fill="url(#bronzeGrad)"
            />
          </svg>
        </div>
      )
  }
}

export function TierPill({ tier = 'MEMBER', className = '' }) {
  const configs = {
    MEMBER: {
      label: 'Hạng Thân Thiết',
      bg: 'bg-[#FAF5F0]',
      border: 'border-[#A6673E]/40',
      text: 'text-[#8A522A]',
      discount: 'Ưu đãi chuẩn',
    },
    SILVER: {
      label: 'Hạng Bạc',
      bg: 'bg-[#F1F3F5]',
      border: 'border-[#8B95A5]/40',
      text: 'text-[#444D56]',
      discount: 'Giảm 5%',
    },
    GOLD: {
      label: 'Hạng Vàng',
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#D4AF37]/50',
      text: 'text-[#92600E]',
      discount: 'Giảm 10%',
    },
    DIAMOND: {
      label: 'Hạng Kim Cương',
      bg: 'bg-[#FDF2F4]',
      border: 'border-[#631521]/40',
      text: 'text-[#631521]',
      discount: 'Giảm 15%',
    },
  }

  const c = configs[tier?.toUpperCase()] || configs.MEMBER

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] border text-[10.5px] font-bold uppercase tracking-wider ${c.bg} ${c.border} ${c.text} ${className}`}
    >
      <TierBadge tier={tier} size="sm" className="w-3.5 h-3.5" />
      <span>{c.label}</span>
      <span className="opacity-70 font-normal">({c.discount})</span>
    </span>
  )
}
