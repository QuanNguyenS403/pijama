import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function Section11CtaForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <section
      id="section-contact"
      aria-label="Become a Trade Partner Form"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        
        {/* Header phần */}
        <div className="text-center mb-12">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
            Hợp Tác Phân Phối & Dự Án
          </span>
          
          {/* Tiêu đề: Tiêu đề serif "BECOME A TRADE PARTNER" */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.12]">
            TRỞ THÀNH ĐỐI TÁC KINH DOANH
          </h2>
          
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto my-4" />
          
          <p className="font-sans text-sm sm:text-base text-white/85 font-light leading-relaxed max-w-lg mx-auto">
            Hợp tác cùng chúng tôi để mang đến các sản phẩm dệt may và trang phục mặc nhà cao cấp cho hệ thống boutique, khách sạn nghỉ dưỡng 5 sao và khách hàng của bạn.
          </p>
        </div>

        {/* Form đăng ký: 4 trường "Name", "Email", "Phone", "Message" (Inter) + Nút gửi màu trắng */}
        <div className="bg-[#4A0D17] border border-[#D4AF37]/30 rounded-[4px] p-6 sm:p-10 shadow-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <CheckCircle2 className="w-14 h-14 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-bold text-white mb-2">
                Đăng Ký Thành Công!
              </h3>
              <p className="font-sans text-sm text-white/80 max-w-md mx-auto mb-6 leading-relaxed">
                Cảm ơn bạn đã quan tâm. Đội ngũ đại diện thương mại của chúng tôi sẽ liên hệ lại trong vòng 24 giờ làm việc.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false)
                  setFormData({ name: '', email: '', phone: '', message: '' })
                }}
                className="bg-white text-[#631521] font-sans text-xs font-bold px-6 py-2.5 rounded-[2px] uppercase hover:bg-[#FAF8F5]"
              >
                Gửi đơn đăng ký khác
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Trường 1: Name (Họ và tên) */}
              <div>
                <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  Họ và tên <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Trường 2: Email */}
                <div>
                  <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                    Email <span className="text-white">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@company.com"
                    className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>

                {/* Trường 3: Phone (Số điện thoại) */}
                <div>
                  <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                    Số điện thoại <span className="text-white">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0912 345 678"
                    className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              </div>

              {/* Trường 4: Message (Lời nhắn) */}
              <div>
                <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  Lời nhắn
                </label>
                <textarea
                  rows={4}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Chia sẻ về mô hình kinh doanh, số lượng dự kiến hoặc yêu cầu đặc biệt của bạn..."
                  className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                />
              </div>

              {/* Nút gửi: Nút CTA "SUBMIT APPLICATION" màu trắng */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FAF8F5] text-[#631521] font-sans text-sm font-bold tracking-widest py-4 rounded-[2px] transition-all duration-300 shadow-lg uppercase disabled:opacity-75"
                >
                  {loading ? (
                    <span>ĐANG GỬI THÔNG TIN...</span>
                  ) : (
                    <>
                      <span>GỬI ĐĂNG KÝ</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-white/60 font-sans pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Bảo mật thông tin đối tác 100% theo tiêu chuẩn quốc tế</span>
              </div>
            </form>
          )}
        </div>

      </div>
    </section>
  )
}
