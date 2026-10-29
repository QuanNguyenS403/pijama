import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, User, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { TierBadge } from './LoyaltyBadges'

export default function LoyaltyRegisterModal({ isOpen, onClose, onSuccess, initialPhone = '' }) {
  const [mode, setMode] = useState('enroll') // 'enroll' | 'login'
  const [step, setStep] = useState(1) // 1: Thông tin & SĐT, 2: Nhập OTP
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState(initialPhone)
  const [combinedConsent, setCombinedConsent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone)
  }, [initialPhone])

  // Đếm ngược cooldown gửi lại mã OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  if (!isOpen) return null

  const resetForm = () => {
    setStep(1)
    setError(null)
    setOtp('')
    setLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSendOtp = async (e) => {
    e?.preventDefault()
    setError(null)

    const cleanPhone = phone.trim()
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('Vui lòng nhập số điện thoại di động hợp lệ.')
      return
    }

    if (mode === 'enroll') {
      if (!fullName || fullName.trim().length < 2) {
        setError('Vui lòng nhập họ và tên của quý khách.')
        return
      }
    }

    setLoading(true)
    try {
      const purpose = mode === 'enroll' ? 'enrollment' : 'login'
      const res = await fetch('/api/loyalty/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          purpose,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể gửi mã xác thực. Vui lòng thử lại sau.')
        setLoading(false)
        return
      }

      setStep(2)
      setResendCooldown(data.cooldownRemaining || 60)
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền internet.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAuth = async (e) => {
    e?.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ mã xác thực 6 chữ số.')
      return
    }

    if (mode === 'enroll' && !combinedConsent) {
      setError('Vui lòng xác nhận đồng ý với Điều khoản và độ tuổi để tham gia.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'enroll') {
        const res = await fetch('/api/loyalty/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            phone: phone.trim(),
            fullName: fullName.trim(),
            otpCode: cleanOtp,
            consentToTerms: true,
            ageConsent: true,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Đăng ký không thành công. Vui lòng kiểm tra lại mã xác thực.')
          setLoading(false)
          return
        }

        if (onSuccess) onSuccess(data.member)
        handleClose()
      } else {
        // Mode Đăng nhập
        const res = await fetch('/api/loyalty/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            phone: phone.trim(),
            otpCode: cleanOtp,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Đăng nhập không thành công. Mã xác thực có thể đã hết hạn hoặc không đúng.')
          setLoading(false)
          return
        }

        if (onSuccess) onSuccess(data.member)
        handleClose()
      }
    } catch (err) {
      setError('Lỗi kết nối hệ thống. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white w-full max-w-[400px] rounded-[4px] border border-[#D4AF37]/50 shadow-2xl overflow-hidden relative my-auto flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#2C201A] text-white px-5 py-4 relative shrink-0">
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <TierBadge tier="MEMBER" size="sm" />
              <div>
                <span className="text-[9.5px] uppercase font-bold tracking-[0.2em] text-[#D4AF37] block">
                  QuanNguyenS Privileged
                </span>
                <h3 className="font-serif text-base font-bold text-white leading-tight">
                  {mode === 'enroll' ? 'Tham Gia Hội Viên' : 'Đăng Nhập Hội Viên'}
                </h3>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5">
            {error && (
              <div className="mb-4 p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 ? (
              /* BƯỚC 1: NHẬP THÔNG TIN CƠ BẢN */
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                {mode === 'enroll' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                      Họ và tên <span className="text-[#631521]">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#8C7E74] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        autoFocus
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Phương Mai"
                        className="w-full pl-8 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-xs sm:text-sm rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                    Số điện thoại <span className="text-[#631521]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#8C7E74] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full pl-8 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-xs sm:text-sm rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-2 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Gửi Mã Xác Thực</span>
                  )}
                </button>

                <div className="text-center pt-2 border-t border-[#F0EAE1]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'enroll' ? 'login' : 'enroll')
                      setError(null)
                    }}
                    className="text-xs text-[#631521] hover:underline font-semibold cursor-pointer"
                  >
                    {mode === 'enroll'
                      ? 'Đã là hội viên? Đăng nhập ngay'
                      : 'Chưa có tài khoản? Tham gia miễn phí'}
                  </button>
                </div>
              </form>
            ) : (
              /* BƯỚC 2: NHẬP MÃ OTP VÀ XÁC NHẬN */
              <form onSubmit={handleCompleteAuth} className="space-y-4">
                <div className="p-3 bg-[#FAF5F0] border border-[#D4AF37]/50 rounded-[2px] text-xs text-[#4A3F38] text-center">
                  Mã xác thực 6 chữ số đã gửi tới số{' '}
                  <strong className="text-[#631521] font-mono">{phone}</strong>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full py-3 text-center text-2xl font-mono tracking-[0.5em] bg-[#FAF8F5] border-2 border-[#D4AF37] rounded-[2px] focus:bg-white focus:outline-hidden"
                    autoFocus
                  />
                </div>

                {mode === 'enroll' && (
                  <div className="pt-1">
                    <label className="flex items-start gap-2 text-[11px] text-[#4A3F38] cursor-pointer leading-tight">
                      <input
                        type="checkbox"
                        checked={combinedConsent}
                        onChange={(e) => setCombinedConsent(e.target.checked)}
                        className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521] shrink-0"
                      />
                      <span>
                        Tôi đồng ý với{' '}
                        <a
                          href="/chinh-sach?tab=loyalty"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#631521] underline font-semibold"
                        >
                          Điều khoản Hội viên
                        </a>{' '}
                        và xác nhận từ đủ 16 tuổi trở lên. <span className="text-[#631521]">*</span>
                      </span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || (mode === 'enroll' && !combinedConsent)}
                  className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{mode === 'enroll' ? 'Tham Gia Hội Viên' : 'Vào Tài Khoản'}</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setOtp('')
                      setError(null)
                    }}
                    className="text-[#8C7E74] hover:text-[#2C201A] flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Sửa số điện thoại
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-[#631521] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : 'Gửi lại mã OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
