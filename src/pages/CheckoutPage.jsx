import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  Gift,
  Lock,
} from 'lucide-react'
import Header from '../components/layout/Header'
import CartDrawer from '../components/cart/CartDrawer'
import Section12Footer from '../components/sections/Section12Footer'
import { useCart } from '../hooks/useCart'
import { VIETNAM_PROVINCES } from '../data/provinces'
import {
  PAYMENT_METHODS,
  validators,
  formatVND,
  createOrderPayload,
} from '../data/checkoutConfig'
import { submitOrder } from '../lib/orderService'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, shippingFee, clearCart } = useCart()
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    ward: '',
    district: '',
    city: 'Hà Nội',
    paymentMethod: 'COD',
    note: '',
  })

  // Validation errors & touched state
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Calculate 10% discount for bank transfer (VietQR) or e-wallet (MoMo)
  const isBankTransfer = formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'MOMO'
  const bankTransferDiscount = useMemo(() => {
    return isBankTransfer ? Math.round(subtotal * 0.10) : 0
  }, [isBankTransfer, subtotal])

  // Calculated totals
  const total = useMemo(() => {
    return Math.max(0, subtotal + shippingFee - bankTransferDiscount)
  }, [subtotal, shippingFee, bankTransferDiscount])

  // Handle Input Changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // If field was already touched, validate in real-time
    if (touched[field]) {
      const validator = validators[field]
      if (validator) {
        const errorMsg = validator(value)
        setErrors((prev) => ({ ...prev, [field]: errorMsg }))
      }
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const validator = validators[field]
    if (validator) {
      const errorMsg = validator(formData[field])
      setErrors((prev) => ({ ...prev, [field]: errorMsg }))
    }
  }

  // Validate all fields before submission
  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    const fieldsToValidate = [
      'fullName',
      'phone',
      'email',
      'address',
      'ward',
      'district',
      'city',
      'paymentMethod',
    ]

    fieldsToValidate.forEach((field) => {
      const validator = validators[field]
      if (validator) {
        const errorMsg = validator(formData[field])
        if (errorMsg) {
          newErrors[field] = errorMsg
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    setTouched(
      fieldsToValidate.reduce((acc, f) => ({ ...acc, [f]: true }), {})
    )
    return isValid
  }

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)

    if (items.length === 0) {
      setSubmitError('Giỏ hàng của bạn đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.')
      return
    }

    if (!validateForm()) {
      // Scroll to top of form
      window.scrollTo({ top: 100, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Tạo payload đơn hàng chuẩn
      const orderPayload = createOrderPayload(
        formData,
        items,
        {
          subtotal,
          shippingFee,
          discount: bankTransferDiscount,
          discountPercent: isBankTransfer ? 10 : 0,
          total,
        }
      )

      // 2. Gửi đơn hàng lên hệ thống (Google Sheets + Gmail)
      const result = await submitOrder(orderPayload)

      if (result.success) {
        // Lưu đơn hàng vừa tạo vào session storage & localStorage
        try {
          sessionStorage.setItem('latest_order', JSON.stringify(orderPayload))
          const existingOrders = JSON.parse(localStorage.getItem('pijama_orders') || '[]')
          const filtered = existingOrders.filter((o) => o.orderId !== orderPayload.orderId)
          localStorage.setItem('pijama_orders', JSON.stringify([orderPayload, ...filtered].slice(0, 50)))
          window.dispatchEvent(new Event('orders_updated'))
        } catch (err) {
          console.error(err)
        }

        // 3. Xóa giỏ hàng
        clearCart()

        // 4. Chuyển hướng theo phương thức thanh toán
        if (formData.paymentMethod === 'BANK_TRANSFER' || formData.paymentMethod === 'MOMO') {
          navigate(`/thanh-toan-chuyen-khoan?orderId=${result.orderId}`, {
            state: { order: orderPayload },
          })
        } else {
          navigate(`/dat-hang-thanh-cong?orderId=${result.orderId}`, {
            state: { order: orderPayload },
          })
        }
      } else {
        throw new Error(result.message || 'Không thể ghi nhận đơn hàng')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setSubmitError(
        err.message || 'Có lỗi xảy ra trong quá trình đặt hàng. Vui lòng thử lại hoặc gọi 0981 753 082.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] selection:bg-[#631521] selection:text-white">
      <title>Thanh Toán Đơn Hàng — QuanNguyenS</title>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />

      <div className="h-16 md:h-20" />

      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/gio-hang"
            className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold tracking-wider text-[#631521] hover:underline uppercase transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại giỏ hàng
          </Link>

          <span className="font-serif text-xs tracking-[0.2em] text-[#631521] uppercase hidden sm:flex items-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#631521]" />
            Giao Dịch Bảo Mật SSL 100%
          </span>
        </div>

        {/* Global Error Banner if any */}
        {submitError && (
          <div className="mb-8 p-4 bg-[#631521]/10 border border-[#631521]/30 rounded-[3px] text-[#631521] text-xs sm:text-sm font-sans flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lưu ý khi đặt hàng:</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white p-12 rounded-[4px] border border-[#E8DFD5] text-center max-w-lg mx-auto shadow-sm my-8">
            <h2 className="font-serif text-2xl font-bold text-[#1A1614] mb-3">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-sm font-light text-[#4A3F38] mb-6">
              Vui lòng chọn sản phẩm vào giỏ hàng trước khi tiến hành thanh toán.
            </p>
            <Link
              to="/"
              className="inline-block bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] px-8 py-3.5 rounded-[2px] hover:bg-[#4A0D17] transition-colors shadow-sm"
            >
              Khám Phá Bộ Sưu Tập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* ─── LEFT COLUMN (60% ~ 7 cols): Form Thông Tin ─── */}
              <div className="lg:col-span-7 space-y-8">
                {/* SECTION 1: THÔNG TIN KHÁCH HÀNG */}
                <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs">
                  <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#E8DFD5]">
                    <span className="w-6 h-6 rounded-full bg-[#631521] text-white flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#1A1614] tracking-wide">
                      Thông Tin Khách Hàng
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Họ và tên */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                        Họ và tên <span className="text-[#631521]">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        onBlur={() => handleBlur('fullName')}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                          errors.fullName && touched.fullName
                            ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                            : 'border-[#E8DFD5] focus:border-[#631521]'
                        }`}
                      />
                      {errors.fullName && touched.fullName && (
                        <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Số điện thoại & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                          Số điện thoại <span className="text-[#631521]">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          onBlur={() => handleBlur('phone')}
                          placeholder="0981 753 082"
                          className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                            errors.phone && touched.phone
                              ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                              : 'border-[#E8DFD5] focus:border-[#631521]'
                          }`}
                        />
                        {errors.phone && touched.phone && (
                          <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                          Email <span className="text-[#631521]">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          onBlur={() => handleBlur('email')}
                          placeholder="name@gmail.com"
                          className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                            errors.email && touched.email
                              ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                              : 'border-[#E8DFD5] focus:border-[#631521]'
                          }`}
                        />
                        {errors.email && touched.email ? (
                          <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                          </p>
                        ) : (
                          <p className="mt-1 text-[0.7rem] text-[#8C7E74]">
                            Xác nhận đơn hàng và hóa đơn sẽ được gửi đến email này
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ĐỊA CHỈ GIAO HÀNG */}
                <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs">
                  <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#E8DFD5]">
                    <span className="w-6 h-6 rounded-full bg-[#631521] text-white flex items-center justify-center text-xs font-bold font-mono">
                      2
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#1A1614] tracking-wide">
                      Địa Chỉ Giao Hàng
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Tỉnh / Thành phố */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                        Tỉnh / Thành phố <span className="text-[#631521]">*</span>
                      </label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:outline-none focus:border-[#631521] transition-colors"
                      >
                        {VIETNAM_PROVINCES.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quận/Huyện & Phường/Xã */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                          Quận / Huyện <span className="text-[#631521]">*</span>
                        </label>
                        <input
                          type="text"
                          name="district"
                          value={formData.district}
                          onChange={(e) => handleInputChange('district', e.target.value)}
                          onBlur={() => handleBlur('district')}
                          placeholder="Ví dụ: Quận Hai Bà Trưng"
                          className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                            errors.district && touched.district
                              ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                              : 'border-[#E8DFD5] focus:border-[#631521]'
                          }`}
                        />
                        {errors.district && touched.district && (
                          <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.district}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                          Phường / Xã <span className="text-[#631521]">*</span>
                        </label>
                        <input
                          type="text"
                          name="ward"
                          value={formData.ward}
                          onChange={(e) => handleInputChange('ward', e.target.value)}
                          onBlur={() => handleBlur('ward')}
                          placeholder="Ví dụ: Phường Vĩnh Tuy"
                          className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                            errors.ward && touched.ward
                              ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                              : 'border-[#E8DFD5] focus:border-[#631521]'
                          }`}
                        />
                        {errors.ward && touched.ward && (
                          <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.ward}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Địa chỉ cụ thể */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                        Địa chỉ chi tiết <span className="text-[#631521]">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        onBlur={() => handleBlur('address')}
                        placeholder="Số nhà, toà nhà, tên đường, ngõ/ngách..."
                        className={`w-full px-3.5 py-2.5 bg-[#FAF8F5] border text-sm rounded-[2px] focus:bg-white focus:outline-none transition-colors ${
                          errors.address && touched.address
                            ? 'border-[#631521] focus:ring-1 focus:ring-[#631521]'
                            : 'border-[#E8DFD5] focus:border-[#631521]'
                        }`}
                      />
                      {errors.address && touched.address && (
                        <p className="mt-1 text-xs text-[#631521] font-sans flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.address}
                        </p>
                      )}
                    </div>

                    {/* Ghi chú đơn hàng */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                        Ghi chú đơn hàng (không bắt buộc)
                      </label>
                      <textarea
                        name="note"
                        rows={3}
                        value={formData.note}
                        onChange={(e) => handleInputChange('note', e.target.value)}
                        placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao, đóng gói kèm thiệp quà tặng..."
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] text-sm rounded-[2px] focus:bg-white focus:outline-none focus:border-[#631521] transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: PHƯƠNG THỨC THANH TOÁN */}
                <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#E8DFD5]">
                    <span className="w-6 h-6 rounded-full bg-[#631521] text-[#FAF8F5] flex items-center justify-center font-serif text-xs font-bold">
                      3
                    </span>
                    <h2 className="font-serif text-lg font-bold text-[#1A1614] tracking-wide">
                      Phương Thức Thanh Toán
                    </h2>
                  </div>

                  {/* Trust Badge Row */}
                  <div className="bg-[#FAF5F0] border border-[#D4AF37]/40 rounded-[3px] p-3 flex items-center justify-between flex-wrap gap-2 text-xs text-[#631521] mb-4">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-[#631521]" />
                      Xác thực VietQR / Napas 24/7 · Vietcombank
                    </span>
                    <span className="text-[11px] text-[#8C7E74] font-sans">
                      Mã hóa SSL chuẩn ngân hàng
                    </span>
                  </div>

                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = formData.paymentMethod === method.value
                      const hasDiscount = method.discountPercent > 0

                      return (
                        <div
                          key={method.value}
                          onClick={() => handleInputChange('paymentMethod', method.value)}
                          className={`p-4 rounded-[3px] border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#631521] bg-[#FAF5F0] shadow-xs ring-1 ring-[#631521]'
                              : 'border-[#E8DFD5] bg-white hover:border-[#631521]/60 hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="pt-0.5">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#631521] bg-[#631521]'
                                    : 'border-[#8C7E74]'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between flex-wrap gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{method.icon}</span>
                                  <span className="font-serif text-sm font-bold text-[#1A1614]">
                                    {method.label}
                                  </span>
                                </div>
                                {hasDiscount && (
                                  <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10.5px] font-bold px-2 py-0.5 rounded-[2px]">
                                    <Gift className="w-3 h-3" />
                                    GIẢM {method.discountPercent}%
                                  </span>
                                )}
                              </div>

                              <p className="font-sans text-xs text-[#4A3F38] mt-1 font-light leading-relaxed">
                                {method.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ─── RIGHT COLUMN (40% ~ 5 cols): Tóm Tắt Đơn Hàng (Sticky) ─── */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-luxury">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E8DFD5]">
                    <h2 className="font-serif text-lg font-bold text-[#1A1614]">
                      Đơn Hàng Của Bạn
                    </h2>
                    <span className="text-xs font-sans font-semibold text-[#631521] bg-[#FAF5F0] px-2.5 py-0.5 rounded-[2px] border border-[#E8DFD5]">
                      {items.reduce((sum, i) => sum + i.quantity, 0)} sản phẩm
                    </span>
                  </div>

                  {/* Pre-Order Notice Banner */}
                  {items.some((i) => i.preOrder?.enabled || i.isPreOrder || i.slug === 'the-classic-set' || i.productId === 'the-classic-set') && (
                    <div className="mb-5 p-3.5 bg-[#FAF5F0] border-2 border-[#D4AF37] rounded-[3px] flex items-start gap-2.5 text-xs text-[#631521] font-sans">
                      <span className="text-base shrink-0">⏱</span>
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[11px] mb-0.5">
                          Lưu ý đơn hàng Đặt Trước (Pre-Order)
                        </p>
                        <p className="text-[#4A3F38] leading-relaxed">
                          Đơn hàng có chứa sản phẩm <strong>THE DAYBREAK SET (Sọc Hồng)</strong>. Toàn bộ đơn hàng sẽ được chuẩn bị và giao trong <strong>7–10 ngày làm việc</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1 pdp-scrollbar mb-6">
                    {items.map((item, idx) => {
                      const isItemPreOrder = !!(
                        item.preOrder?.enabled ||
                        item.isPreOrder ||
                        item.slug === 'the-classic-set' ||
                        item.productId === 'the-classic-set'
                      )
                      return (
                        <div key={`${item.id}-${item.color?.name || item.color}-${item.size}-${idx}`} className="flex gap-3.5 pb-4 border-b border-[#F0EAE1] last:border-b-0 last:pb-0">
                          <div className="w-16 h-20 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] overflow-hidden shrink-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-[#8C7E74]">
                                Pijama
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-serif text-sm font-bold text-[#1A1614] leading-snug line-clamp-1">
                                {item.name}
                              </h3>
                              <p className="font-sans text-xs text-[#8C7E74] mt-0.5">
                                {item.color?.name || item.color || ''} · Size {item.size}
                              </p>
                              {isItemPreOrder && (
                                <span className="inline-block font-sans text-[10px] font-bold text-[#631521] bg-[#FAF5F0] border border-[#D4AF37]/60 px-1.5 py-0.5 rounded-[2px] mt-1">
                                  ⏱ Đặt trước (giao 7-10 ngày)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-[#4A3F38] font-sans">
                                SL: <strong>x{item.quantity}</strong>
                              </span>
                              <span className="font-serif font-bold text-sm text-[#631521]">
                                {formatVND(item.price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Price Calculations */}
                  <div className="space-y-2.5 pt-4 border-t border-[#E8DFD5] text-xs font-sans">
                    <div className="flex justify-between text-[#4A3F38]">
                      <span>Tạm tính</span>
                      <span className="font-medium">{formatVND(subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-[#4A3F38]">
                      <span>Phí vận chuyển</span>
                      <span>
                        {shippingFee === 0 ? (
                          <span className="text-[#2E7D32] font-semibold">Miễn phí</span>
                        ) : (
                          formatVND(shippingFee)
                        )}
                      </span>
                    </div>

                    {/* Bank Transfer 10% Discount Breakdown */}
                    {bankTransferDiscount > 0 && (
                      <div className="flex justify-between items-center bg-[#E8F5E9] px-2.5 py-1.5 rounded-[2px] border border-[#C8E6C9] text-[#2E7D32]">
                        <span className="font-medium flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          Ưu đãi Chuyển khoản VietQR (10%)
                        </span>
                        <span className="font-serif font-bold text-sm">
                          -{formatVND(bankTransferDiscount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-3 mt-3 border-t border-[#E8DFD5]">
                      <span className="font-serif text-sm font-bold text-[#1A1614] uppercase tracking-wider">
                        Tổng thanh toán
                      </span>
                      <div className="text-right">
                        <span className="font-serif text-2xl font-bold text-[#631521] block leading-none">
                          {formatVND(total)}
                        </span>
                        {bankTransferDiscount > 0 && (
                          <span className="text-[0.65rem] text-[#2E7D32] font-semibold mt-0.5 block">
                            (Đã áp dụng giảm 10% VietQR)
                          </span>
                        )}
                        <span className="text-[0.65rem] text-[#8C7E74] mt-1 block">
                          (Đã bao gồm VAT & giao hàng tận nơi)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-6 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                        <span>ĐANG XỬ LÝ ĐƠN HÀNG...</span>
                      </>
                    ) : (
                      <span>XÁC NHẬN ĐẶT HÀNG</span>
                    )}
                  </button>

                  <p className="text-[0.7rem] text-center text-[#8C7E74] mt-3 italic">
                    Bằng việc bấm xác nhận, bạn đồng ý với chính sách mua hàng của QuanNguyenS.
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="bg-white p-5 rounded-[4px] border border-[#E8DFD5] space-y-3.5 text-xs font-sans text-[#4A3F38]">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-[#631521] shrink-0" />
                    <span>Giao hàng nhanh <strong>2–4 ngày làm việc</strong> toàn quốc</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-[#631521] shrink-0" />
                    <span>Đổi trả miễn phí trong <strong>30 ngày</strong> nếu chưa qua sử dụng</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#631521] shrink-0" />
                    <span>Chất liệu tự nhiên cao cấp, kiểm định chất lượng nghiêm ngặt</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      <Section12Footer />
    </div>
  )
}
