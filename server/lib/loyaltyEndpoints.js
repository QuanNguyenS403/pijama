// server/lib/loyaltyEndpoints.js
import { requireAdminAuth } from './adminAuth.js'
import { logSecurityAudit } from './auditLogger.js'
import { parseCookies, setCustomerSessionCookie, clearCustomerSessionCookie } from './customerSessionMiddleware.js'
import { isLoyaltyEnabled, LOYALTY_RULES, LOYALTY_TIERS } from './loyalty/loyaltyConfig.js'
import {
  getMemberById,
  getMemberByPhone,
  updateMember,
  anonymizeAndCloseMember,
  listMembers,
  countMembers,
  listAlerts,
  resolveAlert,
  createAlert,
  maskPhone,
  findLoyaltySessionByToken,
  getLoyaltyDb,
} from './loyalty/loyaltyDb.js'
import { sendLoyaltyOtp, verifyLoyaltyOtp } from './loyalty/phoneVerifier.js'
import { enrollLoyaltyMember, authenticateMemberByOtp } from './loyalty/enrollment.js'
import {
  recordLedgerEntry,
  getMemberPointsBalance,
  getMemberRollingSpend,
  getMemberLedgerHistory,
  recordAdminPointsAdjustment,
  reconcileMemberBalance,
} from './loyalty/ledger.js'
import { redeemPointsForVoucher } from './loyalty/redemption.js'
import { getMemberBenefitsOverview, previewCheckoutBenefits } from './loyalty/benefits.js'
import { claimOrderPointsWithOtp } from './loyalty/orderHook.js'
import { runAllDailyLoyaltyJobs } from './loyalty/jobs.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone } from './smsService.js'

/**
 * Middleware phân giải phiên Hội viên từ Cookie hoặc Bearer Token
 */
function resolveLoyaltyMember(req, res, next) {
  let token = null

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim()
  } else {
    const cookies = parseCookies(req.headers.cookie)
    token = cookies.qns_session || cookies['__Host-qns_session'] || null
  }

  if (token) {
    const session = findLoyaltySessionByToken(token)
    if (session) {
      req.loyaltyMember = session
      return next()
    }
  }

  // Fallback: nếu đã có customerAccount từ session trước đó
  if (req.customerAccount) {
    let member = req.customerAccount.id ? getLoyaltyDb().prepare('SELECT * FROM loyalty_members WHERE account_id = ?').get(req.customerAccount.id) : null
    if (!member && req.customerAccount.phone) {
      member = getMemberByPhone(req.customerAccount.phone)
    }
    if (member && member.status === 'active') {
      req.loyaltyMember = member
      return next()
    }
  }

  req.loyaltyMember = null
  next()
}

/**
 * Middleware yêu cầu bắt buộc phải có phiên Hội viên
 */
function requireLoyaltyAuth(req, res, next) {
  if (!req.loyaltyMember) {
    return res.status(401).json({
      success: false,
      code: 'LOYALTY_AUTH_REQUIRED',
      error: 'Vui lòng đăng nhập hoặc xác thực số điện thoại để tiếp tục',
    })
  }
  next()
}

/**
 * Chống tấn công CSRF cho các thao tác ghi dữ liệu nhạy cảm
 */
function verifyCsrf(req, res, next) {
  const origin = req.headers.origin || req.headers.referer
  if (!origin && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Thiếu thông tin Origin của yêu cầu' })
  }
  next()
}

/**
 * Chống chèn công thức Excel (CSV Formula Injection)
 */
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""'
  let str = String(value).trim()
  // Nếu bắt đầu bằng các ký tự nguy hiểm: =, +, -, @, tab, cr
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  // Escape dấu ngoặc kép
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Đăng ký toàn bộ API endpoints cho hệ thống Loyalty
 */
