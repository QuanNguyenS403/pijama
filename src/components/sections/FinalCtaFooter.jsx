import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, Phone, MapPin, Clock, ShieldCheck, Truck, RefreshCw, CreditCard } from 'lucide-react'
import BrandLogo from '../ui/BrandLogo'
import heroCampaignImg from '../../assets/images/hero-campaign.jpg'

export default function FinalCtaFooter() {
  return (
    <footer id="lien-he" aria-label="Chân trang QuanNguyenS" className="bg-[#0F172A] text-[#FAF8F5] relative overflow-hidden">
      {/* Pre-Footer Action Banner */}
      <section className="relative py-16 sm:py-20 md:py-28 flex items-center justify-center text-center px-4 sm:px-6 border-b border-[#1E293B]">
        {/* Background Visual Overlay */}
        <img
          src={heroCampaignImg}
          alt="QuanNguyenS Pijama Đũi Mát Lành"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.25]"
        />

        {/* Ambient Dark Navy Gradient */}
        <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-[#1E293B]/80 text-[#C5A059] px-3.5 py-1.5 rounded-[2px] mb-4 border border-[#C5A059]/30"
          >
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase">
              QUANNGUYENS • PIJAMA ĐŨI TỰ NHIÊN
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#FAF8F5] mb-5 leading-tight"
          >
            Đêm Mát Lành. <br />
            <span className="font-serif-italic font-normal text-[#E8DFD5]">Giấc Ngủ Nhẹ Tênh.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-[#E8DFD5]/90 font-light max-w-xl mx-auto mb-8 leading-relaxed"
          >
            Trao cho bản thân và người thân yêu món quà của sự êm ái và giấc ngủ trọn vẹn nhất mỗi đêm cùng bộ pijama vải đũi cao cấp.
          </motion.p>

          <motion.a
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            href="#pricing-section"
            className="inline-flex items-center gap-3 bg-[#C5A059] hover:bg-[#B38F48] text-[#0F172A] text-xs font-bold tracking-[0.2em] uppercase px-8 py-4 rounded-[2px] transition-all shadow-luxury group"
          >
            <span>ĐẶT HÀNG NGAY HÔM NAY</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.a>
        </div>
      </section>

      {/* Main Footer Links & Information */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[#1E293B]">
          {/* Brand Info (4 cols) */}
          <div className="md:col-span-4 flex flex-col justify-between">
            <div>
              <a href="#hero" className="inline-block mb-4">
                <BrandLogo variant="horizontal" color="white" />
              </a>
              <p className="text-xs text-[#94A3B8] font-light max-w-sm leading-relaxed mb-6">
                Thương hiệu thời trang đồ ngủ vải đũi tự nhiên cao cấp <strong className="text-[#FAF8F5] font-normal">QuanNguyenS</strong>. Tôn vinh nghệ thuật sống thảnh thơi, tự nhiên và chăm sóc trọn vẹn sức khỏe giấc ngủ người Việt.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col gap-2 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#C5A059]" />
                <span>Giao hàng COD toàn quốc — Kiểm hàng trước thanh toán</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#C5A059]" />
                <span>Hỗ trợ đổi size tận nhà trong 30 ngày</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation (8 cols) */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs font-light">
            {/* Column 1: Navigation */}
            <div>
              <h4 className="font-bold tracking-[0.18em] uppercase text-[#FAF8F5] mb-4 text-[11px] border-b border-[#1E293B] pb-2">
                KHÁM PHÁ
              </h4>
              <ul className="space-y-2.5 text-[#94A3B8]">
                <li><a href="#hero" className="hover:text-[#FAF8F5] transition-colors">TRANG CHỦ</a></li>
                <li><a href="#san-pham-noi-bat" className="hover:text-[#FAF8F5] transition-colors">BỘ SƯU TẬP</a></li>
                <li><a href="#ve-chung-toi" className="hover:text-[#FAF8F5] transition-colors">VỀ CHÚNG TÔI</a></li>
                <li><a href="#fabric-story" className="hover:text-[#FAF8F5] transition-colors">Chất Liệu Vải Đũi</a></li>
                <li><a href="#reviews-section" className="hover:text-[#FAF8F5] transition-colors">Đánh Giá Khách Hàng</a></li>
              </ul>
            </div>

            {/* Column 2: Customer Service */}
            <div>
              <h4 className="font-bold tracking-[0.18em] uppercase text-[#FAF8F5] mb-4 text-[11px] border-b border-[#1E293B] pb-2">
                HỖ TRỢ & BẢO HÀNH
              </h4>
              <ul className="space-y-2.5 text-[#94A3B8]">
                <li><a href="#pricing-section" className="hover:text-[#FAF8F5] transition-colors">Hướng Dẫn Chọn Size</a></li>
                <li><a href="#pricing-section" className="hover:text-[#FAF8F5] transition-colors">Chính Sách Đổi Trả 30 Ngày</a></li>
                <li><a href="#faq-section" className="hover:text-[#FAF8F5] transition-colors">Cách Giặt & Bảo Quản Đũi</a></li>
                <li><a href="#pricing-section" className="hover:text-[#FAF8F5] transition-colors">Tra Cứu Đơn Hàng</a></li>
              </ul>
            </div>

            {/* Column 3: Contact Details */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="font-bold tracking-[0.18em] uppercase text-[#FAF8F5] mb-4 text-[11px] border-b border-[#1E293B] pb-2">
                LIÊN HỆ
              </h4>
              <ul className="space-y-2.5 text-[#94A3B8]">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="text-[#FAF8F5] font-semibold">0987.654.321</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>support@quannguyens.vn</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                  <span>Hà Nội & TP. Hồ Chí Minh</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>8:00 - 22:00 Hàng Ngày</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Payment Icons & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B]">
          <div>
            <p>© 2026 QuanNguyenS. All Rights Reserved. 10PM Pijama Đũi Tự Nhiên.</p>
          </div>

          {/* Payment Method Badges */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider hidden sm:inline">
              Phương thức thanh toán:
            </span>
            <div className="flex items-center gap-2">
              <span className="bg-[#1E293B] text-[#FAF8F5] px-2 py-1 rounded-[2px] text-[10px] font-bold border border-[#334155]">
                COD
              </span>
              <span className="bg-[#1E293B] text-[#FAF8F5] px-2 py-1 rounded-[2px] text-[10px] font-bold border border-[#334155]">
                VISA
              </span>
              <span className="bg-[#1E293B] text-[#FAF8F5] px-2 py-1 rounded-[2px] text-[10px] font-bold border border-[#334155]">
                MASTERCARD
              </span>
              <span className="bg-[#1E293B] text-[#FAF8F5] px-2 py-1 rounded-[2px] text-[10px] font-bold border border-[#334155]">
                MOMO
              </span>
              <span className="bg-[#1E293B] text-[#FAF8F5] px-2 py-1 rounded-[2px] text-[10px] font-bold border border-[#334155]">
                VNPAY
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
