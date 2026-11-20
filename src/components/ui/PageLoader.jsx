import React from 'react'

/**
 * Branded PageLoader — Màn hình loading nhận diện thương hiệu QuanNguyenS cao cấp.
 * Sử dụng hình ảnh Logo chính thức của website kết hợp vòng quay ánh kim (Gold & Burgundy)
 * và vệt sáng tiến trình thượng lưu, thay thế hoàn toàn spinner đơn điệu trước đây.
 */
export default function PageLoader({ fullScreen = true, message = 'Style To Be Lived In' }) {
  return (
    <div
      className={`${
        fullScreen ? 'min-h-screen fixed inset-0' : 'w-full py-20'
      } bg-[#FAF8F5] flex flex-col items-center justify-center z-[999] select-none overflow-hidden`}
      role="status"
      aria-live="polite"
      aria-label="Đang tải trang QuanNguyenS"
    >
      {/* Hào quang lụa vàng ánh kim tỏa nhẹ từ tâm */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-radial from-[#D4AF37]/15 via-[#631521]/5 to-transparent blur-3xl animate-pulse [animation-duration:3s]" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Cụm Logo & Vòng quay quỹ đạo kép (Dual Orbital Rings) */}
        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32">
          {/* Vòng quay chính: Vàng Gold hoàng gia (#D4AF37) và Đỏ Burgundy (#631521) */}
          <div className="absolute inset-0 rounded-full border-[2.5px] border-[#E8DFD5]/60 border-t-[#D4AF37] border-r-[#631521] animate-spin [animation-duration:1.4s]" />

          {/* Vòng quay phụ ngược chiều: Vạch đứt tạo chiều sâu tinh xảo */}
          <div className="absolute -inset-2 rounded-full border border-dashed border-[#D4AF37]/40 animate-spin [animation-duration:6s] [animation-direction:reverse]" />

          {/* Chấm ngọc vàng kim xoay quanh quỹ đạo ngoài */}
          <div className="absolute -inset-2 rounded-full animate-spin [animation-duration:2.8s]">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
          </div>

          {/* Khung Logo trung tâm nổi bật với viền vàng kim và nhịp thở nhẹ nhàng */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-1 bg-white border border-[#D4AF37] shadow-[0_8px_24px_rgba(99,21,33,0.14)] flex items-center justify-center z-10 animate-pulse [animation-duration:2.5s]">
            <div className="w-full h-full rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-inner">
              <img
                src="/images/logo.jpg"
                alt="QuanNguyenS Monogram Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Tên thương hiệu & Thông điệp */}
        <div className="mt-6 text-center flex flex-col items-center">
          <h2 className="font-serif text-xs sm:text-sm font-bold tracking-[0.3em] text-[#631521] uppercase">
            QuanNguyenS
          </h2>
          <p className="mt-1.5 font-sans text-[10px] sm:text-[11px] text-[#8C7E74] tracking-[0.22em] uppercase font-medium">
            {message}
          </p>

          {/* Thanh tiến trình ánh kim Shimmer siêu mảnh */}
          <div className="mt-3.5 w-24 sm:w-28 h-0.5 bg-[#E8DFD5] rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-gold-shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
