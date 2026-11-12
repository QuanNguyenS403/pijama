import { spawn, execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Tự động giải phóng cổng nếu có tiến trình Node.js cũ chạy ngầm chưa tắt (tránh EADDRINUSE)
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object { \\$_.OwningProcess -gt 0 } | ForEach-Object { Stop-Process -Id \\$_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' }
      )
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: 'ignore',
      })
    }
  } catch (e) {}
}

freePort(3001)
freePort(3000)

console.log('===================================================')
console.log('🚀 KHỞI CHẠY HỆ THỐNG QUANNGUYENS FULL-STACK')
console.log('   - Frontend (Vite) : http://localhost:3000')
console.log('   - Backend (API)   : http://localhost:3001')
console.log('===================================================\n')

const nodeCmd = process.execPath
const viteCliPath = path.resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
// 1. Khởi động Backend API Server (Port 3001) có --watch chỉ theo dõi server/lib và server/index.js (tránh loop với SQLite accounts.db)
const backend = spawn(nodeCmd, ['--watch', '--watch-path=server/lib', '--watch-path=server/index.js', 'server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' },
})
// 2. Khởi động Frontend Vite Dev Server (Port 3000)
const frontend = spawn(nodeCmd, [viteCliPath, '--port', '3000'], {
  cwd: rootDir,
  stdio: 'inherit',
})

let isShuttingDown = false
const cleanup = () => {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log('\n🛑 Đang dừng toàn bộ hệ thống...')
  try {
    backend.kill('SIGINT')
    frontend.kill('SIGINT')
  } catch (e) {}
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})
process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})
process.on('exit', cleanup)
