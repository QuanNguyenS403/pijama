import React, { useState, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ChevronRight,
  Crown,
  HelpCircle,
  Check,
  Minus,
  Table,
  LayoutGrid,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { TierBadge } from '../components/loyalty/LoyaltyBadges'
import LoyaltyRegisterModal from '../components/loyalty/LoyaltyRegisterModal'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function LoyaltyPage() {
  const [cartOpen, setCartOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  useEffect(() => {
    document.title = 'Đặc Quyền Hội Viên — Tích Điểm & Ưu Đãi Đến 15% | QuanNguyenS'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // 4 Hạng hội viên với đúng thông số chuẩn trong server/lib/loyalty/loyaltyConfig.js
  const tiersData = [
    {
      id: 'MEMBER',
      name: 'Thân Thiết',
      englishName: 'Member',
      spendNum: 0,
      thresholdText: 'Ngay khi tham gia',
      discountRate: '0%',
      discountText: 'Ưu đãi chuẩn',
      upgradeVoucher: '—',
      birthdayVoucher: '50.000đ',
      pointsRule: '100k = 1 điểm',
      redeemRule: '10 điểm = 50k',
      stackVietQR: true,
      validity: '365 ngày',
      desc: 'Bước đầu tiên trong hành trình gắn kết cùng pijama lụa QuanNguyenS.',
    },
    {
      id: 'SILVER',
      name: 'Hạng Bạc',
      englishName: 'Silver',
      spendNum: 5000000,
      thresholdText: 'Từ 5.000.000đ',
      discountRate: '5%',
      discountText: 'Giảm 5% mọi đơn hàng',
      upgradeVoucher: '200.000đ',
      birthdayVoucher: '200.000đ',
      pointsRule: '100k = 1 điểm',
      redeemRule: '10 điểm = 50k',
      stackVietQR: true,
      validity: '365 ngày',
      desc: 'Dành cho quý khách hàng đã gắn bó và sở hữu từ 4–6 bộ thiết kế.',
    },
    {
      id: 'GOLD',
      name: 'Hạng Vàng',
      englishName: 'Gold',
      spendNum: 10000000,
      thresholdText: 'Từ 10.000.000đ',
      discountRate: '10%',
      discountText: 'Giảm 10% mọi đơn hàng',
      upgradeVoucher: '300.000đ',
      birthdayVoucher: '300.000đ',
      pointsRule: '100k = 1 điểm',
      redeemRule: '10 điểm = 50k',
      stackVietQR: true,
      validity: '365 ngày',
      desc: 'Đặc quyền chăm sóc cao cấp, nhận ưu đãi giảm sâu trên từng thiết kế.',
    },
    {
      id: 'DIAMOND',
      name: 'Kim Cương',
      englishName: 'Diamond',
      spendNum: 25000000,
      thresholdText: 'Từ 25.000.000đ',
      discountRate: '15%',
      discountText: 'Giảm 15% mọi đơn hàng',
      upgradeVoucher: '500.000đ',
      birthdayVoucher: '500.000đ',
      pointsRule: '100k = 1 điểm',
      redeemRule: '10 điểm = 50k',
      stackVietQR: true,
      validity: '365 ngày',
      desc: 'Đỉnh cao tri ân. Đặc quyền giảm giá 15% tối đa trọn năm.',
      isTop: true,
    },
  ]

  // Bảng tiêu chí so sánh đối chiếu giữa các hạng
  const comparisonSections = [
    {
      title: '1. Điều Kiện & Chiết Khấu Trực Tiếp',
      rows: [
        {
          label: 'Chi tiêu tích lũy (365 ngày)',
          values: ['0đ', '5.000.000đ', '10.000.000đ', '25.000.000đ'],
          isHighlight: true,
        },
        {
          label: 'Giảm giá trực tiếp mọi đơn hàng',
          values: ['Ưu đãi chuẩn', 'Giảm 5%', 'Giảm 10%', 'Giảm 15%'],
          isDiscount: true,
        },
        {
          label: 'Cộng dồn chiết khấu VietQR 10%',
          values: [true, true, true, true],
        },
      ],
    },
    {
      title: '2. Quà Tặng & Voucher Đặc Quyền',
      rows: [
        {
          label: 'Voucher mừng thăng hạng',
          values: ['—', '200.000đ', '300.000đ', '500.000đ'],
        },
        {
          label: 'Voucher mừng sinh nhật',
          values: ['50.000đ', '200.000đ', '300.000đ', '500.000đ'],
          isGold: true,
        },
      ],
    },
    {
      title: '3. Tích Lũy Điểm & Đổi Thưởng',
      rows: [
        {
          label: 'Tỷ lệ tích lũy điểm thưởng',
          values: ['100k = 1 điểm', '100k = 1 điểm', '100k = 1 điểm', '100k = 1 điểm'],
        },
        {
          label: 'Quy đổi điểm lấy Voucher tiền mặt',
          values: ['10 điểm = 50k', '10 điểm = 50k', '10 điểm = 50k', '10 điểm = 50k'],
        },
        {
          label: 'Thời hạn duy trì hạng & điểm thưởng',
          values: ['365 ngày', '365 ngày', '365 ngày', '365 ngày'],
        },
      ],
    },
  ]

  // 4 Câu hỏi thường gặp thực tế
  const faqs = [
    {
      q: 'Chương trình Hội viên có mất phí hay bắt buộc không?',
      a: 'Hoàn toàn không mất phí và 100% tự nguyện. Bạn chỉ tham gia khi chủ động xác thực số điện thoại bằng mã OTP. Không có popup ép buộc hay tự động đăng ký ngầm.',
    },
    {
      q: 'Điểm thưởng được tích lũy như thế nào?',
      a: 'Cứ mỗi 100.000đ giá trị thanh toán tiền hàng thực trả (sau khi trừ mọi chiết khấu, không gồm phí ship), bạn nhận được 1 điểm thưởng ngay khi đơn hàng chuyển sang trạng thái Đã Giao Thành Công.',
    },
    {
      q: 'Cách quy đổi điểm lấy voucher tiền mặt?',
      a: 'Cứ mỗi 10 điểm thưởng tích lũy, bạn có thể quy đổi thành 1 Voucher trị giá 50.000đ (áp dụng cho mọi đơn hàng từ 0đ, hạn sử dụng 90 ngày). Khi đổi điểm, hệ thống gửi mã OTP xác thực để bảo vệ quyền sở hữu.',
    },
    {
      q: 'Ưu đãi hạng có cộng dồn với chuyển khoản VietQR 10% không?',
      a: 'Có! Giảm giá theo hạng thành viên (5%, 10%, 15%) được áp dụng trực tiếp trên tiền hàng và vẫn được áp dụng đồng thời chiết khấu thêm 10% khi quý khách chọn thanh toán Chuyển khoản VietQR tự động.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C201A] font-sans antialiased selection:bg-[#631521] selection:text-white">
      <Header onOpenCart={() => setCartOpen(true)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-[#2C201A] via-[#382820] to-[#2C201A] text-white overflow-hidden">
        {/* Ánh sáng vàng kim trang trí */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#631521]/30 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>QuanNguyenS Privileged Club</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto"
          >
            Đặc Quyền Hội Viên
            <span className="block text-[#D4AF37] italic font-normal text-2xl sm:text-4xl lg:text-5xl mt-2 font-serif">
              Hành Trình Tri Ân & Tinh Tế
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto mt-4 font-light leading-relaxed"
          >
            Mỗi lựa chọn gắn bó cùng QuanNguyenS đều được trân trọng. Tích lũy điểm thưởng tự động, tận hưởng mức giảm đến <strong>15%</strong> trọn năm và những món quà kỷ niệm độc quyền.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#631521] hover:bg-[#7D1B2A] text-white border border-[#D4AF37]/50 rounded-[2px] font-sans text-xs font-bold uppercase tracking-[0.18em] shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              <span>Đăng Ký Hội Viên Ngay</span>
            </button>

            <a
              href="#bang-so-sanh-quyen-loi"
              className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 rounded-[2px] font-sans text-xs font-bold uppercase tracking-wider transition-colors text-center"
            >
              Xem Bảng Quyền Lợi
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── TIERS COMPARISON SECTION (HỆ THỐNG BẢNG SO SÁNH QUYỀN LỢI) ─── */}
      <section id="bang-so-sanh-quyen-loi" className="py-16 md:py-24 max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#631521] block mb-1">
              Hạng Bậc & Quyền Lợi
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1A1614]">
              Bảng So Sánh Đặc Quyền 4 Hạng
            </h2>
          </div>

          {/* Toggle Chế độ xem: Dạng Bảng (Table) vs Dạng Thẻ (Cards) */}
          <div className="inline-flex items-center p-1 bg-white border border-[#E8DFD5] rounded-[4px] shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#631521] text-white shadow-xs'
                  : 'text-[#4A3F38] hover:text-[#631521]'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Dạng Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[2px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#631521] text-white shadow-xs'
                  : 'text-[#4A3F38] hover:text-[#631521]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dạng Thẻ</span>
            </button>
          </div>
        </div>

        {/* ─── HIỂN THỊ DẠNG BẢNG (TABLE VIEW - MẶC ĐỊNH) ─── */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-sm overflow-hidden">
            {/* Thanh cuộn ngang hỗ trợ mobile */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                {/* Header Bảng: 4 Hạng Thành Viên */}
                <thead>
                  <tr className="border-b border-[#E8DFD5] bg-[#FAF8F5]">
                    <th className="px-5 pt-10 pb-6 w-[28%] text-xs font-bold uppercase tracking-wider text-[#8C7E74] align-top">
                      <div className="pt-3">Đặc Quyền / Hạng Bậc</div>
                    </th>
                    {tiersData.map((t) => (
                      <th
                        key={t.id}
                        className={`px-3 pt-10 pb-6 w-[18%] text-center transition-colors relative align-top ${
                          t.isTop
                            ? 'bg-gradient-to-b from-[#FFF5F6] to-[#FAF8F5] border-x border-[#F2B8B5]'
                            : ''
                        }`}
                      >
                        {t.isTop && (
                          <span className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#631521] text-[#D4AF37] px-3 py-1 rounded-b-[4px] text-[9.5px] font-bold uppercase tracking-wider shadow-xs whitespace-nowrap z-10">
                            Đặc Quyền Cao Nhất
                          </span>
                        )}
                        <div className="flex flex-col items-center">
                          <div className="mb-2.5">
                            <TierBadge tier={t.id} size="md" />
                          </div>
                          <h3 className="font-serif text-base font-bold text-[#1A1614] mb-2 leading-tight">
                            {t.name}
                          </h3>
                          <span className="inline-block font-mono text-xs font-bold text-[#631521] bg-white px-2.5 py-1 rounded-[2px] border border-[#E8DFD5] shadow-2xs">
                            {t.spendNum > 0 ? formatVND(t.spendNum) : '0đ'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body Bảng: Nhóm từng quyền lợi khoa học */}
                <tbody className="divide-y divide-[#F0EAE1] text-xs">
                  {comparisonSections.map((section, sIdx) => (
                    <Fragment key={sIdx}>
                      {/* Tiêu đề nhóm tiêu chí */}
                      <tr className="bg-[#FAF5F0] border-t-2 border-[#E8DFD5]">
                        <td
                          colSpan={5}
                          className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#631521]"
                        >
                          {section.title}
                        </td>
                      </tr>

                      {/* Các dòng so sánh */}
                      {section.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-[#FAF8F5] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-[#1A1614] font-medium">
                            <span className="block font-semibold text-xs text-[#2C201A]">
                              {row.label}
                            </span>
                          </td>

                          {row.values.map((val, vIdx) => {
                            const isDiamondCol = vIdx === 3
                            return (
                              <td
                                key={vIdx}
                                className={`px-4 py-3.5 text-center font-mono ${
                                  isDiamondCol ? 'bg-[#FFF9FA]/60 border-x border-[#F8D7DA]' : ''
                                }`}
                              >
                                {typeof val === 'boolean' ? (
                                  val ? (
                                    <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </div>
                                  ) : (
                                    <Minus className="w-4 h-4 text-[#D1D5DB] mx-auto" />
                                  )
                                ) : row.isDiscount ? (
                                  <strong className="font-serif text-sm font-bold text-[#631521] block">
                                    {val}
                                  </strong>
                                ) : row.isGold ? (
                                  <strong className="text-[#B45309] font-bold">
                                    {val}
                                  </strong>
                                ) : val === '—' ? (
                                  <span className="text-[#9CA3AF]">—</span>
                                ) : (
                                  <span className="text-[#2C201A] font-semibold">
                                    {val}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── HIỂN THỊ DẠNG THẺ (CARDS VIEW) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {tiersData.map((t) => (
              <div
                key={t.id}
                className={`rounded-[4px] border p-6 flex flex-col justify-between transition-all relative ${
                  t.isTop
                    ? 'bg-gradient-to-b from-[#FAF8F5] via-white to-[#FDF2F4] border-[#631521] shadow-md ring-1 ring-[#631521]'
                    : 'bg-white border-[#E8DFD5] hover:border-[#D4AF37] hover:shadow-2xs'
                }`}
              >
                {t.isTop && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#631521] text-[#D4AF37] px-3.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-widest border border-[#D4AF37]/50 shadow-xs whitespace-nowrap z-10">
                    Đặc Quyền Cao Nhất
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <TierBadge tier={t.id} size="md" />
                    <span className="font-mono text-xs font-bold text-[#631521] bg-[#FAF5F0] px-2.5 py-0.5 rounded-[2px] border border-[#E8DFD5]">
                      {t.spendNum > 0 ? formatVND(t.spendNum) : '0đ'}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#1A1614] mb-1">
                    {t.name}
                  </h3>
                  <p className="text-xs text-[#8C7E74] mb-4 leading-relaxed">
                    {t.desc}
                  </p>

                  <div className="space-y-2.5 pt-3.5 border-t border-[#E8DFD5] text-xs">
                    <div>
                      <span className="text-[#8C7E74] block text-[10.5px] uppercase tracking-wider">
                        Giảm giá trực tiếp:
                      </span>
                      <strong className="text-sm font-serif font-bold text-[#631521]">
                        {t.discountText}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#8C7E74] block text-[10.5px] uppercase tracking-wider">
                        Voucher thăng hạng:
                      </span>
                      <strong className="text-[#1A1614]">{t.upgradeVoucher}</strong>
                    </div>

                    <div>
                      <span className="text-[#8C7E74] block text-[10.5px] uppercase tracking-wider">
                        Quà tặng sinh nhật:
                      </span>
                      <strong className="text-[#B45309]">{t.birthdayVoucher}</strong>
                    </div>

                    <div>
                      <span className="text-[#8C7E74] block text-[10.5px] uppercase tracking-wider">
                        Tích & Đổi điểm:
                      </span>
                      <span className="text-[#2C201A] font-medium">100k = 1đ · 10đ = 50k</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#E8DFD5]">
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
        )}
      </section>

      {/* ─── 3 BƯỚC ĐƠN GIẢN ─── */}
      <section className="py-14 bg-[#FAF5F0] border-y border-[#E8DFD5]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#631521] block mb-1">
              Quy Trình Hoạt Động
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614]">
              3 Bước Tích Điểm & Đổi Thưởng Đơn Giản
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37] block mb-2">01</span>
              <h3 className="font-serif text-base font-bold text-[#1A1614] mb-1.5">
                Đăng Ký & Nhận Diện
              </h3>
              <p className="text-xs text-[#4A3F38] leading-relaxed">
                Đăng ký chỉ bằng số điện thoại và xác nhận OTP một lần. Mọi đơn hàng đặt bằng số điện thoại này sẽ được hệ thống tự động ghi nhận tích điểm.
              </p>
            </div>

            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37] block mb-2">02</span>
              <h3 className="font-serif text-base font-bold text-[#1A1614] mb-1.5">
                Tích Lũy 100k = 1 Điểm
              </h3>
              <p className="text-xs text-[#4A3F38] leading-relaxed">
                Mỗi 100.000đ giá trị hàng thực trả sẽ được quy đổi thành 1 điểm thưởng ngay khi đơn hàng chuyển sang trạng thái Đã Giao Thành Công (Delivered).
              </p>
            </div>

            <div className="bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-2xs">
              <span className="font-mono text-3xl font-bold text-[#D4AF37] block mb-2">03</span>
              <h3 className="font-serif text-base font-bold text-[#1A1614] mb-1.5">
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
      <section className="py-16 md:py-20 max-w-2xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <HelpCircle className="w-7 h-7 text-[#631521] mx-auto mb-2" />
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
                <span className="font-serif font-bold text-xs sm:text-sm text-[#1A1614]">
                  {f.q}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-[#8C7E74] transition-transform shrink-0 ${
                    activeFaq === idx ? 'rotate-90 text-[#631521]' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-0 text-xs text-[#4A3F38] leading-relaxed border-t border-[#F0EAE1]">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Modal Đăng Ký (Không dùng alert) */}
      <LoyaltyRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => {
          window.location.reload()
        }}
      />

      <Section12Footer />
    </div>
  )
}
