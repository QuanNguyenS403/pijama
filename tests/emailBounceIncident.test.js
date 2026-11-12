/**
 * Bộ kiểm thử bảo vệ & hồi quy cho sự cố gửi email tới địa chỉ tổng hợp / tên miền không nhận thư (WP-5.1, WP-7.2, WP-7.3).
 *
 * Bao gồm:
 * - Tầng 1 (WP-5.1): Quét tĩnh toàn bộ `tests/**` đảm bảo không có tên miền nội bộ (@quannguyens.* / @top1lux)
 *   và không phát sinh địa chỉ @gmail.com mới ngoài danh sách kế thừa cũ.
 * - Tầng 2 (WP-1..WP-4): Kiểm thử cách ly .env, mặc định sandbox ngoài production, loại bỏ heuristic argv 'test' (E4),
 *   lọc địa chỉ synthetic trên tên miền shop, strict MX-required (chặn A-only, Null MX, trần fail-open DNS),
 *   chính sách header Reply-To / Code.gs, API nội bộ POST /api/internal/email-bounces (HMAC/Replay/Idempotency/Zod),
 *   hệ thống email_suppressions, /api/health/email (metrics 24h), và cô lập SQLite/store test trong os.tmpdir().
 */

import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const TESTS_DIR = path.join(REPO_ROOT, 'tests')

const OWN_TEST_DOMAIN = ['quannguyens', 'com'].join('.')
const ALT_OWN_DOMAIN = ['quannguyens', 'vn'].join('.')
const LEGACY_GMAIL_DOMAIN = ['gmail', 'com'].join('.')
const OUTLOOK_DOMAIN = ['outlook', 'com'].join('.')

// Khóa an toàn trước khi nạp bất kỳ module server nào (dùng dynamic await import tránh ESM hoisting)
process.env.NO_AUTO_LISTEN = 'true'
process.env.NODE_ENV = 'test'
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'QnsTestAdmin!2026'
process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'qns-test-admin-secret-0123456789abcdef'
process.env.ORDER_TOKEN_SECRET = process.env.ORDER_TOKEN_SECRET || 'qns-test-order-secret-0123456789abcdef'
process.env.CUSTOMER_AUTH_SECRET = process.env.CUSTOMER_AUTH_SECRET || 'qns-test-customer-secret-0123456789abcdef'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'qns-test-jwt-secret-0123456789abcdef'
process.env.GMAIL_BRIDGE_SECRET = process.env.GMAIL_BRIDGE_SECRET || 'qns-test-bridge-secret-0123456789abcdef'

const {
  isNodeTestRunner,
  isAutomatedTestEnvironment,
  isSyntheticTestEmail,
  checkDomainDeliverability,
  partitionRecipients,
  __setDnsResolverForTests,
  __resetMxCacheForTests,
  __resetDnsFailOpenHistoryForTests,
} = await import('../server/lib/emailRecipientGuard.js')

const {
  resolveSendPolicy,
  sendEmailViaHttps,
  validateEmailSenderHeaders,
  recordEmailOutbox,
  getEmailOutboxStats24h,
  getEmailServiceStatus,
  setEmailTransportForTests,
  __resetEmailAlertCooldownsForTests,
} = await import('../server/lib/httpsEmailService.js')

const {
  getDb,
  getAccountDbPath,
  hashEmailNormalized,
  isEmailBounceSuppressed,
  removeEmailSuppression,
  getMarketingAudience,
} = await import('../server/lib/accountDb.js')

const { orderPersistence } = await import('../server/lib/orderPersistence.js')
const { loadEnvironment } = await import('../server/lib/envCheck.js')
const { computeBridgeSignature, clearBridgeReplayCache } = await import('../server/lib/gmailBridgeAuth.js')
const { generateAdminSessionToken } = await import('../server/lib/adminAuth.js')
const { app } = await import('../server/index.js')

const FORBIDDEN_DOMAIN_REGEXES = [/@quannguyens\./i, /@top1lux/i]
const GMAIL_REGEX = new RegExp(`@${LEGACY_GMAIL_DOMAIN.replace('.', '\\.')}`, 'gi')

