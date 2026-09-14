import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Gift,
  ShieldCheck,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

const DISMISSED_KEY = 'qns_account_prompt_dismissed_at'
const VOUCHER_KEY = 'qns_active_voucher'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export default function AccountPromptBanner() {
  const [visible, setVisible] = useState(false)
  const [config, setConfig] = useState({
    googleEnabled: false,
    googleClientId: null,
    facebookEnabled: false,
    facebookAppId: null,
    phoneEnabled: false,
  })

  // Modal / Step State:
  // null = default banner (chọn Google hoặc Facebook)
  // 'VERIFY_CODE' = form nhập mã xác minh 6 số gửi về email
  // 'SUCCESS' = màn hình chúc mừng nhận voucher
  const [step, setStep] = useState(null)

  // Form states
  const [code, setCode] = useState('')
  const [targetDisplay, setTargetDisplay] = useState('')
  const [rawTarget, setRawTarget] = useState('')
  const [targetType, setTargetType] = useState('email')
  const [provider, setProvider] = useState('google')
  const [providerSub, setProviderSub] = useState(null)
  const [fullName, setFullName] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [voucher, setVoucher] = useState(null)
  const [copied, setCopied] = useState(false)

  const countdownTimerRef = useRef(null)

  // Start 60s resend countdown
  const startCountdown = (sec = 60) => {
    setCountdown(sec)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  // Lắng nghe sự kiện mở modal đăng nhập từ các nút trên toàn trang web
  useEffect(() => {
    const handleOpenPrompt = () => {
      setVisible(true)
      setStep(null)
      setError(null)
    }
    window.addEventListener('customer_account_prompt', handleOpenPrompt)
    return () => window.removeEventListener('customer_account_prompt', handleOpenPrompt)
  }, [])

  // Kiểm tra điều kiện hiển thị banner
  useEffect(() => {
    // 1. Kiểm tra session hiện tại qua server endpoint /api/auth/me
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.account?.verified) {
          // Khách đã đăng nhập -> KHÔNG hiển thị banner
          return
        }

        // 2. Tải cấu hình OAuth từ server
        fetch('/api/auth/config')
          .then((r) => r.json())
          .then((cfg) => {
            if (cfg && cfg.success) {
              setConfig(cfg)
              if (cfg.facebookAppId) {
                window._fbAppId = cfg.facebookAppId
                if (window.FB && typeof window.FB.init === 'function') {
                  try {
                    window.FB.init({ appId: cfg.facebookAppId, cookie: true, xfbml: false, version: 'v19.0' })
                  } catch {}
                }
              }
              if (cfg.googleClientId && window.google?.accounts?.id) {
                window.google.accounts.id.initialize({
                  client_id: cfg.googleClientId,
                  callback: handleGoogleCredentialResponse,
                })
              }
            }
          })
          .catch(() => {})

        // 3. Nếu khách đã đóng trong vòng 7 ngày qua -> KHÔNG tự động hiển thị popup
        try {
          const dismissedAt = localStorage.getItem(DISMISSED_KEY)
          if (dismissedAt) {
            const timePassed = Date.now() - parseInt(dismissedAt, 10)
            if (timePassed < SEVEN_DAYS_MS) return
          }
        } catch {
          // ignore
        }

        // 4. Xuất hiện nhẹ nhàng sau 2.5 giây (Quiet Luxury)
        const timer = setTimeout(() => {
          setVisible(true)
        }, 2500)

        return () => clearTimeout(timer)
      })
      .catch(() => {})
  }, [])

  // Xử lý khi khách bấm nút đóng (X) hoặc "Để sau"
  const handleDismiss = () => {
    setVisible(false)
    setStep(null)
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    } catch {
      // ignore
    }
  }

  // ── Callback nhận credential từ Google Identity Services ──────
  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setError('Không nhận được thông tin xác thực từ Google')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Lỗi xác thực Google')

      setTargetDisplay(data.target || '')
      setRawTarget(data.rawTarget || '')
      setTargetType('email')
      setProvider('google')
      setProviderSub(data.providerSub || null)
      setFullName(data.fullName || '')
      startCountdown(data.cooldownSeconds || 60)
      setStep('VERIFY_CODE')
    } catch (err) {
      setError(err.message || 'Lỗi đăng nhập Google')
    } finally {
      setLoading(false)
    }
  }

  // ── Xử lý đăng nhập Google ───────────────────────────────────
  const handleGoogleClick = async () => {
    if (!config.googleEnabled) {
      setError('Tính năng đăng nhập Google đang chờ cấu hình GOOGLE_CLIENT_ID trên máy chủ.')
      return
    }

    if (window.google?.accounts?.id && config.googleClientId) {
      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredentialResponse,
      })
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError('Cửa sổ đăng nhập Google bị chặn trên trình duyệt. Vui lòng cho phép popup để tiếp tục.')
        }
      })
    } else {
      setError('Google Identity Services chưa sẵn sàng. Vui lòng thử lại sau.')
    }
  }

  // ── Xử lý đăng nhập Facebook ─────────────────────────────────
  const handleFacebookClick = async () => {
    if (!config.facebookEnabled) {
      setError('Tính năng đăng nhập Facebook đang chờ cấu hình FACEBOOK_APP_ID trên máy chủ.')
      return
    }

    if (window.FB && config.facebookAppId) {
      try {
        window.FB.init({ appId: config.facebookAppId, cookie: true, xfbml: false, version: 'v19.0' })
      } catch {}
    }

    if (window.FB) {
      window.FB.login(
        (response) => {
          if (response.authResponse?.accessToken) {
            setLoading(true)
            setError(null)
            fetch('/api/auth/facebook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: response.authResponse.accessToken }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (!data.success) throw new Error(data.error || 'Lỗi xác thực Facebook')
                setTargetDisplay(data.target || '')
                setRawTarget(data.rawTarget || '')
                setTargetType('email')
                setProvider('facebook')
                setProviderSub(data.providerSub || null)
                setFullName(data.fullName || '')
                startCountdown(data.cooldownSeconds || 60)
                setStep('VERIFY_CODE')
              })
              .catch((err) => setError(err.message || 'Lỗi đăng nhập Facebook'))
              .finally(() => setLoading(false))
          } else {
            setError('Đăng nhập Facebook đã bị hủy hoặc chưa hoàn tất.')
          }
        },
        { scope: 'public_profile,email' }
      )
    } else {
      setError('Facebook SDK chưa sẵn sàng. Vui lòng thử đăng nhập bằng Google.')
    }
  }

  // ── Xử lý kiểm tra Mã xác minh 6 số ──────────────────────────
  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const cleanCode = code.trim()

    if (!cleanCode || cleanCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số của mã xác minh')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Gửi và nhận session cookie HttpOnly
        body: JSON.stringify({
          target: rawTarget,
          code: cleanCode,
          marketingOptIn,
          provider,
          providerSub,
          fullName,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Mã xác minh không chính xác')
      }

      // Lưu voucher hiển thị tạm thời
      if (data.voucher) {
        localStorage.setItem(VOUCHER_KEY, JSON.stringify(data.voucher))
        setVoucher(data.voucher)
      }

      // Phát sự kiện toàn hệ thống để cập nhật Header, trang tài khoản & giỏ hàng
      window.dispatchEvent(new Event('customer_account_updated'))

      setStep('SUCCESS')
    } catch (err) {
      setError(err.message || 'Lỗi xác minh mã')
    } finally {
      setLoading(false)
    }
  }

  // ── Gửi lại mã xác minh ──────────────────────────────────────
  const handleResend = async () => {
    if (!rawTarget || countdown > 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: rawTarget }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể gửi lại mã')

      startCountdown(data.cooldownSeconds || 60)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Sao chép mã voucher
  const handleCopyVoucher = () => {
    if (!voucher?.code) return
    navigator.clipboard.writeText(voucher.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-50 max-w-sm sm:max-w-md w-full pointer-events-auto"
        aria-label="Thông báo ưu đãi tạo tài khoản"
        role="dialog"
        aria-modal="false"
      >
        <div className="bg-[#FAF8F5] text-[#1A1614] rounded-[4px] border border-[#D4AF37]/60 shadow-[0_12px_40px_rgba(99,21,33,0.18)] overflow-hidden font-sans relative">
          {/* Dải vàng sang trọng đỉnh card */}
          <div className="h-1 bg-gradient-to-r from-[#631521] via-[#D4AF37] to-[#631521]" />

          {/* Nút đóng (X) */}
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full text-[#8C7E74] hover:text-[#631521] hover:bg-[#F5EFE6] transition-colors cursor-pointer z-10"
            aria-label="Đóng thông báo"
            title="Đóng thông báo (không hiện lại trong 7 ngày)"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── BƯỚC 1: BANNER MẶC ĐỊNH (GOOGLE & FACEBOOK OAUTH) ───── */}
          {step === null && (
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#631521] text-[#D4AF37] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Gift className="w-5 h-5" />
                </div>

                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-[#631521] uppercase font-mono">
                    <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                    Đặc quyền thành viên
                  </div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1614] leading-snug mt-0.5">
                    Đăng nhập tài khoản QuanNguyenS
                  </h3>
                  <p className="text-xs text-[#4A3F38] mt-1 leading-relaxed">
                    Nhận ngay ưu đãi <strong className="text-[#631521] font-semibold">giảm 10%</strong> + <strong className="text-[#631521] font-semibold">Miễn phí vận chuyển</strong> cho đơn đủ điều kiện đầu tiên.
                  </p>
                </div>
              </div>

              {/* Thông báo lỗi nếu có */}
              {error && (
                <div className="mt-3 p-2 bg-[#631521]/10 text-[#631521] text-xs rounded-[2px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Lựa chọn phương thức đăng nhập duy nhất Google & Facebook */}
              <div className="mt-4 pt-3.5 border-t border-[#E8DFD5] space-y-2.5">
                {/* Nút Google */}
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading || !config.googleEnabled}
                  title={!config.googleEnabled ? 'Google OAuth đang chờ cấu hình GOOGLE_CLIENT_ID' : 'Đăng nhập với Google'}
                  className={`w-full flex items-center justify-center gap-3 border py-2.5 px-4 rounded-[2px] text-xs font-semibold tracking-wide transition-all ${
                    config.googleEnabled && !loading
                      ? 'border-[#D8D2C9] bg-white text-[#1A1614] hover:bg-[#FAF8F5] hover:border-[#631521] shadow-xs cursor-pointer'
                      : 'border-[#E8DFD5] bg-[#F5EFE6]/60 text-[#8C7E74] opacity-75 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </button>

                {/* Nút Facebook */}
                <button
                  type="button"
                  onClick={handleFacebookClick}
                  disabled={loading || !config.facebookEnabled}
                  title={!config.facebookEnabled ? 'Facebook Login đang chờ cấu hình FACEBOOK_APP_ID' : 'Đăng nhập với Facebook'}
                  className={`w-full flex items-center justify-center gap-3 border py-2.5 px-4 rounded-[2px] text-xs font-semibold tracking-wide transition-all ${
                    config.facebookEnabled && !loading
                      ? 'border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#166FE5] shadow-xs cursor-pointer'
                      : 'border-[#E8DFD5] bg-[#F5EFE6]/60 text-[#8C7E74] opacity-75 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0 fill-white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Tiếp tục với Facebook</span>
                </button>

                <p className="text-[11px] text-[#8C7E74] text-center pt-1 leading-snug">
                  Chỉ áp dụng xác thực bảo mật qua tài khoản Google hoặc Facebook. Mã 6 số sẽ được gửi về hộp thư email của bạn.
                </p>

                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="text-[11px] text-[#8C7E74] hover:text-[#631521] hover:underline cursor-pointer"
                  >
                    Để sau, tiếp tục xem sản phẩm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── BƯỚC 2: NHẬP MÃ XÁC MINH 6 SỐ ────────────────────── */}
          {step === 'VERIFY_CODE' && (
            <div className="p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5] mb-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#631521]" />
                  <h4 className="font-serif text-base font-bold text-[#1A1614]">
                    Xác thực mã 6 số
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setError(null)
                    setStep(null)
                  }}
                  className="text-xs text-[#8C7E74] hover:text-[#631521] cursor-pointer"
                >
                  Đổi phương thức
                </button>
              </div>

              <p className="text-xs text-[#4A3F38] mb-2 leading-relaxed">
                Mã xác minh bảo mật đã được gửi tới <strong>{targetDisplay}</strong>. Vui lòng kiểm tra hộp thư email (cả mục Spam/Thư rác) và nhập mã để kích hoạt tài khoản:
              </p>

              <form onSubmit={handleVerifySubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD5] rounded-[2px] text-center font-mono text-xl font-bold tracking-[6px] text-[#631521] focus:outline-none focus:border-[#631521]"
                  />
                </div>

                {/* Checkbox Marketing Opt-In riêng biệt (mặc định unchecked) */}
                <label className="flex items-start gap-2.5 pt-1 text-[11px] text-[#4A3F38] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521] accent-[#631521]"
                  />
                  <span>
                    Tôi đồng ý nhận email về sản phẩm mới, livestream và ưu đãi của QuanNguyenS.
                  </span>
                </label>

                {error && (
                  <p className="text-xs text-[#631521] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-[#631521] hover:bg-[#4A0D17] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>ĐANG XÁC THỰC...</span>
                    </>
                  ) : (
                    <span>XÁC MINH & NHẬN VOUCHER</span>
                  )}
                </button>

                <div className="flex justify-between items-center text-[11px] text-[#8C7E74] pt-1">
                  <span>Hiệu lực 10 phút</span>
                  {countdown > 0 ? (
                    <span className="text-[#8C7E74]">Gửi lại sau ({countdown}s)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-[#631521] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gửi lại mã</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ── BƯỚC 3: THÀNH CÔNG & HIỂN THỊ VOUCHER ─────────────── */}
          {step === 'SUCCESS' && (
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#2E7D32] text-white flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <h4 className="font-serif text-lg font-bold text-[#1A1614]">
                Tài Khoản Đã Kích Hoạt!
              </h4>
              <p className="text-xs text-[#4A3F38] mt-1 mb-3.5 leading-relaxed">
                Chào mừng bạn đến với <strong>QuanNguyenS</strong>. Dưới đây là mã ưu đãi độc quyền dành cho đơn hàng đủ điều kiện đầu tiên của bạn:
              </p>

              {/* Voucher Box */}
              <div className="p-3.5 bg-gradient-to-br from-[#FFFDF9] to-[#FAF2E8] border-2 border-[#D4AF37] rounded-[3px] shadow-sm mb-4">
                <div className="text-[10px] font-bold tracking-[0.2em] text-[#631521] uppercase font-mono mb-1">
                  VOUCHER CHÀO MỪNG
                </div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-[#631521] tracking-wider my-1 select-all">
                  {voucher?.code || 'WELCOME-QNS'}
                </div>
                <div className="text-xs font-semibold text-[#2E7D32] mt-0.5">
                  ✓ Giảm 10% đơn hàng · Miễn phí vận chuyển
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyVoucher}
                  className="flex items-center justify-center gap-1.5 border border-[#631521] text-[#631521] hover:bg-[#631521] hover:text-white text-xs font-bold py-2.5 px-3 rounded-[2px] transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>ĐÃ SAO CHÉP!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>SAO CHÉP MÃ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="bg-[#631521] hover:bg-[#4A0D17] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider py-2.5 px-3 rounded-[2px] transition-colors cursor-pointer"
                >
                  MUA SẮM NGAY
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
