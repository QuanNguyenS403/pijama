import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, ChevronDown, ChevronUp, Check, X, Camera } from 'lucide-react'
import { sampleReviews } from '../../data/products'

function StarRating({ rating = 5, size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className={`flex items-center gap-0.5 text-amber-400 ${sizeClasses[size] || 'text-sm'}`} aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? 'text-amber-400' : 'text-neutral-200'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function VerifiedCheckmark() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600">
      <span className="w-3.5 h-3.5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[9px] font-bold">
        ✓
      </span>
      Verified
    </span>
  )
}

const INITIAL_REVIEW_COUNT = 4

function useColumnCount() {
  const getCount = () => {
    if (typeof window === 'undefined') return 4
    const w = window.innerWidth
    if (w < 640) return 1
    if (w < 768) return 2
    if (w < 1024) return 3
    return 4
  }

  const [columnCount, setColumnCount] = useState(getCount)

  useEffect(() => {
    const handleResize = () => {
      const newCount = getCount()
      setColumnCount((prev) => (prev !== newCount ? newCount : prev))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return columnCount
}

function ReviewCard({ review, idx, onOpenPhoto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: (idx % 4) * 0.04 }}
      className="w-full bg-white rounded-lg border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300 overflow-hidden group/card"
    >
      {/* Photo Header (if present) */}
      {review.photo && (
        <div
          onClick={onOpenPhoto}
          className="relative w-full aspect-[4/5] bg-neutral-100 overflow-hidden cursor-pointer"
          title="Nhấn để xem ảnh phóng to"
        >
          <img
            src={review.photo}
            alt={`Feedback từ ${review.author}`}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/10 transition-colors duration-300 flex items-center justify-center">
            <span className="opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm text-neutral-900 text-[11px] font-sans font-medium px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Camera className="w-3 h-3" /> Xem ảnh
            </span>
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-1.5 text-left">
        {/* Author & Verified Badge */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans font-bold text-xs sm:text-[13px] text-neutral-900 tracking-tight">
              {review.author}
            </span>
            {review.verified && <VerifiedCheckmark />}
          </div>
        </div>

        {/* Star Rating */}
        <div className="my-0.5">
          <StarRating rating={review.rating} size="xs" />
        </div>

        {/* Review Text */}
        <p className="font-sans text-xs sm:text-[13px] font-normal text-neutral-700 leading-relaxed">
          {review.text}
        </p>

        {/* Item / Variant Tag at Bottom (Chính xác cho bộ sản phẩm này) */}
        {(review.color || review.size) && (
          <div className="mt-2 pt-2 border-t border-neutral-100 text-[11px] font-sans leading-tight flex flex-col text-neutral-400">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
              Phân loại:
            </span>
            <span className="text-neutral-600 font-medium mt-0.5">
              {review.color}{review.size ? ` · Size ${review.size}` : ''}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function ProductReviews({ product }) {
  const [filterType, setFilterType] = useState('all') // 'all' | 'photo' | '5star' | '4star'
  const [showFilters, setShowFilters] = useState(false)
  const [activePhotoModal, setActivePhotoModal] = useState(null)
  const [writeModalOpen, setWriteModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [newReviewSubmitted, setNewReviewSubmitted] = useState(false)

  // Reset khi đổi sản phẩm hoặc đổi bộ lọc
  useEffect(() => {
    setIsExpanded(false)
    setFilterType('all')
  }, [product.id])

  // 🔒 LỌC CHÍNH XÁC: CHỈ LẤY REVIEWS THUỘC VỀ ĐÚNG BỘ SẢN PHẨM HIỆN TẠI (Tuyệt đối không lẫn lộn sang bộ khác)
  const productReviews = useMemo(
    () => sampleReviews.filter((r) => r.productId === product.id),
    [product.id]
  )

  const photoReviews = useMemo(
    () => productReviews.filter((r) => Boolean(r.photo)),
    [productReviews]
  )

  const fiveStarReviews = useMemo(
    () => productReviews.filter((r) => r.rating === 5),
    [productReviews]
  )

  const fourStarReviews = useMemo(
    () => productReviews.filter((r) => r.rating === 4),
    [productReviews]
  )

  const filteredReviews = useMemo(() => {
    let list = productReviews

    if (filterType === 'photo') {
      list = list.filter((r) => Boolean(r.photo))
    } else if (filterType === '5star') {
      list = list.filter((r) => r.rating === 5)
    } else if (filterType === '4star') {
      list = list.filter((r) => r.rating === 4)
    }

    // Sắp xếp reviews theo thứ tự từ cao nhất xuống thấp nhất (5 sao -> 4 sao)
    return [...list].sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating // Đánh giá cao nhất xếp trước
      }
      // Cùng rating: ưu tiên review có kèm ảnh thực tế lên trước
      if (Boolean(b.photo) !== Boolean(a.photo)) {
        return Boolean(b.photo) ? 1 : -1
      }
      return 0
    })
  }, [filterType, productReviews])

  // Thu gọn ban đầu: chỉ hiển thị 4 reviews; khi bấm "Hiện thêm" thì hiển thị toàn bộ
  const visibleReviews = isExpanded
    ? filteredReviews
    : filteredReviews.slice(0, INITIAL_REVIEW_COUNT)

  const hasMoreThanInitial = filteredReviews.length > INITIAL_REVIEW_COUNT

  const columnCount = useColumnCount()

  // Sắp xếp reviews theo thứ tự từ trái qua phải, hết dòng thì xuống dưới
  const columns = useMemo(() => {
    const cols = Array.from({ length: columnCount }, () => [])
    visibleReviews.forEach((review, i) => {
      cols[i % columnCount].push({ review, originalIndex: i })
    })
    return cols
  }, [visibleReviews, columnCount])

  const handleToggleExpand = () => {
    if (isExpanded) {
      setIsExpanded(false)
      const el = document.getElementById('reviews')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      setIsExpanded(true)
    }
  }

  return (
    <section
      id="reviews"
      className="py-16 md:py-24 bg-[#FCFBF9] border-t border-[#E8DFD5] relative overflow-hidden"
      aria-label="Đánh giá từ khách hàng"
    >
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* ─── 1. Header (Matching Reference Dual-Color Serif Style) ─── */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] font-bold text-[#1A1614] tracking-tight leading-tight">
            Người Thật,{' '}
            <span className="italic font-normal text-[#631521]">Trải Nghiệm Thật</span>
          </h2>
          <p className="font-sans text-xs sm:text-sm md:text-base text-neutral-500 mt-3 leading-relaxed">
            Đánh giá thực tế từ khách hàng đã trải nghiệm <span className="font-semibold text-[#631521]">{product.name}</span> ({product.colors?.[0]?.label || product.colors?.[0]?.name}).
          </p>
        </div>

        {/* ─── 2. Review Summary & Filter Toolbar ─── */}
        <div className="border-b border-neutral-200 pb-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left: Star rating summary & dropdown toggle */}
            <div className="flex items-center gap-2.5">
              <StarRating rating={product.rating || 5} size="base" />
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className="group inline-flex items-center gap-1.5 font-sans text-xs sm:text-sm font-semibold text-neutral-800 hover:text-[#631521] transition-colors cursor-pointer"
                aria-expanded={showFilters}
                aria-label="Tùy chọn lọc đánh giá"
              >
                <span>{productReviews.length} Đánh giá đã xác thực</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 group-hover:text-[#631521] transition-transform duration-200 ${
                    showFilters ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Right: Actions (Write Review + Filter Slider Button) */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setWriteModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] px-3.5 py-1.5 rounded-full border border-[#631521] text-[#631521] hover:bg-[#631521] hover:text-white transition-all shadow-xs cursor-pointer"
              >
                <span>Viết đánh giá</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`p-2 rounded-md border transition-all cursor-pointer ${
                  showFilters
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                }`}
                title="Bật/tắt thanh lọc đánh giá"
                aria-label="Bật/tắt thanh lọc đánh giá"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Chips Bar (Collapsible / Toggleable) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4 flex items-center gap-2 flex-wrap text-xs font-sans">
                  <span className="text-neutral-400 mr-1 font-medium">Lọc theo:</span>
                  <button
                    onClick={() => {
                      setFilterType('all')
                      setIsExpanded(false)
                    }}
                    className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-[#631521] text-white font-semibold shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Tất cả ({productReviews.length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('photo')
                      setIsExpanded(false)
                    }}
                    className={`px-3 py-1.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer ${
                      filterType === 'photo'
                        ? 'bg-[#631521] text-white font-semibold shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Có ảnh thực tế ({photoReviews.length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('5star')
                      setIsExpanded(false)
                    }}
                    className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      filterType === '5star'
                        ? 'bg-[#631521] text-white font-semibold shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    5 Sao ★ ({fiveStarReviews.length})
                  </button>
                  {fourStarReviews.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterType('4star')
                        setIsExpanded(false)
                      }}
                      className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                        filterType === '4star'
                          ? 'bg-[#631521] text-white font-semibold shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      4 Sao ★ ({fourStarReviews.length})
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── 3. Left-to-Right Waterfall Masonry Grid ─── */}
        <div
          className={`grid gap-4 sm:gap-4.5 lg:gap-5 items-start ${
            columnCount === 1
              ? 'grid-cols-1'
              : columnCount === 2
              ? 'grid-cols-2'
              : columnCount === 3
              ? 'grid-cols-3'
              : 'grid-cols-4'
          }`}
        >
          {columns.map((colItems, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-3.5 sm:gap-4">
              <AnimatePresence>
                {colItems.map(({ review, originalIndex }) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    idx={originalIndex}
                    onOpenPhoto={() => setActivePhotoModal(review)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* ─── 4. Nút Tương Tác: "Hiện thêm" & "Ẩn bớt" ─── */}
        {hasMoreThanInitial && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={handleToggleExpand}
              className={`inline-flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-[0.16em] font-bold px-8 py-3.5 rounded-[3px] transition-all duration-200 cursor-pointer shadow-sm group ${
                isExpanded
                  ? 'border border-[#E8DFD5] bg-white text-[#4A3F38] hover:border-[#631521] hover:text-[#631521] hover:shadow-md'
                  : 'border-2 border-[#631521] bg-white text-[#631521] hover:bg-[#631521] hover:text-white hover:shadow-md'
              }`}
              aria-label={isExpanded ? 'Ẩn bớt đánh giá' : 'Hiện thêm đánh giá'}
            >
              <span>{isExpanded ? 'Ẩn bớt' : 'Hiện thêm'}</span>
              {!isExpanded && (
                <span className="text-[11px] font-normal lowercase tracking-normal text-neutral-500 group-hover:text-white/80">
                  ({filteredReviews.length - INITIAL_REVIEW_COUNT} đánh giá)
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ─── 5. Interactive Lightbox Modal ─── */}
      <AnimatePresence>
        {activePhotoModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
            onClick={() => setActivePhotoModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Photo Side */}
              <div className="md:w-1/2 bg-neutral-900 flex items-center justify-center relative min-h-[300px] md:min-h-[460px]">
                <img
                  src={activePhotoModal.photo}
                  alt={activePhotoModal.author}
                  className="w-full h-full object-cover max-h-[460px]"
                />
              </div>

              {/* Review Details Side */}
              <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-base text-neutral-900">
                        {activePhotoModal.author}
                      </span>
                      {activePhotoModal.verified && <VerifiedCheckmark />}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePhotoModal(null)}
                      className="p-1 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={activePhotoModal.rating} size="sm" />
                      <span className="text-xs text-neutral-400 font-sans">
                        {activePhotoModal.date}
                      </span>
                    </div>

                    <p className="font-sans text-sm text-neutral-700 leading-relaxed italic mt-3">
                      "{activePhotoModal.text}"
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 text-xs font-sans text-neutral-500">
                  <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E8DFD5]/60">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                      Sản phẩm đã chọn:
                    </span>
                    <span className="text-[#631521] font-medium text-xs mt-0.5 block">
                      {activePhotoModal.color} · Size {activePhotoModal.size}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── 6. Write Review Modal ─── */}
      <AnimatePresence>
        {writeModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setWriteModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setWriteModalOpen(false)}
                className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-800 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-serif text-2xl font-bold text-neutral-900 mb-1">
                Chia sẻ cảm nhận của bạn
              </h3>
              <p className="font-sans text-xs text-neutral-500 mb-5">
                Về bộ trang phục <span className="font-semibold text-neutral-800">{product.name}</span>
              </p>

              {newReviewSubmitted ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-sans font-bold text-neutral-900 text-base mb-1">
                    Cảm ơn bạn đã gửi đánh giá!
                  </h4>
                  <p className="font-sans text-xs text-neutral-500 max-w-xs mx-auto mb-6">
                    Đánh giá của bạn sẽ được kiểm duyệt và hiển thị trên website trong ít phút.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewReviewSubmitted(false)
                      setWriteModalOpen(false)
                    }}
                    className="font-sans text-xs uppercase tracking-wider font-semibold px-6 py-2.5 bg-[#631521] text-white rounded-md"
                  >
                    Hoàn tất
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setNewReviewSubmitted(true)
                  }}
                  className="space-y-4 font-sans text-xs"
                >
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">
                      Mức độ hài lòng của bạn
                    </label>
                    <div className="flex items-center gap-1 text-2xl text-amber-400 cursor-pointer">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="hover:scale-110 transition-transform">
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">
                      Tên của bạn *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Hoàng Yến N."
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#631521] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">
                      Nội dung đánh giá *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Chia sẻ về độ mềm vải, form dáng, cảm giác khi mặc..."
                      className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#631521] text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full font-sans text-xs uppercase tracking-[0.1em] font-bold py-3 bg-[#631521] text-white rounded-lg hover:bg-[#4A0D17] transition-colors shadow-md"
                    >
                      GỬI ĐÁNH GIÁ
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}