// Danh sách đóng băng các file test cũ đã tồn tại từ trước sự cố (chỉ cho phép tối đa đúng số lần hiện có)
const LEGACY_GMAIL_ALLOWLIST = new Map([
  ['adversarialEmailDelivery.test.js', 3],
  ['aiVerifySecurity.test.js', 1],
  ['chat/chatCore.test.js', 2],
  ['customerAuthSecurity.test.js', 1],
  ['customerOAuthAccountCreation.test.js', 2],
  ['emailDeliveryRefactor.test.js', 1],
  ['emailSafetyGuard.test.js', 4],
  ['enterpriseAuth.test.js', 1],
  ['googleAuthEmailNotifications.test.js', 2],
  ['loyaltyEnrollment.test.js', 1],
  ['securityAuditVerification.test.js', 1],
  ['test-api.js', 1],
])

function walkTestFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkTestFiles(full))
    } else if (entry.isFile() && /\.(?:js|mjs)$/i.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

function makeDnsStub({ mx = null, mxErr = null, a = null, aErr = null } = {}) {
  return {
    async resolveMx() {
      if (mxErr) throw mxErr
      return mx ?? []
    },
    async resolve4() {
      if (aErr) throw aErr
      return a ?? []
    },
  }
}

describe('WP-5.1 Guard: Vệ sinh dữ liệu email trong thư mục tests/**', () => {
  it('Không có file test nào (trừ file kiểm toán này) chứa tên miền @quannguyens.* hoặc @top1lux*', () => {
    const files = walkTestFiles(TESTS_DIR)
    const violations = []

    for (const filePath of files) {
      const rel = path.relative(TESTS_DIR, filePath).replace(/\\/g, '/')
      if (rel === 'emailBounceIncident.test.js') continue

      const content = fs.readFileSync(filePath, 'utf8')
      for (const rx of FORBIDDEN_DOMAIN_REGEXES) {
        if (rx.test(content)) {
          violations.push(`${rel} khớp mẫu cấm ${rx}`)
        }
      }

      const gmailMatches = content.match(GMAIL_REGEX) || []
      const allowedMax = LEGACY_GMAIL_ALLOWLIST.get(rel) || 0
      if (gmailMatches.length > allowedMax) {
        violations.push(`${rel} phát sinh @gmail (${gmailMatches.length} > ngưỡng cũ ${allowedMax})`)
      }
    }

    assert.deepEqual(violations, [], `Phát hiện vi phạm vệ sinh test email:\n${violations.join('\n')}`)
  })
})

describe('WP-1: Cách ly .env, chính sách sandbox mặc định, bỏ heuristic argv & preload chặn mạng', () => {
  const envSnapshot = {}
  const TRACKED_ENV_KEYS = [
    'NODE_ENV',
    'NODE_TEST_CONTEXT',
    'EMAIL_REAL_SEND',
    'AUTH_TEST_MODE',
    'EMAIL_DELIVERY_DISABLED',
    'GAS_EMAIL_WEBHOOK_URL',
    'GAS_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'EMAIL_REPLY_TO',
    'OWN_DOMAINS',
    'EMAIL_ALLOW_IMPLICIT_MX_DOMAINS',
    'MX_DNS_FAIL_OPEN_MAX_PER_HOUR',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
  ]

  before(() => {
    for (const k of TRACKED_ENV_KEYS) envSnapshot[k] = process.env[k]
  })

  afterEach(() => {
    for (const k of TRACKED_ENV_KEYS) {
      if (envSnapshot[k] === undefined) delete process.env[k]
      else process.env[k] = envSnapshot[k]
    }
    __setDnsResolverForTests(null)
    __resetMxCacheForTests()
    __resetDnsFailOpenHistoryForTests()
    setEmailTransportForTests(null)
    __resetEmailAlertCooldownsForTests()
  })

  it('T1: loadEnvironment() không để .env ghi đè NODE_ENV, EMAIL_REAL_SEND, AUTH_TEST_MODE, EMAIL_DELIVERY_DISABLED và không khởi tạo SMTP trong test', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qns-env-test-'))
    try {
      fs.writeFileSync(
        path.join(tmpDir, '.env'),
        [
          'NODE_ENV=development',
          'EMAIL_REAL_SEND=true',
          'AUTH_TEST_MODE=false',
          'EMAIL_DELIVERY_DISABLED=true',
          'NODE_TEST_CONTEXT=',
        ].join('\n'),
        'utf8'
      )

      process.env.NODE_ENV = 'test'
      process.env.AUTH_TEST_MODE = 'true'
      delete process.env.EMAIL_REAL_SEND
      delete process.env.EMAIL_DELIVERY_DISABLED

      loadEnvironment(tmpDir, { onlyRootDir: true })

      assert.equal(process.env.NODE_ENV, 'test')
      assert.equal(process.env.AUTH_TEST_MODE, 'true')
      assert.notEqual(process.env.EMAIL_REAL_SEND, 'true')
      assert.notEqual(process.env.EMAIL_DELIVERY_DISABLED, 'true')

      // Dù GMAIL_USER / GMAIL_APP_PASSWORD & EMAIL_DELIVERY_DISABLED có mặt, nhánh test_mock phải chạy trước không đụng createTransport()
      process.env.GMAIL_USER = 'smtp-placeholder@example.com'
      process.env.GMAIL_APP_PASSWORD = 'placeholder-app-password'
      process.env.EMAIL_DELIVERY_DISABLED = 'true'
      const mockRes = await sendEmailViaHttps({
        to: 'customer@example.com',
        subject: 'Kiem tra khong dung createTransport',
        html: '<p>OK</p>',
        _skipEnvLoad: true,
      })
      assert.equal(mockRes.transport, 'test_mock')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('T2/E4: Không coi dev/staging hay đường dẫn chứa chữ "test" (latest-site, test-email.js) là test runner; non-prod mặc định sandbox', () => {
    assert.equal(isNodeTestRunner({ NODE_ENV: 'development' }, []), false)
    assert.equal(isAutomatedTestEnvironment({ NODE_ENV: 'development' }, []), false)

    const devSandboxPolicy = resolveSendPolicy({ NODE_ENV: 'development' }, [])
    assert.equal(devSandboxPolicy.mode, 'sandbox')
    assert.equal(devSandboxPolicy.allowRealSend, false)

    const devExplicitSend = resolveSendPolicy({ NODE_ENV: 'development', EMAIL_REAL_SEND: 'true' }, [])
    assert.equal(devExplicitSend.mode, 'live')
    assert.equal(devExplicitSend.allowRealSend, true)
  })

  it('T3: NODE_ENV=production trong node --test vẫn fail-closed EMAIL_NOT_CONFIGURED khi thiếu cấu hình, và khóa chạm mạng khi đủ cấu hình', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL

    await assert.rejects(
      () =>
        sendEmailViaHttps({
          to: `real.customer@${OUTLOOK_DOMAIN}`,
          subject: 'Kiem tra fail-closed',
          html: '<p>Hi</p>',
          _skipEnvLoad: true,
        }),
      (err) => err && err.code === 'EMAIL_NOT_CONFIGURED'
    )

    process.env.GMAIL_APP_PASSWORD = 'mock-password-16'
    process.env.GMAIL_USER = 'shop@example.invalid'
    __setDnsResolverForTests(makeDnsStub({ mx: [{ priority: 10, exchange: `mx.${OUTLOOK_DOMAIN}` }] }))

    const lockedResult = await sendEmailViaHttps({
      to: `real.customer@${OUTLOOK_DOMAIN}`,
      subject: 'Kiem tra khoa mang trong test runner',
      html: '<p>Hi</p>',
      _skipEnvLoad: true,
    })
    assert.equal(lockedResult.sandboxed, true)
    assert.equal(lockedResult.transport, 'test_mock')
  })

  it('WP-1.5: Preload no-real-network chặn SMTP nodemailer.createTransport và fetch ngoài loopback', async () => {
    if (!globalThis.__QNS_NO_REAL_NETWORK_INSTALLED__) {
      // Vẫn xác minh nếu chạy trực tiếp không qua npm test preload
      await import('./setup/no-real-network.mjs')
    }
    assert.equal(globalThis.__QNS_NO_REAL_NETWORK_INSTALLED__, true)

    assert.throws(
      () => nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465 }),
      (err) => err && err.code === 'TEST_SMTP_BLOCKED'
    )

    await assert.rejects(
      () => fetch('https://api.resend.com/emails', { method: 'POST' }),
      (err) => err && err.code === 'TEST_NETWORK_BLOCKED'
    )
  })
})

