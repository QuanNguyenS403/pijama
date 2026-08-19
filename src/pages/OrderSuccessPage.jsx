import { useEffect, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Package,
  Phone,
  Mail,
  Home,
  ChevronRight,
  Sparkles,
  Truck,
  ShieldCheck,
  QrCode,
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

  // Lấy dữ liệu order từ location state hoặc sessionStorage
  const [order, setOrder] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })

    if (location.state?.order) {
      setOrder(location.state.order)
    } else {
      try {
        const saved = sessionStorage.getItem('latest_order')
        if (saved) {
          setOrder(JSON.parse(saved))
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [location.state])

  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleOpenOrdersDrawer = () => {
    window.dispatchEvent(new Event('open_orders_drawer'))
  }

  const customerEmail = order?.customer?.email || 'email của bạn'
  const customerName = order?.customer?.fullName || 'Quý khách'
  const customerPhone = order?.customer?.phone || ''
  const total = order?.total || 390000
  const isBankTransfer = order?.payment?.method === 'BANK_TRANSFER'
  const transferContent = `${customerName} ${customerPhone}`.trim()
  const qrUrl = `https://img.vietqr.io/image/vietcombank-1050773506-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=NGUYEN%20DUC%20QUAN`

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
            {/* Greeting & Email confirmation note */}
            <div className="text-center max-w-lg mx-auto space-y-2">
              <p className="font-serif text-lg font-bold text-[#1A1614]">
                Cảm ơn {customerName} đã tin tưởng lựa chọn QuanNguyenS
              </p>
              <p className="text-xs sm:text-sm font-light text-[#4A3F38] leading-relaxed">
                Hệ thống đã tự động gửi email xác nhận kèm hóa đơn chi tiết tới địa chỉ{' '}
                <strong className="text-[#631521] font-semibold">{customerEmail}</strong>. Vui lòng kiểm tra hộp thư (hoặc mục Spam/Quảng cáo).
              </p>
            </div>

            {/* VIETQR PAYMENT INSTRUCTIONS BOX (If Bank Transfer Chosen) */}
            {isBankTransfer && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FAF5F0] border-2 border-[#D4AF37]/50 rounded-[4px] p-5 sm:p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                  <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#631521] flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#631521]" />
                    Hướng dẫn chuyển khoản VietQR (Giảm 10%)
                  </span>
                  <span className="text-[11px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                    Ưu đãi đã áp dụng
                  </span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-5">
                  {/* QR Image */}
                  <div className="w-40 h-40 bg-white p-2 rounded border border-[#E8DFD5] shadow-xs shrink-0 flex items-center justify-center">
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
                        className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors"
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
                        className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors"
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

                <p className="text-[0.7rem] text-[#8C7E74] italic text-center pt-1 border-t border-[#E8DFD5]">
                  * Đơn hàng sẽ được nhân viên xác nhận và đóng gói ngay sau khi hoàn tất chuyển khoản.
                </p>
              </motion.div>
            )}

            {/* Order Details Box */}
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

              {/* Discount Row (If Any) */}
              {order?.discount > 0 && (
                <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#2E7D32]">
                  <span className="font-medium flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    Ưu đãi Chuyển khoản VietQR (10%)
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
              {order?.shipping && (
                <div className="border-t border-[#E8DFD5] pt-3 text-xs text-[#4A3F38] space-y-1">
                  <p><strong>Người nhận:</strong> {order.customer?.fullName} — {order.customer?.phone}</p>
                  <p><strong>Địa chỉ nhận hàng:</strong> {order.shipping?.fullAddress}</p>
                  <p><strong>Phương thức TT:</strong> {order.payment?.methodLabel || (isBankTransfer ? 'VietQR (Giảm 10%)' : 'COD')}</p>
                </div>
              )}
            </div>

            {/* Delivery Timeline Notice */}
            <div className="flex items-start gap-3.5 bg-white p-4 rounded-[3px] border border-[#E8DFD5] text-xs font-sans text-[#4A3F38]">
              <Truck className="w-5 h-5 text-[#631521] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1A1614] mb-0.5">Thời gian giao hàng dự kiến:</p>
                <p className="font-light leading-relaxed">
                  Từ <strong>2–4 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ qua điện thoại trước khi giao hàng.
                </p>
              </div>
            </div>

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

