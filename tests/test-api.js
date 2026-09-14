import express from 'express'
import { registerAuthEndpoints } from '../server/lib/authEndpoints.js'
import { getVoucherByCode } from '../server/lib/accountDb.js'
import { handleOrderSubmit } from '../server/apiHandler.js'

import { customerSessionMiddleware } from '../server/lib/customerSessionMiddleware.js'

async function runApiTests() {
  console.log('=== RUNNING API END-TO-END TESTS ===')
  const app = express()
  app.use(express.json())
  app.use(customerSessionMiddleware)
  registerAuthEndpoints(app)

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // 1. Test /api/auth/config
    console.log('\n1. Testing GET /api/auth/config...')
    const configRes = await fetch(`${baseUrl}/api/auth/config`)
    const configData = await configRes.json()
    console.log('Config response:', configData)
    if (!configData.success) throw new Error('Config API failed')

    // 2. Test Phone OTP is disabled (410)
    console.log('\n2. Testing POST /api/auth/phone/send-otp is discontinued (410)...')
    const phoneRes = await fetch(`${baseUrl}/api/auth/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0981753082' }),
    })
    console.log('Phone OTP status:', phoneRes.status)
    if (phoneRes.status !== 410) throw new Error('Phone OTP should be disabled with status 410')

    // 2b. Test Google Auth Mock
    process.env.AUTH_TEST_MODE = 'true'
    console.log('\n2b. Testing POST /api/auth/google...')
    const googleRes = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'mock-google-token:sub-test-1:test@example.com' }),
    })
    const googleData = await googleRes.json()
    console.log('Google Auth response:', googleData)
    if (!googleData.success) throw new Error('Google auth failed')

    const mockCode = googleData.mockCode || '123456'
    console.log(`Using verification code: ${mockCode}`)

    // 3. Test Verify OTP
    console.log('\n3. Testing POST /api/auth/verify...')
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: googleData.rawTarget,
        code: mockCode,
        provider: 'google',
        providerSub: googleData.providerSub,
        fullName: googleData.fullName,
      }),
    })
    const verifyData = await verifyRes.json()
    console.log('Verify response:', verifyData)
    if (!verifyData.success || !verifyData.voucher?.code) throw new Error('Verify code failed')

    const welcomeCode = verifyData.voucher.code
    console.log(`✅ Welcome Voucher Issued: ${welcomeCode}`)

    const cookie = verifyRes.headers.get('set-cookie')

    // 4. Test Voucher Validation API
    console.log(`\n4. Testing GET /api/vouchers/validate?code=${welcomeCode}...`)
    const valRes = await fetch(`${baseUrl}/api/vouchers/validate?code=${welcomeCode}&subtotal=750000`, {
      headers: cookie ? { Cookie: cookie.split(';')[0] } : {},
    })
    const valData = await valRes.json()
    console.log('Validate voucher response:', valData)
    if (!valData.isValid || valData.voucher?.freeShipping !== true) {
      throw new Error('Voucher validation failed')
    }

    // 5. Test Order Submit with Voucher (BANK_TRANSFER has 10% VietQR discount + 10% voucher discount = 20% discount, Freeship)
    console.log('\n5. Testing handleOrderSubmit with Welcome Voucher...')
    // THE DAYBREAK SET: unit price 390.000đ
    // Subtotal: 390.000đ. Shipping: 0đ (Freeship from voucher).
    // VietQR discount (10%): 39.000đ + Voucher (10%): 39.000đ = 78.000đ
    // Total: 390.000đ - 78.000đ = 312.000đ
    const testOrder = {
      orderId: `QNS-TEST-${Date.now()}`,
      customer: {
        fullName: 'Nguyễn Đức Quân',
        phone: '0981753082',
        email: 'ducquan16102006@gmail.com',
        accountId: verifyData.account.id,
      },
      shipping: {
        address: '622 Minh Khai',
        ward: 'Vĩnh Tuy',
        district: 'Hai Bà Trưng',
        city: 'Hà Nội',
        fullAddress: '622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
      },
      items: [
        {
          productId: 'the-classic-set',
          slug: 'the-classic-set',
          productName: 'THE DAYBREAK SET',
          quantity: 1,
          unitPrice: 390000,
          totalPrice: 390000,
          color: 'Sọc Hồng',
          size: 'M',
        },
      ],
      subtotal: 390000,
      shippingFee: 0,
      discount: 78000,
      voucherCode: welcomeCode,
      total: 312000,
      payment: {
        method: 'BANK_TRANSFER',
      },
    }

    const orderSubmitResult = await handleOrderSubmit(testOrder)
    console.log('Order submit result status:', orderSubmitResult.status, orderSubmitResult.data?.success)
    if (orderSubmitResult.status !== 200) {
      throw new Error(`Order submit failed: ${JSON.stringify(orderSubmitResult.data)}`)
    }

    // 6. Confirm Voucher is marked USED in SQLite
    console.log('\n6. Checking Voucher is now marked USED in SQLite...')
    const voucherInDb = getVoucherByCode(welcomeCode)
    console.log('Voucher status in DB after order submit:', {
      code: voucherInDb.code,
      used: voucherInDb.used,
      order_id: voucherInDb.order_id,
    })
    if (!voucherInDb.used) {
      throw new Error('Voucher was NOT marked used!')
    }

    // 7. Verify that trying to use the same voucher again FAILS
    console.log('\n7. Verifying voucher cannot be used again...')
    const secondCheckRes = await fetch(`${baseUrl}/api/vouchers/validate?code=${welcomeCode}&subtotal=750000`)
    const secondCheckData = await secondCheckRes.json()
    console.log('Second validation response (should be invalid):', secondCheckData)
    if (secondCheckData.isValid) {
      throw new Error('Used voucher was incorrectly accepted as valid!')
    }

    console.log('\n🎉 ALL API & VOUCHER END-TO-END TESTS PASSED 100%!')
    process.exit(0)
  } finally {
    server.close()
  }
}

runApiTests().catch((err) => {
  console.error('API Test Error:', err)
  process.exit(1)
})
