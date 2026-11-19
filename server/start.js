const bootStartMs = Date.now()

// Khởi chạy trực tiếp ở chế độ Production mà không cần spawn thêm tiến trình con `cross-env`
process.env.NODE_ENV = 'production'

let bootCompleted = false

function writeStderrSync(message) {
  try {
    process.stderr.write(`${message}\n`)
  } catch {
    // Bỏ qua nếu luồng stderr đã đóng
  }
}

function writeStdoutSync(message) {
  try {
    process.stdout.write(`${message}\n`)
  } catch {
    // Bỏ qua nếu luồng stdout đã đóng
  }
}

function formatError(err) {
  if (!err) return 'Unknown error'
  if (err instanceof Error) return err.stack || err.message || String(err)
  return String(err)
}

process.on('uncaughtException', (err) => {
  writeStderrSync(`🚨 [BOOT FATAL uncaughtException] (${Date.now() - bootStartMs}ms): ${formatError(err)}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  writeStderrSync(`🚨 [BOOT ${bootCompleted ? 'RUNTIME' : 'FATAL'} unhandledRejection] (${Date.now() - bootStartMs}ms): ${formatError(reason)}`)
  if (!bootCompleted) {
    process.exit(1)
  }
})

const isRender = Boolean(
  String(process.env.RENDER || '').trim() ||
    String(process.env.RENDER_EXTERNAL_URL || '').trim() ||
    String(process.env.RENDER_SERVICE_ID || '').trim() ||
    String(process.env.RENDER_INSTANCE_ID || '').trim()
)

writeStdoutSync(
  `⏳ [START] Booting QuanNguyenS entrypoint (node=${process.version}, pid=${process.pid}, PORT=${process.env.PORT || 'auto'}, RENDER=${isRender})...`
)

try {
  await import('./index.js')
  bootCompleted = true
  writeStdoutSync(`✅ [START] Module graph loaded in ${Date.now() - bootStartMs}ms`)
} catch (err) {
  writeStderrSync(`❌ [START FATAL] Không thể nạp server/index.js sau ${Date.now() - bootStartMs}ms:\n${formatError(err)}`)
  process.exit(1)
}
