// src/components/shipping/ViettelPostTracker.jsx
// Thành phần hiển thị trực tiếp hành trình vận chuyển Viettel Post trên website

import { useState } from 'react'
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Package,
  PhoneCall,
  AlertCircle,
} from 'lucide-react'

export default function ViettelPostTracker({ trackingData, onRefresh }) {
  const [copied, setCopied] = useState(false)

  if (!trackingData) return null

  const {
    trackingCode,
    carrierName = 'Tổng Công ty Cổ phần Bưu chính Viettel (Viettel Post)',
    currentStatus = 'Đang giao hàng',
    currentStatusCode = 'SHIPPED',
    postOffice = 'Bưu cục Viettel Post 622 Minh Khai, Hai Bà Trưng, Hà Nội',
    hotline = '1900 8095',
    expectedDelivery = '24–48 giờ làm việc',
    journey = [],
    officialTrackingUrl,
    order,
  } = trackingData

  const handleCopyCode = () => {
    if (!trackingCode) return
    navigator.clipboard.writeText(trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isDelivered = currentStatusCode === 'DELIVERED'
  const isCancelled = currentStatusCode === 'CANCELLED'

  return (
    <div className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-xs overflow-hidden font-sans text-xs">
      {/* ── HEADER BANNER: VIETTEL POST ── */}
      <div className="bg-[#EE0033] text-white p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-white text-[#EE0033] font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                VIETTEL POST LIVE
              </span>
              <span className="flex items-center gap-1 text-[11px] text-white/90">
                <span className="w-2 h-2 rounded-full bg-[#A5D6A7] animate-pulse" />
                Trực tuyến
              </span>
            </div>

            <h3 className="font-serif text-base sm:text-lg font-bold text-white tracking-wide">
              {currentStatus}
            </h3>
            <p className="text-white/80 text-[11px] mt-0.5 font-light">
              {carrierName}
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">
              Mã vận đơn
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="font-mono font-bold text-sm sm:text-base text-white tracking-wider">
                {trackingCode || 'Đang cập nhật'}
              </span>
              {trackingCode && (
                <button
                  onClick={handleCopyCode}
                  className="bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors cursor-pointer"
                  title="Sao chép mã bưu tá"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#A5D6A7]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── THÔNG TIN XỬ LÝ NHANH ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E8DFD5] bg-[#FAF8F5] border-b border-[#E8DFD5]">
        <div className="p-3 sm:p-3.5">
          <span className="text-[10px] text-[#8C7E74] uppercase tracking-wider block font-semibold">
            Bưu cục tiếp nhận:
          </span>
          <span className="font-medium text-[#1A1614] text-[11.5px] mt-0.5 block truncate" title={postOffice}>
            {postOffice}
          </span>
        </div>

        <div className="p-3 sm:p-3.5">
          <span className="text-[10px] text-[#8C7E74] uppercase tracking-wider block font-semibold">
            Dự kiến phát hàng:
          </span>
          <span className="font-medium text-[#2E7D32] text-[11.5px] mt-0.5 block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {expectedDelivery}
          </span>
        </div>

        <div className="p-3 sm:p-3.5">
          <span className="text-[10px] text-[#8C7E74] uppercase tracking-wider block font-semibold">
            Tổng đài Viettel Post:
          </span>
          <a
            href={`tel:${hotline.replace(/\s/g, '')}`}
            className="font-bold text-[#EE0033] text-[11.5px] mt-0.5 block hover:underline flex items-center gap-1"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            {hotline} (Miễn phí)
          </a>
        </div>
      </div>

      {/* ── TIMELINE HÀNH TRÌNH BƯU KIỆN ── */}
      <div className="p-4 sm:p-5">
        <h4 className="font-serif text-xs font-bold text-[#1A1614] uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-[#EE0033]" />
          Nhật ký hành trình bưu gửi (Viettel Post Real-time)
        </h4>

        {journey.length === 0 ? (
          <div className="p-4 text-center text-[#8C7E74] bg-[#FAF8F5] rounded border border-dashed border-[#E8DFD5]">
            Đang đồng bộ dữ liệu lộ trình từ máy chủ Viettel Post...
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E8DFD5]">
            {journey.map((step, idx) => {
              const isCurrent = idx === journey.length - 1
              const isCompleted = step.completed || isCurrent

              return (
                <div key={idx} className="relative">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isCompleted
                        ? 'border-[#EE0033] bg-[#EE0033] text-white'
                        : 'border-[#D9CFC4] bg-white'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D9CFC4]" />
                    )}
                  </div>

                  {/* Step Content */}
                  <div>
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <span
                        className={`font-semibold text-xs ${
                          isCurrent ? 'text-[#EE0033] font-bold' : 'text-[#1A1614]'
                        }`}
                      >
                        {step.status}
                      </span>
                      <span className="text-[11px] text-[#8C7E74] font-mono">
                        {step.time}
                      </span>
                    </div>

                    {step.location && (
                      <p className="text-[11px] text-[#4A3F38] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#8C7E74] shrink-0" />
                        <span>{step.location}</span>
                      </p>
                    )}

                    {step.note && (
                      <p className="text-[10.5px] text-[#8C7E74] mt-0.5 italic">
                        {step.note}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="p-3 sm:p-4 bg-[#FAF8F5] border-t border-[#E8DFD5] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-[#2E7D32]">
          <ShieldCheck className="w-4 h-4" />
          <span>Hành trình tự động đồng bộ trực tiếp từ bưu tá Viettel Post</span>
        </div>
      </div>
    </div>
  )
}
