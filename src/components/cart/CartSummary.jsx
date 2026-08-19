import FreeShippingBar from './FreeShippingBar'
import VoucherInput from './VoucherInput'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CartSummary({ subtotal, shippingFee, freeShippingProgress, remainingForFreeShipping, discount = 0, onCheckout, showVoucher = true }) {
  const total = subtotal + shippingFee - discount

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
          <span className={shippingFee === 0 ? 'text-[#631521] font-bold' : 'font-bold text-[#1A1614]'}>
            {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
          </span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between items-center font-sans text-sm text-[#4A3F38]">
            <span className="font-light">Giảm giá ưu đãi</span>
            <span className="text-[#631521] font-bold">−{formatPrice(discount)}</span>
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

        {showVoucher && <VoucherInput />}

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
          {['COD', 'VietQR (-10%)', 'Vietcombank'].map((pm) => (
            <span
              key={pm}
              className="font-sans text-[0.65rem] font-bold tracking-wider text-[#4A3F38] border border-[#E8DFD5] bg-white px-2 py-1 rounded-[2px]"
            >
              {pm}
            </span>
          ))}
        </div>

        <div className="space-y-1.5 text-xs font-sans text-[#8C7E74] pt-1">
          <p className="flex items-center gap-1.5">📦 Giao hàng toàn quốc 2–4 ngày làm việc</p>
          <p className="flex items-center gap-1.5">🔄 Đổi trả miễn phí trong 30 ngày tận nhà</p>
        </div>
      </div>
    </div>
  )
}
