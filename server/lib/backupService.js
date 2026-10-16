import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../data')
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups')
const MAX_BACKUPS_RETAINED = 14

export function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

/**
 * Tự động tạo bản sao lưu snapshot của orders_store.json và accounts.db
 */
export async function performDatabaseBackup() {
  ensureBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = { ordersStore: false, accountsDb: false, timestamp }

  // 1. Sao lưu orders_store.json
  const ordersFile = path.resolve(DATA_DIR, 'orders_store.json')
  if (fs.existsSync(ordersFile)) {
    try {
      const backupPath = path.resolve(BACKUP_DIR, `orders_store_${timestamp}.json`)
      fs.copyFileSync(ordersFile, backupPath)
      results.ordersStore = true
      console.log(`💾 [BACKUP] Đã sao lưu orders_store.json -> ${path.basename(backupPath)}`)
    } catch (err) {
      console.warn('⚠️ Lỗi sao lưu orders_store.json:', err.message)
    }
  }

  // 2. Sao lưu accounts.db (SQLite native online backup)
  try {
    const { getDb } = await import('./accountDb.js')
    const db = getDb()
    if (db && typeof db.backup === 'function') {
      const backupPath = path.resolve(BACKUP_DIR, `accounts_${timestamp}.db`)
      await db.backup(backupPath)
      results.accountsDb = true
      console.log(`💾 [BACKUP] Đã sao lưu accounts.db qua SQLite API -> ${path.basename(backupPath)}`)
    }
  } catch (err) {
    console.warn('⚠️ Lỗi sao lưu accounts.db:', err.message)
  }

  // 3. Dọn dẹp bản sao lưu cũ, chỉ giữ lại số lượng hợp lý
  pruneOldBackups()

  return results
}

function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
    const backupGroups = {
      orders: files.filter((f) => f.startsWith('orders_store_')).sort(),
      accounts: files.filter((f) => f.startsWith('accounts_')).sort(),
    }

    for (const group of Object.values(backupGroups)) {
      if (group.length > MAX_BACKUPS_RETAINED) {
        const toDelete = group.slice(0, group.length - MAX_BACKUPS_RETAINED)
        toDelete.forEach((file) => {
          try {
            fs.unlinkSync(path.join(BACKUP_DIR, file))
          } catch {}
        })
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi dọn dẹp backup cũ:', err.message)
  }
}
