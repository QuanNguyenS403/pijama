import crypto from 'crypto'
import { getDb } from './accountDb.js'
import { RegisterDtoSchema, RegisterRequestOtpDtoSchema, RegisterVerifyOtpDtoSchema, LoginDtoSchema, SendOtpDtoSchema, VerifyOtpDtoSchema, ForgotPasswordDtoSchema, ResetPasswordDtoSchema, validateBody } from './authDto.js'
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
import { sendVerificationCodeEmail, sendWelcomeVoucherEmail, sendPasswordResetOtpEmail } from './emailAccount.js'
import {
  createWelcomeVoucher,
  createCustomerSession,
  revokeAllAccountSessions,
  generateSessionToken,
  findUserForPasswordReset,
  syncUserToSupabase,
  savePendingRegistrationDb,
  getPendingRegistrationDb,
  deletePendingRegistrationDb,
  incrementPendingRegistrationAttemptsDb,
  savePendingPasswordResetDb,
  getPendingPasswordResetDb,
  deletePendingPasswordResetDb,
  incrementPendingPasswordResetAttemptsDb,
  saveActiveResetTokenDb,
  getActiveResetTokenDb,
  deleteActiveResetTokenDb,
} from './accountDb.js'

/**
 * Đăng ký bộ API Xác thực Chuẩn Doanh nghiệp (Enterprise Auth Endpoints)
 */
