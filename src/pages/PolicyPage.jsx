import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  FileText,
  RotateCcw,
  Truck,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { policiesData } from '../data/policies'

export default function PolicyPage() {
  const location = useLocation()
  const [cartOpen, setCartOpen] = useState(false)

  // Đọc tab từ search param (?tab=...) hoặc hash (#...)
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    if (tabParam && policiesData[tabParam]) return tabParam
    const hash = location.hash.replace('#', '')
    if (hash && policiesData[hash]) return hash
    return 'privacy'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  useEffect(() => {
    const tab = getInitialTab()
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.search, location.hash])

  const tabs = [
    { key: 'privacy', label: 'Chính Sách Bảo Mật', icon: ShieldCheck, subtitle: 'Bảo vệ dữ liệu & Tuân thủ Google API' },
    { key: 'terms', label: 'Điều Khoản Dịch Vụ', icon: FileText, subtitle: 'Quy chế hoạt động & Cam kết' },
    { key: 'return', label: 'Chính Sách Đổi Trả Hàng', icon: RotateCcw, subtitle: '30 ngày đổi trả minh bạch' },
    { key: 'shipping', label: 'Chính Sách Giao Hàng', icon: Truck, subtitle: 'Vận chuyển toàn quốc Viettel Post' },
  ]

  const currentPolicy = policiesData[activeTab] || policiesData.privacy

  return (
    <div className="bg-[#FAF8F5] text-[#1A1614] min-h-screen font-sans flex flex-col selection:bg-[#D4AF37] selection:text-[#2C201A]">
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <Header onCartOpen={() => setCartOpen(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-20">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E8DFD5]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C7E74] hover:text-[#631521] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang Chủ</span>
          </Link>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8C7E74]">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="font-serif font-bold text-[#631521]">QuanNguyenS Legal & Compliance</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#D4AF37] uppercase block mb-2">
            TRUNG TÂM PHÁP LÝ & BẢO MẬT DỮ LIỆU
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            Chính Sách & Điều Khoản
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#8C7E74] mt-2">
            Cam kết minh bạch thông tin, tôn trọng quyền riêng tư khách hàng và tuân thủ tuyệt đối Chính sách Dữ liệu Người dùng Google API.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-10 p-1.5 bg-[#F5F0EB] rounded-[4px] border border-[#E8DFD5]">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key)
                  window.history.replaceState(null, '', `/chinh-sach?tab=${tab.key}`)
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-[3px] text-xs font-bold transition-all cursor-pointer text-center ${
                  isActive
                    ? 'bg-[#631521] text-white shadow-sm'
                    : 'text-[#4A3F38] hover:text-[#631521] hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-[#8C7E74]'}`} />
                <span className="leading-tight">{tab.label}</span>
              </button>
            )
          })}
        </div>


        {/* Policy Content Card */}
        <div className="bg-white p-6 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-xs">
          <div className="border-b border-[#E8DFD5] pb-6 mb-8">
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-[#D4AF37] uppercase block mb-1">
              VĂN BẢN QUY PHẠM NỘI BỘ
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614]">
              {currentPolicy.title}
            </h2>
            <p className="text-xs text-[#8C7E74] mt-1">{currentPolicy.subtitle}</p>
            <div className="inline-block mt-3 px-2.5 py-1 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] text-[11px] font-medium text-[#631521]">
              {currentPolicy.lastUpdated}
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-8">
            {currentPolicy.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1614] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#631521]" />
                  {section.heading}
                </h3>
                <div className="space-y-2 pl-3.5 border-l-2 border-[#E8DFD5]">
                  {section.content.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className="font-sans text-xs sm:text-sm text-[#4A3F38] leading-relaxed font-normal"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Box at Footer of Policy */}
          <div className="mt-12 p-6 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px]">
            <h4 className="font-serif text-base font-bold text-[#631521] mb-2">
              Bộ phận Tiếp nhận & Xử lý Khiếu nại Quyền Riêng Tư
            </h4>
            <p className="text-xs text-[#8C7E74] mb-4 leading-relaxed">
              Nếu bạn có bất kỳ thắc mắc nào về chính sách bảo mật, muốn xóa toàn bộ thông tin cá nhân khỏi hệ thống, xin vui lòng liên hệ ngay với chúng tôi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#2C201A]">
              <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E8DFD5] rounded-[2px]">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href="mailto:quannguyens403@gmail.com" className="hover:text-[#631521] truncate font-medium">
                  quannguyens403@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E8DFD5] rounded-[2px]">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <a href="tel:0981753082" className="hover:text-[#631521] font-medium">
                  0981 753 082 (Hỗ trợ 24/7)
                </a>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white border border-[#E8DFD5] rounded-[2px]">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span className="truncate">Minh Khai, Hai Bà Trưng, Hà Nội</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
