import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, FileText, RotateCcw, Phone, Mail } from 'lucide-react'
import { policiesData } from '../../data/policies'

export default function PolicyModal({ isOpen, onClose, initialPolicy = 'terms' }) {
  const [activeTab, setActiveTab] = useState(initialPolicy)

  // Ensure current active tab aligns if initialPolicy changes on open
  const currentKey = policiesData[activeTab] ? activeTab : 'terms'
  const policy = policiesData[currentKey]

  const tabs = [
    { key: 'terms', label: 'Điều Khoản & Điều Kiện', icon: FileText },
    { key: 'privacy', label: 'Chính Sách Bảo Mật', icon: ShieldCheck },
    { key: 'return', label: 'Chính Sách Đổi Trả', icon: RotateCcw },
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label={policy?.title}
          className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-[#FAF8F5] border border-[#D4AF37]/40 shadow-2xl rounded-[4px] flex flex-col overflow-hidden text-[#1A1614]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#631521] text-white border-b border-[#D4AF37]/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37] shrink-0 shadow-sm">
                <img
                  src="/images/logo.jpg"
                  alt="QuanNguyenS Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-serif text-base sm:text-lg font-bold tracking-wider text-[#FAF8F5] uppercase block">
                  Chính Sách & Quy Định QuanNguyenS
                </span>
                <span className="text-[10px] tracking-[0.2em] text-[#D4AF37] uppercase font-light -mt-0.5 block">
                  European Casual Luxury
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="text-white/70 hover:text-[#D4AF37] transition-colors p-1.5 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Policy Navigation Tabs */}
          <div className="flex border-b border-[#E8DFD5] bg-[#F5F0EB] overflow-x-auto shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = currentKey === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 font-serif text-xs sm:text-sm font-bold tracking-wider transition-all whitespace-nowrap border-b-2 -mb-[1px] ${
                    isActive
                      ? 'border-[#631521] text-[#631521] bg-[#FAF8F5]'
                      : 'border-transparent text-[#8C7E74] hover:text-[#631521] hover:bg-[#FAF8F5]/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#631521]' : 'text-[#8C7E74]'}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Policy Content Area */}
          <div className="flex-1 overflow-y-auto pdp-scrollbar p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#E8DFD5] pb-4">
              <span className="font-serif text-xs font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-1">
                {policy?.lastUpdated}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1614] tracking-tight">
                {policy?.title}
              </h2>
              <p className="font-sans text-sm font-light italic text-[#8C7E74] mt-1">
                {policy?.subtitle}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {policy?.sections.map((section, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[3px] border border-[#E8DFD5] shadow-xs">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#631521] mb-3">
                    {section.heading}
                  </h3>
                  <ul className="space-y-2.5">
                    {section.content.map((line, lineIdx) => (
                      <li key={lineIdx} className="flex items-start gap-2.5 font-sans text-xs sm:text-sm font-light text-[#4A3F38] leading-relaxed">
                        <span className="text-[#D4AF37] font-bold mt-0.5 shrink-0">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Contact Box in Policy */}
            <div className="bg-[#F5F0EB] p-5 rounded-[3px] border border-[#E8DFD5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-serif text-sm font-bold text-[#1A1614]">
                  Cần hỗ trợ thêm về chính sách hoặc đơn hàng?
                </p>
                <p className="font-sans text-xs text-[#8C7E74] mt-0.5">
                  Bộ phận CSKH của QuanNguyenS sẵn sàng phục vụ 24/7
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="tel:0981753082"
                  className="inline-flex items-center gap-1.5 bg-[#631521] text-[#FAF8F5] hover:bg-[#4A0D17] px-4 py-2 rounded-[2px] font-sans text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>0981 753 082</span>
                </a>
                <a
                  href="mailto:ducquan16102006@gmail.com"
                  className="inline-flex items-center gap-1.5 bg-white text-[#1A1614] border border-[#E8DFD5] hover:border-[#631521] px-4 py-2 rounded-[2px] font-sans text-xs font-medium transition-all"
                >
                  <Mail className="w-3.5 h-3.5 text-[#631521]" />
                  <span>Email CSKH</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer of Modal */}
          <div className="px-6 py-3.5 bg-[#FAF8F5] border-t border-[#E8DFD5] flex items-center justify-between shrink-0">
            <span className="font-sans text-xs text-[#8C7E74] font-light">
              © 2026 QuanNguyenS — European Casual Luxury
            </span>
            <button
              onClick={onClose}
              className="bg-[#2C201A] text-white hover:bg-[#631521] font-sans font-bold text-xs uppercase tracking-wider px-6 py-2 rounded-[2px] transition-all"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
