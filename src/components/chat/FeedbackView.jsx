import React, { useState } from 'react'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  HeartHandshake,
  ShieldCheck,
  Phone,
  User,
  Package,
} from 'lucide-react'

const TABS = [
  {
    id: 'suggestion',
    label: 'Góp ý',
    icon: Lightbulb,
    title: 'Đóng Góp Ý Kiến Cải Tiến',
    placeholder: 'Quý khách mong muốn QuanNguyenS cải tiến điều gì về thiết kế, chất liệu, phom dáng hoặc trải nghiệm dịch vụ?...',
  },
  {
    id: 'complaint',
    label: 'Phàn nàn / Khiếu nại',
    icon: AlertTriangle,
    title: 'Phàn Nàn & Khiếu Nại Dịch Vụ',
    placeholder: 'Xin quý khách mô tả cụ thể vấn đề gặp phải về đơn hàng, chất lượng sản phẩm hoặc thái độ phục vụ để Ban Quản Trị xử lý ngay lập tức...',
  },
  {
    id: 'request',
    label: 'Yêu cầu riêng',
    icon: HeartHandshake,
    title: 'Yêu Cầu / Nguyện Vọng Riêng',
    placeholder: 'Quý khách có yêu cầu gì về đặt size riêng, may đo cá nhân hóa, đóng gói hộp quà tặng cao cấp hoặc thời gian giao gấp?...',
  },
]

