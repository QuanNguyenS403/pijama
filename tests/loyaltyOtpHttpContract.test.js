// tests/loyaltyOtpHttpContract.test.js
import test, { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerLoyaltyEndpoints } from '../server/lib/loyaltyEndpoints.js'
import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'
import { initLoyaltySchema, getLoyaltyDb, createMember } from '../server/lib/loyalty/loyaltyDb.js'
import { __getTestOtpForPhone, __clearTestOtpStore } from '../server/lib/loyalty/phoneVerifier.js'

let server
let baseUrl
let ipCounter = 300

function getNextIp() {
  ipCounter++
  return `10.0.2.${ipCounter}`
}

function getRandomPhone() {
  const digits = Math.floor(1000000 + Math.random() * 9000000)
  return `098${digits}`
}

before(async () => {
  initLoyaltySchema()

  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerLoyaltyEndpoints(app)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
})

beforeEach(() => {
  __clearTestOtpStore()
})

describe('Loyalty OTP HTTP Contract & Security Adversarial Suite', () => {
  it('R5 & S5: Payload aliases (otp vs otpCode, consentTerms vs consentToTerms) are supported seamlessly', async () => {
    const phone = getRandomPhone()
    const ip = getNextIp()
    const sendRes = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'enroll' }),
    })
    assert.equal(sendRes.status, 200)

    const testCode = __getTestOtpForPhone(phone)
    assert.ok(testCode)

    // Send payload using older/flexible field names
    const enrollRes = await fetch(`${baseUrl}/api/loyalty/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone,
        fullName: 'Nguyễn Đức Quân',
        otp: testCode,
        consentTerms: true,
        consentAge: true,
      }),
    })
    assert.equal(enrollRes.status, 201, 'Server should support alias field names and return 201')
    const enrollData = await enrollRes.json()
    assert.equal(enrollData.success, true)
    assert.ok(enrollData.sessionToken)
    assert.equal(enrollData.member.phone, phone)
  })

  it('R6: Unknown or arbitrary purpose must be rejected with 400 Bad Request', async () => {
    const ip = getNextIp()
    const res = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone: getRandomPhone(),
        purpose: 'arbitrary_hack_purpose_injection',
      }),
    })
    assert.equal(res.status, 400, 'Server must reject non-whitelisted purpose with 400')
    const data = await res.json()
    assert.equal(data.success, false)
    assert.match(data.error, /mục đích/i)
  })

  it('S1: Rapid send-otp requests from same IP must be rate limited (429)', async () => {
    const results = []
    const floodIp = '198.51.100.99'
    for (let i = 0; i < 15; i++) {
      const phone = getRandomPhone()
      const res = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': floodIp },
        body: JSON.stringify({ phone, purpose: 'enrollment' }),
      })
      results.push(res.status)
    }
    const rateLimitedCount = results.filter((s) => s === 429).length
    assert.ok(rateLimitedCount > 0, `Expected at least some requests to be rate limited (429), got: ${results.join(',')}`)
  })

  it('S2: Immediate resend to same phone must be rejected with cooldown error', async () => {
    const phone = getRandomPhone()
    const ip = getNextIp()
    const firstRes = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'enrollment' }),
    })
    assert.equal(firstRes.status, 200)

    // Immediate second request to same phone must be rejected due to 60s cooldown
    const secondRes = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': getNextIp() },
      body: JSON.stringify({ phone, purpose: 'enrollment' }),
    })
    assert.equal(secondRes.status, 400)
    const secondData = await secondRes.json()
    assert.equal(secondData.errorCode, 'COOLDOWN_ACTIVE')
    assert.match(secondData.error, /chờ/i)
  })

  it('S3: Login OTP request for non-member phone must return neutral response and NOT store OTP', async () => {
    const ip = getNextIp()
    const nonMemberPhone = '0989999999'
    const res = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone: nonMemberPhone, purpose: 'login' }),
    })
    assert.equal(res.status, 200, 'Response must be neutral 200 so as not to leak member existence')
    const data = await res.json()
    assert.equal(data.success, true)
    // Non-member should NOT generate OTP in store
    const storedCode = __getTestOtpForPhone(nonMemberPhone)
    assert.equal(storedCode, null, 'Non-member phone must NOT generate OTP')
  })

  it('S4: Single-use verification - OTP cannot be reused twice', async () => {
    const phone = getRandomPhone()
    const ip = getNextIp()
    await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'enrollment' }),
    })
    const code = __getTestOtpForPhone(phone)
    assert.ok(code)

    // First enroll succeeds
    const enroll1 = await fetch(`${baseUrl}/api/loyalty/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone,
        fullName: 'Test User 1',
        otpCode: code,
        consentToTerms: true,
        ageConsent: true,
      }),
    })
    assert.equal(enroll1.status, 201)

    // Second enroll with same OTP must fail
    const enroll2 = await fetch(`${baseUrl}/api/loyalty/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone,
        fullName: 'Test User 2',
        otpCode: code,
        consentToTerms: true,
        ageConsent: true,
      }),
    })
    assert.equal(enroll2.status, 400)
    const data2 = await enroll2.json()
    assert.equal(data2.success, false)
  })

  it('Adversarial: Wrong OTP exceeding 5 attempts invalidates the verification', async () => {
    const phone = getRandomPhone()
    const ip = getNextIp()
    await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'enrollment' }),
    })
    const realCode = __getTestOtpForPhone(phone)
    assert.ok(realCode)

    // Submit 5 wrong OTP attempts
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/loyalty/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({
          phone,
          fullName: 'Brute Force Attacker',
          otpCode: '000000',
          consentToTerms: true,
          ageConsent: true,
        }),
      })
      assert.equal(res.status, 400)
    }

    // Now submitting the real code must still fail because max attempts was exceeded
    const resAfterExceed = await fetch(`${baseUrl}/api/loyalty/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone,
        fullName: 'Brute Force Attacker',
        otpCode: realCode,
        consentToTerms: true,
        ageConsent: true,
      }),
    })
    assert.equal(resAfterExceed.status, 400)
    const data = await resAfterExceed.json()
    assert.match(data.error, /vô hiệu hóa|hết hạn|không tồn tại/i)
  })

  it('End-to-End: Active Member receives Login OTP and logs in successfully', async () => {
    const phone = getRandomPhone()
    const ip = getNextIp()

    // 1. Seed an active member directly into DB
    const member = createMember({
      phone,
      fullName: 'Võ Thị Mai Phương',
      tier: 'SILVER',
    })
    assert.ok(member?.id)

    // 2. Request Login OTP
    const loginOtpRes = await fetch(`${baseUrl}/api/loyalty/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({ phone, purpose: 'login' }),
    })
    assert.equal(loginOtpRes.status, 200)
    const loginOtp = __getTestOtpForPhone(phone)
    assert.ok(loginOtp, 'Active member must receive Login OTP')

    // 3. Complete Login
    const loginRes = await fetch(`${baseUrl}/api/loyalty/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify({
        phone,
        otpCode: loginOtp,
      }),
    })
    assert.equal(loginRes.status, 200)
    const loginData = await loginRes.json()
    assert.equal(loginData.success, true)
    assert.ok(loginData.sessionToken)
    assert.equal(loginData.member.phone, phone)
    assert.equal(loginData.member.fullName, 'Võ Thị Mai Phương')
    assert.equal(loginData.member.tier, 'SILVER')
  })
})
