import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../data')
const STORE_FILE = path.join(DATA_DIR, 'orders_store.json')
const TX_FILE = path.join(DATA_DIR, 'processed_tx.json')

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch (e) {
    console.warn('Cannot create data directory:', e.message)
  }
}

// In-memory maps synced with JSON
const ordersMap = new Map()
const processedTxSet = new Set()

// Load initial data from disk
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8') || '[]')
      if (Array.isArray(data)) {
        data.forEach((order) => {
          if (order && order.orderId) {
            ordersMap.set(order.orderId, order)
          }
        })
      }
      console.log(`📦 [PERSISTENCE] Đã khôi phục ${ordersMap.size} đơn hàng từ disk.`)
    }
  } catch (err) {
    console.warn('⚠️ Lỗi đọc orders_store.json:', err.message)
  }

  try {
    if (fs.existsSync(TX_FILE)) {
      const txs = JSON.parse(fs.readFileSync(TX_FILE, 'utf-8') || '[]')
      if (Array.isArray(txs)) {
        txs.forEach((tx) => processedTxSet.add(tx))
      }
    }
  } catch (err) {
    console.warn('⚠️ Lỗi đọc processed_tx.json:', err.message)
  }
}

// Flush to disk atomically
function saveToDisk() {
  const tmpFile = `${STORE_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  try {
    const ordersArray = Array.from(ordersMap.values())
    fs.writeFileSync(tmpFile, JSON.stringify(ordersArray, null, 2), 'utf-8')
    fs.renameSync(tmpFile, STORE_FILE)
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch {}
    console.error('🚨 [CRITICAL PERSISTENCE] Lỗi ghi nguyên tử orders_store.json:', err.message)
    throw err
  }
}

function saveTxToDisk() {
  const tmpFile = `${TX_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  try {
    const txArray = Array.from(processedTxSet.values())
    fs.writeFileSync(tmpFile, JSON.stringify(txArray, null, 2), 'utf-8')
    fs.renameSync(tmpFile, TX_FILE)
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch {}
    console.error('🚨 [CRITICAL PERSISTENCE] Lỗi ghi nguyên tử processed_tx.json:', err.message)
    throw err
  }
}

// Initial load
loadFromDisk()

export const orderPersistence = {
  get(orderId) {
    if (!orderId) return null
    return ordersMap.get(orderId) || null
  },

  set(orderId, order) {
    if (!orderId || !order) return
    ordersMap.set(orderId, order)
    saveToDisk()
  },

  setBatch(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return
    let changed = false
    orders.forEach((order) => {
      const id = order?.orderId || order?.id
      if (id && order) {
        ordersMap.set(id, order)
        changed = true
      }
    })
    if (changed) {
      saveToDisk()
    }
  },

  has(orderId) {
    return ordersMap.has(orderId)
  },

  delete(orderId) {
    const res = ordersMap.delete(orderId)
    if (res) saveToDisk()
    return res
  },

  getAll() {
    return Array.from(ordersMap.values())
  },

  findByQuery(query) {
    if (!query) return []
    const q = String(query).trim().toLowerCase()
    const cleanPhone = q.replace(/[^0-9]/g, '')

    return Array.from(ordersMap.values()).filter((order) => {
      const matchId = order.orderId?.toLowerCase().includes(q)
      const customerPhone = order.customer?.phone?.replace(/[^0-9]/g, '') || ''
      const matchPhone = cleanPhone && customerPhone.includes(cleanPhone)
      const matchName = order.customer?.fullName?.toLowerCase().includes(q)
      return matchId || matchPhone || matchName
    })
  },

  isTxProcessed(txId) {
    return processedTxSet.has(String(txId))
  },

  addProcessedTx(txId) {
    processedTxSet.add(String(txId))
    saveTxToDisk()
  },
}
