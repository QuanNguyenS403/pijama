import FreeShippingBar from './FreeShippingBar'
import VoucherInput from './VoucherInput'
import { useCart } from '../../hooks/useCart'
import { calculateOrderTotals } from '../../lib/pricingCalculator'

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
  const { appliedVoucher, setAppliedVoucher, deliveryOption, fulfillment } = useCart()

  const totals = calculateOrderTotals({
    subtotal,
    voucher: appliedVoucher,
    isMixedPreOrder: fulfillment.isMixed,
    deliveryOption,
  })

  const effectiveDiscount = propDiscount !== undefined ? propDiscount : totals.voucherDiscount
  const effectiveShippingFee = totals.baseShippingFee + totals.splitShippingFee
  const total = propDiscount !== undefined
    ? Math.max(0, subtotal + effectiveShippingFee - effectiveDiscount)
    : totals.total

  const handleVoucherApply = (voucher) => {
    setAppliedVoucher(voucher || null)
    onApplyVoucher?.(voucher || null)
  }

  return (
    <div className={isDrawer ? 'bg-[#FAF8F5]' : 'bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] overflow-hidden shadow-sm'}>
      <FreeShippingBar
        progress={freeShippingProgress}
        remaining={remainingForFreeShipping}
      />

      <div className={isDrawer ? 'p-4 sm:p-5 space-y-2.5' : 'p-5 sm:p-6 space-y-3.5'}>
        <span className="font-sans text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
          TỔNG ĐƠN HÀNG
        </span>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-normal">Tạm tính</span>
          <span className="font-bold text-[#1A1614]">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
          <span className="font-normal">Phí vận chuyển tiêu chuẩn</span>
          <span className={totals.baseShippingFee === 0 ? 'text-[#631521] font-bold' : 'font-bold text-[#1A1614]'}>
            {totals.baseShippingFee === 0 ? 'Miễn phí' : formatPrice(totals.baseShippingFee)}
          </span>
        </div>
        {totals.splitShippingFee > 0 && (
          <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
            <span className="font-normal">Phụ phí tách giao đợt 2 (Pre-order)</span>
            <span className="font-bold text-[#631521]">+{formatPrice(totals.splitShippingFee)}</span>
          </div>
        )}
        <p className="text-[11px] font-sans text-[#6B5D54] -mt-1.5">
          Miễn phí vận chuyển cho đơn từ 500.000đ (tính theo tạm tính trước giảm giá)
        </p>

        {effectiveDiscount > 0 && (
          <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
            <span className="font-normal flex items-center gap-2">
              <span>Giảm giá ưu đãi {appliedVoucher ? `(${appliedVoucher.code})` : ''}</span>
              {appliedVoucher && (
                <button
                  type="button"
                  onClick={() => handleVoucherApply(null)}
                  className="text-[11px] text-[#8C7E74] underline hover:text-[#631521] cursor-pointer"
                >
                  Hủy mã
                </button>
              )}
            </span>
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
            initialVoucher={appliedVoucher}
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
