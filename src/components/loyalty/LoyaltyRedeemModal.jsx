import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Gift, AlertCircle, Loader2, CheckCircle2, Copy, Check } from 'lucide-react'

export default function LoyaltyRedeemModal({ isOpen, onClose, member, onSuccess }) {
  const [step, setStep] = useState(1) // 1: Confirm & Send OTP, 2: Enter OTP, 3: Success
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [newVoucher, setNewVoucher] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  if (!isOpen || !member) return null

  const handleClose = () => {
    setStep(1)
    setOtp('')
    setError(null)
    setNewVoucher(null)
    onClose()
  }

  const handleSendOtp = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/loyalty/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: member.phone,
          purpose: 'redeem',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể gửi mã OTP. Vui lòng thử lại.')
        setLoading(false)
        return
      }

      setStep(2)
      setResendCooldown(60)
    } catch (err) {
      setError('Lỗi kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRedeem = async (e) => {
    e?.preventDefault()
    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/loyalty/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: member.phone,
          otp: otp.trim(),
          points: 10,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Quy đổi điểm không thành công.')
        setLoading(false)
        return
      }

      setNewVoucher(data.voucher)
      setStep(3)
      if (onSuccess) onSuccess(data)
    } catch (err) {
      setError('Lỗi kết nối hệ thống.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code) => {
    if (!code) return
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white w-full max-w-md rounded-[4px] border border-[#D4AF37]/50 shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-[#2C201A] text-white p-5 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif text-lg font-bold text-white">Đổi Điểm Thưởng Lấy Voucher</h3>
            </div>
            <p className="text-xs text-white/70">
              Quy đổi 10 điểm thưởng = 1 Voucher 50.000đ (Đơn từ 0đ, hạn 90 ngày)
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-[2px] text-xs text-[#9B1C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF5F0] border border-[#D4AF37]/40 rounded-[2px] space-y-2">
                  <div className="flex justify-between text-xs text-[#4A3F38]">
                    <span>Số dư điểm hiện tại:</span>
                    <strong className="font-serif text-[#631521] text-sm">
                      {member.rewardPoints || 0} điểm
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-[#4A3F38]">
                    <span>Điểm dùng để đổi:</span>
                    <strong className="text-[#631521]">-10 điểm</strong>
                  </div>
                  <div className="border-t border-[#E8DFD5] pt-2 flex justify-between text-xs text-[#4A3F38]">
                    <span>Voucher nhận được:</span>
                    <strong className="text-[#2E7D32] font-serif text-sm">Voucher 50.000đ</strong>
                  </div>
                </div>

                <div className="p-3 bg-white border border-[#E8DFD5] rounded-[2px] text-[11px] text-[#8C7E74] leading-relaxed">
                  🛡 <strong>Bảo mật 2 lớp:</strong> Điểm tích lũy có giá trị thanh toán tiền mặt. Hệ thống sẽ gửi mã OTP đến số điện thoại <strong className="text-[#2C201A] font-mono">{member.phone}</strong> để xác thực bạn chính là chủ sở hữu.
                </div>

                <button
                  type="button"
                  disabled={loading || (member.rewardPoints || 0) < 10}
                  onClick={handleSendOtp}
                  className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Gửi Mã OTP Xác Thực</span>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleConfirmRedeem} className="space-y-4">
                <p className="text-xs text-[#4A3F38] text-center">
                  Nhập mã OTP 6 chữ số gửi tới số <strong className="font-mono">{member.phone}</strong>:
                </p>

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

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 bg-[#631521] hover:bg-[#4A0D17] text-white rounded-[2px] text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác Nhận & Đổi Voucher 50k</span>
                  )}
                </button>

                <div className="flex justify-between items-center text-xs text-[#8C7E74]">
                  <button type="button" onClick={() => setStep(1)} className="hover:text-[#2C201A]">
                    ← Quay lại
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-[#631521] font-semibold hover:underline disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && newVoucher && (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#1A1614]">
                    Đổi Điểm Thành Công!
                  </h4>
                  <p className="text-xs text-[#8C7E74] mt-1">
                    Voucher 50.000đ đã được thêm vào ví ưu đãi của quý khách.
                  </p>
                </div>

                <div className="p-4 bg-[#FAF5F0] border-2 border-dashed border-[#D4AF37] rounded-[2px] flex items-center justify-between">
                  <div className="text-left">
                    <span className="font-mono text-base font-bold text-[#631521]">
                      {newVoucher.code}
                    </span>
                    <span className="block text-[10.5px] text-[#8C7E74]">
                      Giảm 50.000đ · Áp dụng mọi đơn hàng
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(newVoucher.code)}
                    className="px-3 py-1.5 bg-[#631521] text-white text-xs font-semibold rounded-[2px] flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2.5 bg-white border border-[#2C201A] text-[#2C201A] text-xs font-bold uppercase tracking-wider rounded-[2px] hover:bg-[#FAF8F5]"
                >
                  Đóng & Sử Dụng Sau
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
