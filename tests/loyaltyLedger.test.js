// tests/loyaltyLedger.test.js
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import {
  initLoyaltySchema,
  createMember,
  getMemberById,
  getMemberByPhone,
  maskPhone,
  getLoyaltyDb,
} from '../server/lib/loyalty/loyaltyDb.js'
import {
  recordLedgerEntry,
  getMemberPointsBalance,
  getMemberRollingSpend,
  getMemberLedgerHistory,
  recordAdminPointsAdjustment,
} from '../server/lib/loyalty/ledger.js'
import { normalizeVietnamesePhone, isValidVietnamesePhone } from '../server/lib/smsService.js'

describe('Loyalty Ledger & Database Operations', () => {
  let testMember = null
  const testRunSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`

  before(() => {
    initLoyaltySchema()
    const uniquePhone = '098' + Math.floor(1000000 + Math.random() * 9000000)
    testMember = createMember({
      phone: uniquePhone,
      fullName: 'Nguyễn Văn Test',
      email: `test.loyalty_${testRunSuffix}@example.com`,
      birthDay: 15,
      birthMonth: 8,
      consentVersion: '1.0.0',
    })
  })

  it('Tạo hội viên thành công và chuẩn hóa số điện thoại', () => {
    assert.ok(testMember.id)
    assert.equal(testMember.tier, 'MEMBER')
    assert.equal(testMember.full_name, 'Nguyễn Văn Test')
    assert.equal(testMember.birth_day, 15)
    assert.equal(testMember.birth_month, 8)

    const fetched = getMemberById(testMember.id)
    assert.equal(fetched.phone, testMember.phone)

    const byPhone = getMemberByPhone(testMember.phone)
    assert.equal(byPhone.id, testMember.id)
  })

  it('Ràng buộc SĐT: +84, 84, có khoảng trắng đều ra cùng một hội viên; SĐT trùng không thể tạo 2 hội viên', () => {
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000).toString()
    const raw1 = `+84 90${randomDigits.slice(0, 1)} ${randomDigits.slice(1, 4)} ${randomDigits.slice(4)}`
    const raw2 = `8490${randomDigits}`
    const raw3 = `090${randomDigits.slice(0, 1)} ${randomDigits.slice(1)}`

    const norm1 = normalizeVietnamesePhone(raw1)
    const norm2 = normalizeVietnamesePhone(raw2)
    const norm3 = normalizeVietnamesePhone(raw3)

    assert.equal(norm1, `090${randomDigits}`)
    assert.equal(norm2, `090${randomDigits}`)
    assert.equal(norm3, `090${randomDigits}`)
    assert.equal(isValidVietnamesePhone(`090${randomDigits}`), true)
    assert.equal(isValidVietnamesePhone('0123456789'), false) // Đầu số không hợp lệ

    // Tạo hội viên với norm1
    const mem1 = createMember({
      phone: norm1,
      fullName: 'Khách Hàng Trùng',
    })
    assert.ok(mem1.id)

    // Thử tạo lần 2 với số tương đương phải bị chặn bởi UNIQUE constraint
    assert.throws(() => {
      createMember({
        phone: raw2,
        fullName: 'Khách Hàng Trùng Lần 2',
      })
    })
  })

  it('Sổ cái: Ghi EARN, tính đúng số dư điểm và chi tiêu tích lũy', () => {
    const initialBal = getMemberPointsBalance(testMember.id)
    const orderKey = `ORDER_EARN_${testRunSuffix}`
    const res = recordLedgerEntry({
      memberId: testMember.id,
      type: 'EARN',
      pointsDelta: 10,
      spendDelta: 1000000,
      orderId: orderKey,
      idempotencyKey: `earn:${orderKey}`,
      reason: `Tích điểm đơn hàng ${orderKey}`,
      actor: 'system',
    })

    assert.equal(res.success, true)
    assert.equal(res.duplicated, false)

    const balance = getMemberPointsBalance(testMember.id)
    assert.equal(balance, initialBal + 10)

    const rollingSpend = getMemberRollingSpend(testMember.id)
    assert.ok(rollingSpend >= 1000000)
  })

  it('Idempotency: Gọi lặp cùng idempotency_key không cộng thêm điểm', () => {
    const orderKey = `ORDER_IDEMP_${testRunSuffix}`
    // First call
    recordLedgerEntry({
      memberId: testMember.id,
      type: 'EARN',
      pointsDelta: 10,
      spendDelta: 1000000,
      orderId: orderKey,
      idempotencyKey: `earn:${orderKey}`,
      reason: `Tích điểm đơn ${orderKey}`,
      actor: 'system',
    })

    const balanceBefore = getMemberPointsBalance(testMember.id)

    // Duplicate call
    const resDuplicate = recordLedgerEntry({
      memberId: testMember.id,
      type: 'EARN',
      pointsDelta: 10,
      spendDelta: 1000000,
      orderId: orderKey,
      idempotencyKey: `earn:${orderKey}`,
      reason: `Tích điểm đơn ${orderKey} (gọi lặp)`,
      actor: 'system',
    })

    assert.equal(resDuplicate.success, true)
    assert.equal(resDuplicate.duplicated, true)

    // Số dư không bị cộng thêm lần 2
    const balanceAfter = getMemberPointsBalance(testMember.id)
    assert.equal(balanceAfter, balanceBefore)
  })

  it('Sổ cái: REDEEM và REVERSAL hoạt động chính xác theo số dư', () => {
    const orderKey = `ORDER_REDEEM_${testRunSuffix}`
    const balanceStart = getMemberPointsBalance(testMember.id)

    // 1. Đổi 10 điểm
    const redeemRes = recordLedgerEntry({
      memberId: testMember.id,
      type: 'REDEEM',
      pointsDelta: -10,
      spendDelta: 0,
      orderId: orderKey,
      idempotencyKey: `redeem:${orderKey}`,
      reason: 'Đổi 10 điểm lấy voucher 50.000đ',
      actor: 'member',
    })
    assert.equal(redeemRes.success, true)
    assert.equal(getMemberPointsBalance(testMember.id), balanceStart - 10)

    // 2. Đơn hủy -> REVERSAL hoàn lại 10 điểm
    const reversalRes = recordLedgerEntry({
      memberId: testMember.id,
      type: 'REVERSAL',
      pointsDelta: 10,
      spendDelta: 0,
      orderId: orderKey,
      idempotencyKey: `reversal:${orderKey}`,
      reason: `Hoàn 10 điểm do đơn hàng ${orderKey} bị hủy`,
      actor: 'system',
    })
    assert.equal(reversalRes.success, true)
    assert.equal(getMemberPointsBalance(testMember.id), balanceStart)
  })

  it('Admin điều chỉnh điểm: Tuân thủ trần 20 điểm/lần (Q8) và ghi nhật ký', () => {
    const balanceStart = getMemberPointsBalance(testMember.id)
    // 1. Điều chỉnh hợp lệ trong mức 20 điểm
    const adj = recordAdminPointsAdjustment({
      memberId: testMember.id,
      pointsDelta: 5,
      reason: 'Tặng điểm bù sự cố phát hàng chậm',
      adminId: 'admin_test_1',
    })
    assert.equal(adj.success, true)
    assert.equal(getMemberPointsBalance(testMember.id), balanceStart + 5)

    // 2. Vượt quá trần 20 điểm mà không có elevated override -> Bị từ chối
    assert.throws(() => {
      recordAdminPointsAdjustment({
        memberId: testMember.id,
        pointsDelta: 25,
        reason: 'Thưởng lớn vượt quyền',
        adminId: 'admin_test_1',
      })
    }, /tối đa ±20 điểm/)

    // 3. Thiếu lý do -> Bị từ chối
    assert.throws(() => {
      recordAdminPointsAdjustment({
        memberId: testMember.id,
        pointsDelta: 2,
        reason: '',
        adminId: 'admin_test_1',
      })
    }, /lý do/i)
  })

  it('Bảo mật: Che số điện thoại đúng chuẩn (0901 *** 567)', () => {
    assert.equal(maskPhone('0901234567'), '0901 *** 567')
    assert.equal(maskPhone('0981753082'), '0981 *** 082')
    assert.equal(maskPhone(''), '')
  })

  it('Sổ cái chỉ-ghi-thêm: Truy vấn lịch sử đầy đủ theo thứ tự thời gian', () => {
    const history = getMemberLedgerHistory(testMember.id)
    assert.ok(Array.isArray(history))
    assert.ok(history.length >= 3)
    // Các bản ghi mới nhất xếp trước
    assert.ok(new Date(history[0].created_at) >= new Date(history[history.length - 1].created_at))
  })
})
