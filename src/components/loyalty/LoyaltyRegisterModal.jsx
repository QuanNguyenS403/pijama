import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Phone, CheckCircle2, AlertCircle, Loader2, Sparkles, Gift, Lock } from 'lucide-react'
import { TierBadge } from './LoyaltyBadges'

export default function LoyaltyRegisterModal({ isOpen, onClose, onSuccess, initialPhone = '' }) {
  const [mode, setMode] = useState('enroll') // 'enroll' | 'login'
  const [step, setStep] = useState(1) // 1: Info input, 2: OTP verification
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState(initialPhone)
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [email, setEmail] = useState('')
  const [consentTerms, setConsentTerms] = useState(false)
  const [consentAge, setConsentAge] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone)
  }, [initialPhone])

  // Cooldown countdown
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

    if (!phone || phone.trim().length < 9) {
      setError('Vui lòng nhập số điện thoại hợp lệ.')
      return
    }

    if (mode === 'enroll') {
      if (!fullName || fullName.trim().length < 2) {
        setError('Vui lòng nhập họ và tên của quý khách.')
        return
      }
      if (!consentTerms) {
        setError('Vui lòng đồng ý với Điều khoản Chương trình Hội viên.')
        return
      }
      if (!consentAge) {
        setError('Quý khách vui lòng xác nhận từ đủ 16 tuổi trở lên.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/loyalty/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          purpose: mode === 'enroll' ? 'enroll' : 'login',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể gửi mã OTP. Vui lòng thử lại sau.')
        setLoading(false)
        return
      }

      setStep(2)
      setResendCooldown(60)
    } catch (err) {
      setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    setError(null)

    if (!otp || otp.trim().length !== 6) {
      setError('Vui lòng nhập đầy đủ mã OTP 6 chữ số.')
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
            birthDay: birthDay ? parseInt(birthDay, 10) : null,
            birthMonth: birthMonth ? parseInt(birthMonth, 10) : null,
            email: email ? email.trim() : null,
            consentTerms: true,
            consentAge: true,
            marketingOptIn,
            otp: otp.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Đăng ký không thành công. Vui lòng thử lại.')
          setLoading(false)
          return
        }

        if (onSuccess) onSuccess(data.member)
        handleClose()
      } else {
        // Mode login
        const res = await fetch('/api/loyalty/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            phone: phone.trim(),
            otp: otp.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Đăng nhập không thành công.')
          setLoading(false)
          return
        }

        if (onSuccess) onSuccess(data.member)
        handleClose()
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white w-full max-w-lg rounded-[4px] border border-[#D4AF37]/40 shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-[#2C201A] text-white p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <TierBadge tier="MEMBER" size="md" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D4AF37] block">
                  QuanNguyenS Privileged Club
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                  {mode === 'enroll' ? 'Đăng Ký Hội Viên Thân Thiết' : 'Đăng Nhập Hội Viên'}
                </h3>
              </div>
            </div>
            <p className="text-xs text-white/70 mt-2 font-light leading-relaxed">
              {mode === 'enroll'
                ? 'Tham gia hoàn toàn tự nguyện để tích điểm đơn hàng và nhận đặc quyền giảm giá đến 15%.'
                : 'Nhập số điện thoại đã đăng ký để kiểm tra số dư điểm thưởng và ví voucher.'}
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {mode === 'enroll' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                      Họ và tên <span className="text-[#631521]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Phương Mai"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                    Số điện thoại <span className="text-[#631521]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C7E74] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-[#8C7E74] mt-1">
                    Mã OTP xác thực sẽ gửi tới số điện thoại này. Số điện thoại là chìa khóa tích và dùng điểm.
                  </p>
                </div>

                {mode === 'enroll' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                          Ngày sinh (Tùy chọn)
                        </label>
                        <select
                          value={birthDay}
                          onChange={(e) => setBirthDay(e.target.value)}
                          className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-xs rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden"
                        >
                          <option value="">Ngày</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              Ngày {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                          Tháng sinh (Tùy chọn)
                        </label>
                        <select
                          value={birthMonth}
                          onChange={(e) => setBirthMonth(e.target.value)}
                          className="w-full px-2.5 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-xs rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden"
                        >
                          <option value="">Tháng</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              Tháng {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-[#8C7E74]">
                      🔒 Ngày sinh chỉ thu Ngày & Tháng để tặng voucher sinh nhật và được khóa cố định sau khi đăng ký.
                    </p>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                        Email nhận thông báo (Tùy chọn)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mai.nguyen@example.com"
                        className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:border-[#631521] outline-hidden"
                      />
                    </div>

                    {/* Consents - Explicitly Unchecked */}
                    <div className="space-y-2 pt-2 border-t border-[#E8DFD5]">
                      <label className="flex items-start gap-2.5 text-xs text-[#4A3F38] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentTerms}
                          onChange={(e) => setConsentTerms(e.target.checked)}
                          className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521]"
                        />
                        <span>
                          Tôi đã đọc và đồng ý với{' '}
                          <a
                            href="/chinh-sach?tab=loyalty"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#631521] underline font-semibold"
                          >
                            Điều khoản Chương trình Hội viên
                          </a>{' '}
                          của QuanNguyenS. <span className="text-[#631521]">*</span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 text-xs text-[#4A3F38] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentAge}
                          onChange={(e) => setConsentAge(e.target.checked)}
                          className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521]"
                        />
                        <span>
                          Tôi xác nhận từ <strong>đủ 16 tuổi trở lên</strong>. <span className="text-[#631521]">*</span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 text-xs text-[#4A3F38] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marketingOptIn}
                          onChange={(e) => setMarketingOptIn(e.target.checked)}
                          className="mt-0.5 rounded-[2px] text-[#631521] focus:ring-[#631521]"
                        />
                        <span>Nhận thông tin ưu đãi bộ sưu tập và quà tặng hội viên qua email.</span>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Tiếp Tục & Nhận Mã OTP</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'enroll' ? 'login' : 'enroll')
                      setError(null)
                    }}
                    className="text-xs text-[#631521] hover:underline font-semibold"
                  >
                    {mode === 'enroll'
                      ? 'Đã đăng ký trước đó? Đăng nhập bằng SĐT'
                      : 'Chưa là hội viên? Đăng ký tham gia mới'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: OTP Verification */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-[#FAF5F0] border border-[#D4AF37]/50 rounded-[2px] text-xs text-[#4A3F38] text-center">
                  Mã xác minh 6 chữ số đã được gửi tới số{' '}
                  <strong className="text-[#631521] font-mono">{phone}</strong>.
                  <br />
                  Vui lòng nhập mã để hoàn tất.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5 text-center">
                    Mã xác nhận OTP (6 chữ số)
                  </label>
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

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác Minh & {mode === 'enroll' ? 'Kích Hoạt' : 'Vào Tài Khoản'}</span>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[#8C7E74] hover:text-[#2C201A]"
                  >
                    ← Đổi số điện thoại
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-[#631521] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Gửi lại mã sau (${resendCooldown}s)` : 'Gửi lại mã OTP'}
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