export function registerLoyaltyEndpoints(app) {
  // ── 1. GỬI MÃ OTP XÁC THỰC SĐT (PUBLIC) ─────────────────────
  app.post('/api/loyalty/phone/send-otp', async (req, res) => {
    try {
      const { phone, purpose = 'enrollment' } = req.body || {}
      const clientIp = req.ip || req.socket?.remoteAddress || ''
      const userAgent = req.headers['user-agent'] || ''

      const result = await sendLoyaltyOtp({
        phone,
        purpose,
        ip: clientIp,
        userAgent,
      })

      if (!result.success) {
        return res.status(400).json(result)
      }

      return res.status(200).json(result)
    } catch (err) {
      console.error('❌ [SEND OTP ENDPOINT ERROR]', err)
      return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi gửi mã xác thực' })
    }
  })

  // ── 2. XÁC THỰC MÃ OTP (PUBLIC) ─────────────────────────────
  app.post('/api/loyalty/phone/verify-otp', (req, res) => {
    try {
      const { phone, code, purpose = 'enrollment' } = req.body || {}
      const result = verifyLoyaltyOtp({ phone, code, purpose })

      if (!result.success) {
        return res.status(400).json(result)
      }

      return res.status(200).json(result)
    } catch (err) {
      console.error('❌ [VERIFY OTP ENDPOINT ERROR]', err)
      return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi xác thực mã' })
    }
  })

  // ── 3. ĐĂNG KÝ HỘI VIÊN MỚI (PUBLIC / VOLUNTARY) ───────────
  app.post('/api/loyalty/enroll', verifyCsrf, async (req, res) => {
    try {
      const {
        fullName,
        phone,
        otpCode,
        email,
        birthDay,
        birthMonth,
        consentToTerms,
        ageConsent,
        marketingOptIn,
      } = req.body || {}

      const clientIp = req.ip || req.socket?.remoteAddress || ''
      const userAgent = req.headers['user-agent'] || ''
      const accountId = req.customerAccount?.id || null

      const result = await enrollLoyaltyMember({
        fullName,
        phone,
        otpCode,
        email,
        birthDay,
        birthMonth,
        consentToTerms,
        ageConsent,
        marketingOptIn,
        accountId,
        ip: clientIp,
        userAgent,
      })

      if (!result.success) {
        return res.status(400).json(result)
      }

      if (result.sessionToken) {
        setCustomerSessionCookie(res, result.sessionToken)
      }

      logSecurityAudit({
        userId: result.member?.id,
        action: 'LOYALTY_ENROLL',
        status: 'SUCCESS',
        ip: clientIp,
        userAgent,
        details: { phone: maskPhone(result.member?.phone), tier: result.member?.tier },
      })

      return res.status(201).json(result)
    } catch (err) {
      console.error('❌ [ENROLL ENDPOINT ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể xử lý yêu cầu đăng ký' })
    }
  })

  // ── 4. ĐĂNG NHẬP HỘI VIÊN BẰNG SĐT + OTP ────────────────────
  app.post('/api/loyalty/login', verifyCsrf, async (req, res) => {
    try {
      const { phone, otpCode } = req.body || {}
      const clientIp = req.ip || req.socket?.remoteAddress || ''
      const userAgent = req.headers['user-agent'] || ''

      const result = await authenticateMemberByOtp({
        phone,
        otpCode,
        ip: clientIp,
        userAgent,
      })

      if (!result.success) {
        return res.status(401).json(result)
      }

      if (result.sessionToken) {
        setCustomerSessionCookie(res, result.sessionToken)
      }

      logSecurityAudit({
        userId: result.member?.id,
        action: 'LOYALTY_LOGIN',
        status: 'SUCCESS',
        ip: clientIp,
        userAgent,
        details: { phone: maskPhone(result.member?.phone) },
      })

      return res.status(200).json(result)
    } catch (err) {
      console.error('❌ [LOGIN ENDPOINT ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể xử lý đăng nhập' })
    }
  })

  // ── 5. LẤY THÔNG TIN HỘI VIÊN (/api/loyalty/me) ─────────────
  app.get('/api/loyalty/me', resolveLoyaltyMember, requireLoyaltyAuth, (req, res) => {
    try {
      const overview = getMemberBenefitsOverview(req.loyaltyMember.id || req.loyaltyMember.member_id)
      if (!overview) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin hội viên' })
      }
      return res.status(200).json({ success: true, ...overview })
    } catch (err) {
      console.error('❌ [LOYALTY ME ERROR]', err)
      return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi tải hồ sơ hội viên' })
    }
  })

  // ── 6. ĐỔI ĐIỂM THƯỞNG LẤY VOUCHER ─────────────────────────
  app.post('/api/loyalty/redeem-points', verifyCsrf, resolveLoyaltyMember, requireLoyaltyAuth, (req, res) => {
    try {
      const memberId = req.loyaltyMember.id || req.loyaltyMember.member_id
      const { points = 10, orderId = null, otpCode = null, stepUpVerified = false } = req.body || {}

      const result = redeemPointsForVoucher({
        memberId,
        pointsToRedeem: Number(points) || 10,
        orderId,
        phone: req.loyaltyMember.phone,
        otpCode,
        stepUpVerified,
      })

      if (!result.success) {
        return res.status(400).json(result)
      }

      logSecurityAudit({
        userId: memberId,
        action: 'LOYALTY_REDEEM',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { points, voucherCode: result.voucher?.code },
      })

      return res.status(200).json(result)
    } catch (err) {
      console.error('❌ [REDEEM ENDPOINT ERROR]', err)
      return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi đổi điểm' })
    }
  })

  // ── 7. XEM TRƯỚC ƯU ĐÃI KHI THANH TOÁN (CHECKOUT PREVIEW) ───
  app.post('/api/loyalty/checkout-preview', resolveLoyaltyMember, (req, res) => {
    try {
      const { subtotal, paymentMethod, voucherCode, phone } = req.body || {}
      const memberId = req.loyaltyMember ? (req.loyaltyMember.id || req.loyaltyMember.member_id) : null

      const preview = previewCheckoutBenefits({
        memberId,
        phone,
        subtotal: Number(subtotal) || 0,
        paymentMethod: paymentMethod || 'COD',
        voucherCode: voucherCode ? String(voucherCode).trim() : null,
        originalShippingFee: 30000,
      })

      return res.status(200).json({ success: true, ...preview })
    } catch (err) {
      console.error('❌ [CHECKOUT PREVIEW ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể tính toán ưu đãi' })
    }
  })

  // ── 8. NHẬN ĐIỂM CHO ĐƠN HÀNG TRONG VÒNG 7 NGÀY (CLAIM) ────
  app.post('/api/loyalty/claim-order', verifyCsrf, async (req, res) => {
    try {
      const { orderId, phone, otpCode } = req.body || {}
      if (!orderId || !phone || !otpCode) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng, số điện thoại và mã OTP' })
      }

      const db = getLoyaltyDb()
      const orderRow = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId)
      if (!orderRow) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng' })
      }

      const order = {
        orderId: orderRow.order_id,
        status: orderRow.status,
        subtotal: orderRow.subtotal,
        discount: orderRow.discount,
        customerPhone: orderRow.customer_phone,
        created_at: orderRow.created_at,
      }

      const claimResult = await claimOrderPointsWithOtp({
        order,
        phone,
        otpCode,
      })

      if (!claimResult.success) {
        return res.status(400).json(claimResult)
      }

      return res.status(200).json({
        success: true,
        message: `Đã nhận thành công ${claimResult.pointsEarned} điểm cho đơn hàng #${orderId}`,
        pointsEarned: claimResult.pointsEarned,
      })
    } catch (err) {
      console.error('❌ [CLAIM ORDER ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể nhận điểm cho đơn hàng' })
    }
  })

  // ── 9. ĐÓNG TÀI KHOẢN VÀ ẨN DANH HÓA DỮ LIỆU CÁ NHÂN ───────
  app.post('/api/loyalty/close', verifyCsrf, resolveLoyaltyMember, requireLoyaltyAuth, (req, res) => {
    try {
      const memberId = req.loyaltyMember.id || req.loyaltyMember.member_id
      const { reason = 'Khách hàng yêu cầu đóng tài khoản' } = req.body || {}

      const success = anonymizeAndCloseMember(memberId, reason)
      if (!success) {
        return res.status(400).json({ success: false, error: 'Không thể đóng tài khoản' })
      }

      clearCustomerSessionCookie(res)

      logSecurityAudit({
        userId: memberId,
        action: 'LOYALTY_CLOSE_ACCOUNT',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason },
      })

      return res.status(200).json({
        success: true,
        message: 'Tài khoản Hội viên của bạn đã được đóng và dữ liệu cá nhân đã được ẩn danh hóa an toàn.',
      })
    } catch (err) {
      console.error('❌ [CLOSE LOYALTY ERROR]', err)
      return res.status(500).json({ success: false, error: 'Có lỗi xảy ra khi đóng tài khoản' })
    }
  })

  // ═════════════════════════════════════════════════════════════
  // ── ADMIN ENDPOINTS (BẢO VỆ CHẶT CHẼ BỞI requireAdminAuth) ──
  // ═════════════════════════════════════════════════════════════

  // ── A. TỔNG QUAN HỘI VIÊN (/api/admin/loyalty/summary) ──────
  app.get('/api/admin/loyalty/summary', requireAdminAuth, (req, res) => {
    try {
      const db = getLoyaltyDb()
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Phân bổ theo hạng
      const tierCounts = { MEMBER: 0, SILVER: 0, GOLD: 0, DIAMOND: 0 }
      const tierRows = db.prepare('SELECT tier, COUNT(*) as count FROM loyalty_members WHERE status != ? GROUP BY tier').all('closed')
      for (const r of tierRows) {
        if (tierCounts[r.tier] !== undefined) tierCounts[r.tier] = r.count
      }

      const totalMembers = Object.values(tierCounts).reduce((a, b) => a + b, 0)
      const new7d = db.prepare('SELECT COUNT(*) as count FROM loyalty_members WHERE created_at >= ?').get(sevenDaysAgo)?.count || 0
      const new30d = db.prepare('SELECT COUNT(*) as count FROM loyalty_members WHERE created_at >= ?').get(thirtyDaysAgo)?.count || 0

      // Tổng điểm đang lưu hành & giá trị nợ điểm (điểm × 5.000đ)
      const pointsRow = db.prepare('SELECT COALESCE(SUM(points_delta), 0) as total FROM loyalty_ledger').get()
      const totalPointsInCirculation = Math.max(0, Number(pointsRow?.total || 0))
      const pointsLiabilityVnd = totalPointsInCirculation * 5000

      // Thống kê voucher
      const voucherStats = db.prepare(`
        SELECT 
          COUNT(*) as totalIssued,
          SUM(CASE WHEN used = 1 THEN 1 ELSE 0 END) as totalUsed,
          SUM(CASE WHEN used = 0 AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END) as totalActive
        FROM vouchers
      `).get(now.toISOString())

      // Cảnh báo mở
      const openAlertsCount = db.prepare("SELECT COUNT(*) as count FROM loyalty_alerts WHERE status = 'open'").get()?.count || 0

      return res.status(200).json({
        success: true,
        summary: {
          totalMembers,
          tierCounts,
          new7d,
          new30d,
          totalPointsInCirculation,
          pointsLiabilityVnd,
          vouchers: {
            issued: voucherStats?.totalIssued || 0,
            used: voucherStats?.totalUsed || 0,
            active: voucherStats?.totalActive || 0,
          },
          openAlertsCount,
        },
      })
    } catch (err) {
      console.error('❌ [ADMIN LOYALTY SUMMARY ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể tải số liệu tổng quan hội viên' })
    }
  })

  // ── B. DANH SÁCH HỘI VIÊN + TÌM KIẾM + PHÂN TRANG ───────────
  app.get('/api/admin/loyalty/members', requireAdminAuth, (req, res) => {
    try {
      const { tier, status, search, limit = 50, offset = 0 } = req.query
      const members = listMembers({
        tier,
        status,
        search,
        limit: Math.min(100, Math.max(1, Number(limit) || 50)),
        offset: Math.max(0, Number(offset) || 0),
      })
      const total = countMembers({ tier, status, search })

      // MẶC ĐỊNH MASK SỐ ĐIỆN THOẠI TRÊN DANH SÁCH ĐỂ BẢO VỆ DỮ LIỆU CÁ NHÂN
      const sanitized = members.map((m) => {
        const balance = getMemberPointsBalance(m.id)
        return {
          id: m.id,
          maskedPhone: maskPhone(m.phone),
          fullName: m.full_name,
          email: m.email,
          tier: m.tier,
          tierChangedAt: m.tier_changed_at,
          status: m.status,
          pointsBalance: balance,
          createdAt: m.created_at,
        }
      })

      return res.status(200).json({
        success: true,
        members: sanitized,
        total,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      })
    } catch (err) {
      console.error('❌ [ADMIN LOYALTY MEMBERS LIST ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể tải danh sách hội viên' })
    }
  })

  // ── C. HIỆN SỐ ĐIỆN THOẠI ĐẦY ĐỦ (CÓ NHẬT KÝ KIỂM TOÁN) ──────
  app.post('/api/admin/loyalty/members/:id/unmask-phone', requireAdminAuth, (req, res) => {
    try {
      const member = getMemberById(req.params.id)
      if (!member) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hội viên' })
      }

      logSecurityAudit({
        userId: req.params.id,
        action: 'ADMIN_UNMASK_PHONE',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { memberId: member.id, adminSession: req.adminSession?.token?.slice(0, 8) },
      })

      return res.status(200).json({
        success: true,
        phone: member.phone,
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Không thể mở che số điện thoại' })
    }
  })

  // ── D. CHI TIẾT HỘI VIÊN + SỔ CÁI + ĐỐI SOÁT ────────────────
  app.get('/api/admin/loyalty/members/:id', requireAdminAuth, (req, res) => {
    try {
      const member = getMemberById(req.params.id)
      if (!member) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hội viên' })
      }

      const db = getLoyaltyDb()
      const balance = getMemberPointsBalance(member.id)
      const rollingSpend = getMemberRollingSpend(member.id)
      const ledgerHistory = getMemberLedgerHistory(member.id, { limit: 100 })
      const tierHistory = db.prepare('SELECT * FROM loyalty_tier_history WHERE member_id = ? ORDER BY created_at DESC').all(member.id)
      const vouchers = db.prepare('SELECT * FROM vouchers WHERE member_id = ? ORDER BY created_at DESC').all(member.id)
      const alerts = db.prepare('SELECT * FROM loyalty_alerts WHERE member_id = ? ORDER BY created_at DESC').all(member.id)

      return res.status(200).json({
        success: true,
        member: {
          ...member,
          maskedPhone: maskPhone(member.phone),
          pointsBalance: balance,
          rollingSpend,
        },
        ledgerHistory,
        tierHistory,
        vouchers,
        alerts,
      })
    } catch (err) {
      console.error('❌ [ADMIN MEMBER DETAIL ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể tải chi tiết hội viên' })
    }
  })

  // ── E. ĐIỀU CHỈNH ĐIỂM THỦ CÔNG (ADMIN ADJUST) ───────────────
  app.post('/api/admin/loyalty/members/:id/adjust-points', requireAdminAuth, (req, res) => {
    try {
      const { pointsDelta, reason, overrideMaxLimit = false } = req.body || {}
      const memberId = req.params.id

      const result = recordAdminPointsAdjustment({
        memberId,
        pointsDelta,
        reason,
        adminId: req.adminSession?.token ? 'admin_session' : 'admin_root',
        overrideMaxLimit: Boolean(overrideMaxLimit),
      })

      logSecurityAudit({
        userId: memberId,
        action: 'ADMIN_POINTS_ADJUST',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { pointsDelta, reason },
      })

      return res.status(200).json({
        success: true,
        message: `Đã điều chỉnh ${pointsDelta > 0 ? '+' : ''}${pointsDelta} điểm thành công`,
        entry: result.entry,
      })
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message })
    }
  })

  // ── F. KHÓA / MỞ KHÓA TRẠNG THÁI HỘI VIÊN ──────────────────
  app.post('/api/admin/loyalty/members/:id/status', requireAdminAuth, (req, res) => {
    try {
      const { status, reason } = req.body || {}
      if (!['active', 'frozen', 'closed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ (active, frozen, closed)' })
      }
      if (!reason || !reason.trim()) {
        return res.status(400).json({ success: false, error: 'Bắt buộc nhập lý do thay đổi trạng thái' })
      }

      const updated = updateMember(req.params.id, { status })
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hội viên' })
      }

      logSecurityAudit({
        userId: req.params.id,
        action: 'ADMIN_MEMBER_STATUS_CHANGE',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { newStatus: status, reason },
      })

      return res.status(200).json({ success: true, member: updated })
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Không thể cập nhật trạng thái hội viên' })
    }
  })

  // ── G. HÀNG ĐỢI CẢNH BÁO BẤT THƯỜNG (ALERTS) ────────────────
  app.get('/api/admin/loyalty/alerts', requireAdminAuth, (req, res) => {
    try {
      const { status = 'open', limit = 50, offset = 0 } = req.query
      const alerts = listAlerts({ status, limit: Number(limit) || 50, offset: Number(offset) || 0 })
      return res.status(200).json({ success: true, alerts })
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Không thể tải danh sách cảnh báo' })
    }
  })

  app.post('/api/admin/loyalty/alerts/:id/resolve', requireAdminAuth, (req, res) => {
    try {
      const { notes = '' } = req.body || {}
      const success = resolveAlert(req.params.id, 'admin', notes)
      return res.status(200).json({ success })
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Không thể xử lý cảnh báo' })
    }
  })

  // ── H. XUẤT CSV HỘI VIÊN (CHỐNG CSV INJECTION) ───────────────
  app.get('/api/admin/loyalty/export-csv', requireAdminAuth, (req, res) => {
    try {
      const db = getLoyaltyDb()
      const members = db.prepare('SELECT * FROM loyalty_members ORDER BY created_at DESC').all()

      const headers = ['ID', 'Họ Và Tên', 'Số Điện Thoại', 'Hạng', 'Điểm Thưởng', 'Trạng Thái', 'Ngày Đăng Ký']
      const rows = [headers.map(sanitizeCsvCell).join(',')]

      for (const m of members) {
        const balance = getMemberPointsBalance(m.id)
        const row = [
          m.id,
          m.full_name,
          m.phone,
          m.tier,
          balance,
          m.status,
          m.created_at,
        ]
        rows.push(row.map(sanitizeCsvCell).join(','))
      }

      logSecurityAudit({
        action: 'ADMIN_EXPORT_LOYALTY_CSV',
        status: 'SUCCESS',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { count: members.length },
      })

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="hoi-vien-quannguyens.csv"')
      return res.send('\uFEFF' + rows.join('\r\n')) // UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
    } catch (err) {
      console.error('❌ [EXPORT CSV ERROR]', err)
      return res.status(500).json({ success: false, error: 'Không thể xuất file CSV' })
    }
  })

  // ── I. KÍCH HOẠT CHẠY CRON JOBS THỦ CÔNG ─────────────────────
  app.post('/api/admin/loyalty/jobs/run', requireAdminAuth, (req, res) => {
    try {
      const result = runAllDailyLoyaltyJobs(new Date())
      return res.status(200).json({ success: true, result })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  })
}
