// scripts/backup-data.js
// Sao lưu dữ liệu runtime an toàn ra ngoài thư mục dự án (sử dụng SQLite Online Backup API)
// Tuyệt đối không lưu bản sao lưu vào Git repository!

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// Thư mục đích ngoài repo (mặc định: thư mục qns-backups ngang hàng với repo pijama)
const DEFAULT_EXTERNAL_BACKUP_DIR = path.resolve(rootDir, '../qns-backups')
const targetBackupDir = process.env.BACKUP_TARGET_DIR || DEFAULT_EXTERNAL_BACKUP_DIR

async function performBackup() {
  console.log('=============================================================================')
  console.log('💾 BẮT ĐẦU TIẾN TRÌNH SAO LƯU DỮ LIỆU RUNTIME (RUNTIME DATA BACKUP)')
  console.log('=============================================================================\n')

  if (!fs.existsSync(targetBackupDir)) {
    fs.mkdirSync(targetBackupDir, { recursive: true })
  }

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const timeStr = now.toISOString().replace(/[:.]/g, '-')
  const dayDir = path.resolve(targetBackupDir, dateStr)
  if (!fs.existsSync(dayDir)) {
    fs.mkdirSync(dayDir, { recursive: true })
  }

  console.log(`📁 Thư mục lưu trữ sao lưu: ${dayDir}\n`)

  const dataDir = path.resolve(rootDir, 'server/data')

  // 1. Sao lưu SQLite accounts.db bằng SQLite Online Backup API
  const accountsDbPath = path.resolve(dataDir, 'accounts.db')
  if (fs.existsSync(accountsDbPath)) {
    console.log('📦 1. Sao lưu accounts.db (sử dụng SQLite Online Backup API)...')
    const destDbPath = path.resolve(dayDir, `accounts_${timeStr}.db`)
    try {
      const sourceDb = new Database(accountsDbPath, { readonly: true })
      await sourceDb.backup(destDbPath)
      sourceDb.close()

      // Kiểm tra tính toàn vẹn của file backup vừa tạo
      const backupDb = new Database(destDbPath, { readonly: true })
      const integrity = backupDb.pragma('integrity_check')
      backupDb.close()

      if (integrity && integrity[0] && integrity[0].integrity_check === 'ok') {
        const stats = fs.statSync(destDbPath)
        console.log(`   ✅ Sao lưu thành công: ${path.basename(destDbPath)} (${stats.size} bytes) - Integrity: OK`)
      } else {
        console.warn(`   ⚠️ Cảnh báo: File sao lưu có dấu hiệu bất thường:`, integrity)
      }
    } catch (err) {
      console.error('   ❌ Lỗi sao lưu accounts.db:', err.message)
    }
  } else {
    console.log('ℹ️ Chưa có file server/data/accounts.db để sao lưu.')
  }

  // 2. Sao lưu orders_store.json
  const ordersStorePath = path.resolve(dataDir, 'orders_store.json')
  if (fs.existsSync(ordersStorePath)) {
    console.log('\n📦 2. Sao lưu orders_store.json...')
    const destOrdersPath = path.resolve(dayDir, `orders_store_${timeStr}.json`)
    try {
      fs.copyFileSync(ordersStorePath, destOrdersPath)
      const stats = fs.statSync(destOrdersPath)
      console.log(`   ✅ Sao lưu thành công: ${path.basename(destOrdersPath)} (${stats.size} bytes)`)
    } catch (err) {
      console.error('   ❌ Lỗi sao lưu orders_store.json:', err.message)
    }
  } else {
    console.log('\nℹ️ Chưa có file server/data/orders_store.json để sao lưu.')
  }

  // 3. Sao lưu processed_tx.json
  const txStorePath = path.resolve(dataDir, 'processed_tx.json')
  if (fs.existsSync(txStorePath)) {
    console.log('\n📦 3. Sao lưu processed_tx.json...')
    const destTxPath = path.resolve(dayDir, `processed_tx_${timeStr}.json`)
    try {
      fs.copyFileSync(txStorePath, destTxPath)
      console.log(`   ✅ Sao lưu thành công: ${path.basename(destTxPath)}`)
    } catch (err) {
      console.error('   ❌ Lỗi sao lưu processed_tx.json:', err.message)
    }
  }

  // 4. Giữ lại các bản sao lưu trong 30 ngày gần nhất
  console.log('\n🧹 Đang kiểm tra và duy trì các bản sao lưu...')
  try {
    const existingDays = fs.readdirSync(targetBackupDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    existingDays.sort()
    if (existingDays.length > 30) {
      const toRemove = existingDays.slice(0, existingDays.length - 30)
      for (const dir of toRemove) {
        fs.rmSync(path.resolve(targetBackupDir, dir), { recursive: true, force: true })
        console.log(`   Đã dọn dẹp bản sao lưu cũ: ${dir}`)
      }
    }
    console.log(`   Tổng số ngày sao lưu đang lưu giữ: ${existingDays.length} ngày.`)
  } catch (err) {
    console.warn('   ⚠️ Lỗi dọn dẹp thư mục backup:', err.message)
  }

  console.log('\n=============================================================================')
  console.log('🎉 HOÀN THÀNH TIẾN TRÌNH SAO LƯU AN TOÀN!')
  console.log('📌 Khuyến nghị cho Quan: Hãy định kỳ sao chép thư mục qns-backups lên')
  console.log('   Google Drive, OneDrive, hoặc USB để phòng ngừa sự cố phần cứng!')
  console.log('=============================================================================\n')
}

performBackup().catch((err) => {
  console.error('Lỗi sao lưu:', err)
  process.exit(1)
})
