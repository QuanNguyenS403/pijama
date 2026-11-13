import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle2,
  Package,
  Copy,
  Check,
  Gift,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  AlertTriangle,
  ArrowRight,
  Mail,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { formatVND } from '../data/checkoutConfig'
import {
  applyOrderUpdateLocally,
  getSavedOrders,
  restoreOrderItemsToCart,
  purgeCancelledOrderLocally,
} from '../lib/orderSync'
import useCartStore from '../store/cartStore'

export default function QrPaymentWaitingPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (!orderId) {
      navigate('/checkout', { replace: true })
    }
  }, [orderId, navigate])

  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    if (!orderId) return null
    try {
      const saved = sessionStorage.getItem(`last_order_${orderId}`)
      if (saved) return JSON.parse(saved)
      const allOrders = getSavedOrders()
      return allOrders.find((o) => (o.orderId || o.id) === orderId) || null
    } catch {
      return null
    }
  })

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [paymentPhase, setPaymentPhase] = useState(() => {
    if (order?.payment?.status === 'PAID' || order?.paymentStatus === 'PAID') return 'PAID'
    if (order?.status === 'CANCELLED') return 'CANCELLED'
    return 'WAITING_CONFIRMATION'
  })
  const [proofData, setProofData] = useState(() => {
    if (order?.paymentProof?.imageUrl) return order.paymentProof
    if (order?.payment?.proofImageUrl) {
      return {
        imageUrl: order.payment.proofImageUrl,
        uploadedAt: order.payment.proofUploadedAt || null,
        note: order.payment.proofNote || '',
      }
    }
    return null
  })
  const proofHydratedRef = useRef(false)

  // Trang này chỉ dành riêng cho đơn thanh toán bằng mã QR
  useEffect(() => {
    if (!order) return
    const method = order.payment?.method || order.paymentMethod
    if (method && method !== 'BANK_TRANSFER') {
      navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
        state: { order },
        replace: true,
      })
    }
  }, [order, orderId, navigate])

  const checkStatus = useCallback(async (isManual = false) => {
    if (!orderId) return
    try {
      if (isManual) setIsChecking(true)
      const res = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.success) return

      if (data.phase) {
        setPaymentPhase(data.phase)
      }

      if (data.hasPaymentProof && !proofData && !proofHydratedRef.current && order?.trackingToken) {
        proofHydratedRef.current = true
        fetch(`/api/orders/payment-proof?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(order.trackingToken)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((proofRes) => {
            if (proofRes?.success && proofRes.paymentProof) {
              setProofData(proofRes.paymentProof)
            }
          })
          .catch(() => {})
      }

      if (data.phase === 'PAID' || data.status === 'PAID') {
        useCartStore.getState().clearCart()
        let nextOrderSnapshot = order
        if (data.order) {
          const merged = applyOrderUpdateLocally(data.order) || { ...(order || {}), ...data.order }
          nextOrderSnapshot = merged
          setOrder(merged)
        }
        setTimeout(() => {
          navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
            state: { order: nextOrderSnapshot },
            replace: true,
          })
        }, 800)
      } else if (data.phase === 'CANCELLED' || data.status === 'CANCELLED') {
        setPaymentPhase('CANCELLED')
      } else if (
        data.phase === 'AWAITING' &&
        !data.paymentSubmittedAt &&
        order?.payment?.status !== 'PENDING_ADMIN_CONFIRMATION' &&
        order?.payment?.status !== 'CUSTOMER_CLAIMED_PAID' &&
        !order?.payment?.submittedAt
      ) {
        // Khách chưa bấm "Thanh toán" sau khi tải ảnh -> quay lại bước quét QR & tải ảnh
        navigate(`/thanh-toan-chuyen-khoan?orderId=${encodeURIComponent(orderId)}`, {
          state: { order },
          replace: true,
        })
      }
    } catch {
      // Silent network retry on next poll
    } finally {
      if (isManual) setIsChecking(false)
    }
  }, [orderId, order, navigate, proofData])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!orderId) return

    checkStatus(false)
    const interval = setInterval(() => checkStatus(false), 5000)

    const handleOrderEvent = (e) => {
      const updated = e?.detail
      if (!updated || (updated.orderId !== orderId && updated.id !== orderId)) return

      if (updated.paymentStatus === 'PAID' || updated.payment?.status === 'PAID') {
        setPaymentPhase('PAID')
        applyOrderUpdateLocally(updated)
        setOrder(updated)
        useCartStore.getState().clearCart()
        setTimeout(() => {
          navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
            state: { order: updated },
            replace: true,
          })
        }, 800)
      } else if (updated.status === 'CANCELLED') {
        setPaymentPhase('CANCELLED')
        setOrder((prev) => ({ ...(prev || {}), ...updated }))
      }
    }

    window.addEventListener('orders_updated', handleOrderEvent)
    return () => {
      clearInterval(interval)
      window.removeEventListener('orders_updated', handleOrderEvent)
    }
  }, [orderId, checkStatus, navigate])

  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenOrdersDrawer = () => {
    window.dispatchEvent(new CustomEvent('open_orders_drawer', { detail: { orderId } }))
  }

  const handleRestoreAndReorder = () => {
    if (order) {
      restoreOrderItemsToCart(order)
      purgeCancelledOrderLocally(orderId)
    }
    navigate('/checkout')
  }

  const customerName = order?.customer?.fullName || 'Quý khách'
  const customerEmail = order?.customer?.email || ''
  const total = order?.total || 0
  const discount = order?.discount || 0
  const submittedAt = order?.payment?.submittedAt || proofData?.uploadedAt || null

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614]">
      <title>Chờ Xác Nhận Thanh Toán QR — QuanNguyenS</title>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />
      <div className="h-14 md:h-16" />

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-luxury overflow-hidden"
        >
          {/* Top Brand Banner */}
          <div className="bg-[#631521] px-6 py-8 text-center text-[#FAF8F5] relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-15" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-[#FAF8F5] text-[#631521] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#D4AF37] shadow-lg relative z-10"
            >
              {paymentPhase === 'PAID' ? (
                <CheckCircle2 className="w-9 h-9 text-[#2E7D32] stroke-[2.5]" />
              ) : paymentPhase === 'CANCELLED' ? (
                <AlertTriangle className="w-9 h-9 text-[#C62828] stroke-[2.2]" />
              ) : (
                <Clock className="w-9 h-9 text-[#D4AF37] stroke-[2.2]" />
              )}
            </motion.div>

            <span className="font-sans text-xs font-semibold tracking-[0.28em] text-[#D4AF37] uppercase block mb-1.5 relative z-10">
              {paymentPhase === 'PAID'
                ? 'ADMIN ĐÃ XÁC NHẬN THANH TOÁN'
                : paymentPhase === 'CANCELLED'
                ? 'ĐƠN HÀNG ĐÃ BỊ HỦY'
                : 'THANH TOÁN CHUYỂN KHOẢN QR'}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide relative z-10">
              {paymentPhase === 'PAID'
                ? 'Thanh Toán Đã Được Duyệt!'
                : paymentPhase === 'CANCELLED'
                ? 'Đơn Hàng Đã Hủy'
                : 'Chờ Xác Nhận Thanh Toán'}
            </h1>
            <div className="inline-flex items-center gap-2 mt-3 bg-black/25 px-4 py-1.5 rounded-full border border-white/20 relative z-10">
              <p className="font-mono text-xs text-[#FAF8F5] tracking-wider">
                Mã đơn: <strong className="text-[#D4AF37]">{orderId}</strong>
              </p>
              <button
                type="button"
                onClick={() => handleCopy(orderId, 'orderId')}
                className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer"
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

          <div className="p-6 sm:p-10 space-y-7">
            {!order ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-[#FAF5F0] border border-[#E8DFD5] text-[#631521] rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-xl font-bold text-[#1A1614]">
                  Không tìm thấy dữ liệu đơn hàng
                </h2>
                <p className="text-xs sm:text-sm font-normal text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                  Vui lòng mở mục <strong>Đơn Hàng Của Bạn</strong> trên thanh menu hoặc liên hệ hotline <strong>0973 486 218</strong> để kiểm tra đơn hàng.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={handleOpenOrdersDrawer}
                    className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-[#D4AF37]" />
                    <span>Mục Đơn Hàng Của Bạn</span>
                  </button>
                  <Link
                    to="/"
                    className="flex-1 bg-white text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#FAF5F0] border border-[#631521] transition-all flex items-center justify-center"
                  >
                    Về Trang Chủ
                  </Link>
                </div>
              </div>
            ) : paymentPhase === 'CANCELLED' ? (
              <div className="p-6 bg-[#FFF5F5] border border-[#EF9A9A] rounded-[4px] text-center space-y-3.5">
                <AlertTriangle className="w-10 h-10 text-[#C62828] mx-auto" />
                <h2 className="font-serif text-lg font-bold text-[#C62828]">
                  Đơn hàng #{orderId} đã được hủy
                </h2>
                {order.cancelReason && (
                  <p className="text-xs text-[#4A3F38]">
                    <strong>Lý do:</strong> {order.cancelReason}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRestoreAndReorder}
                    className="w-full sm:w-auto bg-[#631521] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-[2px] hover:bg-[#4A0D17] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>Khôi phục sản phẩm & Đặt lại</span>
                  </button>
                  <Link
                    to="/"
                    className="w-full sm:w-auto bg-white border border-[#E8DFD5] text-[#4A3F38] text-xs font-semibold px-5 py-3 rounded-[2px] hover:bg-[#FAF8F5]"
                  >
                    Về trang chủ
                  </Link>
                </div>
              </div>
            ) : paymentPhase === 'PAID' ? (
              <div className="p-6 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[4px] text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#2E7D32] mx-auto" />
                <h2 className="font-serif text-lg font-bold text-[#2E7D32]">
                  Admin đã xác nhận thanh toán thành công!
                </h2>
                <p className="text-xs text-[#1B5E20] leading-relaxed">
                  Email xác nhận đơn hàng đã được gửi đến {customerEmail || 'bạn'}. Đang chuyển sang trang hoàn tất đơn hàng...
                </p>
              </div>
            ) : (
              <>
                {/* Main Waiting Status Card */}
                <div className="bg-[#FAF5F0] border-2 border-[#D4AF37]/60 rounded-[4px] p-5 sm:p-6 space-y-3 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-white text-[#B45309] border border-[#FDE68A] text-[11px] font-bold px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Đang chờ admin xác nhận thủ công</span>
                  </div>

                  <p className="font-serif text-lg font-bold text-[#1A1614]">
                    Cảm ơn {customerName} đã gửi xác nhận chuyển khoản
                  </p>
                  <p className="text-xs sm:text-sm text-[#4A3F38] leading-relaxed max-w-lg mx-auto">
                    Cửa hàng đã tiếp nhận ảnh chuyển khoản của bạn cho đơn hàng <strong className="text-[#631521]">#{orderId}</strong>.
                    Admin sẽ kiểm tra và duyệt thanh toán thủ công trong thời gian sớm nhất.
                  </p>

                  <div className="bg-white border border-[#E8DFD5] rounded-[3px] p-3.5 text-xs text-[#4A3F38] max-w-lg mx-auto space-y-1.5 text-left">
                    <p className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-[#631521] shrink-0 mt-0.5" />
                      <span>
                        Ngay khi admin duyệt xong, <strong>email xác nhận đơn hàng</strong> sẽ được gửi ngay lập tức đến địa chỉ{' '}
                        <strong className="text-[#631521]">{customerEmail || 'email của bạn'}</strong>.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-[#631521] shrink-0 mt-0.5" />
                      <span>
                        Bạn có thể thoải mái chuyển sang các trang khác. Khi muốn theo dõi lại trạng thái chờ xác nhận, hãy mở mục{' '}
                        <strong>"Đơn hàng của bạn"</strong> trên thanh menu.
                      </span>
                    </p>
                  </div>

                  {submittedAt && (
                    <p className="text-[11px] text-[#8C7E74]">
                      Thời điểm gửi xác nhận: {new Date(submittedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>

                {/* Uploaded Transfer Proof Preview */}
                {proofData?.imageUrl && (
                  <div className="bg-white border border-[#E8DFD5] rounded-[4px] p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-2.5">
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521]">
                        Ảnh Chuyển Khoản Đã Gửi
                      </span>
                      <a
                        href={proofData.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#631521] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Xem ảnh đầy đủ</span>
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <a
                        href={proofData.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-24 h-28 bg-[#FAF8F5] rounded-[2px] border border-[#E8DFD5] overflow-hidden shrink-0"
                      >
                        <img
                          src={proofData.imageUrl}
                          alt="Ảnh chuyển khoản đã gửi"
                          className="w-full h-full object-cover"
                        />
                      </a>
                      <div className="text-xs text-[#4A3F38] space-y-1.5">
                        <p className="font-semibold text-[#1A1614]">Chứng từ chuyển khoản đã được lưu cho đơn #{orderId}</p>
                        {proofData.uploadedAt && (
                          <p className="text-[11px] text-[#8C7E74]">
                            Tải lên lúc: {new Date(proofData.uploadedAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                        {proofData.note && (
                          <p className="text-[11px] bg-[#FAF8F5] border border-[#E8DFD5] px-2.5 py-1.5 rounded">
                            <strong>Ghi chú:</strong> {proofData.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Confirmation Box */}
                <div className="bg-[#FAF5F0] rounded-[3px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521]">
                      Xác Nhận Đơn Hàng
                    </span>
                    <span className="text-xs font-mono text-[#8C7E74]">
                      {order.orderDateVN || 'Vừa xong'}
                    </span>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                          <div className="pr-4">
                            <p className="font-bold text-[#1A1614]">{item.productName}</p>
                            <p className="text-xs text-[#8C7E74]">{item.variant} · SL: x{item.quantity}</p>
                          </div>
                          <span className="font-serif font-bold text-[#631521] shrink-0">
                            {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {Number(order?.shippingFee || 0) > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#4A3F38]">
                      <span>Phí vận chuyển{order?.deliveryOption === 'SPLIT_SHIPPING' ? ' (gồm phụ phí tách giao)' : ''}</span>
                      <span className="font-medium">{formatVND(order.shippingFee)}</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#2E7D32]">
                      <span className="font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Tổng giảm giá ưu đãi{order?.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                      </span>
                      <span className="font-serif font-bold">-{formatVND(discount)}</span>
                    </div>
                  )}

                  <div className="border-t border-[#E8DFD5] pt-3 flex justify-between items-baseline">
                    <span className="font-sans text-xs font-bold uppercase text-[#4A3F38]">
                      Tổng giá trị đơn hàng
                    </span>
                    <span className="font-serif text-xl font-bold text-[#631521]">
                      {formatVND(total)}
                    </span>
                  </div>

                  {order.shipping && (
                    <div className="border-t border-[#E8DFD5] pt-3 text-xs text-[#4A3F38] space-y-1">
                      <p><strong>Người nhận:</strong> {order.customer?.fullName} — {order.customer?.phone}</p>
                      <p><strong>Địa chỉ nhận hàng:</strong> {order.shipping?.fullAddress}</p>
                      <p><strong>Phương thức TT:</strong> {order.payment?.methodLabel || 'Chuyển khoản VietQR (Giảm 10%)'}</p>
                    </div>
                  )}
                </div>

                {/* Action Navigation Buttons */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleOpenOrdersDrawer}
                      className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-5 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4 text-[#D4AF37]" />
                      <span>Mở Đơn Hàng Của Bạn</span>
                    </button>
                    <Link
                      to="/"
                      className="flex-1 bg-white text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-5 rounded-[2px] hover:bg-[#FAF5F0] border border-[#631521] transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Tiếp Tục Mua Sắm</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => checkStatus(true)}
                    disabled={isChecking}
                    className="w-full bg-[#FAF8F5] text-[#4A3F38] font-sans font-semibold text-xs py-2.5 rounded-[2px] border border-[#E8DFD5] hover:bg-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#8C7E74] ${isChecking ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra lại trạng thái xác nhận</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>

      <Section12Footer />
    </div>
  )
}

