import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { loadEnvironment } from '../server/lib/envCheck.js'
import { sendEmailViaHttps } from '../server/lib/httpsEmailService.js'
import {
  checkDomainDeliverability,
  isAutomatedTestEnvironment,
  normalizeRecipients,
} from '../server/lib/emailRecipientGuard.js'

/**
 * Hồi quy cho sự cố: `npm test` gửi email OTP THẬT tới otp_register_xxx@<domain-shop>
 * (do .env ghi đè NODE_ENV=test thành development) -> Gmail trả về "Mail Delivery Subsystem".
 */
describe('Email Safety Guard — chống gửi email thật khi chạy test & chống bounce', () => {
  let originalFetch

  before(() => {
    originalFetch = globalThis.fetch
  })

  after(() => {
    globalThis.fetch = originalFetch
  })

  it('loadEnvironment() KHÔNG được ghi đè NODE_ENV=test do test runner cấp', () => {
    process.env.NODE_ENV = 'test'
    loadEnvironment()
    assert.equal(process.env.NODE_ENV, 'test')
    loadEnvironment()
    assert.equal(process.env.NODE_ENV, 'test', 'Gọi lặp lại vẫn phải giữ nguyên NODE_ENV=test')
  })

  it('Nhận diện đúng môi trường test tự động', () => {
    assert.equal(isAutomatedTestEnvironment(), true)
  })

  it('sendEmailViaHttps() trong môi trường test tuyệt đối không gọi ra mạng (GAS / Resend)', async () => {
    let networkCalls = 0
    globalThis.fetch = async () => {
      networkCalls += 1
      throw new Error('Không được phép gọi mạng khi chạy test')
    }

    const result = await sendEmailViaHttps({
      to: `otp_register_${Date.now()}@example.invalid`,
      subject: '[QuanNguyenS] Mã xác thực đăng ký tài khoản: 123456',
      html: '<p>123456</p>',
    })

    assert.equal(result.success, true)
    assert.equal(result.transport, 'test_mock')
    assert.equal(networkCalls, 0, 'Không được có request mạng nào')
  })

  it('Từ chối domain dành riêng (RFC 2606/6761) mà không cần tra DNS', async () => {
    for (const domain of ['example.com', 'foo.test', 'shop.invalid', 'localhost', 'abc.local']) {
      const r = await checkDomainDeliverability(domain)
      assert.equal(r.deliverable, false, `${domain} phải bị chặn`)
    }
  })

  it('Chuẩn hóa danh sách người nhận dạng "Tên <email>" và chuỗi phân tách dấu phẩy', () => {
    assert.deepEqual(
      normalizeRecipients('"Quân" <A@Gmail.com>, b@gmail.com'),
      ['a@gmail.com', 'b@gmail.com']
    )
  })
})

