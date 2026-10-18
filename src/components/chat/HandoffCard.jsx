import React, { useState } from 'react'
import { Phone, MessageCircle, Send, CheckCircle2, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'

export default function HandoffCard({ handoff, recentConversation = '', onSubmitted }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [topic, setTopic] = useState('Tư vấn chọn size & mẫu')
  const [preferredTime, setPreferredTime] = useState('Càng sớm càng tốt')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const zaloUrl = handoff?.zalo || 'https://zalo.me/0981753082'
  const telUrl = handoff?.tel || 'tel:0981753082'
  const phoneDisplay = handoff?.phoneDisplay || '0981 753 082'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanPhone = phone.trim().replace(/[\s.-]/g, '')
    if (!/^(?:0|\+84)(?:3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(cleanPhone)) {
      setErrorMessage('Vui lòng nhập số điện thoại Việt Nam gồm 10 số (ví dụ 0981753082)')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/chat/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          topic,
          preferredTime,
          recentConversation,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSubmitSuccess(true)
        if (onSubmitted) onSubmitted(data.message)
      } else {
        setErrorMessage(data.error || 'Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline trực tiếp.')
      }
    } catch (err) {
      setErrorMessage('Không thể kết nối máy chủ. Vui lòng gọi trực tiếp hotline 0981 753 082 ạ!')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-3 p-3.5 bg-[#FAF8F5] border border-[#D4AF37]/40 rounded-[4px] shadow-sm">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#E8DFD5]">
        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <span className="font-serif text-xs font-bold text-[#631521] uppercase tracking-wider">
          Kênh Kết Nối Chủ Shop QuanNguyenS
        </span>
      </div>

      <p className="font-sans text-xs text-[#4A3F38] mb-3 leading-relaxed">
        Anh/chị có thể trò chuyện trực tiếp cùng chủ shop qua các kênh dưới đây để được hỗ trợ nhanh nhất:
      </p>

      {/* 2 Nút Kết Nối Trực Tiếp Nhanh */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0068FF] text-white rounded-[2px] font-sans text-xs font-bold hover:bg-[#0052cc] transition-colors shadow-xs"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chat Zalo</span>
        </a>

        <a
          href={telUrl}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#631521] text-[#FAF8F5] rounded-[2px] font-sans text-xs font-bold hover:bg-[#4A0D17] transition-colors shadow-xs"
        >
          <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Gọi {phoneDisplay}</span>
        </a>
      </div>

      {/* Nút bật form để lại SĐT */}
      <div className="pt-2 border-t border-[#E8DFD5]/80">
        {!showForm && !submitSuccess && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-between text-left py-1 px-1 text-xs font-sans text-[#631521] hover:text-[#4A0D17] font-semibold transition-colors cursor-pointer"
          >
            <span>📝 Hoặc để lại SĐT để chủ shop gọi lại</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {showForm && !submitSuccess && (
          <form onSubmit={handleSubmit} className="mt-2 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="font-sans text-[11px] font-bold text-[#2C201A] uppercase tracking-wide">
                Để lại thông tin gọi lại
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[#8C7E74] hover:text-[#631521] p-1 cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder="Họ tên của anh/chị (tùy chọn)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px] focus:outline-none focus:border-[#631521] text-[#2C201A]"
              />
            </div>

            <div>
              <input
                type="tel"
                required
                placeholder="Số điện thoại (bắt buộc, ví dụ: 0981753082)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
                className="w-full text-xs font-sans px-2.5 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px] focus:outline-none focus:border-[#631521] text-[#2C201A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-[11px] font-sans px-2 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px] focus:outline-none focus:border-[#631521] text-[#2C201A]"
              >
                <option value="Tư vấn chọn size & mẫu">Tư vấn size & mẫu</option>
                <option value="Hỏi tiến độ đơn hàng">Hỏi tiến độ đơn</option>
                <option value="Yêu cầu đổi trả">Yêu cầu đổi trả</option>
                <option value="Đặt may số lượng lớn">Đặt số lượng lớn</option>
              </select>

              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="text-[11px] font-sans px-2 py-1.5 bg-white border border-[#E8DFD5] rounded-[2px] focus:outline-none focus:border-[#631521] text-[#2C201A]"
              >
                <option value="Càng sớm càng tốt">Càng sớm càng tốt</option>
                <option value="Trong giờ hành chính">Giờ hành chính</option>
                <option value="Buổi tối (18h - 21h)">Buổi tối (18h-21h)</option>
              </select>
            </div>

            {errorMessage && (
              <p className="font-sans text-[11px] text-[#E11D48] leading-tight mt-1">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-3 bg-[#631521] text-[#FAF8F5] rounded-[2px] font-sans text-xs font-bold hover:bg-[#4A0D17] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi yêu cầu gọi lại</span>
                </>
              )}
            </button>
          </form>
        )}

        {submitSuccess && (
          <div className="mt-2 p-2 bg-[#E8F5E9] border border-[#2E7D32]/30 rounded-[2px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
            <p className="font-sans text-xs text-[#1B5E20] leading-relaxed">
              Em đã chuyển thông tin tới chủ shop, anh/chị sẽ được liên hệ sớm qua số <b>{phone}</b> nhé ạ!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
