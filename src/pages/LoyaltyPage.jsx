import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Gift,
  ShieldCheck,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Phone,
  ChevronRight,
  Lock,
  Heart,
  Crown,
  HelpCircle,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { TierBadge, TierPill } from '../components/loyalty/LoyaltyBadges'
import LoyaltyRegisterModal from '../components/loyalty/LoyaltyRegisterModal'
import LoyaltyMemberCard from '../components/loyalty/LoyaltyMemberCard'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function LoyaltyPage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)

  useEffect(() => {
    document.title = 'Đặc Quyền Hội Viên — Tích Điểm & Ưu Đãi Đến 15% | QuanNguyenS'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const tiersData = [
    {
      id: 'MEMBER',
      name: 'Thân Thiết',
      threshold: 'Ngay khi đăng ký',
      spendNum: 0,
      discount: 'Ưu đãi chuẩn',
      discountRate: '0%',
      upgradeGift: '—',
      birthdayGift: '50.000đ',
      vipGifts: '—',
      accentColor: '#A6673E',
      bgLight: 'bg-[#FAF5F0]',
      desc: 'Bước đầu tiên trong hành trình gắn kết cùng thời trang lụa cao cấp QuanNguyenS.',
    },
    {
      id: 'SILVER',
      name: 'Hạng Bạc',
      threshold: 'Tích lũy 5.000.000đ / 365 ngày',
      spendNum: 5000000,
      discount: 'Giảm 5% mọi đơn hàng',
      discountRate: '5%',
      upgradeGift: 'Voucher 200.000đ',
      birthdayGift: '200.000đ',
      vipGifts: 'Ưu tiên xem BST mới',
      accentColor: '#7E8794',
      bgLight: 'bg-[#F1F3F5]',
      desc: 'Dành cho quý khách hàng đã gắn bó và sở hữu từ 5-7 bộ pijama thiết kế.',
    },
    {
      id: 'GOLD',
      name: 'Hạng Vàng',
      threshold: 'Tích lũy 10.000.000đ / 365 ngày',
      spendNum: 10000000,
      discount: 'Giảm 10% mọi đơn hàng',
      discountRate: '10%',
      upgradeGift: 'Voucher 300.000đ',
      birthdayGift: '300.000đ',
      vipGifts: 'Quà tặng lễ hội & BST',
      accentColor: '#D4AF37',
      bgLight: 'bg-[#FFFBEB]',
      desc: 'Đặc quyền chăm sóc cao cấp, nhận ưu đãi giảm sâu trên từng thiết kế lụa.',
    },
    {
      id: 'DIAMOND',
      name: 'Kim Cương',
      threshold: 'Tích lũy 25.000.000đ / 365 ngày',
      spendNum: 25000000,
      discount: 'Giảm 15% mọi đơn hàng',
      discountRate: '15%',
      upgradeGift: 'Voucher 500.000đ',
      birthdayGift: '500.000đ',
      vipGifts: 'Private Party & Quà BST giới hạn',
      accentColor: '#631521',
      bgLight: 'bg-[#FDF2F4]',
      desc: 'Đỉnh cao tri ân. Tham dự tiệc trà riêng tư và nhận trọn bộ quà tặng may đo theo từng mùa.',
      isTop: true,
    },
  ]

  const faqs = [
    {
      q: 'Chương trình Hội viên có bắt buộc không?',
      a: 'Hoàn toàn không. Chương trình 100% tự nguyện. Khách hàng chỉ trở thành hội viên khi chủ động bấm đăng ký và xác thực bằng mã OTP gửi về số điện thoại cá nhân. Không có popup ép buộc hay tự động kích hoạt.',
    },
    {
      q: 'Điểm thưởng được tích lũy như thế nào?',
      a: 'Với mỗi 100.000đ chi tiêu thực trả cho tiền hàng (sau khi trừ mọi chiết khấu, không bao gồm phí vận chuyển), bạn sẽ nhận được 1 điểm thưởng. Điểm sẽ tự động cộng vào tài khoản ngay khi đơn hàng chuyển sang trạng thái Đã Giao (Delivered).',
    },
    {
      q: 'Cách quy đổi điểm thưởng lấy voucher tiền mặt?',
      a: 'Cứ 10 điểm thưởng, bạn có thể đổi lấy 1 Voucher trị giá 50.000đ. Voucher này áp dụng cho đơn hàng từ 0đ và có hạn sử dụng 90 ngày. Để bảo vệ quyền sở hữu điểm, hệ thống sẽ gửi mã OTP xác nhận tới SĐT của bạn khi bấm đổi điểm.',
    },
    {
      q: 'Duy trì hạng và điểm thưởng trong bao lâu?',
      a: 'Hạng thành viên và điểm thưởng được duy trì trong vòng 365 ngày kể từ đơn hàng hợp lệ gần nhất. Nếu trong 365 ngày không phát sinh đơn mới, bạn sẽ hạ 1 hạng và điểm thưởng sẽ hết hạn. Hệ thống luôn gửi email thông báo trước 30 ngày để bạn không bỏ lỡ.',
    },
    {
      q: 'Ưu đãi hạng có cộng dồn với VietQR 10% không?',
      a: 'Có! Giảm giá theo hạng thành viên (5%, 10%, 15%) được áp dụng trực tiếp trên giá trị tiền hàng và vẫn được hưởng thêm chiết khấu 10% khi quý khách chọn hình thức thanh toán Chuyển khoản VietQR.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C201A] font-sans antialiased selection:bg-[#631521] selection:text-white">
      <Header onOpenCart={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-[#2C201A] via-[#382820] to-[#2C201A] text-white overflow-hidden">
        {/* Decorative Gold Filigree Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#631521]/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>QuanNguyenS Privileged Club</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto"
          >
            Đặc Quyền Hội Viên
            <span className="block text-[#D4AF37] italic font-normal mt-2">
              Hành Trình Tri Ân & Tinh Tế
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto mt-4 font-light leading-relaxed"
          >
            Mỗi lựa chọn gắn bó cùng QuanNguyenS đều được trân trọng. Tích lũy điểm thưởng tự động, tận hưởng mức giảm đến <strong>15%</strong> trọn năm và những món quà kỷ niệm độc quyền.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-[#631521] hover:bg-[#7D1B2A] text-white border border-[#D4AF37]/50 rounded-[2px] font-sans text-xs font-bold uppercase tracking-[0.2em] shadow-luxury transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              <span>Đăng Ký Hội Viên Ngay</span>
            </button>

            <a
              href="#bang-quyen-loi"
              className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 rounded-[2px] font-sans text-xs font-bold uppercase tracking-wider transition-colors text-center"
            >
              Xem Bảng Quyền Lợi
            </a>
          </motion.div>

          {/* 3 Core Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-14 pt-10 border-t border-white/10 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-white">100% Tự Nguyện</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Chỉ khách chủ động đăng ký mới tham gia. Không tự động đăng ký số điện thoại, không popup phiền toái.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-white">Bảo Mật OTP</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Xác minh số điện thoại qua mã OTP an toàn. Điểm tích lũy được bảo vệ như tài sản cá nhân.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-white">Minh Bạch Tuyệt Đối</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Sổ cái chỉ-ghi-thêm ghi nhận từng điểm cộng/trừ. Luôn thấy rõ ưu đãi nào dùng được và vì sao.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 TIERS SHOWCASE ─── */}
      <section id="bang-quyen-loi" className="py-16 md:py-24 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#631521] block mb-2">
            Hạng Bậc & Ưu Đãi
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1A1614]">
            4 Hạng Đặc Quyền Dành Cho Bạn
          </h2>
          <p className="text-xs sm:text-sm text-[#8C7E74] mt-2">
            Hạng thành viên được xét tự động theo tổng chi tiêu thực tế trong cửa sổ trượt 365 ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {tiersData.map((t) => (
            <div
              key={t.id}
              className={`rounded-[4px] border p-6 flex flex-col justify-between transition-all duration-300 relative ${
                t.isTop
                  ? 'bg-gradient-to-b from-[#FAF8F5] via-white to-[#FDF2F4] border-[#631521] shadow-luxury ring-1 ring-[#631521]'
                  : 'bg-white border-[#E8DFD5] hover:border-[#D4AF37] hover:shadow-md'
              }`}
            >
              {t.isTop && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#631521] text-[#D4AF37] px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#D4AF37]/50 shadow-sm">
                  Đặc Quyền Cao Nhất
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <TierBadge tier={t.id} size="md" />
                  <span className="font-mono text-xs font-bold text-[#631521] bg-[#FAF5F0] px-2 py-0.5 rounded-[2px] border border-[#E8DFD5]">
                    {t.spendNum > 0 ? formatVND(t.spendNum) : '0đ'}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-[#1A1614] mb-1">
                  {t.name}
                </h3>
                <p className="text-xs text-[#8C7E74] mb-5 leading-relaxed">
                  {t.desc}
                </p>

                <div className="space-y-3 pt-4 border-t border-[#E8DFD5] text-xs">
                  <div>
                    <span className="text-[#8C7E74] block text-[11px] uppercase tracking-wider">
                      Giảm giá trực tiếp:
                    </span>
                    <strong className="text-sm font-serif font-bold text-[#631521]">
                      {t.discount}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[#8C7E74] block text-[11px] uppercase tracking-wider">
                      Voucher thăng hạng:
                    </span>
                    <strong className="text-[#1A1614]">{t.upgradeGift}</strong>
                  </div>

                  <div>
                    <span className="text-[#8C7E74] block text-[11px] uppercase tracking-wider">
                      Quà tặng mừng sinh nhật:
                    </span>
                    <strong className="text-[#1A1614]">{t.birthdayGift}</strong>
                  </div>

                  {t.vipGifts !== '—' && (
                    <div>
                      <span className="text-[#8C7E74] block text-[11px] uppercase tracking-wider">
                        Đặc quyền trải nghiệm:
                      </span>
                      <strong className="text-[#D4AF37] font-semibold">{t.vipGifts}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#E8DFD5]">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer ${
                    t.isTop
                      ? 'bg-[#631521] hover:bg-[#4A0D17] text-white shadow-xs'
                      : 'bg-[#FAF8F5] hover:bg-[#631521] text-[#2C201A] hover:text-white border border-[#E8DFD5]'
                  }`}
                >
                  Đăng Ký Tham Gia
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS SECTION ─── */}
      <section className="py-16 bg-[#FAF5F0] border-y border-[#E8DFD5]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#631521] block mb-2">
              Quy Trình Hoạt Động
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614]">
              3 Bước Tích Điểm & Đổi Thưởng Đơn Giản
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] relative shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37]/50 block mb-3">
                01
              </span>
              <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-2">
                Đăng Ký & Nhận Diện
              </h3>
              <p className="text-xs text-[#4A3F38] leading-relaxed">
                Đăng ký chỉ bằng số điện thoại và xác nhận OTP một lần. Mọi đơn hàng đặt bằng số điện thoại này sẽ được hệ thống tự động ghi nhận tích điểm.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] relative shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37]/50 block mb-3">
                02
              </span>
              <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-2">
                Tích Lũy 100k = 1 Điểm
              </h3>
              <p className="text-xs text-[#4A3F38] leading-relaxed">
                Mỗi 100.000đ giá trị hàng thực trả sẽ được quy đổi thành 1 điểm thưởng ngay khi đơn hàng chuyển trạng thái Đã Giao Thành Công (Delivered).
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-[4px] border border-[#E8DFD5] relative shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37]/50 block mb-3">
                03
              </span>
              <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-2">
                Đổi 10 Điểm = 50.000đ
              </h3>
              <p className="text-xs text-[#4A3F38] leading-relaxed">
                Cứ 10 điểm thưởng, bạn quy đổi thành Voucher 50.000đ (đơn từ 0đ, hạn 90 ngày) với lớp xác thực OTP bảo mật cao. Tiêu điểm trực tiếp khi thanh toán.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section className="py-16 md:py-20 max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <HelpCircle className="w-8 h-8 text-[#631521] mx-auto mb-2" />
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614]">
            Câu Hỏi Thường Gặp
          </h2>
          <p className="text-xs text-[#8C7E74] mt-1">
            Mọi thông tin chi tiết về chính sách tích lũy và duy trì quyền lợi
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="bg-white rounded-[2px] border border-[#E8DFD5] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5] transition-colors"
              >
                <span className="font-serif font-bold text-sm text-[#1A1614]">
                  {f.q}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-[#8C7E74] transition-transform ${
                    activeFaq === idx ? 'rotate-90 text-[#631521]' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-[#4A3F38] leading-relaxed border-t border-[#F0EAE1]">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-xs text-[#8C7E74]">
            Quý khách có thể xem toàn văn văn bản pháp lý tại:{' '}
            <Link
              to="/chinh-sach?tab=loyalty"
              className="text-[#631521] underline font-semibold"
            >
              Điều khoản Chương trình Hội viên QuanNguyenS
            </Link>
          </p>
        </div>
      </section>

      {/* Modal Đăng Ký */}
      <LoyaltyRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => {
          alert('Chúc mừng quý khách đã gia nhập Hội Viên QuanNguyenS thành công!')
        }}
      />

      <Section12Footer />
    </div>
  )
}
