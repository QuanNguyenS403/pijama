import { createRateLimiter } from './rateLimiter.js'
import {
  createAccount,
  findAccountById,
  findAccountByGoogleId,
  findAccountByFacebookId,
  findAccountByPhone,
  findAccountByEmail,
  markAccountVerified,
  getAllVerifiedAccounts,
  getAccountStats,
  createVerificationCode,
  findLatestActiveCode,
  incrementCodeAttempts,
  markCodeUsed,
  createWelcomeVoucher,
  getVoucherByCode,
  getVoucherByAccountId,
  createBroadcastLog,
  getBroadcastLogs,
} from './accountDb.js'
import { sendVerificationCodeEmail, sendWelcomeVoucherEmail, sendBroadcastEmail } from './emailAccount.js'
import { sendSmsOtp, normalizeVietnamesePhone, isValidVietnamesePhone, isZaloConfigured } from './smsService.js'
import { validateVoucher } from './voucherValidator.js'
import { verifyAdminLogin } from './adminAuth.js'

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

// Helper: Tạo mã 6 chữ số ngẫu nhiên
function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Helper: Chờ (delay) giữa các lượt gửi broadcast email để không vượt hạn ngạch Gmail
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Đăng ký toàn bộ API endpoints cho Auth, Verification, Voucher & Broadcast
 */
