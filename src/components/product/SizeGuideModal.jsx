import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function SizeGuideModal({ isOpen, onClose, sizeGuide = {} }) {
  if (!isOpen) return null

  const sizes = Object.keys(sizeGuide)
  const isGarmentSpec = sizes.some(
    (s) => sizeGuide[s]?.shirtLength || sizeGuide[s]?.maxWaist || sizeGuide[s]?.thigh
  )
  const hasWeight = sizes.some((s) => sizeGuide[s]?.weight)
  const hasHeight = sizes.some((s) => sizeGuide[s]?.height)

  const cleanNum = (val) => {
    if (!val && val !== 0) return '—'
    const num = String(val).replace(/[^0-9.,–-]/g, '').trim()
    return num || String(val)
  }

  const formatWithUnit = (val) => {
    if (!val && val !== 0) return '—'
    const str = String(val).trim()
    return str.endsWith('cm') || str.endsWith('kg') ? str : `${str} cm`
  }

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
                maxWidth: isGarmentSpec ? '520px' : hasWeight ? '580px' : '660px',
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

              {isGarmentSpec ? (
                /* Garment Specs Layout (Thiết kế chuẩn theo mẫu hình ảnh cung cấp) */
                <div className="mt-6 space-y-7">
                  {/* BẢNG 1: THÔNG SỐ ÁO */}
                  <div>
                    <div className="text-xs font-serif font-bold text-[#631521] uppercase tracking-[0.18em] mb-3 text-center">
                      ✦ THÔNG SỐ ÁO (CM)
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 items-center">
                      {/* Header Row */}
                      <div></div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          DÀI ÁO
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          VÒNG NGỰC
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          DÀI TAY
                        </span>
                      </div>

                      {/* Data Rows */}
                      {sizes.map((sz) => {
                        const data = sizeGuide[sz] || {}
                        return (
                          <div key={`top-${sz}`} className="contents">
                            <div className="flex justify-center py-2 sm:py-2.5">
                              <span className="w-12 sm:w-14 py-1 sm:py-1.5 rounded-full bg-[#D8D2CA] text-[#1A1614] font-sans font-medium text-xs sm:text-sm text-center">
                                {sz}
                              </span>
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.shirtLength)}
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.chest)}
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.sleeveLength)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* BẢNG 2: THÔNG SỐ QUẦN */}
                  <div className="pt-4 border-t border-[#E8DFD5]/70">
                    <div className="text-xs font-serif font-bold text-[#631521] uppercase tracking-[0.18em] mb-3 text-center">
                      ✦ THÔNG SỐ QUẦN (CM)
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4 items-center">
                      {/* Header Row */}
                      <div></div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          MAX EO
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          ĐÙI
                        </span>
                      </div>
                      <div className="flex justify-center">
                        <span className="rounded-full border border-[#8C7E74]/70 px-2.5 sm:px-4 py-1.5 text-[0.7rem] sm:text-xs font-sans font-medium text-[#1A1614] uppercase tracking-wider text-center">
                          DÀI QUẦN
                        </span>
                      </div>

                      {/* Data Rows */}
                      {sizes.map((sz) => {
                        const data = sizeGuide[sz] || {}
                        return (
                          <div key={`bottom-${sz}`} className="contents">
                            <div className="flex justify-center py-2 sm:py-2.5">
                              <span className="w-12 sm:w-14 py-1 sm:py-1.5 rounded-full bg-[#D8D2CA] text-[#1A1614] font-sans font-medium text-xs sm:text-sm text-center">
                                {sz}
                              </span>
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.maxWaist || data.waist)}
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.thigh)}
                            </div>
                            <div className="font-sans text-sm sm:text-base text-[#1A1614] text-center py-2 sm:py-2.5 font-normal">
                              {cleanNum(data.trouserLength)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Table Layout */
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#631521] text-[#FAF8F5]">
                        <th className="py-3 px-3 sm:px-4 text-left font-sans font-bold text-[0.75rem] uppercase tracking-[0.1em]">
                          SIZE
                        </th>
                        {hasWeight && (
                          <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                            CÂN NẶNG
                          </th>
                        )}
                        {hasHeight && (
                          <th className="py-3 px-3 sm:px-4 text-center font-sans font-semibold text-[0.75rem] uppercase tracking-[0.1em] whitespace-nowrap">
                            CHIỀU CAO
                          </th>
                        )}
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
                            {hasWeight && (
                              <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-medium text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                                {data?.weight || '—'}
                              </td>
                            )}
                            {hasHeight && (
                              <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-normal text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                                {data?.height || '—'}
                              </td>
                            )}
                            <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-normal text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                              {formatWithUnit(data?.chest)}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-normal text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                              {formatWithUnit(data?.waist)}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-normal text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                              {formatWithUnit(data?.trouserLength)}
                            </td>
                            <td className="py-3.5 px-3 sm:px-4 text-center font-sans font-normal text-xs sm:text-sm text-[#1A1614] whitespace-nowrap">
                              {formatWithUnit(data?.sleeveLength)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer Note */}
              <p className="font-sans font-normal italic text-[0.8rem] text-[#8C7E74] text-center mt-5 leading-relaxed">
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
