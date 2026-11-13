import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../data')
const getDataDir = () =>
  String(process.env.DATA_DIR || '').trim()
    ? path.resolve(String(process.env.DATA_DIR).trim())
    : DEFAULT_DATA_DIR
const getBackupDir = () =>
  process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.resolve(getDataDir(), 'backups')
const MAX_BACKUPS_RETAINED = 14

export function ensureBackupDir() {
  const backupDir = getBackupDir()
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

/**
 * Tự động tạo bản sao lưu snapshot của orders_store.json, processed_tx.json và accounts.db
 */
export async function performDatabaseBackup() {
  const dataDir = getDataDir()
  const backupDir = ensureBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = { ordersStore: false, processedTx: false, accountsDb: false, timestamp, backupDir }

  // 1. Sao lưu orders_store.json
  const ordersFile = process.env.ORDER_STORE_FILE
    ? path.resolve(process.env.ORDER_STORE_FILE)
    : path.resolve(dataDir, 'orders_store.json')
  if (fs.existsSync(ordersFile)) {
    try {
      const backupPath = path.resolve(backupDir, `orders_store_${timestamp}.json`)
      fs.copyFileSync(ordersFile, backupPath)
      results.ordersStore = true
      console.log(`💾 [BACKUP] Đã sao lưu orders_store.json -> ${path.basename(backupPath)}`)
    } catch (err) {
      console.warn('⚠️ Lỗi sao lưu orders_store.json:', err.message)
    }
  }

  // 1b. Sao lưu processed_tx.json (chống replay giao dịch ngân hàng sau khôi phục)
  const txFile = process.env.TX_STORE_FILE
    ? path.resolve(process.env.TX_STORE_FILE)
    : path.resolve(dataDir, 'processed_tx.json')
  if (fs.existsSync(txFile)) {
    try {
      const txBackupPath = path.resolve(backupDir, `processed_tx_${timestamp}.json`)
      fs.copyFileSync(txFile, txBackupPath)
      results.processedTx = true
      console.log(`💾 [BACKUP] Đã sao lưu processed_tx.json -> ${path.basename(txBackupPath)}`)
    } catch (err) {
      console.warn('⚠️ Lỗi sao lưu processed_tx.json:', err.message)
    }
  }

  // 2. Sao lưu accounts.db (SQLite native online backup)
  try {
    const { getDb } = await import('./accountDb.js')
    const db = getDb()
    if (db && typeof db.backup === 'function') {
      const backupPath = path.resolve(backupDir, `accounts_${timestamp}.db`)
      await db.backup(backupPath)
      results.accountsDb = true
      console.log(`💾 [BACKUP] Đã sao lưu accounts.db qua SQLite API -> ${path.basename(backupPath)}`)
    }
  } catch (err) {
    console.warn('⚠️ Lỗi sao lưu accounts.db:', err.message)
  }

  // 3. Dọn dẹp bản sao lưu cũ, chỉ giữ lại số lượng hợp lý
  pruneOldBackups(backupDir)

  return results
}

function pruneOldBackups(backupDir = getBackupDir()) {
  try {
    const files = fs.readdirSync(backupDir)
    const backupGroups = {
      orders: files.filter((f) => f.startsWith('orders_store_')).sort(),
      tx: files.filter((f) => f.startsWith('processed_tx_')).sort(),
      accounts: files.filter((f) => f.startsWith('accounts_')).sort(),
    }

    for (const group of Object.values(backupGroups)) {
      if (group.length > MAX_BACKUPS_RETAINED) {
        const toDelete = group.slice(0, group.length - MAX_BACKUPS_RETAINED)
        toDelete.forEach((file) => {
          try {
            fs.unlinkSync(path.join(backupDir, file))
          } catch {}
        })
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi dọn dẹp backup cũ:', err.message)
  }
}
