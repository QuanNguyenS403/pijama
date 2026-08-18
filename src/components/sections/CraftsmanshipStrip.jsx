import { Sparkles, ShieldCheck, Globe, Heart } from 'lucide-react'

export default function CraftsmanshipStrip() {
  const items = [
    { icon: Sparkles, text: 'TUYỂN CHỌN THỦ CÔNG' },
    { icon: ShieldCheck, text: 'KIỂM ĐỊNH TỪNG MÉT' },
    { icon: Globe, text: 'CHUẨN XUẤT KHẨU' },
    { icon: Heart, text: 'THÂN THIỆN VỚI DA' },
  ]

  return (
    <section className="bg-[#FAF8F5] border-y border-[#E8DFD5] py-6 overflow-hidden" aria-label="Cam kết chất lượng">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E8DFD5]/80">
          {items.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="flex items-center justify-center gap-3 py-3 md:py-1 px-4 text-center"
              >
                <Icon className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <span className="font-sans font-normal text-xs uppercase tracking-[0.12em] text-[#1A1614]">
                  {item.text}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
