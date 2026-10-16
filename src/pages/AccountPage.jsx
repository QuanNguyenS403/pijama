import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  ShoppingBag,
  Gift,
  Package,
  LogOut,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Truck,
  Copy,
  Check,
  Bell,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { Toast } from '../components/ui/Toast'
import { setAccessToken, clearAccessToken } from '../lib/apiClient'
import { clearLocalOrders } from '../lib/orderSync'
import { loginWithGoogle } from '../lib/googleAuth'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function AccountPage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [voucher, setVoucher] = useState(null)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('vouchers') // 'vouchers' | 'orders' | 'settings'
  const [copiedCode, setCopiedCode] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [updatingPrefs, setUpdatingPrefs] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)

  // Quick fallback login form for demo / testing
  const [loginEmail, setLoginEmail] = useState('')
  const [loginName, setLoginName] = useState('')
  const [devModalOpen, setDevModalOpen] = useState(false)

  const navigate = useNavigate()

  const handleGoogleCredential = async (credential) => {
    try {
      setAuthSubmitting(true)
      setAuthError(null)
      const payload = typeof credential === 'string'
        ? { credential, marketingOptIn: true }
        : {
            credential: credential.credential || `mock-google-token:${credential.sub || 'google_' + Date.now()}:${credential.email || 'quannguyens403@gmail.com'}:${encodeURIComponent(credential.fullName || 'Quý khách')}`,
            ...credential,
            marketingOptIn: true,
          }
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success && data.account) {
        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }
        setUser(data.account)
        setVoucher(data.voucher)
        setMarketingOptIn(true)
        fetchUserOrders()
        setToast({ productName: `Chào mừng ${data.account.fullName || 'bạn'} trở lại!`, id: Date.now() })
      } else {
        setAuthError(data.error || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.')
      }
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ xác thực: ' + err.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleGoogleSignInClick = async () => {
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      await loginWithGoogle({
        onSuccess: handleGoogleCredential,
        onError: (err) => {
          setAuthSubmitting(false)
          setDevModalOpen(true)
        },
        onFallbackNeeded: () => {
          setAuthSubmitting(false)
          setDevModalOpen(true)
        },
      })
    } catch (err) {
      setAuthSubmitting(false)
      setDevModalOpen(true)
    }
  }

  const handleQuickLoginWithEmail = async (email, name) => {
    try {
      setAuthSubmitting(true)
      setAuthError(null)
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name || 'Quý khách QuanNguyenS'
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credential: `mock-google-token:google_${Date.now()}:${cleanEmail}:${encodeURIComponent(cleanName)}`,
          email: cleanEmail,
          fullName: cleanName,
          marketingOptIn: true,
        }),
      })
      const data = await res.json()
      if (data.success && data.account) {
        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }
        setUser(data.account)
        setVoucher(data.voucher)
        setMarketingOptIn(true)
        fetchUserOrders()
        setToast({ productName: `Chào mừng ${data.account.fullName || 'bạn'} gia nhập CLB QuanNguyenS!`, id: Date.now() })
      } else {
        setAuthError(data.error || 'Không thể đăng nhập. Vui lòng thử lại.')
      }
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ xác thực: ' + err.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  // 1. Tải trạng thái phiên làm việc khi vào trang
  const fetchSession = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.authenticated && data.account) {
        setUser(data.account)
        setVoucher(data.voucher)
        setMarketingOptIn(Boolean(data.account.marketingEmailOptIn))
        fetchUserOrders()
      } else {
        setUser(null)
        setVoucher(null)
        setOrders([])
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra phiên làm việc:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // 2. Tải danh sách đơn hàng của tài khoản
  const fetchUserOrders = async () => {
    try {
      const res = await fetch('/api/auth/my-orders', { credentials: 'include' })
      const data = await res.json()
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders)
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn hàng:', err)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  // 3. Xử lý Đăng xuất
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      clearAccessToken()
      clearLocalOrders()
      setUser(null)
      setVoucher(null)
      setOrders([])
      setToast({ productName: 'Đã đăng xuất thành công', id: Date.now() })
    } catch (err) {
      console.error('Lỗi đăng xuất:', err)
    }
  }

  // 4. Xử lý cập nhật tùy chọn nhận email ưu đãi
  const handleToggleMarketing = async () => {
    try {
      setUpdatingPrefs(true)
      const nextVal = !marketingOptIn
      const res = await fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ marketingEmailOptIn: nextVal }),
      })
      const data = await res.json()
      if (data.success) {
        setMarketingOptIn(nextVal)
        setToast({ productName: data.message || 'Đã cập nhật cài đặt', id: Date.now() })
      }
    } catch (err) {
      console.error('Lỗi cập nhật cài đặt:', err)
    } finally {
      setUpdatingPrefs(false)
    }
  }

  // 5. Xử lý đăng nhập / tạo tài khoản (Hỗ trợ Google One-Tap & Test Fallback)
  const handleQuickLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail.trim()) {
      setAuthError('Vui lòng nhập email của bạn')
      return
    }
    try {
      setAuthSubmitting(true)
      setAuthError(null)

      const cleanEmail = loginEmail.trim().toLowerCase()
      const cleanName = loginName.trim() || 'Quý khách QuanNguyenS'

      // Gửi yêu cầu đăng nhập / xác thực
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credential: `mock-google-token:google_${Date.now()}:${cleanEmail}:${encodeURIComponent(cleanName)}`,
          email: cleanEmail,
          fullName: cleanName,
          marketingOptIn: true,
        }),
      })

      const data = await res.json()
      if (data.success && data.account) {
        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }
        setUser(data.account)
        setVoucher(data.voucher)
        setMarketingOptIn(true)
        fetchUserOrders()
        setToast({ productName: `Chào mừng ${data.account.fullName || 'bạn'} trở lại!`, id: Date.now() })
      } else {
        setAuthError(data.error || 'Không thể đăng nhập. Vui lòng thử lại.')
      }
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ xác thực: ' + err.message)
    } finally {
      setAuthSubmitting(false)
    }
  }

  // Sao chép mã voucher
  const copyVoucherCode = (code) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
    setToast({ productName: `Đã sao chép mã ${code}`, id: Date.now() })
  }

  return (
    <div className="bg-[#FAF8F5] text-[#1A1614] min-h-screen font-sans flex flex-col selection:bg-[#D4AF37] selection:text-[#2C201A]">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Header */}
      <Header onCartOpen={() => setCartOpen(true)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Breadcrumb / Back link */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8DFD5]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#8C7E74] hover:text-[#631521] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-[#8C7E74] font-serif font-bold">
              QuanNguyenS Privileged Club
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#631521] mx-auto mb-3" />
            <p className="text-xs text-[#8C7E74] uppercase tracking-wider font-medium">
              Đang xác thực phiên làm việc...
            </p>
          </div>
        ) : !user ? (
          /* ─────────────────────────────────────────────────────────── */
          /* CHƯA ĐĂNG NHẬP: GIAO DIỆN CLUB ĐĂNG NHẬP & QUYỀN LỢI        */
          /* ─────────────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Form Đăng Nhập */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-xs"
            >
              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37] font-bold block mb-1">
                  Đặc quyền thành viên
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614] tracking-tight">
                  Tài Khoản & Ưu Đãi
                </h1>
                <p className="text-xs text-[#8C7E74] mt-1.5 leading-relaxed">
                  Đăng nhập để nhận ngay Voucher chào mừng 10%, miễn phí vận chuyển trọn đời cho đơn đầu tiên và quản lý lịch sử đơn hàng.
                </p>
              </div>

              {authError && (
                <div className="p-3 mb-5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[3px] text-xs text-[#9B1C1C] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Quick Google Sign In */}
              <div className="space-y-4">
                <div className="w-full flex justify-center min-h-[44px]">
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    disabled={authSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#D4AF37] bg-[#FAF8F5] hover:bg-white text-[#2C201A] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer group disabled:opacity-70 active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="group-hover:text-[#631521] transition-colors">
                      Đăng nhập nhanh với Google
                    </span>
                  </button>
                </div>

                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8DFD5]" />
                  </div>
                  <span className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-[#8C7E74]">
                    Hoặc nhập thông tin xác thực
                  </span>
                </div>

                {/* Email Form */}
                <form onSubmit={handleQuickLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                      Họ và Tên
                    </label>
                    <input
                      type="text"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Phương Linh"
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:outline-none focus:border-[#631521] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                      Email của bạn *
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:outline-none focus:border-[#631521] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full mt-2 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.2em] py-3.5 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
                  >
                    {authSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>ĐANG KẾT NỐI...</span>
                      </>
                    ) : (
                      <span>TRUY CẬP TÀI KHOẢN CLB</span>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-[#E8DFD5] text-center">
                  <p className="text-xs text-[#8C7E74] mb-2.5">
                    Bạn muốn bảo vệ tài khoản bằng mật khẩu riêng?
                  </p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open_auth_modal'))}
                    className="w-full py-2.5 px-4 bg-white border border-[#2C201A] text-[#2C201A] hover:bg-[#2C201A] hover:text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Đăng nhập hoặc Tạo tài khoản với Mật khẩu</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Cột phải: Quyền lợi Thành viên */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="bg-[#2C201A] text-white p-6 sm:p-8 rounded-[4px] border border-[#D4AF37]/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-3">
                  <Sparkles className="w-3 h-3" /> Privileged Benefits
                </span>

                <h3 className="font-serif text-xl font-bold text-white mb-2">
                  Đặc Quyền Thành Viên VIP
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6 font-light">
                  Mỗi khách hàng là một phần trong hành trình tinh tế của QuanNguyenS.
                </p>

                <div className="space-y-4 text-xs font-light text-white/90">
                  <div className="flex items-start gap-3">
                    <Gift className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-white block">Voucher Chào Mừng 10%</strong>
                      <span>Giảm ngay 10% và miễn phí vận chuyển cho đơn hàng đầu tiên.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Truck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-white block">Theo Dõi Đơn Hàng Tự Động</strong>
                      <span>Tra cứu trạng thái vận chuyển Viettel Post và lịch sử đơn hàng tập trung.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-white block">Bảo Mật & Ưu Tiên</strong>
                      <span>Nhận thông báo bộ sưu tập giới hạn trước khi mở bán công khai.</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────── */
          /* ĐÃ ĐĂNG NHẬP: BẢNG ĐIỀU KHIỂN THÀNH VIÊN                    */
          /* ─────────────────────────────────────────────────────────── */
          <div className="space-y-8">
            {/* Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#631521] text-[#D4AF37] flex items-center justify-center font-serif text-xl font-bold border-2 border-[#D4AF37]/50 shadow-sm shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.fullName || 'Q')[0].toUpperCase()}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614]">
                      {user.fullName || 'Quý khách'}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[#FAF5F0] border border-[#D4AF37]/40 text-[#631521] text-[10px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" /> Club Member
                    </span>
                  </div>
                  <p className="text-xs text-[#8C7E74] mt-0.5">
                    {user.email || user.phone || 'Thành viên thân thiết'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#8C7E74] hover:text-[#631521] border border-[#E8DFD5] hover:border-[#631521] rounded-[2px] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#E8DFD5] gap-8 text-xs font-bold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'vouchers'
                    ? 'border-[#631521] text-[#631521]'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Voucher Của Tôi</span>
                {voucher && !voucher.used && (
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'orders'
                    ? 'border-[#631521] text-[#631521]'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Đơn Hàng ({orders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'border-[#631521] text-[#631521]'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Cài Đặt & Ưu Đãi</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div>
              {/* TAB 1: VOUCHERS */}
              {activeTab === 'vouchers' && (
                <div className="space-y-6">
                  {voucher ? (
                    <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E8DFD5]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-xl font-bold text-[#631521]">
                              Voucher Chào Mừng Thành Viên
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] ${
                                voucher.used
                                  ? 'bg-[#F3F4F6] text-[#6B7280]'
                                  : 'bg-[#DCFCE7] text-[#16A34A]'
                              }`}
                            >
                              {voucher.used ? 'Đã sử dụng' : 'Khả dụng'}
                            </span>
                          </div>
                          <p className="text-xs text-[#8C7E74] mt-1">
                            Ưu đãi giảm <strong>10%</strong> trên toàn bộ đơn hàng + <strong>Miễn phí vận chuyển toàn quốc</strong>.
                          </p>
                        </div>

                        {/* Copy Code Button */}
                        <div className="flex items-center gap-2">
                          <div className="px-4 py-2 bg-[#FAF5F0] border-2 border-dashed border-[#D4AF37] font-mono font-bold text-sm text-[#631521] rounded-[2px]">
                            {voucher.code}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyVoucherCode(voucher.code)}
                            className="p-2 border border-[#E8DFD5] hover:border-[#631521] rounded-[2px] text-[#4A3F38] hover:text-[#631521] transition-colors cursor-pointer"
                            title="Sao chép mã"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8C7E74]">
                        <span>* Áp dụng tự động tại bước Giỏ hàng / Thanh toán.</span>
                        <Link
                          to="/"
                          className="font-bold text-[#631521] hover:underline flex items-center gap-1"
                        >
                          Dùng mã mua sắm ngay <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-[4px] border border-[#E8DFD5] text-center text-xs text-[#8C7E74]">
                      <Gift className="w-8 h-8 text-[#D4AF37] mx-auto mb-2 opacity-60" />
                      <p>Bạn chưa có voucher nào đang hoạt động.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="bg-white p-12 rounded-[4px] border border-[#E8DFD5] text-center">
                      <ShoppingBag className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-60" />
                      <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1">
                        Chưa có đơn hàng nào
                      </h3>
                      <p className="text-xs text-[#8C7E74] mb-6">
                        Đơn hàng của bạn sau khi đặt sẽ tự động hiển thị chi tiết tại đây.
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-[#631521] text-white px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-[2px] hover:bg-[#4A0D17] transition-colors"
                      >
                        Khám phá bộ sưu tập ngay
                      </Link>
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div
                        key={ord.orderId}
                        className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-[#E8DFD5]">
                          <div>
                            <span className="font-serif font-bold text-base text-[#1A1614]">
                              #{ord.orderId}
                            </span>
                            <span className="text-xs text-[#8C7E74] ml-3">
                              {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-[2px] ${
                                ord.status === 'DELIVERED'
                                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                                  : ord.status === 'SHIPPED'
                                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                                  : ord.status === 'CANCELLED'
                                  ? 'bg-[#FEE2E2] text-[#DC2626]'
                                  : 'bg-[#FEF3C7] text-[#D97706]'
                              }`}
                            >
                              {ord.status === 'DELIVERED'
                                ? 'Đã giao hàng'
                                : ord.status === 'SHIPPED'
                                ? 'Đang vận chuyển'
                                : ord.status === 'CANCELLED'
                                ? 'Đã hủy'
                                : ord.status === 'AWAITING_PAYMENT'
                                ? 'Chờ thanh toán'
                                : 'Đang xử lý'}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {ord.items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-[#4A3F38]">
                                {it.productName || it.name} × {it.quantity}{' '}
                                {it.color ? `(${it.color})` : ''} {it.size ? `Size ${it.size}` : ''}
                              </span>
                              <span className="font-medium text-[#1A1614]">
                                {formatVND((it.unitPrice || it.price) * it.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Tracking details */}
                        {ord.trackingCode && (
                          <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#4A3F38]">
                              <Truck className="w-4 h-4 text-[#631521]" />
                              <span>Vận đơn Viettel Post: <strong>{ord.trackingCode}</strong></span>
                            </div>
                            <a
                              href={`https://viettelpost.vn/tra-cuu-hanh-trinh-don-hang?id=${ord.trackingCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#631521] hover:underline flex items-center gap-1"
                            >
                              Tra cứu hành trình <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="pt-2 flex justify-between items-center border-t border-[#E8DFD5] text-xs">
                          <span className="text-[#8C7E74]">
                            Phương thức: {ord.paymentMethod === 'BANK_TRANSFER' ? 'VietQR (Chuyển khoản)' : 'COD (Tiền mặt)'}
                          </span>
                          <span className="font-serif text-base font-bold text-[#631521]">
                            Tổng: {formatVND(ord.total)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs space-y-6">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1">
                      Cài Đặt Nhận Thông Báo & Tiếp Thị
                    </h3>
                    <p className="text-xs text-[#8C7E74]">
                      Quản lý tùy chọn nhận email ưu đãi từ QuanNguyenS theo chuẩn bảo vệ quyền riêng tư cá nhân.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E8DFD5]">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={marketingOptIn}
                        onChange={handleToggleMarketing}
                        disabled={updatingPrefs}
                        className="mt-1 w-4 h-4 text-[#631521] rounded border-[#E8DFD5] focus:ring-[#631521]"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-[#1A1614] block">
                          Nhận email thông báo bộ sưu tập mới & mã giảm giá bí mật
                        </span>
                        <span className="text-[#8C7E74] block mt-0.5 leading-relaxed">
                          Bạn có thể hủy đăng ký bất cứ lúc nào thông qua liên kết hủy đăng ký 1-click dưới chân mỗi email hoặc tắt tùy chọn này tại đây.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Quick Local / Google Auth Modal */}
      {devModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl border border-[#D4AF37]/30">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-serif font-bold text-lg text-[#631521]">Xác thực tài khoản Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setDevModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8C7E74] my-3 leading-relaxed">
              Chọn nhanh tài khoản để trải nghiệm ngay đặc quyền Thành viên CLB (Voucher chào mừng 10%, Lịch sử đơn hàng, Miễn phí vận chuyển):
            </p>

            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setDevModalOpen(false)
                  handleQuickLoginWithEmail('quannguyens403@gmail.com', 'QuanNguyenS Store Owner')
                }}
                className="w-full text-left p-3 border border-[#E8DFD5] hover:border-[#D4AF37] hover:bg-[#FAF8F5] rounded flex items-center justify-between transition-all group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1614] group-hover:text-[#631521]">quannguyens403@gmail.com</div>
                  <div className="text-[11px] text-[#8C7E74]">Chủ shop / Quản trị viên QuanNguyenS</div>
                </div>
                <span className="text-[10px] font-bold text-white bg-[#631521] px-2 py-0.5 rounded">SHOP OWNER</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDevModalOpen(false)
                  handleQuickLoginWithEmail('khachhang.vip@gmail.com', 'Quý Khách VIP')
                }}
                className="w-full text-left p-3 border border-[#E8DFD5] hover:border-[#D4AF37] hover:bg-[#FAF8F5] rounded flex items-center justify-between transition-all group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-[#1A1614] group-hover:text-[#631521]">khachhang.vip@gmail.com</div>
                  <div className="text-[11px] text-[#8C7E74]">Khách hàng thân thiết VIP Club</div>
                </div>
                <span className="text-[10px] font-bold text-[#631521] bg-[#F5E1A4] px-2 py-0.5 rounded">VIP CLUB</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#E8DFD5]">
              <label className="block text-xs font-bold text-[#4A3F38] mb-1.5">Hoặc nhập email Google bất kỳ:</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your-email@gmail.com"
                  defaultValue={loginEmail}
                  id="custom-google-email-input"
                  className="flex-1 px-3 py-2 text-xs border border-[#E8DFD5] rounded focus:outline-none focus:border-[#631521]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('custom-google-email-input')
                    const val = input ? input.value.trim() : ''
                    if (val && val.includes('@')) {
                      setDevModalOpen(false)
                      handleQuickLoginWithEmail(val, loginName.trim() || 'Quý khách Google')
                    }
                  }}
                  className="bg-[#631521] text-white text-xs font-bold px-4 py-2 rounded hover:bg-[#4A0D17] transition-colors cursor-pointer"
                >
                  ĐĂNG NHẬP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Section12Footer />
    </div>
  )
}
