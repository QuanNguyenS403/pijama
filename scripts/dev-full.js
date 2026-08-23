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

const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'
const nodeCmd = process.execPath

// 1. Khởi động Backend API Server (Port 3001)
const backend = spawn(nodeCmd, ['server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' },
})

// 2. Khởi động Frontend Vite Dev Server (Port 3000)
const frontend = spawn(npmCmd, ['run', 'dev', '--', '--port', '3000'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
})

const cleanup = () => {
  console.log('\n🛑 Đang dừng toàn bộ hệ thống...')
  try {
    backend.kill('SIGINT')
    frontend.kill('SIGINT')
  } catch (e) {}
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('exit', cleanup)
