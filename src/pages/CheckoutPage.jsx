import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Lock, CheckCircle2, QrCode, Truck, ShieldCheck } from 'lucide-react'
import Header from '../components/layout/Header'
import CartDrawer from '../components/cart/CartDrawer'
import Section12Footer from '../components/sections/Section12Footer'
import { useCart } from '../hooks/useCart'
import { motion } from 'framer-motion'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CheckoutPage() {
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const { subtotal, shippingFee, items, clearCart } = useCart()
  const [submitted, setSubmitted] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod') // 'cod' or 'qr'
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hà Nội',
    note: '',
  })
  const navigate = useNavigate()

  const total = subtotal + shippingFee

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    clearCart()
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-lg bg-white p-8 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-luxury text-center"
        >
          <div className="w-16 h-16 bg-[#631521] text-[#D4AF37] flex items-center justify-center rounded-full mx-auto mb-6 border border-[#D4AF37]/40 shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="font-serif text-xs font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            ĐẶT HÀNG THÀNH CÔNG
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614] mb-3">
            Cảm Ơn Bạn Đã Chọn QuanNguyenS
          </h1>

          <div className="bg-[#FAF5F0] p-4 rounded-[3px] border border-[#E8DFD5] mb-6 text-left text-xs text-[#4A3F38] space-y-1.5 font-sans">
            <p><strong>Người nhận:</strong> {formData.fullName || 'Khách hàng'}</p>
            <p><strong>Số điện thoại:</strong> {formData.phone || '09xx xxx xxx'}</p>
            <p><strong>Địa chỉ:</strong> {formData.address || 'Hà Nội'}</p>
            <p><strong>Hình thức:</strong> {paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản VietQR'}</p>
            <p><strong>Tổng thanh toán:</strong> <span className="font-serif font-bold text-sm text-[#631521]">{formatPrice(total)}</span></p>
          </div>

          <p className="font-sans text-xs sm:text-sm font-light text-[#4A3F38] leading-relaxed mb-8">
            Bộ pijama của bạn sẽ được đóng gói thủ công chuẩn quà tặng cao cấp và giao tới bạn trong 2–4 ngày làm việc. Nhân viên chăm sóc khách hàng sẽ liên hệ xác nhận đơn hàng qua số điện thoại.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer"
          >
            Về Trang Chủ
          </button>
        </motion.div>
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
        <Link
          to="/gio-hang"
          className="inline-flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#631521] hover:underline mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại giỏ hàng
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left — Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-sm">
            <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
              THANH TOÁN AN TOÀN
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614] mb-8">
              Thông Tin Giao Hàng & Đặt Hàng
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="fullName">
                  Họ và tên người nhận *
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Thị Mai Lan"
                  className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="phone">
                    Số điện thoại nhận hàng *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0981 xxx xxx"
                    className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="email">
                    Email nhận xác nhận (tùy chọn)
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ban@email.com"
                    className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="address">
                  Địa chỉ giao hàng chi tiết *
                </label>
                <input
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-3 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-1.5" htmlFor="note">
                  Ghi chú cho đơn hàng
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={2}
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  className="w-full border border-[#E8DFD5] bg-[#FAF8F5] px-4 py-2.5 font-sans text-sm text-[#1A1614] placeholder-[#8C7E74] rounded-[2px] focus:outline-none focus:border-[#631521] focus:bg-white transition-colors"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="pt-4 border-t border-[#E8DFD5]">
                <label className="font-sans text-xs font-bold text-[#1A1614] uppercase tracking-wider block mb-3">
                  Phương Thức Thanh Toán
                </label>

                <div className="space-y-3">
                  {/* COD */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-[3px] border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#631521] bg-[#FAF5F0] ring-1 ring-[#631521]'
                        : 'border-[#E8DFD5] bg-white hover:border-[#8C7E74]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 accent-[#631521]"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#631521]" />
                        <span className="font-bold text-[#1A1614] text-sm">
                          Thanh toán khi nhận hàng (COD)
                        </span>
                      </div>
                      <p className="text-[#8C7E74] font-light mt-1">
                        Kiểm tra hàng trước khi thanh toán — Đảm bảo an tâm 100%
                      </p>
                    </div>
                  </label>

                  {/* VietQR */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-[3px] border cursor-pointer transition-all ${
                      paymentMethod === 'qr'
                        ? 'border-[#631521] bg-[#FAF5F0] ring-1 ring-[#631521]'
                        : 'border-[#E8DFD5] bg-white hover:border-[#8C7E74]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'qr'}
                      onChange={() => setPaymentMethod('qr')}
                      className="mt-1 accent-[#631521]"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#631521]" />
                        <span className="font-bold text-[#1A1614] text-sm">
                          Chuyển khoản ngân hàng VietQR
                        </span>
                      </div>
                      <p className="text-[#8C7E74] font-light mt-1">
                        Quét mã QR qua ứng dụng ngân hàng hoặc ví điện tử (Xử lý đơn nhanh hơn)
                      </p>

                      {paymentMethod === 'qr' && (
                        <div className="mt-3 p-3 bg-white border border-[#E8DFD5] rounded-[2px] flex items-center gap-3">
                          <div className="w-16 h-16 bg-[#F5F0EB] flex items-center justify-center border border-[#E8DFD5] rounded-[2px] shrink-0 text-center font-serif text-[10px] font-bold text-[#631521]">
                            VIETQR<br />CODE
                          </div>
                          <div className="text-[11px] text-[#4A3F38] space-y-0.5">
                            <p><strong>Ngân hàng:</strong> Techcombank / MBBank</p>
                            <p><strong>Số tài khoản:</strong> 0981753082</p>
                            <p><strong>Chủ tài khoản:</strong> NGUYEN DUC QUAN</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-5">
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  XÁC NHẬN ĐẶT HÀNG ({formatPrice(total)})
                </button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-[#8C7E74] font-light mt-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Bảo mật thông tin đơn hàng 100% · Đổi trả miễn phí 30 ngày</span>
                </div>
              </div>
            </form>
          </div>

          {/* Right — Order Summary (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-5">
            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-sm">
              <h2 className="font-serif text-lg font-bold text-[#1A1614] pb-4 border-b border-[#E8DFD5] uppercase tracking-wider">
                Đơn Hàng Của Bạn ({items.length})
              </h2>

              <div className="divide-y divide-[#E8DFD5] max-h-72 overflow-y-auto pdp-scrollbar my-2">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex gap-3 items-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-16 object-cover rounded-[2px] border border-[#E8DFD5] bg-[#F5F0EB]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-xs text-[#1A1614] truncate">
                        {item.name}
                      </p>
                      <p className="font-sans text-[11px] text-[#8C7E74]">
                        {item.color?.name} | Size {item.size} · SL: {item.quantity}
                      </p>
                      <p className="font-serif text-xs font-bold text-[#631521] mt-0.5">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E8DFD5] space-y-2 text-xs font-sans">
                <div className="flex justify-between text-[#8C7E74]">
                  <span>Tạm tính</span>
                  <span className="font-medium text-[#1A1614]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#8C7E74]">
                  <span>Phí giao hàng toàn quốc</span>
                  <span>{shippingFee === 0 ? <strong className="text-[#10B981]">MIỄN PHÍ</strong> : formatPrice(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#631521] pt-3 border-t border-[#E8DFD5]">
                  <span>Tổng thanh toán</span>
                  <span className="font-serif text-xl">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
