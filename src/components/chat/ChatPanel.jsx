import React, { useState, useEffect, useRef } from 'react'
import { X, Send, RotateCcw, Sparkles, MessageSquare } from 'lucide-react'
import MessageList from './MessageList'

const INITIAL_WELCOME = {
  id: 'msg_welcome',
  role: 'assistant',
  content:
    'Dạ em chào anh/chị ạ! Em là Trợ lý ảo của QuanNguyenS. Em có thể hỗ trợ anh/chị chọn size vừa vặn, tư vấn chất liệu các mẫu pijama hoặc thông tin phí ship và ưu đãi đang có.\n\nAnh/chị đang quan tâm đến bộ pijama cho dịp nào ạ?',
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

  // Lắng nghe phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
    sessionStorage.removeItem('qns_chat_messages')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Gửi tin nhắn
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

    // Tối ưu tốc độ phản hồi 0ms cho yêu cầu kết nối chủ shop
    const normQuery = query.toLowerCase()
    if (query === 'Gặp chủ shop' || normQuery.includes('gặp chủ shop') || normQuery.includes('gap chu shop')) {
      const botMsg = {
        id: `msg_b_${Date.now()}`,
        role: 'assistant',
        content:
          'Dạ em hiểu ạ! Em xin phép kết nối anh/chị ngay cùng chủ shop QuanNguyenS để được hỗ trợ chu đáo nhất qua Zalo, gọi điện trực tiếp hoặc để lại số điện thoại em xin liên hệ lại ngay nhé ạ.',
        handoff: {
          active: true,
          zalo: 'https://zalo.me/0981753082',
          tel: 'tel:0981753082',
          phoneDisplay: '0981 753 082',
        },
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
      return
    }

    setIsTyping(true)

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
        signal: AbortSignal.timeout(5000),
      })

      const data = await res.json()

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
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_b_err_${Date.now()}`,
            role: 'assistant',
            content:
              'Dạ em sẵn sàng hỗ trợ anh/chị chọn size, xem mẫu hoặc kết nối ngay cùng chủ shop QuanNguyenS qua Zalo (0981 753 082) nhé ạ!',
            handoff: {
              active: true,
              zalo: 'https://zalo.me/0981753082',
              tel: 'tel:0981753082',
              phoneDisplay: '0981 753 082',
            },
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_b_net_err_${Date.now()}`,
          role: 'assistant',
          content:
            'Dạ mạng có chút chập chờn, anh/chị có thể bấm Chat Zalo hoặc gọi hotline 0981 753 082 để chủ shop hỗ trợ ngay tức thì nhé ạ!',
          handoff: {
            active: true,
            zalo: 'https://zalo.me/0981753082',
            tel: 'tel:0981753082',
            phoneDisplay: '0981 753 082',
          },
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
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
      aria-label="Khung trò chuyện với trợ lý ảo QuanNguyenS"
      className="w-full sm:w-[355px] h-[100dvh] sm:h-[520px] bg-[#FAF8F5] sm:border sm:border-[#E8DFD5] sm:rounded-[6px] shadow-2xl flex flex-col overflow-hidden text-[#2C201A]"
    >
      {/* ── HEADER ────────────────────────────────────────── */}
      <div className="bg-[#631521] text-[#FAF8F5] p-3 px-3.5 flex items-center justify-between border-b border-[#D4AF37]/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D4AF37] shadow-sm shrink-0">
            <img
              src="/images/logo.jpg"
              alt="QuanNguyenS Monogram Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                QuanNguyenS Assistant
              </h3>
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" title="Sẵn sàng 24/7" />
            </div>
            <p className="font-sans text-[10px] text-[#FAF8F5]/80">
              Trợ lý ảo tư vấn thời trang & CSKH 24/7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleResetChat}
            className="p-1.5 text-[#FAF8F5]/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Bắt đầu cuộc trò chuyện mới"
            aria-label="Làm mới hội thoại"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#FAF8F5]/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Đóng khung chat (Esc)"
            aria-label="Đóng cửa sổ chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>


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
      <div className="p-3 bg-white border-t border-[#E8DFD5] shrink-0">
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
            aria-label="Nhập câu hỏi cho trợ lý ảo"
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
    </div>
  )
}
