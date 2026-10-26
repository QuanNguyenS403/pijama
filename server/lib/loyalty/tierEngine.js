// server/lib/loyalty/tierEngine.js
import { LOYALTY_TIERS, TIER_ORDER, LOYALTY_RULES } from './loyaltyConfig.js'

/**
 * Tính số điểm thưởng tích lũy từ giá trị thanh toán thực tế (A1, A2).
 * Tỷ lệ: 100.000đ = 1 điểm.
 * Làm tròn: floor(giá trị / 100.000) theo từng đơn, phần lẻ không dồn.
 */
export function calculatePointsFromSpend(spendAmount) {
  const validSpend = Math.max(0, Math.floor(Number(spendAmount) || 0))
  return Math.floor(validSpend / LOYALTY_RULES.SPEND_PER_POINT)
}

/**
 * Xác định hạng hội viên trực tiếp từ tổng chi tiêu trượt 365 ngày.
 * Pure function.
 */
export function calculateTierFromRollingSpend(rollingSpend) {
  const spend = Math.max(0, Number(rollingSpend) || 0)

  if (spend >= LOYALTY_TIERS.DIAMOND.thresholdSpend) {
    return 'DIAMOND'
  }
  if (spend >= LOYALTY_TIERS.GOLD.thresholdSpend) {
    return 'GOLD'
  }
  if (spend >= LOYALTY_TIERS.SILVER.thresholdSpend) {
    return 'SILVER'
  }
  return 'MEMBER'
}

/**
 * Lấy thông tin về hạng tiếp theo và khoảng cách chi tiêu cần đạt.
 */
export function getNextTierInfo(currentTier, rollingSpend) {
  const spend = Math.max(0, Number(rollingSpend) || 0)
  const currentIndex = TIER_ORDER.indexOf(currentTier)

  if (currentIndex === -1 || currentIndex >= TIER_ORDER.length - 1) {
    return {
      hasNextTier: false,
      nextTier: null,
      spendNeeded: 0,
      pointsNeeded: 0,
      progressPercent: 100,
    }
  }

  const nextTierKey = TIER_ORDER[currentIndex + 1]
  const nextTierConfig = LOYALTY_TIERS[nextTierKey]
  const currentTierConfig = LOYALTY_TIERS[currentTier]

  const threshold = nextTierConfig.thresholdSpend
  const spendNeeded = Math.max(0, threshold - spend)
  const pointsNeeded = Math.ceil(spendNeeded / LOYALTY_RULES.SPEND_PER_POINT)

  const range = threshold - currentTierConfig.thresholdSpend
  const progress = range > 0 ? Math.min(100, Math.max(0, Math.round(((spend - currentTierConfig.thresholdSpend) / range) * 100))) : 100

  return {
    hasNextTier: true,
    nextTier: nextTierKey,
    nextTierName: nextTierConfig.name,
    thresholdSpend: threshold,
    spendNeeded,
    pointsNeeded,
    progressPercent: progress,
  }
}

/**
 * Đánh giá trạng thái hạng và thời hạn của hội viên.
 * Nhận tham số 'now' (tiêm thời gian) để kiểm thử toàn diện mọi tình huống.
 * 
 * Quy tắc:
 * - A4: Thăng hạng ngay khi tổng chi tiêu 365 ngày đủ điều kiện.
 * - A5: Quá 365 ngày kể từ đơn cuối (hoặc ngày đăng ký) mà không có đơn mới -> hạ 1 hạng.
 * - A6: Quá 365 ngày không có đơn mới -> hết hạn toàn bộ điểm thưởng.
 */
export function evaluateMemberTierState(member, earnLedgerEntries = [], now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now)
  const nowMs = nowDate.getTime()
  const windowStartMs = nowMs - LOYALTY_RULES.TIER_WINDOW_DAYS * 24 * 60 * 60 * 1000

  // 1. Lọc các giao dịch EARN trong cửa sổ trượt 365 ngày
  let rollingSpend = 0
  let latestEarnDate = null

  const validEntries = Array.isArray(earnLedgerEntries) ? earnLedgerEntries : []
  for (const entry of validEntries) {
    if (entry.type !== 'EARN') continue
    const entryTime = new Date(entry.created_at).getTime()
    if (entryTime >= windowStartMs && entryTime <= nowMs) {
      rollingSpend += Number(entry.spend_delta) || 0
    }
    if (!latestEarnDate || entryTime > new Date(latestEarnDate).getTime()) {
      latestEarnDate = entry.created_at
    }
  }

  const currentTier = member.tier || 'MEMBER'
  const currentIndex = TIER_ORDER.indexOf(currentTier)

  // 2. Tính số ngày kể từ đơn hàng cuối (hoặc ngày đăng ký nếu chưa có đơn nào)
  const baseDateStr = latestEarnDate || member.tier_changed_at || member.created_at
  const baseDateMs = new Date(baseDateStr).getTime()
  const daysSinceActivity = Math.max(0, Math.floor((nowMs - baseDateMs) / (24 * 60 * 60 * 1000)))

  // 3. Tính hạng đạt được dựa trên chi tiêu 365 ngày
  const earnedTier = calculateTierFromRollingSpend(rollingSpend)
  const earnedIndex = TIER_ORDER.indexOf(earnedTier)

  let action = 'MAINTAIN'
  let targetTier = currentTier
  let shouldExpirePoints = false
  let daysUntilExpiry = Math.max(0, LOYALTY_RULES.TIER_WINDOW_DAYS - daysSinceActivity)

  // Kiểm tra nâng hạng (A4)
  if (earnedIndex > currentIndex) {
    action = 'UPGRADE'
    targetTier = earnedTier
  } else if (daysSinceActivity >= LOYALTY_RULES.TIER_WINDOW_DAYS) {
    // Quá 365 ngày không có đơn mới -> Hạ 1 hạng (A5) và Xóa điểm thưởng (A6)
    if (currentIndex > 0) {
      action = 'DOWNGRADE'
      targetTier = TIER_ORDER[currentIndex - 1]
    }
    shouldExpirePoints = true
  }

  const nextTierInfo = getNextTierInfo(targetTier, rollingSpend)

  return {
    memberId: member.id,
    currentTier,
    targetTier,
    action, // 'MAINTAIN' | 'UPGRADE' | 'DOWNGRADE'
    rollingSpend,
    daysSinceActivity,
    daysUntilExpiry,
    isExpiringSoon: daysUntilExpiry <= LOYALTY_RULES.POINTS_EXPIRY_WARNING_DAYS && daysUntilExpiry > 0,
    shouldExpirePoints,
    latestEarnDate,
    nextTierInfo,
  }
}