export function registerAuthEndpoints(app) {
  // ── 1. Kiểm tra trạng thái cấu hình của hệ thống xác thực ────────
  app.get('/api/auth/config', (req, res) => {
    const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
    const facebookAppId = (process.env.FACEBOOK_APP_ID || '').trim()
    const facebookAppSecret = (process.env.FACEBOOK_APP_SECRET || '').trim()
    const smsApiKey = (process.env.SMS_OTP_API_KEY || '').trim()

    res.json({
      success: true,
      googleEnabled: Boolean(googleClientId && googleClientSecret),
      googleClientId: googleClientId || null,
      facebookEnabled: Boolean(facebookAppId && facebookAppSecret),
      facebookAppId: facebookAppId || null,
      phoneEnabled: true,
      zaloConfigured: isZaloConfigured(),
      requireOAuthVerification: true,
    })
  })

  // ── 2. Đăng ký / Đăng nhập qua Số điện thoại (Gửi mã OTP) ──────
  app.post('/api/auth/phone/send-otp', otpRateLimiter, async (req, res) => {
    try {
      const { phone } = req.body
      const normalized = normalizeVietnamesePhone(phone)

      if (!isValidVietnamesePhone(normalized)) {
        return res.status(400).json({
          success: false,
          error: 'Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 chữ số tại Việt Nam.',
        })
      }

      // Tìm hoặc tạo tài khoản
      let account = findAccountByPhone(normalized)
      if (!account) {
        account = createAccount({
          method: 'phone',
          phone: normalized,
          verified: 0,
        })
      }

      // Tạo mã OTP 6 số
      const code = generateSixDigitCode()
      createVerificationCode({
        account_id: account.id,
        code,
        target: normalized,
        target_type: 'sms',
        ttlMinutes: 10,
      })

      // Gửi SMS OTP
      const smsResult = await sendSmsOtp(normalized, code)

      return res.json({
        success: true,
        accountId: account.id,
        target: maskPhone(normalized),
        targetType: 'sms',
        isMock: smsResult.isMock || false,
        mockCode: smsResult.isMock ? smsResult.code : undefined,
        message: smsResult.isMock
          ? `Mã thử nghiệm: ${code} (đã ghi log server)`
          : `Đã gửi mã xác minh 6 số tới ${maskPhone(normalized)}`,
      })
    } catch (err) {
      console.error('Phone OTP error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi gửi mã OTP' })
    }
  })

  // ── 3. Đăng nhập / Đăng ký qua Google (OAuth) ───────────────────
  app.post('/api/auth/google', otpRateLimiter, async (req, res) => {
    try {
      const { credential, userInfo } = req.body
      let email = ''
      let googleId = ''
      let name = ''
      let picture = ''

      if (credential) {
        // Xác thực Google ID token qua Google tokeninfo endpoint
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
        if (!verifyRes.ok) {
          const errData = await verifyRes.json()
          return res.status(400).json({ success: false, error: errData.error_description || 'Mã xác thực Google không hợp lệ' })
        }
        const tokenData = await verifyRes.json()
        email = tokenData.email
        googleId = tokenData.sub
        name = tokenData.name || ''
        picture = tokenData.picture || ''
      } else if (userInfo && userInfo.email && userInfo.googleId) {
        // Dùng khi dev test hoặc client đã parse an toàn
        email = userInfo.email
        googleId = userInfo.googleId
        name = userInfo.name || ''
        picture = userInfo.picture || ''
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin xác thực từ Google' })
      }

      if (!email) {
        return res.status(400).json({ success: false, error: 'Không lấy được email từ tài khoản Google' })
      }

      // Tìm hoặc tạo tài khoản
      let account = findAccountByGoogleId(googleId) || findAccountByEmail(email)
      if (!account) {
        account = createAccount({
          method: 'google',
          google_id: googleId,
          email,
          full_name: name,
          avatar_url: picture,
          verified: 0,
        })
      }

      // Theo yêu cầu của Quan: Bắt buộc gửi mã xác minh 6 số về email của tài khoản Google này
      const code = generateSixDigitCode()
      createVerificationCode({
        account_id: account.id,
        code,
        target: email,
        target_type: 'email',
        ttlMinutes: 10,
      })

      // Gửi email xác minh qua Nodemailer (Gmail)
      try {
        await sendVerificationCodeEmail({ to: email, code, name: name || 'Quý khách' })
      } catch (mailErr) {
        console.warn('⚠️ Gửi email OTP Google thất bại:', mailErr.message)
        // Nếu lỗi mail trong dev, vẫn trả về code để test
        return res.json({
          success: true,
          accountId: account.id,
          email: maskEmail(email),
          targetType: 'email',
          isMock: true,
          mockCode: code,
          message: `Không gửi được mail thật (${mailErr.message}). Mã test là: ${code}`,
        })
      }

      return res.json({
        success: true,
        accountId: account.id,
        email: maskEmail(email),
        targetType: 'email',
        message: `Mã xác minh 6 số đã được gửi về hộp thư ${maskEmail(email)}. Vui lòng kiểm tra hộp thư (cả mục Spam/Thư rác).`,
      })
    } catch (err) {
      console.error('Google Auth error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi xác thực Google' })
    }
  })

  // ── 4. Đăng nhập / Đăng ký qua Facebook (OAuth) ─────────────────
  app.post('/api/auth/facebook', otpRateLimiter, async (req, res) => {
    try {
      const { accessToken, userInfo } = req.body
      let email = ''
      let facebookId = ''
      let name = ''

      if (accessToken) {
        // Gọi Graph API để lấy thông tin
        const fbRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${accessToken}`)
        if (!fbRes.ok) {
          return res.status(400).json({ success: false, error: 'Access token Facebook không hợp lệ' })
        }
        const fbData = await fbRes.json()
        facebookId = fbData.id
        name = fbData.name
        email = fbData.email || ''
      } else if (userInfo && userInfo.facebookId) {
        facebookId = userInfo.facebookId
        email = userInfo.email || ''
        name = userInfo.name || ''
      } else {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin đăng nhập Facebook' })
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Tài khoản Facebook của bạn không công khai email. Vui lòng chọn đăng ký bằng Số điện thoại hoặc Google.',
        })
      }

      // Tìm hoặc tạo tài khoản
      let account = findAccountByFacebookId(facebookId) || findAccountByEmail(email)
      if (!account) {
        account = createAccount({
          method: 'facebook',
          facebook_id: facebookId,
          email,
          full_name: name,
          verified: 0,
        })
      }

      // Bắt buộc gửi mã xác minh 6 số về email
      const code = generateSixDigitCode()
      createVerificationCode({
        account_id: account.id,
        code,
        target: email,
        target_type: 'email',
        ttlMinutes: 10,
      })

      try {
        await sendVerificationCodeEmail({ to: email, code, name: name || 'Quý khách' })
      } catch (mailErr) {
        console.warn('⚠️ Gửi email OTP Facebook thất bại:', mailErr.message)
        return res.json({
          success: true,
          accountId: account.id,
          email: maskEmail(email),
          targetType: 'email',
          isMock: true,
          mockCode: code,
          message: `Không gửi được mail thật (${mailErr.message}). Mã test là: ${code}`,
        })
      }

      return res.json({
        success: true,
        accountId: account.id,
        email: maskEmail(email),
        targetType: 'email',
        message: `Mã xác minh 6 số đã được gửi về ${maskEmail(email)}. Vui lòng kiểm tra hộp thư.`,
      })
    } catch (err) {
      console.error('Facebook Auth error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi xác thực Facebook' })
    }
  })

  // ── 5. Xác minh Mã 6 số (Xác thực tài khoản & Cấp Voucher) ─────
  app.post('/api/auth/verify', verifyRateLimiter, async (req, res) => {
    try {
      const { accountId, code } = req.body

      if (!accountId || !code) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mã xác minh' })
      }

      const cleanCode = String(code).trim()
      const activeCode = findLatestActiveCode(accountId)

      if (!activeCode) {
        return res.status(400).json({
          success: false,
          error: 'Mã xác minh đã hết hạn hoặc không tồn tại. Vui lòng bấm "Gửi lại mã".',
        })
      }

      if (activeCode.attempts >= 5) {
        return res.status(400).json({
          success: false,
          error: 'Bạn đã nhập sai quá 5 lần. Mã này đã bị vô hiệu hóa. Vui lòng yêu cầu mã mới.',
        })
      }

      // So khớp mã xác minh
      if (cleanCode !== activeCode.code) {
        const attempts = incrementCodeAttempts(activeCode.id)
        const remaining = Math.max(0, 5 - attempts)
        return res.status(400).json({
          success: false,
          error: `Mã xác minh không chính xác. Còn lại ${remaining} lần thử.`,
          remainingAttempts: remaining,
        })
      }

      // Mã đúng -> Đánh dấu mã đã dùng & tài khoản verified
      markCodeUsed(activeCode.id)
      const verifiedAccount = markAccountVerified(accountId)

      // Cấp Voucher chào mừng độc quyền (10% + Freeship)
      const voucher = createWelcomeVoucher(accountId)

      // Gửi email chúc mừng & tặng voucher (chạy ngầm không chặn response)
      if (verifiedAccount.email) {
        sendWelcomeVoucherEmail({
          to: verifiedAccount.email,
          code: voucher.code,
          name: verifiedAccount.full_name || 'Quý khách',
        }).catch((err) => console.warn('⚠️ Gửi email chào mừng lỗi:', err.message))
      }

      return res.json({
        success: true,
        account: {
          id: verifiedAccount.id,
          method: verifiedAccount.method,
          email: verifiedAccount.email,
          phone: verifiedAccount.phone,
          fullName: verifiedAccount.full_name,
          verified: true,
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
      console.error('Verify code error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi xác minh mã' })
    }
  })

  // ── 6. Gửi lại Mã xác minh (Resend) ─────────────────────────────
  app.post('/api/auth/resend', otpRateLimiter, async (req, res) => {
    try {
      const { accountId } = req.body
      const account = findAccountById(accountId)

      if (!account) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản' })
      }

      const code = generateSixDigitCode()
      const target = account.method === 'phone' ? account.phone : account.email
      const targetType = account.method === 'phone' ? 'sms' : 'email'

      if (!target) {
        return res.status(400).json({ success: false, error: 'Tài khoản không có thông tin nhận mã' })
      }

      createVerificationCode({
        account_id: account.id,
        code,
        target,
        target_type: targetType,
        ttlMinutes: 10,
      })

      if (targetType === 'sms') {
        const smsResult = await sendSmsOtp(target, code)
        return res.json({
          success: true,
          target: maskPhone(target),
          isMock: smsResult.isMock,
          mockCode: smsResult.isMock ? smsResult.code : undefined,
          message: smsResult.isMock
            ? `Mã thử nghiệm: ${code} (đã ghi log server)`
            : `Đã gửi lại mã OTP tới ${maskPhone(target)}`,
        })
      } else {
        await sendVerificationCodeEmail({ to: target, code, name: account.full_name || 'Quý khách' })
        return res.json({
          success: true,
          target: maskEmail(target),
          message: `Đã gửi lại mã xác minh mới tới ${maskEmail(target)}`,
        })
      }
    } catch (err) {
      console.error('Resend OTP error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi gửi lại mã' })
    }
  })

  // ── 7. Tra cứu Voucher (cho Giỏ hàng & Checkout) ────────────────
  app.get('/api/vouchers/validate', (req, res) => {
    try {
      const { code, accountId, subtotal } = req.query
      const result = validateVoucher(code, {
        accountId,
        subtotal: Number(subtotal) || 0,
      })
      return res.json(result)
    } catch (err) {
      console.error('Validate voucher error:', err)
      return res.status(500).json({ isValid: false, error: err.message })
    }
  })

  // ── 8. Lấy thông tin Voucher của tài khoản đang đăng nhập ───────
  app.get('/api/auth/my-voucher', (req, res) => {
    try {
      const { accountId } = req.query
      if (!accountId) {
        return res.status(400).json({ success: false, error: 'Thiếu accountId' })
      }
      const voucher = getVoucherByAccountId(accountId)
      return res.json({
        success: true,
        voucher: voucher || null,
      })
    } catch (err) {
      console.error('Get my voucher error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  // ── 9. Thống kê tài khoản & Voucher cho trang Admin Broadcast ──
  app.get('/api/admin/broadcast/stats', (req, res) => {
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

  // ── 10. Gửi thông báo hàng loạt (Admin Broadcast) ───────────────
  app.post('/api/admin/broadcast', async (req, res) => {
    try {
      const { password, subject, contentHtml, broadcastType = 'Sản phẩm mới' } = req.body

      // Xác thực mật khẩu quản trị
      const authCheck = verifyAdminLogin(password)
      if (authCheck.status !== 200) {
        return res.status(authCheck.status).json(authCheck.data)
      }

      if (!subject || !contentHtml || !String(subject).trim() || !String(contentHtml).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng điền đầy đủ tiêu đề và nội dung thông báo',
        })
      }

      // Lấy danh sách tài khoản đã xác minh có email
      const verifiedSubscribers = getAllVerifiedAccounts()

      if (verifiedSubscribers.length === 0) {
        return res.json({
          success: true,
          count: 0,
          message: 'Chưa có tài khoản nào đã xác minh email để gửi thông báo.',
        })
      }

      console.log(`\n📢 [ADMIN BROADCAST] Bắt đầu gửi thông báo: "${subject}"`)
      console.log(`👥 Tổng số người nhận: ${verifiedSubscribers.length}`)

      let sentCount = 0
      const errors = []

      for (const subscriber of verifiedSubscribers) {
        try {
          await sendBroadcastEmail({
            to: subscriber.email,
            subject: subject.trim(),
            contentHtml: contentHtml.trim(),
            broadcastType: broadcastType.trim(),
          })
          sentCount++
          console.log(`  ✓ Đã gửi tới: ${subscriber.email} (${sentCount}/${verifiedSubscribers.length})`)

          // Thêm độ trễ nhỏ (150ms) giữa các email để tuân thủ rate limit của Gmail
          await sleep(150)
        } catch (sendErr) {
          console.error(`  ✗ Lỗi gửi tới ${subscriber.email}:`, sendErr.message)
          errors.push({ email: subscriber.email, error: sendErr.message })
        }
      }

      // Lưu nhật ký đợt gửi
      createBroadcastLog({
        subject: subject.trim(),
        content: contentHtml.trim(),
        recipients_count: sentCount,
      })

      console.log(`🏁 [BROADCAST HOÀN TẤT] Đã gửi thành công ${sentCount}/${verifiedSubscribers.length} email.`)

      return res.json({
        success: true,
        count: sentCount,
        total: verifiedSubscribers.length,
        errors,
        message: `Đã gửi thành công ${sentCount} email thông báo tới khách hàng.`,
      })
    } catch (err) {
      console.error('Admin broadcast error:', err)
      return res.status(500).json({ success: false, error: err.message || 'Lỗi gửi broadcast' })
    }
  })
}
