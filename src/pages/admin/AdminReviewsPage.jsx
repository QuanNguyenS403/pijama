import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Star,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  Camera,
  ShieldCheck,
  Mail,
  Send,
  X,
} from 'lucide-react'

export default function AdminReviewsPage() {
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Modals
  const [rejectModalReview, setRejectModalReview] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [replyModalReview, setReplyModalReview] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [zoomPhoto, setZoomPhoto] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTriggeringInvites, setIsTriggeringInvites] = useState(false)

  const getAdminHeaders = () => {
    const token = sessionStorage.getItem('qns_admin_token') || ''
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  const fetchReviews = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/reviews?status=${activeTab}&limit=50`, {
        headers: getAdminHeaders(),
      })

      if (res.status === 401) {
        sessionStorage.removeItem('qns_admin_session')
        sessionStorage.removeItem('qns_admin_token')
        window.location.reload()
        return
      }

      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${res.status})`)
      }

      const json = await res.json()
      if (json.success && json.data) {
        setReviews(json.data.reviews || [])
        setCounts(json.data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 })
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đánh giá.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleApprove = async (reviewId) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi duyệt')

      setActionSuccess('Đã phê duyệt hiển thị đánh giá thành công.')
      setTimeout(() => setActionSuccess(null), 3000)
      fetchReviews(true)
    } catch (err) {
      alert(`Không thể duyệt đánh giá: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectModalReview || !rejectReason.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/reviews/${rejectModalReview.id}/moderate`, {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          status: 'rejected',
          rejectReason: rejectReason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi từ chối')

      setActionSuccess('Đã từ chối đánh giá kèm lý do ghi nhận.')
      setTimeout(() => setActionSuccess(null), 3000)
      setRejectModalReview(null)
      setRejectReason('')
      fetchReviews(true)
    } catch (err) {
      alert(`Không thể từ chối đánh giá: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyModalReview || !replyText.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/reviews/${replyModalReview.id}/reply`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          shopReply: replyText.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi gửi phản hồi')

      setActionSuccess('Đã lưu phản hồi chính thức từ QuanNguyenS.')
      setTimeout(() => setActionSuccess(null), 3000)
      setReplyModalReview(null)
      setReplyText('')
      fetchReviews(true)
    } catch (err) {
      alert(`Không thể gửi phản hồi: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTriggerInvites = async () => {
    if (!window.confirm('Hệ thống sẽ quét các đơn hàng ĐÃ GIAO (DELIVERED) chưa được mời và gửi tối đa 1 email mời đánh giá. Bạn có chắc chắn muốn thực hiện?')) {
      return
    }

    setIsTriggeringInvites(true)
    try {
      const res = await fetch('/api/admin/reviews/trigger-invites', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ minDaysDelivered: 5 }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi gửi lời mời')

      alert(data.message || 'Đã gửi lời mời thành công.')
    } catch (err) {
      alert(`Lỗi: ${err.message}`)
    } finally {
      setIsTriggeringInvites(false)
    }
  }

  const tabs = [
    { key: 'pending', label: 'Chờ duyệt', count: counts.pending, color: 'text-amber-700 bg-amber-50' },
    { key: 'approved', label: 'Đã duyệt', count: counts.approved, color: 'text-emerald-700 bg-emerald-50' },
    { key: 'rejected', label: 'Đã từ chối', count: counts.rejected, color: 'text-red-700 bg-red-50' },
    { key: 'all', label: 'Tất cả', count: counts.total, color: 'text-neutral-700 bg-neutral-100' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] font-sans pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E8DFD5] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7E74] hover:text-[#631521] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Quản Trị Đơn Hàng</span>
            </Link>
            <div className="h-4 w-px bg-neutral-300" />
            <div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] flex items-center gap-2">
                <span>Kiểm Duyệt Đánh Giá Khách Hàng</span>
                <span className="text-[10px] font-sans font-bold bg-[#631521] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Real Reviews
                </span>
              </h1>
              <p className="text-xs text-[#8C7E74]">
                Hệ thống chỉ hiển thị đánh giá thật từ khách đã nhận hàng. Phê duyệt minh bạch cả đánh giá chưa hài lòng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/broadcast"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#631521] bg-[#FAF8F5] border border-[#D4AF37] rounded hover:bg-[#F5F0EB] transition-colors"
            >
              <span>📢 Gửi Broadcast</span>
            </Link>
            <button
              type="button"
              onClick={handleTriggerInvites}
              disabled={isTriggeringInvites}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#631521] rounded hover:bg-[#4A0D17] transition-colors disabled:opacity-50"
              title="Quét đơn hàng DELIVERED để gửi thư mời đánh giá"
            >
              {isTriggeringInvites ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              <span>Gửi Thư Mời Đánh Giá</span>
            </button>
            <button
              type="button"
              onClick={() => fetchReviews(true)}
              disabled={isRefreshing}
              className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors text-neutral-600"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-[#E8DFD5] pt-2 pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#631521] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : tab.color}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {actionSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-[#631521]" />
            <span className="text-xs">Đang tải danh sách đánh giá...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-lg border border-[#E8DFD5] p-8 max-w-md mx-auto shadow-xs">
            <ShieldCheck className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-neutral-800 mb-1">
              Không có đánh giá nào trong mục này
            </h3>
            <p className="text-xs text-neutral-500">
              {activeTab === 'pending'
                ? 'Tuyệt vời! Hiện tại không có đánh giá nào đang chờ phê duyệt.'
                : 'Chưa có dữ liệu đánh giá tương ứng với bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-lg border border-[#E8DFD5] p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between flex-wrap gap-4 border-b border-neutral-100 pb-3">
                  {/* Left: Customer & Product Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#D4AF37]/40 flex items-center justify-center font-serif font-bold text-[#631521] text-sm shrink-0">
                      {rev.display_name?.charAt(0) || 'K'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-900">{rev.display_name}</span>
                        {rev.verified_purchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                            ✓ Đã mua hàng
                          </span>
                        )}
                        {rev.source === 'imported' && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded-full font-medium">
                            Nhập phản hồi ({rev.consent_evidence || 'Có bằng chứng'})
                          </span>
                        )}
                        {rev.order_id && (
                          <span className="text-[10px] text-neutral-500 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                            Đơn #{rev.order_id}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        Sản phẩm: <strong className="text-[#631521]">{rev.product_id}</strong> · Ngày gửi:{' '}
                        {new Date(rev.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & rating */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center text-amber-400 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= rev.rating ? 'text-amber-400' : 'text-neutral-200'}>
                          ★
                        </span>
                      ))}
                      <span className="text-xs font-bold text-neutral-700 ml-1.5">{rev.rating}/5</span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        rev.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rev.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rev.status === 'approved' ? 'Đã duyệt' : rev.status === 'rejected' ? 'Đã từ chối' : 'Chờ duyệt'}
                    </span>
                  </div>
                </div>

                {/* Review Body */}
                <div className="py-3">
                  <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-normal">
                    {rev.body}
                  </p>

                  {/* Photos list */}
                  {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {rev.photos.map((photo, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setZoomPhoto(photo)}
                          className="w-16 h-16 rounded overflow-hidden border border-neutral-200 relative group cursor-pointer"
                        >
                          <img src={photo} alt="Ảnh review" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reject reason notice if rejected */}
                  {rev.status === 'rejected' && rev.reject_reason && (
                    <div className="mt-2.5 p-2 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs rounded-r">
                      <strong>Lý do từ chối:</strong> {rev.reject_reason}
                    </div>
                  )}

                  {/* Shop reply display */}
                  {rev.shop_reply && (
                    <div className="mt-3 p-3 bg-[#FAF8F5] border-l-2 border-[#631521] rounded-r text-xs">
                      <div className="font-semibold text-[#631521] flex items-center justify-between">
                        <span>💬 Phản hồi chính thức từ QuanNguyenS:</span>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {rev.shop_replied_at && new Date(rev.shop_replied_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-neutral-700 mt-1 leading-relaxed">{rev.shop_reply}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyModalReview(rev)
                        setReplyText(rev.shop_reply || '')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 text-neutral-700 hover:border-[#631521] hover:text-[#631521] text-xs font-semibold transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{rev.shop_reply ? 'Sửa phản hồi' : 'Viết phản hồi'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleApprove(rev.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Phê duyệt</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setRejectModalReview(rev)
                          setRejectReason(rev.reject_reason || '')
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectModalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setRejectModalReview(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg font-bold text-red-700 mb-1">
              Từ chối phê duyệt đánh giá
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Theo quy chế, mọi đánh giá trung thực (kể cả chưa hài lòng) đều được công khai. Chỉ từ chối khi chứa từ ngữ xúc phạm, spam hoặc lộ thông tin cá nhân.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Lý do từ chối (Bắt buộc)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Chứa ngôn từ xúc phạm hoặc thông tin nhạy cảm..."
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:border-red-600 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReview(null)}
                  className="px-4 py-2 border border-neutral-300 rounded text-neutral-600 hover:bg-neutral-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  Xác nhận Từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModalReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setReplyModalReview(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg font-bold text-[#631521] mb-1">
              Phản hồi từ QuanNguyenS
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Phản hồi sẽ được hiển thị công khai ngay dưới đánh giá của khách hàng <strong>{replyModalReview.display_name}</strong>.
            </p>
            <form onSubmit={handleReplySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Nội dung phản hồi từ shop
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Kính gửi Quý khách, QuanNguyenS xin chân thành cảm ơn bạn đã tin tưởng..."
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:border-[#631521] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplyModalReview(null)}
                  className="px-4 py-2 border border-neutral-300 rounded text-neutral-600 hover:bg-neutral-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replyText.trim()}
                  className="px-4 py-2 bg-[#631521] hover:bg-[#4A0D17] text-white rounded font-semibold disabled:opacity-50"
                >
                  Lưu & Hiển Thị Phản Hồi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom Photo Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-neutral-900 rounded-lg overflow-hidden shadow-2xl">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={zoomPhoto} alt="Ảnh phóng to" className="max-h-[85vh] w-auto object-contain mx-auto" />
          </div>
        </div>
      )}
    </div>
  )
}
