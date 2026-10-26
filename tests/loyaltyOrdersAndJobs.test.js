// tests/loyaltyOrdersAndJobs.test.js
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  initLoyaltySchema,
  createMember,
  getMemberById,
  updateMember,
  getLoyaltyDb,
  listAlerts,
} from '../server/lib/loyalty/loyaltyDb.js'
import {
  handleOrderDeliveredHook,
  handleOrderCancelledHook,
  claimOrderPointsWithOtp,
} from '../server/lib/loyalty/orderHook.js'
import {
  processLoyaltyDowngradesAndExpirations,
  processBirthdayVouchers,
} from '../server/lib/loyalty/jobs.js'
import { getMemberPointsBalance, getMemberRollingSpend } from '../server/lib/loyalty/ledger.js'
import { sendLoyaltyOtp, __getTestOtpForPhone } from '../server/lib/loyalty/phoneVerifier.js'

describe('Loyalty Order Delivery Hooks & Scheduled Jobs', () => {
  before(() => {
    initLoyaltySchema()
    process.env.LOYALTY_ENABLED = 'true'
  })

  after(() => {
    delete process.env.LOYALTY_ENABLED
  })

  it('DELIVERED: Tích đúng điểm theo tiền hàng thực trả (A1, A2) và idempotent', async () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Tích Điểm', tier: 'MEMBER' })
    const orderId = 'ORD_DELIV_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    const mockOrder = {
      orderId,
      status: 'DELIVERED',
      subtotal: 750000,
      discount: 75000, // VietQR 10%
      shippingFee: 30000,
      total: 705000,
      loyalty: { memberId: member.id },
    }

    // Lần 1: Cộng điểm
    const res1 = await handleOrderDeliveredHook(mockOrder)
    assert.equal(res1.success, true)
    assert.equal(res1.duplicated, false)
    assert.equal(res1.pointsEarned, 6)
    assert.equal(res1.qualifyingSpend, 675000)

    assert.equal(getMemberPointsBalance(member.id), 6)
    assert.equal(getMemberRollingSpend(member.id), 675000)

    // Lần 2: Gọi lặp cùng orderId -> Bị chặn bởi Idempotency
    const res2 = await handleOrderDeliveredHook(mockOrder)
    assert.equal(res2.success, true)
    assert.equal(res2.duplicated, true)
    assert.equal(getMemberPointsBalance(member.id), 6)
  })

  it('Thăng hạng tự động & phát hành Voucher thăng hạng khi vượt ngưỡng', async () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Thăng Hạng Gold', tier: 'MEMBER' })
    const orderId = 'ORD_GOLD_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    const largeOrder = {
      orderId,
      status: 'DELIVERED',
      subtotal: 10000000,
      discount: 0,
      shippingFee: 0,
      total: 10000000,
      loyalty: { memberId: member.id },
    }

    const res = await handleOrderDeliveredHook(largeOrder)
    assert.equal(res.success, true)
    assert.equal(res.tierUpgraded, 'GOLD')

    const updatedMember = getMemberById(member.id)
    assert.equal(updatedMember.tier, 'GOLD')

    // Kiểm tra đã cấp voucher thăng hạng GOLD (300.000đ)
    const db = getLoyaltyDb()
    const voucher = db
      .prepare("SELECT * FROM vouchers WHERE member_id = ? AND source = 'upgrade'")
      .get(member.id)

    assert.ok(voucher)
    assert.equal(voucher.discount_amount, 300000)
    assert.equal(voucher.kind, 'amount')
    assert.equal(voucher.status, 'active')
  })

  it('Thăng hạng Kim Cương (Tier 4) tạo cảnh báo Admin chuẩn bị quà Private Party (A13)', async () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Kim Cương VIP', tier: 'MEMBER' })
    const orderId = 'ORD_DIAMOND_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    const diamondOrder = {
      orderId,
      status: 'DELIVERED',
      subtotal: 25000000,
      discount: 0,
      total: 25000000,
      loyalty: { memberId: member.id },
    }

    const res = await handleOrderDeliveredHook(diamondOrder)
    assert.equal(res.tierUpgraded, 'DIAMOND')

    const updated = getMemberById(member.id)
    assert.equal(updated.tier, 'DIAMOND')

    // Kiểm tra hàng đợi cảnh báo Admin
    const alerts = listAlerts({ status: 'open' })
    const tier4Alert = alerts.find((a) => a.type === 'TIER_4_GIFT' && a.member_id === member.id)
    assert.ok(tier4Alert)
    assert.match(tier4Alert.title, /Kim Cương/)
  })

  it('Đơn hàng không chứng minh sở hữu lúc đặt -> Chờ nhận qua OTP trong 7 ngày', async () => {
    const phone = '097' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Nhận Điểm Sau', tier: 'MEMBER' })
    const orderId = 'ORD_UNCLAIMED_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    const unclaimedOrder = {
      orderId,
      status: 'DELIVERED',
      subtotal: 1000000,
      discount: 0,
      customer: { phone },
      created_at: new Date().toISOString(),
    }

    // Hook nhận diện và không tự cộng
    const hookRes = await handleOrderDeliveredHook(unclaimedOrder)
    assert.equal(hookRes.pendingClaim, true)
    assert.equal(getMemberPointsBalance(member.id), 0)

    // Khách gửi OTP xác nhận nhận điểm
    await sendLoyaltyOtp({
      phone,
      purpose: 'claim_points',
      providerOverride: 'test',
    })
    const otp = __getTestOtpForPhone(phone)

    const claimRes = await claimOrderPointsWithOtp({
      order: unclaimedOrder,
      phone,
      otpCode: otp,
    })

    assert.equal(claimRes.success, true)
    assert.equal(claimRes.pointsEarned, 10)
    assert.equal(getMemberPointsBalance(member.id), 10)
  })

  it('Hủy đơn hàng (CANCELLED) hoàn trả điểm đã tiêu (REVERSAL)', async () => {
    const db = getLoyaltyDb()
    const phone = '096' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({ phone, fullName: 'Khách Hủy Đơn', tier: 'MEMBER' })
    const orderId = 'ORD_CANCEL_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

    // Giả lập giao dịch tiêu 10 điểm cho đơn này
    db.prepare(`
      INSERT INTO loyalty_ledger (
        id, member_id, type, points_delta, spend_delta, order_id,
        idempotency_key, reason, actor, created_at
      ) VALUES (?, ?, 'REDEEM', -10, 0, ?, ?, 'Dùng 10 điểm', 'member', ?)
    `).run(`led_${Date.now()}`, member.id, orderId, `redeem:${orderId}`, new Date().toISOString())

    // Đơn hàng bị CANCELLED -> gọi hook hoàn điểm
    const cancelRes = handleOrderCancelledHook({
      orderId,
      status: 'CANCELLED',
      voucherCode: 'VOUCH_MOCK_CANCEL',
    })

    assert.equal(cancelRes.success, true)

    // Kiểm tra có bản ghi REVERSAL và số dư được phục hồi
    const reversal = db
      .prepare("SELECT * FROM loyalty_ledger WHERE order_id = ? AND type = 'REVERSAL'")
      .get(orderId)

    assert.ok(reversal)
    assert.equal(reversal.points_delta, 10)
    assert.equal(getMemberPointsBalance(member.id), 0)
  })

  it('Jobs: processBirthdayVouchers cấp voucher sinh nhật đúng hạng và idempotent', () => {
    const phone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    const member = createMember({
      phone,
      fullName: 'Khách Sinh Nhật Kim Cương',
      birthDay: 16,
      birthMonth: 10, // Tháng 10
      tier: 'DIAMOND',
    })

    const octDate = new Date('2026-10-15T08:00:00.000Z')
    const summary1 = processBirthdayVouchers(octDate)
    assert.ok(summary1.vouchersIssued >= 1)

    // Kiểm tra voucher sinh nhật của member (Hạng Kim Cương -> 500.000đ)
    const db = getLoyaltyDb()
    const bdayVoucher = db
      .prepare("SELECT * FROM vouchers WHERE member_id = ? AND source = 'birthday'")
      .get(member.id)

    assert.ok(bdayVoucher)
    assert.equal(bdayVoucher.discount_amount, 500000)

    // Chạy lại lần 2 trong cùng tháng/năm -> Idempotent, không cấp đúp
    const summary2 = processBirthdayVouchers(octDate)
    assert.equal(summary2.vouchersIssued, 0)
    assert.ok(summary2.skippedAlreadyIssued >= 1)
  })
})
