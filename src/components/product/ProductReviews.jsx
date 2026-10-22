import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, ChevronDown, Check, X, Camera, Star, AlertCircle, Loader2, ShieldCheck, MessageSquare } from 'lucide-react'
import { useProductReviews } from '../../hooks/useProductReviews'

function StarRating({ rating = 5, size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  }

  const rounded = Math.round(Number(rating) || 5)

  return (
    <div className={`flex items-center gap-0.5 text-amber-400 ${sizeClasses[size] || 'text-sm'}`} aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rounded ? 'text-amber-400' : 'text-neutral-200'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function VerifiedBadge({ verified, source }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
          ✓
        </span>
        Đã mua hàng
      </span>
    )
  }

  if (source === 'imported') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
        Phản hồi qua Zalo/FB
      </span>
    )
  }

  return null
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
  const photo = review.photos?.[0] || review.photo || null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: (idx % 4) * 0.04 }}
      className="w-full bg-white rounded-lg border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300 overflow-hidden group/card"
    >
      {/* Photo Header (if present) */}
      {photo && (
        <div
          onClick={() => onOpenPhoto(photo)}
          className="relative w-full aspect-[4/5] bg-neutral-100 overflow-hidden cursor-pointer"
          title="Nhấn để xem ảnh phóng to"
        >
          <img
            src={photo}
            alt={`Feedback từ ${review.displayName || review.author || 'Khách hàng'}`}
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
        {/* Author & Badge */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans font-bold text-xs sm:text-[13px] text-neutral-900 tracking-tight">
              {review.displayName || review.author}
            </span>
            <VerifiedBadge verified={review.verifiedPurchase ?? review.verified} source={review.source} />
          </div>
        </div>

        {/* Star Rating */}
        <div className="my-0.5">
          <StarRating rating={review.rating} size="xs" />
        </div>

        {/* Review Text */}
        <p className="font-sans text-xs sm:text-[13px] font-normal text-neutral-700 leading-relaxed break-words">
          {review.body || review.text}
        </p>

        {/* Shop Reply if available */}
        {review.shopReply && (
          <div className="mt-3 p-2.5 bg-[#FAF8F5] border-l-2 border-[#631521] rounded-r text-[11px] font-sans">
            <span className="font-semibold text-[#631521] flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Phản hồi từ QuanNguyenS:
            </span>
            <p className="text-neutral-600 mt-1 leading-relaxed">
              {review.shopReply}
            </p>
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

  // API Query parameters mapping
  const filterParams = useMemo(() => {
    let rating = null
    let hasPhoto = false
    if (filterType === '5star') rating = 5
    else if (filterType === '4star') rating = 4
    else if (filterType === 'photo') hasPhoto = true
    return { rating, hasPhoto }
  }, [filterType])

  // Lấy dữ liệu đánh giá thật từ máy chủ API
  const { reviews, summary, loading, refetch } = useProductReviews(product.id, filterParams)

  // Bắt tham số trên URL nếu khách đến từ email mời (review_token)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('review_token')
      const orderId = params.get('order_id')
      if (token || orderId) {
        setWriteModalOpen(true)
      }
    }
  }, [])

  // Thu gọn ban đầu: chỉ hiển thị 4 reviews; khi bấm "Hiện thêm" thì hiển thị toàn bộ
  const visibleReviews = isExpanded
    ? reviews
    : reviews.slice(0, INITIAL_REVIEW_COUNT)

  const hasMoreThanInitial = reviews.length > INITIAL_REVIEW_COUNT
  const columnCount = useColumnCount()

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

  // ── Form State cho Modal Đánh Giá Thật ──
  const [step, setStep] = useState(1) // 1: Tra cứu đơn, 2: Viết đánh giá
  const [orderIdInput, setOrderIdInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [inviteTokenInput, setInviteTokenInput] = useState('')
  const [verifiedOrderData, setVerifiedOrderData] = useState(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  // Review fields
  const [selectedRating, setSelectedRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [reviewBodyInput, setReviewBodyInput] = useState('')
  const [selectedItemKey, setSelectedItemKey] = useState('')
  const [photoFiles, setPhotoFiles] = useState([])
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Tự động kiểm tra URL khi mở modal
  useEffect(() => {
    if (writeModalOpen && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('review_token')
      const order = params.get('order_id')
      if (token) setInviteTokenInput(token)
      if (order) setOrderIdInput(order)

      if (token || order) {
        handleVerifyOrder(order, token)
      }
    }
  }, [writeModalOpen])

  const handleVerifyOrder = async (orderIdToVerify = orderIdInput, tokenToVerify = inviteTokenInput) => {
    setVerifyLoading(true)
    setVerifyError(null)

    try {
      const params = new URLSearchParams()
      if (orderIdToVerify) params.append('orderId', orderIdToVerify.trim())
      if (tokenToVerify) params.append('inviteToken', tokenToVerify.trim())
      if (phoneInput) params.append('phone', phoneInput.trim())

      const res = await fetch(`/api/reviews/verify-order?${params.toString()}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể xác thực đơn hàng')
      }

      setVerifiedOrderData(data)
      setDisplayNameInput(data.customerName || '')

      // Tìm sản phẩm trong đơn
      const match = data.items.find((i) => i.productId === product.id && !i.alreadyReviewed)
      if (match) {
        setSelectedItemKey(match.itemKey)
      } else if (data.items.length > 0) {
        setSelectedItemKey(data.items[0].itemKey)
      }

      if (!data.isDelivered) {
        setVerifyError(`Đơn hàng #${data.orderId} đang ở trạng thái "${data.status}". Bạn chỉ có thể đánh giá sau khi đơn hàng đã được giao thành công (DELIVERED).`)
      } else if (data.items.every((i) => i.alreadyReviewed)) {
        setVerifyError(`Toàn bộ sản phẩm trong đơn hàng #${data.orderId} đã được đánh giá. Cảm ơn bạn!`)
      } else {
        setStep(2) // Chuyển sang form viết đánh giá
      }
    } catch (err) {
      setVerifyError(err.message)
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setSubmitLoading(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.append('productId', product.id)
      formData.append('rating', String(selectedRating))
      formData.append('body', reviewBodyInput.trim())
      formData.append('displayName', displayNameInput.trim())
      formData.append('orderId', verifiedOrderData?.orderId || orderIdInput.trim())
      if (inviteTokenInput) formData.append('inviteToken', inviteTokenInput.trim())
      if (phoneInput) formData.append('phone', phoneInput.trim())
      if (selectedItemKey) formData.append('itemKey', selectedItemKey)

      if (photoFiles && photoFiles.length > 0) {
        photoFiles.forEach((file) => formData.append('photos', file))
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi gửi đánh giá')
      }

      setSubmitSuccess(true)
      refetch()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const resetModal = () => {
    setWriteModalOpen(false)
    setStep(1)
    setVerifyError(null)
    setSubmitError(null)
    setSubmitSuccess(false)
    setReviewBodyInput('')
    setPhotoFiles([])
  }

  const hasReviews = summary.totalReviews > 0

  return (
    <section
      id="reviews"
      className="py-16 md:py-24 bg-[#FCFBF9] border-t border-[#E8DFD5] relative overflow-hidden"
      aria-label="Đánh giá từ khách hàng"
    >
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* ─── 1. Header ─── */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] font-bold text-[#1A1614] tracking-tight leading-tight">
            Người Thật,{' '}
            <span className="italic font-normal text-[#631521]">Trải Nghiệm Thật</span>
          </h2>
          <p className="font-sans text-xs sm:text-sm md:text-base text-neutral-500 mt-3 leading-relaxed">
            {hasReviews ? (
              <>
                Đánh giá thực tế từ khách hàng đã nhận và trải nghiệm{' '}
                <span className="font-semibold text-[#631521]">{product.name}</span>.
              </>
            ) : (
              <>
                Trải nghiệm thực tế về <span className="font-semibold text-[#631521]">{product.name}</span> từ chính khách hàng đã nhận hàng.
              </>
            )}
          </p>
        </div>

        {/* ─── 2. Review Summary & Filter Toolbar ─── */}
        <div className="border-b border-neutral-200 pb-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left: Star rating summary & dropdown toggle */}
            <div className="flex items-center gap-2.5">
              {hasReviews ? (
                <>
                  <StarRating rating={summary.averageRating} size="base" />
                  <span className="font-bold text-sm text-[#1A1614]">{summary.averageRating}</span>
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="group inline-flex items-center gap-1.5 font-sans text-xs sm:text-sm font-semibold text-neutral-800 hover:text-[#631521] transition-colors cursor-pointer"
                    aria-expanded={showFilters}
                    aria-label="Tùy chọn lọc đánh giá"
                  >
                    <span>{summary.totalReviews} đánh giá đã mua hàng</span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-500 group-hover:text-[#631521] transition-transform duration-200 ${
                        showFilters ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Star className="w-4 h-4 text-neutral-300" />
                  <span>Chưa có đánh giá nào cho sản phẩm này</span>
                </div>
              )}
            </div>

            {/* Right: Actions (Write Review + Filter Slider Button) */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setWriteModalOpen(true)
                  setStep(1)
                }}
                className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] px-3.5 py-1.5 rounded-full border border-[#631521] text-[#631521] hover:bg-[#631521] hover:text-white transition-all shadow-xs cursor-pointer"
              >
                <span>Viết đánh giá</span>
              </button>

              {hasReviews && (
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
              )}
            </div>
          </div>

          {/* Filter Chips Bar (Collapsible) */}
          <AnimatePresence>
            {showFilters && hasReviews && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4 flex items-center gap-2 flex-wrap text-xs font-sans">
                  <span className="text-neutral-400 mr-1 font-medium">Lọc theo:</span>

                  {[
                    { key: 'all', label: `Tất cả (${summary.totalReviews})` },
                    { key: 'photo', label: `Có ảnh (${summary.photoCount || 0})` },
                    { key: '5star', label: `5 sao (${summary.ratingDistribution?.[5] || 0})` },
                    { key: '4star', label: `4 sao (${summary.ratingDistribution?.[4] || 0})` },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setFilterType(filter.key)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                        filterType === filter.key
                          ? 'bg-[#631521] text-white font-medium shadow-xs'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 font-normal'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── 3. Reviews Display or Empty State ─── */}
        {loading ? (
          <div className="py-16 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#631521]" />
            <span className="text-xs">Đang tải đánh giá từ khách hàng...</span>
          </div>
        ) : !hasReviews ? (
          <div className="py-12 px-6 max-w-lg mx-auto bg-white rounded-lg border border-[#E8DFD5] text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#D4AF37]/50 text-[#631521] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-[#631521]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1">
              Chưa có đánh giá nào cho sản phẩm này
            </h3>
            <p className="font-sans text-xs text-[#8C7E74] leading-relaxed mb-5">
              QuanNguyenS chỉ hiển thị đánh giá xác thực từ chính những khách hàng đã đặt mua và nhận hàng thành công. Hãy là người đầu tiên trải nghiệm và chia sẻ cảm nhận của bạn!
            </p>
            <button
              type="button"
              onClick={() => {
                setWriteModalOpen(true)
                setStep(1)
              }}
              className="px-5 py-2.5 bg-[#631521] text-white rounded-[3px] text-xs font-semibold uppercase tracking-wider hover:bg-[#4A0D17] transition-all"
            >
              Gửi Đánh Giá Đơn Hàng Của Bạn
            </button>
          </div>
        ) : (
          <>
            {/* Masonry-like Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-4">
                  {col.map(({ review, originalIndex }) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      idx={originalIndex}
                      onOpenPhoto={(photoUrl) => setActivePhotoModal(photoUrl)}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Expand / Collapse Button */}
            {hasMoreThanInitial && (
              <div className="text-center mt-12">
                <button
                  type="button"
                  onClick={handleToggleExpand}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-neutral-300 bg-white hover:border-[#631521] hover:text-[#631521] text-xs font-sans font-semibold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  <span>{isExpanded ? 'Thu gọn' : `Xem thêm đánh giá (${reviews.length - INITIAL_REVIEW_COUNT})`}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── 4. Photo Zoom Modal ─── */}
        <AnimatePresence>
          {activePhotoModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
              onClick={() => setActivePhotoModal(null)}
            >
              <div
                className="relative max-w-2xl max-h-[90vh] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 p-2 rounded-full transition-colors z-10"
                  aria-label="Đóng ảnh phóng to"
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={activePhotoModal}
                  alt="Ảnh trải nghiệm thực tế từ khách hàng"
                  className="max-h-[85vh] w-auto object-contain mx-auto"
                />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ─── 5. Write Review Modal ─── */}
        <AnimatePresence>
          {writeModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
              onClick={resetModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8"
              >
                <button
                  type="button"
                  onClick={resetModal}
                  className="absolute top-5 right-5 text-neutral-400 hover:text-neutral-800 transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-serif text-2xl font-bold text-neutral-900 mb-1">
                  Đánh giá sản phẩm thật
                </h3>
                <p className="font-sans text-xs text-neutral-500 mb-5">
                  Về bộ trang phục <span className="font-semibold text-neutral-800">{product.name}</span>
                </p>

                {submitSuccess ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="font-sans font-bold text-neutral-900 text-base mb-1">
                      Cảm ơn bạn đã gửi đánh giá!
                    </h4>
                    <p className="font-sans text-xs text-neutral-500 max-w-xs mx-auto mb-6">
                      Đánh giá của bạn đã được ghi nhận vào hệ thống và sẽ hiển thị công khai trên website sau khi được kiểm duyệt theo quy chế.
                    </p>
                    <button
                      type="button"
                      onClick={resetModal}
                      className="font-sans text-xs uppercase tracking-wider font-semibold px-6 py-2.5 bg-[#631521] text-white rounded-md hover:bg-[#4A0D17] transition-all"
                    >
                      Hoàn tất
                    </button>
                  </div>
                ) : step === 1 ? (
                  /* Bước 1: Tra cứu đơn hàng để đảm bảo review từ khách thật đã nhận hàng */
                  <div className="space-y-4 font-sans text-xs">
                    <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD5] rounded text-neutral-700 leading-relaxed">
                      <p className="font-semibold text-[#631521] mb-1">Nguyên tắc đánh giá minh bạch:</p>
                      <p>
                        QuanNguyenS cam kết chỉ hiển thị đánh giá từ khách hàng đã đặt mua và nhận hàng thành công. Vui lòng cung cấp mã đơn hàng để xác minh.
                      </p>
                    </div>

                    {verifyError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{verifyError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Mã đơn hàng (Ví dụ: QNS-123456)
                      </label>
                      <input
                        type="text"
                        value={orderIdInput}
                        onChange={(e) => setOrderIdInput(e.target.value)}
                        placeholder="Nhập mã đơn hàng của bạn..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-[#631521]"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Số điện thoại đặt hàng
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Số điện thoại nhận hàng..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-[#631521]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={verifyLoading || !orderIdInput.trim()}
                      onClick={() => handleVerifyOrder()}
                      className="w-full py-2.5 bg-[#631521] hover:bg-[#4A0D17] text-white font-semibold rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {verifyLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang kiểm tra đơn hàng...</span>
                        </>
                      ) : (
                        <span>Tiếp Tục Viết Đánh Giá</span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Bước 2: Điền nội dung đánh giá */
                  <form onSubmit={handleSubmitReview} className="space-y-4 font-sans text-xs">
                    {submitError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {/* Rating Stars Selector */}
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Mức độ hài lòng của bạn
                      </label>
                      <div className="flex items-center gap-1.5 text-2xl text-amber-400 cursor-pointer">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setSelectedRating(star)}
                            className="hover:scale-110 transition-transform p-0.5"
                          >
                            <span className={star <= (hoverRating || selectedRating) ? 'text-amber-400' : 'text-neutral-200'}>
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="text-xs font-semibold text-neutral-600 ml-2">
                          {selectedRating === 5 && 'Tuyệt vời'}
                          {selectedRating === 4 && 'Hài lòng'}
                          {selectedRating === 3 && 'Bình thường'}
                          {selectedRating === 2 && 'Chưa hài lòng'}
                          {selectedRating === 1 && 'Rất thất vọng'}
                        </span>
                      </div>
                    </div>

                    {/* Display Name Input */}
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Tên hiển thị của bạn
                      </label>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="Ví dụ: Thùy Trang"
                        required
                        className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-[#631521]"
                      />
                      <span className="text-[10px] text-neutral-400 mt-0.5 block">
                        Để bảo vệ quyền riêng tư, tên của bạn sẽ được hiển thị dạng rút gọn (ví dụ: Trang N.).
                      </span>
                    </div>

                    {/* Review Body */}
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Cảm nhận chi tiết về sản phẩm (tối thiểu 10 ký tự)
                      </label>
                      <textarea
                        rows={4}
                        value={reviewBodyInput}
                        onChange={(e) => setReviewBodyInput(e.target.value)}
                        placeholder="Hãy chia sẻ cảm nhận về chất liệu vải, độ vừa vặn của size, đường may hoặc trải nghiệm đóng gói..."
                        required
                        minLength={10}
                        maxLength={2000}
                        className="w-full px-3 py-2 border border-neutral-300 rounded text-xs focus:outline-none focus:border-[#631521] resize-none"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Tối thiểu 10 ký tự</span>
                        <span>{reviewBodyInput.length}/2000</span>
                      </div>
                    </div>

                    {/* Photo Upload */}
                    <div>
                      <label className="block text-neutral-700 font-semibold mb-1">
                        Hình ảnh thực tế khi nhận hàng (tùy chọn, tối đa 3 ảnh)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(0, 3)
                          setPhotoFiles(files)
                        }}
                        className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200"
                      />
                      {photoFiles.length > 0 && (
                        <span className="text-[10px] text-emerald-600 mt-1 block">
                          ✓ Đã chọn {photoFiles.length} hình ảnh đính kèm
                        </span>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2 border border-neutral-300 rounded text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={submitLoading || reviewBodyInput.trim().length < 10}
                        className="flex-1 py-2.5 bg-[#631521] hover:bg-[#4A0D17] text-white font-semibold rounded text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {submitLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang gửi đánh giá...</span>
                          </>
                        ) : (
                          <span>Gửi Đánh Giá</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
