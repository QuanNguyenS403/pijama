// server/lib/loyalty/loyaltyConfig.js
/**
 * Cấu hình chương trình Khách hàng thân thiết / Ưu đãi Hội viên — QuanNguyenS
 * Phiên bản: 1.0.0 (Ngày 25/10/2026)
 * 
 * Nguồn dữ liệu: Quy định chương trình chuẩn (Bảng quyền lợi 4 hạng)
 * Mọi thay đổi về sau phải nâng số phiên bản và bảo đảm tính bất biến cho quá khứ.
 */

export const LOYALTY_VERSION = '1.0.0'

export const LOYALTY_TIERS = {
  MEMBER: {
    code: 'MEMBER',
    name: 'Thân Thiết',
    englishName: 'Member',
    thresholdSpend: 0,
    thresholdPoints: 0,
    discountPercent: 0,
    birthdayVoucherAmount: 50000,
    upgradeVoucherAmount: 0,
    badgeColor: '#631521', // Burgundy thương hiệu
    badgeBg: '#FAF8F5',
    perks: ['Tích điểm 100k = 1 điểm', 'Voucher sinh nhật 50.000đ', 'Đổi điểm nhận voucher 50.000đ'],
  },
  SILVER: {
    code: 'SILVER',
    name: 'Bạc',
    englishName: 'Silver',
    thresholdSpend: 5000000,
    thresholdPoints: 50,
    discountPercent: 5,
    birthdayVoucherAmount: 200000,
    upgradeVoucherAmount: 200000,
    badgeColor: '#71717A', // Ánh kim bạc
    badgeBg: '#F4F4F5',
    perks: ['Giảm 5% mọi đơn hàng', 'Voucher thăng hạng 200.000đ', 'Voucher sinh nhật 200.000đ', 'Tích điểm 100k = 1 điểm'],
  },
  GOLD: {
    code: 'GOLD',
    name: 'Vàng',
    englishName: 'Gold',
    thresholdSpend: 10000000,
    thresholdPoints: 100,
    discountPercent: 10,
    birthdayVoucherAmount: 300000,
    upgradeVoucherAmount: 300000,
    badgeColor: '#B45309', // Ánh kim vàng sang trọng
    badgeBg: '#FEF3C7',
    perks: ['Giảm 10% mọi đơn hàng', 'Voucher thăng hạng 300.000đ', 'Voucher sinh nhật 300.000đ', 'Ưu tiên xử lý đơn hàng'],
  },
  DIAMOND: {
    code: 'DIAMOND',
    name: 'Kim Cương',
    englishName: 'Diamond',
    thresholdSpend: 25000000,
    thresholdPoints: 250,
    discountPercent: 15,
    birthdayVoucherAmount: 500000,
    upgradeVoucherAmount: 500000,
    badgeColor: '#0284C7', // Xanh lam kim cương quý phái
    badgeBg: '#E0F2FE',
    perks: [
      'Giảm 15% mọi đơn hàng',
      'Voucher thăng hạng 500.000đ',
      'Voucher sinh nhật 500.000đ',
      'Private Party & Bộ quà đặc biệt theo BST',
      'Chăm sóc độc quyền 1-1',
    ],
  },
}

export const TIER_ORDER = ['MEMBER', 'SILVER', 'GOLD', 'DIAMOND']

export const LOYALTY_RULES = {
  // Tích điểm: 100.000đ = 1 điểm
  SPEND_PER_POINT: 100000,
  // Đổi điểm: 10 điểm = voucher 50.000đ
  POINTS_PER_VOUCHER: 10,
  VOUCHER_AMOUNT_PER_REDEEM: 50000,
  VOUCHER_REDEEM_MIN_SUBTOTAL: 0, // Áp dụng đơn từ 0đ
  VOUCHER_REDEEM_VALIDITY_DAYS: 90,

  // Thời hạn
  TIER_WINDOW_DAYS: 365, // Cửa sổ trượt tính hạng 365 ngày
  REWARD_POINTS_VALIDITY_DAYS: 365, // 365 ngày không mua -> xóa điểm
  POINTS_EXPIRY_WARNING_DAYS: 30, // Cảnh báo trước 30 ngày

  // Voucher thăng hạng & sinh nhật
  UPGRADE_VOUCHER_VALIDITY_DAYS: 90,
  CLAIM_PENDING_POINTS_DAYS: 7, // Hạn khách nhận điểm cho đơn không gắn tài khoản

  // Giới hạn điều chỉnh thủ công cho Admin
  ADMIN_MAX_MANUAL_POINTS_ADJUST: 20,

  // OTP
  OTP_TTL_MS: 5 * 60 * 1000, // 5 phút
  OTP_RESEND_COOLDOWN_MS: 60 * 1000, // 60 giây
  OTP_MAX_ATTEMPTS: 5,
  STEP_UP_SESSION_TTL_MS: 15 * 60 * 1000, // 15 phút sau OTP có giá trị thanh toán
}

export function isLoyaltyEnabled() {
  return process.env.LOYALTY_ENABLED === 'true'
}
