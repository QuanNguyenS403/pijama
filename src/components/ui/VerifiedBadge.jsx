import { BadgeCheck } from 'lucide-react'

export default function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-badge-text">
      <BadgeCheck className="w-3 h-3 text-badge-text" />
      Đã xác minh mua hàng
    </span>
  )
}