describe('WP-2: Chặn địa chỉ synthetic & Strict MX-required (không implicit A fallback mặc định)', () => {
  afterEach(() => {
    delete process.env.EMAIL_ALLOW_IMPLICIT_MX_DOMAINS
    delete process.env.MX_DNS_FAIL_OPEN_MAX_PER_HOUR
    delete process.env.OWN_DOMAINS
    delete process.env.GAS_EMAIL_WEBHOOK_URL
    delete process.env.GAS_WEBHOOK_SECRET
    process.env.NODE_ENV = 'test'
    __setDnsResolverForTests(null)
    __resetMxCacheForTests()
    __resetDnsFailOpenHistoryForTests()
  })

  it('T4: Chặn mọi biến thể ent_user_*, otp_register_*, forgot_*, +tag, chữ hoa & multi-recipient trên tên miền shop', async () => {
    const samples = [
      `ent_user_1760000000@${OWN_TEST_DOMAIN}`,
      `ENT_USER_999@${OWN_TEST_DOMAIN.toUpperCase()}`,
      `ent_user_123+debug@${OWN_TEST_DOMAIN}`,
      `otp_register_999@${OWN_TEST_DOMAIN}`,
      `forgot_user1@${ALT_OWN_DOMAIN}`,
      `test_smoke_1@${OWN_TEST_DOMAIN}`,
    ]
    for (const addr of samples) {
      assert.equal(isSyntheticTestEmail(addr), true, `Phải nhận diện synthetic: ${addr}`)
    }

    assert.equal(isSyntheticTestEmail(`customer@${OUTLOOK_DOMAIN}`), false)

    await assert.rejects(
      () =>
        sendEmailViaHttps({
          to: [`ent_user_111@${OWN_TEST_DOMAIN}`],
          subject: 'Test chan synthetic',
          html: '<p>OTP</p>',
          _skipEnvLoad: true,
        }),
      (err) => err && err.code === 'UNDELIVERABLE_RECIPIENT'
    )

    // Trường hợp display name chứa dấu phẩy trong ngoặc kép không bị cắt làm mảnh rác
    const quotedPart = await partitionRecipients(`"Quân, Nguyễn" <ent_user_quoted_1@${OWN_TEST_DOMAIN}>`)
    assert.equal(quotedPart.deliverable.length, 0)
    assert.equal(quotedPart.rejected.length, 1)
    assert.equal(quotedPart.rejected[0]?.reason, 'SYNTHETIC_TEST_RECIPIENT')

    // Trường hợp trộn 1 địa chỉ thật + 1 địa chỉ synthetic -> lọc bỏ synthetic, chỉ gửi phần sạch
    const mixed = await sendEmailViaHttps({
      to: `ent_user_222@${OWN_TEST_DOMAIN}, khach.hang@example.com`,
      subject: 'Test multi recipient',
      html: '<p>Order</p>',
      _skipEnvLoad: true,
    })
    assert.equal(mixed.ok, true)
  })

  it('T5/T6/E3: Domain chỉ có bản ghi A (không MX) bị TỪ CHỐI; Null MX "0 ." bị từ chối; implicit MX chỉ mở cho third-party allowlist', async () => {
    const enoDataErr = Object.assign(new Error('queryMx ENODATA'), { code: 'ENODATA' })
    __setDnsResolverForTests(makeDnsStub({ mxErr: enoDataErr, a: ['104.21.10.20'] }))

    const aOnlyRes = await checkDomainDeliverability('aonly-site.example-net.invalid'.replace('.invalid', '.com'))
    assert.equal(aOnlyRes.deliverable, false)
    assert.equal(aOnlyRes.reason, 'NO_MX_RECORD')
    assert.equal(aOnlyRes.implicitMx, undefined)

    // Null MX (RFC 7505)
    __resetMxCacheForTests()
    __setDnsResolverForTests(makeDnsStub({ mx: [{ priority: 0, exchange: '.' }] }))
    const nullMxRes = await checkDomainDeliverability('nullmx-domain.com')
    assert.equal(nullMxRes.deliverable, false)
    assert.equal(nullMxRes.reason, 'NULL_MX')

    // Allowlist chỉ áp dụng cho third-party, KHÔNG áp dụng cho OWN_DOMAINS
    __resetMxCacheForTests()
    __setDnsResolverForTests(makeDnsStub({ mxErr: enoDataErr, a: ['104.21.10.20'] }))
    process.env.EMAIL_ALLOW_IMPLICIT_MX_DOMAINS = `legacy-partner.com,${OWN_TEST_DOMAIN}`

    const partnerRes = await checkDomainDeliverability('legacy-partner.com')
    assert.equal(partnerRes.deliverable, true)
    assert.equal(partnerRes.implicitMx, true)

    const ownRes = await checkDomainDeliverability(OWN_TEST_DOMAIN)
    assert.equal(ownRes.deliverable, false)
    assert.equal(ownRes.reason, 'NO_MX_RECORD')
  })

  it('T7: DNS ETIMEOUT -> fail-open gắn unverifiedDomainRecipients trong trần giờ; vượt trần chuyển fail-closed', async () => {
    const timeoutErr = Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })
    __setDnsResolverForTests(makeDnsStub({ mxErr: timeoutErr }))
    process.env.MX_DNS_FAIL_OPEN_MAX_PER_HOUR = '2'

    const part1 = await partitionRecipients(`user1@timeout-one.com`)
    assert.deepEqual(part1.unverifiedDomainRecipients, ['user1@timeout-one.com'])

    const part2 = await partitionRecipients(`user2@timeout-two.com`)
    assert.deepEqual(part2.unverifiedDomainRecipients, ['user2@timeout-two.com'])

    const part3 = await partitionRecipients(`user3@timeout-three.com`)
    assert.equal(part3.deliverable.length, 0)
    assert.equal(part3.rejected[0]?.reason, 'DNS_UNAVAILABLE_CAP_EXCEEDED')
  })
})

