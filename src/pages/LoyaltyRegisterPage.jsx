import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  User,
  ShieldCheck,
  Send,
  Sparkles,
  Crown,
  Gift,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowRight,
  Percent,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { TierBadge } from '../components/loyalty/LoyaltyBadges'

export default function LoyaltyRegisterPage() {
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)

  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [consentTerms, setConsentTerms] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Đăng Ký Ưu Đãi Hội Viên — QuanNguyenS Privileged'
    window.scrollTo({ top: 0, behavior: 'instant' })

    // Tự động điền thông tin nếu đã từng lưu ở checkout
    try {
      const savedCheckout = JSON.parse(localStorage.getItem('qns_checkout_customer_info') || 'null')
      if (savedCheckout) {
        if (savedCheckout.phone) setPhone(savedCheckout.phone)
        if (savedCheckout.fullName) setFullName(savedCheckout.fullName)
      }
    } catch {}
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError(null)

    const cleanPhone = phone.trim()
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('Vui lòng nhập số điện thoại di động hợp lệ (10 chữ số).')
      return
    }

    const cleanName = fullName.trim()
    if (!cleanName || cleanName.length < 2) {
      setError('Vui lòng nhập họ và tên của Quý khách (tối thiểu 2 ký tự).')
      return
    }

    if (!consentTerms) {
      setError('Vui lòng đồng ý với Điều khoản Hội viên để tiếp tục.')
      return
    }

    setLoading(true)

    try {
      // Gửi yêu cầu phát mã OTP xác minh qua Telegram
      const res = await fetch('/api/loyalty/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          fullName: cleanName,
          purpose: 'enrollment',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể tạo yêu cầu xác minh lúc này. Vui lòng thử lại sau.')
        setLoading(false)
        return
      }

      // Lưu trạng thái vào sessionStorage để dự phòng F5
      const payload = {
        phone: cleanPhone,
        fullName: cleanName,
        verificationId: data.verificationId || '',
        telegramUrl: data.telegramUrl || '',
      }
      sessionStorage.setItem('qns_pending_loyalty_verification', JSON.stringify(payload))

      // Di chuyển đến trang điền mã xác minh Telegram
      const searchParams = new URLSearchParams({
        phone: cleanPhone,
        name: cleanName,
      })
      if (data.verificationId) searchParams.set('v', data.verificationId)
      if (data.telegramUrl) searchParams.set('tg', data.telegramUrl)

      navigate(`/xac-minh-hoi-vien?${searchParams.toString()}`, {
        state: payload,
      })
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Quý khách vui lòng kiểm tra lại kết nối mạng.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C201A] flex flex-col font-sans">
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="flex-1 py-8 sm:py-14 px-4 sm:px-6">
        <div className="max-w-[880px] mx-auto">
          {/* Header Giới Thiệu */}
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5F0] border border-[#D4AF37]/50 text-[#631521] text-[11px] font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>QuanNguyenS Privileged Program</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2C201A] leading-tight">
              Đăng Ký Nhận Ưu Đãi Hội Viên
            </h1>

            <p className="text-xs sm:text-sm text-[#6C5F54] leading-relaxed">
              Trở thành hội viên để tận hưởng đặc quyền giảm giá đến 15%, tích điểm đổi voucher và
              nhận quà tặng sinh nhật thượng lưu độc quyền.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* CỘT TRÁI: FORM ĐĂNG KÝ BẰNG SỐ ĐIỆN THOẠI */}
            <div className="lg:col-span-7 bg-white border border-[#E8DFD5] rounded-[4px] shadow-xl p-6 sm:p-8 relative">
              {/* Huy hiệu bảo mật */}
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#F0EAE1]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#631521]/10 text-[#631521] flex items-center justify-center">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="font-serif font-bold text-base text-[#2C201A]">
                    Thông Tin Đăng Ký
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#0E7A3D] bg-[#DEF7EC] px-2.5 py-1 rounded-full font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Xác thực Telegram</span>
                </div>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Họ và tên */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                    Họ và tên của Quý khách <span className="text-[#631521]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C7E74] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Phương Mai"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-xs sm:text-sm rounded-[2px] focus:bg-white focus:border-[#631521] focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                    Số điện thoại di động <span className="text-[#631521]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C7E74] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-xs sm:text-sm rounded-[2px] focus:bg-white focus:border-[#631521] focus:outline-hidden font-mono transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-[#8C7E74] mt-1">
                    Số điện thoại dùng để nhận mã xác minh và tích điểm khi mua sắm.
                  </p>
                </div>

                {/* Phương thức nhận mã: Telegram */}
                <div className="p-3.5 bg-[#F0F8FF] border border-[#229ED9]/30 rounded-[4px] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#2C201A]">
                    <span className="flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-[#229ED9]" />
                      <span>Kênh nhận mã xác minh: Telegram</span>
                    </span>
                    <span className="text-[10px] text-[#229ED9] bg-[#E1F3FE] px-2 py-0.5 rounded font-semibold uppercase">
                      Miễn phí 100%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#556987] leading-relaxed">
                    Mã xác minh bảo mật gồm 6 số sẽ được gửi trực tiếp qua Telegram tới Quý khách để
                    đảm bảo tính chính chủ tuyệt đối.
                  </p>
                </div>

                {/* Điều khoản & Cam kết tuổi */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 text-xs text-[#4A3F38] cursor-pointer leading-relaxed">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521] shrink-0"
                    />
                    <span>
                      Tôi đồng ý với{' '}
                      <Link
                        to="/chinh-sach?tab=loyalty"
                        target="_blank"
                        className="text-[#631521] underline font-semibold"
                      >
                        Điều khoản Hội viên QuanNguyenS
                      </Link>{' '}
                      và xác nhận tôi từ đủ 16 tuổi trở lên.
                    </span>
                  </label>
                </div>

                {/* Nút gửi & tiếp tục */}
                <button
                  type="submit"
                  disabled={loading || !phone || !fullName || !consentTerms}
                  className="w-full py-3.5 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs sm:text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo mã xác minh...</span>
                    </>
                  ) : (
                    <>
                      <span>Tiếp Tục & Nhận Mã Xác Minh</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#F0EAE1] text-center text-xs text-[#8C7E74]">
                Đã có tài khoản hội viên?{' '}
                <Link
                  to="/hoi-vien"
                  className="text-[#631521] font-semibold hover:underline"
                >
                  Đăng nhập xem quyền lợi
                </Link>
              </div>
            </div>

            {/* CỘT PHẢI: BẢNG TỔNG HỢP ĐẶC QUYỀN HỘI VIÊN */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#FAF5F0] border border-[#D4AF37]/50 rounded-[4px] p-6 space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D4AF37] block">
                  Đặc quyền thượng lưu
                </span>

                <h3 className="font-serif text-xl font-bold text-[#2C201A] leading-tight">
                  Lợi Ích Khi Gia Nhập Hội Viên
                </h3>

                <div className="space-y-3 pt-2 text-xs text-[#4A3F38]">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#631521] flex items-center justify-center shrink-0 mt-0.5">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="block text-[#2C201A]">Giảm giá đến 15% trọn đời</strong>
                      <span className="text-[11px] text-[#6C5F54]">
                        Tự động chiết khấu theo hạng Bạc (5%), Vàng (10%), Kim Cương (15%).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#631521] flex items-center justify-center shrink-0 mt-0.5">
                      <Gift className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="block text-[#2C201A]">Voucher sinh nhật đến 500.000đ</strong>
                      <span className="text-[11px] text-[#6C5F54]">
                        Món quà chúc mừng gửi tặng riêng vào tháng sinh nhật của Quý khách.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#631521] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="block text-[#2C201A]">Tích điểm đổi voucher 50.000đ</strong>
                      <span className="text-[11px] text-[#6C5F54]">
                        Mỗi 100.000đ chi tiêu = 1 điểm. Cứ 10 điểm đổi ngay voucher 50.000đ.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#631521] flex items-center justify-center shrink-0 mt-0.5">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="block text-[#2C201A]">Cộng dồn chiết khấu VietQR</strong>
                      <span className="text-[11px] text-[#6C5F54]">
                        Được phép cộng dồn thêm ưu đãi 10% thanh toán chuyển khoản ngân hàng.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8DFD5]">
                  <Link
                    to="/hoi-vien"
                    className="inline-flex items-center gap-1.5 text-xs text-[#631521] font-bold hover:underline"
                  >
                    <span>Xem chi tiết 4 hạng hội viên</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
