import { useState } from 'react'
import FreeShippingBar from './FreeShippingBar'
import VoucherInput from './VoucherInput'
import { useCart } from '../../hooks/useCart'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CartSummary({
  subtotal,
  shippingFee,
  freeShippingProgress,
  remainingForFreeShipping,
  discount: propDiscount,
  onCheckout,
  showVoucher = true,
  onApplyVoucher,
  isDrawer = false,
}) {
  const { items } = useCart()
  const [appliedVoucher, setAppliedVoucher] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('qns_active_voucher') || 'null')
      return saved && !saved.used ? saved : null
    } catch {
      return null
    }
  })

  const voucherDiscount = appliedVoucher
    ? Math.round((subtotal * Number(appliedVoucher.discountPercent || 10)) / 100)
    : 0

  const effectiveDiscount = propDiscount !== undefined ? propDiscount : voucherDiscount
  const effectiveShippingFee = appliedVoucher?.freeShipping ? 0 : shippingFee
  const total = Math.max(0, subtotal + effectiveShippingFee - effectiveDiscount)

  const handleVoucherApply = (voucher) => {
    setAppliedVoucher(voucher)
    if (voucher) {
      try {
        localStorage.setItem('qns_active_voucher', JSON.stringify(voucher))
      } catch {}
    } else {
      try {
        localStorage.removeItem('qns_active_voucher')
      } catch {}
    }
    onApplyVoucher?.(voucher)
  }

  return (
    <div className={isDrawer ? 'bg-[#FAF8F5]' : 'bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] overflow-hidden shadow-sm'}>
      <FreeShippingBar
        progress={freeShippingProgress}
        remaining={remainingForFreeShipping}
      />

      <div className={isDrawer ? 'p-4 sm:p-5 space-y-2.5' : 'p-5 sm:p-6 space-y-3.5'}>
        <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
          TỔNG ĐƠN HÀNG
        </span>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-normal">Tạm tính</span>
          <span className="font-bold text-[#1A1614]">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-normal">Phí vận chuyển</span>
          <span className={effectiveShippingFee === 0 ? 'text-[#631521] font-bold' : 'font-bold text-[#1A1614]'}>
            {effectiveShippingFee === 0 ? 'Miễn phí' : formatPrice(effectiveShippingFee)}
          </span>
        </div>

        {effectiveDiscount > 0 && (
          <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
            <span className="font-normal">Giảm giá ưu đãi {appliedVoucher ? `(${appliedVoucher.code})` : ''}</span>
            <span className="text-[#631521] font-bold">−{formatPrice(effectiveDiscount)}</span>
          </div>
        )}

        <div className="border-t border-[#E8DFD5] pt-3 flex justify-between items-baseline">
          <span className="font-sans font-bold text-sm uppercase tracking-wider text-[#1A1614]">
            Tổng Cộng
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#631521]">
            {formatPrice(total)}
          </span>
        </div>

        {showVoucher && (
          <VoucherInput
            onApply={handleVoucherApply}
            currentSubtotal={subtotal}
          />
        )}

        {onCheckout && (
          <button
            onClick={onCheckout}
            className="w-full mt-2.5 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 sm:py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer"
          >
            Tiến Hành Thanh Toán
          </button>
        )}
      </div>
    </div>
  )
}
