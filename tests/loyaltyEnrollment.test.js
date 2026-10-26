// tests/loyaltyEnrollment.test.js
import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  initLoyaltySchema,
  getMemberByPhone,
} from '../server/lib/loyalty/loyaltyDb.js'
import {
  sendLoyaltyOtp,
  verifyLoyaltyOtp,
  __getTestOtpForPhone,
  __clearTestOtpStore,
} from '../server/lib/loyalty/phoneVerifier.js'
import {
  validateEnrollmentInput,
  enrollLoyaltyMember,
  authenticateMemberByOtp,
} from '../server/lib/loyalty/enrollment.js'

describe('Loyalty PhoneVerifier & Enrollment', () => {
  before(() => {
    initLoyaltySchema()
  })

  beforeEach(() => {
    __clearTestOtpStore()
  })

  it('Form Validation: Từ chối nếu thiếu đồng ý điều khoản hoặc tuổi', () => {
    // 1. Thiếu consentToTerms
    const resNoConsent = validateEnrollmentInput({
      fullName: 'Quan Nguyen',
      phone: '0981753082',
      consentToTerms: false,
      ageConsent: true,
    })
    assert.equal(resNoConsent.isValid, false)
    assert.match(resNoConsent.errors[0], /Điều khoản/)

    // 2. Thiếu ageConsent
    const resNoAge = validateEnrollmentInput({
      fullName: 'Quan Nguyen',
      phone: '0981753082',
      consentToTerms: true,
      ageConsent: false,
    })
    assert.equal(resNoAge.isValid, false)
    assert.match(resNoAge.errors[0], /16 tuổi/)

    // 3. Số điện thoại sai định dạng
    const resBadPhone = validateEnrollmentInput({
      fullName: 'Quan Nguyen',
      phone: '0123456789',
      consentToTerms: true,
      ageConsent: true,
    })
    assert.equal(resBadPhone.isValid, false)
    assert.match(resBadPhone.errors[0], /Số điện thoại không hợp lệ/)

    // 4. Hợp lệ hoàn toàn
    const resValid = validateEnrollmentInput({
      fullName: 'Quan Nguyen',
      phone: '+84 981 753 082',
      birthDay: 16,
      birthMonth: 10,
      consentToTerms: true,
      ageConsent: true,
    })
    assert.equal(resValid.isValid, true)
    assert.equal(resValid.cleanPhone, '0981753082')
  })

  it('PhoneVerifier: Gửi OTP, không trả mã trong response, xác thực thành công', async () => {
    const testPhone = '097' + Math.floor(1000000 + Math.random() * 9000000)
    const sendRes = await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
      providerOverride: 'test',
    })

    assert.equal(sendRes.success, true)
    // TUYỆT ĐỐI KHÔNG TRẢ MÃ OTP TRONG RESPONSE
    assert.equal(sendRes.code, undefined)
    assert.equal(sendRes.otp, undefined)

    // Lấy mã từ test store
    const code = __getTestOtpForPhone(testPhone)
    assert.ok(code)
    assert.equal(code.length, 6)

    // Xác thực thành công
    const verifyRes = verifyLoyaltyOtp({
      phone: testPhone,
      code,
      purpose: 'enrollment',
    })
    assert.equal(verifyRes.success, true)
    assert.equal(verifyRes.phone, testPhone)
  })

  it('PhoneVerifier: Nhập sai mã OTP -> Giảm số lần thử; quá 5 lần -> Khóa mã', async () => {
    const testPhone = '096' + Math.floor(1000000 + Math.random() * 9000000)
    await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
      providerOverride: 'test',
    })

    // Lần 1: Nhập sai
    const try1 = verifyLoyaltyOtp({ phone: testPhone, code: '000000', purpose: 'enrollment' })
    assert.equal(try1.success, false)
    assert.equal(try1.remainingAttempts, 4)

    // Lần 2, 3, 4: Nhập sai tiếp
    verifyLoyaltyOtp({ phone: testPhone, code: '000000', purpose: 'enrollment' })
    verifyLoyaltyOtp({ phone: testPhone, code: '000000', purpose: 'enrollment' })
    verifyLoyaltyOtp({ phone: testPhone, code: '000000', purpose: 'enrollment' })

    // Lần 5: Khóa
    const try5 = verifyLoyaltyOtp({ phone: testPhone, code: '000000', purpose: 'enrollment' })
    assert.equal(try5.success, false)
    assert.equal(try5.remainingAttempts, 0)
    assert.match(try5.error, /quá số lần cho phép/)
  })

  it('PhoneVerifier: Chặn Cooldown 60s giữa 2 lần yêu cầu gửi mã liên tiếp', async () => {
    const testPhone = '093' + Math.floor(1000000 + Math.random() * 9000000)
    const send1 = await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
      providerOverride: 'test',
    })
    assert.equal(send1.success, true)

    // Gửi ngay lập tức lần 2 -> Bị từ chối do cooldown
    const send2 = await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
      providerOverride: 'test',
    })
    assert.equal(send2.success, false)
    assert.match(send2.error, /Vui lòng chờ/)
  })

  it('PhoneVerifier: Chặn Mock/Test Provider nếu chạy trong môi trường production', async () => {
    const originalEnv = process.env.NODE_ENV
    try {
      process.env.NODE_ENV = 'production'
      const res = await sendLoyaltyOtp({
        phone: '0901234567',
        purpose: 'enrollment',
        providerOverride: 'test',
      })
      assert.equal(res.success, false)
      assert.match(res.error, /chưa sẵn sàng/)
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('Enrollment: Đăng ký hội viên thành công và ngăn chặn đăng ký trùng lặp', async () => {
    const testPhone = '091' + Math.floor(1000000 + Math.random() * 9000000)
    await sendLoyaltyOtp({
      phone: testPhone,
      purpose: 'enrollment',
      providerOverride: 'test',
    })
    const otp = __getTestOtpForPhone(testPhone)

    // 1. Đăng ký thành công
    const enrollRes = await enrollLoyaltyMember({
      fullName: 'Quan Nguyễn',
      phone: testPhone,
      otpCode: otp,
      email: 'quan.test@gmail.com',
      birthDay: 16,
      birthMonth: 10,
      consentToTerms: true,
      ageConsent: true,
      marketingOptIn: true,
    })

    assert.equal(enrollRes.success, true)
    assert.ok(enrollRes.sessionToken)
    assert.equal(enrollRes.member.phone, testPhone)
    assert.equal(enrollRes.member.tier, 'MEMBER')

    // 2. Thử đăng ký lần 2 với cùng số điện thoại -> Báo đã là hội viên an toàn
    const duplicateRes = await enrollLoyaltyMember({
      fullName: 'Quan Nguyễn Giả Mạo',
      phone: testPhone,
      otpCode: '123456', // Dù mã gì cũng phải bị chặn vì số đã tồn tại
      consentToTerms: true,
      ageConsent: true,
    })

    assert.equal(duplicateRes.success, false)
  })
})
