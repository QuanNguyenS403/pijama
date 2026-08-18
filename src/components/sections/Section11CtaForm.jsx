import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function Section11CtaForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    partnerType: '',
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
      aria-label="Partnership Inquiry Form"
      className="py-20 sm:py-24 md:py-28 bg-[#631521] text-white border-b border-white/10 relative overflow-hidden"
    >
      {/* Background ambient */}
      <div className="absolute -top-24 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
            Hợp Tác & Đối Tác
          </span>
          
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.12]">
            GỬI YÊU CẦU HỢP TÁC
          </h2>
          
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto my-4" />
          
          <p className="font-sans text-sm sm:text-base text-white/85 font-light leading-relaxed max-w-lg mx-auto">
            Điền thông tin và chúng tôi sẽ liên hệ lại trong vòng 24 giờ để thảo luận về cơ hội hợp tác.
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#4A0D17] border border-[#D4AF37]/30 rounded-[4px] p-6 sm:p-10 shadow-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <CheckCircle2 className="w-14 h-14 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-bold text-white mb-2">
                Gửi Thành Công!
              </h3>
              <p className="font-sans text-sm text-white/80 max-w-md mx-auto mb-6 leading-relaxed">
                Cảm ơn bạn đã quan tâm đến QuanNguyenS. Chúng tôi sẽ liên hệ lại trong vòng 24 giờ làm việc.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false)
                  setFormData({ name: '', phone: '', email: '', partnerType: '', message: '' })
                }}
                className="bg-white text-[#631521] font-sans text-xs font-bold px-6 py-2.5 rounded-[2px] uppercase hover:bg-[#FAF8F5]"
              >
                Gửi yêu cầu khác
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name */}
              <div>
                <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  Họ tên <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Phone */}
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

                {/* Email */}
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
                    placeholder="email@example.com"
                    className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>
              </div>

              {/* Partner type */}
              <div>
                <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  Loại hợp tác <span className="text-white">*</span>
                </label>
                <select
                  required
                  name="partnerType"
                  value={formData.partnerType}
                  onChange={handleChange}
                  className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white font-sans focus:outline-none focus:border-[#D4AF37] transition-colors appearance-none"
                >
                  <option value="" className="text-white/40">Chọn loại hợp tác...</option>
                  <option value="reseller">Reseller — Cửa hàng thời trang</option>
                  <option value="kol">KOL / Influencer</option>
                  <option value="daily">Đại lý phân phối</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block font-sans text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  Tin nhắn
                </label>
                <textarea
                  rows={4}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Chia sẻ thêm về bạn, kênh của bạn, hoặc mong muốn hợp tác..."
                  className="w-full bg-[#2C201A] border border-white/20 rounded-[2px] px-4 py-3 text-sm text-white placeholder-white/40 font-sans focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FAF8F5] text-[#631521] font-sans text-sm font-bold tracking-widest py-4 rounded-[2px] transition-all duration-300 shadow-lg uppercase disabled:opacity-75"
                >
                  {loading ? (
                    <span>ĐANG GỬI...</span>
                  ) : (
                    <>
                      <span>→ GỬI YÊU CẦU HỢP TÁC</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-white/60 font-sans pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Thông tin của bạn được bảo mật tuyệt đối</span>
              </div>
            </form>
          )}
        </div>

      </div>
    </section>
  )
}
