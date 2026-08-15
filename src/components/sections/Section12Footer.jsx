import { motion } from 'framer-motion'
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react'

export default function Section12Footer() {
  const footerLinks = [
    { label: 'Cửa hàng', href: '#section-products' },
    { label: 'Bộ sưu tập', href: '#section-hero' },
    { label: 'Về chúng tôi', href: '#section-dark-contrast' },
    { label: 'Câu hỏi thường gặp', href: '#section-features' },
    { label: 'Liên hệ', href: '#section-contact' },
  ]

  const handleLinkClick = (e, href) => {
    e.preventDefault()
    const elem = document.querySelector(href)
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer
      id="section-footer"
      aria-label="Footer Section"
      className="bg-[#2C201A] text-white pt-20 pb-12 border-t border-white/10 relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Tiêu đề: Tiêu đề serif lớn màu vàng gold: "THE BEST TEXTILES IN THE WORLD" */}
        <div className="border-b border-white/15 pb-14 mb-12 text-center lg:text-left flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="font-sans text-xs font-bold tracking-[0.25em] text-white/60 uppercase block mb-3">
              Tôn Chỉ Chất Lượng Toàn Cầu
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#D4AF37] leading-[1.08] tracking-tight">
              SẢN PHẨM DỆT MAY HÀNG ĐẦU THẾ GIỚI
            </h2>
          </div>

          <div className="text-sm font-sans text-white/70 max-w-sm text-center lg:text-right">
            Được dệt từ đam mê và cam kết mang lại chuẩn mực sống thư thái, tinh tế nhất cho ngôi nhà của bạn.
          </div>
        </div>

        {/* Nội dung footer chính: Menu chân trang bên trái + Thông tin liên hệ & Mạng xã hội bên phải */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Cột 1: Menu chân trang: Menu văn bản inter nhỏ (bên trái) */}
          <div className="md:col-span-5">
            <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
              Danh Mục Điều Hướng
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    className="font-sans text-sm text-white/80 hover:text-[#D4AF37] transition-colors link-underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 2: Thông tin văn phòng & Showroom */}
          <div className="md:col-span-4">
            <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
              Showroom & Xưởng Dệt
            </h3>
            <div className="space-y-3 font-sans text-xs sm:text-sm text-white/75 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Số 88 Phố Lụa, Làng Nghề Dệt Truyền Thống, Hà Nội</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Hotline: 0912 345 678</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Email: contact@quannguyens.com</span>
              </div>
            </div>
          </div>

          {/* Cột 3: Đăng ký nhận tin tức & Bản tin ưu đãi */}
          <div className="md:col-span-3">
            <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
              Bản Tin Nghệ Nhân
            </h3>
            <p className="font-sans text-xs text-white/75 leading-relaxed mb-3">
              Nhận thông báo sớm nhất về các bộ sưu tập giới hạn và ưu đãi đặc quyền.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Email của bạn..."
                className="bg-[#1E1510] border border-white/20 text-xs px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37] rounded-l-[2px] w-full"
              />
              <button
                className="bg-[#D4AF37] text-[#2C201A] font-sans font-bold text-xs px-3.5 py-2 rounded-r-[2px] hover:bg-[#B8860B]"
              >
                Gửi
              </button>
            </div>
          </div>

        </div>

        {/* Pháp lý, Xã hội & Bản quyền: Phông chữ nhỏ hơn ở phía dưới */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-white/60">
          
          {/* Pháp lý: "Terms & Conditions" và "Privacy Policy" */}
          <div className="flex items-center gap-6">
            <a href="#section-footer" className="hover:text-[#D4AF37] transition-colors">
              Điều khoản & Điều kiện
            </a>
            <span className="text-white/20">•</span>
            <a href="#section-footer" className="hover:text-[#D4AF37] transition-colors">
              Chính sách bảo mật
            </a>
          </div>

          {/* Xã hội: Biểu tượng mạng xã hội */}
          <div className="flex items-center gap-4 text-white/80">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="p-2 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="p-2 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="p-2 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all"
            >
              <Youtube className="w-4 h-4" />
            </a>
          </div>

          {/* Bản quyền thương hiệu ở phía dưới cùng */}
          <div className="text-center sm:text-right">
            © 2026 QuanNguyenS Haute Textiles. All rights reserved.
          </div>

        </div>

      </div>
    </footer>
  )
}
