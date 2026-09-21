import { createRateLimiter } from './rateLimiter.js'
import {
  createAccount,
  findAccountById,
  findAccountByGoogleId,
  findAccountByFacebookId,
  findAccountByPhone,
  findAccountByEmail,
  markAccountVerified,
  updateMarketingPreferences,
  unsubscribeAccount,
  getAccountStats,
  getMarketingAudience,
  createChallenge,
  findActiveChallenge,
  verifyChallengeAttempt,
  createWelcomeVoucher,
  getVoucherByCode,
  getVoucherByAccountId,
  createBroadcastLog,
  getBroadcastLogs,
  createCustomerSession,
  revokeCustomerSession,
  generateSessionToken,
  updateAccountEmail,
  updateAccountProfile,
  linkIdentityToAccount,
  findAccountByIdentity,
} from './accountDb.js'
import { sendVerificationCodeEmail, sendWelcomeVoucherEmail, sendBroadcastEmail } from './emailAccount.js'
import { sendSmsOtp, normalizeVietnamesePhone, isValidVietnamesePhone, isZaloConfigured } from './smsService.js'
import { validateVoucher } from './voucherValidator.js'
import { requireAdminAuth } from './adminAuth.js'
import { generateOtpCode, verifyUnsubscribeToken, hashSessionToken } from './authCrypto.js'
import { verifyGoogleIdToken, verifyFacebookAccessToken } from './providerOAuth.js'
import {
  setCustomerSessionCookie,
  clearCustomerSessionCookie,
  requireCustomerAuth,
  verifyCsrfOrigin,
  parseCookies,
  COOKIE_NAME,
  HOST_COOKIE_NAME,
} from './customerSessionMiddleware.js'

// Rate limiter cho gửi OTP xác minh (chống spam SMS/Email)
const otpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng chờ 10 phút trước khi thử lại.',
})

// Rate limiter cho kiểm tra mã xác minh (chống brute force)
const verifyRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: 'Bạn đã thử xác minh quá nhiều lần. Vui lòng thử lại sau 5 phút.',
})

// Rate limiter cho OAuth đăng nhập trực tiếp
const oauthRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ ít phút trước khi thử lại.',
})

// Helper: Mask email (ducquan16102006@gmail.com -> duc***@gmail.com)
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [user, domain] = email.split('@')
  if (user.length <= 3) return `${user[0]}***@${domain}`
  return `${user.slice(0, 3)}***@${domain}`
}

