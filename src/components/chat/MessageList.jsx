import React, { useEffect, useRef } from 'react'
import { Sparkles, User } from 'lucide-react'
import HandoffCard from './HandoffCard'
import ProductCard from './ProductCard'

export default function MessageList({ messages, isTyping, onProductSelect, recentConversationText }) {
  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const lastBotMsgRef = useRef(null)

  // Cô lập hoàn toàn sự kiện lăn chuột (wheel) bên trong khung chat để con lăn hoạt động trơn tru
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.stopPropagation()
    }

    el.addEventListener('wheel', handleWheel, { passive: true })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Cuộn thông minh: Khi bot trả lời văn bản dài, đưa đầu câu trả lời vào tầm nhìn để khách đọc tự nhiên
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const lastMsg = messages[messages.length - 1]
      const containerEl = containerRef.current
      const botEl = lastBotMsgRef.current

      if (isTyping) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        return
      }

      if (lastMsg?.role === 'assistant' && botEl && containerEl) {
        const botHeight = botEl.offsetHeight
        const containerHeight = containerEl.clientHeight

        // Nếu câu trả lời của bot dài (vượt quá 50% khung chat), cuộn mượt tới đầu câu trả lời để khách đọc từ đầu
        if (botHeight > containerHeight * 0.5) {
          const targetScrollTop = Math.max(0, botEl.offsetTop - 12)
          containerEl.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
          return
        }
      }

      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => cancelAnimationFrame(rafId)
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
      ref={containerRef}
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      className="flex-1 overflow-y-auto p-4 space-y-3.5 focus:outline-none overscroll-contain qns-chat-scrollbar chat-scroll-container touch-pan-y"
      aria-live="polite"
      tabIndex={0}
      role="region"
      aria-label="Lịch sử hội thoại với trợ lý QuanNguyenS"
    >
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user'
        const isLastAssistant = !isUser && index === messages.length - 1

        return (
          <div
            key={msg.id || index}
            ref={isLastAssistant ? lastBotMsgRef : null}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {!isUser ? (
              <div
                className="w-7 h-7 rounded-full overflow-hidden border border-[#D4AF37] shadow-xs shrink-0"
                title="Trợ lý QuanNguyenS"
              >
                <img
                  src="/images/logo.jpg"
                  alt="QNS Chat"
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
              alt="QNS Chat"
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