describe('WP-3 & WP-4 & WP-6: Bounce Webhook, Suppression List, Reply-To, Health 24h & Cô lập DB', () => {
  let server
  let baseUrl

  before(async () => {
    clearBridgeReplayCache()
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address()
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  afterEach(() => {
    delete process.env.EMAIL_REPLY_TO
    delete process.env.OWN_DOMAIN_EMAIL_READY
    __setDnsResolverForTests(null)
    __resetMxCacheForTests()
    process.env.NODE_ENV = 'test'
  })

  it('Cô lập SQLite & orders store của test vào os.tmpdir(), tuyệt đối ngoài server/data', () => {
    const dbPath = path.resolve(getAccountDbPath())
    const storePath = path.resolve(orderPersistence.getStoreFilePath())
    const prodDataDir = path.resolve(REPO_ROOT, 'server', 'data')

    assert.equal(dbPath.startsWith(prodDataDir), false, `DB test không được nằm trong server/data: ${dbPath}`)
    assert.equal(storePath.startsWith(prodDataDir), false, `Orders store test không được nằm trong server/data: ${storePath}`)
  })

  it('validateEmailSenderHeaders chặn Reply-To / From khi domain chưa có MX và fail-closed khi DNS timeout', async () => {
    const enoDataErr = Object.assign(new Error('ENODATA'), { code: 'ENODATA' })
    __setDnsResolverForTests(makeDnsStub({ mxErr: enoDataErr }))

    const invalidHeaderCheck = await validateEmailSenderHeaders({
      NODE_ENV: 'production',
      EMAIL_REPLY_TO: `support@${OWN_TEST_DOMAIN}`,
    })
    assert.equal(invalidHeaderCheck.replyTo, null)

    // DNS tạm thời ETIMEOUT phải fail-closed cho Reply-To / RESEND_FROM_EMAIL (không fail-open)
    __resetMxCacheForTests()
    const timeoutErr = Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })
    __setDnsResolverForTests(makeDnsStub({ mxErr: timeoutErr }))
    const dnsFailHeaderCheck = await validateEmailSenderHeaders({
      NODE_ENV: 'production',
      EMAIL_REPLY_TO: `support@${OWN_TEST_DOMAIN}`,
      RESEND_FROM_EMAIL: `QuanNguyenS <support@${OWN_TEST_DOMAIN}>`,
    })
    assert.equal(dnsFailHeaderCheck.replyTo, null)
    assert.equal(dnsFailHeaderCheck.resendFrom, null)

    __resetMxCacheForTests()
    __setDnsResolverForTests(makeDnsStub({ mx: [{ priority: 10, exchange: 'route1.mx.cloudflare.net' }] }))
    const validHeaderCheck = await validateEmailSenderHeaders({
      NODE_ENV: 'production',
      EMAIL_REPLY_TO: `support@${OWN_TEST_DOMAIN}`,
    })
    assert.equal(validHeaderCheck.replyTo, `support@${OWN_TEST_DOMAIN}`)
  })

  it('POST /api/internal/email-bounces: HMAC fail (401), Replay nonce (409), Zod invalid (400), Idempotent requestId (200) & Suppression chặn gửi tiếp', async () => {
    const bouncedEmail = `bounced.user.${Date.now()}@${LEGACY_GMAIL_DOMAIN}`
    const secret = process.env.GMAIL_BRIDGE_SECRET

    // 1. Sai HMAC -> 401
    const badRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-qns-signature': '0'.repeat(64),
      },
      body: JSON.stringify({ requestId: 'req-bad-sig-1', bounces: [] }),
    })
    assert.equal(badRes.status, 401)

    // 2. Payload hợp lệ ký HMAC chuẩn
    const reqId = `req_bounce_${Date.now()}`
    const nonce = `nonce_${crypto.randomBytes(8).toString('hex')}`
    const rawBody = JSON.stringify({
      requestId: reqId,
      nonce,
      source: 'apps_script_bounce_reader',
      bounces: [
        {
          email: bouncedEmail,
          reason: 'HARD_BOUNCE',
          detectedAt: new Date().toISOString(),
          messageId: 'gmail_msg_001',
        },
      ],
    })
    const nowSec = Math.floor(Date.now() / 1000)
    const ts1 = String(nowSec)
    const sig1 = computeBridgeSignature(rawBody, secret, ts1)

    const okRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': ts1,
        'x-qns-signature': sig1,
      },
      body: rawBody,
    })
    assert.equal(okRes.status, 200)
    const okJson = await okRes.json()
    assert.equal(okJson.recorded, 1)

    // 3. Phát lại đúng requestId với chữ ký mới -> deduplicated idempotent
    const ts2 = String(nowSec - 1)
    const sig2 = computeBridgeSignature(rawBody, secret, ts2)
    const dupRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': ts2,
        'x-qns-signature': sig2,
      },
      body: rawBody,
    })
    assert.equal(dupRes.status, 200)
    const dupJson = await dupRes.json()
    assert.equal(dupJson.deduplicated, true)

    // 4. Nonce trùng cùng requestId mới -> 409 REPLAY_DETECTED
    const replayBody = JSON.stringify({
      requestId: `${reqId}_new`,
      nonce,
      bounces: [],
    })
    const ts3 = String(nowSec - 2)
    const sig3 = computeBridgeSignature(replayBody, secret, ts3)
    const replayRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': ts3,
        'x-qns-signature': sig3,
      },
      body: replayBody,
    })
    assert.equal(replayRes.status, 409)

    // 4.5 Zod top-level invalid -> 400 INVALID_PAYLOAD; phần tử email dị dạng đơn lẻ trong batch hợp lệ -> skipped
    const invalidPayloadBody = JSON.stringify({ requestId: '', bounces: 'invalid' })
    const tsBad = String(nowSec - 3)
    const sigBad = computeBridgeSignature(invalidPayloadBody, secret, tsBad)
    const zodRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': tsBad,
        'x-qns-signature': sigBad,
      },
      body: invalidPayloadBody,
    })
    assert.equal(zodRes.status, 400)

    const mixedBatchEmail = `mixed.bounce.${Date.now()}@example.com`
    const mixedBatchBody = JSON.stringify({
      requestId: `${reqId}_mixed`,
      nonce: `nonce_mixed_${crypto.randomBytes(6).toString('hex')}`,
      bounces: [
        { email: mixedBatchEmail, reason: 'HARD_BOUNCE' },
        { email: 'not-an-email', reason: 'HARD_BOUNCE' },
      ],
    })
    const tsMix = String(nowSec - 4)
    const sigMix = computeBridgeSignature(mixedBatchBody, secret, tsMix)
    const mixedRes = await fetch(`${baseUrl}/api/internal/email-bounces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-qns-timestamp': tsMix,
        'x-qns-signature': sigMix,
      },
      body: mixedBatchBody,
    })
    assert.equal(mixedRes.status, 200)
    const mixedJson = await mixedRes.json()
    assert.equal(mixedJson.recorded, 1)
    assert.equal(mixedJson.skipped, 1)
    assert.equal(removeEmailSuppression(mixedBatchEmail, { note: 'test_cleanup' }), true)

    // 5. Email bị bounce đã vào suppression -> chặn gửi tiếp qua sendEmailViaHttps & Forgot Password / Register OTP
    assert.equal(isEmailBounceSuppressed(bouncedEmail), true)
    await assert.rejects(
      () =>
        sendEmailViaHttps({
          to: bouncedEmail,
          subject: 'Test suppressed',
          html: '<p>Test</p>',
          _skipEnvLoad: true,
        }),
      (err) => err && err.code === 'RECIPIENT_SUPPRESSED'
    )

    const forgotRes = await fetch(`${baseUrl}/api/auth/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bouncedEmail, turnstileToken: 'mock-turnstile-token-valid' }),
    })
    assert.equal(forgotRes.status, 400)
    const forgotJson = await forgotRes.json()
    assert.equal(forgotJson.code, 'RECIPIENT_SUPPRESSED')

    // Gỡ chặn (WP-3.4) -> không còn suppressed
    assert.equal(removeEmailSuppression(bouncedEmail, { note: 'test_cleanup' }), true)
    assert.equal(isEmailBounceSuppressed(bouncedEmail), false)

    // Kiểm tra marketing audience bỏ qua synthetic_flag & suppressed (cả accounts lẫn users)
    const db = getDb()
    const synId = `usr_syn_${Date.now()}`
    const synEmail = `ent_user_syn_${Date.now()}@${OWN_TEST_DOMAIN}`
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, verified, marketing_email_opt_in, synthetic_flag, created_at, updated_at)
      VALUES (?, ?, 'Syn Test', 'customer', 'active', 1, 1, 1, datetime('now'), datetime('now'))
    `).run(synId, synEmail)
    db.prepare(`
      INSERT INTO accounts (id, method, email, full_name, verified, marketing_email_opt_in, status, synthetic_flag, created_at, updated_at)
      VALUES (?, 'local', ?, 'Syn Test', 1, 1, 'active', 1, datetime('now'), datetime('now'))
    `).run(synId, synEmail)
    const audience = getMarketingAudience()
    assert.equal(audience.some((u) => u.email === synEmail), false)

    // Kiểm tra hash chuẩn hóa
    assert.equal(hashEmailNormalized(`  ${bouncedEmail.toUpperCase()}  `), hashEmailNormalized(bouncedEmail))
  })

  it('GET /api/health/email (có Admin token) & getEmailOutboxStats24h() trả về metrics24h, activeSuppressions, sendMode', async () => {
    const outboxId = `outbox_test_${Date.now()}`
    recordEmailOutbox({
      id: outboxId,
      purpose: 'TEST_HEALTH',
      recipient: `probe@${OUTLOOK_DOMAIN}`,
      status: 'sent_unverified_domain',
      transport: 'apps_script',
    })

    const stats = getEmailOutboxStats24h()
    assert.ok(stats.metrics24h.sentUnverifiedDomain >= 1)

    const status = getEmailServiceStatus()
    assert.equal(typeof status.sendMode, 'string')
    assert.ok(status.metrics24h)

    const adminToken = generateAdminSessionToken()
    const healthRes = await fetch(`${baseUrl}/api/health/email`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert.ok(healthRes.status === 200 || healthRes.status === 500)
    const body = await healthRes.json()
    assert.ok(body.metrics24h)
    assert.equal(typeof body.activeSuppressions, 'number')
    assert.equal(typeof body.sendMode, 'string')
  })
})
