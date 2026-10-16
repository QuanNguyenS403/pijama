// scripts/check-env.js
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateEnvironment, printEnvReport, loadEnvironment } from '../server/lib/envCheck.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// 1. Nạp toàn bộ biến môi trường từ .env, .env.development, .env.local
loadEnvironment(rootDir)

// 2. Chạy kiểm tra
const results = validateEnvironment(process.env)
printEnvReport(results)

// 3. Xử lý mã thoát
if (results.hasFatalErrors) {
  process.exit(1)
} else {
  process.exit(0)
}
