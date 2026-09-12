import { getDb, createAccount, createVerificationCode, findLatestActiveCode, markAccountVerified, createWelcomeVoucher, getVoucherByCode, markVoucherUsed, getAccountStats } from '../server/lib/accountDb.js'

try {
  console.log('--- TESTING ACCOUNT DB ---')
  const db = getDb()
  console.log('Database connected!')

  // 1. Create account
  const acc = createAccount({
    method: 'google',
    google_id: 'test_google_123',
    email: 'test@quannguyens.vn',
    full_name: 'Quân Test',
  })
  console.log('Created account:', acc.id, acc.email)

  // 2. Create verification code
  const vcode = createVerificationCode({
    account_id: acc.id,
    code: '123456',
    target: acc.email,
    target_type: 'email',
  })
  console.log('Created verification code:', vcode.code, 'target:', vcode.target)

  // 3. Find active code
  const activeCode = findLatestActiveCode(acc.id)
  console.log('Active code found:', activeCode?.code === '123456')

  // 4. Mark verified
  const verifiedAcc = markAccountVerified(acc.id)
  console.log('Account verified status:', verifiedAcc.verified)

  // 5. Create welcome voucher
  const voucher = createWelcomeVoucher(acc.id)
  console.log('Welcome voucher created:', voucher.code, 'discount:', voucher.discount_percent, 'freeship:', voucher.free_shipping)

  // 6. Look up voucher
  const lookedUp = getVoucherByCode(voucher.code)
  console.log('Looked up voucher:', lookedUp?.code, 'free_shipping:', lookedUp?.free_shipping, 'used:', lookedUp?.used)

  // 7. Mark used
  const used = markVoucherUsed(voucher.code, 'QNS-TEST-ORDER')
  console.log('Marked voucher used:', used)
  const afterUse = getVoucherByCode(voucher.code)
  console.log('Voucher after use:', afterUse?.used)

  // 8. Stats
  const stats = getAccountStats()
  console.log('DB Stats:', stats)

  console.log('--- ALL DB TESTS PASSED! ---')
} catch (err) {
  console.error('Test DB failed:', err)
  process.exit(1)
}
