import { useState, useEffect } from 'react'
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

  const hasPreOrder = items?.some(
    (i) => i.preOrder?.enabled || i.isPreOrder || i.slug === 'the-classic-set' || i.productId === 'the-classic-set'
  )

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
    <div className="bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] overflow-hidden shadow-sm">
      <FreeShippingBar
        progress={freeShippingProgress}
        remaining={remainingForFreeShipping}
      />

      <div className="p-5 sm:p-6 space-y-3.5">
        <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-3">
          TỔNG ĐƠN HÀNG
        </span>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-light">Tạm tính</span>
          <span className="font-bold text-[#1A1614]">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-light">Phí vận chuyển</span>
          <span className={effectiveShippingFee === 0 ? 'text-[#631521] font-bold' : 'font-bold text-[#1A1614]'}>
            {effectiveShippingFee === 0 ? 'Miễn phí' : formatPrice(effectiveShippingFee)}
          </span>
        </div>

        {effectiveDiscount > 0 && (
          <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
            <span className="font-light">Giảm giá ưu đãi {appliedVoucher ? `(${appliedVoucher.code})` : ''}</span>
            <span className="text-[#631521] font-bold">−{formatPrice(effectiveDiscount)}</span>
          </div>
        )}

        <div className="border-t border-[#E8DFD5] pt-3.5 flex justify-between items-baseline">
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
            className="w-full mt-3 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200"
          >
            Tiến Hành Thanh Toán
          </button>
        )}

        {/* Payment icons */}
        <div className="flex items-center justify-center gap-2 pt-3 flex-wrap border-t border-[#E8DFD5]">
          {['COD', 'VietQR (-10%)'].map((pm) => (
            <span
              key={pm}
              className="font-sans text-[0.65rem] font-bold tracking-wider text-[#4A3F38] border border-[#E8DFD5] bg-white px-2 py-1 rounded-[2px]"
            >
              {pm}
            </span>
          ))}
        </div>

        <div className="space-y-1.5 text-xs font-sans text-[#8C7E74] pt-1">
          {hasPreOrder ? (
            <p className="flex items-center gap-1.5 text-[#631521] font-semibold bg-[#FAF5F0] p-2 rounded-[2px] border border-[#D4AF37]/50">
              ⏱ Đơn có SP Đặt Trước: Giao trong 7–10 ngày làm việc
            </p>
          ) : (
            <p className="flex items-center gap-1.5">📦 Giao hàng toàn quốc 2–4 ngày làm việc</p>
          )}
          <p className="flex items-center gap-1.5">🔄 Đổi trả miễn phí trong 30 ngày tận nhà</p>
        </div>
      </div>
    </div>
  )
}
