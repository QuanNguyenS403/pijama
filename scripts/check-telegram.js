// scripts/check-telegram.js
import path from 'path'
import { fileURLToPath } from 'url'
import { loadEnvironment } from '../server/lib/envCheck.js'
import {
  getTelegramConfigDiagnostics,
  syncTelegramWebhook,
  sendTelegramOwnerNotification,
} from '../server/lib/loyalty/otpProviders/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

loadEnvironment(rootDir)

const args = new Set(process.argv.slice(2))
const shouldSync = args.has('--sync')
const shouldTestOwner = args.has('--test-owner')

const issues = []

function printHeader(title) {
  console.log('\n' + '═'.repeat(76))
  console.log(title)
  console.log('═'.repeat(76))
}

async function main() {
  printHeader('🤖 CHẨN ĐOÁN TOÀN DIỆN HỆ THỐNG TELEGRAM BOT & WEBHOOK — QuanNguyenS')

  // 1. Kiểm tra biến môi trường cục bộ
  const diag = getTelegramConfigDiagnostics(process.env)
  console.log('\n▶ 1. Kiểm tra cấu hình biến môi trường (đã ẩn toàn bộ khóa bí mật):')
  console.log(
    `  • TELEGRAM_BOT_TOKEN      : ${
      diag.botToken.valid
        ? `✅ Hợp lệ (độ dài: ${diag.botToken.length}, botId: ${diag.botId})`
        : `❌ ${diag.botToken.code} — ${diag.botToken.message}`
    }`
  )
  if (!diag.botToken.valid) {
    issues.push(`TELEGRAM_BOT_TOKEN: ${diag.botToken.message}`)
  }

  console.log(
    `  • TELEGRAM_BOT_USERNAME   : ${
      diag.botUsernameHasAtPrefix
        ? `⚠️ Có ký tự @ ở đầu (đã tự bỏ thành @${diag.botUsername})`
        : `✅ @${diag.botUsername}`
    }`
  )

  console.log(
    `  • TELEGRAM_OWNER_CHAT_ID  : ${
      diag.ownerChatId.valid
        ? `✅ Hợp lệ (${diag.ownerChatId.masked})`
        : `❌ ${diag.ownerChatId.code} — ${diag.ownerChatId.message}`
    }`
  )
  if (!diag.ownerChatId.valid) {
    issues.push(`TELEGRAM_OWNER_CHAT_ID: ${diag.ownerChatId.message}`)
  }

  const expectedWebhookUrl =
    diag.canonicalWebhookUrl || 'https://www.quannguyens.com/api/telegram/webhook'
  console.log(
    `  • TELEGRAM_WEBHOOK_URL    : ${
      diag.webhookUrl
        ? diag.webhookUrlIsNonWww
          ? `⚠️ Đang dùng non-www (${diag.webhookUrl}) -> bắt buộc dùng ${expectedWebhookUrl}`
          : !diag.webhookUrlIsHttps
            ? `❌ Không dùng HTTPS (${diag.webhookUrl})`
            : `✅ ${diag.webhookUrl}`
        : `ℹ️ Chưa đặt rõ (mặc định production: ${expectedWebhookUrl})`
    }`
  )
  if (diag.webhookUrl && (diag.webhookUrlIsNonWww || !diag.webhookUrlIsHttps)) {
    issues.push(
      `TELEGRAM_WEBHOOK_URL phải là URL HTTPS chuẩn canonical www: ${expectedWebhookUrl}`
    )
  }

  console.log(
    `  • TELEGRAM_WEBHOOK_SECRET : ${
      !diag.webhookSecret.configured
        ? '⚠️ Chưa bật (khuyến nghị đặt chuỗi bí mật để chặn request giả mạo)'
        : diag.webhookSecret.valid
          ? `✅ Hợp lệ (độ dài: ${diag.webhookSecret.length} ký tự)`
          : `❌ ${diag.webhookSecret.code} — ${diag.webhookSecret.message}`
    }`
  )
  if (diag.webhookSecret.configured && !diag.webhookSecret.valid) {
    issues.push(`TELEGRAM_WEBHOOK_SECRET: ${diag.webhookSecret.message}`)
  }

  // Tùy chọn --sync: ép đồng bộ lại setWebhook lên Telegram
  if (shouldSync) {
    console.log('\n▶ [SYNC] Đang chạy syncTelegramWebhook({ force: true })...')
    if (!diag.botToken.valid) {
      console.log('  ❌ Bỏ qua đồng bộ vì TELEGRAM_BOT_TOKEN chưa hợp lệ.')
      issues.push('Không thể chạy --sync do TELEGRAM_BOT_TOKEN chưa hợp lệ.')
    } else {
      const syncRes = await syncTelegramWebhook({ force: true })
      if (syncRes.ok) {
        console.log(`  ✅ Đồng bộ webhook thành công (${syncRes.action}): ${syncRes.url}`)
      } else {
        console.log(`  ❌ Đồng bộ webhook thất bại: ${syncRes.error || syncRes.reason}`)
        issues.push(`Đồng bộ webhook thất bại: ${syncRes.error || syncRes.reason}`)
      }
    }
  }

  // 2. Truy vấn trực tiếp Telegram Bot API (getMe & getWebhookInfo)
  console.log('\n▶ 2. Đối soát trực tiếp Telegram Bot API (getMe & getWebhookInfo):')
  if (!diag.botToken.valid) {
    console.log('  ⏭️ Bỏ qua kiểm tra API trực tiếp vì TELEGRAM_BOT_TOKEN chưa hợp lệ.')
  } else {
    const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
    try {
      const [meRes, whRes] = await Promise.all([
        fetch(`https://api.telegram.org/bot${token}/getMe`, {
          signal: AbortSignal.timeout(10000),
        }),
        fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
          signal: AbortSignal.timeout(10000),
        }),
      ])

      const [meData, whData] = await Promise.all([meRes.json(), whRes.json()])

      if (meData?.ok && meData.result) {
        const bot = meData.result
        console.log(
          `  • getMe          : ✅ Bot hoạt động — id=${bot.id}, username=@${bot.username}, name="${bot.first_name}"`
        )
        if (
          bot.username &&
          bot.username.toLowerCase() !== diag.botUsername.toLowerCase()
        ) {
          const msg = `TELEGRAM_BOT_USERNAME (${diag.botUsername}) không khớp với username thật trên Telegram (@${bot.username}).`
          console.log(`  ⚠️ ${msg}`)
          issues.push(msg)
        }
        if (
          String(process.env.TELEGRAM_OWNER_CHAT_ID || '').trim() === String(bot.id)
        ) {
          const msg = `TELEGRAM_OWNER_CHAT_ID đang trùng với ID của chính con bot (${bot.id}).`
          console.log(`  ❌ ${msg}`)
          issues.push(msg)
        }
      } else {
        const msg = `getMe thất bại (HTTP ${meRes.status}): ${meData?.description || 'Token không hợp lệ hoặc đã bị thu hồi'}`
        console.log(`  • getMe          : ❌ ${msg}`)
        issues.push(msg)
      }

      if (whData?.ok && whData.result) {
        const wh = whData.result
        console.log(`  • getWebhookInfo :`)
        console.log(`      - URL đã đăng ký     : ${wh.url || '(chưa có)'}`)
        console.log(`      - Pending updates    : ${wh.pending_update_count ?? 0}`)
        console.log(
          `      - Allowed updates    : ${JSON.stringify(wh.allowed_updates || [])}`
        )
        console.log(
          `      - Lỗi gần nhất       : ${wh.last_error_message || 'Không có'}`
        )
        if (wh.url !== expectedWebhookUrl) {
          const msg = `Webhook URL trên Telegram ("${wh.url || 'rỗng'}") chưa khớp với canonical URL ("${expectedWebhookUrl}"). Hãy chạy: npm run check-telegram -- --sync`
          console.log(`      ⚠️ ${msg}`)
          issues.push(msg)
        }
        if (wh.last_error_message) {
          const msg = `Telegram báo lỗi khi gửi tới webhook: ${wh.last_error_message}`
          console.log(`      ❌ ${msg}`)
          issues.push(msg)
        }
      } else {
        const msg = `getWebhookInfo thất bại (HTTP ${whRes.status}): ${whData?.description || 'Unknown error'}`
        console.log(`  • getWebhookInfo : ❌ ${msg}`)
        issues.push(msg)
      }
    } catch (err) {
      const msg = `Không thể kết nối tới api.telegram.org: ${err?.message || err}`
      console.log(`  ❌ ${msg}`)
      issues.push(msg)
    }
  }

  // 3. Kiểm tra Endpoint Production thực tế
  console.log(`\n▶ 3. Kiểm tra Endpoint Webhook thực tế (${expectedWebhookUrl}):`)
  try {
    const noSecretRes = await fetch(expectedWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })

    if (noSecretRes.status >= 300 && noSecretRes.status < 400) {
      const loc = noSecretRes.headers.get('location') || '(unknown)'
      const msg = `Endpoint trả về Redirect HTTP ${noSecretRes.status} -> ${loc}. Telegram Bot API không follow redirect!`
      console.log(`  ❌ ${msg}`)
      issues.push(msg)
    } else if (diag.webhookSecret.configured && diag.webhookSecret.valid) {
      if (noSecretRes.status === 401) {
        console.log(
          `  • Không gửi secret header : ✅ HTTP 401 Unauthorized (đang khóa bảo mật đúng)`
        )
      } else if (noSecretRes.status === 200) {
        const msg =
          'Endpoint trả HTTP 200 ngay cả khi KHÔNG có secret header — kiểm tra lại TELEGRAM_WEBHOOK_SECRET trên Render!'
        console.log(`  ⚠️ ${msg}`)
        issues.push(msg)
      } else {
        const msg = `Endpoint phản hồi trạng thái bất ngờ khi thiếu secret: HTTP ${noSecretRes.status}`
        console.log(`  ❌ ${msg}`)
        issues.push(msg)
      }

      const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
      const withSecretRes = await fetch(expectedWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': secret,
        },
        body: '{}',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      })

      let bodyText = ''
      try {
        bodyText = await withSecretRes.text()
      } catch {}

      if (withSecretRes.status === 200) {
        console.log(
          `  • Có gửi secret header    : ✅ HTTP 200 OK (${bodyText.slice(0, 120)})`
        )
      } else if (withSecretRes.status === 401) {
        const msg =
          'TELEGRAM_WEBHOOK_SECRET cục bộ KHÔNG khớp với biến TELEGRAM_WEBHOOK_SECRET trên Render (trả về 401). Hãy kiểm tra lại giá trị trên Render Dashboard (không bọc < >).'
        console.log(`  • Có gửi secret header    : ❌ HTTP 401 Unauthorized — ${msg}`)
        issues.push(msg)
      } else {
        const msg = `Endpoint trả về HTTP ${withSecretRes.status} khi gửi kèm secret: ${bodyText.slice(0, 200)}`
        console.log(`  • Có gửi secret header    : ❌ ${msg}`)
        issues.push(msg)
      }
    } else {
      if (noSecretRes.status === 200) {
        console.log(`  • Phản hồi endpoint       : ✅ HTTP 200 OK`)
      } else {
        const msg = `Endpoint phản hồi HTTP ${noSecretRes.status}`
        console.log(`  • Phản hồi endpoint       : ❌ ${msg}`)
        issues.push(msg)
      }
    }
  } catch (err) {
    const msg = `Lỗi kết nối tới endpoint ${expectedWebhookUrl}: ${err?.message || err}`
    console.log(`  ❌ ${msg}`)
    issues.push(msg)
  }

  // 4. Tùy chọn --test-owner: Gửi thử 1 tin nhắn tới chủ shop
  if (shouldTestOwner) {
    console.log('\n▶ 4. [TEST OWNER] Gửi tin nhắn kiểm thử tới TELEGRAM_OWNER_CHAT_ID...')
    const sendRes = await sendTelegramOwnerNotification({
      text: '✅ <b>[QuanNguyenS]</b> Kiểm tra kết nối thông báo chủ shop từ lệnh <code>npm run check-telegram -- --test-owner</code> thành công!',
      parseMode: 'HTML',
    })
    if (sendRes.ok) {
      console.log('  ✅ Đã gửi tin nhắn kiểm thử thành công tới Telegram chủ shop!')
    } else {
      const msg = `Gửi tin nhắn kiểm thử thất bại: ${sendRes.error || sendRes.code}`
      console.log(`  ❌ ${msg}`)
      issues.push(msg)
    }
  }

  printHeader('📋 KẾT LUẬN KIỂM TRA TELEGRAM')
  if (issues.length === 0) {
    console.log('✅ KẾT LUẬN: Hệ thống Telegram Bot & Webhook hoạt động hoàn hảo 100%!')
    console.log('═'.repeat(76) + '\n')
    process.exit(0)
  } else {
    console.log(`❌ PHÁT HIỆN ${issues.length} VẤN ĐỀ CẦN KHẮC PHỤC:`)
    issues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. ${issue}`)
    })
    console.log('═'.repeat(76) + '\n')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Lỗi ngoài dự kiến khi kiểm tra Telegram:', err)
  process.exit(1)
})
