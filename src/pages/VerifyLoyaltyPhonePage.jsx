import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Crown,
  Gift,
  Sparkles,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Check,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { TierBadge } from '../components/loyalty/LoyaltyBadges'

export default function VerifyLoyaltyPhonePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Lấy dữ liệu từ router state hoặc search params
  const statePhone = location.state?.phone || searchParams.get('phone') || ''
  const stateFullName = location.state?.fullName || searchParams.get('name') || ''
  const stateVerificationId = location.state?.verificationId || searchParams.get('v') || ''
  const stateTelegramUrl = location.state?.telegramUrl || searchParams.get('tg') || ''

  const [phone, setPhone] = useState(statePhone)
  const [fullName, setFullName] = useState(stateFullName)
  const [verificationId, setVerificationId] = useState(stateVerificationId)
  const [telegramUrl, setTelegramUrl] = useState(stateTelegramUrl)

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMember, setSuccessMember] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [telegramDelivered, setTelegramDelivered] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [hasCartItems, setHasCartItems] = useState(false)

  const inputRef = useRef(null)

  // Kiểm tra giỏ hàng
  useEffect(() => {
    try {
      const cartStore = JSON.parse(localStorage.getItem('cart-storage') || '{}')
      if (Array.isArray(cartStore?.state?.items) && cartStore.state.items.length > 0) {
        setHasCartItems(true)
      }
    } catch {}
  }, [])

  // Khôi phục từ sessionStorage nếu reload
  useEffect(() => {
    document.title = 'Xác Minh Số Điện Thoại — Ưu Đãi Hội Viên | QuanNguyenS'
    window.scrollTo({ top: 0, behavior: 'instant' })

    if (!phone) {
      try {
        const saved = JSON.parse(sessionStorage.getItem('qns_pending_loyalty_verification') || '{}')
        if (saved.phone) setPhone(saved.phone)
        if (saved.fullName) setFullName(saved.fullName)
        if (saved.verificationId) setVerificationId(saved.verificationId)
        if (saved.telegramUrl) setTelegramUrl(saved.telegramUrl)
      } catch {}
    }
  }, [phone])

  // Tự động focus vào ô nhập mã
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Đếm ngược cooldown gửi lại mã OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Polling nhẹ kiểm tra xem khách đã bấm Telegram Bot chưa
  useEffect(() => {
    if (!verificationId || successMember) return
    let active = true

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/loyalty/phone/status?v=${encodeURIComponent(verificationId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (active && data.success && data.delivered) {
          setTelegramDelivered(true)
        }
      } catch {}
    }

    const interval = setInterval(checkStatus, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [verificationId, successMember])

  // Định dạng số điện thoại hiển thị đẹp mắt (VD: 0973 ••• 218)
  const formatMaskedPhone = (num) => {
    const clean = String(num || '').trim()
    if (!clean) return 'Chưa xác định'
    if (clean.length >= 10) {
      return `${clean.slice(0, 4)} ••• ${clean.slice(-3)}`
    }
    return clean
  }

  // Telegram deep-link URL chuẩn
  const resolvedTelegramLink =
    telegramUrl ||
    (verificationId
      ? `https://t.me/QuanNguyenSbot?start=otp_${verificationId}`
      : 'https://t.me/QuanNguyenSbot')

  // Xử lý gửi lại mã OTP qua Telegram
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending || !phone) return
    setError(null)
    setResending(true)
    setResendMessage('')

    try {
      const res = await fetch('/api/loyalty/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          fullName: fullName.trim() || undefined,
          purpose: 'enrollment',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể gửi lại mã lúc này. Vui lòng thử lại sau.')
        setResending(false)
        return
      }

      if (data.verificationId) {
        setVerificationId(data.verificationId)
      }
      if (data.telegramUrl) {
        setTelegramUrl(data.telegramUrl)
      }

      setResendCooldown(data.cooldownRemaining || 60)
      setResendMessage('Mã xác thực mới đã được gửi tới Telegram của Quý khách!')
      setOtp('')
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại kết nối internet.')
    } finally {
      setResending(false)
    }
  }

  // Xử lý submit xác minh mã OTP và kích hoạt hội viên
  const handleVerify = async (e) => {
    e?.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã xác minh từ Telegram.')
      return
    }

    if (!phone) {
      setError('Thiếu thông tin số điện thoại. Vui lòng quay lại nhập số điện thoại.')
      return
    }

    setLoading(true)

    try {
      // 1. Gửi lệnh kích hoạt hội viên kèm mã OTP
      const res = await fetch('/api/loyalty/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: phone.trim(),
          fullName: fullName.trim() || 'Hội viên Thân Thiết',
          otpCode: cleanOtp,
          consentToTerms: true,
          ageConsent: true,
        }),
      })

      const data = await res.json()

      // Nếu đã là hội viên từ trước: chuyển sang chế độ đăng nhập để kích hoạt phiên
      if (!res.ok && data.code === 'ALREADY_MEMBER') {
        const loginRes = await fetch('/api/loyalty/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            phone: phone.trim(),
            otpCode: cleanOtp,
          }),
        })

        const loginData = await loginRes.json()
        if (loginRes.ok && loginData.success) {
          sessionStorage.removeItem('qns_pending_loyalty_verification')
          setSuccessMember(loginData.member)
          setLoading(false)
          return
        }
      }

      if (!res.ok || !data.success) {
        setError(data.error || 'Mã xác minh không chính xác hoặc đã hết hạn.')
        setLoading(false)
        return
      }

      // Xóa thông tin tạm sau khi thành công
      sessionStorage.removeItem('qns_pending_loyalty_verification')
      setSuccessMember(data.member)
      try {
        window.dispatchEvent(new CustomEvent('customer_auth_changed'))
      } catch {}
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Quý khách vui lòng thử lại sau giây lát.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C201A] flex flex-col font-sans">
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="flex-1 py-8 sm:py-14 px-4 sm:px-6">
        <div className="max-w-[560px] mx-auto">
          {/* Breadcrumb / Quay lại */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/uu-dai-hoi-vien"
              className="inline-flex items-center gap-1.5 text-xs text-[#8C7E74] hover:text-[#631521] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sửa số điện thoại</span>
            </Link>

            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D4AF37]">
              QuanNguyenS Privileged
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!successMember ? (
              /* FORM ĐIỀN MÃ XÁC MINH TELEGRAM */
              <motion.div
                key="verify-card"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white border border-[#E8DFD5] rounded-[4px] shadow-xl overflow-hidden relative"
              >
                {/* Thanh tiến trình 3 bước */}
                <div className="bg-[#FAF5F0] border-b border-[#E8DFD5] px-5 py-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#8C7E74]">
                    <div className="flex items-center gap-1.5 text-[#2C201A]">
                      <span className="w-5 h-5 rounded-full bg-[#631521] text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <span>1. Đăng ký</span>
                    </div>
                    <div className="w-6 h-[1px] bg-[#D4AF37]" />
                    <div className="flex items-center gap-1.5 text-[#631521] font-bold">
                      <span className="w-5 h-5 rounded-full bg-[#631521] text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>2. Xác minh Telegram</span>
                    </div>
                    <div className="w-6 h-[1px] bg-[#E8DFD5]" />
                    <div className="flex items-center gap-1.5 opacity-60">
                      <span className="w-5 h-5 rounded-full bg-[#E8DFD5] text-[#8C7E74] flex items-center justify-center text-[10px]">
                        3
                      </span>
                      <span>3. Nhận ưu đãi</span>
                    </div>
                  </div>
                </div>

                {/* Tiêu đề & Thông báo Telegram */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#229ED9]/10 text-[#229ED9] mb-1">
                      <Send className="w-6 h-6 translate-x-[1px] -translate-y-[1px]" />
                    </div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C201A]">
                      Xác Minh Số Điện Thoại
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6C5F54] max-w-md mx-auto leading-relaxed">
                      Mã xác nhận bảo mật đã được gửi tới tài khoản Telegram gắn với số điện thoại{' '}
                      <strong className="text-[#631521] font-mono text-sm sm:text-base font-bold">
                        {formatMaskedPhone(phone)}
                      </strong>
                    </p>
                  </div>

                  {/* NÚT BẤM CTA: MỞ TELEGRAM LẤY MÃ NGAY */}
                  <div className="p-4 bg-gradient-to-r from-[#F0F8FF] to-[#FAF5F0] border border-[#229ED9]/30 rounded-[4px] space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Send className="w-4 h-4 translate-x-[1px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xs sm:text-sm font-bold text-[#2C201A] flex items-center gap-1.5">
                          Nhận mã trực tiếp trên Telegram
                          {telegramDelivered && (
                            <span className="text-[10px] text-[#0E7A3D] bg-[#DEF7EC] px-1.5 py-0.5 rounded font-mono font-normal">
                              Đã gửi tới Bot
                            </span>
                          )}
                        </h2>
                        <p className="text-[11px] text-[#6C5F54] leading-relaxed mt-0.5">
                          Nhấn nút bên dưới để mở Telegram Bot <strong>@QuanNguyenSbot</strong>, sau
                          đó nhấn <strong>START (Bắt đầu)</strong> để xem mã 6 chữ số.
                        </p>
                      </div>
                    </div>

                    <a
                      href={resolvedTelegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-[#229ED9] hover:bg-[#1B81B3] text-white rounded-[2px] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Mở Telegram Lấy Mã Ngay</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>
                  </div>

                  {/* THÔNG BÁO LỖI HOẶC GỬI LẠI THÀNH CÔNG */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {resendMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-[#EDF8F1] border border-[#A7E5BF] rounded-[2px] text-xs text-[#0E7A3D] flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{resendMessage}</span>
                    </motion.div>
                  )}

                  {/* FORM NHẬP 6 CHỮ SỐ */}
                  <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                      <label className="block text-center text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-2">
                        Nhập mã xác thực 6 chữ số
                      </label>
                      <div className="relative max-w-[280px] mx-auto">
                        <input
                          ref={inputRef}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••••"
                          className="w-full py-3 text-center text-3xl font-mono tracking-[0.4em] bg-[#FAF8F5] border-2 border-[#D4AF37] rounded-[2px] focus:bg-white focus:border-[#631521] focus:outline-hidden transition-all shadow-inner"
                        />
                      </div>
                      <p className="text-[11px] text-center text-[#8C7E74] mt-1.5">
                        Mã có hiệu lực trong vòng <strong>5 phút</strong>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang kiểm tra bảo mật...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                          <span>Xác Nhận & Kích Hoạt Ưu Đãi</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* HÀNH ĐỘNG PHỤ: GỬI LẠI MÃ & SỬA SỐ */}
                  <div className="pt-4 border-t border-[#F0EAE1] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || resending}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1.5 text-[#631521] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {resending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {resendCooldown > 0
                          ? `Gửi lại mã Telegram (${resendCooldown}s)`
                          : 'Gửi lại mã xác minh qua Telegram'}
                      </span>
                    </button>

                    <Link
                      to="/uu-dai-hoi-vien"
                      className="text-[#8C7E74] hover:text-[#2C201A] transition-colors"
                    >
                      Đổi số điện thoại khác
                    </Link>
                  </div>

                  {/* HƯỚNG DẪN 3 BƯỚC NHANH */}
                  <div className="bg-[#FAF8F5] p-4 rounded-[4px] border border-[#E8DFD5] space-y-2 text-[11px] text-[#6C5F54]">
                    <div className="font-bold text-[#2C201A] uppercase tracking-wider text-[10px]">
                      💡 Chưa nhận được tin nhắn Telegram?
                    </div>
                    <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
                      <li>
                        Nhấn nút <strong>"Mở Telegram Lấy Mã Ngay"</strong> ở trên, Telegram sẽ tự
                        động mở cuộc trò chuyện với bot.
                      </li>
                      <li>
                        Bấm nút <strong>Start</strong> (Bắt đầu) ở góc dưới màn hình Telegram để bot
                        trả mã xác thực 6 số ngay lập tức.
                      </li>
                      <li>
                        Nếu chưa có Telegram, Quý khách có thể cài đặt app Telegram miễn phí trên App
                        Store / Google Play trong 1 phút.
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* MÀN HÌNH CHÚC MỪNG KÍCH HOẠT THÀNH CÔNG */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border-2 border-[#D4AF37] rounded-[4px] shadow-2xl overflow-hidden text-center"
              >
                {/* Banner Hoàng Gia */}
                <div className="bg-[#631521] text-white p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] mb-3">
                    <Crown className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#D4AF37] block mb-1">
                    Kích Hoạt Thành Công
                  </span>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Chào Mừng Hội Viên Thân Thiết!
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-sm mx-auto">
                    Số điện thoại <span className="font-mono font-bold text-[#D4AF37]">{phone}</span> đã
                    được xác thực chính chủ thành công.
                  </p>
                </div>

                {/* Chi tiết đặc quyền */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="bg-[#FAF5F0] border border-[#D4AF37]/50 rounded-[4px] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-[#8C7E74] tracking-wider block">
                          Chủ tài khoản
                        </span>
                        <strong className="text-sm sm:text-base font-serif text-[#2C201A]">
                          {successMember.full_name || fullName || 'Khách hàng thân thiết'}
                        </strong>
                      </div>
                      <TierBadge tier={successMember.tier || 'MEMBER'} size="md" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="p-2.5 bg-white rounded-[2px] border border-[#E8DFD5]">
                        <span className="text-[10px] uppercase text-[#8C7E74] font-semibold block">
                          Điểm tích lũy
                        </span>
                        <span className="text-base font-serif font-bold text-[#631521]">
                          0 Điểm
                        </span>
                        <span className="text-[9.5px] text-[#8C7E74] block mt-0.5">
                          100.000đ = 1 điểm
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-[2px] border border-[#E8DFD5]">
                        <span className="text-[10px] uppercase text-[#8C7E74] font-semibold block">
                          Đặc quyền chiết khấu
                        </span>
                        <span className="text-base font-serif font-bold text-[#631521]">
                          Đến 15%
                        </span>
                        <span className="text-[9.5px] text-[#8C7E74] block mt-0.5">
                          Thăng hạng tự động
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách quà tặng kích hoạt */}
                  <div className="space-y-2 text-left">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#4A3F38] flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Đặc quyền đã kích hoạt cho bạn:</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#4A3F38]">
                      <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] rounded-[2px] border border-[#E8DFD5]">
                        <Check className="w-3.5 h-3.5 text-[#0E7A3D] shrink-0" />
                        <span>Tặng Voucher sinh nhật <strong>50.000đ</strong> khi đến tháng sinh</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] rounded-[2px] border border-[#E8DFD5]">
                        <Check className="w-3.5 h-3.5 text-[#0E7A3D] shrink-0" />
                        <span>Cộng dồn ưu đãi giảm thêm <strong>10%</strong> khi thanh toán VietQR</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-[#FAF8F5] rounded-[2px] border border-[#E8DFD5]">
                        <Check className="w-3.5 h-3.5 text-[#0E7A3D] shrink-0" />
                        <span>Đổi điểm nhận Voucher <strong>50.000đ</strong> (10 điểm = 50.000đ)</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút điều hướng tiếp theo */}
                  <div className="space-y-2.5 pt-2">
                    {hasCartItems ? (
                      <Link
                        to="/checkout"
                        className="w-full py-3 bg-[#631521] hover:bg-[#7D1B2A] text-white rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                        <span>Quay Lại Thanh Toán & Áp Dụng Ưu Đãi Ngay</span>
                      </Link>
                    ) : (
                      <Link
                        to="/"
                        className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                        <span>Khám Phá BST Pijama & Mua Sắm Ngay</span>
                      </Link>
                    )}

                    <Link
                      to="/hoi-vien"
                      className="w-full py-2.5 bg-[#FAF5F0] hover:bg-[#F5EBE1] text-[#631521] border border-[#D4AF37]/50 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Xem Bảng Quyền Lợi & Hạng Hội Viên</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
