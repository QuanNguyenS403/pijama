import React, { useEffect, useRef } from 'react'
import { Sparkles, User } from 'lucide-react'
import HandoffCard from './HandoffCard'
import ProductCard from './ProductCard'

export default function MessageList({ messages, isTyping, onProductSelect, recentConversationText }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const formatMessageText = (text) => {
    if (!text) return null
    // Tách dòng để render đẹp
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />
      }
      return (
        <p key={idx} className="leading-relaxed mb-0.5 last:mb-0">
          {line}
        </p>
      )
    })
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-3.5 focus:outline-none"
      aria-live="polite"
      tabIndex={0}
      role="region"
      aria-label="Lịch sử hội thoại với trợ lý ảo"
    >
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user'

        return (
          <div
            key={msg.id || index}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {!isUser ? (
              <div
                className="w-7 h-7 rounded-full overflow-hidden border border-[#D4AF37] shadow-xs shrink-0"
                title="Trợ lý ảo QuanNguyenS"
              >
                <img
                  src="/images/logo.jpg"
                  alt="QuanNguyenS Assistant"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-[#E8DFD5] border border-[#D8CFC5] flex items-center justify-center shrink-0"
                title="Khách hàng"
              >
                <User className="w-3.5 h-3.5 text-[#4A3F38]" />
              </div>
            )}

            {/* Message Bubble */}
            <div className={`max-w-[82%] text-xs font-sans ${isUser ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-3 rounded-[6px] shadow-xs ${
                  isUser
                    ? 'bg-[#631521] text-[#FAF8F5] rounded-tr-[1px]'
                    : 'bg-white border border-[#E8DFD5] text-[#2C201A] rounded-tl-[1px]'
                }`}
              >
                {formatMessageText(msg.content)}
              </div>

              {/* Thẻ sản phẩm nếu có */}
              {msg.product && (
                <ProductCard product={msg.product} onSelect={onProductSelect} />
              )}

              {/* Thẻ Handoff nếu có tín hiệu kết nối chủ shop */}
              {msg.handoff && (
                <HandoffCard
                  handoff={msg.handoff}
                  recentConversation={recentConversationText}
                />
              )}

              {/* Timestamp nhỏ mờ */}
              {msg.time && (
                <span className="inline-block mt-1 text-[10px] text-[#8C7E74] opacity-80 px-1">
                  {msg.time}
                </span>
              )}
            </div>
          </div>
        )
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#D4AF37] shrink-0 shadow-xs">
            <img
              src="/images/logo.jpg"
              alt="QuanNguyenS Assistant"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 bg-white border border-[#E8DFD5] rounded-[6px] rounded-tl-[1px] shadow-xs flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#631521] animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#631521] animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#631521] animate-bounce" />
            <span className="text-[10px] text-[#8C7E74] ml-1 font-sans">Trợ lý đang soạn câu trả lời...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