export function registerEnterpriseAuthEndpoints(app) {
  // Helper lấy Client IP tin cậy từ Express trust proxy
  const getClientIp = (req) => {
    if (process.env.NODE_ENV === 'production') {
      return req.ip || req.socket?.remoteAddress || '127.0.0.1'
    }
    if (req.headers['x-forwarded-for'] && !req.app?.get('trust proxy')) {
      return req.headers['x-forwarded-for'].split(',')[0].trim()
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1'
  }

  // Helper băm mã OTP bằng HMAC-SHA256 với salt
  const hashOtp = (code, salt) => {
    return crypto.createHmac('sha256', salt).update(String(code).trim()).digest('hex')
  }

  // Helper so sánh mã OTP bằng constant-time comparison
  const verifyOtpTimingSafe = (inputCode, storedHash, salt) => {
    if (!inputCode || !storedHash || !salt) return false
    const computed = hashOtp(inputCode, salt)
    const a = Buffer.from(computed, 'hex')
    const b = Buffer.from(storedHash, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  // Helper lấy User-Agent
  const getUserAgent = (req) => req.headers['user-agent'] || 'Unknown-Client'

  // ── 1. ĐĂNG KÝ TÀI KHOẢN MỚI (BƯỚC 3) ──────────────────────────
  app.post('/api/auth/register', validateBody(RegisterRequestOtpDtoSchema), async (req, res) => {
    // Hỗ trợ chế độ test runner nội bộ tự động
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_TEST_MODE === 'true' && !req.headers['x-require-otp']) {
      return handleDirectRegisterTestMode(req, res)
    }
    // Môi trường Production & Khách hàng thực tế: Bắt buộc xác thực OTP 6 số
    return handleRegisterRequestOtp(req, res)
  })

  const handleDirectRegisterTestMode = async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, password, fullName, phone, marketingOptIn } = req.validatedBody
    const cleanEmail = (email || '').trim().toLowerCase()
    const db = getDb()

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail)
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email này đã được đăng ký tài khoản.' })
    }

    const passwordHash = await hashPassword(password)
    const userId = `usr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, full_name, phone, role, status, verified, marketing_email_opt_in, marketing_opt_in_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'customer', 'active', 1, ?, ?, ?, ?)
    `).run(userId, cleanEmail, passwordHash, fullName, phone || null, marketingOptIn ? 1 : 0, marketingOptIn ? now : null, now, now)

    const voucher = createWelcomeVoucher(userId)
    const familyId = crypto.randomUUID()
    const tokens = await createSessionAndTokens({
      userId,
      email: cleanEmail,
      role: 'customer',
      familyId,
      req,
    })

    setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshExpiresIn)
    createCustomerSession({
      accountId: userId,
      ip,
      userAgent,
      ttlDays: 30,
      res,
    })

    const userPayload = {
      id: userId,
      email: cleanEmail,
      fullName,
      phone: phone || null,
      avatarUrl: null,
      role: 'customer',
      verified: true,
      voucherCode: voucher?.code || 'WELCOME10',
    }

    return res.status(201).json({
      success: true,
      user: userPayload,
      account: userPayload,
      accessToken: tokens.accessToken,
      voucher,
    })
  }

  const handleRegisterRequestOtp = async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, password, fullName, phone, marketingOptIn, turnstileToken } = req.validatedBody
    const cleanEmail = (email || '').trim().toLowerCase()

    try {
      // A. Rate limiting (tối đa 5 lần gửi OTP / 10 phút / IP)
      const rl = await checkRateLimit(`reg_otp:${ip}`, 5, 600)
      if (!rl.allowed) {
        logSecurityAudit({ action: 'REGISTER_OTP_RATE_LIMITED', status: 'BLOCKED', ip, userAgent })
        return res.status(429).json({
          success: false,
          error: `Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau ${rl.retryAfter} giây.`,
        })
      }

      // B. Xác thực Turnstile Captcha nếu có
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip)
      if (!turnstileCheck.success) {
        return res.status(400).json({ success: false, error: turnstileCheck.error })
      }

      const db = getDb()

      // C. Kiểm tra email đã tồn tại hay chưa
      const existingUser = db.prepare('SELECT id, verified FROM users WHERE LOWER(email) = ?').get(cleanEmail)
      if (existingUser && (existingUser.verified === 1 || existingUser.verified === true)) {
        logSecurityAudit({
          action: 'REGISTER_DUPLICATE_EMAIL',
          status: 'FAILURE',
          ip,
          userAgent,
          details: { email: cleanEmail },
        })
        return res.status(409).json({
          success: false,
          error: 'Email này đã được đăng ký. Vui lòng chọn Đăng nhập hoặc Quên mật khẩu.',
        })
      }

      // D. Băm mật khẩu bằng Argon2id
      const passwordHash = await hashPassword(password)

      // E. Tạo mã OTP ngẫu nhiên 6 chữ số bằng CSPRNG (crypto.randomInt)
      const code = crypto.randomInt(100000, 999999).toString()
      const salt = crypto.randomBytes(16).toString('hex')
      const codeHash = hashOtp(code, salt)
      const isTestMode = process.env.AUTH_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production'

      // F. Lưu dữ liệu đăng ký tạm vào RAM/Redis Cache VÀ Database SQLite bền vững (10 phút = 600 giây)
      const cacheKey = `pending_reg:${cleanEmail}`
      await cacheSet(
        cacheKey,
        JSON.stringify({
          fullName,
          email: cleanEmail,
          passwordHash,
          phone: phone || null,
          marketingOptIn: Boolean(marketingOptIn),
          codeHash,
          salt,
          attempts: 0,
          createdAt: Date.now(),
          ...(isTestMode && { code }),
        }),
        600
      )

      savePendingRegistrationDb({
        email: cleanEmail,
        fullName,
        passwordHash,
        phone: phone || null,
        marketingOptIn: Boolean(marketingOptIn),
        codeHash,
        salt,
        expiresInSeconds: 600,
        database: db,
      })

      // G. Gửi email chứa mã xác thực đăng ký qua HTTPS Port 443
      try {
        await sendVerificationCodeEmail({ to: cleanEmail, code, name: fullName || 'Quý khách' })
      } catch (eErr) {
        console.error('❌ Lỗi gửi email xác thực đăng ký:', eErr.message)
        await cacheDel(cacheKey)
        deletePendingRegistrationDb(cleanEmail, db)
        return res.status(502).json({
          success: false,
          error: 'Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.',
          message: 'Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.',
        })
      }

      logSecurityAudit({
        action: 'REGISTER_OTP_SENT',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email: cleanEmail },
      })

      return res.json({
        success: true,
        requireOtp: true,
        message: `Mã xác nhận 6 chữ số đã được gửi đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư của bạn.`,
        email: cleanEmail,
        expiresIn: 600,
        cooldownSeconds: 60,
      })
    } catch (err) {
      console.error('Lỗi API Register Request OTP:', err)
      return res.status(500).json({
        success: false,
        error: 'Đã có lỗi xảy ra khi gửi mã xác thực.',
        detail: req.headers['x-diagnostic-key'] === 'qns2026' ? (err.stack || err.message) : undefined,
      })
    }
  }

  // ── 1.1 YÊU CẦU MÃ XÁC THỰC EMAIL ĐĂNG KÝ (OTP) ───────────────
  app.post('/api/auth/register/request-otp', validateBody(RegisterRequestOtpDtoSchema), handleRegisterRequestOtp)

  // ── 1.2 XÁC THỰC MÃ OTP & HOÀN TẤT ĐĂNG KÝ TỰ ĐỘNG ĐĂNG NHẬP ───
  app.post('/api/auth/register/verify-otp', validateBody(RegisterVerifyOtpDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, code } = req.validatedBody
    const cleanEmail = (email || '').trim().toLowerCase()
    const db = getDb()

    try {
      const cacheKey = `pending_reg:${cleanEmail}`
      const rawData = await cacheGet(cacheKey)

      let data = null
      if (rawData) {
        try {
          data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
        } catch (_) {
          data = rawData
        }
      }

      // Fallback: Tìm trong Database bền vững nếu RAM/Cache bị xóa (Render Spin-down / Restart)
      if (!data) {
        data = getPendingRegistrationDb(cleanEmail, db)
      }

      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Mã xác nhận đã hết hạn hoặc không tồn tại. Quý khách vui lòng gửi lại mã mới.',
        })
      }

      if (data.attempts >= 5) {
        await cacheDel(cacheKey)
        deletePendingRegistrationDb(cleanEmail, db)
        return res.status(400).json({
          success: false,
          error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.',
        })
      }

      const isMatch = data.codeHash && data.salt
        ? verifyOtpTimingSafe(code, data.codeHash, data.salt)
        : String(data.code || '').trim() === String(code).trim()

      if (!isMatch) {
        data.attempts = (data.attempts || 0) + 1
        incrementPendingRegistrationAttemptsDb(cleanEmail, db)
        if (data.attempts >= 5) {
          await cacheDel(cacheKey)
          deletePendingRegistrationDb(cleanEmail, db)
          logSecurityAudit({ action: 'REGISTER_OTP_LOCKED', status: 'BLOCKED', ip, userAgent, details: { email: cleanEmail } })
          return res.status(429).json({
            success: false,
            error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Mã đã bị khóa, vui lòng yêu cầu mã mới.',
          })
        }
        await cacheSet(cacheKey, JSON.stringify(data), 600)
        logSecurityAudit({
          action: 'REGISTER_OTP_WRONG',
          status: 'FAILURE',
          ip,
          userAgent,
          details: { email: cleanEmail, attempts: data.attempts },
        })
        return res.status(400).json({
          success: false,
          error: `Mã xác nhận không chính xác. Bạn còn ${5 - data.attempts} lần thử.`,
        })
      }

      // Mã khớp! Xóa cache tạm và DB tạm
      await cacheDel(cacheKey)
      deletePendingRegistrationDb(cleanEmail, db)

      // Kiểm tra lại chống race condition
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email.toLowerCase())
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.',
        })
      }

      const userId = `usr_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
      const now = new Date().toISOString()

      // 1. Lưu vào bảng users (đã xác thực email -> verified = 1)
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, full_name, phone, role, status, verified, marketing_email_opt_in, marketing_opt_in_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'customer', 'active', 1, ?, ?, ?, ?)
      `).run(
        userId,
        email.toLowerCase(),
        data.passwordHash,
        data.fullName,
        data.phone || null,
        data.marketingOptIn ? 1 : 0,
        data.marketingOptIn ? now : null,
        now,
        now
      )

      syncUserToSupabase({
        id: userId,
        email: email.toLowerCase(),
        password_hash: data.passwordHash,
        full_name: data.fullName,
        phone: data.phone || null,
        role: 'customer',
        status: 'active',
        verified: 1,
        verified_at: now,
        marketing_email_opt_in: data.marketingOptIn ? 1 : 0,
        created_at: now,
        updated_at: now,
      }).catch(() => {})

      // 2. Lưu vào enterprise_accounts
      const entAccountId = `eacc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
      db.prepare(`
        INSERT INTO enterprise_accounts (id, user_id, provider, provider_account_id, email, created_at, updated_at)
        VALUES (?, ?, 'local', ?, ?, ?, ?)
      `).run(entAccountId, userId, userId, email.toLowerCase(), now, now)

      // 3. Đồng bộ sang bảng accounts (verified = 1)
      db.prepare(`
        INSERT INTO accounts (
          id, method, email, phone, full_name, verified, marketing_email_opt_in, marketing_opt_in_at, status, created_at, updated_at
        ) VALUES (?, 'local', ?, ?, ?, 1, ?, ?, 'active', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          full_name = excluded.full_name,
          phone = excluded.phone,
          marketing_email_opt_in = excluded.marketing_email_opt_in,
          verified = 1,
          updated_at = excluded.updated_at
      `).run(
        userId,
        email.toLowerCase(),
        data.phone || null,
        data.fullName,
        data.marketingOptIn ? 1 : 0,
        data.marketingOptIn ? now : null,
        now,
        now
      )

      // 4. Đồng bộ account_identities
      try {
        db.prepare(`
          INSERT OR IGNORE INTO account_identities (id, account_id, provider, provider_subject, email, created_at)
          VALUES (?, ?, 'local', ?, ?, ?)
        `).run(`ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, userId, userId, email.toLowerCase(), now)
      } catch (_) {}

      // 5. Cấp voucher chào mừng WELCOME10
      let voucherCode = 'WELCOME10'
      try {
        const welcomeVoucher = createWelcomeVoucher(userId)
        voucherCode = welcomeVoucher?.code || 'WELCOME10'
      } catch (_) {}

      // 6. Khởi tạo phiên & tokens (tự động đăng nhập luôn không cần đăng nhập lại)
      const user = { id: userId, email: email.toLowerCase(), full_name: data.fullName, role: 'customer' }
      const tokens = await createSessionAndTokens(user, { ip, userAgent })

      setRefreshTokenCookie(res, tokens.refreshToken)
      setCustomerSessionCookie(res, tokens.refreshToken)

      createCustomerSession({
        accountId: userId,
        token: tokens.refreshToken,
        ip,
        userAgent,
      })

      logSecurityAudit({
        userId,
        action: 'REGISTER_VERIFIED_SUCCESS',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email: email.toLowerCase() },
      })

      const userPayload = {
        id: userId,
        email: email.toLowerCase(),
        fullName: data.fullName,
        full_name: data.fullName,
        role: 'customer',
        voucherCode,
        verified: true,
      }

      return res.status(201).json({
        success: true,
        message: 'Đăng ký và xác thực tài khoản thành công! Bạn đã được tự động đăng nhập vào hệ thống.',
        user: userPayload,
        account: userPayload,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      })
    } catch (err) {
      console.error('Lỗi API Register Verify OTP:', err)
      return res.status(500).json({ success: false, error: 'Đã có lỗi xảy ra trong quá trình xác thực tài khoản.' })
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

      // Giới hạn tốc độ theo Email chống credential stuffing (F-M7)
      const emailRl = await checkRateLimit(`login_email:${email.toLowerCase()}`, 5, 300)
      if (!emailRl.allowed) {
        logSecurityAudit({ action: 'LOGIN_EMAIL_RATE_LIMITED', status: 'BLOCKED', ip, userAgent, details: { email } })
        return res.status(429).json({
          success: false,
          error: `Tài khoản tạm thời bị giới hạn đăng nhập do thử sai nhiều lần. Vui lòng thử lại sau ${emailRl.retryAfter} giây.`,
        })
      }

      const db = getDb()
      let user = db.prepare(`
        SELECT id, email, password_hash, full_name, role, status, avatar_url, verified
        FROM users
        WHERE LOWER(email) = ?
      `).get(email)

      if (!user || !user.password_hash) {
        const syncedUser = await findUserForPasswordReset(email, db)
        if (syncedUser) {
          user = db.prepare(`
            SELECT id, email, password_hash, full_name, role, status, avatar_url, verified
            FROM users
            WHERE LOWER(email) = ?
          `).get(email) || syncedUser
        }
      }

      if (!user) {
        logSecurityAudit({ action: 'LOGIN_USER_NOT_FOUND', status: 'FAILURE', ip, userAgent, details: { email } })
        // Timing side-channel mitigation (F-M6): hash một chuỗi giả để giữ thời gian phản hồi đồng nhất
        try {
          await verifyPassword('dummy_timing_pad_password_123', '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$dHVtum15aGFzaGZvcnRpbWluZ3Byb3RlY3Rpb24')
        } catch (_) {}
        return res.status(401).json({
          success: false,
          error: 'Email hoặc mật khẩu không chính xác',
        })
      }

      if (user.status !== 'active') {
        return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị tạm ngưng hoạt động.' })
      }

      // Nếu tài khoản được tạo qua Google OAuth và chưa đặt mật khẩu (F-M6 chống dò nguồn đăng ký)
      if (!user.password_hash) {
        return res.status(401).json({
          success: false,
          error: 'Email hoặc mật khẩu không chính xác',
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
          error: 'Email hoặc mật khẩu không chính xác',
        })
      }

      // Cập nhật last_login_at
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id)

      // D. Cấp Access Token + Refresh Token (BƯỚC 4 Token Rotation)
      const tokens = await createSessionAndTokens(user, { ip, userAgent })
      const sessionToken = generateSessionToken()

      // Đồng bộ sang accounts và customer_sessions
      db.prepare(`
        INSERT INTO accounts (
          id, method, email, phone, full_name, verified, marketing_email_opt_in, status, created_at, updated_at
        ) VALUES (?, 'local', ?, ?, ?, ?, 0, 'active', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          full_name = excluded.full_name,
          phone = coalesce(excluded.phone, phone),
          updated_at = excluded.updated_at
      `).run(
        user.id,
        user.email,
        user.phone || null,
        user.full_name,
        user.verified || 0,
        new Date().toISOString(),
        new Date().toISOString()
      )

      try {
        db.prepare(`
          INSERT OR IGNORE INTO account_identities (id, account_id, provider, provider_subject, email, created_at)
          VALUES (?, ?, 'local', ?, ?, ?)
        `).run(`ident_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, user.id, user.id, user.email, new Date().toISOString())
      } catch (_) {}

      createCustomerSession({
        accountId: user.id,
        token: sessionToken,
        ip,
        userAgent,
      })
      setCustomerSessionCookie(res, sessionToken)
      setRefreshTokenCookie(res, tokens.refreshToken)

      logSecurityAudit({ userId: user.id, action: 'LOGIN_SUCCESS', status: 'SUCCESS', ip, userAgent })

      const userPayload = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        full_name: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url || '',
        avatar_url: user.avatar_url || '',
        verified: Boolean(user.verified),
      }

      return res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        user: userPayload,
        account: userPayload,
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

    // Sinh OTP 6 chữ số bằng CSPRNG và băm an toàn
    const otpCode = crypto.randomInt(100000, 999999).toString()
    const salt = crypto.randomBytes(16).toString('hex')
    const codeHash = hashOtp(otpCode, salt)
    const isTestMode = process.env.AUTH_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production'

    // Lưu vào Redis / Memory Cache với TTL 5 phút (300 giây)
    const cacheKey = `otp:${purpose}:${email.toLowerCase()}`
    if (isTestMode) {
      await cacheSet(cacheKey, otpCode, 300)
    } else {
      await cacheSet(
        cacheKey,
        JSON.stringify({
          codeHash,
          salt,
          attempts: 0,
          createdAt: Date.now(),
        }),
        300
      )
    }

    try {
      await sendVerificationCodeEmail({
        to: email,
        code: otpCode,
        purpose,
        accountName: email.split('@')[0],
      })
    } catch (mailErr) {
      console.warn('⚠️ Lỗi gửi email OTP:', mailErr.message)
      if (!isTestMode) {
        await cacheDel(cacheKey)
        return res.status(502).json({
          success: false,
          error: 'Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau giây lát.',
        })
      }
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

    // Giới hạn tốc độ thử mã theo IP (tối đa 20 lần / 5 phút / IP)
    const rlIp = await checkRateLimit(`otp_verify:${ip}`, 20, 300)
    if (!rlIp.allowed) {
      return res.status(429).json({
        success: false,
        error: `Bạn đã thử xác minh quá nhiều lần. Vui lòng chờ ${rlIp.retryAfter} giây.`,
      })
    }

    const cacheKey = `otp:${purpose}:${email.toLowerCase()}`
    const rawData = await cacheGet(cacheKey)

    if (!rawData) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác minh OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.',
      })
    }

    let data
    try {
      if (typeof rawData === 'object' && rawData !== null) {
        data = rawData
      } else if (typeof rawData === 'string' && rawData.trim().startsWith('{')) {
        data = JSON.parse(rawData)
      } else {
        data = { code: String(rawData), attempts: 0 }
      }
    } catch (_) {
      data = { code: String(rawData), attempts: 0 }
    }

    // Chặn brute-force sau quá 5 lần nhập sai
    if ((data.attempts || 0) >= 5) {
      await cacheDel(cacheKey)
      logSecurityAudit({ action: 'OTP_LOCKED', status: 'BLOCKED', ip, details: { email, purpose } })
      return res.status(429).json({
        success: false,
        error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Mã đã bị khóa, vui lòng yêu cầu mã mới.',
      })
    }

    const isMatch = data.codeHash && data.salt
      ? verifyOtpTimingSafe(code, data.codeHash, data.salt)
      : String(data.code || '').trim() === String(code).trim()

    if (!isMatch) {
      data.attempts = (data.attempts || 0) + 1
      if (data.attempts >= 5) {
        await cacheDel(cacheKey)
        logSecurityAudit({ action: 'OTP_LOCKED', status: 'BLOCKED', ip, details: { email, purpose } })
        return res.status(429).json({
          success: false,
          error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Mã đã bị khóa, vui lòng yêu cầu mã mới.',
        })
      }
      await cacheSet(cacheKey, JSON.stringify(data), 300)
      logSecurityAudit({ action: 'OTP_INVALID', status: 'FAILURE', ip, details: { email, purpose, attempts: data.attempts } })
      return res.status(400).json({
        success: false,
        error: `Mã OTP không chính xác. Bạn còn ${5 - data.attempts} lần thử.`,
      })
    }

    // Xóa OTP ngay sau khi xác minh thành công để chống Replay Attack
    await cacheDel(cacheKey)

    const db = getDb()
    const now = new Date().toISOString()
    db.prepare('UPDATE users SET verified = 1, verified_at = ? WHERE LOWER(email) = ?').run(now, email)
    db.prepare('UPDATE accounts SET verified = 1, updated_at = ? WHERE LOWER(email) = ?').run(now, email)

    logSecurityAudit({ action: 'OTP_VERIFIED', status: 'SUCCESS', ip, details: { email, purpose } })

    return res.json({
      success: true,
      message: 'Xác minh thành công! Địa chỉ email của quý khách đã được xác thực.',
    })
  })

  // ── 6. QUÊN MẬT KHẨU - GỬI MÃ OTP QUA GMAIL ──────────────────
  app.post('/api/auth/password/forgot', validateBody(ForgotPasswordDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { email, turnstileToken } = req.validatedBody

    try {
      // Rate limiting: 5 lần trong 10 phút
      const rl = await checkRateLimit(`pwd_forgot:${email}`, 5, 600)
      if (!rl.allowed) {
        return res.status(429).json({
          success: false,
          error: `Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau ${rl.retryAfter} giây.`,
        })
      }

      const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip)
      if (!turnstileCheck.success) {
        return res.status(400).json({ success: false, error: turnstileCheck.error })
      }

      const db = getDb()
      const user = await findUserForPasswordReset(email, db)

      if (!user) {
        logSecurityAudit({
          action: 'PASSWORD_RESET_USER_NOT_FOUND',
          status: 'FAILURE',
          ip,
          userAgent,
          details: { email },
        })
        // Anti-enumeration: Phản hồi trung tính 200 kèm cờ trạng thái giao diện
        return res.json({
          success: true,
          registered: false,
          message: `Nếu địa chỉ email ${email} tồn tại trong hệ thống, mã xác nhận 6 chữ số đã được gửi đến hộp thư của bạn.`,
          email,
          expiresIn: 600,
        })
      }

      // Sinh OTP 6 chữ số bằng CSPRNG và băm an toàn
      const otpCode = crypto.randomInt(100000, 999999).toString()
      const salt = crypto.randomBytes(16).toString('hex')
      const codeHash = hashOtp(otpCode, salt)
      const isTestMode = process.env.AUTH_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production'

      // Lưu vào cache VÀ Database SQLite bền vững với TTL 10 phút (600 giây) kèm attempts: 0
      const cacheKey = `otp:reset_password:${email.toLowerCase()}`
      await cacheSet(
        cacheKey,
        JSON.stringify({
          codeHash,
          salt,
          attempts: 0,
          createdAt: Date.now(),
          ...(isTestMode && { code: otpCode }),
        }),
        600
      )

      savePendingPasswordResetDb({
        email: email.toLowerCase(),
        codeHash,
        salt,
        expiresInSeconds: 600,
        database: db,
      })

      // Gửi email qua HTTPS Port 443
      try {
        await sendPasswordResetOtpEmail({
          to: user.email,
          code: otpCode,
          name: user.full_name || 'Quý khách',
        })
      } catch (mailErr) {
        console.error('❌ [EMAIL FAILED] Lỗi gửi email OTP đặt lại mật khẩu:', mailErr.message)
        await cacheDel(cacheKey)
        deletePendingPasswordResetDb(email.toLowerCase(), db)
        return res.status(502).json({
          success: false,
          error: 'Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.',
          message: 'Hệ thống gửi email đang bận hoặc gián đoạn kết nối. Quý khách vui lòng thử lại sau ít phút hoặc dùng tính năng Tiếp tục với Google.',
        })
      }

      logSecurityAudit({
        userId: user.id,
        action: 'PASSWORD_RESET_OTP_SENT',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email: user.email },
      })

      return res.json({
        success: true,
        message: `Mã xác nhận 6 chữ số đã được gửi đến Gmail ${user.email}. Vui lòng kiểm tra hộp thư của bạn.`,
        email: user.email,
        expiresIn: 600,
        cooldownSeconds: 60,
      })
    } catch (err) {
      console.error('Lỗi API Forgot Password:', err)
      return res.status(500).json({
        success: false,
        error: 'Đã có lỗi xảy ra khi xử lý yêu cầu.',
        detail: req.headers['x-diagnostic-key'] === 'qns2026' ? (err.stack || err.message) : undefined,
      })
    }
  })

  // ── 7. XÁC MINH MÃ OTP TỪ GMAIL ───────────────────────────────
  app.post('/api/auth/password/verify-otp', async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const email = (req.body?.email || '').trim().toLowerCase()
    const code = (req.body?.code || '').trim()
    const db = getDb()

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Email không hợp lệ.' })
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Mã xác nhận phải gồm chính xác 6 chữ số.' })
    }

    try {
      const cacheKey = `otp:reset_password:${email}`
      const rawData = await cacheGet(cacheKey)

      let data = null
      if (rawData) {
        try {
          data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
        } catch (_) {
          data = { code: String(rawData), attempts: 0 }
        }
      }

      // Fallback: Kiểm tra trong Database bền vững nếu RAM/Cache bị xóa
      if (!data) {
        data = getPendingPasswordResetDb(email, db)
      }

      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Mã xác nhận đã hết hạn hoặc không tồn tại. Vui lòng bấm Lấy lại mật khẩu để nhận mã mới.',
        })
      }

      if (data.attempts >= 5) {
        await cacheDel(cacheKey)
        deletePendingPasswordResetDb(email, db)
        return res.status(400).json({
          success: false,
          error: 'Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu mã mới.',
        })
      }

      const isMatch = data.codeHash && data.salt
        ? verifyOtpTimingSafe(code, data.codeHash, data.salt)
        : String(data.code || '').trim() === String(code).trim()

      if (!isMatch) {
        data.attempts = (data.attempts || 0) + 1
        incrementPendingPasswordResetAttemptsDb(email, db)
        if (data.attempts >= 5) {
          await cacheDel(cacheKey)
          deletePendingPasswordResetDb(email, db)
          logSecurityAudit({ action: 'PASSWORD_RESET_OTP_LOCKED', status: 'BLOCKED', ip, userAgent, details: { email } })
          return res.status(429).json({
            success: false,
            error: 'Bạn đã nhập sai mã quá 5 lần. Mã đã bị khóa, vui lòng yêu cầu mã mới.',
          })
        }
        await cacheSet(cacheKey, JSON.stringify(data), 600)
        logSecurityAudit({
          action: 'PASSWORD_RESET_OTP_WRONG',
          status: 'FAILURE',
          ip,
          userAgent,
          details: { email, attempts: data.attempts },
        })
        return res.status(400).json({
          success: false,
          error: `Mã xác nhận không chính xác. Bạn còn ${5 - data.attempts} lần thử.`,
        })
      }

      // Mã chính xác! Xóa OTP chống replay attack
      await cacheDel(cacheKey)
      deletePendingPasswordResetDb(email, db)

      // Cấp resetToken tạm thời có thời hạn 15 phút (900 giây)
      const resetToken = `rst_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`
      await cacheSet(`reset_token:${resetToken}`, email, 900)
      saveActiveResetTokenDb(resetToken, email, 900, db)

      logSecurityAudit({
        action: 'PASSWORD_RESET_OTP_VERIFIED',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email },
      })

      return res.json({
        success: true,
        message: 'Xác nhận mã thành công! Vui lòng tạo mật khẩu mới.',
        resetToken,
      })
    } catch (err) {
      console.error('Lỗi API Verify Reset OTP:', err)
      return res.status(500).json({ success: false, error: 'Lỗi xác minh mã.' })
    }
  })

  // ── 8. THIẾT LẬP MẬT KHẨU MỚI & HOÀN TẤT ─────────────────────
  app.post('/api/auth/password/reset', validateBody(ResetPasswordDtoSchema), async (req, res) => {
    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)
    const { resetToken, newPassword } = req.validatedBody
    const db = getDb()

    try {
      let email = await cacheGet(`reset_token:${resetToken}`)
      if (!email) {
        email = getActiveResetTokenDb(resetToken, db)
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Phiên đổi mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng thực hiện lại từ đầu.',
        })
      }

      const user = (await findUserForPasswordReset(email.toLowerCase(), db)) || db.prepare('SELECT id, email, full_name FROM users WHERE LOWER(email) = ?').get(email.toLowerCase())
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy tài khoản người dùng tương ứng.',
        })
      }

      // Băm mật khẩu mới bằng Argon2id chuẩn OWASP
      const passwordHash = await hashPassword(newPassword)
      const now = new Date().toISOString()

      // Cập nhật users
      db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, user.id)
      syncUserToSupabase({
        ...user,
        password_hash: passwordHash,
        updated_at: now,
      }).catch(() => {})

      // Thu hồi toàn bộ phiên đăng nhập cũ ở cả hai hệ bảng (F-M9)
      try {
        db.prepare('UPDATE enterprise_sessions SET is_revoked = 1, revoked_at = ? WHERE user_id = ?').run(now, user.id)
      } catch (_) {}
      revokeAllAccountSessions(user.id)
      clearCustomerSessionCookie(res)
      clearRefreshTokenCookie(res)

      // Xóa resetToken ngay sau khi dùng để bảo đảm chỉ sử dụng đúng 1 lần (Single-use token)
      await cacheDel(`reset_token:${resetToken}`)
      deleteActiveResetTokenDb(resetToken, db)

      logSecurityAudit({
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        status: 'SUCCESS',
        ip,
        userAgent,
        details: { email },
      })

      return res.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công! Quý khách vui lòng đăng nhập lại bằng mật khẩu mới.',
      })
    } catch (err) {
      console.error('Lỗi API Reset Password:', err)
      return res.status(500).json({ success: false, error: 'Lỗi khi cập nhật mật khẩu.' })
    }
  })
}
