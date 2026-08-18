import { useState } from 'react'

export default function VoucherInput({ onApply }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState(null)

  const handleApply = () => {
    if (!code.trim()) return
    // Demo voucher: QNS10
    if (code.trim().toUpperCase() === 'QNS10') {
      setStatus('success')
      onApply?.({ code: 'QNS10', discount: 10 })
    } else {
      setStatus('error')
    }
  }

  return (
    <div className="mt-3">
      <div className="flex border border-[#E8DFD5] bg-white rounded-[2px] overflow-hidden focus-within:border-[#631521]">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setStatus(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Nhập mã ưu đãi (Thử: QNS10)"
          className="flex-1 px-3.5 py-2.5 font-sans text-xs bg-transparent text-[#1A1614] placeholder-[#8C7E74] focus:outline-none"
          aria-label="Mã giảm giá"
        />
        <button
          onClick={handleApply}
          className="shrink-0 px-4 font-sans text-[0.7rem] uppercase tracking-[0.12em] font-bold text-[#631521] border-l border-[#E8DFD5] bg-[#F5F0EB] hover:bg-[#631521] hover:text-[#FAF8F5] transition-colors"
        >
          ÁP DỤNG
        </button>
      </div>
      {status === 'success' && (
        <p className="text-xs font-sans text-[#631521] font-bold mt-1.5 flex items-center gap-1">
          ✓ Mã QNS10 giảm 10% đã được áp dụng thành công!
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs font-sans text-[#8C7E74] mt-1.5">
          Mã không hợp lệ. Hãy thử mã <span className="font-bold text-[#631521]">QNS10</span>!
        </p>
      )}
    </div>
  )
}
