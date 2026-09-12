import { useState, useEffect } from 'react'
import { Check, Loader2, Gift, Sparkles } from 'lucide-react'

export default function VoucherInput({ onApply, currentSubtotal = 0, accountId = null }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState(null) // 'success' | 'error' | null
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedVoucher, setSuggestedVoucher] = useState(null)

  // Kiểm tra voucher chào mừng đã lưu trong máy của khách
  useEffect(() => {
    try {
      const savedVoucher = JSON.parse(localStorage.getItem('qns_active_voucher') || 'null')
      if (savedVoucher && savedVoucher.code && !savedVoucher.used) {
        setSuggestedVoucher(savedVoucher)
      }
    } catch {
      // ignore
    }

    const handleAccountUpdate = () => {
      try {
        const savedVoucher = JSON.parse(localStorage.getItem('qns_active_voucher') || 'null')
        if (savedVoucher && savedVoucher.code && !savedVoucher.used) {
          setSuggestedVoucher(savedVoucher)
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('customer_account_updated', handleAccountUpdate)
    return () => window.removeEventListener('customer_account_updated', handleAccountUpdate)
  }, [])

  const handleApply = async (codeToApply) => {
    const targetCode = (codeToApply || code).trim()
    if (!targetCode) return

    setLoading(true)
    setStatus(null)
    setMessage('')

    try {
      const q = new URLSearchParams({
        code: targetCode,
        ...(accountId && { accountId }),
        subtotal: String(currentSubtotal || 0),
      })

      const res = await fetch(`/api/vouchers/validate?${q}`)
      const data = await res.json()

      if (data.isValid && data.voucher) {
        setStatus('success')
        const benefitsText = data.voucher.freeShipping
          ? `giảm ${data.voucher.discountPercent}% + Miễn phí vận chuyển`
          : `giảm ${data.voucher.discountPercent}%`
        setMessage(`Mã ${data.voucher.code} (${benefitsText}) đã được áp dụng thành công!`)
        onApply?.(data.voucher)
      } else {
        setStatus('error')
        setMessage(data.error || 'Mã ưu đãi không hợp lệ hoặc đã được sử dụng')
        onApply?.(null)
      }
    } catch {
      setStatus('error')
      setMessage('Không thể kết nối máy chủ để kiểm tra mã ưu đãi')
      onApply?.(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3.5">
      {/* Gợi ý voucher chào mừng nếu có */}
      {suggestedVoucher && status !== 'success' && (
        <div className="mb-2.5 p-2.5 bg-[#FAF5F0] border border-[#D4AF37]/60 rounded-[3px] flex items-center justify-between flex-wrap gap-2 text-xs text-[#631521]">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span>Mã chào mừng của bạn: <strong className="font-mono">{suggestedVoucher.code}</strong> (-10% + Freeship)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCode(suggestedVoucher.code)
              handleApply(suggestedVoucher.code)
            }}
            className="px-2.5 py-1 bg-[#631521] text-white text-[10.5px] font-bold uppercase tracking-wider rounded-[2px] hover:bg-[#4A0D17] transition-colors cursor-pointer"
          >
            Áp Dụng
          </button>
        </div>
      )}

      {/* Ô nhập mã Voucher */}
      <div className="flex border border-[#E8DFD5] bg-white rounded-[2px] overflow-hidden focus-within:border-[#631521] transition-colors">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setStatus(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Nhập mã ưu đãi (Thử: WELCOME-... hoặc QNS10)"
          className="flex-1 px-3.5 py-2.5 font-sans text-xs bg-transparent text-[#1A1614] placeholder-[#8C7E74] focus:outline-none uppercase"
          aria-label="Mã giảm giá"
        />
        <button
          type="button"
          onClick={() => handleApply()}
          disabled={loading || !code.trim()}
          className="shrink-0 px-4 font-sans text-[0.7rem] uppercase tracking-[0.12em] font-bold text-[#631521] border-l border-[#E8DFD5] bg-[#F5F0EB] hover:bg-[#631521] hover:text-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span>ÁP DỤNG</span>
          )}
        </button>
      </div>

      {status === 'success' && (
        <p className="text-xs font-sans text-[#2E7D32] font-semibold mt-1.5 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
          <span>✓ {message}</span>
        </p>
      )}

      {status === 'error' && (
        <p className="text-xs font-sans text-[#C92A2A] mt-1.5">
          {message}
        </p>
      )}
    </div>
  )
}
