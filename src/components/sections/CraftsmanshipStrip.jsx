import { Sparkles, ShieldCheck, Globe, Heart, Crown } from 'lucide-react'

export default function CraftsmanshipStrip() {
  const features = [
    { icon: Sparkles, text: '100% Sợi Tự Nhiên Tuyển Chọn' },
    { icon: ShieldCheck, text: 'Kiểm Định Thủ Công Từng Mét Vải' },
    { icon: Globe, text: 'Chuẩn Mực Xuất Khẩu Châu Âu' },
    { icon: Heart, text: 'Thân Thiện & Dịu Êm Với Mọi Làn Da' },
    { icon: Crown, text: 'Phom Dáng Phóng Khoáng Từ Nhà Ra Phố' },
  ]

  // Lặp lại bộ đặc điểm để đảm bảo dải chạy tràn đầy và liên tục trên mọi kích cỡ màn hình
  const repeatedFeatures = [...features, ...features, ...features]

  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-r from-[#4A0D17] via-[#631521] to-[#4A0D17] border-y border-[#D4AF37]/35 py-3.5 sm:py-4 md:py-4.5 select-none shadow-luxury z-10"
      aria-label="5 đặc điểm nổi bật thương hiệu QuanNguyenS"
    >
      {/* Hiệu ứng mờ nghệ thuật 2 bên mép (Artistic edge vignette) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 md:w-36 bg-gradient-to-r from-[#4A0D17] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 md:w-36 bg-gradient-to-l from-[#4A0D17] to-transparent z-10" />

      {/* Marquee Track: Nhân đôi 2 khối để vòng lặp 50% chạy mượt mà vô tận */}
      <div className="flex animate-luxury-marquee cursor-default">
        {/* Khối 1 */}
        <div className="flex shrink-0 items-center">
          {repeatedFeatures.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={`f1-${idx}`}
                className="flex items-center gap-2.5 sm:gap-3.5 mx-7 sm:mx-10 md:mx-12 shrink-0"
              >
                <Icon className="w-[18px] h-[18px] sm:w-[21px] sm:h-[21px] text-[#D4AF37] shrink-0 stroke-[1.65]" />
                <span className="font-serif text-[15px] sm:text-[17px] md:text-[18.5px] lg:text-[19px] font-medium tracking-wide text-[#FAF8F5] whitespace-nowrap drop-shadow-sm">
                  {item.text}
                </span>
              </div>
            )
          })}
        </div>

        {/* Khối 2: Bản sao giống hệt để nối tiếp vòng lặp vô tận không giật */}
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {repeatedFeatures.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={`f2-${idx}`}
                className="flex items-center gap-2.5 sm:gap-3.5 mx-7 sm:mx-10 md:mx-12 shrink-0"
              >
                <Icon className="w-[18px] h-[18px] sm:w-[21px] sm:h-[21px] text-[#D4AF37] shrink-0 stroke-[1.65]" />
                <span className="font-serif text-[15px] sm:text-[17px] md:text-[18.5px] lg:text-[19px] font-medium tracking-wide text-[#FAF8F5] whitespace-nowrap drop-shadow-sm">
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