// Helper: Mask phone (0981753082 -> 098***3082)
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || ''
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`
}

// Helper: Delay giữa các lượt gửi broadcast
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Đăng ký toàn bộ API endpoints cho Auth, Verification, Session, Voucher & Broadcast
 */
export function registerAuthEndpoints(app) {
  // ── 1. Kiểm tra trạng thái cấu hình của hệ thống xác thực ────────
  app.get('/api/auth/config', (req, res) => {
    const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const facebookAppId = (process.env.FACEBOOK_APP_ID || '').trim()
    const isProd = process.env.NODE_ENV === 'production'
    const isTestMode = process.env.AUTH_TEST_MODE === 'true'

    res.json({
      success: true,
      googleEnabled: Boolean(googleClientId) || (!isProd && isTestMode),
      googleClientId: googleClientId || null,
      facebookEnabled: Boolean(facebookAppId) || (!isProd && isTestMode),
      facebookAppId: facebookAppId || null,
      phoneEnabled: false,
      requireOAuthVerification: true,
    })
  })

  // ── 2. Đăng ký / Đăng nhập qua Số điện thoại (Đã ngừng hỗ trợ) ──
  app.post('/api/auth/phone/send-otp', (req, res) => {
    return res.status(410).json({
      success: false,
      error: 'Phương thức xác thực bằng số điện thoại/Zalo đã ngừng hỗ trợ. Vui lòng sử dụng đăng nhập bảo mật bằng Google hoặc Facebook.',
    })
  })

  // ── 3. Đăng nhập / Đăng ký qua Google (OAuth) ───────────────────
  app.post('/api/auth/google', oauthRateLimiter, async (req, res) => {
    try {
      const bodyEmail = req.body.email || req.body.mail || ''
      const bodyFullName = req.body.fullName || req.body.name || req.body.displayName || ''
      const bodySub = req.body.sub || req.body.id || req.body.userId || ''
      const bodyAvatarUrl =
        req.body.avatarUrl ||
        req.body.picture?.data?.url ||
        (typeof req.body.picture === 'string' ? req.body.picture : null)
      const credential = req.body.credential
      const marketingOptIn = req.body.marketingOptIn

      let googleUser = null
      if (credential) {
        // Xác thực token chính thức qua Google API (aud, iss, exp, signature)
        googleUser = await verifyGoogleIdToken(credential)
      } else if (process.env.AUTH_TEST_MODE === 'true') {
        // Hỗ trợ fallback tương tác CHỈ khi bật cờ AUTH_TEST_MODE cho controlled test doubles
        const fallbackSub = bodySub || `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        googleUser = {
          provider: 'google',
          sub: fallbackSub,
          email: bodyEmail ? String(bodyEmail).toLowerCase().trim() : null,
          name: bodyFullName ? String(bodyFullName).trim() : 'Quý khách Google',
          picture: bodyAvatarUrl || null,
          emailVerified: true,
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Thiếu Google ID token (credential) hợp lệ để xác thực đăng nhập.',
        })
      }

      const email = googleUser.email?.toLowerCase().trim() || null
      const googleSub = googleUser.sub
      const customerName = (googleUser.name && googleUser.name.trim()) || 'Quý khách Google'
      const avatarUrl = googleUser.picture || null

      if (!email && !googleSub) {
        return res.status(400).json({ success: false, error: 'Không lấy được thông tin định danh từ tài khoản Google' })
      }

      // ── TÌM HOẶC TẠO TÀI KHOẢN KHÁCH HÀNG RIÊNG TRÊN WEBSITE ──
      let account = null
      if (googleSub) {
        account = findAccountByIdentity('google', googleSub) || findAccountByGoogleId(googleSub)
      }
      if (!account && email) {
        account = findAccountByEmail(email)
      }

      const optIn = Boolean(marketingOptIn)

      if (!account) {
        // 1. Tạo tài khoản riêng trên website, tên tài khoản đặt theo tên Google
        account = createAccount({
          method: 'google',
          google_id: googleSub,
          email,
          full_name: customerName,
          avatar_url: avatarUrl,
          verified: 1,
          marketing_email_opt_in: optIn ? 1 : 0,
        })
      } else {
        // 2. Nếu đã có tài khoản, cập nhật tên tài khoản theo tên Google mới nhất
        account = updateAccountProfile(account.id, {
          fullName: customerName,
          avatarUrl: avatarUrl || account.avatar_url,
          email: account.email || email,
        })
        if (googleSub) {
          linkIdentityToAccount({
            accountId: account.id,
            provider: 'google',
            subject: googleSub,
            email,
          })
        }
        account = markAccountVerified(account.id, { marketingOptIn: optIn })
      }

      // Cấp đúng 1 Welcome Voucher cho tài khoản (10% + Freeship)
      const voucher = createWelcomeVoucher(account.id)

      // Gửi email chúc mừng & tặng voucher (nếu có email)
      if (account.email) {
        sendWelcomeVoucherEmail({
          to: account.email,
          code: voucher.code,
          name: account.full_name || 'Quý khách',
        }).catch((err) => console.warn('⚠️ Gửi email chào mừng lỗi:', err.message))
      }

      // ── PHÁT HÀNH OPAQUE SESSION TOKEN & HTTPONLY COOKIE ──
      const cookies = parseCookies(req.headers.cookie)
      const oldToken = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME]
      if (oldToken) {
        revokeCustomerSession(oldToken)
      }

      const sessionToken = generateSessionToken()
      createCustomerSession({
        accountId: account.id,
        token: sessionToken,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      })

      setCustomerSessionCookie(res, sessionToken)

      return res.json({
        success: true,
        authenticated: true,
        account: {
          id: account.id,
          fullName: account.full_name,
          name: account.full_name,
          email: account.email,
          phone: account.phone,
          avatarUrl: account.avatar_url,
          verified: true,
          marketingEmailOptIn: Boolean(account.marketing_email_opt_in),
          createdAt: account.created_at,
        },
        user: {
          id: account.id,
          fullName: account.full_name,
          name: account.full_name,
          email: account.email,
          phone: account.phone,
          avatarUrl: account.avatar_url,
        },
        voucher: {
          code: voucher.code,
          discountPercent: voucher.discount_percent,
          freeShipping: Boolean(voucher.free_shipping),
          used: Boolean(voucher.used),
        },
        target: maskEmail(email || ''),
        rawTarget: email || '',
        provider: 'google',
        providerSub: googleSub,
        fullName: account.full_name,
        message: `Đăng nhập thành công! Chào mừng ${account.full_name} đến với QuanNguyenS.`,
      })
    } catch (err) {
      console.error('Google Auth error:', err)
      return res.status(400).json({ success: false, error: err.message || 'Lỗi xác thực Google' })
    }
  })

  // ── 4. Đăng nhập / Đăng ký qua Facebook (OAuth) ─────────────────
  app.post('/api/auth/facebook', oauthRateLimiter, async (req, res) => {
    try {
      const bodyEmail = req.body.email || req.body.mail || ''
      const bodyFullName = req.body.fullName || req.body.name || req.body.displayName || ''
      const bodySub = req.body.sub || req.body.id || req.body.userId || ''
      const bodyAvatarUrl =
        req.body.avatarUrl ||
        req.body.picture?.data?.url ||
        (typeof req.body.picture === 'string' ? req.body.picture : null)
      const accessToken = req.body.accessToken
      const marketingOptIn = req.body.marketingOptIn

      let fbUser = null
      if (accessToken) {
        // Xác thực token chính thức qua Meta Graph API debug_token
        fbUser = await verifyFacebookAccessToken(accessToken)
      } else if (process.env.AUTH_TEST_MODE === 'true') {
        // Hỗ trợ fallback tương tác CHỈ khi bật cờ AUTH_TEST_MODE cho controlled test doubles
        const fakeSub = bodySub || `facebook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        fbUser = {
          provider: 'facebook',
          sub: fakeSub,
          email: bodyEmail ? String(bodyEmail).toLowerCase().trim() : `${fakeSub}@facebook.user`,
          name: bodyFullName ? String(bodyFullName).trim() : 'Quý khách Facebook',
          picture: bodyAvatarUrl || null,
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Thiếu Facebook Access Token hợp lệ để xác thực đăng nhập.',
        })
      }

      const facebookSub = fbUser.sub
      const email = fbUser.email
        ? fbUser.email.toLowerCase().trim()
        : (bodyEmail ? String(bodyEmail).toLowerCase().trim() : `${facebookSub}@facebook.user`)
      const customerName = (fbUser.name && fbUser.name.trim()) || 'Quý khách Facebook'
      const avatarUrl = fbUser.picture || null

      // ── TÌM HOẶC TẠO TÀI KHOẢN KHÁCH HÀNG RIÊNG TRÊN WEBSITE ──
      let account = null
      if (facebookSub) {
        account = findAccountByIdentity('facebook', facebookSub) || findAccountByFacebookId(facebookSub)
      }
      if (!account && email && !email.endsWith('@facebook.user')) {
        account = findAccountByEmail(email)
      }

      const optIn = Boolean(marketingOptIn)
      const validEmail = email && !email.endsWith('@facebook.user') ? email : null

      if (!account) {
        // 1. Tạo tài khoản riêng trên website, tên tài khoản đặt theo tên Facebook
        account = createAccount({
          method: 'facebook',
          facebook_id: facebookSub,
          email: validEmail,
          full_name: customerName,
          avatar_url: avatarUrl,
          verified: 1,
          marketing_email_opt_in: optIn ? 1 : 0,
        })
      } else {
        // 2. Nếu đã có tài khoản, cập nhật tên tài khoản theo tên Facebook mới nhất
        account = updateAccountProfile(account.id, {
          fullName: customerName,
          avatarUrl: avatarUrl || account.avatar_url,
          email: account.email || validEmail,
        })
        if (facebookSub) {
          linkIdentityToAccount({
            accountId: account.id,
            provider: 'facebook',
            subject: facebookSub,
            email: validEmail,
          })
        }
        account = markAccountVerified(account.id, { marketingOptIn: optIn })
      }

      // Cấp đúng 1 Welcome Voucher cho tài khoản (10% + Freeship)
      const voucher = createWelcomeVoucher(account.id)

      // Gửi email chúc mừng & tặng voucher (nếu có email thực tế)
      if (account.email) {
        sendWelcomeVoucherEmail({
          to: account.email,
          code: voucher.code,
          name: account.full_name || 'Quý khách',
        }).catch((err) => console.warn('⚠️ Gửi email chào mừng lỗi:', err.message))
      }

      // ── PHÁT HÀNH OPAQUE SESSION TOKEN & HTTPONLY COOKIE ──
      const cookies = parseCookies(req.headers.cookie)
      const oldToken = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME]
      if (oldToken) {
        revokeCustomerSession(oldToken)
      }

      const sessionToken = generateSessionToken()
      createCustomerSession({
        accountId: account.id,
        token: sessionToken,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      })

      setCustomerSessionCookie(res, sessionToken)

      return res.json({
        success: true,
        authenticated: true,
        account: {
          id: account.id,
          fullName: account.full_name,
          name: account.full_name,
          email: account.email,
          phone: account.phone,
          avatarUrl: account.avatar_url,
          verified: true,
          marketingEmailOptIn: Boolean(account.marketing_email_opt_in),
          createdAt: account.created_at,
        },
        user: {
          id: account.id,
          fullName: account.full_name,
          name: account.full_name,
          email: account.email,
          phone: account.phone,
          avatarUrl: account.avatar_url,
        },
        voucher: {
          code: voucher.code,
          discountPercent: voucher.discount_percent,
          freeShipping: Boolean(voucher.free_shipping),
          used: Boolean(voucher.used),
        },
        target: maskEmail(validEmail || ''),
        rawTarget: validEmail || '',
        provider: 'facebook',
        providerSub: facebookSub,
        fullName: account.full_name,
        message: `Đăng nhập thành công! Chào mừng ${account.full_name} đến với QuanNguyenS.`,
      })
    } catch (err) {
      console.error('Facebook Auth error:', err)
      return res.status(400).json({ success: false, error: err.message || 'Lỗi xác thực Facebook' })
    }
  })

  // ── 5. Xác minh Mã OTP (Tạo Account, Cấp Voucher, Sinh Session) ──
  app.post('/api/auth/verify', verifyRateLimiter, async (req, res) => {
    try {
      const {
        target,
        accountId, // Tương thích backward
        code,
        marketingOptIn = false,
        provider = 'google',
        providerSub = null,
        fullName = null,
        avatarUrl = null,
      } = req.body

      if (!code || (!target && !accountId)) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đầy đủ thông tin xác minh' })
      }

      const cleanCode = String(code).trim()
      let activeChallenge = target ? findActiveChallenge(target) : null

      // Fallback tìm theo accountId nếu target không có
      if (!activeChallenge && accountId) {
        const acc = findAccountById(accountId)
        if (acc) {
          activeChallenge = findActiveChallenge(acc.phone || acc.email)
        }
      }

      if (!activeChallenge) {
        return res.status(400).json({
          success: false,
          error: 'Mã xác minh không tồn tại hoặc đã hết hạn. Vui lòng bấm "Gửi lại mã".',
        })
      }

      // Xác thực mã OTP bằng Constant-Time Comparison
      const verifyRes = verifyChallengeAttempt(activeChallenge.id, cleanCode)
      if (!verifyRes.valid) {
        return res.status(400).json({
          success: false,
          error: verifyRes.error,
          remainingAttempts: verifyRes.remainingAttempts,
        })
      }

      // ── OTP HỢP LỆ -> TẠO HOẶC CẬP NHẬT TÀI KHOẢN KHÁCH HÀNG ──
      const isTargetPhone = activeChallenge.target_type === 'sms'
      const verifiedPhone = isTargetPhone ? activeChallenge.target : null
      const verifiedEmail = !isTargetPhone ? activeChallenge.target : null

      let account = null

      // Tìm kiếm account đã liên kết với providerSub
      if (providerSub && provider) {
        const { findAccountByIdentity } = await import('./accountDb.js')
        account = findAccountByIdentity(provider, providerSub)
      }

      if (!account && verifiedPhone) {
        account = findAccountByPhone(verifiedPhone)
      }
      if (!account && verifiedEmail) {
        account = findAccountByEmail(verifiedEmail)
      }
      if (!account && accountId) {
        account = findAccountById(accountId)
      }

      if (!account) {
        account = createAccount({
          method: provider || (isTargetPhone ? 'phone' : 'email'),
          google_id: provider === 'google' ? providerSub : null,
          facebook_id: provider === 'facebook' ? providerSub : null,
          phone: verifiedPhone,
          email: verifiedEmail,
          full_name: fullName,
          avatar_url: avatarUrl,
          verified: 1,
          marketing_email_opt_in: marketingOptIn ? 1 : 0,
        })
      } else {
        // Đánh dấu tài khoản đã xác minh
        account = markAccountVerified(account.id, { marketingOptIn })
        if (fullName) {
          account = updateAccountProfile(account.id, { fullName, avatarUrl })
        }
        if (provider && providerSub) {
          linkIdentityToAccount({
            accountId: account.id,
            provider,
            subject: providerSub,
            email: verifiedEmail,
          })
        }
        if (verifiedEmail && !account.email) {
          account = updateAccountEmail(account.id, verifiedEmail)
        }
      }

      // Cấp đúng 1 Welcome Voucher cho tài khoản (10% + Freeship)
      const voucher = createWelcomeVoucher(account.id)

      // Gửi email chúc mừng & tặng voucher (chạy ngầm)
      if (account.email) {
        sendWelcomeVoucherEmail({
          to: account.email,
          code: voucher.code,
          name: account.full_name || 'Quý khách',
        }).catch((err) => console.warn('⚠️ Gửi email chào mừng lỗi:', err.message))
      }

      // ── PHÁT HÀNH OPAQUE SESSION TOKEN & HTTPONLY COOKIE ──
      // Xóa session cũ nếu có trên cookie (rotate session để chống fixation)
      const cookies = parseCookies(req.headers.cookie)
      const oldToken = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME]
      if (oldToken) {
        revokeCustomerSession(oldToken)
      }

      const sessionToken = generateSessionToken()
      createCustomerSession({
        accountId: account.id,
        token: sessionToken,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      })

      // Gửi cookie HttpOnly
      setCustomerSessionCookie(res, sessionToken)

      return res.json({
        success: true,
        account: {
          id: account.id,
          fullName: account.full_name,
          email: account.email,
          phone: account.phone,
          verified: true,
          marketingEmailOptIn: Boolean(account.marketing_email_opt_in),
        },
        voucher: {
          code: voucher.code,
          discountPercent: voucher.discount_percent,
          freeShipping: Boolean(voucher.free_shipping),
          used: Boolean(voucher.used),
        },
        message: 'Xác minh tài khoản thành công! Voucher chào mừng 10% + Freeship đã sẵn sàng.',
      })
    } catch (err) {
      console.error('Verify OTP error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi xác minh mã' })
    }
  })

  // ── 6. Gửi lại Mã xác minh (Resend) ─────────────────────────────
  app.post('/api/auth/resend', otpRateLimiter, async (req, res) => {
    try {
      const { target, accountId } = req.body
      let cleanTarget = target

      if (!cleanTarget && accountId) {
        const acc = findAccountById(accountId)
        if (acc) cleanTarget = acc.phone || acc.email
      }

      if (!cleanTarget) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin nhận mã' })
      }

      // Kiểm tra cooldown 60s
      const activeChallenge = findActiveChallenge(cleanTarget)
      if (activeChallenge && Date.now() < activeChallenge.cooldown_until) {
        const waitSec = Math.ceil((activeChallenge.cooldown_until - Date.now()) / 1000)
        return res.status(429).json({
          success: false,
          error: `Vui lòng chờ ${waitSec} giây trước khi yêu cầu gửi lại mã mới.`,
          cooldownSeconds: waitSec,
        })
      }

      const isPhone = !cleanTarget.includes('@')
      const targetType = isPhone ? 'sms' : 'email'
      const code = generateOtpCode()

      createChallenge({
        purpose: 'auth',
        channel: isPhone ? 'sms' : 'email',
        target: cleanTarget,
        targetType,
        code,
        ttlMinutes: 10,
        ip: req.ip,
      })

      if (isPhone) {
        const smsResult = await sendSmsOtp(cleanTarget, code)
        return res.json({
          success: true,
          target: maskPhone(cleanTarget),
          cooldownSeconds: 60,
          message: `Đã gửi lại mã OTP tới ${maskPhone(cleanTarget)}`,
          ...(process.env.AUTH_TEST_MODE === 'true' && { mockCode: code }),
        })
      } else {
        await sendVerificationCodeEmail({ to: cleanTarget, code, name: 'Quý khách' })
        return res.json({
          success: true,
          target: maskEmail(cleanTarget),
          cooldownSeconds: 60,
          message: `Đã gửi lại mã xác minh mới tới ${maskEmail(cleanTarget)}`,
          ...(process.env.AUTH_TEST_MODE === 'true' && { mockCode: code }),
        })
      }
    } catch (err) {
      console.error('Resend OTP error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi gửi lại mã' })
    }
  })

  // ── 7. Khôi phục phiên làm việc (Session Hydration) ─────────────
  app.get('/api/auth/me', (req, res) => {
    if (!req.customerAccount) {
      return res.json({
        success: true,
        authenticated: false,
        account: null,
        voucher: null,
      })
    }

    const voucher = getVoucherByAccountId(req.customerAccount.id)

    return res.json({
      success: true,
      authenticated: true,
      account: {
        id: req.customerAccount.id,
        fullName: req.customerAccount.full_name || req.customerAccount.fullName || '',
        avatarUrl: req.customerAccount.avatar_url || req.customerAccount.avatarUrl || '',
        email: req.customerAccount.email,
        phone: req.customerAccount.phone,
        verified: Boolean(req.customerAccount.verified),
        marketingEmailOptIn: Boolean(req.customerAccount.marketing_email_opt_in),
        createdAt: req.customerAccount.created_at || req.customerAccount.createdAt,
      },
      voucher: voucher || null,
    })
  })

  // ── 8. Đăng xuất (Logout & Revoke Session) ──────────────────────
  app.post('/api/auth/logout', verifyCsrfOrigin, (req, res) => {
    const cookies = parseCookies(req.headers.cookie)
    const token = cookies[HOST_COOKIE_NAME] || cookies[COOKIE_NAME]
    if (token) {
      revokeCustomerSession(token)
    }
    clearCustomerSessionCookie(res)
    return res.json({ success: true, message: 'Đăng xuất thành công' })
  })

  // ── 9. Tra cứu Voucher (Dựa trên Session Server) ────────────────
  app.get('/api/vouchers/validate', (req, res) => {
    try {
      const { code, subtotal } = req.query
      // Lấy accountId từ session server, không dùng accountId client gửi để chống spoofing
      const serverAccountId = req.customerAccount ? req.customerAccount.id : null

      const result = validateVoucher(code, {
        accountId: serverAccountId,
        subtotal: Number(subtotal) || 0,
      })
      return res.json(result)
    } catch (err) {
      console.error('Validate voucher error:', err)
      return res.status(500).json({ isValid: false, error: err.message })
    }
  })

  // ── 10. Lấy Voucher của tài khoản hiện tại ──────────────────────
  app.get('/api/auth/my-voucher', requireCustomerAuth, (req, res) => {
    try {
      const voucher = getVoucherByAccountId(req.customerAccount.id)
      return res.json({
        success: true,
        voucher: voucher || null,
      })
    } catch (err) {
      console.error('Get my voucher error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ── 11. Cập nhật Tùy Chọn Email Marketing (Preferences) ─────────
  app.patch('/api/auth/preferences', requireCustomerAuth, verifyCsrfOrigin, (req, res) => {
    try {
      const { marketingEmailOptIn } = req.body
      const updated = updateMarketingPreferences(req.customerAccount.id, Boolean(marketingEmailOptIn))
      return res.json({
        success: true,
        marketingEmailOptIn: Boolean(updated?.marketing_email_opt_in),
        message: updated?.marketing_email_opt_in
          ? 'Đã bật nhận thông báo ưu đãi và sản phẩm mới'
          : 'Đã hủy nhận email marketing. Quyền lợi tài khoản vẫn được duy trì.',
      })
    } catch (err) {
      console.error('Update preferences error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ── 12. Thêm và Xác minh Email cho Phone Account ────────────────
  app.post('/api/auth/link-email', requireCustomerAuth, verifyCsrfOrigin, otpRateLimiter, async (req, res) => {
    try {
      const { email } = req.body
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Địa chỉ email không hợp lệ' })
      }

      const cleanEmail = email.toLowerCase().trim()
      const existingAccount = findAccountByEmail(cleanEmail)
      if (existingAccount && existingAccount.id !== req.customerAccount.id) {
        return res.status(400).json({
          success: false,
          error: 'Email này đã được sử dụng bởi một tài khoản khác. Vui lòng sử dụng email khác.',
        })
      }

      const code = generateOtpCode()
      createChallenge({
        accountId: req.customerAccount.id,
        purpose: 'email_link',
        channel: 'email',
        target: cleanEmail,
        targetType: 'email',
        code,
        ttlMinutes: 10,
        ip: req.ip,
      })

      await sendVerificationCodeEmail({
        to: cleanEmail,
        code,
        name: req.customerAccount.full_name || 'Quý khách',
      })

      return res.json({
        success: true,
        target: maskEmail(cleanEmail),
        cooldownSeconds: 60,
        message: `Mã xác minh đã được gửi về ${maskEmail(cleanEmail)}`,
        ...(process.env.AUTH_TEST_MODE === 'true' && { mockCode: code }),
      })
    } catch (err) {
      console.error('Link email send OTP error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi gửi mã xác minh email' })
    }
  })

  app.post('/api/auth/link-email/verify', requireCustomerAuth, verifyCsrfOrigin, verifyRateLimiter, async (req, res) => {
    try {
      const { email, code } = req.body
      if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp email và mã xác minh' })
      }

      const cleanEmail = email.toLowerCase().trim()
      const activeChallenge = findActiveChallenge(cleanEmail)
      if (!activeChallenge) {
        return res.status(400).json({ success: false, error: 'Mã xác minh đã hết hạn hoặc không tồn tại' })
      }

      const verifyRes = verifyChallengeAttempt(activeChallenge.id, String(code).trim())
      if (!verifyRes.valid) {
        return res.status(400).json({
          success: false,
          error: verifyRes.error,
          remainingAttempts: verifyRes.remainingAttempts,
        })
      }

      // Cập nhật email cho account
      const updated = updateAccountEmail(req.customerAccount.id, cleanEmail)

      return res.json({
        success: true,
        email: updated.email,
        message: 'Đã liên kết email thành công với tài khoản của bạn.',
      })
    } catch (err) {
      console.error('Link email verify error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ── 13. Cơ chế Hủy Đăng Ký Marketing (Unsubscribe 1-Click) ──────
  const handleUnsubscribe = async (req, res) => {
    try {
      const token = req.query.token || req.body?.token
      if (!token) {
        return res.status(400).json({ success: false, error: 'Thiếu token hủy đăng ký' })
      }

      const verification = verifyUnsubscribeToken(token)
      if (!verification.isValid) {
        return res.status(400).json({ success: false, error: verification.error })
      }

      const tokenHash = hashSessionToken(token)
      unsubscribeAccount(verification.email, verification.accountId, tokenHash)

      return res.json({
        success: true,
        email: maskEmail(verification.email),
        message: `Đã hủy đăng ký nhận email marketing cho ${maskEmail(verification.email)}. Bạn sẽ không còn nhận email quảng cáo từ QuanNguyenS.`,
      })
    } catch (err) {
      console.error('Unsubscribe error:', err)
      return res.status(500).json({ success: false, error: 'Lỗi xử lý yêu cầu hủy đăng ký' })
    }
  }

  app.get('/api/auth/unsubscribe', handleUnsubscribe)
  app.post('/api/auth/unsubscribe', handleUnsubscribe)

  // ── 14. Thống kê Broadcast cho Admin ───────────────────────────
  app.get('/api/admin/broadcast/stats', requireAdminAuth, (req, res) => {
    try {
      const stats = getAccountStats()
      const logs = getBroadcastLogs(10)
      return res.json({
        success: true,
        stats,
        recentBroadcasts: logs,
      })
    } catch (err) {
      console.error('Admin broadcast stats error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ── 15. Gửi Broadcast Email (Admin Only) ────────────────────────
  app.post('/api/admin/broadcast', requireAdminAuth, async (req, res) => {
    try {
      const { subject, contentHtml, broadcastType = 'Sản phẩm mới' } = req.body

      if (!subject || !contentHtml || !String(subject).trim() || !String(contentHtml).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo',
        })
      }

      // Chỉ lấy người dùng đã verified + có email + marketing_email_opt_in = 1 + không bị suppress
      const audience = getMarketingAudience()

      if (audience.length === 0) {
        return res.json({
          success: true,
          count: 0,
          total: 0,
          message: 'Không có người nhận nào đủ điều kiện nhận email marketing (đã verified và opt-in).',
        })
      }

      console.log(`\n📢 [ADMIN BROADCAST] Bắt đầu gửi: "${subject}"`)
      console.log(`👥 Danh sách người nhận hợp lệ (Opt-in verified): ${audience.length}`)

      let sentCount = 0
      let failedCount = 0

      for (const subscriber of audience) {
        try {
          await sendBroadcastEmail({
            to: subscriber.email,
            subject: subject.trim(),
            contentHtml: contentHtml.trim(),
            broadcastType: broadcastType.trim(),
            accountId: subscriber.id,
          })
          sentCount++
          await sleep(150)
        } catch (sendErr) {
          failedCount++
          // Ghi log server không để lộ email trong response trả về client
          console.error(`  ✗ Gửi email thất bại cho một người nhận:`, sendErr.message)
        }
      }

      createBroadcastLog({
        subject: subject.trim(),
        content: contentHtml.trim(),
        recipients_count: sentCount,
        broadcast_type: broadcastType.trim(),
      })

      return res.json({
        success: true,
        count: sentCount,
        failed: failedCount,
        total: audience.length,
        message: `Đã gửi thành công ${sentCount}/${audience.length} email thông báo tới khách hàng có opt-in.`,
      })
    } catch (err) {
      console.error('Admin broadcast error:', err)
      return res.status(500).json({ success: false, error: 'Lỗi gửi broadcast' })
    }
  })
}
