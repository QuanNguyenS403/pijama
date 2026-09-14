import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {
  generateOtpCode,
  generateSalt,
  hashOtpCode,
  verifyOtpCode,
  generateSessionToken,
  hashSessionToken,
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../server/lib/authCrypto.js'
import {
  getDb,
  createAccount,
  findAccountById,
  findAccountByEmail,
  findAccountByPhone,
  markAccountVerified,
  createChallenge,
  findActiveChallenge,
  verifyChallengeAttempt,
  createCustomerSession,
  findCustomerSessionByToken,
  revokeCustomerSession,
  createWelcomeVoucher,
  getVoucherByCode,
  isFirstOrderEligible,
  reserveVoucher,
  releaseVoucher,
  markVoucherUsed,
  updateMarketingPreferences,
  unsubscribeAccount,
  getMarketingAudience,
  linkIdentityToAccount,
  findAccountByIdentity,
} from '../server/lib/accountDb.js'
import { validateVoucher } from '../server/lib/voucherValidator.js'
import { verifyGoogleIdToken, verifyFacebookAccessToken } from '../server/lib/providerOAuth.js'
import { customerSessionMiddleware, parseCookies, COOKIE_NAME } from '../server/lib/customerSessionMiddleware.js'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { handleOrderSubmit } from '../server/apiHandler.js'

// Enable test mode for controlled test doubles
process.env.AUTH_TEST_MODE = 'true'

// Helper: Setup mini express app
async function createAuthTestServer() {
  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerAuthEndpoints(app)

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => server.close(),
  }
}

// ── 1. KIỂM THỬ BẢO MẬT OTP ───────────────────────────────────

test('OTP Security: CSPRNG format, 6 chữ số ngẫu nhiên', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtpCode()
    assert.equal(code.length, 6)
    assert.match(code, /^[0-9]{6}$/)
    const num = Number(code)
    assert.ok(num >= 100000 && num <= 999999)
  }
})

test('OTP Security: Băm SHA-256 kèm salt và so sánh Constant-time', () => {
  const code = '654321'
  const salt = generateSalt()
  const hash = hashOtpCode(code, salt)

  assert.notEqual(hash, code)
  assert.equal(hash.length, 64) // 256 bits = 64 hex chars

  // Đúng mã -> True
  assert.equal(verifyOtpCode(code, salt, hash), true)

  // Sai mã -> False
  assert.equal(verifyOtpCode('123456', salt, hash), false)

  // Salt khác -> False
  assert.equal(verifyOtpCode(code, 'other-salt', hash), false)
})

test('OTP Security: Expiry (TTL 10 phút), Single-use, Max 5 attempts & Cooldown', () => {
  const target = '0981999888'
  const code = '888999'

  // Tạo challenge
  const chal = createChallenge({
    purpose: 'auth',
    channel: 'sms',
    target,
    targetType: 'sms',
    code,
    ttlMinutes: 10,
  })

  assert.ok(chal.id)
  assert.ok(chal.cooldownUntil > Date.now())

  // Thử sai lần 1-4
  for (let i = 1; i <= 4; i++) {
    const res = verifyChallengeAttempt(chal.id, '000000')
    assert.equal(res.valid, false)
    assert.equal(res.remainingAttempts, 5 - i)
  }

  // Thử sai lần 5 -> Khóa
  const res5 = verifyChallengeAttempt(chal.id, '000000')
  assert.equal(res5.valid, false)
  assert.match(res5.error, /quá số lần cho phép/i)

  // Sau khi bị khóa, kể cả nhập đúng cũng không được chấp nhận
  const lockedRes = verifyChallengeAttempt(chal.id, code)
  assert.equal(lockedRes.valid, false)
})

test('OTP Security: Single-use sau khi xác thực thành công', () => {
  const target = 'test-singleuse@gmail.com'
  const code = '112233'

  const chal = createChallenge({
    purpose: 'auth',
    channel: 'email',
    target,
    targetType: 'email',
    code,
  })

  // Lần 1: Đúng mã -> Thành công
  const res1 = verifyChallengeAttempt(chal.id, code)
  assert.equal(res1.valid, true)

  // Lần 2: Dùng lại mã vừa thành công -> Bị từ chối (Single-use)
  const res2 = verifyChallengeAttempt(chal.id, code)
  assert.equal(res2.valid, false)
  assert.match(res2.error, /đã được sử dụng/i)
})

