import React, { useState, useEffect, useRef } from 'react'
import { X, Send, RotateCcw, Sparkles, MessageSquare, HeartHandshake } from 'lucide-react'
import MessageList from './MessageList'
import FeedbackView from './FeedbackView'

const INITIAL_WELCOME = {
  id: 'msg_welcome',
  role: 'assistant',
  content:
    'Dạ em chào anh/chị ạ! Em là Trợ lý QNS Chat của QuanNguyenS. Em rất vui được hỗ trợ anh/chị chọn size vừa vặn, tư vấn chất liệu các bộ sleepwear hoặc ưu đãi tốt nhất hôm nay ạ.\n\nAnh/chị đang quan tâm đến mẫu sleepwear cho dịp nào để em tư vấn nhé?',
  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
}

const DEFAULT_QUICK_REPLIES = [
  'Tư vấn chọn size',
  'Phí ship & Đổi trả',
  'Ưu đãi đang có',
  'Gặp chủ shop',
]

export default function ChatPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('qns_chat_messages')
      return saved ? JSON.parse(saved) : [INITIAL_WELCOME]
    } catch {
      return [INITIAL_WELCOME]
    }
  })

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [quickReplies, setQuickReplies] = useState(DEFAULT_QUICK_REPLIES)
  const [showFeedback, setShowFeedback] = useState(false)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Lưu lịch sử vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('qns_chat_messages', JSON.stringify(messages))
    } catch (e) {}
  }, [messages])

  // Focus input khi mở chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Lắng nghe phím ESC và cử chỉ Back của điện thoại để thoát chat
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    // Tạo history state tạm để khi bấm Back trên điện thoại thì thoát chat bot thay vì thoát khỏi website
    const stateKey = 'qns_chatbot_open'
    try {
      window.history.pushState({ [stateKey]: true }, '')
    } catch (_) {}

    const handlePopState = () => {
      onClose()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('popstate', handlePopState)
      try {
        if (window.history.state?.[stateKey]) {
          window.history.back()
        }
      } catch (_) {}
    }
  }, [isOpen, onClose])

  // Reset cuộc trò chuyện mới
  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_WELCOME,
        id: `msg_welcome_${Date.now()}`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setQuickReplies(DEFAULT_QUICK_REPLIES)
    setShowFeedback(false)
    sessionStorage.removeItem('qns_chat_messages')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Tiếp nhận thông báo khi khách gửi thành công ý kiến / phàn nàn / yêu cầu
  const handleFeedbackSubmitted = ({ type, name, phone }) => {
    const typeMap = {
      suggestion: 'đóng góp ý kiến',
      complaint: 'phàn nàn / khiếu nại',
      request: 'yêu cầu riêng',
    }
    const typeText = typeMap[type] || 'ý kiến'
    const botMsg = {
      id: `msg_fb_${Date.now()}`,
      role: 'assistant',
      content: `Dạ em xin chân thành cảm ơn ${name || 'anh/chị'} đã gửi ${typeText}! Ban Quản Trị QuanNguyenS đã tiếp nhận và sẽ liên hệ hỗ trợ chu đáo qua số ${phone} ạ.`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, botMsg])
    setShowFeedback(false)
  }

  // Gửi tin nhắn với độ trễ tối thiểu 2 giây như nhân viên thật đang soạn
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || isTyping) return

    const userMsg = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Tạo độ trễ tự nhiên tối thiểu 2 giây như nhân viên thật đang đọc và gõ câu trả lời
    const startTime = Date.now()
    const ensureDelay = async () => {
      const elapsed = Date.now() - startTime
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed))
      }
    }

    const normQuery = query.toLowerCase()
    if (query === 'Gặp chủ shop' || normQuery.includes('gặp chủ shop') || normQuery.includes('gap chu shop')) {
      await ensureDelay()
      const botMsg = {
        id: `msg_b_${Date.now()}`,
        role: 'assistant',
        content:
          'Dạ em hiểu ạ! Em xin phép kết nối anh/chị ngay cùng chủ shop QuanNguyenS để được hỗ trợ chu đáo nhất qua Zalo hoặc gọi hotline bên dưới nhé ạ.',
        handoff: {
          active: true,
          zalo: 'https://zalo.me/0973 486 218',
          tel: 'tel:0973 486 218',
          phoneDisplay: '0973 486 218',
        },
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
      return
    }

    // Tạo sessionId ngẫu nhiên nếu chưa có
    let sessionId = sessionStorage.getItem('qns_chat_session_id')
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      sessionStorage.setItem('qns_chat_session_id', sessionId)
    }

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: query,
          history: historyPayload,
        }),
        signal: AbortSignal.timeout(8000),
      })

      const data = await res.json()
      await ensureDelay()

      if (res.ok && data.success) {
        const botMsg = {
          id: `msg_b_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          product: data.product || null,
          handoff: data.handoff || null,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }

        setMessages((prev) => [...prev, botMsg])
        if (data.quickReplies && Array.isArray(data.quickReplies)) {
          setQuickReplies(data.quickReplies)
        }
      } else {
        const botMsg = {
          id: `msg_b_err_${Date.now()}`,
          role: 'assistant',
          content:
            'Dạ em sẵn sàng hỗ trợ anh/chị chọn size, xem mẫu hoặc kết nối ngay cùng chủ shop QuanNguyenS qua Zalo (0973 486 218) nhé ạ!',
          handoff: {
            active: true,
            zalo: 'https://zalo.me/0973 486 218',
            tel: 'tel:0973 486 218',
            phoneDisplay: '0973 486 218',
          },
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botMsg])
      }
    } catch (err) {
      await ensureDelay()
      const botMsg = {
        id: `msg_b_net_err_${Date.now()}`,
        role: 'assistant',
        content:
          'Dạ mạng có chút chập chờn, anh/chị có thể bấm Chat Zalo hoặc gọi hotline 0973 486 218 để chủ shop hỗ trợ ngay tức thì nhé ạ!',
        handoff: {
          active: true,
          zalo: 'https://zalo.me/0973 486 218',
          tel: 'tel:0973 486 218',
          phoneDisplay: '0973 486 218',
        },
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
    } finally {
      setIsTyping(false)
    }
  }

  // Tóm tắt hội thoại gần nhất cho form Handoff
  const recentConversationText = messages
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'Khách' : 'Bot'}: ${m.content}`)
    .join('\n')

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Khung trò chuyện QNS Chat"
      className="w-full sm:w-[355px] h-[100dvh] sm:h-[520px] bg-[#FAF8F5] sm:border sm:border-[#E8DFD5] sm:rounded-[6px] shadow-2xl flex flex-col overflow-hidden text-[#2C201A]"
    >
      {/* ── HEADER ────────────────────────────────────────── */}
      <div
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        }}
        className="bg-[#631521] text-[#FAF8F5] pb-3 px-3.5 sm:pt-3 sm:pb-3 flex items-center justify-between border-b border-[#D4AF37]/40 shrink-0 select-none shadow-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37] shadow-sm shrink-0">
            <img
              src="/images/logo.jpg"
              alt="QuanNguyenS Monogram Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xs sm:text-sm font-bold tracking-wider text-white truncate">
                QNS Chat
              </h3>
              {/* Mục đóng góp ý kiến, phàn nàn & yêu cầu (thay thế chấm xanh) */}
              <button
                type="button"
                onClick={() => setShowFeedback((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-sans font-medium border transition-all cursor-pointer shadow-xs shrink-0 ${
                  showFeedback
                    ? 'bg-[#D4AF37] text-[#631521] border-[#D4AF37] font-semibold'
                    : 'bg-white/15 hover:bg-white/25 text-[#FAF8F5] hover:text-[#D4AF37] border-white/20'
                }`}
                title="Đóng góp ý kiến, phàn nàn & yêu cầu của bạn"
                aria-label="Mở mục đóng góp ý kiến, phàn nàn và yêu cầu"
              >
                <HeartHandshake className="w-3 h-3 text-[#D4AF37]" />
                <span className="hidden sm:inline">Góp ý & Khiếu nại</span>
                <span className="sm:hidden">Góp ý</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResetChat}
            className="p-1.5 text-[#FAF8F5]/80 hover:text-white hover:bg-white/10 active:scale-95 rounded-full transition-colors cursor-pointer"
            title="Bắt đầu cuộc trò chuyện mới"
            aria-label="Làm mới hội thoại"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-full border border-white/25 transition-all cursor-pointer shadow-xs flex items-center justify-center"
            title="Đóng chat (Esc)"
            aria-label="Đóng chat"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── NỘI DUNG CHÍNH (GÓP Ý HOẶC TRÒ CHUYỆN) ─────────── */}
      {showFeedback ? (
        <FeedbackView
          onClose={() => setShowFeedback(false)}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      ) : (
        <>
          {/* ── DANH SÁCH TIN NHẮN ────────────────────────────── */}
          <MessageList
            messages={messages}
            isTyping={isTyping}
            onProductSelect={() => {
              if (window.innerWidth < 640) onClose()
            }}
            recentConversationText={recentConversationText}
          />

          {/* ── QUICK REPLIES ─────────────────────────────────── */}
          {quickReplies.length > 0 && !isTyping && (
            <div className="px-3 py-1.5 bg-[#FAF8F5] border-t border-[#E8DFD5]/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {quickReplies.map((qr, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(qr)}
                  className="text-[11px] font-sans font-medium px-2.5 py-1 bg-white hover:bg-[#631521] text-[#631521] hover:text-[#FAF8F5] border border-[#E8DFD5] hover:border-[#631521] rounded-full transition-all duration-150 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* ── INPUT BAR ─────────────────────────────────────── */}
          <div
            style={{
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
            }}
            className="p-3 bg-white border-t border-[#E8DFD5] shrink-0"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về size, chất liệu, voucher..."
                maxLength={500}
                disabled={isTyping}
                className="flex-1 text-base sm:text-xs font-sans px-3.5 py-2 bg-[#FAF8F5] border border-[#E8DFD5] rounded-full focus:outline-none focus:border-[#631521] focus:bg-white text-[#2C201A] transition-colors disabled:opacity-50"
                aria-label="Nhập câu hỏi cho QNS Chat"
              />

              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-8 h-8 rounded-full bg-[#631521] text-[#FAF8F5] flex items-center justify-center hover:bg-[#4A0D17] transition-all disabled:opacity-40 disabled:hover:bg-[#631521] cursor-pointer shrink-0 shadow-xs"
                aria-label="Gửi tin nhắn"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
