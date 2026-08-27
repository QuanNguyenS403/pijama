import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Package,
  Truck,
  Copy,
  Check,
  Gift,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import { formatVND } from '../data/checkoutConfig'

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const orderId = searchParams.get('orderId') || 'QNS-' + Date.now().toString().slice(-6)

  // Lấy dữ liệu order từ location state, sessionStorage hoặc localStorage
  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    try {
      const saved = sessionStorage.getItem(`last_order_${orderId}`) || sessionStorage.getItem('latest_order')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.orderId === orderId || !searchParams.get('orderId')) return parsed
      }
      const storedOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      return storedOrders.find((o) => o.orderId === orderId) || null
    } catch (e) {
      console.error(e)
      return null
    }
  })
  const [copiedField, setCopiedField] = useState(null)
  const [liveStatusUpdate, setLiveStatusUpdate] = useState(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })

    const refreshOrderData = () => {
      try {
        const saved = sessionStorage.getItem(`last_order_${orderId}`) || sessionStorage.getItem('latest_order')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.orderId === orderId || !searchParams.get('orderId')) {
            setOrder(parsed)
            return
          }
        }
        const storedOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
        const found = storedOrders.find((o) => (o.orderId || o.id) === orderId)
        if (found) setOrder(found)
      } catch (e) {
        console.error(e)
      }
    }

    if (!order) {
      refreshOrderData()
    }

    // Lắng nghe sự kiện Admin cập nhật đơn hàng realtime
    const handleOrderUpdated = (e) => {
      const updated = e?.detail
      if (updated && (updated.orderId === orderId || updated.id === orderId)) {
        setOrder(updated)
        setLiveStatusUpdate(`Trạng thái đơn hàng vừa được cập nhật: ${updated.status}`)
        setTimeout(() => setLiveStatusUpdate(null), 5000)
      } else {
        refreshOrderData()
      }
    }

    window.addEventListener('orders_updated', handleOrderUpdated)
    window.addEventListener('storage', handleOrderUpdated)

    return () => {
      window.removeEventListener('orders_updated', handleOrderUpdated)
      window.removeEventListener('storage', handleOrderUpdated)
    }
  }, [location.state, orderId])

  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenOrdersDrawer = () => {
    window.dispatchEvent(new Event('open_orders_drawer'))
  }

  const customerEmail = order?.customer?.email || ''
  const customerName = order?.customer?.fullName || 'Quý khách'
  const customerPhone = order?.customer?.phone || ''
  const total = order?.total || 0
  const isBankTransfer = order?.payment?.method === 'BANK_TRANSFER' || order?.payment?.method === 'MOMO'

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614]">
      <title>Đặt Hàng Thành Công — QuanNguyenS</title>

      <Header />
      <div className="h-16 md:h-20" />

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-luxury overflow-hidden"
        >
          {/* Top Decorative Brand Banner */}
          <div className="bg-[#631521] px-6 py-8 text-center text-[#FAF8F5] relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-15" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-[#FAF8F5] text-[#631521] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#D4AF37] shadow-lg relative z-10"
            >
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </motion.div>

            <span className="font-serif text-xs font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-1.5 relative z-10">
              XÁC NHẬN ĐƠN HÀNG
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide relative z-10">
              Đặt Hàng Thành Công!
            </h1>
            <div className="inline-flex items-center gap-2 mt-3 bg-black/25 px-4 py-1.5 rounded-full border border-white/20 relative z-10">
              <p className="font-mono text-xs text-[#FAF8F5] tracking-wider">
                Mã đơn: <strong className="text-[#D4AF37]">{orderId}</strong>
              </p>
              <button
                onClick={() => handleCopy(orderId, 'orderId')}
                className="text-white/80 hover:text-white p-0.5 rounded"
                title="Sao chép mã đơn"
              >
                {copiedField === 'orderId' ? (
                  <Check className="w-3.5 h-3.5 text-[#A5D6A7]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {!order ? (
              /* State: Không tìm thấy dữ liệu đơn hàng */
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-[#FAF5F0] border border-[#E8DFD5] text-[#631521] rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-xl font-bold text-[#1A1614]">
                  Không tìm thấy dữ liệu đơn hàng
                </h2>
                <p className="text-xs sm:text-sm font-light text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                  Không tìm thấy thông tin đơn hàng trên thiết bị này. Vui lòng kiểm tra lại trong mục <strong>Đơn Hàng Đã Đặt</strong> hoặc liên hệ hotline <strong>0981 753 082</strong> để được hỗ trợ kiểm tra trực tiếp.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                  <button
                    onClick={handleOpenOrdersDrawer}
                    className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-[#D4AF37]" />
                    Mục Đơn Hàng Đã Đặt
                  </button>
                  <Link
                    to="/"
                    className="flex-1 bg-white text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#FAF5F0] border border-[#631521] transition-all text-center flex items-center justify-center"
                  >
                    Về Trang Chủ
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Greeting & Email confirmation note */}
                <div className="text-center max-w-lg mx-auto space-y-2">
                  <p className="font-serif text-lg font-bold text-[#1A1614]">
                    Cảm ơn {customerName} đã tin tưởng lựa chọn QuanNguyenS
                  </p>

                  {/* Live Status Notification if updated */}
                  {liveStatusUpdate && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#2E7D32] text-white p-3 rounded-[3px] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{liveStatusUpdate}</span>
                    </motion.div>
                  )}

                  {order.status === 'CANCELLED' ? (
                    <div className="bg-[#FFEBEE] border border-[#FFCDD2] p-3.5 rounded-[3px] text-xs text-[#C62828] space-y-1 text-left">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>❌</span> Đơn hàng đã được hủy bởi cửa hàng
                      </p>
                      {order.cancelReason && (
                        <p className="font-normal">
                          <strong>Lý do hủy:</strong> {order.cancelReason}
                        </p>
                      )}
                    </div>
                  ) : order.payment?.status === 'CUSTOMER_CLAIMED_PAID' ? (
                    <div className="bg-[#FAF5F0] border border-[#D4AF37]/50 p-3.5 rounded-[3px] text-xs text-[#631521] space-y-1 text-left">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>⏳</span> Đang đối soát giao dịch chuyển khoản với Vietcombank
                      </p>
                      <p className="text-[#4A3F38] font-light leading-relaxed">
                        Hệ thống đang tự động kiểm tra biến động số dư. Sau khi giao dịch được xác thực, email hóa đơn chính thức sẽ được gửi ngay tới <strong>{customerEmail || 'email của bạn'}</strong>.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-light text-[#4A3F38] leading-relaxed">
                      Hệ thống đã tự động gửi email xác nhận kèm hóa đơn chi tiết tới địa chỉ{' '}
                      <strong className="text-[#631521] font-semibold">{customerEmail || 'email của bạn'}</strong>. Vui lòng kiểm tra hộp thư (hoặc mục Spam/Quảng cáo).
                    </p>
                  )}
                </div>

                {/* Tracking Code Box if shipped by Admin */}
                {(order.trackingCode || order.trackingNumber) && (
                  <div className="bg-[#FAF5F0] border-2 border-[#D4AF37] p-4 rounded-[4px] flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#631521] flex items-center gap-1.5">
                        <Truck className="w-4 h-4" />
                        Đơn hàng đang trên đường giao
                      </span>
                      <p className="text-xs text-[#1A1614] mt-1 font-medium">
                        Đơn vị: <strong>{order.carrier || 'GHN'}</strong> · Mã vận đơn:{' '}
                        <strong className="font-mono text-[#631521] text-sm">{order.trackingCode || order.trackingNumber}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(order.trackingCode || order.trackingNumber, 'tracking')}
                      className="inline-flex items-center gap-1.5 bg-[#631521] text-white text-xs font-semibold px-3 py-1.5 rounded-[2px] hover:bg-[#4A0D17] transition-colors cursor-pointer"
                    >
                      {copiedField === 'tracking' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#A5D6A7]" />
                          <span>Đã sao chép mã</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép mã</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Order Details Box */}
                <div className="bg-[#FAF5F0] rounded-[3px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3 flex-wrap gap-2">
                    <div>
                      <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#631521]">
                        Tóm Tắt Đơn Hàng
                      </span>
                      <span className="text-xs font-mono text-[#8C7E74] ml-3">
                        {order.orderDateVN || 'Vừa xong'}
                      </span>
                    </div>

                    {/* Live Status Badge */}
                    <div>
                      {order.status === 'CANCELLED' ? (
                        <span className="bg-[#FFEBEE] text-[#C62828] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#FFCDD2]">
                          ⚫ Đã Hủy
                        </span>
                      ) : order.status === 'SHIPPED' ? (
                        <span className="bg-[#FFEDD5] text-[#EA580C] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#FED7AA]">
                          🟠 Đang giao shipper
                        </span>
                      ) : order.status === 'PROCESSING' ? (
                        <span className="bg-[#EDE9FE] text-[#7C3AED] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#DDD6FE]">
                          🟣 Đang đóng gói
                        </span>
                      ) : order.status === 'CONFIRMED' ? (
                        <span className="bg-[#DBEAFE] text-[#2563EB] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#BFDBFE]">
                          🔵 Đã xác nhận
                        </span>
                      ) : order.status === 'DELIVERED' ? (
                        <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#BBF7D0]">
                          🟢 Đã giao thành công
                        </span>
                      ) : (
                        <span className="bg-[#FEF3C7] text-[#D97706] text-[11px] font-bold px-2.5 py-1 rounded-[2px] border border-[#FDE68A]">
                          🟡 Chờ xác nhận
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  {order.items && order.items.length > 0 && (
                    <div className="space-y-3">
                      {order.items.map((item, idx) => {
                        const isItemPreOrder = !!(
                          item.isPreOrder ||
                          item.slug === 'the-classic-set' ||
                          item.productId === 'the-classic-set' ||
                          item.productName?.includes('DAYBREAK')
                        )
                        return (
                          <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                            <div className="pr-4">
                              <p className="font-bold text-[#1A1614] flex items-center gap-1.5 flex-wrap">
                                <span>{item.productName}</span>
                                {isItemPreOrder && (
                                  <span className="bg-[#FAF5F0] text-[#631521] border border-[#D4AF37]/60 text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-[2px]">
                                    ⏱ Đặt trước (7-10 ngày)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-[#8C7E74]">{item.variant} · SL: x{item.quantity}</p>
                            </div>
                            <span className="font-serif font-bold text-[#631521] shrink-0">
                              {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Discount Row (If Any) */}
                  {order.discount > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#2E7D32]">
                      <span className="font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        Ưu đãi Thanh toán ({order.payment?.method === 'MOMO' ? 'MoMo' : 'VietQR'}) 10%
                      </span>
                      <span className="font-serif font-bold">
                        -{formatVND(order.discount)}
                      </span>
                    </div>
                  )}

                  {/* Total Row */}
                  <div className="border-t border-[#E8DFD5] pt-3 flex justify-between items-baseline">
                    <span className="font-sans text-xs font-bold uppercase text-[#4A3F38]">
                      Tổng giá trị đơn hàng
                    </span>
                    <span className="font-serif text-xl font-bold text-[#631521]">
                      {formatVND(total)}
                    </span>
                  </div>

                  {/* Shipping info */}
                  {order.shipping && (
                    <div className="border-t border-[#E8DFD5] pt-3 text-xs text-[#4A3F38] space-y-1">
                      <p><strong>Người nhận:</strong> {order.customer?.fullName} — {order.customer?.phone}</p>
                      <p><strong>Địa chỉ nhận hàng:</strong> {order.shipping?.fullAddress}</p>
                      <p><strong>Phương thức TT:</strong> {order.payment?.methodLabel || (isBankTransfer ? 'VietQR (Giảm 10%)' : 'COD')}</p>
                    </div>
                  )}
                </div>

                {/* Delivery Timeline Notice */}
                {(() => {
                  const hasPreOrder = !!(
                    order.hasPreOrder ||
                    order.items?.some(
                      (i) =>
                        i.isPreOrder ||
                        i.slug === 'the-classic-set' ||
                        i.productId === 'the-classic-set' ||
                        i.productName?.includes('DAYBREAK')
                    )
                  )
                  return (
                    <div
                      className={`flex items-start gap-3.5 p-4 rounded-[3px] border text-xs font-sans ${
                        hasPreOrder
                          ? 'bg-[#FAF5F0] border-2 border-[#D4AF37] text-[#631521]'
                          : 'bg-white border-[#E8DFD5] text-[#4A3F38]'
                      }`}
                    >
                      <Truck className="w-5 h-5 text-[#631521] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#1A1614] mb-0.5">Thời gian giao hàng dự kiến:</p>
                        {hasPreOrder ? (
                          <p className="leading-relaxed text-[#4A3F38]">
                            Đơn hàng có chứa sản phẩm <strong>Đặt Trước (THE DAYBREAK SET)</strong> — Thời gian may & giao hàng dự kiến trong <strong>7–10 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ thông báo cụ thể trước khi giao hàng.
                          </p>
                        ) : (
                          <p className="font-light leading-relaxed text-[#4A3F38]">
                            Từ <strong>2–4 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ qua điện thoại trước khi giao hàng.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleOpenOrdersDrawer}
                    className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-[#D4AF37]" />
                    Xem Danh Sách Đơn Đã Đặt
                  </button>

                  <Link
                    to="/"
                    className="flex-1 bg-white text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#FAF5F0] border border-[#631521] transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    Tiếp Tục Mua Sắm
                  </Link>
                </div>
              </>
            )}

            {/* Support footer note */}
            <div className="text-center pt-4 border-t border-[#E8DFD5] text-xs text-[#8C7E74] space-y-1">
              <p>Cần hỗ trợ chỉnh sửa đơn hàng hoặc đổi địa chỉ? Vui lòng liên hệ:</p>
              <p className="font-medium text-[#4A3F38]">
                Hotline: <a href="tel:0981753082" className="text-[#631521] hover:underline">0981 753 082</a> · Email:{' '}
                <a href="mailto:ducquan16102006@gmail.com" className="text-[#631521] hover:underline">ducquan16102006@gmail.com</a>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Section12Footer />
    </div>
  )
}

