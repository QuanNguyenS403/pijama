import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  ShoppingBag,
  Gift,
  Package,
  LogOut,
  Mail,
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
  Crown,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { Toast } from '../components/ui/Toast'
import { apiPost, setAccessToken, clearAccessToken } from '../lib/apiClient'
import { clearLocalOrders } from '../lib/orderSync'
import { loginWithGoogle, setupGoogleSignInButton, decodeGoogleJwt } from '../lib/googleAuth'
import LoyaltyMemberCard from '../components/loyalty/LoyaltyMemberCard'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function AccountPage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('qns_customer_account')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [voucher, setVoucher] = useState(null)
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'loyalty') // 'loyalty' | 'vouchers' | 'orders' | 'settings'
  const [copiedCode, setCopiedCode] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [updatingPrefs, setUpdatingPrefs] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [isGisButtonMounted, setIsGisButtonMounted] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const googleButtonRef = useRef(null)

  const navigate = useNavigate()

  const handleGoogleCredential = async (credential) => {
    try {
      setAuthSubmitting(true)
      setAuthError(null)
      const credStr = typeof credential === 'string' ? credential : credential?.credential
      const decoded = typeof credStr === 'string' ? decodeGoogleJwt(credStr) : null
      const payload = {
        credential: credStr || (credential?.email ? `mock-google-token:sub:${credential.email}:${encodeURIComponent(credential.fullName || '')}` : ''),
        email: decoded?.email || credential?.email,
        fullName: decoded?.name || credential?.fullName || credential?.name,
        sub: decoded?.sub || credential?.sub,
        avatarUrl: decoded?.picture || credential?.picture,
        picture: decoded?.picture || credential?.picture,
        marketingOptIn: true,
        ...(typeof credential === 'object' ? credential : {}),
      }
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      let data = null
      const text = await res.text()
      try {
        data = text ? JSON.parse(text) : null
      } catch (e) {
        console.warn('Lỗi phân tích JSON từ máy chủ:', text)
      }

      if (!res.ok || !data || !data.success) {
        const errorMsg = data?.error || (
          res.status === 503 || res.status === 502
            ? 'Máy chủ backend chưa sẵn sàng. Vui lòng đảm bảo backend đang chạy.'
            : 'Đăng nhập Google không thành công. Vui lòng thử lại.'
        )
        setAuthError(errorMsg)
        return
      }

      if (data.accessToken) {
        setAccessToken(data.accessToken)
      }
      const loggedInAccount = data.account || data.user
      if (loggedInAccount) {
        const resolvedAvatar = loggedInAccount.avatarUrl || loggedInAccount.avatar_url || payload.avatarUrl || null
        loggedInAccount.avatarUrl = resolvedAvatar
        loggedInAccount.avatar_url = resolvedAvatar
      }
      setUser(loggedInAccount)
      setVoucher(data.voucher)
      setMarketingOptIn(true)
      try {
        localStorage.setItem('qns_customer_account', JSON.stringify(loggedInAccount))
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: loggedInAccount } }))
      fetchUserOrders()
      setToast({ productName: `Chào mừng ${loggedInAccount?.fullName || 'bạn'} trở lại!`, id: Date.now() })
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ xác thực: ' + (err.message || 'Không thể kết nối'))
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleGoogleSignInClick = () => {
    setAuthError(null)
    setAuthSubmitting(true)
    try {
      loginWithGoogle({
        onSuccess: handleGoogleCredential,
        onError: (err) => {
          setAuthSubmitting(false)
          if (err) {
            setAuthError(typeof err === 'string' ? err : 'Đăng nhập Google thất bại.')
          }
        },
        onFallbackNeeded: (reason) => {
          setAuthSubmitting(false)
          if (reason === 'popup_blocked') {
            setAuthError('Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng nhấn vào biểu tượng cửa sổ bật lên (pop-up) trên thanh địa chỉ để cho phép.')
          } else {
            setAuthError('Không thể kết nối máy chủ Google Identity. Vui lòng thử lại hoặc đăng nhập bằng Email bên dưới.')
          }
        },
      })
    } catch (err) {
      setAuthSubmitting(false)
      setAuthError('Lỗi kết nối Google: ' + err.message)
    }
  }

  const handleDirectAuth = async (e) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSubmitting(true)

    try {
      if (authMode === 'login') {
        const res = await apiPost('/api/auth/login', {
          email: authEmail.trim(),
          password: authPassword,
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Email hoặc mật khẩu không chính xác')
        }

        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }

        const loggedUser = data.account || data.user
        if (loggedUser) {
          const resolvedAvatar = loggedUser.avatarUrl || loggedUser.avatar_url || null
          loggedUser.avatarUrl = resolvedAvatar
          loggedUser.avatar_url = resolvedAvatar
        }
        setUser(loggedUser)
        setVoucher(data.voucher)
        try {
          localStorage.setItem('qns_customer_account', JSON.stringify(loggedUser))
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: loggedUser } }))
        fetchUserOrders()
        setToast({ productName: `Chào mừng ${loggedUser?.fullName || 'bạn'} trở lại!`, id: Date.now() })
      } else if (authMode === 'register') {
        const res = await apiPost('/api/auth/register', {
          email: authEmail.trim(),
          password: authPassword,
          fullName: authFullName.trim(),
          marketingOptIn: true,
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Đăng ký không thành công')
        }

        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }

        const loggedUser = data.account || data.user
        if (loggedUser) {
          const resolvedAvatar = loggedUser.avatarUrl || loggedUser.avatar_url || null
          loggedUser.avatarUrl = resolvedAvatar
          loggedUser.avatar_url = resolvedAvatar
        }
        setUser(loggedUser)
        setVoucher(data.voucher)
        try {
          localStorage.setItem('qns_customer_account', JSON.stringify(loggedUser))
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: loggedUser } }))
        fetchUserOrders()
        setToast({ productName: `Đăng ký thành công! Chào mừng ${loggedUser?.fullName || 'bạn'}.`, id: Date.now() })
      } else if (authMode === 'forgot') {
        setForgotSent(true)
        setToast({ productName: 'Đã tiếp nhận yêu cầu khôi phục', id: Date.now() })
      }
    } catch (err) {
      setAuthError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  // 1. Tải trạng thái phiên làm việc khi vào trang
  const fetchSession = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      let data = null
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : null
      } catch (e) {}

      if (data && data.success && data.authenticated && data.account) {
        const acc = {
          ...data.account,
          avatarUrl: data.account.avatarUrl || data.account.avatar_url || '',
          avatar_url: data.account.avatar_url || data.account.avatarUrl || '',
        }
        setUser(acc)
        setVoucher(data.voucher)
        setMarketingOptIn(Boolean(acc.marketingEmailOptIn))
        try {
          localStorage.setItem('qns_customer_account', JSON.stringify(acc))
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: acc } }))
        fetchUserOrders()
      } else {
        // Thử khôi phục session qua token rotation / refresh cookie nếu có
        let restored = false
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json().catch(() => null)
            if (refreshData?.success && refreshData?.user) {
              if (refreshData.accessToken) setAccessToken(refreshData.accessToken)
              const reMe = await fetch('/api/auth/me', { credentials: 'include' })
              const reData = await reMe.json().catch(() => null)
              if (reData?.authenticated && reData?.account) {
                const reAcc = {
                  ...reData.account,
                  avatarUrl: reData.account.avatarUrl || reData.account.avatar_url || '',
                  avatar_url: reData.account.avatar_url || reData.account.avatarUrl || '',
                }
                setUser(reAcc)
                setVoucher(reData.voucher)
                setMarketingOptIn(Boolean(reAcc.marketingEmailOptIn))
                try {
                  localStorage.setItem('qns_customer_account', JSON.stringify(reAcc))
                } catch (_) {}
                window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: reAcc } }))
                fetchUserOrders()
                restored = true
              }
            }
          }
        } catch (_) {}

        if (!restored) {
          setUser(null)
          setVoucher(null)
          setOrders([])
          try {
            localStorage.removeItem('qns_customer_account')
          } catch (_) {}
          window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: null } }))
        }
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra phiên làm việc:', err)
    } finally {
      setLoading(false)
    }
  }

  // 2. Tải danh sách đơn hàng của tài khoản
  const fetchUserOrders = async () => {
    try {
      const res = await fetch('/api/auth/my-orders', { credentials: 'include' })
      let data = null
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : null
      } catch (e) {}
      if (data && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders)
      } else {
        setOrders([])
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách đơn hàng:', err)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  useEffect(() => {
    let mounted = true
    if (!user && googleButtonRef.current) {
      setupGoogleSignInButton(googleButtonRef.current, {
        onSuccess: handleGoogleCredential,
        onError: (err) => {
          if (mounted && err) setAuthError(typeof err === 'string' ? err : 'Không thể kết nối Google.')
        },
        text: 'continue_with',
        theme: 'outline',
      }).then((res) => {
        if (mounted && res?.success) {
          setIsGisButtonMounted(true)
        }
      })
    }
    return () => {
      mounted = false
    }
  }, [user])

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
      try {
        localStorage.removeItem('qns_customer_account')
      } catch (_) {}
      setUser(null)
      setVoucher(null)
      setOrders([])
      window.dispatchEvent(new CustomEvent('customer_auth_changed', { detail: { user: null } }))
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

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
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
          <div className="max-w-[480px] mx-auto">
            {/* Form Đăng Nhập / Đăng Ký Trực Tiếp Tối Giản */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-xs"
            >
              {authMode === 'login' && (
                <form onSubmit={handleDirectAuth}>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1A1614] text-center tracking-normal uppercase mb-2">
                    ĐĂNG NHẬP TÀI KHOẢN
                  </h1>
                  <p className="text-xs sm:text-sm text-[#333333] text-center mb-6">
                    Bạn chưa có tài khoản ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register')
                        setAuthError(null)
                      }}
                      className="text-[#1890ff] hover:underline cursor-pointer"
                    >
                      Đăng ký tại đây.
                    </button>
                  </p>

                  {authError && (
                    <div className="p-3 mb-5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                      Email <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                    />
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                      Mật khẩu <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                    />
                  </div>

                  <div className="text-left mb-5">
                    <p className="text-xs sm:text-sm text-[#4A3F38]">
                      Quên mật khẩu?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setAuthError(null)
                          setForgotSent(false)
                        }}
                        className="text-[#1890ff] hover:underline cursor-pointer"
                      >
                        Nhấn vào đây
                      </button>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-3 bg-[#000000] hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm rounded-[2px] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center"
                  >
                    {authSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </form>
              )}

              {authMode === 'register' && (
                <form onSubmit={handleDirectAuth}>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1A1614] text-center tracking-normal uppercase mb-2">
                    ĐĂNG KÝ TÀI KHOẢN
                  </h1>
                  <p className="text-xs sm:text-sm text-[#333333] text-center mb-6">
                    Bạn đã có tài khoản ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setAuthError(null)
                      }}
                      className="text-[#1890ff] hover:underline cursor-pointer"
                    >
                      Đăng nhập tại đây.
                    </button>
                  </p>

                  {authError && (
                    <div className="p-3 mb-5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                      Họ và tên <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      type="text"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="Họ và tên"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                      Email <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                      Mật khẩu <span className="text-[#e53935]">*</span>
                    </label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-3 bg-[#000000] hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm rounded-[2px] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center"
                  >
                    {authSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                  </button>
                </form>
              )}

              {authMode === 'forgot' && (
                <form onSubmit={handleDirectAuth}>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1A1614] text-center tracking-normal uppercase mb-2">
                    QUÊN MẬT KHẨU
                  </h1>
                  <p className="text-xs sm:text-sm text-[#333333] text-center mb-6">
                    Bạn đã nhớ mật khẩu ?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login')
                        setAuthError(null)
                      }}
                      className="text-[#1890ff] hover:underline cursor-pointer"
                    >
                      Đăng nhập tại đây.
                    </button>
                  </p>

                  {authError && (
                    <div className="p-3 mb-5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {forgotSent ? (
                    <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[2px] text-xs text-[#166534] mb-6 leading-relaxed">
                      <p className="font-semibold mb-1">Đã tiếp nhận yêu cầu!</p>
                      <p>Vui lòng kiểm tra email của bạn để nhận hướng dẫn khôi phục mật khẩu, hoặc liên hệ Hotline/Zalo: <strong>0867 021 006</strong> để được hỗ trợ tức thì.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <label className="block text-xs sm:text-sm text-[#1A1614] mb-1.5 font-medium">
                          Email <span className="text-[#e53935]">*</span>
                        </label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="Nhập email của bạn"
                          required
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d9d9d9] rounded-[2px] focus:outline-none focus:border-[#1A1614] transition-colors placeholder:text-[#999999]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authSubmitting}
                        className="w-full py-3 bg-[#000000] hover:bg-neutral-800 text-white font-medium text-xs sm:text-sm rounded-[2px] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center"
                      >
                        {authSubmitting ? 'Đang gửi yêu cầu...' : 'Lấy lại mật khẩu'}
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Quick Google Sign In */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8DFD5]" />
                </div>
                <span className="relative bg-white px-3 text-[11px] uppercase tracking-wider text-[#8C7E74]">
                  Hoặc
                </span>
              </div>

              <div className="w-full flex justify-center items-center min-h-[44px]">
                <div
                  ref={googleButtonRef}
                  className={isGisButtonMounted ? 'w-full flex justify-center' : 'hidden'}
                />
                {!isGisButtonMounted && (
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    disabled={authSubmitting}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#E8DFD5] bg-[#FAF8F5] hover:bg-white text-[#2C201A] rounded-[2px] text-xs font-medium transition-all shadow-2xs cursor-pointer group disabled:opacity-70 active:scale-[0.99]"
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
                      {authSubmitting ? 'Đang kết nối Google...' : 'Tiếp tục sử dụng dịch vụ bằng Google'}
                    </span>
                  </button>
                )}
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
                <div className="w-14 h-14 rounded-full bg-[#631521] text-[#D4AF37] flex items-center justify-center font-serif text-xl font-bold border-2 border-[#D4AF37]/50 shadow-sm shrink-0 overflow-hidden relative">
                  {(user.avatarUrl || user.avatar_url) ? (
                    <img
                      src={user.avatarUrl || user.avatar_url}
                      alt={user.fullName || 'Thành viên'}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.parentElement) {
                          const fb = e.currentTarget.parentElement.querySelector('.profile-avatar-fallback')
                          if (fb) fb.classList.remove('hidden')
                        }
                      }}
                    />
                  ) : null}
                  <span className={`profile-avatar-fallback ${(user.avatarUrl || user.avatar_url) ? 'hidden' : 'flex items-center justify-center'}`}>
                    {(user.fullName || 'Q')[0].toUpperCase()}
                  </span>
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
            <div className="flex border-b border-[#E8DFD5] gap-6 sm:gap-8 text-xs font-bold uppercase tracking-wider overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('loyalty')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'loyalty'
                    ? 'border-[#631521] text-[#631521]'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Crown className="w-4 h-4 text-[#D4AF37]" />
                <span>Ưu Đãi Hội Viên</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'vouchers'
                    ? 'border-[#631521] text-[#631521]'
                    : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Voucher Chào Mừng</span>
                {voucher && !voucher.used && (
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
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
                className={`pb-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
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
              {/* TAB 0: LOYALTY */}
              {activeTab === 'loyalty' && (
                <div className="space-y-6">
                  <LoyaltyMemberCard
                    customerPhone={user?.phone || ''}
                    onRefresh={fetchUserOrders}
                  />
                </div>
              )}

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
                                : ord.paymentStatus === 'CUSTOMER_CLAIMED_PAID' || ord.payment?.status === 'CUSTOMER_CLAIMED_PAID'
                                ? 'Đã báo CK — chờ đối soát'
                                : ord.paymentStatus === 'EXPIRED_TIMEOUT' || ord.payment?.status === 'EXPIRED_TIMEOUT'
                                ? 'Hết hạn thanh toán'
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

      {/* Footer */}
      <Section12Footer />
    </div>
  )
}
