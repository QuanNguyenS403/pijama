import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function SizeGuideModal({ isOpen, onClose, sizeGuide = {} }) {
  if (!isOpen) return null

  const sizes = Object.keys(sizeGuide)
  const useWeightSchema =
    sizeGuide &&
    Object.values(sizeGuide)[0] &&
    Object.values(sizeGuide)[0].hasOwnProperty('weight')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full bg-[#FAF8F5] border border-[#E8DFD5] shadow-2xl p-6 sm:p-8"
              style={{
                maxWidth: useWeightSchema ? '560px' : '660px',
                borderRadius: '0px',
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Bảng Size"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#8C7E74] hover:text-[#631521] transition-colors cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center pb-4 border-b border-[#E8DFD5]">
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#1A1614] tracking-wide">
                  BẢNG SIZE
                </h2>
              </div>

              {/* Size Table */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#631521] text-[#FAF8F5]">
                      <th className="py-3 px-3 sm:px-4 text-left font-sans font-bold text-[0.75rem] uppercase tracking-[0.1em]">
                        SIZE
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        CÂN NẶNG
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        CHIỀU CAO
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        VÒNG NGỰC
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        VÒNG EO
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        DÀI QUẦN
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                        DÀI TAY
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((size, idx) => {
                      const data = sizeGuide[size]
                      const isEven = idx % 2 === 0
                      return (
                        <tr
                          key={size}
                          className="border-b border-[#E8DFD5]"
                          style={{
                            backgroundColor: isEven ? '#EDD9D0' : '#FAF8F5',
                          }}
                        >
                          <td className="py-3.5 px-3 sm:px-4 font-sans font-bold text-sm text-[#631521]">
                            {size}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-medium text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.weight || '—'}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-light text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.height || '—'}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-light text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.chest ? `${data.chest} cm` : '—'}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-light text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.waist ? `${data.waist} cm` : '—'}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-light text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.trouserLength || '—'}
                          </td>
                          <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-light text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                            {data?.sleeveLength || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Note */}
              <p className="font-sans font-light italic text-[0.8rem] text-[#8C7E74] text-center mt-5 leading-relaxed">
                * Bảng size mang tính tham khảo. Nếu bạn đang ở giữa 2 size, chọn size lớn hơn.
              </p>

              {/* Close Button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 border border-[#E8DFD5] text-[#1A1614] hover:bg-[#F5F0EB] hover:text-[#631521] transition-colors font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
                  style={{ borderRadius: '0px' }}
                >
                  ĐÓNG
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
