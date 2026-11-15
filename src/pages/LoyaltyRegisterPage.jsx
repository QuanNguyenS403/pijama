import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Phone,
  User,
  Sparkles,
  Crown,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'

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
        <div className="max-w-xl mx-auto">
          {/* Header Giới Thiệu */}
          <div className="text-center mx-auto mb-8 sm:mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5F0] border border-[#D4AF37]/50 text-[#631521] text-[11px] font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>QuanNguyenS Privileged Program</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2C201A] leading-tight">
              Đăng Ký Nhận Ưu Đãi Hội Viên
            </h1>
          </div>

          {/* FORM ĐĂNG KÝ BẰNG SỐ ĐIỆN THOẠI */}
          <div className="bg-white border border-[#E8DFD5] rounded-[4px] shadow-xl p-6 sm:p-8 relative">
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
          </div>
        </main>

      <Section12Footer />
    </div>
  )
}
