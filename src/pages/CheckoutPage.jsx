import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Lock, CheckCircle2 } from 'lucide-react'
import Header from '../components/layout/Header'
import CartDrawer from '../components/cart/CartDrawer'
import Section12Footer from '../components/sections/Section12Footer'
import { useCart } from '../hooks/useCart'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CheckoutPage() {
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const { subtotal, shippingFee, items, clearCart } = useCart()
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  const total = subtotal + shippingFee

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    clearCart()
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-md bg-white p-8 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-luxury">
          <div className="w-16 h-16 bg-[#631521] text-[#D4AF37] flex items-center justify-center rounded-full mx-auto mb-6 border border-[#D4AF37]/40 shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <span className="font-serif text-xs font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            ĐẶT HÀNG THÀNH CÔNG
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1A1614] mb-3">
            Cảm Ơn Bạn Đã Chọn QuanNguyenS
          </h1>
          <p className="font-sans text-sm font-light text-[#4A3F38] leading-relaxed mb-8">
            Chúng tôi đã nhận được thông tin đơn hàng và sẽ liên hệ xác nhận trong thời gian sớm nhất — Bộ pijama thủ công cao cấp sẽ được đóng gói quà tặng và giao tới bạn trong 2–4 ngày làm việc
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <title>Thanh Toán — QuanNguyenS European Casual Luxury</title>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />

      <div className="h-16 md:h-20" />

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
        <Link to="/gio-hang" className="inline-flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#631521] hover:underline mb-8">
          <ChevronLeft className="w-4 h-4" /> Quay lại giỏ hàng
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left — Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-sm">
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
              THANH TOÁN ĐƠN HÀNG
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614] mb-8">Thông Tin Giao Hàng</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-first-name">Họ</label>
                  <input id="co-first-name" required placeholder="Nguyễn" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
                </div>
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-last-name">Tên</label>
                  <input id="co-last-name" required placeholder="Văn A" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-phone">Số điện thoại</label>
                <input id="co-phone" type="tel" required placeholder="09xx xxx xxx" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-email">Email nhận hóa đơn</label>
                <input id="co-email" type="email" required placeholder="ban@email.com" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-address">Địa chỉ nhận hàng</label>
                <input id="co-address" required placeholder="Số nhà, tên đường / tòa nhà" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-district">Quận / Huyện</label>
                  <input id="co-district" required placeholder="Hai Bà Trưng" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
                </div>
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="co-city">Tỉnh / Thành phố</label>
                  <input id="co-city" required placeholder="Hà Nội" className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-2">Phương thức thanh toán</label>
                <div className="space-y-2.5">
                  {[
                    { label: 'Thanh toán khi nhận hàng (COD)', sub: 'Kiểm tra hàng trước khi thanh toán' },
                    { label: 'Chuyển khoản ngân hàng (QR Code)', sub: 'Miễn phí chuyển khoản 24/7' },
                    { label: 'Ví điện tử MoMo / VNPAY', sub: 'Thanh toán an toàn qua cổng điện tử' }
                  ].map((m, i) => (
                    <label key={m.label} className="flex items-start gap-3 border border-[#E8DFD5] bg-[#FAF8F5] p-3.5 rounded-[2px] cursor-pointer hover:border-[#631521] transition-colors">
                      <input type="radio" name="payment" value={m.label} defaultChecked={i === 0} className="accent-[#631521] mt-0.5" />
                      <div>
                        <span className="font-sans text-sm font-bold text-[#1A1614] block">{m.label}</span>
                        <span className="font-sans text-xs text-[#8C7E74] font-light">{m.sub}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 flex items-center justify-center gap-2 mt-4"
              >
                <Lock className="w-4 h-4" />
                Hoàn Tất Đặt Hàng
              </button>

              <p className="text-center font-sans text-xs text-[#8C7E74] flex items-center justify-center gap-1.5 pt-2">
                🔒 Thông tin được bảo mật và mã hoá SSL tiêu chuẩn quốc tế
              </p>
            </form>
          </div>

          {/* Right — Order summary (5 cols) */}
          <div className="lg:col-span-5 border border-[#E8DFD5] bg-white p-6 sm:p-8 rounded-[4px] shadow-sm sticky top-24">
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
              ĐƠN HÀNG CỦA BẠN
            </span>
            <p className="font-sans text-xs text-[#8C7E74] mb-5">
              {items.length} mẫu thiết kế
            </p>

            <div className="space-y-4 mb-6 divide-y divide-[#E8DFD5]">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3.5 pt-3.5 first:pt-0">
                  <div className="relative shrink-0">
                    <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded-[2px] border border-[#E8DFD5]" />
                    <span className="absolute -top-1.5 -right-1.5 bg-[#631521] text-white text-[10px] font-sans font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-bold text-sm text-[#1A1614] leading-snug">{item.name}</p>
                    <p className="font-sans text-xs text-[#8C7E74] mt-0.5">{item.color?.name} | Size <span className="font-bold text-[#1A1614]">{item.size}</span></p>
                    <p className="font-serif text-sm font-bold text-[#631521] mt-1">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8DFD5] pt-4 space-y-2.5">
              <div className="flex justify-between font-sans text-sm text-[#4A3F38]">
                <span className="font-light">Tạm tính</span>
                <span className="font-bold text-[#1A1614]">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between font-sans text-sm text-[#4A3F38]">
                <span className="font-light">Phí vận chuyển</span>
                <span className={`font-bold ${shippingFee === 0 ? 'text-[#631521]' : 'text-[#1A1614]'}`}>
                  {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-[#E8DFD5] pt-3.5">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#1A1614]">Tổng Thanh Toán</span>
                <span className="font-serif text-2xl font-bold text-[#631521]">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
