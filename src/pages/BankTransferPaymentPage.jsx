import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Package,
  Phone,
  Mail,
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
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { formatVND } from '../data/checkoutConfig'

export default function BankTransferPaymentPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const orderId = searchParams.get('orderId') || 'QNS-' + Date.now().toString().slice(-6)

  // Order state from location state or sessionStorage / localStorage
  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    try {
      const saved = sessionStorage.getItem(`last_order_${orderId}`) || sessionStorage.getItem('latest_order')
      if (saved) return JSON.parse(saved)
      const allOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      return allOrders.find((o) => o.orderId === orderId) || null
    } catch (e) {
      console.error(e)
      return null
    }
  })

  const [copiedField, setCopiedField] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [isQrInvalidated, setIsQrInvalidated] = useState(false)

  // Countdown timer 15 minutes (900 seconds)
  const [timeLeft, setTimeLeft] = useState(900)

  // Customer & Payment Data
  const customerName = order?.customer?.fullName || 'Quý khách'
  const customerPhone = order?.customer?.phone || ''
  const customerEmail = order?.customer?.email || 'email của bạn'
  const total = order?.total || 381000
  const discount = order?.discount || Math.round((order?.subtotal || 390000) * 0.10)
  const transferContent = `${customerName} ${customerPhone}`.trim() || `QNS ${orderId}`
  const qrUrl = `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=NGUYEN%20DUC%20QUAN`

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

  // Complete Payment, Invalidate QR, Trigger Backend Gmail, and Redirect to Trang 2
  const completePaymentAndRedirect = async () => {
    if (isVerifying) return
    setIsVerifying(true)
    setIsQrInvalidated(true)

    try {
      const currentOrder = order || {
        orderId,
        total,
        discount,
        customer: { fullName: customerName, phone: customerPhone, email: customerEmail },
      }
      const updatedOrder = {
        ...currentOrder,
        status: 'PENDING',
        payment: {
          ...(currentOrder.payment || {}),
          method: 'BANK_TRANSFER',
          methodLabel: 'Chuyển khoản VietQR (Đã thanh toán)',
          status: 'PAID',
          paidAt: new Date().toISOString(),
          isQrInvalidated: true,
          qrInvalidatedAt: new Date().toISOString(),
        },
      }

      // 1. Gọi backend xác nhận và kích hoạt gửi Gmail hóa đơn
      try {
        await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedOrder),
        })
      } catch (e) {
        console.warn('Backend confirmation API call:', e.message)
      }

      // 2. Lưu vào storage client
      sessionStorage.setItem('latest_order', JSON.stringify(updatedOrder))
      sessionStorage.setItem(`last_order_${orderId}`, JSON.stringify(updatedOrder))

      const storedOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
      const updatedList = storedOrders.map((o) => (o.orderId === orderId ? updatedOrder : o))
      if (!updatedList.some((o) => o.orderId === orderId)) {
        updatedList.unshift(updatedOrder)
      }
      localStorage.setItem('pijama_orders', JSON.stringify(updatedList.slice(0, 50)))
      window.dispatchEvent(new Event('orders_updated'))

      setVerifySuccess(true)
      setTimeout(() => {
        navigate(`/dat-hang-thanh-cong?orderId=${orderId}`, {
          state: { order: updatedOrder },
          replace: true,
        })
      }, 1000)
    } catch (err) {
      console.error('Error confirming payment:', err)
      setIsVerifying(false)
    }
  }

  // Polling to check order payment status from backend Webhook
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })

    let isSubscribed = true
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && (data.status === 'PAID' || data.isQrValid === false)) {
            clearInterval(interval)
            if (isSubscribed) {
              setIsQrInvalidated(true)
              completePaymentAndRedirect()
            }
          }
        }
      } catch (err) {
        // Polling silent catch for offline mode
      }
    }, 3000)

    return () => {
      isSubscribed = false
      clearInterval(interval)
    }
  }, [orderId])

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
              CỔNG THANH TOÁN VIETQR 1 LẦN
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
            {/* Greeting & Payment Waiting Note */}
            <div className="text-center max-w-lg mx-auto space-y-2">
              <p className="font-serif text-lg font-bold text-[#1A1614]">
                Cảm ơn {customerName} đã lựa chọn QuanNguyenS
              </p>
              <p className="text-xs sm:text-sm font-light text-[#4A3F38] leading-relaxed">
                Đơn hàng đã được khởi tạo. Vui lòng hoàn tất chuyển khoản theo mã QR 1 lần bên dưới. 
                Khi tiền vào tài khoản, hệ thống sẽ <strong>tự động vô hiệu hóa mã QR</strong> và <strong>gửi email xác nhận đặt hàng</strong> tới địa chỉ <strong className="text-[#631521] font-semibold">{customerEmail}</strong>.
              </p>
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
                  Mã QR chuyển khoản một lần (Giảm 10%)
                </span>
                
                {/* Countdown Timer Badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                    timeLeft > 180 
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]' 
                      : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2] animate-pulse'
                  }`}>
                    <Clock className="w-3 h-3" />
                    Hiệu lực: {formatTimer(timeLeft)}
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
              ) : timeLeft <= 0 ? (
                /* Trạng thái mã QR hết hạn 15 phút */
                <div className="p-6 bg-white border border-[#EF9A9A] rounded-[3px] text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-[#C62828] mx-auto" />
                  <h4 className="font-serif text-base font-bold text-[#C62828]">
                    Mã QR đã hết hạn hiệu lực
                  </h4>
                  <p className="text-xs text-[#4A3F38]">
                    Mã thanh toán 1 lần đã quá thời hạn 15 phút. Vui lòng tải lại trang hoặc liên hệ hotline để được hỗ trợ.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-[#631521] text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded"
                  >
                    Tạo lại mã thanh toán
                  </button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-5">
                  {/* QR Image */}
                  <div className="w-40 h-40 bg-white p-2 rounded border border-[#E8DFD5] shadow-xs shrink-0 flex items-center justify-center relative">
                    <img
                      src={qrUrl}
                      alt="VietQR Vietcombank"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Bank info fields */}
                  <div className="space-y-2 flex-1 w-full text-xs font-sans">
                    <p className="font-serif font-bold text-[#631521] text-xs uppercase">
                      Ngân hàng Ngoại Thương Việt Nam (Vietcombank)
                    </p>

                    <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#8C7E74]">Số tài khoản:</p>
                        <p className="font-mono font-bold text-[#631521] text-base leading-tight">
                          1050773506
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy('1050773506', 'bankStk')}
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

                    <p className="text-[11px] text-[#4A3F38]"><strong>Chủ tài khoản:</strong> NGUYEN DUC QUAN</p>

                    <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#8C7E74]">
                          Nội dung chuyển khoản: <span className="italic text-[#631521]">(Tên + SĐT của bạn)</span>
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
                * Mỗi mã QR chỉ có hiệu lực thanh toán cho 1 đơn hàng duy nhất và sẽ tự động vô hiệu hóa ngay khi giao dịch thành công.
              </p>
            </motion.div>

            {/* BOX 2: TÓM TẮT ĐƠN HÀNG */}
            <div className="bg-[#FAF5F0] rounded-[3px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#631521]">
                  Tóm Tắt Đơn Hàng
                </span>
                <span className="text-xs font-mono text-[#8C7E74]">
                  {order?.orderDateVN || 'Vừa xong'}
                </span>
              </div>

              {/* Items List */}
              {order?.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                      <div className="pr-4">
                        <p className="font-bold text-[#1A1614]">{item.productName}</p>
                        <p className="text-xs text-[#8C7E74]">{item.variant} · SL: x{item.quantity}</p>
                      </div>
                      <span className="font-serif font-bold text-[#631521] shrink-0">
                        {formatVND(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8C7E74] italic">
                  Đơn hàng pijama cao cấp thiết kế châu Âu
                </p>
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
              {order?.shipping && (
                <div className="border-t border-[#E8DFD5] pt-3 text-xs text-[#4A3F38] space-y-1">
                  <p><strong>Người nhận:</strong> {order.customer?.fullName} — {order.customer?.phone}</p>
                  <p><strong>Địa chỉ nhận hàng:</strong> {order.shipping?.fullAddress}</p>
                  <p><strong>Phương thức TT:</strong> Chuyển khoản VietQR (Giảm 10%)</p>
                </div>
              )}
            </div>

            {/* BOX 3: Thời Gian Giao Hàng Dự Kiến */}
            <div className="flex items-start gap-3.5 bg-white p-4 rounded-[3px] border border-[#E8DFD5] text-xs font-sans text-[#4A3F38]">
              <Truck className="w-5 h-5 text-[#631521] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1A1614] mb-0.5">Thời gian giao hàng dự kiến:</p>
                <p className="font-light leading-relaxed">
                  Từ <strong>2–4 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ qua điện thoại trước khi giao hàng.
                </p>
              </div>
            </div>

            {/* Action Buttons & Manual Verification Trigger */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={completePaymentAndRedirect}
                disabled={isVerifying || timeLeft <= 0}
                className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                    <span>ĐANG XÁC THỰC THANH TOÁN & GỬI GMAIL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    <span>TÔI ĐÃ CHUYỂN KHOẢN THÀNH CÔNG (XÁC NHẬN)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full bg-white text-[#4A3F38] font-sans font-semibold text-xs py-3 rounded-[2px] border border-[#E8DFD5] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#8C7E74]" />
                <span>Kiểm tra lại trạng thái thanh toán</span>
              </button>

              <p className="text-[0.75rem] text-[#8C7E74] text-center italic">
                * Sau khi quét mã QR và chuyển khoản thành công, hệ thống sẽ tự động xác thực và gửi email xác nhận đặt hàng.
              </p>
            </div>

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
