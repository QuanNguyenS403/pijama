process.env.NO_AUTO_LISTEN = 'true'

import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { products } from '../src/data/products.js'
import { calculateOrderTotals } from '../src/lib/pricingCalculator.js'
import { evaluateCodEligibility } from '../src/lib/distanceUtils.js'
import { calculateShippingDistanceAI } from '../server/lib/aiGeoDistanceService.js'
import { validateOrderPricing } from '../server/lib/pricingValidator.js'
import { validateOrderStock } from '../server/lib/stockValidator.js'
import { processTier0Intent } from '../server/lib/chat/intents.js'
import { generateLocalAdvisorResponse } from '../server/lib/chat/localAdvisor.js'
import { RegisterDtoSchema } from '../server/lib/authDto.js'
import { getDb, saveCustomerCart, getCustomerCart, clearCustomerCart } from '../server/lib/accountDb.js'
import { syncOrderToSupabase } from '../server/lib/orderPersistence.js'
import { previewCheckoutBenefits, getMemberBenefitsOverview } from '../server/lib/loyalty/benefits.js'
import { createMember, getMemberByPhone, updateMember, createLoyaltySession } from '../server/lib/loyalty/loyaltyDb.js'

function startServer(expressApp) {
  return new Promise((resolve) => {
    const server = http.createServer(expressApp)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` })
    })
  })
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
}

const cleanupEmails = []
const cleanupMemberPhones = []
const cleanupAccountIds = []
const cleanupVoucherCodes = []
const cleanupOrderIds = []

after(() => {
  try {
    const db = getDb()
    for (const em of cleanupEmails) {
      db.prepare('DELETE FROM users WHERE LOWER(email) = ?').run(em.toLowerCase())
      db.prepare('DELETE FROM accounts WHERE LOWER(email) = ?').run(em.toLowerCase())
      db.prepare('DELETE FROM pending_registrations WHERE LOWER(email) = ?').run(em.toLowerCase())
    }
    for (const accId of cleanupAccountIds) {
      db.prepare('DELETE FROM customer_carts WHERE account_id = ?').run(accId)
    }
    for (const vc of cleanupVoucherCodes) {
      db.prepare('DELETE FROM vouchers WHERE code = ?').run(vc)
    }
    for (const oid of cleanupOrderIds) {
      db.prepare('DELETE FROM orders WHERE order_id = ?').run(oid)
    }
    for (const ph of cleanupMemberPhones) {
      const m = db.prepare('SELECT id FROM loyalty_members WHERE phone = ?').get(ph)
      if (m) {
        db.prepare('DELETE FROM loyalty_sessions WHERE member_id = ?').run(m.id)
      }
      db.prepare('DELETE FROM loyalty_members WHERE phone = ?').run(ph)
    }
  } catch (_) {}
})

describe('Gói 1: Canonical Slugs, 301 Redirect & Color Normalization', () => {
  it('Catalog keeps existing sizes unchanged while normalizing slugs and Daybreak color "Đỏ"', () => {
    const daybreak = products.find((p) => p.id === 'the-classic-set')
    const stillwater = products.find((p) => p.id === 'the-cafe-look')
    const hearth = products.find((p) => p.id === 'the-evening-edit')

    assert.equal(daybreak.slug, 'the-daybreak-set')
    assert.equal(stillwater.slug, 'the-stillwater-set')
    assert.equal(hearth.slug, 'the-hearth-set')
    assert.equal(daybreak.colors[0].name, 'Đỏ')
    assert.ok(daybreak.colors[0].aliases.includes('Classic Red'))

    // Gói 2 exclusion guard: sizes & sizeGuide on products.js untouched
    assert.deepEqual(daybreak.sizes, ['S', 'L'])
    assert.equal(daybreak.sizeGuide.S.maxWaist, '103,7 cm')
    assert.deepEqual(stillwater.sizes, ['S', 'L'])
    assert.deepEqual(hearth.sizes, ['S', 'M'])
  })

  it('StockValidator accepts both canonical "Đỏ" and legacy "Classic Red" alias', () => {
    const resNew = validateOrderStock({
      items: [{ productId: 'the-daybreak-set', color: 'Đỏ', size: 'S', quantity: 1 }],
    })
    assert.equal(resNew.isValid, true)

    const resLegacy = validateOrderStock({
      items: [{ productId: 'the-classic-set', color: 'Classic Red', size: 'S', quantity: 1 }],
    })
    assert.equal(resLegacy.isValid, true)
  })

  it('HTTP 301 Permanent Redirect from legacy product slugs to canonical slugs', async () => {
    const { app } = await import('../server/index.js')
    const { server, baseUrl } = await startServer(app)
    try {
      const pairs = [
        ['/san-pham/the-classic-set', '/san-pham/the-daybreak-set'],
        ['/san-pham/the-cafe-look', '/san-pham/the-stillwater-set'],
        ['/san-pham/the-evening-edit', '/san-pham/the-hearth-set'],
      ]
      for (const [legacyPath, expectedLocation] of pairs) {
        const res = await fetch(`${baseUrl}${legacyPath}`, { redirect: 'manual' })
        assert.equal(res.status, 301, `${legacyPath} should return 301`)
        assert.equal(res.headers.get('location'), expectedLocation)
      }
    } finally {
      await stopServer(server)
    }
  })
})

describe('Gói 2: QNS Chat Syncs Strictly with Website Sizes', () => {
  it('SIZE_GUIDE intent outputs exact website sizes & measurements without fabricated Size M on Daybreak/Stillwater', () => {
    const res = processTier0Intent('bảng size')
    assert.equal(res.handled, true)
    assert.match(res.reply, /THE DAYBREAK SET.*Size S, L/i)
    assert.match(res.reply, /103,7 cm/)
    assert.match(res.reply, /THE STILLWATER SET.*Size S, L/i)
    assert.match(res.reply, /127,0 cm/)
    assert.match(res.reply, /THE HEARTH SET.*Size S, M/i)
    assert.match(res.reply, /42–50 kg/)
    assert.match(res.reply, /51–58 kg/)
  })

  it('localAdvisor differentiates Daybreak/Stillwater (S, L) from Hearth (S, M) accurately', () => {
    const adv54 = generateLocalAdvisorResponse('tư vấn size cho người 54kg cao 1m62')
    assert.match(adv54.reply, /THE HEARTH SET.*Size M/is)
    assert.match(adv54.reply, /không có Size M/i)

    const adv63 = generateLocalAdvisorResponse('nặng 63kg cao 1m68 mặc vừa mẫu nào')
    assert.match(adv63.reply, /THE DAYBREAK SET/)
    assert.match(adv63.reply, /THE STILLWATER SET/)
    assert.match(adv63.reply, /118,0 cm/)
    assert.match(adv63.reply, /135,0 cm/)
  })
})

describe('Gói 3: Compounding Pricing, 30km COD, Mixed Pre-Order & Cart Sync', () => {
  it('calculateOrderTotals compounds Tier -> Voucher -> VietQR 10% and calculates 19% for QNS10 + VietQR', () => {
    // 490k Daybreak + QNS10 (10%, no freeship) + VietQR 10%
    const t1 = calculateOrderTotals({
      subtotal: 490000,
      tierDiscountPercent: 0,
      voucher: { kind: 'percent', discountPercent: 10, freeShipping: false },
      paymentMethod: 'BANK_TRANSFER',
    })
    assert.equal(t1.voucherDiscount, 49000)
    assert.equal(t1.bankTransferDiscount, 44100) // 10% of 441.000
    assert.equal(t1.totalDiscount, 93100) // 19% compounding!
    assert.equal(t1.shippingFee, 30000) // <500k and QNS10 free_shipping=0
    assert.equal(t1.total, 426900)

    // 750k Hearth + Gold Tier (10%) + Points Amount Voucher (50k) + VietQR 10%
    const t2 = calculateOrderTotals({
      subtotal: 750000,
      tierDiscountPercent: 10,
      voucher: { kind: 'amount', discountAmount: 50000, freeShipping: false },
      paymentMethod: 'BANK_TRANSFER',
      isMixedPreOrder: true,
      deliveryOption: 'SPLIT_SHIPPING',
    })
    assert.equal(t2.tierDiscountAmount, 75000) // afterTier = 675,000
    assert.equal(t2.voucherDiscount, 50000) // afterVoucher = 625,000
    assert.equal(t2.bankTransferDiscount, 62500) // afterBankTransfer = 562,500
    assert.equal(t2.totalDiscount, 187500)
    assert.equal(t2.baseShippingFee, 0)
    assert.equal(t2.splitShippingFee, 30000)
    assert.equal(t2.total, 592500)
  })

  it('validateOrderPricing rejects multiple vouchers and enforces server compounding + mixed split shipping', () => {
    const multiVoucher = validateOrderPricing({
      items: [{ productId: 'the-daybreak-set', quantity: 1, unitPrice: 490000 }],
      payment: { method: 'BANK_TRANSFER' },
      voucherCode: 'QNS10, WELCOME10',
      subtotal: 490000,
      total: 400000,
    })
    assert.equal(multiVoucher.isValid, false)
    assert.match(multiVoucher.error, /tối đa 01 mã giảm giá/i)

    const validMixedSplit = validateOrderPricing(
      {
        items: [
          { productId: 'the-daybreak-set', quantity: 1, unitPrice: 490000 },
          { productId: 'the-hearth-set', quantity: 1, unitPrice: 750000 },
        ],
        payment: { method: 'BANK_TRANSFER' },
        deliveryOption: 'SPLIT_SHIPPING',
        voucherCode: 'QNS10',
        // subtotal = 1,240,000; Gold tier 10% (-124,000 -> 1,116,000); QNS10 10% (-111,600 -> 1,004,400);
        // VietQR 10% (-100,440 -> 903,960) + splitShipping 30,000 = 933,960
        subtotal: 1240000,
        total: 933960,
      },
      { loyaltyMember: { id: 'mem_test_gold', tier: 'GOLD', status: 'active' } }
    )
    assert.equal(validMixedSplit.isValid, true)
    assert.equal(validMixedSplit.summary.deliveryOption, 'SPLIT_SHIPPING')
    assert.equal(validMixedSplit.summary.splitShippingFee, 30000)
    assert.equal(validMixedSplit.summary.tierDiscountAmount, 124000)
    assert.equal(validMixedSplit.summary.voucherDiscount, 111600)
    assert.equal(validMixedSplit.summary.bankTransferDiscount, 100440)
    assert.equal(validMixedSplit.summary.total, 933960)
  })

  it('30km COD distance logic handles Văn Giang, Từ Sơn, Thuận Thành, Phố Huế HN, and >30km districts cleanly', async () => {
    const cases = [
      [{ address: 'Khu đô thị Ecopark', district: 'Văn Giang', city: 'Hưng Yên' }, true],
      [{ address: 'Xã Cửu Cao', district: 'Huyện Văn Giang', city: 'Hưng Yên' }, true],
      [{ address: 'Thị trấn Như Quỳnh', district: '', city: 'Hưng Yên' }, true],
      [{ address: 'Phường Đông Ngàn', district: 'Từ Sơn', city: 'Bắc Ninh' }, true],
      [{ address: 'Phường Hồ', district: 'Thuận Thành', city: 'Bắc Ninh' }, true],
      [{ address: '123 Phố Huế', district: 'Hai Bà Trưng', city: 'Hà Nội' }, true],
      [{ address: '12 Ngõ Thái Bình', district: 'Hai Bà Trưng', city: 'Hà Nội' }, true],
      [{ address: 'Thị trấn Quốc Oai', district: 'Quốc Oai', city: 'Hà Nội' }, false],
      [{ address: 'Chúc Sơn', district: 'Chương Mỹ', city: 'Hà Nội' }, false],
      [{ address: 'Tây Đằng', district: 'Ba Vì', city: 'Hà Nội' }, false],
      [{ address: '10 Lê Lợi', district: 'TP Huế', city: 'Thừa Thiên Huế' }, false],
    ]

    for (const [addr, expectedCod] of cases) {
      const fe = evaluateCodEligibility(addr)
      const be = await calculateShippingDistanceAI(addr)
      assert.equal(fe.isCodAllowed, expectedCod, `FE mismatch for ${addr.address}, ${addr.district}, ${addr.city}`)
      assert.equal(be.isCodAllowed, expectedCod, `BE mismatch for ${addr.address}, ${addr.district}, ${addr.city}`)
    }
  })

  it('customer_carts DB persists items, appliedVoucher and deliveryOption', () => {
    const testAccId = `acc_cart_test_${Date.now()}`
    cleanupAccountIds.push(testAccId)

    saveCustomerCart(testAccId, {
      items: [{ productId: 'the-daybreak-set', color: 'Đỏ', size: 'S', quantity: 1, price: 490000 }],
      appliedVoucher: { code: 'QNS10', discountPercent: 10, freeShipping: false },
      deliveryOption: 'SPLIT_SHIPPING',
    })

    const loaded = getCustomerCart(testAccId)
    assert.equal(loaded.items.length, 1)
    assert.equal(loaded.appliedVoucher.code, 'QNS10')
    assert.equal(loaded.deliveryOption, 'SPLIT_SHIPPING')

    clearCustomerCart(testAccId)
    const cleared = getCustomerCart(testAccId)
    assert.equal(cleared.items.length, 0)
    assert.equal(cleared.appliedVoucher, null)
    assert.equal(cleared.deliveryOption, 'COMBINED')
  })
})

describe('Gói 4: Registration BirthDate/Phone/ConfirmPassword & Loyalty Sync', () => {
  it('RegisterDtoSchema accepts optional phone + birthDate + confirmPassword while rejecting bad formats', () => {
    const validFull = RegisterDtoSchema.safeParse({
      email: 'guest@example.com',
      password: 'QnsSecurePassword2026',
      confirmPassword: 'QnsSecurePassword2026',
      fullName: 'Nguyễn Thị Hoa',
      phone: '0912345678',
      birthDate: '1997-08-20',
      birthDay: null,
      birthMonth: null,
      birthYear: null,
    })
    assert.equal(validFull.success, true)

    const validMinimal = RegisterDtoSchema.safeParse({
      email: 'legacy_min@example.com',
      password: 'QnsSecurePassword2026',
      fullName: 'Legacy User',
    })
    assert.equal(validMinimal.success, true)

    const badConfirm = RegisterDtoSchema.safeParse({
      email: 'badconfirm@example.com',
      password: 'QnsSecurePassword2026',
      confirmPassword: 'DifferentPassword2026',
      fullName: 'Bad Confirm',
    })
    assert.equal(badConfirm.success, false)

    const badPhone = RegisterDtoSchema.safeParse({
      email: 'badphone@example.com',
      password: 'QnsSecurePassword2026',
      fullName: 'Bad Phone',
      phone: '12345',
    })
    assert.equal(badPhone.success, false)
  })

  it('Register endpoint stores phone & birth fields, links loyalty member by phone, and hydrates /api/auth/me', async () => {
    const prevMode = process.env.AUTH_TEST_MODE
    process.env.AUTH_TEST_MODE = 'true'
    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 100)}`
    const testPhone = `098${uniqueSuffix.slice(-7)}`
    const testEmail = `remediation_g4_${uniqueSuffix}@example.com`
    cleanupEmails.push(testEmail)
    cleanupMemberPhones.push(testPhone)

    const existingMember = createMember({
      fullName: 'Chị Mai Hội Viên',
      phone: testPhone,
      birthDay: 14,
      birthMonth: 5,
    })

    const { app } = await import('../server/index.js')
    const { server, baseUrl } = await startServer(app)
    try {
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'StrongPassword99',
          confirmPassword: 'StrongPassword99',
          fullName: 'Chị Mai Hội Viên',
          phone: testPhone,
          birthDate: '1995-05-14',
        }),
      })
      assert.equal(regRes.status, 201)
      const regData = await regRes.json()
      assert.equal(regData.success, true)
      assert.equal(regData.user.phone, testPhone)
      assert.equal(regData.user.birthDay, 14)
      assert.equal(regData.user.birthMonth, 5)
      assert.equal(regData.user.birthYear, 1995)

      const linkedMember = getMemberByPhone(testPhone)
      assert.equal(linkedMember.account_id, regData.user.id)

      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${regData.accessToken}` },
      })
      assert.equal(meRes.status, 200)
      const meData = await meRes.json()
      assert.equal(meData.authenticated, true)
      assert.equal(meData.user.phone, testPhone)
      assert.equal(meData.user.birthDate, '1995-05-14')

      // Check Loyalty overview + checkout preview shapes match UI expectations
      const overview = getMemberBenefitsOverview(existingMember.id)
      assert.ok(Array.isArray(overview.recentLedger))
      assert.ok(overview.points && typeof overview.points.balance === 'number')
      assert.ok(overview.points && typeof overview.points.rollingSpend365d === 'number')
      assert.ok(overview.tierProgress && typeof overview.tierProgress.spendNeeded === 'number')

      const preview = previewCheckoutBenefits({
        memberId: existingMember.id,
        subtotal: 490000,
        paymentMethod: 'BANK_TRANSFER',
        voucherCode: 'QNS10',
      })
      assert.equal(preview.pricingPreview.totalDiscount, 93100)
      assert.ok(preview.benefitsList.some((b) => typeof b.amount === 'number' && typeof b.discountAmount === 'number'))

      // Verify HTTP /api/cart PUT -> GET -> DELETE with Bearer accessToken
      cleanupAccountIds.push(regData.user.id)
      const putCartRes = await fetch(`${baseUrl}/api/cart`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${regData.accessToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: 'the-daybreak-set', color: 'Đỏ', size: 'S', quantity: 1, price: 490000 }],
          appliedVoucher: { code: 'QNS10', discountPercent: 10, freeShipping: false },
          deliveryOption: 'COMBINED',
        }),
      })
      assert.equal(putCartRes.status, 200)
      const getCartRes = await fetch(`${baseUrl}/api/cart`, {
        headers: { Authorization: `Bearer ${regData.accessToken}` },
      })
      const getCartData = await getCartRes.json()
      assert.equal(getCartData.items.length, 1)
      assert.equal(getCartData.appliedVoucher.code, 'QNS10')

      await fetch(`${baseUrl}/api/cart`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${regData.accessToken}` },
      })
    } finally {
      await stopServer(server)
      if (prevMode === undefined) delete process.env.AUTH_TEST_MODE
      else process.env.AUTH_TEST_MODE = prevMode
    }
  })

  it('HTTP checkout-preview refuses unauthenticated phone probe & Loyalty OTP session applies Gold tier + 50k voucher on order submit', async () => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 100)}`
    const goldPhone = `097${suffix.slice(-7)}`
    cleanupMemberPhones.push(goldPhone)

    const goldMember = createMember({
      fullName: 'Khách Vàng Loyalty',
      phone: goldPhone,
      birthDay: 20,
      birthMonth: 10,
    })
    updateMember(goldMember.id, { tier: 'GOLD' })

    const loyaltyToken = `loy_tok_${suffix}`
    createLoyaltySession({ memberId: goldMember.id, token: loyaltyToken })

    const db = getDb()
    const voucherCode = `PTS-AUDIT-${suffix.slice(-6)}`
    cleanupVoucherCodes.push(voucherCode)
    db.prepare(`
      INSERT INTO vouchers (id, account_id, member_id, code, kind, discount_amount, discount_percent, free_shipping, min_subtotal, source, status, used, expires_at, created_at)
      VALUES (?, 'system', ?, ?, 'amount', 50000, 0, 0, 0, 'points', 'active', 0, ?, ?)
    `).run(`vouch_${suffix}`, goldMember.id, voucherCode, new Date(Date.now() + 86400000).toISOString(), new Date().toISOString())

    const { app } = await import('../server/index.js')
    const { server, baseUrl } = await startServer(app)
    try {
      // 1. Unauthenticated guest passing Gold member phone in checkout-preview MUST NOT unlock Gold discount
      const guestPreviewRes = await fetch(`${baseUrl}/api/loyalty/checkout-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal: 750000,
          paymentMethod: 'COD',
          phone: goldPhone,
        }),
      })
      assert.equal(guestPreviewRes.status, 200)
      const guestPreview = await guestPreviewRes.json()
      assert.equal(guestPreview.isMember, false)
      assert.equal(guestPreview.tierDiscountPercent, 0)

      // 2. Authenticated Loyalty OTP session (qns_session cookie) unlocks Gold 10% + personal 50k voucher + VietQR 10% + SPLIT_SHIPPING
      const sessionPreviewRes = await fetch(`${baseUrl}/api/loyalty/checkout-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `qns_session=${encodeURIComponent(loyaltyToken)}`,
        },
        body: JSON.stringify({
          subtotal: 1240000,
          paymentMethod: 'BANK_TRANSFER',
          voucherCode,
          isMixedPreOrder: true,
          deliveryOption: 'SPLIT_SHIPPING',
        }),
      })
      assert.equal(sessionPreviewRes.status, 200)
      const sessionPreview = await sessionPreviewRes.json()
      assert.equal(sessionPreview.isMember, true)
      assert.equal(sessionPreview.tierDiscountPercent, 10)
      // 1,240,000 - 124,000 (Gold 10%) = 1,116,000 - 50,000 (voucher) = 1,066,000 - 106,600 (VietQR 10%) = 959,400 + 30,000 split = 989,400
      assert.equal(sessionPreview.pricingPreview.expectedTotal, 989400)

      // 3. Submit real order using Loyalty OTP qns_session cookie
      const orderId = `QNS-AUDIT-${suffix.slice(-6)}`
      cleanupOrderIds.push(orderId)
      const submitRes = await fetch(`${baseUrl}/api/orders/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `qns_session=${encodeURIComponent(loyaltyToken)}`,
        },
        body: JSON.stringify({
          orderId,
          customer: {
            fullName: 'Khách Vàng Loyalty',
            phone: goldPhone,
            email: `audit_gold_${suffix}@example.com`,
          },
          shipping: {
            address: '10 Phố Huế',
            ward: 'Phường Phố Huế',
            district: 'Hai Bà Trưng',
            city: 'Hà Nội',
          },
          items: [
            { productId: 'the-daybreak-set', color: 'Đỏ', size: 'S', quantity: 1, unitPrice: 490000 },
            { productId: 'the-hearth-set', color: 'Sọc Nâu', size: 'S', quantity: 1, unitPrice: 750000 },
          ],
          payment: { method: 'BANK_TRANSFER', methodLabel: 'Chuyển khoản VietQR' },
          deliveryOption: 'SPLIT_SHIPPING',
          voucherCode,
          subtotal: 1240000,
          shippingFee: 30000,
          discount: 280600,
          total: 989400,
        }),
      })
      const submitData = await submitRes.json()
      assert.equal(submitRes.status, 200, JSON.stringify(submitData))
      assert.equal(submitData.success, true)
    } finally {
      await stopServer(server)
    }
  })

  it('syncOrderToSupabase awaits Postgrest-style thenables without .catch() and maps canonical order fields', async () => {
    let capturedPayload = null
    let capturedOptions = null

    // Giả lập PostgrestFilterBuilder chuẩn của @supabase/supabase-js (chỉ có .then, không có .catch)
    const fakeSupabase = {
      from: (table) => ({
        upsert: (payload, opts) => ({
          then(onFulfilled) {
            capturedPayload = { table, payload }
            capturedOptions = opts
            return Promise.resolve({ data: null, error: null }).then(onFulfilled)
          },
        }),
      }),
    }

    const ok = await syncOrderToSupabase(
      {
        orderId: 'QNS-SUPA-TEST-1',
        status: 'AWAITING_PAYMENT',
        customer: { fullName: 'Nguyễn Minh', phone: '0912345678', email: 'minh@example.com' },
        shipping: { fullAddress: '622 Minh Khai, Hai Bà Trưng, Hà Nội' },
        items: [{ productId: 'the-daybreak-set', quantity: 1, unitPrice: 490000 }],
        subtotal: 490000,
        discount: 93100,
        shippingFee: 30000,
        total: 426900,
        payment: { method: 'BANK_TRANSFER', status: 'AWAITING_PAYMENT' },
        note: 'Giao giờ hành chính',
        deliveryOption: 'SPLIT_SHIPPING',
        voucherCode: 'QNS10',
        voucherDiscount: 49000,
        bankTransferDiscount: 44100,
      },
      { clientOverride: fakeSupabase }
    )

    assert.equal(ok, true)
    assert.equal(capturedPayload.table, 'orders')
    assert.equal(capturedOptions.onConflict, 'id')
    assert.equal(capturedPayload.payload.id, 'QNS-SUPA-TEST-1')
    assert.equal(capturedPayload.payload.shipping_address, '622 Minh Khai, Hai Bà Trưng, Hà Nội')
    assert.equal(capturedPayload.payload.discount_amount, 93100)
    assert.equal(capturedPayload.payload.payment_method, 'BANK_TRANSFER')
    assert.equal(capturedPayload.payload.payment_status, 'AWAITING_PAYMENT')
    assert.equal(capturedPayload.payload.notes, 'Giao giờ hành chính')
    assert.equal(capturedPayload.payload.metadata.deliveryOption, 'SPLIT_SHIPPING')
    assert.equal(capturedPayload.payload.metadata.voucherCode, 'QNS10')

    // Kiểm tra nhánh error của Supabase trả { error } không làm crash
    const errorSupabase = {
      from: () => ({
        upsert: () => ({
          then(onFulfilled) {
            return Promise.resolve({ data: null, error: { message: 'Mock PostgREST error' } }).then(onFulfilled)
          },
        }),
      }),
    }
    const errRes = await syncOrderToSupabase(
      { orderId: 'QNS-SUPA-ERR-1', customer: { fullName: 'A', phone: '0900000000' } },
      { clientOverride: errorSupabase }
    )
    assert.equal(errRes, false)
  })
})
