import crypto from 'crypto'
import { getDb } from './accountDb.js'
import { RegisterDtoSchema, LoginDtoSchema, SendOtpDtoSchema, VerifyOtpDtoSchema, validateBody } from './authDto.js'
import { hashPassword, verifyPassword } from './passwordService.js'
import { cacheSet, cacheGet, cacheDel, checkRateLimit } from './cacheService.js'
import {
  createSessionAndTokens,
  rotateRefreshToken,
  revokeSessionByToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyAccessToken,
  REFRESH_COOKIE_NAME,
} from './tokenService.js'
import { verifyTurnstileToken } from './turnstileService.js'
import { logSecurityAudit } from './auditLogger.js'
import { parseCookies, setCustomerSessionCookie, clearCustomerSessionCookie } from './customerSessionMiddleware.js'
import { sendVerificationCodeEmail, sendWelcomeVoucherEmail } from './emailAccount.js'
import { createWelcomeVoucher } from './accountDb.js'

/**
 * Đăng ký bộ API Xác thực Chuẩn Doanh nghiệp (Enterprise Auth Endpoints)
 */
export function registerEnterpriseAuthEndpoints(app) {
  // Helper lấy Client IP
  const getClientIp = (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '127.0.0.1'

  // Helper lấy User-Agent
  const getUserAgent = (req) => req.headers['user-agent'] || 'Unknown-Client'

  // ── 1. ĐĂNG KÝ TÀI KHOẢN MỚI (BƯỚC 3) ──────────────────────────
  app.post('/api/auth/register', validateBody(RegisterDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, password, fullName, phone, marketingOptIn, turnstileToken } = req.validatedBody

    try {
      // A. Rate limiting (tối đa 5 lần đăng ký / 10 phút / IP)
      const rl = await checkRateLimit(`register:${ip}`, 5, 600)
      if (!rl.allowed) {
        logSecurityAudit({ action: 'REGISTER_RATE_LIMITED', status: 'BLOCKED', ip, userAgent })
        return res.status(429).json({
          success: false,
          error: `Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau ${rl.retryAfter} giây.`,
        })
      }

      // B. Xác thực Turnstile Captcha (BƯỚC 8)
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip)
      if (!turnstileCheck.success) {
        return res.status(400).json({ success: false, error: turnstileCheck.error })
      }

      const db = getDb()

      // C. Kiểm tra email đã tồn tại hay chưa
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email)
      if (existingUser) {
        logSecurityAudit({
          action: 'REGISTER_DUPLICATE_EMAIL',
          status: 'FAILURE',
          ip,
          userAgent,
          details: { email },
        })
        return res.status(409).json({
          success: false,
          error: 'Email này đã được đăng ký tài khoản. Quý khách vui lòng chọn Đăng nhập hoặc Quên mật khẩu.',
        })
      }

      // D. Băm mật khẩu bằng Argon2id (BƯỚC 2)
      const passwordHash = await hashPassword(password)
      const userId = `usr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
      const now = new Date().toISOString()

      // E. Lưu vào bảng users (BƯỚC 1)
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, full_name, phone, role, status, verified, marketing_email_opt_in, marketing_opt_in_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'customer', 'active', 0, ?, ?, ?, ?)
      `).run(
        userId,
        email,
        passwordHash,
        fullName,
        phone || null,
        marketingOptIn ? 1 : 0,
        marketingOptIn ? now : null,
        now,
        now
      )

      // Đồng thời lưu vào enterprise_accounts (Local Provider)
      const entAccountId = `eacc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
      db.prepare(`
        INSERT INTO enterprise_accounts (id, user_id, provider, provider_account_id, email, created_at, updated_at)
        VALUES (?, ?, 'local', ?, ?, ?, ?)
      `).run(entAccountId, userId, userId, email, now, now)

      // F. Tự động cấp Voucher chào mừng WELCOME10
      let voucherCode = 'WELCOME10'
      try {
        const welcomeVoucher = createWelcomeVoucher(userId)
        voucherCode = welcomeVoucher?.code || 'WELCOME10'
      } catch (vErr) {
        // Fallback an toàn nếu voucher đã tồn tại
      }

      // G. Khởi tạo phiên & Token Rotation (BƯỚC 4)
      const user = { id: userId, email, full_name: fullName, role: 'customer' }
      const tokens = await createSessionAndTokens(user, { ip, userAgent })

      setRefreshTokenCookie(res, tokens.refreshToken)
      setCustomerSessionCookie(res, tokens.refreshToken) // Tương thích backward

      logSecurityAudit({
        userId,
        action: 'REGISTER_SUCCESS',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email, marketingOptIn },
      })

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Mã ưu đãi chào mừng WELCOME10 đã được lưu vào ví voucher của bạn.',
        user: {
          id: userId,
          email,
          fullName,
          role: 'customer',
          voucherCode,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      })
    } catch (err) {
      console.error('Lỗi API Register:', err)
      logSecurityAudit({ action: 'REGISTER_ERROR', status: 'FAILURE', ip, userAgent, details: err.message })
      return res.status(500).json({ success: false, error: 'Đã có lỗi xảy ra trong quá trình đăng ký tài khoản.' })
    }
  })

  // ── 2. ĐĂNG NHẬP BẰNG EMAIL & MẬT KHẨU (BƯỚC 3) ────────────────
  app.post('/api/auth/login', validateBody(LoginDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, password, turnstileToken } = req.validatedBody

    try {
      // A. Rate limiting chống Brute-Force (tối đa 10 lần / 5 phút / IP)
      const rl = await checkRateLimit(`login:${ip}`, 10, 300)
      if (!rl.allowed) {
        logSecurityAudit({ action: 'LOGIN_BRUTE_FORCE_BLOCKED', status: 'BLOCKED', ip, userAgent })
        return res.status(429).json({
          success: false,
          error: `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng chờ ${rl.retryAfter} giây trước khi thử lại.`,
        })
      }

      // B. Turnstile Captcha
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip)
      if (!turnstileCheck.success) {
        return res.status(400).json({ success: false, error: turnstileCheck.error })
      }

      const db = getDb()
      const user = db.prepare(`
        SELECT id, email, password_hash, full_name, role, status, avatar_url, verified
        FROM users
        WHERE LOWER(email) = ?
      `).get(email)

      if (!user) {
        logSecurityAudit({ action: 'LOGIN_USER_NOT_FOUND', status: 'FAILURE', ip, userAgent, details: { email } })
        return res.status(401).json({
          success: false,
          error: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        })
      }

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị tạm ngưng hoạt động.' })
      }

      // Nếu tài khoản được tạo qua Google OAuth và chưa đặt mật khẩu
      if (!user.password_hash) {
        return res.status(400).json({
          success: false,
          error: 'Tài khoản này được đăng ký qua Google. Vui lòng nhấn "Đăng nhập bằng Google".',
        })
      }

      // C. So khớp mật khẩu băm Argon2id (BƯỚC 2)
      const isValidPassword = await verifyPassword(password, user.password_hash)
      if (!isValidPassword) {
        logSecurityAudit({
          userId: user.id,
          action: 'LOGIN_WRONG_PASSWORD',
          status: 'FAILURE',
          ip,
          userAgent,
        })
        return res.status(401).json({
          success: false,
          error: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        })
      }

      // Cập nhật last_login_at
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id)

      // D. Cấp Access Token + Refresh Token (BƯỚC 4 Token Rotation)
      const tokens = await createSessionAndTokens(user, { ip, userAgent })
      setRefreshTokenCookie(res, tokens.refreshToken)
      setCustomerSessionCookie(res, tokens.refreshToken)

      logSecurityAudit({ userId: user.id, action: 'LOGIN_SUCCESS', status: 'SUCCESS', ip, userAgent })

      return res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
          verified: Boolean(user.verified),
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      })
    } catch (err) {
      console.error('Lỗi API Login:', err)
      return res.status(500).json({ success: false, error: 'Lỗi hệ thống khi đăng nhập.' })
    }
  })

  // ── 3. XOAY VÒNG TOKEN (TOKEN ROTATION ENDPOINT) (BƯỚC 4) ─────
  app.post('/api/auth/refresh', async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)

    const cookieHeader = req.headers.cookie || ''
    const cookies = parseCookies(cookieHeader)
    const rawRefreshToken = cookies[REFRESH_COOKIE_NAME] || cookies['qns_session'] || req.body?.refreshToken

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy refresh token trong cookie hoặc yêu cầu',
        code: 'TOKEN_EXPIRED',
      })
    }

    const rotationResult = await rotateRefreshToken(rawRefreshToken, { ip, userAgent })

    if (!rotationResult.success) {
      clearRefreshTokenCookie(res)
      clearCustomerSessionCookie(res)
      return res.status(401).json({
        success: false,
        error: rotationResult.error,
        code: 'TOKEN_ROTATION_FAILED',
      })
    }

    setRefreshTokenCookie(res, rotationResult.refreshToken)
    setCustomerSessionCookie(res, rotationResult.refreshToken)

    return res.json({
      success: true,
      accessToken: rotationResult.accessToken,
      expiresIn: rotationResult.expiresIn,
      user: rotationResult.user,
    })
  })

  // ── 4. GỬI MÃ OTP XÁC MINH QUA EMAIL (BƯỚC 2 & BƯỚC 3) ─────────
  app.post('/api/auth/otp/send', validateBody(SendOtpDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const { email, purpose, turnstileToken } = req.validatedBody

    // Rate limiting: 1 OTP mỗi 60 giây cho 1 email
    const rl = await checkRateLimit(`otp:send:${email}`, 1, 60)
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        error: `Vui lòng chờ ${rl.retryAfter} giây trước khi yêu cầu gửi lại mã xác nhận.`,
      })
    }

    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip)
    if (!turnstileCheck.success) {
      return res.status(400).json({ success: false, error: turnstileCheck.error })
    }

    // Sinh OTP 6 chữ số
    const otpCode = crypto.randomInt(100000, 999999).toString()

    // Lưu vào Redis / Memory Cache với TTL 5 phút (300 giây)
    const cacheKey = `otp:${purpose}:${email}`
    await cacheSet(cacheKey, otpCode, 300)

    try {
      await sendVerificationCodeEmail({
        to: email,
        code: otpCode,
        purpose,
        accountName: email.split('@')[0],
      })
    } catch (mailErr) {
      console.warn('⚠️ Lỗi gửi email OTP:', mailErr.message)
    }

    logSecurityAudit({
      action: 'OTP_SENT',
      status: 'SUCCESS',
      ip,
      details: { email, purpose },
    })

    return res.json({
      success: true,
      message: `Mã OTP xác nhận (6 chữ số) đã được gửi đến hòm thư ${email}. Mã có hiệu lực trong 5 phút.`,
      expiresIn: 300,
    })
  })

  // ── 5. XÁC MINH MÃ OTP (BƯỚC 3) ────────────────────────────────
  app.post('/api/auth/otp/verify', validateBody(VerifyOtpDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const { email, code, purpose } = req.validatedBody

    const cacheKey = `otp:${purpose}:${email}`
    const storedOtp = await cacheGet(cacheKey)

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác minh OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.',
      })
    }

    if (String(storedOtp).trim() !== String(code).trim()) {
      logSecurityAudit({ action: 'OTP_INVALID', status: 'FAILURE', ip, details: { email, purpose } })
      return res.status(400).json({
        success: false,
        error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại 6 chữ số nhận được.',
      })
    }

    // Xóa OTP ngay sau khi xác minh thành công để chống Replay Attack
    await cacheDel(cacheKey)

    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET verified = 1, verified_at = ? WHERE LOWER(email) = ?').run(now, email)

    logSecurityAudit({ action: 'OTP_VERIFIED', status: 'SUCCESS', ip, details: { email, purpose } })

    return res.json({
      success: true,
      message: 'Xác minh thành công! Địa chỉ email của quý khách đã được xác thực.',
    })
  })

}
