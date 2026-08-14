import { motion, AnimatePresence } from 'framer-motion'
import { X, Ruler, CheckCircle2 } from 'lucide-react'

export default function SizeGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const sizeTable = [
    { size: 'S', weight: '40 - 50 kg', height: '1m50 - 1m60', chest: '82 - 88 cm', waist: '62 - 70 cm' },
    { size: 'M', weight: '51 - 58 kg', height: '1m58 - 1m65', chest: '89 - 94 cm', waist: '71 - 76 cm' },
    { size: 'L', weight: '59 - 66 kg', height: '1m64 - 1m70', chest: '95 - 100 cm', waist: '77 - 82 cm' },
    { size: 'XL', weight: '67 - 75 kg', height: '1m68 - 1m75', chest: '101 - 108 cm', waist: '83 - 90 cm' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#FAF8F5] text-[#1A1614] rounded-[4px] border border-[#E8DFD5] max-w-2xl w-full p-6 md:p-8 shadow-luxury relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#8C7E74] hover:text-[#1A1614] transition-colors p-1"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Ruler className="w-5 h-5 text-[#C5A059]" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#8C7E74] uppercase">
              10PM SIZING GUIDE
            </span>
          </div>
          <h3 className="font-serif text-2xl md:text-3xl text-[#1A1614] mb-2 font-semibold">
            Bảng Chọn Kích Cỡ Chuẩn 10PM
          </h3>
          <p className="text-sm text-[#4A423C] mb-6 leading-relaxed">
            Form dáng Pijama Đũi 10PM được thiết kế <span className="font-semibold text-[#1A1614]">Relaxed Fit</span> rủ suông tự nhiên, thoải mái tối đa cho giấc ngủ. Quý khách có thể tự tin chọn size theo bảng dưới đây.
          </p>

          {/* Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9CDBF] bg-[#F5F0EB]">
                  <th className="py-3 px-4 font-bold tracking-wider text-[#1A1614]">SIZE</th>
                  <th className="py-3 px-4 font-semibold text-[#4A423C]">CÂN NẶNG</th>
                  <th className="py-3 px-4 font-semibold text-[#4A423C]">CHIỀU CAO</th>
                  <th className="py-3 px-4 font-semibold text-[#4A423C]">VÒNG NGỰC</th>
                  <th className="py-3 px-4 font-semibold text-[#4A423C]">VÒNG EO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DFD5]">
                {sizeTable.map((row) => (
                  <tr key={row.size} className="hover:bg-[#F5F0EB]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1A1614] text-sm">{row.size}</td>
                    <td className="py-3 px-4 font-medium text-[#26201C]">{row.weight}</td>
                    <td className="py-3 px-4 text-[#4A423C]">{row.height}</td>
                    <td className="py-3 px-4 text-[#4A423C]">{row.chest}</td>
                    <td className="py-3 px-4 text-[#4A423C]">{row.waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note & Commitment */}
          <div className="bg-[#F4ECE1]/60 p-4 rounded-[2px] border border-[#E2D8CC] flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
            <div className="text-xs text-[#4A423C] leading-relaxed">
              <span className="font-bold text-[#1A1614]">Đổi Size Tận Nhà 30 Ngày:</span> Nếu không vừa vặn, 10PM hỗ trợ đổi màu & đổi size tận nơi miễn phí phí ship 1 chiều cho quý khách.
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#1A1614] hover:bg-[#362E2A] text-[#FAF8F5] text-xs font-bold tracking-[0.2em] px-6 py-2.5 rounded-[2px] transition-colors"
            >
              HOÀN TẤT & ĐẶT HÀNG
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
