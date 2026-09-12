import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Send,
  Users,
  CheckCircle2,
  Gift,
  Ticket,
  Eye,
  Edit3,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

export default function AdminBroadcastPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalAccounts: 0,
    verifiedAccounts: 0,
    verifiedWithEmail: 0,
    totalVouchers: 0,
    usedVouchers: 0,
  })
  const [recentBroadcasts, setRecentBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState('compose') // 'compose' | 'preview'

  // Form state
  const [broadcastType, setBroadcastType] = useState('Sản Phẩm Mới')
  const [subject, setSubject] = useState('BST Thu Đông 2026 chính thức mở bán — Ưu đãi độc quyền dành riêng cho bạn')
  const [content, setContent] = useState(
`Kính gửi Quý khách hàng thân mến của QuanNguyenS,

Chúng tôi rất hân hạnh được giới thiệu đến bạn Bộ sưu tập Lụa Pyjama Thu Đông 2026 với 3 thiết kế chủ đạo:
1. THE DAYBREAK SET — Sọc Hồng thanh lịch, trẻ trung
2. THE STILLWATER SET — Caro Navy trầm tĩnh, quý phái
3. THE HEARTH SET — Sọc Nâu ấm áp, sang trọng

Tất cả sản phẩm đều được dệt may từ chất liệu lụa satin tự nhiên cao cấp, mang lại cảm giác mềm mại, thoáng mát tuyệt đối trên làn da.

Hãy ghé thăm website quannguyens.vn ngay hôm nay để khám phá và chọn cho mình bộ Pyjama hoàn hảo nhất!

Nếu bạn có bất kỳ câu hỏi nào về bảng size hoặc chất liệu, đừng ngần ngại liên hệ hotline 0981 753 082 để được tư vấn tận tâm.`
  )

  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [sendResult, setSendResult] = useState(null)
  const [error, setError] = useState(null)

  // Tải thống kê
  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/broadcast/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats || {})
        setRecentBroadcasts(data.recentBroadcasts || [])
      }
    } catch {
      setError('Không thể tải thống kê từ máy chủ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Xử lý gửi thông báo
  const handleSendBroadcast = async () => {
    if (!adminPassword) {
      setError('Vui lòng nhập mật khẩu quản trị để xác nhận gửi')
      return
    }

    setIsSending(true)
    setError(null)
    setSendResult(null)

    try {
      // Chuyển dòng xuống thành <p> hoặc <br> cho email HTML
      const htmlBody = content
        .split('\n\n')
        .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.7;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('')

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: adminPassword,
          subject,
          contentHtml: htmlBody,
          broadcastType,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gửi broadcast thất bại')
      }

      setSendResult(data)
      setConfirmModalOpen(false)
      setAdminPassword('')
      fetchStats()
    } catch (err) {
      setError(err.message || 'Lỗi gửi broadcast')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] font-sans">
      {/* ── HEADER QUẢN TRỊ ───────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E8DFD5] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src="/images/logo.jpg"
              alt="Logo QuanNguyenS"
              className="w-9 h-9 rounded-full border border-[#D4AF37] object-cover"
            />
            <div>
              <span className="font-serif text-sm font-bold text-[#631521] uppercase tracking-wider block">
                QuanNguyenS Admin
              </span>
              <span className="text-[10px] text-[#8C7E74] tracking-widest uppercase">
                Hệ thống Quản trị & Broadcast
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-2">
            <Link
              to="/admin/orders"
              className="px-3 py-1.5 text-xs font-semibold text-[#4A3F38] hover:text-[#631521] hover:bg-[#FAF5F0] rounded-[2px] transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quản Lý Đơn Hàng</span>
            </Link>

            <span className="px-3 py-1.5 text-xs font-bold bg-[#631521] text-white rounded-[2px] shadow-xs flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Gửi Broadcast Email</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── THỐNG KÊ TỔNG QUAN ─────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614]">
              Gửi Thông Báo Cho Khách Hàng (Broadcast)
            </h1>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="text-xs text-[#631521] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới thống kê</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white p-4 rounded-[3px] border border-[#E8DFD5] shadow-xs">
              <div className="flex items-center justify-between text-[#8C7E74] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Tổng Tài Khoản</span>
                <Users className="w-4 h-4 text-[#631521]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#1A1614]">
                {stats.totalAccounts}
              </div>
              <p className="text-[11px] text-[#8C7E74] mt-1">Đã đăng ký qua Web</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-4 rounded-[3px] border border-[#E8DFD5] shadow-xs">
              <div className="flex items-center justify-between text-[#8C7E74] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Đã Xác Minh Email</span>
                <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#2E7D32]">
                {stats.verifiedWithEmail}
              </div>
              <p className="text-[11px] text-[#8C7E74] mt-1">Sẵn sàng nhận thông báo</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-4 rounded-[3px] border border-[#E8DFD5] shadow-xs">
              <div className="flex items-center justify-between text-[#8C7E74] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Voucher Đã Cấp</span>
                <Gift className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#1A1614]">
                {stats.totalVouchers}
              </div>
              <p className="text-[11px] text-[#8C7E74] mt-1">Voucher Chào Mừng 10%</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-4 rounded-[3px] border border-[#E8DFD5] shadow-xs">
              <div className="flex items-center justify-between text-[#8C7E74] mb-1">
                <span className="text-xs font-medium uppercase tracking-wider">Voucher Đã Dùng</span>
                <Ticket className="w-4 h-4 text-[#631521]" />
              </div>
              <div className="font-serif text-2xl font-bold text-[#631521]">
                {stats.usedVouchers}
              </div>
              <p className="text-[11px] text-[#8C7E74] mt-1">Đã hoàn tất đơn hàng</p>
            </div>
          </div>
        </div>

        {/* ── THÔNG BÁO KẾT QUẢ NẾU CÓ ────────────────────────────── */}
        {sendResult && (
          <div className="p-4 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[3px] text-[#2E7D32] text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gửi thông báo thành công!</p>
              <p className="text-xs mt-0.5">{sendResult.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#631521]/10 border border-[#631521]/30 rounded-[3px] text-[#631521] text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Lỗi khi thao tác:</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── SOẠN THẢO THÔNG BÁO & LIVE PREVIEW ─────────────────── */}
        <div className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-sm overflow-hidden">
          {/* Tabs bar */}
          <div className="flex border-b border-[#E8DFD5] bg-[#FAF8F5]">
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'compose'
                  ? 'border-[#631521] text-[#631521] bg-white'
                  : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Soạn Thảo Thông Báo</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-[#631521] text-[#631521] bg-white'
                  : 'border-transparent text-[#8C7E74] hover:text-[#1A1614]'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Xem Trước Email (Live Preview)</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'compose' ? (
              <div className="space-y-6 max-w-3xl">
                {/* Loại thông báo */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                    Loại Thông Báo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      'Sản Phẩm Mới',
                      'Livestream Sắp Diễn Ra',
                      'Ưu Đãi Đặc Quyền',
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBroadcastType(t)}
                        className={`p-3 text-xs font-semibold rounded-[2px] border text-left transition-all cursor-pointer ${
                          broadcastType === t
                            ? 'border-[#631521] bg-[#FAF5F0] text-[#631521] shadow-xs ring-1 ring-[#631521]'
                            : 'border-[#E8DFD5] bg-white text-[#4A3F38] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tiêu đề */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                    Tiêu Đề Email (Subject) <span className="text-[#631521]">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Nhập tiêu đề email..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] text-sm text-[#1A1614] focus:bg-white focus:outline-none focus:border-[#631521]"
                  />
                  <p className="text-[11px] text-[#8C7E74] mt-1">
                    Tiêu đề hấp dẫn, gợi sự tò mò và đúng giọng điệu Quiet Luxury của thương hiệu.
                  </p>
                </div>

                {/* Nội dung */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1.5">
                    Nội Dung Thông Báo <span className="text-[#631521]">*</span>
                  </label>
                  <textarea
                    rows={10}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Soạn nội dung gửi tới khách hàng..."
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] text-sm text-[#1A1614] focus:bg-white focus:outline-none focus:border-[#631521] leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-[#8C7E74] mt-1">
                    Mỗi đoạn văn cách nhau bằng một dòng trống. Hệ thống sẽ tự động định dạng thành email thanh lịch kèm chữ ký của Quân.
                  </p>
                </div>

                {/* Action Row */}
                <div className="pt-4 border-t border-[#E8DFD5] flex items-center justify-between flex-wrap gap-4">
                  <div className="text-xs text-[#8C7E74] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    <span>
                      Sẽ gửi tới <strong>{stats.verifiedWithEmail} khách hàng</strong> đã xác minh email.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className="px-4 py-2.5 border border-[#E8DFD5] hover:border-[#631521] text-xs font-semibold rounded-[2px] transition-colors cursor-pointer"
                    >
                      Xem Trước
                    </button>

                    <button
                      type="button"
                      disabled={stats.verifiedWithEmail === 0 || !subject.trim() || !content.trim()}
                      onClick={() => setConfirmModalOpen(true)}
                      className="px-6 py-2.5 bg-[#631521] hover:bg-[#4A0D17] text-[#FAF8F5] text-xs font-bold uppercase tracking-wider rounded-[2px] shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Gửi Thông Báo Ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* LIVE PREVIEW */
              <div className="max-w-2xl mx-auto">
                <div className="border border-[#D4AF37] rounded-[4px] overflow-hidden shadow-sm bg-[#FAF8F5]">
                  {/* Header preview */}
                  <div className="bg-gradient-to-b from-[#4A0D17] to-[#631521] p-6 text-center border-b-2 border-[#D4AF37]">
                    <span className="font-serif text-xl font-bold text-white tracking-[0.15em] uppercase block">
                      QuanNguyenS
                    </span>
                    <span className="text-[10px] text-[#D4AF37] tracking-[0.25em] uppercase block mt-1">
                      {broadcastType}
                    </span>
                  </div>

                  {/* Body preview */}
                  <div className="p-8 text-sm text-[#3A3535] leading-relaxed space-y-4">
                    <h2 className="font-serif text-lg font-bold text-[#631521] pb-2 border-b border-[#E8DFD5]">
                      {subject || '(Chưa có tiêu đề)'}
                    </h2>

                    <div className="space-y-3 whitespace-pre-line text-[13.5px]">
                      {content || '(Chưa có nội dung)'}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[#E8DFD5] italic text-[#631521] text-xs">
                      Trân trọng,<br />
                      <strong className="font-semibold text-sm">Quân Nguyễn</strong> — Sáng lập thương hiệu QuanNguyenS
                    </div>
                  </div>

                  {/* Footer preview */}
                  <div className="bg-[#F5EFE6] p-5 text-center text-xs text-[#8C7E74] border-t border-[#E8DFD5] space-y-1">
                    <p className="font-semibold text-[#631521]">QuanNguyenS — Lụa Tơ Tằm & Pyjama Thiết Kế</p>
                    <p>Hotline: 0981 753 082 · Amber Riverside, 622 Minh Khai, Hà Nội</p>
                    <p className="text-[10.5px] text-[#A89F91] mt-2">
                      Bạn nhận được thông báo này vì đã đăng ký thành viên tại website QuanNguyenS.
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="text-xs text-[#631521] font-semibold hover:underline cursor-pointer"
                  >
                    ← Quay lại chỉnh sửa nội dung
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── LỊCH SỬ CÁC ĐỢT GỬI GẦN ĐÂY ────────────────────────── */}
        <div className="bg-white rounded-[4px] border border-[#E8DFD5] p-6 shadow-sm">
          <h3 className="font-serif text-base font-bold text-[#1A1614] mb-3">
            Nhật Ký Các Đợt Gửi Trước Đó
          </h3>

          {recentBroadcasts.length === 0 ? (
            <p className="text-xs text-[#8C7E74] py-4 text-center italic">
              Chưa có đợt gửi thông báo nào được thực hiện.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DFD5] text-[#8C7E74] uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Tiêu đề</th>
                    <th className="py-2.5 px-3 text-right">Số người nhận</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {recentBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 px-3 text-[#8C7E74]">
                        {new Date(b.sent_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1A1614]">
                        {b.subject}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#631521]">
                        {b.recipients_count} email
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] rounded-[2px] font-semibold text-[10px]">
                          ✓ Đã gửi
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL XÁC NHẬN MẬT KHẨU GỬI ──────────────────────────── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#D4AF37] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#631521]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-lg font-bold">
                Xác Nhận Phát Hành Broadcast
              </h3>
            </div>

            <p className="text-xs text-[#4A3F38] leading-relaxed">
              Bạn đang chuẩn bị gửi email <strong>"{subject}"</strong> tới{' '}
              <strong>{stats.verifiedWithEmail} khách hàng</strong> đã xác minh tài khoản.
            </p>

            <div className="bg-[#FAF5F0] p-3 border border-[#D4AF37]/50 rounded-[2px] text-[11px] text-[#631521]">
              💡 Hệ thống sẽ tự động giãn cách 150ms giữa các lượt gửi để đảm bảo an toàn hạn mức của tài khoản Gmail.
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                Mật Khẩu Quản Trị Admin
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Nhập mật khẩu admin..."
                autoFocus
                className="w-full px-3 py-2 border border-[#E8DFD5] rounded-[2px] text-sm focus:outline-none focus:border-[#631521]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#8C7E74] hover:bg-[#F5EFE6] rounded-[2px] cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={isSending || !adminPassword}
                onClick={handleSendBroadcast}
                className="px-5 py-2 bg-[#631521] hover:bg-[#4A0D17] text-white text-xs font-bold uppercase tracking-wider rounded-[2px] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>ĐANG GỬI...</span>
                  </>
                ) : (
                  <span>XÁC NHẬN GỬI NGAY</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
