import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import PolicyModal from '../ui/PolicyModal'

function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TiktokIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  )
}

export default function Section12Footer() {
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [activePolicy, setActivePolicy] = useState('terms')
  const [newsletterMsg, setNewsletterMsg] = useState(false)

  const openPolicy = (e, policyKey) => {
    e.preventDefault()
    setActivePolicy(policyKey)
    setPolicyModalOpen(true)
  }

  const handleNewsletter = (e) => {
    e.preventDefault()
    setNewsletterMsg(true)
    setTimeout(() => setNewsletterMsg(false), 3000)
  }

  const footerNavLinks = [
    { label: 'Bộ sưu tập', href: '#section-products' },
    { label: 'Về chúng tôi', href: '#section-dark-contrast' },
    { label: 'Chính sách đổi trả 30 ngày', policy: 'return' },
    { label: 'Chính sách bảo mật', policy: 'privacy' },
    { label: 'Điều khoản & Điều kiện', policy: 'terms' },
  ]

  const handleNavClick = (e, href) => {
    e.preventDefault()
    const elem = document.querySelector(href)
    if (elem) elem.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <footer
        id="section-footer"
        aria-label="Footer"
        className="bg-[#2C201A] text-white pt-20 pb-12 border-t border-white/10 relative overflow-hidden"
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
          
          {/* Footer tagline */}
          <div className="border-b border-white/15 pb-14 mb-12 text-center lg:text-left flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <span className="font-sans text-xs font-bold tracking-[0.25em] text-white/60 uppercase block mb-3">
                European Casual Luxury
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#D4AF37] leading-[1.08] tracking-tight">
                "Dressed for Life
                <span className="block">Even at Home"</span>
              </h2>
              <p className="font-sans text-sm text-white/50 mt-2 italic">
                — QuanNguyenS
              </p>
            </div>

            <div className="text-sm font-sans text-white/70 max-w-sm text-center lg:text-right leading-relaxed">
              Pijama không chỉ để ngủ<br />
              Một bộ đồ — vô số câu chuyện
            </div>
          </div>

          {/* Footer columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
            
            {/* Col 1: Nav & Policies */}
            <div className="md:col-span-4">
              <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
                Điều Hướng & Chính Sách
              </h3>
              <ul className="space-y-2.5">
                {footerNavLinks.map((link) => (
                  <li key={link.label}>
                    {link.policy ? (
                      <button
                        onClick={(e) => openPolicy(e, link.policy)}
                        className="font-sans text-sm text-white/80 hover:text-[#D4AF37] transition-colors link-underline text-left"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href)}
                        className="font-sans text-sm text-white/80 hover:text-[#D4AF37] transition-colors link-underline"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 2: Contact info */}
            <div className="md:col-span-4">
              <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
                Thông Tin Liên Hệ
              </h3>
              <div className="space-y-3 font-sans text-xs sm:text-sm text-white/75 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <a href="tel:0981753082" className="hover:text-[#D4AF37] transition-colors">
                    0981 753 082 (Hỗ trợ 24/7)
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <a href="mailto:ducquan16102006@gmail.com" className="hover:text-[#D4AF37] transition-colors">
                    ducquan16102006@gmail.com
                  </a>
                </div>
              </div>
            </div>

            {/* Col 3: Social + newsletter */}
            <div className="md:col-span-4">
              <h3 className="font-serif text-lg font-bold text-[#D4AF37] mb-4">
                Theo Dõi QuanNguyenS
              </h3>
              <p className="font-sans text-xs text-white/75 leading-relaxed mb-4">
                Follow <span className="text-[#D4AF37] font-semibold">@QuanNguyenS</span> để xem phong cách phối đồ hàng ngày ↗
              </p>
              <div className="flex gap-3 mb-6">
                <a
                  href="https://instagram.com/quannguyens"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram QuanNguyenS"
                  className="p-2.5 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all text-white"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com/quannguyens"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook QuanNguyenS"
                  className="p-2.5 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all text-white"
                >
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://tiktok.com/@quannguyens"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok QuanNguyenS"
                  className="p-2.5 bg-white/5 hover:bg-[#D4AF37] hover:text-[#2C201A] rounded-full transition-all text-white"
                >
                  <TiktokIcon className="w-4 h-4" />
                </a>
              </div>

              {/* Newsletter */}
              <p className="font-sans text-xs text-white/60 mb-2">
                Nhận thông báo về bộ sưu tập mới:
              </p>
              <form onSubmit={handleNewsletter} className="flex">
                <input
                  type="email"
                  required
                  placeholder="Email của bạn..."
                  className="bg-[#1E1510] border border-white/20 text-xs px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37] rounded-l-[2px] w-full"
                />
                <button
                  type="submit"
                  className="bg-[#D4AF37] text-[#2C201A] font-sans font-bold text-xs px-4 py-2 rounded-r-[2px] hover:bg-[#B8860B] transition-colors uppercase"
                >
                  Gửi
                </button>
              </form>
              {newsletterMsg && (
                <p className="font-sans text-xs text-[#D4AF37] mt-1.5 font-medium">
                  ✓ Đăng ký nhận bản tin thành công
                </p>
              )}
            </div>

          </div>

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-white/60">
            
            <div className="flex items-center gap-6 flex-wrap justify-center sm:justify-start">
              <button
                onClick={(e) => openPolicy(e, 'terms')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Điều khoản & Điều kiện
              </button>
              <span className="text-white/20">•</span>
              <button
                onClick={(e) => openPolicy(e, 'privacy')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Chính sách bảo mật
              </button>
              <span className="text-white/20">•</span>
              <button
                onClick={(e) => openPolicy(e, 'return')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Chính sách đổi trả
              </button>
            </div>

            <div className="text-center sm:text-right">
              © 2026 QuanNguyenS — European Casual Luxury
            </div>
          </div>

        </div>
      </footer>

      {/* Policy Modal */}
      <PolicyModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        initialPolicy={activePolicy}
      />
    </>
  )
}
