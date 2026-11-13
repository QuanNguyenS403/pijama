import { spawn, execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  isDevelopmentEnv,
  isProductionEnv,
  isManagedOrContainerRuntime,
} from '../server/lib/shopConfig.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function canAutoFreeDevPort() {
  const explicitOptIn = String(process.env.DEV_AUTO_FREE_PORT || '').trim().toLowerCase() === 'true'
  return explicitOptIn && isDevelopmentEnv() && !isProductionEnv() && !isManagedOrContainerRuntime()
}

// G7: Chỉ giải phóng cổng khi bật rõ DEV_AUTO_FREE_PORT=true trong môi trường development cục bộ
function freePort(targetPort) {
  if (!canAutoFreeDevPort()) return false
  const port = Number(targetPort)
  if (!Number.isFinite(port) || port <= 0) return false
  const myPid = process.pid
  const parentPid = process.ppid

  if (process.platform === 'win32') {
    try {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      const lines = output.split('\n')
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 5 && parts[0] === 'TCP') {
          const localAddr = parts[1]
          const state = parts[3]
          const pid = parseInt(parts[4], 10)
          if (
            state === 'LISTENING' &&
            localAddr.endsWith(`:${port}`) &&
            pid &&
            pid !== myPid &&
            pid !== parentPid
          ) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' })
              console.log(`🧹 [PORT CLEANUP] Đã tự động tắt tiến trình cũ PID ${pid} đang chiếm cổng ${port}.`)
            } catch {}
          }
        }
      }
    } catch {}
  } else {
    try {
      const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      const pids = output
        .split(/\s+/)
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((pid) => Number.isFinite(pid) && pid > 1 && pid !== myPid && pid !== parentPid)
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGTERM')
        } catch {}
      }
    } catch {}
  }
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
