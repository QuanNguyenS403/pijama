// tests/loyaltyPure.test.js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculatePointsFromSpend,
  calculateTierFromRollingSpend,
  getNextTierInfo,
  evaluateMemberTierState,
} from '../server/lib/loyalty/tierEngine.js'
import { LOYALTY_TIERS, LOYALTY_RULES } from '../server/lib/loyalty/loyaltyConfig.js'

describe('Loyalty TierEngine Pure Calculations', () => {
  it('calculatePointsFromSpend: Làm tròn floor đúng quanh 99.999 / 100.000 / 100.001', () => {
    assert.equal(calculatePointsFromSpend(0), 0)
    assert.equal(calculatePointsFromSpend(50000), 0)
    assert.equal(calculatePointsFromSpend(99999), 0)
    assert.equal(calculatePointsFromSpend(100000), 1)
    assert.equal(calculatePointsFromSpend(100001), 1)
    assert.equal(calculatePointsFromSpend(199999), 1)
    assert.equal(calculatePointsFromSpend(200000), 2)
    assert.equal(calculatePointsFromSpend(750000), 7)
    assert.equal(calculatePointsFromSpend(-50000), 0)
  })

  it('calculateTierFromRollingSpend: Ngưỡng hạng 4.999.999 / 5.000.000, 9.999.999 / 10.000.000, 24.999.999 / 25.000.000', () => {
    assert.equal(calculateTierFromRollingSpend(0), 'MEMBER')
    assert.equal(calculateTierFromRollingSpend(4999999), 'MEMBER')
    assert.equal(calculateTierFromRollingSpend(5000000), 'SILVER')
    assert.equal(calculateTierFromRollingSpend(5000001), 'SILVER')
    assert.equal(calculateTierFromRollingSpend(9999999), 'SILVER')
    assert.equal(calculateTierFromRollingSpend(10000000), 'GOLD')
    assert.equal(calculateTierFromRollingSpend(10000001), 'GOLD')
    assert.equal(calculateTierFromRollingSpend(24999999), 'GOLD')
    assert.equal(calculateTierFromRollingSpend(25000000), 'DIAMOND')
    assert.equal(calculateTierFromRollingSpend(50000000), 'DIAMOND')
  })

  it('getNextTierInfo: Tính đúng khoảng cách chi tiêu và thanh tiến độ', () => {
    const memberProgress = getNextTierInfo('MEMBER', 2000000)
    assert.equal(memberProgress.hasNextTier, true)
    assert.equal(memberProgress.nextTier, 'SILVER')
    assert.equal(memberProgress.spendNeeded, 3000000)
    assert.equal(memberProgress.pointsNeeded, 30)
    assert.equal(memberProgress.progressPercent, 40) // 2M / 5M = 40%

    const silverProgress = getNextTierInfo('SILVER', 7500000)
    assert.equal(silverProgress.hasNextTier, true)
    assert.equal(silverProgress.nextTier, 'GOLD')
    assert.equal(silverProgress.spendNeeded, 2500000)
    assert.equal(silverProgress.progressPercent, 50) // (7.5M - 5M) / (10M - 5M) = 50%

    const diamondProgress = getNextTierInfo('DIAMOND', 30000000)
    assert.equal(diamondProgress.hasNextTier, false)
    assert.equal(diamondProgress.progressPercent, 100)
  })

  it('evaluateMemberTierState: Cửa sổ 365 ngày với đồng hồ tiêm (Day 364 vs Day 365 vs Day 366)', () => {
    const baseDate = new Date('2026-01-01T00:00:00.000Z')
    const member = {
      id: 'mem_test_1',
      tier: 'SILVER',
      created_at: baseDate.toISOString(),
      tier_changed_at: baseDate.toISOString(),
    }

    const earnEntries = [
      {
        type: 'EARN',
        spend_delta: 5000000,
        created_at: baseDate.toISOString(),
      },
    ]

    // 1. Ngày thứ 364: Vẫn duy trì hạng, chưa hết hạn điểm
    const day364 = new Date(baseDate.getTime() + 364 * 24 * 60 * 60 * 1000)
    const state364 = evaluateMemberTierState(member, earnEntries, day364)
    assert.equal(state364.action, 'MAINTAIN')
    assert.equal(state364.targetTier, 'SILVER')
    assert.equal(state364.shouldExpirePoints, false)
    assert.equal(state364.daysUntilExpiry, 1)

    // 2. Ngày thứ 365: Tròn 365 ngày không có đơn mới -> Hạ 1 hạng xuống MEMBER và xóa điểm
    const day365 = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    const state365 = evaluateMemberTierState(member, earnEntries, day365)
    assert.equal(state365.action, 'DOWNGRADE')
    assert.equal(state365.targetTier, 'MEMBER')
    assert.equal(state365.shouldExpirePoints, true)

    // 3. Ngày thứ 366: Quá hạn -> Hạ hạng và xóa điểm
    const day366 = new Date(baseDate.getTime() + 366 * 24 * 60 * 60 * 1000)
    const state366 = evaluateMemberTierState(member, earnEntries, day366)
    assert.equal(state366.action, 'DOWNGRADE')
    assert.equal(state366.targetTier, 'MEMBER')
    assert.equal(state366.shouldExpirePoints, true)
  })

  it('evaluateMemberTierState: Thăng hạng ngay khi đạt đủ chi tiêu trong cửa sổ 365 ngày', () => {
    const now = new Date('2026-06-01T00:00:00.000Z')
    const member = {
      id: 'mem_test_2',
      tier: 'MEMBER',
      created_at: '2026-01-01T00:00:00.000Z',
      tier_changed_at: '2026-01-01T00:00:00.000Z',
    }

    const earnEntries = [
      {
        type: 'EARN',
        spend_delta: 6000000,
        created_at: '2026-05-15T00:00:00.000Z',
      },
    ]

    const state = evaluateMemberTierState(member, earnEntries, now)
    assert.equal(state.action, 'UPGRADE')
    assert.equal(state.targetTier, 'SILVER')
    assert.equal(state.rollingSpend, 6000000)
    assert.equal(state.shouldExpirePoints, false)
  })
})
