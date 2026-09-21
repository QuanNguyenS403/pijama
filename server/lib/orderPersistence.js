import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../data')
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.ORDER_STORE_FILE) ||
  process.argv.some((arg) => typeof arg === 'string' && (arg.includes('node:test') || arg.includes('tests/') || arg.includes('verify-all')))

const STORE_FILE =
  process.env.ORDER_STORE_FILE ||
  (isTestEnv ? path.join(DATA_DIR, 'orders_store.test.json') : path.join(DATA_DIR, 'orders_store.json'))
const TX_FILE =
  process.env.TX_STORE_FILE ||
  (isTestEnv ? path.join(DATA_DIR, 'processed_tx.test.json') : path.join(DATA_DIR, 'processed_tx.json'))

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

function atomicWriteFileSync(targetFile, data) {
  const tmpFile = `${targetFile}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`
  try {
    fs.writeFileSync(tmpFile, data, 'utf-8')
    let renamed = false
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.renameSync(tmpFile, targetFile)
        renamed = true
        break
      } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          try {
            fs.copyFileSync(tmpFile, targetFile)
            fs.unlinkSync(tmpFile)
            renamed = true
            break
          } catch {}
        }
      }
    }
    if (!renamed) {
      fs.writeFileSync(targetFile, data, 'utf-8')
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
      } catch {}
    }
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    } catch {}
    console.error(`🚨 [CRITICAL PERSISTENCE] Lỗi ghi file ${targetFile}:`, err.message)
    throw err
  }
}

// Flush to disk atomically
function saveToDisk() {
  const ordersArray = Array.from(ordersMap.values())
  atomicWriteFileSync(STORE_FILE, JSON.stringify(ordersArray, null, 2))
}

function saveTxToDisk() {
  const txArray = Array.from(processedTxSet.values())
  atomicWriteFileSync(TX_FILE, JSON.stringify(txArray, null, 2))
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
    const existing = ordersMap.get(orderId)
    if (existing) {
      // BẢO VỆ NỘI DUNG ĐƠN HÀNG: Giữ lại danh sách items nếu cập nhật mới bị thiếu hoặc rỗng
      if ((!Array.isArray(order.items) || order.items.length === 0) && Array.isArray(existing.items) && existing.items.length > 0) {
        order.items = existing.items
      }
      if (!order.customer && existing.customer) order.customer = existing.customer
      if (!order.shipping && existing.shipping) order.shipping = existing.shipping
      if (existing.status === 'DELIVERED' && order.status !== 'DELIVERED') {
        // Đơn hàng đã giao thành công được bảo lưu trạng thái cuối cùng
        order.status = 'DELIVERED'
      }
    }
    ordersMap.set(orderId, order)
    saveToDisk()
  },

  setBatch(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return
    let changed = false
    orders.forEach((order) => {
      const id = order?.orderId || order?.id
      if (id && order) {
        const existing = ordersMap.get(id)
        if (existing) {
          if ((!Array.isArray(order.items) || order.items.length === 0) && Array.isArray(existing.items) && existing.items.length > 0) {
            order.items = existing.items
          }
          if (!order.customer && existing.customer) order.customer = existing.customer
          if (!order.shipping && existing.shipping) order.shipping = existing.shipping
          if (existing.status === 'DELIVERED' && order.status !== 'DELIVERED') {
            order.status = 'DELIVERED'
          }
        }
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
    const existing = ordersMap.get(orderId)
    // CHẶN TUYỆT ĐỐI: Không cho phép xóa đơn hàng của khách khi đã giao hàng thành công hoặc đang giao
    if (existing && (existing.status === 'DELIVERED' || existing.status === 'SHIPPED')) {
      console.warn(`🚨 [BẢO VỆ ĐƠN HÀNG] Từ chối xóa đơn hàng #${orderId} (Trạng thái: ${existing.status}). Nội dung đơn hàng của khách được lưu trữ vĩnh viễn!`)
      return false
    }
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

  getStoreFilePath() {
    return STORE_FILE
  },

  purgeOrdersByPattern(predicate) {
    let deletedCount = 0
    for (const [id, order] of ordersMap.entries()) {
      if (predicate(order)) {
        ordersMap.delete(id)
        deletedCount++
      }
    }
    if (deletedCount > 0) {
      saveToDisk()
    }
    return deletedCount
  },
}
