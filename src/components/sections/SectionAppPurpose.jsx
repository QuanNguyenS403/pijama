import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShoppingBag, ShieldCheck, Lock, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function SectionAppPurpose() {
  return (
    <section
      id="section-app-purpose"
      aria-label="Về ứng dụng và mục đích dịch vụ QuanNguyenS"
      className="py-16 sm:py-20 md:py-24 bg-[#F5F0EB] text-[#2C201A] border-b border-[#E8DFD5] relative overflow-hidden"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            VỀ ỨNG DỤNG & NỀN TẢNG THỜI TRANG QUANNGUYENS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Mua sắm tự do không rào cản
            <span className="block text-[#631521] italic font-normal mt-1 text-2xl sm:text-3xl md:text-4xl">
              Minh bạch mục đích sử dụng & Cam kết quyền riêng tư
            </span>
          </h2>
          <div className="w-16 h-[2px] bg-[#D4AF37] mx-auto mt-4 mb-4" />
          <p className="font-sans text-xs sm:text-sm text-[#5C4A3E] leading-relaxed">
            QuanNguyenS là nền tảng thương mại điện tử chuyên cung cấp pijama cao cấp phong cách European Casual Luxury. Chúng tôi xây dựng trải nghiệm mua sắm mở, hoàn toàn không có rào cản đăng nhập bắt buộc và tôn trọng tối đa dữ liệu người dùng.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {/* Pillar 1 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white p-7 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-5 shadow-sm">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1A1614] mb-2">
                100% Mở Cho Mọi Khách Hàng
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#4A3F38] leading-relaxed mb-4">
                Bạn có thể tự do khám phá toàn bộ bộ sưu tập, xem thông tin vải may, hướng dẫn chọn size, cho vào giỏ hàng và đặt mua trực tiếp (COD hoặc Chuyển khoản) mà <strong>hoàn toàn không bắt buộc phải tạo tài khoản hay đăng nhập</strong>.
              </p>
            </div>
            <div className="pt-3 border-t border-[#F5F0EB] text-[11px] text-[#631521] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              Không có trang đăng nhập chặn người dùng
            </div>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-7 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-5 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1A1614] mb-2">
                Mục Đích Đăng Nhập Bằng Google
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#4A3F38] leading-relaxed mb-4">
                Tính năng "Đăng nhập nhanh với Google" là <strong>tiện ích tùy chọn</strong> nhằm hỗ trợ khách hàng đăng nhập 1-chạm không cần mật khẩu, tự động lưu lịch sử đơn hàng, tra cứu bưu tá Viettel Post và nhận Voucher chào mừng giảm 10% đặc quyền thành viên VIP.
              </p>
            </div>
            <div className="pt-3 border-t border-[#F5F0EB] text-[11px] text-[#631521] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              Đăng nhập 1-chạm bảo mật, zero-password
            </div>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white p-7 sm:p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-[2px] bg-[#631521] text-[#D4AF37] flex items-center justify-center mb-5 shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#1A1614] mb-2">
                Tuân Thủ Google User Data Policy
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#4A3F38] leading-relaxed mb-4">
                Chúng tôi chỉ yêu cầu quyền cơ bản (Tên, Email, Ảnh đại diện). Tuyệt đối <strong>không bán dữ liệu, không chia sẻ cho bên thứ ba vì mục đích quảng cáo</strong>, và tuân thủ nghiêm ngặt Chính sách Dữ liệu Người dùng Dịch vụ Google API (Limited Use requirements).
              </p>
            </div>
            <div className="pt-3 border-t border-[#F5F0EB] text-[11px] text-[#631521] font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              Quyền xóa dữ liệu tài khoản bất kỳ lúc nào
            </div>
          </motion.div>
        </div>

        {/* Action Link Bar */}
        <div className="p-6 bg-white rounded-[4px] border border-[#E8DFD5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="font-serif text-base font-bold text-[#1A1614] block">
              Tìm hiểu chi tiết các cam kết pháp lý của QuanNguyenS
            </span>
            <span className="text-xs text-[#8C7E74]">
              Đầy đủ thông tin về quy trình thu thập, xử lý, bảo mật và hướng dẫn xóa dữ liệu cá nhân.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/chinh-sach?tab=privacy"
              className="inline-flex items-center gap-2 bg-[#631521] hover:bg-[#4A0D17] text-white font-sans text-xs font-bold tracking-wider px-5 py-3 rounded-[2px] transition-colors uppercase shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Chính Sách Bảo Mật</span>
            </Link>
            <Link
              to="/chinh-sach?tab=terms"
              className="inline-flex items-center gap-2 bg-[#FAF8F5] hover:bg-[#E8DFD5] text-[#2C201A] border border-[#D4AF37]/60 font-sans text-xs font-semibold tracking-wider px-4 py-3 rounded-[2px] transition-colors uppercase"
            >
              <span>Điều Khoản Dịch Vụ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
