import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('===================================================')
console.log('🚀 KHỞI CHẠY HỆ THỐNG QUANNGUYENS FULL-STACK')
console.log('   - Frontend (Vite) : http://localhost:3000')
console.log('   - Backend (API)   : http://localhost:3001')
console.log('===================================================\n')

const nodeCmd = process.execPath
const viteCliPath = path.resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')

// 1. Khởi động Backend API Server (Port 3001) có --watch tự động nạp code mới
const backend = spawn(nodeCmd, ['--watch', 'server/index.js'], {
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