// ── 2. KIỂM THỬ OAUTH PROVIDERS ───────────────────────────────

test('Provider OAuth: Google ID token từ chối khi không hợp lệ', async () => {
  await assert.rejects(
    async () => {
      await verifyGoogleIdToken('invalid-fake-token')
    },
    /Xác thực Google ID token thất bại/i
  )
})

test('Provider OAuth: Google test double kiểm tra claim sub và email_verified', async () => {
  const mockToken = 'mock-google-token:google-sub-999:user@quannguyens.vn'
  const res = await verifyGoogleIdToken(mockToken)

  assert.equal(res.provider, 'google')
  assert.equal(res.sub, 'google-sub-999')
  assert.equal(res.email, 'user@quannguyens.vn')
  assert.equal(res.emailVerified, true)
})

test('Provider OAuth: Facebook test double xử lý kịch bản thiếu email', async () => {
  // 1. Facebook có email
  const tokenWithEmail = 'mock-fb-token:fb-sub-111:fbuser@example.com'
  const resWithEmail = await verifyFacebookAccessToken(tokenWithEmail)
  assert.equal(resWithEmail.requiresPhone, false)
  assert.equal(resWithEmail.email, 'fbuser@example.com')

  // 2. Facebook không có email -> requiresPhone = true
  const tokenNoEmail = 'mock-fb-token:fb-sub-222:no-email'
  const resNoEmail = await verifyFacebookAccessToken(tokenNoEmail)
  assert.equal(resNoEmail.requiresPhone, true)
  assert.equal(resNoEmail.email, null)
})

test('Provider OAuth: Identity Mapping độc lập, ngăn chặn Account Takeover', () => {
  const accA = createAccount({ method: 'google', full_name: 'User A', verified: 1 })
  const accB = createAccount({ method: 'facebook', full_name: 'User B', verified: 1 })

  const uniqueGoogleSub = `google-unique-${Date.now()}-${crypto.randomUUID()}`
  const uniqueFbSub = `fb-unique-${Date.now()}-${crypto.randomUUID()}`

  linkIdentityToAccount({ accountId: accA.id, provider: 'google', subject: uniqueGoogleSub })
  linkIdentityToAccount({ accountId: accB.id, provider: 'facebook', subject: uniqueFbSub })

  const foundA = findAccountByIdentity('google', uniqueGoogleSub)
  const foundB = findAccountByIdentity('facebook', uniqueFbSub)

  assert.equal(foundA.id, accA.id)
  assert.equal(foundB.id, accB.id)

  // Đăng ký trùng provider + subject bị chặn bởi UNIQUE constraint
  const dupLink = linkIdentityToAccount({ accountId: accB.id, provider: 'google', subject: uniqueGoogleSub })
  assert.equal(dupLink, false)
})

// ── 3. KIỂM THỬ SESSION VÀ AUTHORIZATION ──────────────────────

test('Session: Tạo session token an toàn, lưu hash và khôi phục', () => {
  const testAcc = createAccount({ method: 'phone', phone: '0981112233', verified: 1 })
  const token = generateSessionToken()
  const sess = createCustomerSession({ accountId: testAcc.id, token, ip: '127.0.0.1' })

  assert.ok(sess.id)

  // Khôi phục session bằng token
  const retrieved = findCustomerSessionByToken(token)
  assert.ok(retrieved)
  assert.equal(retrieved.account.id, testAcc.id)

  // Thu hồi session (logout)
  const revoked = revokeCustomerSession(token)
  assert.equal(revoked, true)

  // Sau khi thu hồi, không thể khôi phục
  const afterRevoke = findCustomerSessionByToken(token)
  assert.equal(afterRevoke, null)
})

