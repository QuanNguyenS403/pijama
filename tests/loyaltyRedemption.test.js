// tests/loyaltyRedemption.test.js
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  initLoyaltySchema,
  createMember,
  getLoyaltyDb,
} from '../server/lib/loyalty/loyaltyDb.js'
import { recordLedgerEntry, getMemberPointsBalance } from '../server/lib/loyalty/ledger.js'
import { redeemPointsForVoucher } from '../server/lib/loyalty/redemption.js'
import { validateVoucher, calculateVoucherBenefits } from '../server/lib/voucherValidator.js'
import { sendLoyaltyOtp, __getTestOtpForPhone } from '../server/lib/loyalty/phoneVerifier.js'

describe('Loyalty Points Redemption & Extended Vouchers', () => {
  before(() => {
    initLoyaltySchema()
  })

  it('Đổi điểm: Từ chối nếu thiếu điểm thưởng (< 10 điểm)', () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Thiếu Điểm', tier: 'MEMBER' })

    const res = redeemPointsForVoucher({
      memberId: member.id,
      pointsToRedeem: 10,
      stepUpVerified: true,
    })

    assert.equal(res.success, false)
    assert.match(res.error, /không đủ/)
  })

  it('Đổi điểm: Đòi hỏi xác thực OTP bước nâng cao (Step-up OTP)', () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Chưa OTP', tier: 'MEMBER' })

    // Cộng 20 điểm
    recordLedgerEntry({
      memberId: member.id,
      type: 'EARN',
      pointsDelta: 20,
      spendDelta: 2000000,
      orderId: 'ORD_POINTS_TEST',
      idempotencyKey: 'earn:ORD_POINTS_TEST',
      reason: 'Tích điểm test',
      actor: 'system',
    })

    const res = redeemPointsForVoucher({
      memberId: member.id,
      pointsToRedeem: 10,
      stepUpVerified: false, // Chưa xác thực
    })

    assert.equal(res.success, false)
    assert.equal(res.requiresOtp, true)
    assert.match(res.error, /xác thực mã OTP/)
  })

  it('Đổi điểm thành công: Tạo voucher 50.000đ, trừ đúng 10 điểm, hạn 90 ngày', async () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Đổi Voucher', tier: 'MEMBER' })

    // Cộng 15 điểm
    recordLedgerEntry({
      memberId: member.id,
      type: 'EARN',
      pointsDelta: 15,
      spendDelta: 1500000,
      orderId: 'ORD_POINTS_01',
      idempotencyKey: `earn:ORD_POINTS_01_${member.id}`,
      reason: 'Tích 15 điểm',
      actor: 'system',
    })

    // Gửi OTP
    await sendLoyaltyOtp({
      phone,
      purpose: 'step_up_checkout',
      providerOverride: 'test',
    })
    const otp = __getTestOtpForPhone(phone)

    const redeemRes = redeemPointsForVoucher({
      memberId: member.id,
      pointsToRedeem: 10,
      phone,
      otpCode: otp,
      orderId: 'ORD_CART_RESERVE_01',
    })

    assert.equal(redeemRes.success, true)
    assert.ok(redeemRes.voucher.code.startsWith('PTS-'))
    assert.equal(redeemRes.voucher.discountAmount, 50000)
    assert.equal(redeemRes.voucher.kind, 'amount')
    assert.equal(redeemRes.remainingBalance, 5)

    // Kiểm tra số dư sổ cái thực tế
    assert.equal(getMemberPointsBalance(member.id), 5)

    // Xác thực voucher vừa tạo qua validateVoucher
    const valRes = validateVoucher(redeemRes.voucher.code, {
      memberId: member.id,
      subtotal: 390000,
    })
    assert.equal(valRes.isValid, true)
    assert.equal(valRes.voucher.discountAmount, 50000)
    assert.equal(valRes.voucher.kind, 'amount')

    // Thử áp dụng cho đơn khác chủ sở hữu -> Bị từ chối
    const valBadOwner = validateVoucher(redeemRes.voucher.code, {
      memberId: 'other_member_id',
      subtotal: 390000,
    })
    assert.equal(valBadOwner.isValid, false)
    assert.match(valBadOwner.error, /chỉ dành riêng cho hội viên sở hữu/)

    // Tính toán quyền lợi voucher: Trừ đúng 50.000đ, không làm âm tổng, không trừ ship
    const benefits = calculateVoucherBenefits(valRes.voucher, 390000, 30000)
    assert.equal(benefits.discountAmount, 50000)
    assert.equal(benefits.shippingFee, 30000)

    // Đơn nhỏ hơn 50.000đ (ví dụ 30.000đ): Chỉ trừ tối đa 30.000đ (không làm âm subtotal - A10)
    const smallOrderBenefits = calculateVoucherBenefits(valRes.voucher, 30000, 30000)
    assert.equal(smallOrderBenefits.discountAmount, 30000)
  })

  it('Chống Race Condition: Hai yêu cầu đổi điểm song song khi chỉ có 10 điểm -> Đúng 1 thành công', () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Đua Lệnh', tier: 'MEMBER' })

    // Chỉ có đúng 10 điểm
    recordLedgerEntry({
      memberId: member.id,
      type: 'EARN',
      pointsDelta: 10,
      spendDelta: 1000000,
      orderId: 'ORD_POINTS_RACE',
      idempotencyKey: `earn:ORD_POINTS_RACE_${member.id}`,
      reason: 'Có đúng 10 điểm',
      actor: 'system',
    })

    assert.equal(getMemberPointsBalance(member.id), 10)

    // Chạy song song 2 lượt redeem
    const res1 = redeemPointsForVoucher({
      memberId: member.id,
      pointsToRedeem: 10,
      stepUpVerified: true,
    })

    const res2 = redeemPointsForVoucher({
      memberId: member.id,
      pointsToRedeem: 10,
      stepUpVerified: true,
    })

    // Đúng một lượt thành công, một lượt thất bại
    const successCount = [res1, res2].filter((r) => r.success).length
    const failCount = [res1, res2].filter((r) => !r.success).length

    assert.equal(successCount, 1)
    assert.equal(failCount, 1)
    assert.equal(getMemberPointsBalance(member.id), 0)
  })
})
