import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { generateAiNapasQR } from '../server/lib/aiNapasQrService.js'

test('T-4 / P0: /api/payment/generate-qr khóa cứng tài khoản thụ hưởng, lờ đi STK lạ từ client', async () => {
  const origEnvStk = process.env.BANK_ACCOUNT_NUMBER
  process.env.BANK_ACCOUNT_NUMBER = '1050773506'

  const app = express()
  app.use(express.json())

  app.post('/api/payment/generate-qr', async (req, res) => {
    const { amount, description, orderId } = req.body
    const canonicalBankCode = process.env.BANK_CODE || 'VCB'
    const canonicalAccountNumber = process.env.BANK_ACCOUNT_NUMBER || '1050773506'
    const canonicalAccountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN DUC QUAN'

    const result = await generateAiNapasQR({
      amount,
      description,
      orderId,
      bankCode: canonicalBankCode,
      accountNumber: canonicalAccountNumber,
      accountName: canonicalAccountName,
    })
    return res.json(result)
  })

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/payment/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 350000,
        accountNumber: '9999999999', // Client cố tình gửi số tài khoản gian lận
        bankCode: 'MB',
        accountName: 'HACKER ATTACK',
      }),
    })

    const data = await res.json()
    assert.equal(res.status, 200)
    const effectiveAccount = data.paymentDetails?.accountNumber || data.accountNumber
    assert.equal(effectiveAccount, '1050773506', 'Phải dùng số tài khoản của shop')
    assert.notEqual(effectiveAccount, '9999999999', 'Không được dùng số tài khoản giả từ client')
  } finally {
    process.env.BANK_ACCOUNT_NUMBER = origEnvStk
    server.close()
  }
})