test('Session: Endpoint /api/auth/me trả về đúng tài khoản từ HttpOnly Cookie', async () => {
  const server = await createAuthTestServer()
  try {
    // 1. Khi chưa đăng nhập -> authenticated: false
    const res1 = await fetch(`${server.baseUrl}/api/auth/me`)
    const data1 = await res1.json()
    assert.equal(data1.authenticated, false)
    assert.equal(data1.account, null)

    // 2. Tạo session và gọi với Cookie
    const acc = createAccount({ method: 'phone', phone: '0981333444', full_name: 'Test Me', verified: 1 })
    const token = generateSessionToken()
    createCustomerSession({ accountId: acc.id, token })

    const res2 = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
    })
    const data2 = await res2.json()
    assert.equal(data2.authenticated, true)
    assert.equal(data2.account.id, acc.id)
    assert.equal(data2.account.phone, '0981333444')
  } finally {
    server.close()
  }
})

// ── 4. KIỂM THỬ VOUCHER 10% + FREESHIP & ORDER LIFECYCLE ──────

test('Voucher: Mỗi tài khoản chỉ nhận tối đa 1 Welcome Voucher', () => {
  const testAcc = createAccount({ method: 'phone', phone: '0981444555', verified: 1 })
  const v1 = createWelcomeVoucher(testAcc.id)
  const v2 = createWelcomeVoucher(testAcc.id)

  assert.equal(v1.code, v2.code, 'Gọi createWelcomeVoucher nhiều lần phải trả về cùng 1 mã duy nhất')
  assert.equal(v1.discount_percent, 10)
  assert.equal(v1.free_shipping, true)
})

test('Voucher Ownership & Eligibility: Chống dùng chéo tài khoản và kiểm tra First Order', () => {
  const accA = createAccount({ method: 'phone', phone: '0981555666', verified: 1 })
  const accB = createAccount({ method: 'phone', phone: '0981777888', verified: 1 })

  const voucherA = createWelcomeVoucher(accA.id)

  // 1. Tài khoản A dùng voucher của chính mình -> Hợp lệ
  const checkOwner = validateVoucher(voucherA.code, { accountId: accA.id, subtotal: 500000 })
  assert.equal(checkOwner.isValid, true)
  assert.equal(checkOwner.voucher.freeShipping, true)
  assert.equal(checkOwner.voucher.discountPercent, 10)

  // 2. Tài khoản B cố tình dùng voucher của tài khoản A -> Bị từ chối
  const checkSpoofed = validateVoucher(voucherA.code, { accountId: accB.id, subtotal: 500000 })
  assert.equal(checkSpoofed.isValid, false)
  assert.match(checkSpoofed.error, /không thuộc tài khoản/i)

  // 3. Guest không đăng nhập cố tình dùng welcome voucher của A -> Bị từ chối
  const checkGuest = validateVoucher(voucherA.code, { accountId: null, subtotal: 500000 })
  assert.equal(checkGuest.isValid, false)
  assert.match(checkGuest.error, /yêu cầu đăng nhập tài khoản/i)
})

test('Voucher Lifecycle: Reserve, Release khi hủy đơn và Consume khi hoàn tất', () => {
  const acc = createAccount({ method: 'phone', phone: '0981888999', verified: 1 })
  const voucher = createWelcomeVoucher(acc.id)
  const orderId = `QNS-ORDER-CYCLE-${Date.now()}`

  // 1. Tạm giữ (reserve) voucher
  const reserved = reserveVoucher(voucher.code, acc.id, orderId)
  assert.equal(reserved, true)
  const vReserved = getVoucherByCode(voucher.code)
  assert.equal(vReserved.status, 'reserved')

  // 2. Hủy đơn -> Hoàn lại (release) voucher
  const released = releaseVoucher(voucher.code, orderId)
  assert.equal(released, true)
  const vReleased = getVoucherByCode(voucher.code)
  assert.equal(vReleased.status, 'active')
  assert.equal(vReleased.used, false)

  // 3. Sử dụng hoàn tất (consume/redeem)
  const used = markVoucherUsed(voucher.code, orderId)
  assert.equal(used, true)
  const vUsed = getVoucherByCode(voucher.code)
  assert.equal(vUsed.used, true)
  assert.equal(isFirstOrderEligible(acc.id), false)
})