export default function FeedbackView({ onClose, onFeedbackSubmitted }) {
  const [activeTab, setActiveTab] = useState('suggestion')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [orderId, setOrderId] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [successInfo, setSuccessInfo] = useState(null)

  const currentTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanPhone = phone.trim().replace(/[\s.-]/g, '')
    if (!/^(?:0|\+84)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(cleanPhone)) {
      setErrorMessage('Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 0) để chúng em có thể liên hệ lại hỗ trợ chu đáo ạ.')
      return
    }

    if (content.trim().length < 5) {
      setErrorMessage('Vui lòng nhập nội dung chi tiết (tối thiểu 5 ký tự) để Ban Quản Trị thấu hiểu và phục vụ tốt nhất ạ.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: activeTab,
          name: name.trim(),
          phone: cleanPhone,
          orderId: orderId.trim(),
          content: content.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setIsSuccess(true)
        setSuccessInfo({
          type: activeTab,
          name: name.trim() || 'Quý khách',
          phone: cleanPhone,
          message: data.message,
        })
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted({
            type: activeTab,
            name: name.trim(),
            phone: cleanPhone,
            content: content.trim(),
            message: data.message,
          })
        }
      } else {
        setErrorMessage(data.error || 'Có lỗi xảy ra trong quá trình gửi. Quý khách vui lòng thử lại hoặc gọi Hotline 0973 486 218 ạ.')
      }
    } catch {
      setErrorMessage('Không thể kết nối máy chủ. Quý khách vui lòng thử lại hoặc gọi Hotline 0973 486 218 ạ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#FAF8F5] overflow-y-auto no-scrollbar">
      {/* Top Navigation */}
      <div className="bg-[#FAF5F0] border-b border-[#E8DFD5] px-3.5 py-2.5 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-sans font-medium text-[#631521] hover:text-[#4A0D17] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại chat</span>
        </button>
        <span className="font-serif text-xs font-bold text-[#631521] uppercase tracking-wider">
          Ý kiến & Nguyện vọng
        </span>
      </div>

      {isSuccess ? (
        <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="font-serif text-base font-bold text-[#631521] mb-2">
            Đã Tiếp Nhận Thành Công!
          </h4>
          <p className="font-sans text-xs text-[#5C4D44] max-w-xs mb-4 leading-relaxed">
            {successInfo?.message || 'QuanNguyenS xin chân thành cảm ơn quý khách đã tin tưởng và sẻ chia. Ban Quản Trị cam kết lắng nghe và sẽ liên hệ phản hồi chu đáo nhất ạ!'}
          </p>
          <div className="p-3 bg-[#FAF5F0] border border-[#D4AF37]/40 rounded-[4px] max-w-xs w-full text-left text-xs mb-5 font-sans">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#8C7E74]">Người gửi:</span>
              <span className="font-semibold text-[#2C201A]">{successInfo?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8C7E74]">SĐT tiếp nhận:</span>
              <span className="font-semibold text-[#631521]">{successInfo?.phone}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-[#631521] hover:bg-[#4A0D17] text-[#FAF8F5] text-xs font-sans font-bold rounded-[2px] transition-colors cursor-pointer shadow-xs"
          >
            Tiếp tục trò chuyện
          </button>
        </div>
      ) : (
        <div className="p-3.5 flex-1 flex flex-col">
          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#EFE8DF] rounded-[4px] mb-3 shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setErrorMessage('')
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-[3px] text-[11px] font-sans font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#631521] text-white shadow-xs font-semibold'
                      : 'text-[#5C4D44] hover:text-[#2C201A]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#D4AF37]' : ''}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-2.5 text-xs font-sans">
            <div>
              <p className="font-serif text-xs font-bold text-[#631521] mb-1">
                {currentTabConfig.title}
              </p>
              <p className="text-[11px] text-[#8C7E74]">
                Mỗi đóng góp, phản ánh hay yêu cầu của bạn đều được Chủ shop trực tiếp rà soát và phản hồi trong 24h.
              </p>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-[2px] text-red-700 flex items-start gap-2 text-[11px] leading-tight">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Họ và tên + Số điện thoại */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C4D44] mb-1">
                  Họ và tên (Tùy chọn)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#8C7E74] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chị Lan, Anh Nam..."
                    maxLength={60}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[3px] text-xs text-[#2C201A] focus:outline-none focus:border-[#631521]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C4D44] mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#8C7E74] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0973 486 218"
                    maxLength={15}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[3px] text-xs text-[#2C201A] focus:outline-none focus:border-[#631521]"
                  />
                </div>
              </div>
            </div>

            {/* Mã đơn hàng (nếu là phàn nàn hoặc yêu cầu) */}
            {(activeTab === 'complaint' || activeTab === 'request') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#5C4D44] mb-1">
                  Mã đơn hàng (Nếu có liên quan)
                </label>
                <div className="relative">
                  <Package className="w-3.5 h-3.5 text-[#8C7E74] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Ví dụ: QNS-123456"
                    maxLength={40}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[3px] text-xs text-[#2C201A] focus:outline-none focus:border-[#631521]"
                  />
                </div>
              </div>
            )}

            {/* Nội dung textarea */}
            <div className="flex-1 flex flex-col">
              <label className="block text-[11px] font-semibold text-[#5C4D44] mb-1">
                Nội dung chia sẻ <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={currentTabConfig.placeholder}
                maxLength={1500}
                className="w-full p-2.5 bg-white border border-[#E8DFD5] rounded-[3px] text-xs text-[#2C201A] focus:outline-none focus:border-[#631521] resize-none leading-relaxed"
              />
              <span className="text-right text-[10px] text-[#8C7E74] mt-0.5">
                {content.length}/1500 ký tự
              </span>
            </div>

            {/* Cam kết thương hiệu */}
            <div className="p-2 bg-[#FAF5F0] border-l-2 border-[#D4AF37] rounded-r-[2px] text-[10.5px] text-[#5C4D44] flex items-center gap-1.5 leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-[#631521] shrink-0" />
              <span>
                QuanNguyenS cam kết bảo mật 100% thông tin và phản hồi trực tiếp tới số điện thoại của bạn.
              </span>
            </div>

            {/* Nút gửi */}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || !phone.trim()}
              className="w-full py-2.5 px-4 bg-[#631521] hover:bg-[#4A0D17] text-[#FAF8F5] text-xs font-sans font-bold rounded-[3px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang gửi ý kiến...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Gửi tới Ban Quản Trị QuanNguyenS</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

