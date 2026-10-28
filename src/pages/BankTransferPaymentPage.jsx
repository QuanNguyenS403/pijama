import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Package,
  Truck,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Gift,
  RefreshCw,
  Loader2,
  Clock,
  Lock,
  AlertTriangle,
  Sparkles,
  Bot,
  ShoppingBag,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { formatVND } from '../data/checkoutConfig'
import { applyOrderUpdateLocally, getSavedOrders } from '../lib/orderSync'
import useCartStore from '../store/cartStore'

export default function BankTransferPaymentPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const orderId = searchParams.get('orderId')

  // FE-003: Bắt buộc phải có orderId hợp lệ, không fallback sang đơn người khác
  useEffect(() => {
    if (!orderId) {
      navigate('/checkout', { replace: true })
    }
  }, [orderId, navigate])

  // Order state from location state or sessionStorage / localStorage
  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    if (!orderId) return null
    try {
      const saved = sessionStorage.getItem(`last_order_${orderId}`)
      if (saved) return JSON.parse(saved)
      const allOrders = getSavedOrders()
      return allOrders.find((o) => (o.orderId || o.id) === orderId) || null
    } catch (e) {
      console.error(e)
      return null
    }
  })

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [isQrInvalidated, setIsQrInvalidated] = useState(false)

  const [aiQrDataUrl, setAiQrDataUrl] = useState(null)
  const [bankDetails, setBankDetails] = useState(null)
  const [bridgeHealthy, setBridgeHealthy] = useState(true)
  const [paymentPhase, setPaymentPhase] = useState(() => {
    if (order?.payment?.status === 'PAID') return 'PAID'
    if (order?.payment?.status === 'CUSTOMER_CLAIMED_PAID') return 'CLAIMED'
    if (order?.payment?.status === 'EXPIRED_TIMEOUT' || order?.status === 'CANCELLED') return 'EXPIRED'
    return 'AWAITING'
  })

  // Countdown timer 10 phút (600 seconds) - Thống nhất PAYMENT_QR_TTL_SECONDS (Q-B, WP6)
  const [timeLeft, setTimeLeft] = useState(() => {
    if (order?.payment?.qrExpiresAt) {
      const remaining = Math.round((new Date(order.payment.qrExpiresAt).getTime() - Date.now()) / 1000)
      return Math.max(0, Math.min(600, remaining))
    }
    return 600
  })

  // Polling kiểm tra trạng thái thanh toán từ máy chủ (WP5 / WP6)
  const checkStatus = useCallback(async (isManual = false) => {
    if (!orderId) return
    try {
      if (isManual) setIsVerifying(true)
      const res = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          if (data.phase) {
            setPaymentPhase(data.phase)
          }
          if (typeof data.expiresInSeconds === 'number') {
            setTimeLeft(data.expiresInSeconds)
          }
          if (typeof data.bridgeHealthy === 'boolean') {
            setBridgeHealthy(data.bridgeHealthy)
          }

          // CHỈ điều hướng sang "thành công" khi máy chủ trả PAID (Invariant I1, WP6)
          if (data.phase === 'PAID' || data.status === 'PAID') {
            setIsQrInvalidated(true)
            setVerifySuccess(true)
            if (data.order) {
              applyOrderUpdateLocally(data.order)
              setOrder(data.order)
            }
            setTimeout(() => {
              navigate(`/dat-hang-thanh-cong?orderId=${orderId}`, {
                state: { order: data.order || order },
                replace: true,
              })
            }, 1000)
          } else if (data.phase === 'EXPIRED' || data.status === 'EXPIRED' || data.status === 'QR_EXPIRED') {
            setIsQrInvalidated(true)
            setPaymentPhase('EXPIRED')
            setOrder((currentOrder) => {
              if (currentOrder && currentOrder.status !== 'CANCELLED') {
                const cancelledOrder = {
                  ...currentOrder,
                  status: 'CANCELLED',
                  cancelReason: 'Hết hạn thanh toán 10 phút (Mã QR hết hiệu lực)',
                  payment: {
                    ...(currentOrder.payment || {}),
                    status: 'EXPIRED_TIMEOUT',
                    isQrInvalidated: true,
                  },
                }
                applyOrderUpdateLocally(cancelledOrder)
                return cancelledOrder
              }
              return currentOrder
            })
          } else if (data.phase === 'CLAIMED' || data.status === 'CUSTOMER_CLAIMED_PAID') {
            setPaymentPhase('CLAIMED')
          }
        }
      }
    } catch (err) {
      // Polling silent catch
    } finally {
      if (isManual) setIsVerifying(false)
    }
  }, [orderId, order, navigate])

  // Khi hết giờ trên client timer: Gọi server checkStatus() để server xác nhận hết hạn (B3, WP6)
  // Client KHÔNG tự gán CANCELLED hay EXPIRED_TIMEOUT vào localStorage đơn phương
  useEffect(() => {
    if (timeLeft <= 0 && !isQrInvalidated && order && order.status !== 'CANCELLED') {
      checkStatus(false)
    }
  }, [timeLeft, isQrInvalidated, order, checkStatus])

  // Khôi phục toàn bộ sản phẩm vào giỏ hàng để khách đặt lại nhanh chóng
  const handleRestoreCartAndReorder = () => {
    if (order?.items && order.items.length > 0) {
      const addItem = useCartStore.getState().addItem
      order.items.forEach((item) => {
        addItem({
          id: item.id || item.productId || item.slug,
          name: item.productName || item.name,
          price: item.unitPrice || item.price,
          quantity: item.quantity || 1,
          variant: item.variant,
          image: item.image || item.productImage || '',
          slug: item.slug || item.productId,
        })
      })
    }
    navigate('/checkout')
  }

  // Customer & Payment Data
  const customerName = order?.customer?.fullName || 'Quý khách'
  const customerPhone = order?.customer?.phone || ''
  const customerEmail = order?.customer?.email || ''
  const total = order?.total || bankDetails?.total || 0
  const discount = order?.discount || 0
  // PAY-004: Nội dung chuyển khoản chuẩn hóa chứa mã đơn để webhook đối soát
  const transferContent = `QNS ${orderId}`
  const qrUrl = aiQrDataUrl || bankDetails?.vietQrUrl || (total > 0
    ? `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${total}&addInfo=${encodeURIComponent('QNS ' + orderId)}&accountName=NGUYEN%20DUC%20QUAN`
    : '')

  // Tự động lấy mã QR VietQR chuẩn hóa từ server (WP4 - Server-Authoritative)
  useEffect(() => {
    if (!orderId) return
    let isMounted = true
    fetch(`/api/payment/qr?orderId=${encodeURIComponent(orderId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!isMounted || !res) return
        if (res.qrDataUrl) {
          setAiQrDataUrl(res.qrDataUrl)
        }
        if (res.accountNumber) {
          setBankDetails({
            bankName: res.bankCode === 'VCB' ? 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)' : res.bankCode,
            accountNumber: res.accountNumber,
            accountName: res.accountName,
            description: res.description || `QNS ${orderId}`,
            vietQrUrl: res.vietQrUrl,
            total: res.total,
          })
        }
        if (res.phase) {
          setPaymentPhase(res.phase)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [orderId])

  // Countdown effect
  useEffect(() => {
    if (timeLeft <= 0 || isQrInvalidated) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, isQrInvalidated])

  // Format timer mm:ss
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Polling to check order payment status from backend Webhook
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!orderId) return

    let isSubscribed = true

    checkStatus(false)
    const interval = setInterval(() => {
      if (isSubscribed) checkStatus(false)
    }, 2000)

    const handleOrderEvent = (e) => {
      if (!isSubscribed) return
      const updated = e?.detail
      if (updated && (updated.orderId === orderId || updated.id === orderId)) {
        if (updated.paymentStatus === 'PAID' || updated.payment?.status === 'PAID') {
          setIsQrInvalidated(true)
          setVerifySuccess(true)
          applyOrderUpdateLocally(updated)
          setOrder(updated)
          setTimeout(() => {
            navigate(`/dat-hang-thanh-cong?orderId=${orderId}`, {
              state: { order: updated },
              replace: true,
            })
          }, 1000)
        }
      }
    }

    window.addEventListener('orders_updated', handleOrderEvent)

    return () => {
      isSubscribed = false
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614]">
      <title>Xác Nhận Chuyển Khoản VietQR — QuanNguyenS</title>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />
      <div className="h-16 md:h-20" />

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* Verification Overlay when confirming */}
        {isVerifying && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[4px] border border-[#E8DFD5] shadow-2xl text-center max-w-sm w-full"
            >
              {verifySuccess ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-[#E8F5E9] text-[#2E7D32] rounded-full flex items-center justify-center mx-auto border border-[#A5D6A7]">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#1A1614]">
                    Thanh Toán Thành Công!
                  </h3>
                  <p className="text-xs text-[#4A3F38]">
                    Đã vô hiệu hóa mã QR và gửi email xác nhận đặt hàng...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-[#631521] animate-spin mx-auto" />
                  <h3 className="font-serif text-lg font-bold text-[#1A1614]">
                    Đang Xác Thực Thanh Toán...
                  </h3>
                  <p className="text-xs text-[#8C7E74]">
                    Đang kiểm tra giao dịch chuyển khoản cho đơn hàng #{orderId}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

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
              <QrCode className="w-8 h-8 text-[#631521]" />
            </motion.div>

            <span className="font-serif text-xs font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-1.5 relative z-10">
              CỔNG THANH TOÁN VIETQR NAPAS 24/7
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide relative z-10">
              Quét Mã Để Hoàn Tất Đơn Hàng
            </h1>
            <div className="inline-flex items-center gap-2 mt-3 bg-black/25 px-4 py-1.5 rounded-full border border-white/20 relative z-10">
              <p className="font-mono text-xs text-[#FAF8F5] tracking-wider">
                Mã đơn: <strong className="text-[#D4AF37]">{orderId}</strong>
              </p>
              <button
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

          {/* Body Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {!order || total <= 0 ? (
              /* State: Không tìm thấy dữ liệu đơn hàng */
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-[#FAF5F0] border border-[#E8DFD5] text-[#631521] rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-xl font-bold text-[#1A1614]">
                  Không tìm thấy dữ liệu đơn hàng
                </h2>
                <p className="text-xs sm:text-sm font-normal text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                  Không tìm thấy thông tin thanh toán cho mã đơn này trên thiết bị. Vui lòng kiểm tra lại trong mục <strong>Đơn Hàng Đã Đặt</strong> hoặc liên hệ hotline <strong>0981 753 082</strong> để được hỗ trợ kiểm tra trực tiếp.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open_orders_drawer'))}
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
                {/* Greeting & Payment Waiting Note */}
                <div className="text-center max-w-lg mx-auto space-y-2">
                  <p className="font-serif text-lg font-bold text-[#1A1614]">
                    Cảm ơn {customerName} đã lựa chọn QuanNguyenS
                  </p>
                  <p className="text-xs sm:text-sm font-normal text-[#4A3F38] leading-relaxed">
                    Đơn hàng đã được khởi tạo thành công. Vui lòng thanh toán theo mã QR bên dưới trong vòng <strong>10 phút</strong>. 
                    Sau khi chuyển tiền, bạn bấm nút xác nhận để nhận email hóa đơn chính thức.
                  </p>
                </div>

                {/* Hướng dẫn 2 bước hoàn tất thanh toán (Rõ ràng & Minh bạch) */}
                <div className="bg-[#FAF5F0] border border-[#D4AF37]/60 p-4 rounded-[4px] space-y-2.5 text-xs font-sans text-[#4A3F38] shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-[#631521] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                      HƯỚNG DẪN HOÀN TẤT ĐƠN HÀNG (HẠN THANH TOÁN 5 PHÚT)
                    </span>
                    <span className="text-[11px] font-mono text-[#8C7E74]">Mã đơn: #{orderId}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <div className="bg-white p-3 rounded-[3px] border border-[#E8DFD5] flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#631521] text-[#FAF8F5] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                      <p className="leading-snug">
                        Mở app ngân hàng, quét mã QR và hoàn tất chuyển tiền (Nội dung: <strong>{transferContent}</strong>).
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-[3px] border border-[#E8DFD5] flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#631521] text-[#FAF8F5] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                      <p className="leading-snug">
                        Sau khi chuyển tiền, bấm nút <strong>"TÔI ĐÃ CHUYỂN KHOẢN THÀNH CÔNG"</strong> bên dưới để hoàn tất đơn hàng.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOX 1: HƯỚNG DẪN CHUYỂN KHOẢN VIETQR (1 LẦN) */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FAF5F0] border-2 border-[#D4AF37]/50 rounded-[4px] p-5 sm:p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3 flex-wrap gap-2">
                    <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#631521] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#631521]" />
                      Mã QR Napas 24/7 AI (Miễn Phí 100% - Giảm 10%)
                    </span>
                    
                    {/* Countdown Timer Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded border ${
                        timeLeft > 60 
                          ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]' 
                          : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2] animate-pulse'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        Thời hạn thanh toán: {formatTimer(timeLeft)}
                      </span>
                    </div>
                  </div>

                  {isQrInvalidated ? (
                    /* Trạng thái mã QR đã bị vô hiệu hóa sau khi thanh toán */
                    <div className="p-6 bg-white border border-[#A5D6A7] rounded-[3px] text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif text-base font-bold text-[#2E7D32]">
                        Mã QR đã được thanh toán và vô hiệu hóa
                      </h4>
                      <p className="text-xs text-[#4A3F38]">
                        Hệ thống đã khóa mã QR này để bảo vệ giao dịch và chống chuyển tiền trùng lặp.
                      </p>
                    </div>
                  ) : paymentPhase === 'RECONCILING' ? (
                    /* Trạng thái hết 10 phút nhưng đang trong thời gian ân hạn đối soát email ngân hàng (WP7) */
                    <div className="p-6 bg-white border border-[#FFE082] rounded-[4px] text-center space-y-3.5 shadow-xs">
                      <Clock className="w-10 h-10 text-[#D4AF37] mx-auto animate-pulse" />
                      <h4 className="font-serif text-base font-bold text-[#B45309]">
                        Mã QR Đã Hết Hạn — Hệ Thống Đang Đối Soát
                      </h4>
                      <p className="text-xs text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                        Thời hạn quét mã 10 phút đã kết thúc. Nếu bạn vừa hoàn tất chuyển khoản trên ứng dụng ngân hàng, hệ thống đang kiểm tra biến động số dư và sẽ <strong>tự động chuyển sang trang đặt hàng thành công ngay khi nhận được tín hiệu</strong>. Vui lòng giữ nguyên màn hình trong giây lát.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-[#8C7E74] pt-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#631521]" />
                        <span>Đang tự động đối soát với sao kê ngân hàng...</span>
                      </div>
                    </div>
                  ) : paymentPhase === 'EXPIRED' || timeLeft <= 0 ? (
                    /* Trạng thái mã QR hết hạn 5 phút */
                    <div className="p-6 bg-white border border-[#EF9A9A] rounded-[4px] text-center space-y-3.5 shadow-xs">
                      <AlertTriangle className="w-10 h-10 text-[#C62828] mx-auto" />
                      <h4 className="font-serif text-base font-bold text-[#C62828]">
                        Đơn hàng chưa thanh toán — Mã QR đã hết hạn hiệu lực (10 phút)
                      </h4>
                      <p className="text-xs text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                        Thời hạn thanh toán 10 phút cho mã QR này đã kết thúc. Lần đặt hàng này được ghi nhận là không thành công. 
                        <strong> Toàn bộ thông tin sản phẩm của bạn vẫn được lưu trữ an toàn</strong>, bạn có thể bấm nút bên dưới để khôi phục lại giỏ hàng và đặt lại ngay.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleRestoreCartAndReorder}
                          className="w-full sm:w-auto bg-[#631521] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-[2px] hover:bg-[#4A0D17] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                          <span>Khôi phục sản phẩm & Đặt lại đơn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/tai-khoan')}
                          className="w-full sm:w-auto bg-white border border-[#E8DFD5] text-[#4A3F38] text-xs font-semibold px-5 py-3 rounded-[2px] hover:bg-[#FAF8F5] transition-all cursor-pointer"
                        >
                          Xem lịch sử đơn hàng
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-5">
                      {/* QR Image */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-40 h-40 bg-white p-2 rounded border border-[#E8DFD5] shadow-xs flex items-center justify-center relative">
                          <img
                            src={qrUrl}
                            alt="Mã QR Napas 24/7 Vietcombank"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold mt-1.5 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" /> Chuẩn NAPAS 24/7 • 0đ Phí
                        </span>
                      </div>

                      {/* Bank info fields */}
                      <div className="space-y-2 flex-1 w-full text-xs font-sans">
                        <p className="font-serif font-bold text-[#631521] text-xs uppercase">
                          {bankDetails?.bankName || 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)'}
                        </p>

                        <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-[#8C7E74]">Số tài khoản:</p>
                            <p className="font-mono font-bold text-[#631521] text-base leading-tight">
                              {bankDetails?.accountNumber || '1050773506'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(bankDetails?.accountNumber || '1050773506', 'bankStk')}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors cursor-pointer"
                          >
                            {copiedField === 'bankStk' ? (
                              <>
                                <Check className="w-3 h-3 text-[#2E7D32]" />
                                <span className="text-[#2E7D32]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[11px] text-[#4A3F38]"><strong>Chủ tài khoản:</strong> {bankDetails?.accountName || 'NGUYEN DUC QUAN'}</p>

                        <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-[#8C7E74]">
                              Nội dung chuyển khoản: <span className="italic text-[#631521] font-semibold">(Quý khách tự nhập khi CK)</span>
                            </p>
                            <p className="font-mono font-bold text-[#631521] text-xs mt-0.5">
                              {transferContent}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(transferContent, 'bankContent')}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors cursor-pointer"
                          >
                            {copiedField === 'bankContent' ? (
                              <>
                                <Check className="w-3 h-3 text-[#2E7D32]" />
                                <span className="text-[#2E7D32]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[0.7rem] text-[#8C7E74] italic text-center pt-1 border-t border-[#E8DFD5]">
                    * Quý khách vui lòng nhập đúng <strong>Nội dung chuyển khoản ({transferContent})</strong> trên ứng dụng ngân hàng để hoàn tất đơn hàng nhanh chóng.
                  </p>
                </motion.div>

                {/* BOX 2: TÓM TẮT ĐƠN HÀNG */}
                <div className="bg-[#FAF5F0] rounded-[3px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                    <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#631521]">
                      Tóm Tắt Đơn Hàng
                    </span>
                    <span className="text-xs font-mono text-[#8C7E74]">
                      {order.orderDateVN || 'Vừa xong'}
                    </span>
                  </div>

                  {/* Items List */}
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

                  {/* Discount Row */}
                  {discount > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#2E7D32]">
                      <span className="font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        Ưu đãi Chuyển khoản VietQR (10%)
                      </span>
                      <span className="font-serif font-bold">
                        -{formatVND(discount)}
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
                      <p><strong>Phương thức TT:</strong> {order.payment?.methodLabel || 'Chuyển khoản VietQR (Giảm 10%)'}</p>
                    </div>
                  )}
                </div>

                {/* BOX 3: Thời Gian Giao Hàng Dự Kiến */}
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-[3px] border border-[#E8DFD5] text-xs font-sans text-[#4A3F38]">
                  <Truck className="w-5 h-5 text-[#631521] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#1A1614] mb-0.5">Thời gian giao hàng dự kiến:</p>
                    <p className="font-normal leading-relaxed">
                      Từ <strong>2–4 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ qua điện thoại trước khi giao hàng.
                    </p>
                  </div>
                </div>

                {/* Action Buttons & Manual Verification Trigger (WP6) */}
                <div className="space-y-3 pt-2">
                  {/* Trạng thái Đang Chờ Xác Nhận (khi khách đã bấm báo chuyển khoản nhưng chưa PAID) */}
                  {paymentPhase === 'CLAIMED' ? (
                    <div className="bg-[#FAF5F0] border-2 border-[#D4AF37]/50 rounded-[4px] p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-[#631521] font-bold text-sm">
                        <Clock className="w-4 h-4 text-[#D4AF37]" />
                        <span>Đang Chờ Xác Nhận Thanh Toán</span>
                      </div>
                      <p className="text-xs text-[#4A3F38] leading-relaxed max-w-md mx-auto">
                        Cửa hàng đang đối soát với ngân hàng, thường vài phút; bạn sẽ nhận email khi xác nhận xong.
                      </p>
                      <p className="text-[11px] text-[#8C7E74]">
                        Hotline hỗ trợ: <strong className="text-[#631521]">0981 753 082</strong>
                      </p>
                    </div>
                  ) : null}

                  {/* HƯỚNG DẪN THANH TOÁN TỰ ĐỘNG HOÀN TOÀN (WP7 - Không cần thao tác) */}
                  <div className="bg-[#FAF5F0] border border-[#D4AF37]/50 rounded-[4px] p-4 text-center space-y-2 shadow-xs">
                    <div className="flex items-center justify-center gap-2 text-[#631521] font-serif font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>XÁC NHẬN THANH TOÁN TỰ ĐỘNG 24/7</span>
                    </div>
                    <p className="text-xs text-[#4A3F38] leading-relaxed max-w-md mx-auto">
                      Quý khách chỉ cần mở ứng dụng ngân hàng quét mã QR và chuyển khoản. 
                      <strong> Hệ thống sẽ tự động xác nhận đơn hàng qua biến động số dư ngân hàng, bạn không cần phải bấm bất kỳ thao tác nào.</strong>
                    </p>
                  </div>

                  {/* Cảnh báo khi cầu nối email đang chậm (WP7) */}
                  {!bridgeHealthy && (
                    <div className="p-3 bg-[#FFF8E1] border border-[#FFE082] rounded-[3px] text-xs text-[#B45309] text-center flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#EA580C]" />
                      <span>Hệ thống đối soát đang chậm; đơn sẽ được xác nhận ngay khi ngân hàng báo tiền hoặc bởi cửa hàng. Hotline 0981 753 082.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => checkStatus(true)}
                    disabled={isVerifying}
                    className="w-full bg-white text-[#4A3F38] font-sans font-semibold text-xs py-3 rounded-[2px] border border-[#E8DFD5] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#8C7E74] ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra lại trạng thái thanh toán</span>
                  </button>
                </div>
              </>
            )}

            {/* Support footer note */}
            <div className="text-center pt-4 border-t border-[#E8DFD5] text-xs text-[#8C7E74] space-y-1">
              <p>Cần hỗ trợ chỉnh sửa đơn hàng hoặc đổi địa chỉ? Vui lòng liên hệ:</p>
              <p className="font-medium text-[#4A3F38]">
                Hotline: <a href="tel:0981753082" className="text-[#631521] hover:underline">0981 753 082</a> · Email:{' '}
                <a href="mailto:quannguyens403@gmail.com" className="text-[#631521] hover:underline">quannguyens403@gmail.com</a>
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Section12Footer />
    </div>
  )
}
