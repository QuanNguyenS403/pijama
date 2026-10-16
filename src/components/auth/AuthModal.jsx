import React, { useState, useEffect, useRef } from 'react'
import { X, Lock, Mail, User, Eye, EyeOff, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiPost, setAccessToken } from '../../lib/apiClient'
import { loginWithGoogle } from '../../lib/googleAuth'

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
      setPassword('')
    }
  }, [isOpen])

  const handleGoogleCredential = async (payload) => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const cred = typeof payload === 'string' ? payload : payload?.credential
      if (!cred) {
        throw new Error('Không nhận được thông tin xác thực Google.')
      }
      const body = {
        credential: cred,
        ...(typeof payload === 'object' ? payload : {}),
      }
      const res = await apiPost('/api/auth/google', body)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Đăng nhập Google không thành công')
      }
      if (data.accessToken) {
        setAccessToken(data.accessToken)
      }
      setSuccessMsg('Đăng nhập Google thành công! Đang chuyển hướng...')
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(data.account || data.user)
        onClose()
      }, 800)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleClick = async () => {
    setErrorMsg('')
    await loginWithGoogle({
      onSuccess: handleGoogleCredential,
      onError: (err) => setErrorMsg(err),
      onFallbackNeeded: () => {
        if (email.trim()) {
          handleGoogleCredential({ email: email.trim(), fullName: fullName.trim() || 'Quý khách Google' })
        } else {
          setErrorMsg('Vui lòng nhập email của bạn vào ô trên để tiếp tục đăng nhập.')
        }
      },
    })
  }

  if (!isOpen) return null

  // Đánh giá độ mạnh mật khẩu
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: 'bg-neutral-200' }
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Za-z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++

    if (score <= 2) return { score, text: 'Mật khẩu yếu', color: 'bg-amber-500' }
    if (score === 3) return { score, text: 'Mật khẩu trung bình', color: 'bg-blue-500' }
    return { score, text: 'Mật khẩu mạnh & bảo mật', color: 'bg-emerald-600' }
  }

  const strength = getPasswordStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setIsLoading(true)

    try {
      if (activeTab === 'login') {
        const res = await apiPost('/api/auth/login', { email, password })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Đăng nhập không thành công')
        }

        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }

        setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...')
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(data.user)
          onClose()
        }, 800)
      } else {
        // Đăng ký
        const res = await apiPost('/api/auth/register', {
          email,
          password,
          fullName,
          marketingOptIn,
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Đăng ký không thành công')
        }

        if (data.accessToken) {
          setAccessToken(data.accessToken)
        }

        setSuccessMsg('Đăng ký thành công! Đã gửi mã chào mừng WELCOME10.')
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(data.user)
          onClose()
        }, 1000)
      }
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md bg-[#FAF8F5] text-[#2C201A] rounded-2xl shadow-2xl border border-[#D4AF37]/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với thương hiệu */}
        <div className="bg-[#2C201A] text-white px-6 pt-7 pb-6 relative text-center border-b border-[#D4AF37]/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white rounded-full transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[10px] tracking-[0.3em] font-medium uppercase text-[#D4AF37]">
            QUANNGUYENS CASUAL LUXURY
          </span>
          <h3 className="font-serif text-2xl font-light tracking-wide mt-1 text-[#FAF8F5]">
            {activeTab === 'login' ? 'Đăng Nhập Thành Viên' : 'Gia Nhập Đặc Quyền'}
          </h3>
          <p className="text-xs text-white/70 mt-1">
            {activeTab === 'login'
              ? 'Truy cập tài khoản & ưu đãi riêng biệt'
              : 'Nhận ngay Voucher WELCOME10 giảm 10% + Freeship'}
          </p>

          {/* Tab selector */}
          <div className="flex border-b border-white/10 mt-5 -mb-6">
            <button
              onClick={() => {
                setActiveTab('login')
                setErrorMsg('')
              }}
              className={`flex-1 py-3 text-xs tracking-wider uppercase font-medium transition-colors border-b-2 ${
                activeTab === 'login'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              onClick={() => {
                setActiveTab('register')
                setErrorMsg('')
              }}
              className={`flex-1 py-3 text-xs tracking-wider uppercase font-medium transition-colors border-b-2 ${
                activeTab === 'register'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              Đăng Ký
            </button>
          </div>
        </div>

        {/* Nội dung Form */}
        <div className="p-6 pt-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#631521] focus:ring-1 focus:ring-[#631521]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#631521] focus:ring-1 focus:ring-[#631521]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  Mật khẩu
                </label>
                {activeTab === 'login' && (
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Vui lòng liên hệ hotline 0981 753 082 hoặc đăng nhập bằng tài khoản Google đã liên kết.')
                    }}
                    className="text-[11px] text-[#631521] hover:underline"
                  >
                    Quên mật khẩu?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={activeTab === 'register' ? 'Tối thiểu 8 ký tự (chữ & số)' : '••••••••'}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#631521] focus:ring-1 focus:ring-[#631521]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Báo độ mạnh mật khẩu khi đăng ký */}
              {activeTab === 'register' && password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${Math.min(100, strength.score * 25)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500">{strength.text}</span>
                </div>
              )}
            </div>

            {activeTab === 'register' && (
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-[#631521] focus:ring-[#631521]"
                />
                <span className="text-xs text-neutral-600 leading-relaxed">
                  Đồng ý nhận email thông tin bộ sưu tập mới & mã giảm giá đặc quyền từ QuanNguyenS.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#631521] hover:bg-[#7b1b2a] text-white font-medium text-sm tracking-wider uppercase rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : activeTab === 'login' ? (
                'Đăng Nhập Ngay'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>Hoàn Tất Đăng Ký</span>
                </>
              )}
            </button>
          </form>

          {/* Dấu gạch chia OAuth */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300"></div>
            </div>
            <span className="relative px-3 bg-[#FAF8F5] text-xs uppercase tracking-wider text-neutral-400">
              Hoặc tiếp tục với
            </span>
          </div>

          {/* Nút liên kết Google chính thức qua GIS */}
          <div className="w-full flex justify-center min-h-[42px]">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium border border-neutral-300 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Đăng nhập nhanh với Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
