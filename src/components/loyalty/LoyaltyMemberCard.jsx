import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Gift,
  Award,
  Clock,
  TrendingUp,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Lock,
  UserCheck,
  LogOut,
  Info,
} from 'lucide-react'
import { TierBadge, TierPill } from './LoyaltyBadges'
import LoyaltyRegisterModal from './LoyaltyRegisterModal'
import LoyaltyRedeemModal from './LoyaltyRedeemModal'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function LoyaltyMemberCard({ onRefresh, customerPhone = '' }) {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isOptOutConfirmOpen, setIsOptOutConfirmOpen] = useState(false)
  const [optOutReason, setOptOutReason] = useState('')
  const [optOutSubmitting, setOptOutSubmitting] = useState(false)

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/loyalty/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success && data.member) {
        setMember(data.member)
      } else {
        setMember(null)
      }
    } catch (e) {
      console.warn('Could not fetch loyalty data:', e)
      setMember(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoyaltyData()
  }, [])

  const handleCopyCode = (code) => {
    if (!code) return
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleOptOut = async () => {
    setOptOutSubmitting(true)
    try {
      const res = await fetch('/api/loyalty/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: optOutReason || 'Khách hàng chủ động yêu cầu đóng' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMember(null)
        setIsOptOutConfirmOpen(false)
        if (onRefresh) onRefresh()
      } else {
        alert(data.error || 'Không thể đóng tài khoản hội viên.')
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ.')
    } finally {
      setOptOutSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[4px] border border-[#E8DFD5] shadow-xs animate-pulse">
        <div className="h-6 bg-[#FAF5F0] rounded w-1/3 mb-4" />
        <div className="h-20 bg-[#FAF8F5] rounded mb-4" />
        <div className="h-10 bg-[#FAF5F0] rounded w-1/2" />
      </div>
    )
  }

  /* ───────────────────────────────────────────────────────────── */
  /* CASE 1: CHƯA ĐĂNG KÝ HỘI VIÊN (MỜI TỰ NGUYỆN, KHÔNG ÉP)      */
  /* ───────────────────────────────────────────────────────────── */
  if (!member) {
    return (
      <>
        <div className="bg-gradient-to-br from-[#2C201A] to-[#1A1614] text-white p-6 sm:p-8 rounded-[4px] border border-[#D4AF37]/40 shadow-luxury relative overflow-hidden">
          {/* Subtle gold glow */}
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <TierBadge tier="MEMBER" size="sm" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                  QuanNguyenS Privileged Club
                </span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                Chương Trình Đặc Quyền Hội Viên
              </h3>
              <p className="text-xs text-white/75 font-light leading-relaxed">
                Đăng ký hoàn toàn <strong>tự nguyện</strong> qua số điện thoại xác thực OTP. Tích lũy điểm tự động cho mọi đơn hàng thành công, hưởng ưu đãi giảm giá lên đến <strong>15%</strong> và đổi điểm lấy voucher tiền mặt.
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-[11px] text-[#D4AF37]/90 font-medium">
                <span>✦ 100.000đ = 1 điểm</span>
                <span>✦ 10 điểm = Voucher 50.000đ</span>
                <span>✦ 4 Hạng quyền lợi</span>
                <span>✦ Quà tặng sinh nhật</span>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="w-full md:w-auto px-6 py-3.5 bg-[#631521] hover:bg-[#7D1B2A] text-white border border-[#D4AF37]/50 rounded-[2px] font-sans text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Đăng Ký Hội Viên</span>
              </button>
            </div>
          </div>
        </div>

        <LoyaltyRegisterModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          initialPhone={customerPhone}
          onSuccess={() => {
            fetchLoyaltyData()
            if (onRefresh) onRefresh()
          }}
        />
      </>
    )
  }

  /* ───────────────────────────────────────────────────────────── */
  /* CASE 2: ĐÃ LÀ HỘI VIÊN — BẢNG ĐIỀU KHIỂN ĐẶC QUYỀN VÀ SỔ CÁI  */
  /* ───────────────────────────────────────────────────────────── */
  const currentTier = member.tier || 'MEMBER'
  const rollingSpend = member.rollingSpend365 || 0
  const rewardPoints = member.rewardPoints || 0
  const pendingPoints = member.pendingPoints || 0
  const nextTier = member.nextTier
  const vouchers = member.vouchers || []
  const recentLedger = member.recentLedger || []

  return (
    <>
      <div className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-xs overflow-hidden">
        {/* Tier Header Strip */}
        <div className="bg-gradient-to-r from-[#2C201A] via-[#3A2C24] to-[#2C201A] text-white p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <TierBadge tier={currentTier} size="lg" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    {member.fullName || 'Hội Viên'}
                  </h3>
                  <TierPill tier={currentTier} />
                </div>
                <p className="text-xs text-white/70 font-mono mt-1">
                  SĐT: <strong>{member.phoneMasked || member.phone}</strong> · Mã TV: #{member.id.slice(0, 8)}
                </p>
                {member.birthDay && member.birthMonth && (
                  <p className="text-[11px] text-[#D4AF37] mt-0.5">
                    🎂 Sinh nhật: Ngày {member.birthDay} tháng {member.birthMonth} (Đã xác thực)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRedeemOpen(true)}
                disabled={rewardPoints < 10}
                className="px-4 py-2.5 bg-[#631521] hover:bg-[#7D1B2A] text-white border border-[#D4AF37]/50 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Gift className="w-4 h-4 text-[#D4AF37]" />
                <span>Đổi 10 Điểm = 50k</span>
              </button>
            </div>
          </div>

          {/* Tier Progress Bar */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-xs text-white/80">
              <span>
                Chi tiêu 365 ngày qua:{' '}
                <strong className="text-white font-mono">{formatVND(rollingSpend)}</strong>
              </span>
              {nextTier ? (
                <span>
                  Cần thêm{' '}
                  <strong className="text-[#D4AF37] font-mono">
                    {formatVND(nextTier.neededSpend)}
                  </strong>{' '}
                  để lên hạng <strong>{nextTier.name}</strong>
                </span>
              ) : (
                <span className="text-[#D4AF37] font-semibold">
                  👑 Bạn đang giữ hạng cao nhất (Kim Cương)
                </span>
              )}
            </div>

            {nextTier && (
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D4AF37] to-[#FFE082] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, nextTier.progressPercent))}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Points & Expiry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E8DFD5] border-b border-[#E8DFD5] bg-[#FAF8F5]">
          <div className="p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7E74] block mb-1">
              Điểm Thưởng Khả Dụng
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-[#631521]">
                {rewardPoints}
              </span>
              <span className="text-xs text-[#8C7E74]">
                ≈ {formatVND(rewardPoints * 5000)} tiền mặt
              </span>
            </div>
            <p className="text-[11px] text-[#4A3F38] mt-1">
              Dùng để đổi voucher giảm giá khi thanh toán.
            </p>
          </div>

          <div className="p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7E74] block mb-1">
              Điểm Đang Chờ Duyệt
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-[#2C201A]">
                {pendingPoints}
              </span>
              <span className="text-xs text-[#8C7E74]">điểm</span>
            </div>
            <p className="text-[11px] text-[#4A3F38] mt-1">
              Tự động cộng ngay khi đơn hàng chuyển sang trạng thái Đã Giao (Delivered).
            </p>
          </div>

          <div className="p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7E74] block mb-1">
              Thời Hạn Duy Trì
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#1A1614] font-medium mt-1">
              <Clock className="w-4 h-4 text-[#D4AF37]" />
              <span>365 ngày kể từ đơn đủ điều kiện gần nhất</span>
            </div>
            <p className="text-[11px] text-[#8C7E74] mt-1">
              Hệ thống sẽ gửi email cảnh báo trước 30 ngày nếu có điểm sắp hết hạn.
            </p>
          </div>
        </div>

        {/* Voucher Wallet Section */}
        <div className="p-6 border-b border-[#E8DFD5]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#631521]" />
              <h4 className="font-serif text-base font-bold text-[#1A1614]">
                Ví Voucher Hội Viên Của Bạn ({vouchers.length})
              </h4>
            </div>
          </div>

          {vouchers.length === 0 ? (
            <div className="p-4 bg-[#FAF8F5] border border-dashed border-[#E8DFD5] text-center rounded-[2px] text-xs text-[#8C7E74]">
              Bạn chưa có voucher hội viên nào. Tích lũy đủ 10 điểm để đổi ngay Voucher 50.000đ!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vouchers.map((v) => (
                <div
                  key={v.id || v.code}
                  className={`p-3.5 rounded-[2px] border transition-all ${
                    v.used
                      ? 'bg-[#F9FAFB] border-[#E5E7EB] opacity-60'
                      : 'bg-[#FAF5F0] border-[#D4AF37]/50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[#631521]">
                          {v.kind === 'amount'
                            ? `Giảm ${formatVND(v.discount_amount)}`
                            : `Giảm ${v.discount_percent}%`}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-[2px] ${
                            v.used
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-[#DCFCE7] text-[#16A34A]'
                          }`}
                        >
                          {v.used ? 'Đã dùng' : 'Khả dụng'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4A3F38] mt-0.5">
                        {v.source === 'points' && 'Đổi từ 10 điểm thưởng · Đơn từ 0đ'}
                        {v.source === 'birthday' && 'Quà tặng mừng sinh nhật'}
                        {v.source === 'upgrade' && 'Quà tặng thăng hạng hội viên'}
                        {(!v.source || v.source === 'welcome') && 'Voucher ưu đãi riêng'}
                      </p>
                      {v.expires_at && (
                        <p className="text-[10px] text-[#8C7E74] mt-1">
                          Hạn dùng: {new Date(v.expires_at).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>

                    {!v.used && (
                      <button
                        type="button"
                        onClick={() => handleCopyCode(v.code)}
                        className="px-2.5 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#D4AF37] text-[#631521] text-xs font-mono font-bold rounded-[2px] flex items-center gap-1 cursor-pointer shrink-0"
                        title="Sao chép mã"
                      >
                        {copiedCode === v.code ? (
                          <>
                            <Check className="w-3 h-3 text-[#16A34A]" />
                            <span className="text-[#16A34A]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{v.code}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ledger Points Activity Toggle */}
        <div className="p-6 bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-[#4A3F38]">
            <p className="font-semibold text-[#1A1614]">Sổ cái điểm minh bạch</p>
            <p className="text-[#8C7E74]">
              Mọi biến động điểm được ghi nhận bất biến trong cơ sở dữ liệu.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-bold text-[#631521] hover:underline cursor-pointer"
            >
              {showHistory ? 'Thu gọn lịch sử' : 'Xem lịch sử tích & đổi điểm'}
            </button>

            <button
              type="button"
              onClick={() => setIsOptOutConfirmOpen(true)}
              className="text-[11px] text-[#8C7E74] hover:text-[#9B1C1C] cursor-pointer"
            >
              Rời chương trình
            </button>
          </div>
        </div>

        {/* Expanded Ledger History Table */}
        {showHistory && (
          <div className="border-t border-[#E8DFD5] p-6 bg-white overflow-x-auto">
            {recentLedger.length === 0 ? (
              <p className="text-xs text-[#8C7E74] text-center">Chưa có giao dịch điểm nào.</p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E8DFD5] text-[#8C7E74] uppercase text-[10px] tracking-wider">
                    <th className="py-2 pr-3">Thời gian</th>
                    <th className="py-2 px-3">Loại giao dịch</th>
                    <th className="py-2 px-3">Biến động điểm</th>
                    <th className="py-2 px-3">Chi tiêu đủ ĐK</th>
                    <th className="py-2 pl-3">Mã đơn / Diễn giải</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {recentLedger.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-3 text-[#8C7E74]">
                        {new Date(row.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1A1614]">
                        {row.type === 'EARN' && 'Tích điểm đơn hàng'}
                        {row.type === 'REDEEM' && 'Đổi điểm lấy voucher'}
                        {row.type === 'REVERSAL' && 'Hoàn điểm hủy đơn'}
                        {row.type === 'EXPIRE' && 'Hết hạn điểm'}
                        {row.type === 'ADJUST' && 'Điều chỉnh thủ công'}
                        {row.type === 'TIER_BONUS' && 'Thưởng thăng hạng'}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-bold font-mono ${
                          row.points_delta > 0
                            ? 'text-[#16A34A]'
                            : row.points_delta < 0
                            ? 'text-[#631521]'
                            : 'text-[#8C7E74]'
                        }`}
                      >
                        {row.points_delta > 0 ? `+${row.points_delta}` : row.points_delta}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#4A3F38]">
                        {row.spend_delta ? formatVND(row.spend_delta) : '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-[#8C7E74]">
                        {row.order_id ? `#${row.order_id}` : ''} {row.reason || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      <LoyaltyRedeemModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        member={member}
        onSuccess={() => {
          fetchLoyaltyData()
          if (onRefresh) onRefresh()
        }}
      />

      {/* Opt-out Confirmation Modal */}
      {isOptOutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-[4px] border border-[#E8DFD5] shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#9B1C1C]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-serif text-lg font-bold">Xác Nhận Rời Chương Trình</h4>
            </div>
            <p className="text-xs text-[#4A3F38] leading-relaxed">
              Khi rời chương trình: Toàn bộ điểm thưởng hiện có và hạng quyền lợi sẽ bị hủy. Thông tin cá nhân của bạn sẽ được ẩn danh theo chính sách bảo mật dữ liệu. (Dữ liệu hóa đơn kế toán vẫn được lưu trữ theo quy định pháp luật).
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3F38] mb-1">
                Lý do rời chương trình (Tùy chọn)
              </label>
              <textarea
                value={optOutReason}
                onChange={(e) => setOptOutReason(e.target.value)}
                placeholder="Ví dụ: Không có nhu cầu tích điểm..."
                rows={2}
                className="w-full p-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOptOutConfirmOpen(false)}
                className="px-4 py-2 border border-[#E8DFD5] text-xs font-semibold rounded-[2px] text-[#4A3F38]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={optOutSubmitting}
                onClick={handleOptOut}
                className="px-4 py-2 bg-[#9B1C1C] hover:bg-[#7D1B1B] text-white text-xs font-bold rounded-[2px]"
              >
                {optOutSubmitting ? 'Đang xử lý...' : 'Xác Nhận Rời Chương Trình'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
