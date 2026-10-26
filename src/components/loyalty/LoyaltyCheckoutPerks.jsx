import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Gift, Sparkles, CheckCircle2, AlertCircle, Clock, ShieldCheck, ChevronRight, Lock } from 'lucide-react'
import { TierBadge, TierPill } from './LoyaltyBadges'
import LoyaltyRedeemModal from './LoyaltyRedeemModal'
import LoyaltyRegisterModal from './LoyaltyRegisterModal'

const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

export default function LoyaltyCheckoutPerks({
  subtotal = 0,
  paymentMethod = 'COD',
  customerPhone = '',
  appliedVoucher = null,
  onApplyVoucher,
}) {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  // Fetch member profile if available
  const fetchMember = async () => {
    try {
      const res = await fetch('/api/loyalty/me', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success && data.member) {
        setMember(data.member)
      } else {
        setMember(null)
      }
    } catch {
      setMember(null)
    }
  }

  useEffect(() => {
    fetchMember()
  }, [])

  // Call checkout preview
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/loyalty/checkout-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subtotal,
            paymentMethod,
            customerPhone,
          }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setPreview(data)
        }
      } catch (err) {
        console.warn('Checkout preview error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [subtotal, paymentMethod, customerPhone])

  const perks = preview?.perks || []
  const rewardPoints = member?.rewardPoints || preview?.member?.rewardPoints || 0
  const isPointVoucherApplied = appliedVoucher?.source === 'points' || appliedVoucher?.discountAmount === 50000

  return (
    <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-[3px] border border-[#E8DFD5] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8DFD5]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-serif text-xs font-bold text-[#631521] uppercase tracking-wider">
            Ưu Đãi Của Bạn
          </span>
        </div>

        {member ? (
          <TierPill tier={member.tier} />
        ) : (
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="text-[11px] font-semibold text-[#631521] hover:underline cursor-pointer"
          >
            Đăng ký hội viên
          </button>
        )}
      </div>

      {/* Perks List: Highlight applicable, grey out inapplicable with clear reasons */}
      <div className="space-y-2">
        {perks.map((p) => (
          <div
            key={p.code}
            className={`p-2.5 rounded-[2px] text-xs flex items-start justify-between gap-2 border transition-all ${
              p.applicable
                ? 'bg-white border-[#C8E6C9] text-[#2E7D32]'
                : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#8C7E74] opacity-80'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5">
                {p.applicable ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-[#D1D5DB] inline-block shrink-0" />
                )}
              </span>
              <div>
                <p className={`font-semibold ${p.applicable ? 'text-[#1A1614]' : 'text-[#6B7280]'}`}>
                  {p.title}
                </p>
                <p className="text-[11px] text-[#8C7E74] mt-0.5">{p.message}</p>
              </div>
            </div>

            {p.applicable && p.discountAmount > 0 && (
              <span className="font-serif font-bold text-[#2E7D32] shrink-0">
                -{formatVND(p.discountAmount)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Points Redemption Action (10 Points = 50k) */}
      {member && (
        <div className="pt-3 border-t border-[#E8DFD5]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#4A3F38]">
              Số dư điểm thưởng:{' '}
              <strong className="text-[#631521] font-mono">{rewardPoints} điểm</strong>
            </span>
            <span className="text-[11px] text-[#8C7E74]">10 điểm = 50.000đ</span>
          </div>

          {isPointVoucherApplied ? (
            <div className="p-2.5 bg-[#E8F5E9] border border-[#A5D6A7] rounded-[2px] text-xs text-[#2E7D32] flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã áp dụng Voucher 50.000đ từ điểm thưởng</span>
              </div>
              <span className="font-serif font-bold">-50.000đ</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={rewardPoints < 10 || !!appliedVoucher}
              onClick={() => setIsRedeemOpen(true)}
              className="w-full py-2 px-3 bg-white hover:bg-[#FAF5F0] border border-[#D4AF37] text-[#631521] rounded-[2px] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <Gift className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>
                {rewardPoints >= 10
                  ? appliedVoucher
                    ? 'Đã áp dụng 1 voucher khác'
                    : 'Dùng 10 điểm → Giảm 50.000đ (Yêu cầu OTP)'
                  : `Cần thêm ${10 - rewardPoints} điểm để đổi voucher`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Guest Invitation */}
      {!member && (
        <div className="pt-2 border-t border-[#E8DFD5] text-center">
          <p className="text-[11px] text-[#8C7E74]">
            Bạn là hội viên? Đơn hàng đặt với SĐT đã đăng ký sẽ tự động tích điểm sau khi giao hàng thành công.
          </p>
        </div>
      )}

      {/* Modals */}
      <LoyaltyRedeemModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        member={member}
        onSuccess={(data) => {
          if (data?.voucher && onApplyVoucher) {
            onApplyVoucher({
              ...data.voucher,
              kind: 'amount',
              discountAmount: 50000,
              code: data.voucher.code,
            })
          }
          fetchMember()
        }}
      />

      <LoyaltyRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        initialPhone={customerPhone}
        onSuccess={() => {
          fetchMember()
        }}
      />
    </div>
  )
}
