import fs from 'fs'

/**
 * Chuẩn hóa giá trị NODE_ENV (không phân biệt chữ hoa/thường, cắt khoảng trắng thừa)
 */
export function getNormalizedNodeEnv(env = process.env) {
  return String(env?.NODE_ENV || '')
    .trim()
    .toLowerCase()
}

/**
 * Kiểm tra môi trường production chuẩn hóa duy nhất dùng toàn server
 */
export function isProductionEnv(env = process.env) {
  return getNormalizedNodeEnv(env) === 'production'
}

/**
 * Kiểm tra môi trường development chuẩn hóa
 */
export function isDevelopmentEnv(env = process.env) {
  return getNormalizedNodeEnv(env) === 'development'
}

/**
 * Phát hiện tiến trình đang chạy trên hạ tầng Render.com
 */
export function isRenderEnvironment(env = process.env) {
  return Boolean(
    String(env?.RENDER || '').trim() ||
      String(env?.RENDER_EXTERNAL_URL || '').trim() ||
      String(env?.RENDER_SERVICE_ID || '').trim() ||
      String(env?.RENDER_INSTANCE_ID || '').trim()
  )
}

/**
 * Render gói Free chặn toàn bộ lưu lượng đi ra trên cổng SMTP 25/465/587 (từ 26/09/2025).
 * Chỉ cho phép thử kết nối SMTP trên Render khi Quan đã nâng gói trả phí và bật tường minh:
 *   EMAIL_ALLOW_SMTP_ON_RENDER=true
 */
export function isSmtpAllowedOnCurrentPlatform(env = process.env) {
  if (!isRenderEnvironment(env)) {
    return true
  }
  return String(env?.EMAIL_ALLOW_SMTP_ON_RENDER || '').trim().toLowerCase() === 'true'
}

/**
 * Kiểm tra xem tiến trình có đang chạy trong môi trường quản lý (Render, PM2, Docker, Kubernetes) hay không
 */
export function isManagedOrContainerRuntime(env = process.env) {
  if (isRenderEnvironment(env)) return true
  if (env?.pm_id !== undefined || env?.PM2_HOME) return true
  if (env?.KUBERNETES_SERVICE_HOST || env?.KUBERNETES_PORT) return true
  if (env?.CONTAINER || env?.DOCKER_CONTAINER) return true
  try {
    if (fs.existsSync('/.dockerenv')) return true
  } catch {}
  return false
}

/**
 * Nguồn sự thật duy nhất (Single Source of Truth) cho thông tin cửa hàng ở Backend.
 * Tránh xung đột giữa các module email, chatbot và cấu hình môi trường.
 */
export function getShopConfig(env = process.env) {
  const rawPhone = String(env?.SHOP_PHONE || '0973 486 218').trim() || '0973 486 218'
  const phoneDigits = rawPhone.replace(/\D/g, '') || '0973486218'
  const publicSiteUrl = String(
    env?.PUBLIC_SITE_URL || env?.APP_URL || env?.RENDER_EXTERNAL_URL || 'https://quannguyens.com'
  )
    .trim()
    .replace(/\/+$/, '')

  const shopAddress =
    String(env?.SHOP_ADDRESS || 'Hai Bà Trưng, Hà Nội').trim() || 'Hai Bà Trưng, Hà Nội'

  return {
    shopName: String(env?.SHOP_NAME || 'QuanNguyenS').trim() || 'QuanNguyenS',
    shopTagline: 'Style To Be Lived In',
    shopPhone: rawPhone,
    hotlineDisplay: rawPhone,
    shopPhoneDigits: phoneDigits,
    shopZaloLink: `https://zalo.me/${phoneDigits}`,
    shopEmail: String(env?.OWNER_EMAIL || env?.GMAIL_USER || 'quannguyens403@gmail.com').trim(),
    shopAddress,
    address: shopAddress,
    publicSiteUrl,
    appUrl: publicSiteUrl,
    bankCode: String(env?.BANK_CODE || 'VCB').trim() || 'VCB',
    bankName: String(env?.BANK_NAME || 'Vietcombank (VCB)').trim() || 'Vietcombank (VCB)',
    bankAccountNumber: String(env?.BANK_ACCOUNT_NUMBER || '1050773506').trim() || '1050773506',
    bankAccountName: String(env?.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN').trim() || 'NGUYEN DUC QUAN',
    freeShipThreshold: 500000,
    standardShippingFee: 30000,
    splitShippingExtraFee: 30000,
    bankTransferDiscountPercent: 10,
    maxCodRadiusKm: 30,
  }
}