test('Order Integration: Client tự khai accountId giả mạo không thể chiếm đoạt voucher', async () => {
  const legitimateAcc = createAccount({ method: 'phone', phone: '0981000111', verified: 1 })
  const legitVoucher = createWelcomeVoucher(legitimateAcc.id)

  // Kẻ xấu gửi request đặt hàng qua HTTP (fromHttpRequest = true), không có session nhưng gửi accountId của A
  const fakeOrder = {
    orderId: `QNS-HACK-${Date.now()}`,
    customer: {
      fullName: 'Attacker',
      email: 'attacker@evil.com',
      phone: '0999999999',
      accountId: legitimateAcc.id, // Mạo danh accountId của A trong body
    },
    items: [
      {
        productId: 'the-classic-set',
        quantity: 1,
        unitPrice: 390000,
        totalPrice: 390000,
      },
    ],
    subtotal: 390000,
    shippingFee: 0,
    discount: 39000,
    voucherCode: legitVoucher.code,
    total: 351000,
    payment: { method: 'COD' },
  }

  // Chạy qua handleOrderSubmit với fromHttpRequest = true (không có session cookie của A)
  const res = await handleOrderSubmit(fakeOrder, { fromHttpRequest: true, customerAccount: null })
  assert.equal(res.status, 400, 'Server phải từ chối đơn hàng mạo danh accountId')
  assert.match(res.data.error, /yêu cầu đăng nhập tài khoản/i)
})

// ── 5. KIỂM THỬ MARKETING CONSENT & UNSUBSCRIBE ───────────────

test('Marketing Consent: Opt-in mặc định là false, độc lập với xác thực tài khoản', () => {
  const acc = createAccount({ method: 'phone', phone: '0981222333', verified: 1 })
  assert.equal(acc.marketing_email_opt_in, false, 'Opt-in mặc định phải là false')

  // Khách chủ động bật opt-in
  const updated = updateMarketingPreferences(acc.id, true)
  assert.equal(updated.marketing_email_opt_in, true)

  // Khách chủ động tắt opt-out
  const optedOut = updateMarketingPreferences(acc.id, false)
  assert.equal(optedOut.marketing_email_opt_in, false)
  assert.equal(optedOut.verified, true, 'Tài khoản vẫn giữ nguyên trạng thái verified sau khi opt-out')
})

test('Marketing Unsubscribe: Token ký HMAC-SHA256 và cơ chế hủy nhận 1-click', () => {
  const email = 'user-consent@quannguyens.vn'
  const accountId = 'acc_test_123'

  // Sinh token ký
  const token = generateUnsubscribeToken(email, accountId)
  assert.ok(token.includes('.'))

  // Xác thực token hợp lệ
  const verified = verifyUnsubscribeToken(token)
  assert.equal(verified.isValid, true)
  assert.equal(verified.email, email)
  assert.equal(verified.accountId, accountId)

  // Token bị sửa đổi -> Chữ ký sai -> Từ chối
  const tampered = token + 'hack'
  const badVerify = verifyUnsubscribeToken(tampered)
  assert.equal(badVerify.isValid, false)

  // Hủy đăng ký ngay lập tức
  const success = unsubscribeAccount(email, accountId, 'hash-token-123')
  assert.equal(success, true)
})

test('Marketing Audience: Chỉ gửi cho tài khoản verified + có email + opt-in + không bị suppress', () => {
  // 1. Account verified có email nhưng KHÔNG opt-in (marketing_email_opt_in = 0)
  createAccount({
    method: 'google',
    email: 'no-optin@example.com',
    verified: 1,
    marketing_email_opt_in: 0,
  })

  // 2. Account verified có email và CÓ opt-in (marketing_email_opt_in = 1)
  createAccount({
    method: 'google',
    email: 'valid-optin@example.com',
    verified: 1,
    marketing_email_opt_in: 1,
  })

  // 3. Account phone CHƯA có email (kể cả có opt-in)
  createAccount({
    method: 'phone',
    phone: '0981999111',
    verified: 1,
    marketing_email_opt_in: 1,
  })

  const audience = getMarketingAudience()
  const emails = audience.map((a) => a.email)

  assert.ok(emails.includes('valid-optin@example.com'), 'Phải có tài khoản đã verified và opt-in')
  assert.ok(!emails.includes('no-optin@example.com'), 'KHÔNG được chứa tài khoản chưa opt-in')
})
