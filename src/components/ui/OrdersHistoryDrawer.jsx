import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  QrCode,
  Truck,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  Ban,
  Loader2,
  Globe,
  HelpCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatVND, ORDER_STATUSES, CARRIER_TRACKING_URLS } from '../../data/checkoutConfig'
import { syncBatchOrders } from '../../lib/orderSync'

// Helper resolved tracking URL
const getCarrierTrackingUrl = (carrier, trackingCode) => {
  if (!trackingCode) return null
  const c = String(carrier || '').toUpperCase()
  if (c.includes('GHTK') || c.includes('TIẾT KIỆM')) return CARRIER_TRACKING_URLS.GHTK(trackingCode)
  if (c.includes('VIETTEL')) return CARRIER_TRACKING_URLS.VIETTEL_POST(trackingCode)
  if (c.includes('SPX') || c.includes('SHOPEE')) return CARRIER_TRACKING_URLS.SPX(trackingCode)
  return CARRIER_TRACKING_URLS.GHN(trackingCode)
}

// Order Timeline Stepper Component
function OrderTrackingTimeline({ status, isVietQR, cancelReason }) {
  const normalizedStatus = String(status || 'PENDING').toUpperCase()

  if (normalizedStatus === 'CANCELLED') {
    return (
      <div className="py-2.5 px-3 bg-[#FFEBEE] border border-[#FFCDD2] rounded-[3px] space-y-1 text-xs text-[#C62828] font-sans">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-[#C62828] shrink-0" />
          <span className="font-semibold">Đơn hàng này đã bị hủy.</span>
        </div>
        {cancelReason && (
          <p className="text-[11px] text-[#B71C1C] pl-6 font-normal">
            Lý do: {cancelReason}
          </p>
        )}
      </div>
    )
  }

  if (normalizedStatus === 'AWAITING_PAYMENT') {
    return (
      <div className="py-2.5 px-3 bg-[#E8F0FE] border border-[#AECBFA] rounded-[3px] flex items-center justify-between text-xs text-[#1967D2] font-sans">
        <span className="flex items-center gap-1.5 font-semibold">
          <QrCode className="w-4 h-4" />
          Chờ quét mã VietQR để xác nhận
        </span>
        <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-[#AECBFA] font-medium">
          Ưu đãi -10%
        </span>
      </div>
    )
  }

  // Steps definition
  const steps = [
    { key: 'CONFIRMED', label: 'Đã xác nhận' },
    { key: 'PACKING', label: 'Đang đóng gói' },
    { key: 'SHIPPED', label: 'Đang giao' },
    { key: 'DELIVERED', label: 'Đã giao' },
  ]

  let activeIndex = 0
  if (normalizedStatus === 'CONFIRMED') activeIndex = 0
  else if (normalizedStatus === 'PACKING' || normalizedStatus === 'PROCESSING') activeIndex = 1
  else if (normalizedStatus === 'SHIPPED') activeIndex = 2
  else if (normalizedStatus === 'DELIVERED') activeIndex = 3

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting Progress Line */}
        <div className="absolute left-3 right-3 top-3 -translate-y-1/2 h-0.5 bg-[#E8DFD5] -z-0">
          <div
            className="h-full bg-[#631521] transition-all duration-500"
            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, idx) => {
          const isPassed = idx <= activeIndex
          const isCurrent = idx === activeIndex

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isPassed
                    ? 'bg-[#631521] text-white ring-2 ring-white shadow-xs'
                    : 'bg-[#FAF8F5] border-2 border-[#E8DFD5] text-[#8C7E74]'
                }`}
              >
                {idx < activeIndex ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span
                className={`text-[10px] font-sans mt-1 whitespace-nowrap ${
                  isCurrent
                    ? 'font-bold text-[#631521]'
                    : isPassed
                    ? 'font-medium text-[#1A1614]'
                    : 'text-[#8C7E74]'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrdersHistoryDrawer({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('LOCAL') // 'LOCAL' or 'ONLINE_LOOKUP'
  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState(null)
  const [expandedQrOrderId, setExpandedQrOrderId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [syncToast, setSyncToast] = useState(null)

  // Online Lookup State
  const [lookupQuery, setLookupQuery] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResults, setLookupResults] = useState(null)
  const [lookupError, setLookupError] = useState(null)

  // Load orders from localStorage
  const loadOrders = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      setOrders(Array.isArray(stored) ? stored : [])
    } catch (e) {
      console.error('Error loading orders:', e)
      setOrders([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadOrders()
      document.body.style.overflow = 'hidden'

      // Tự động kiểm tra trạng thái mới nhất từ server khi mở Drawer
      try {
        const stored = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
        const ids = stored.map((o) => o.orderId || o.id).filter(Boolean)
        if (ids.length > 0) {
          syncBatchOrders(ids).then(() => {
            loadOrders()
          })
        }
      } catch (e) {}
    } else {
      document.body.style.overflow = ''
    }

    const handleUpdate = (e) => {
      loadOrders()
      if (e?.detail) {
        const orderId = e.detail.orderId || e.detail.id
        setSyncToast(`Đơn hàng #${orderId} vừa được cập nhật trạng thái mới nhất!`)
        setTimeout(() => setSyncToast(null), 3500)
      }
    }

    window.addEventListener('orders_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('orders_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [isOpen])

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Handle Online Nationwide Lookup (P1 Item 7)
  const handleOnlineLookup = async (e) => {
    if (e) e.preventDefault()
    const q = lookupQuery.trim()
    if (!q || q.length < 3) {
      setLookupError('Vui lòng nhập tối thiểu 3 số điện thoại hoặc mã đơn hàng.')
      return
    }

    setIsLookingUp(true)
    setLookupError(null)
    setLookupResults(null)

    try {
      const res = await fetch(`/api/orders/lookup?query=${encodeURIComponent(q)}`)
      let data = {}
      try {
        data = await res.json()
      } catch (e) {
        data = { success: false, error: 'Không thể đọc phản hồi từ máy chủ' }
      }

      if (data.success) {
        setLookupResults(data.orders || [])
        if (!data.orders || data.orders.length === 0) {
          setLookupError(`Không tìm thấy đơn hàng nào khớp với "${q}".`)
        }
      } else {
        setLookupError(data.error || 'Không tìm thấy thông tin đơn hàng.')
      }
    } catch (err) {
      // Fallback search local storage
      const stored = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      const localMatches = stored.filter((o) => {
        const id = (o.orderId || '').toLowerCase()
        const phone = (o.customer?.phone || '').replace(/[^0-9]/g, '')
        const cleanQ = q.replace(/[^0-9]/g, '')
        return id.includes(q.toLowerCase()) || (cleanQ && phone.includes(cleanQ))
      })

      if (localMatches.length > 0) {
        setLookupResults(localMatches)
      } else {
        setLookupError(`Không tìm thấy đơn hàng nào khớp với "${q}".`)
      }
    } finally {
      setIsLookingUp(false)
    }
  }

  // Filtered orders for Local Tab
  const filteredOrders = useMemo(() => {
    let result = orders

    if (statusFilter !== 'ALL') {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (o) =>
          o.orderId?.toLowerCase().includes(q) ||
          o.customer?.phone?.toLowerCase().includes(q) ||
          o.customer?.fullName?.toLowerCase().includes(q)
      )
    }

    return result
  }, [orders, searchQuery, statusFilter])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[560px] bg-[#FAF8F5] shadow-2xl flex flex-col border-l border-[#E8DFD5]"
            aria-label="Đơn hàng đã đặt"
          >
            {/* Header */}
            <div className="bg-[#631521] text-[#FAF8F5] px-6 py-4.5 flex items-center justify-between border-b border-[#D4AF37]/30 relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-bold tracking-wide flex items-center gap-2">
                    Lịch Sử & Tra Cứu Đơn
                    {orders.length > 0 && (
                      <span className="text-[11px] font-sans font-semibold bg-[#D4AF37] text-[#2C201A] px-2 py-0.5 rounded-full">
                        {orders.length}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-white/70 font-light">
                    Theo dõi hành trình vận chuyển & hóa đơn
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors relative z-10 cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header Tabs */}
            <div className="flex border-b border-[#E8DFD5] bg-white text-xs font-sans">
              <button
                onClick={() => setActiveTab('LOCAL')}
                className={`flex-1 py-3 px-4 text-center font-bold tracking-wide transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'LOCAL'
                    ? 'border-[#631521] text-[#631521] bg-[#FAF5F0]/50'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                Đơn Trên Thiết Bị ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('ONLINE_LOOKUP')}
                className={`flex-1 py-3 px-4 text-center font-bold tracking-wide transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === 'ONLINE_LOOKUP'
                    ? 'border-[#631521] text-[#631521] bg-[#FAF5F0]/50'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Tra Cứu Bằng SĐT / Mã Đơn
              </button>
            </div>

            {/* Sync Notification Banner */}
            <AnimatePresence>
              {syncToast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#2E7D32] text-white px-4 py-2 text-xs font-sans font-medium flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#A5D6A7] shrink-0" />
                  <span>{syncToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB 1: LOCAL ORDERS */}
            {activeTab === 'LOCAL' && (
              <>
                {/* Search & Filter Bar */}
                {orders.length > 0 && (
                  <div className="p-4 bg-white border-b border-[#E8DFD5] space-y-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#8C7E74] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo Mã đơn (QNS-...) hoặc Số điện thoại..."
                        className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[3px] text-xs text-[#1A1614] placeholder-[#8C7E74] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7E74] hover:text-[#1A1614] text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-2 text-[11px] font-sans flex-wrap">
                      <span className="text-[#8C7E74]">Lọc:</span>
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 rounded-[2px] border transition-colors cursor-pointer ${
                          statusFilter === 'ALL'
                            ? 'bg-[#631521] text-white border-[#631521] font-semibold'
                            : 'bg-[#FAF8F5] text-[#4A3F38] border-[#E8DFD5] hover:bg-white'
                        }`}
                      >
                        Tất cả ({orders.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('AWAITING_PAYMENT')}
                        className={`px-2.5 py-1 rounded-[2px] border transition-colors cursor-pointer ${
                          statusFilter === 'AWAITING_PAYMENT'
                            ? 'bg-[#631521] text-white border-[#631521] font-semibold'
                            : 'bg-[#FAF8F5] text-[#4A3F38] border-[#E8DFD5] hover:bg-white'
                        }`}
                      >
                        Chờ VietQR ({orders.filter((o) => o.status === 'AWAITING_PAYMENT').length})
                      </button>
                    </div>
                  </div>
                )}

                {/* Body / Order List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 pdp-scrollbar">
                  {orders.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                      <div className="w-16 h-16 rounded-full bg-[#FAF5F0] border border-[#E8DFD5] flex items-center justify-center text-[#8C7E74] mb-4">
                        <Package className="w-8 h-8 stroke-[1.5]" />
                      </div>
                      <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1.5">
                        Chưa có đơn hàng nào trên thiết bị này
                      </h3>
                      <p className="text-xs text-[#8C7E74] max-w-xs mb-6 font-light leading-relaxed">
                        Bạn có thể chuyển sang mục <strong>"Tra Cứu Bằng SĐT"</strong> để tìm đơn đã đặt trước đó, hoặc khám phá bộ sưu tập mới nhất.
                      </p>
                      <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 bg-[#631521] text-white font-sans font-bold text-xs uppercase tracking-[0.15em] px-6 py-3 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 transition-all shadow-sm"
                      >
                        <span>Khám Phá Bộ Sưu Tập</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    /* No search result */
                    <div className="text-center py-12 text-[#8C7E74] text-xs">
                      <p>Không tìm thấy đơn hàng phù hợp với từ khóa "<strong>{searchQuery}</strong>".</p>
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('ALL')
                        }}
                        className="mt-3 text-[#631521] font-semibold underline"
                      >
                        Xem lại tất cả đơn
                      </button>
                    </div>
                  ) : (
                    /* Order Cards */
                    filteredOrders.map((order) => renderOrderCard(order))
                  )}
                </div>
              </>
            )}

            {/* TAB 2: NATIONWIDE ONLINE LOOKUP (P1 Item 7) */}
            {activeTab === 'ONLINE_LOOKUP' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pdp-scrollbar">
                <div className="bg-white p-5 rounded-[4px] border border-[#E8DFD5] space-y-3">
                  <h3 className="font-serif text-sm font-bold text-[#1A1614] uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#631521]" />
                    Tra Cứu Đơn Hàng Toàn Quốc
                  </h3>
                  <p className="text-xs text-[#4A3F38] font-light leading-relaxed">
                    Dù bạn đã xóa lịch sử duyệt web hoặc đặt hàng từ thiết bị khác, chỉ cần nhập <strong>Số điện thoại</strong> hoặc <strong>Mã đơn hàng (QNS-...)</strong> để kiểm tra trực tiếp.
                  </p>

                  <form onSubmit={handleOnlineLookup} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="Nhập SĐT (VD: 0981753082) hoặc Mã đơn..."
                      className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[3px] text-xs text-[#1A1614] focus:outline-none focus:border-[#631521] focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isLookingUp}
                      className="bg-[#631521] text-white px-5 py-2.5 rounded-[3px] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#4A0D17] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Tìm Kiếm</span>
                    </button>
                  </form>

                  {lookupError && (
                    <p className="text-xs text-[#C62828] bg-[#FFEBEE] p-2.5 rounded border border-[#FFCDD2]">
                      {lookupError}
                    </p>
                  )}
                </div>

                {/* Lookup Results */}
                {lookupResults && lookupResults.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-[#631521]">
                      Tìm thấy {lookupResults.length} đơn hàng:
                    </p>
                    {lookupResults.map((order) => renderOrderCard(order))}
                  </div>
                )}
              </div>
            )}

            {/* Footer hotline */}
            <div className="p-4 bg-white border-t border-[#E8DFD5] text-center text-xs text-[#8C7E74]">
              <p>
                Cần hỗ trợ tra cứu nhanh? Hotline:{' '}
                <a href="tel:0981753082" className="text-[#631521] font-bold hover:underline">
                  0981 753 082
                </a>
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )

  // Render individual Order Card
  function renderOrderCard(order) {
    const isVietQR = order.payment?.method === 'BANK_TRANSFER' || order.payment?.method === 'MOMO'
    const isExpandedQr = expandedQrOrderId === order.orderId
    const transferContent = `${order.customer?.fullName || 'Khach Hang'} ${order.customer?.phone || ''}`.trim()
    const qrUrl = `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${order.total}&accountName=NGUYEN%20DUC%20QUAN`
    const carrierUrl = getCarrierTrackingUrl(order.carrier, order.trackingCode)

    return (
      <div
        key={order.orderId}
        className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-xs overflow-hidden transition-all hover:border-[#D4AF37]/50 space-y-0"
      >
        {/* Order Header Bar */}
        <div className="bg-[#FAF5F0] p-3.5 sm:p-4 border-b border-[#E8DFD5] flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs sm:text-sm text-[#631521]">
                {order.orderId}
              </span>
              <button
                onClick={() => handleCopy(order.orderId, `id-${order.orderId}`)}
                className="text-[#8C7E74] hover:text-[#631521] p-1 rounded transition-colors"
                title="Sao chép mã đơn"
              >
                {copiedKey === `id-${order.orderId}` ? (
                  <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <span className="text-[11px] font-sans text-[#8C7E74] flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {order.orderDateVN || 'Vừa xong'}
            </span>
          </div>

          {/* Payment Method Badge */}
          <div>
            {order.status === 'CANCELLED' ? (
              <span className="inline-flex items-center gap-1 bg-[#FFEBEE] text-[#C62828] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#FFCDD2]">
                <Ban className="w-3 h-3" />
                Đã Hủy
              </span>
            ) : isVietQR && order.payment?.status !== 'PAID' ? (
              <span className="inline-flex items-center gap-1 bg-[#E8F0FE] text-[#1967D2] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#AECBFA]">
                <QrCode className="w-3 h-3" />
                Chờ VietQR (-10%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#C8E6C9]">
                <Truck className="w-3 h-3" />
                {order.payment?.methodLabel || (isVietQR ? 'VietQR (Đã thanh toán)' : 'COD')}
              </span>
            )}
          </div>
        </div>

        {/* Status Timeline Progression (P1 Item 5) */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-[#E8DFD5]">
          <OrderTrackingTimeline status={order.status} isVietQR={isVietQR} cancelReason={order.cancelReason} />
        </div>

        {/* Carrier Tracking Box (P1 Item 6) */}
        {order.trackingCode && (
          <div className="p-3.5 bg-[#F9F6F0] border-b border-[#E8DFD5] flex items-center justify-between flex-wrap gap-2 text-xs font-sans">
            <div>
              <p className="text-[11px] text-[#8C7E74]">Đơn vị vận chuyển:</p>
              <p className="font-bold text-[#1A1614] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#631521]" />
                {order.carrier || 'Giao Hàng Nhanh (GHN)'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-[#8C7E74]">Mã vận đơn:</span>
                <span className="font-mono font-bold text-[#631521]">{order.trackingCode}</span>
                <button
                  onClick={() => handleCopy(order.trackingCode, `track-${order.orderId}`)}
                  className="text-[#8C7E74] hover:text-[#631521]"
                  title="Sao chép mã vận đơn"
                >
                  {copiedKey === `track-${order.orderId}` ? (
                    <Check className="w-3 h-3 text-[#2E7D32]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {carrierUrl && (
              <a
                href={carrierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-[#631521] text-white text-[11px] font-bold px-3 py-1.5 rounded-[2px] hover:bg-[#4A0D17] transition-colors"
              >
                <span>Tra cứu hành trình</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="p-3.5 sm:p-4 space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-12 h-14 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] overflow-hidden shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src="/images/logo.jpg"
                      alt="QuanNguyenS Logo"
                      className="w-full h-full object-cover opacity-80"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1A1614] line-clamp-1">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-[#8C7E74] mt-0.5">
                    {item.variant || `${item.color || ''} | Size ${item.size || ''}`} · SL: x{item.quantity}
                  </p>
                  <p className="font-serif font-bold text-[#631521] mt-1">
                    {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary & Customer Info */}
        <div className="p-3.5 sm:p-4 bg-[#FAF8F5] border-t border-[#E8DFD5] text-xs font-sans space-y-2">
          <div className="flex justify-between text-[#4A3F38]">
            <span>Người nhận:</span>
            <span className="font-semibold text-[#1A1614]">
              {order.customer?.fullName} ({order.customer?.phone})
            </span>
          </div>
          <div className="flex justify-between text-[#4A3F38]">
            <span className="shrink-0 pr-2">Địa chỉ giao:</span>
            <span className="text-right text-[#1A1614] line-clamp-1" title={order.shipping?.fullAddress}>
              {order.shipping?.fullAddress}
            </span>
          </div>
          <div className="flex justify-between text-[#4A3F38]">
            <span>Thanh toán:</span>
            <span className="font-medium text-[#1A1614]">
              {order.payment?.methodLabel || (isVietQR ? 'VietQR (Giảm 10%)' : 'COD')}
            </span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-[#2E7D32] font-semibold">
              <span>Ưu đãi Chuyển khoản (10%):</span>
              <span>-{formatVND(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-[#E8DFD5]">
            <span className="font-bold uppercase text-[#1A1614]">Tổng thanh toán:</span>
            <span className="font-serif text-base font-bold text-[#631521]">
              {formatVND(order.total)}
            </span>
          </div>
        </div>

        {/* VietQR Quick Payment Toggle */}
        {isVietQR && order.payment?.status !== 'PAID' && (
          <div className="p-3.5 sm:p-4 bg-[#FAF5F0] border-t border-[#E8DFD5]">
            <button
              onClick={() => setExpandedQrOrderId(isExpandedQr ? null : order.orderId)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#631521] hover:text-[#4A0D17] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#631521]" />
                {isExpandedQr ? 'Ẩn thông tin quét mã VietQR' : 'Xem mã QR & Thông tin chuyển khoản Vietcombank'}
              </span>
              {isExpandedQr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {isExpandedQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-[#E8DFD5] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-[3px] border border-[#E8DFD5]">
                    {/* QR Code */}
                    <div className="w-36 h-36 bg-white p-1 rounded border border-[#E8DFD5] shadow-xs shrink-0 flex items-center justify-center">
                      <img
                        src={qrUrl}
                        alt="VietQR Vietcombank"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Bank info */}
                    <div className="space-y-1.5 text-xs text-[#1A1614] flex-1 w-full">
                      <p className="font-serif font-bold text-[#631521] uppercase text-[11px]">
                        Ngân hàng Vietcombank (VCB)
                      </p>
                      <div className="flex items-center justify-between bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5]">
                        <span>Số TK: <strong className="font-mono text-sm text-[#631521]">1050773506</strong></span>
                        <button
                          onClick={() => handleCopy('1050773506', `stk-${order.orderId}`)}
                          className="text-[#631521] text-[11px] font-bold hover:underline flex items-center gap-1"
                        >
                          {copiedKey === `stk-${order.orderId}` ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </div>
                      <p className="text-[11px]"><strong>Chủ TK:</strong> NGUYEN DUC QUAN</p>
                      <div className="flex items-center justify-between bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5]">
                        <span className="text-[11px]">Nội dung CK: <strong className="font-mono text-[#631521]">{transferContent}</strong></span>
                        <button
                          onClick={() => handleCopy(transferContent, `ct-${order.orderId}`)}
                          className="text-[#631521] text-[11px] font-bold hover:underline flex items-center gap-1"
                        >
                          {copiedKey === `ct-${order.orderId}` ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#8C7E74] italic">
                        * Quý khách vui lòng nhập Nội dung CK: {transferContent} khi thanh toán.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Order Footer Support */}
        <div className="px-3.5 py-2.5 bg-white border-t border-[#E8DFD5] flex items-center justify-between text-[11px] text-[#8C7E74] flex-wrap gap-2">
          <span>Hỗ trợ đơn hàng:</span>
          <a
            href="tel:0981753082"
            className="text-[#631521] hover:underline font-medium flex items-center gap-1"
          >
            <Phone className="w-3 h-3" />
            0981 753 082
          </a>
        </div>
      </div>
    )
  }
}
