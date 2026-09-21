import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Gift,
  ShieldCheck,
  LogOut,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Bell,
  Plus,
  ArrowRight,
  Package,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'

export default function AccountPage() {
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [voucher, setVoucher] = useState(null)
  const [copied, setCopied] = useState(false)
  const [prefLoading, setPrefLoading] = useState(false)
  const [prefMessage, setPrefMessage] = useState('')

  // Form link email cho tài khoản phone
  const [showLinkEmail, setShowLinkEmail] = useState(false)
  const [linkEmailInput, setLinkEmailInput] = useState('')
  const [linkOtpInput, setLinkOtpInput] = useState('')
  const [linkStep, setLinkStep] = useState('input') // 'input' | 'otp'
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState(null)

  const fetchSession = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.authenticated && data.account) {
        setAccount(data.account)
        setVoucher(data.voucher || null)
      } else {
        setAccount(null)
        setVoucher(null)
      }
    } catch {
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
    const handleAccountUpdate = () => fetchSession()
    window.addEventListener('customer_account_updated', handleAccountUpdate)
    return () => window.removeEventListener('customer_account_updated', handleAccountUpdate)
  }, [])

  // Toggle Email Marketing Preference
  const handleToggleMarketing = async (newValue) => {
    setPrefLoading(true)
    setPrefMessage('')
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ marketingEmailOptIn: newValue }),
      })
      const data = await res.json()
      if (data.success) {
        setAccount((prev) => ({ ...prev, marketingEmailOptIn: data.marketingEmailOptIn }))
        setPrefMessage(data.message)
        setTimeout(() => setPrefMessage(''), 4000)
      }
    } catch {
      setPrefMessage('Lỗi cập nhật tùy chọn thông báo')
    } finally {
      setPrefLoading(false)
    }
  }

  // Gửi OTP liên kết Email
  const handleSendLinkEmailOtp = async (e) => {
    e.preventDefault()
    setLinkError(null)
    setLinkLoading(true)
    try {
      const res = await fetch('/api/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: linkEmailInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi gửi mã xác minh')
      setLinkStep('otp')
    } catch (err) {
      setLinkError(err.message)
    } finally {
      setLinkLoading(false)
    }
  }

  // Xác minh OTP liên kết Email
  const handleVerifyLinkEmail = async (e) => {
    e.preventDefault()
    setLinkError(null)
    setLinkLoading(true)
    try {
      const res = await fetch('/api/auth/link-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: linkEmailInput.trim(), code: linkOtpInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Xác minh email thất bại')
      setShowLinkEmail(false)
      setLinkStep('input')
      setLinkEmailInput('')
      setLinkOtpInput('')
      fetchSession()
    } catch (err) {
      setLinkError(err.message)
    } finally {
      setLinkLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      setAccount(null)
      setVoucher(null)
      localStorage.removeItem('qns_customer_account')
      localStorage.removeItem('qns_active_voucher')
      window.dispatchEvent(new Event('customer_account_updated'))
      navigate('/')
    } catch {
      window.location.reload()
    }
  }

  const handleCopyVoucher = () => {
    if (!voucher?.code) return
    navigator.clipboard.writeText(voucher.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] flex flex-col font-sans selection:bg-[#631521] selection:text-white">
      <title>Tài Khoản Khách Hàng — QuanNguyenS</title>
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="h-16 md:h-20" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#631521]" />
            <p className="text-xs text-[#8C7E74]">Đang đồng bộ thông tin tài khoản...</p>
          </div>
        ) : !account ? (
          /* TRẠNG THÁI CHƯA ĐĂNG NHẬP */
          <div className="bg-white p-8 sm:p-12 rounded-[4px] border border-[#E8DFD5] shadow-sm text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#FAF5F0] border border-[#D4AF37] text-[#631521] flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7" />
            </div>

            <h1 className="font-serif text-2xl font-bold text-[#1A1614] mb-2">
              Tài Khoản Thành Viên QuanNguyenS
            </h1>
            <p className="text-xs text-[#4A3F38] leading-relaxed mb-6">
              Đăng nhập hoặc đăng ký tài khoản qua <strong>Google</strong> hoặc <strong>Facebook</strong> để tạo tài khoản riêng trên website, tên tài khoản sẽ được đồng bộ chuẩn xác theo tên tài khoản của bạn kèm ưu đãi <strong>Voucher giảm 10% + Miễn phí vận chuyển</strong>.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('customer_account_prompt'))
                }}
                className="w-full flex items-center justify-center gap-3 border border-[#D8D2C9] bg-white text-[#1A1614] hover:bg-[#FAF8F5] hover:border-[#631521] py-3 px-4 rounded-[2px] text-xs font-bold tracking-wide shadow-xs cursor-pointer transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Đăng Ký / Đăng Nhập Với Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('customer_account_prompt'))
                }}
                className="w-full flex items-center justify-center gap-3 border border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166FE5] py-3 px-4 rounded-[2px] text-xs font-bold tracking-wide shadow-xs cursor-pointer transition-all"
              >
                <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Đăng Ký / Đăng Nhập Với Facebook</span>
              </button>

              <Link
                to="/"
                className="block text-xs text-[#8C7E74] hover:text-[#631521] hover:underline pt-2"
              >
                Tiếp tục mua hàng dưới vai trò khách vãng lai
              </Link>
            </div>
          </div>
        ) : (
          /* TRẠNG THÁI ĐÃ ĐĂNG NHẬP */
          <div className="space-y-6">
            {/* Header Account */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-[#D4AF37] shadow-sm flex items-center justify-center bg-[#631521] text-[#D4AF37] text-xl font-serif font-bold">
                  {account.avatarUrl ? (
                    <img src={account.avatarUrl} alt={account.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{account.fullName ? account.fullName.charAt(0).toUpperCase() : 'Q'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614]">
                      {account.fullName || 'Quý khách'}
                    </h1>
                    <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Đã xác minh
                    </span>
                  </div>
                  <p className="text-xs text-[#8C7E74] mt-0.5">
                    Thành viên QuanNguyenS Club · Phương thức: {account.method === 'google' ? 'Google' : (account.method === 'facebook' ? 'Facebook' : account.method || 'Thành viên')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#631521] hover:bg-[#FAF5F0] border border-[#E8DFD5] rounded-[2px] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>

            {/* Grid 2 cột: Voucher & Thông tin liên hệ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Voucher chào mừng */}
              <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FAF5F0] p-6 rounded-[4px] border-2 border-[#D4AF37] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-[#631521] uppercase font-mono flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      Ưu đãi độc quyền
                    </span>
                    {voucher?.used ? (
                      <span className="text-[10px] font-semibold bg-[#8C7E74]/15 text-[#8C7E74] px-2 py-0.5 rounded-[2px]">
                        Đã sử dụng
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-[2px]">
                        Sẵn sàng áp dụng
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1">
                    Voucher Thành Viên Mới
                  </h3>
                  <p className="text-xs text-[#4A3F38] leading-relaxed">
                    Giảm 10% trên merchandise subtotal + Miễn phí vận chuyển toàn quốc cho đơn đủ điều kiện đầu tiên.
                  </p>

                  <div className="my-4 p-3 bg-white border border-[#D4AF37] rounded-[3px] flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-[#631521] tracking-wider select-all">
                      {voucher?.code || 'WELCOME-QNS'}
                    </span>
                    <button
                      onClick={handleCopyVoucher}
                      className="p-1.5 text-[#631521] hover:bg-[#FAF5F0] rounded-[2px] cursor-pointer"
                      title="Sao chép mã"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#2E7D32]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  className="w-full text-center bg-[#631521] hover:bg-[#4A0D17] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-[2px] transition-colors"
                >
                  Dùng Voucher Tại Checkout
                </Link>
              </div>

              {/* Card 2: Thông tin liên hệ đã xác minh */}
              <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-xs space-y-4">
                <h3 className="font-serif text-base font-bold text-[#1A1614] pb-2 border-b border-[#E8DFD5]">
                  Thông Tin Định Danh
                </h3>

                {/* SĐT */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7E74] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#631521]" />
                    Số điện thoại:
                  </span>
                  <span className="font-mono font-semibold text-[#1A1614]">
                    {account.phone || 'Chưa liên kết'}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7E74] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#631521]" />
                    Email nhận hóa đơn:
                  </span>
                  <span className="font-semibold text-[#1A1614]">
                    {account.email || (
                      <button
                        onClick={() => setShowLinkEmail(true)}
                        className="text-[#631521] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <Plus className="w-3 h-3" /> Thêm email
                      </button>
                    )}
                  </span>
                </div>

                {/* Form liên kết Email cho Phone account nếu chưa có email */}
                {showLinkEmail && !account.email && (
                  <div className="mt-3 p-3 bg-[#FAF8F5] border border-[#D4AF37]/60 rounded-[3px] text-xs space-y-2">
                    <p className="font-bold text-[#631521]">Thêm & Xác minh Email:</p>
                    {linkError && <p className="text-[#631521] text-[11px]">{linkError}</p>}

                    {linkStep === 'input' ? (
                      <form onSubmit={handleSendLinkEmailOtp} className="space-y-2">
                        <input
                          type="email"
                          value={linkEmailInput}
                          onChange={(e) => setLinkEmailInput(e.target.value)}
                          placeholder="name@gmail.com"
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLinkEmail(false)}
                            className="px-2.5 py-1 text-[#8C7E74]"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={linkLoading}
                            className="px-3 py-1 bg-[#631521] text-white font-bold rounded-[2px]"
                          >
                            {linkLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyLinkEmail} className="space-y-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={linkOtpInput}
                          onChange={(e) => setLinkOtpInput(e.target.value)}
                          placeholder="Nhập mã 6 số từ email"
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px] font-mono text-center tracking-widest"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setLinkStep('input')}
                            className="px-2.5 py-1 text-[#8C7E74]"
                          >
                            Đổi email
                          </button>
                          <button
                            type="submit"
                            disabled={linkLoading}
                            className="px-3 py-1 bg-[#631521] text-white font-bold rounded-[2px]"
                          >
                            {linkLoading ? 'Đang xác minh...' : 'Xác minh'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[#E8DFD5]">
                  <button
                    onClick={() => window.dispatchEvent(new Event('open_orders_drawer'))}
                    className="text-xs text-[#631521] hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Xem lịch sử các đơn đã đặt</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Tùy chọn Nhận Email Marketing (Consent & Unsubscribe) */}
            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#E8DFD5]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#631521]" />
                  <h3 className="font-serif text-base font-bold text-[#1A1614]">
                    Tùy Chọn Thông Báo Email (Marketing Preferences)
                  </h3>
                </div>
                {prefLoading && <Loader2 className="w-4 h-4 animate-spin text-[#631521]" />}
              </div>

              {prefMessage && (
                <div className="p-2.5 bg-[#E8F5E9] text-[#2E7D32] text-xs rounded-[2px] font-medium">
                  ✓ {prefMessage}
                </div>
              )}

              <div className="flex items-start justify-between gap-4 pt-1">
                <div className="text-xs text-[#4A3F38] space-y-1">
                  <p className="font-semibold text-[#1A1614]">
                    Nhận email về sản phẩm mới, livestream và ưu đãi của QuanNguyenS
                  </p>
                  <p className="text-[#8C7E74] leading-relaxed">
                    Bạn có thể bật hoặc tắt tùy chọn này bất cứ lúc nào. Khi tắt nhận tin quảng cáo, quyền lợi thành viên và voucher của bạn vẫn được bảo lưu 100%.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(account.marketingEmailOptIn)}
                    onChange={(e) => handleToggleMarketing(e.target.checked)}
                    disabled={prefLoading || !account.email}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E8DFD5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#8C7E74] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#631521]"></div>
                </label>
              </div>

              {!account.email && (
                <p className="text-[11px] text-[#8C7E74] italic">
                  * Vui lòng thêm email ở mục Thông Tin Định Danh phía trên để bật nhận thông báo ưu đãi.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <Section12Footer />
    </div>
  )
}
