import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { getSupabase } from './supabaseClient.js'
import { upsertOrderToDb, getOrderFromDb, deleteOrderFromDb, getDb } from './accountDb.js'
import { handleOrderDeliveredHook, handleOrderCancelledHook } from './loyalty/orderHook.js'
import { isAutomatedTestEnvironment, isNodeTestRunner } from './emailRecipientGuard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../data')
const isTestEnv = isNodeTestRunner() || isAutomatedTestEnvironment()

function resolveTestSafeFilePath(envVarValue, defaultProdName, defaultTestName) {
  const raw = String(envVarValue || '').trim()
  if (isTestEnv) {
    if (raw) {
      const resolved = path.resolve(raw)
      const isInsideRealDataDir = resolved === DATA_DIR || resolved.startsWith(DATA_DIR + path.sep)
      if (!isInsideRealDataDir) return resolved
    }
    return path.join(os.tmpdir(), `qns-test-${process.pid}`, defaultTestName)
  }
  return raw ? path.resolve(raw) : path.join(DATA_DIR, defaultProdName)
}

export async function syncOrderToSupabase(order, options = {}) {
  const { clientOverride = null } = options
  if (!order) return false
  if (!clientOverride && (isNodeTestRunner() || isAutomatedTestEnvironment())) return false
  try {
    const client = clientOverride || getSupabase()
    if (!client) return false
    const id = String(order.orderId || order.id || '').trim()
    if (!id) return false

    const shippingAddressStr =
      typeof order.shippingAddress === 'string' && order.shippingAddress.trim()
        ? order.shippingAddress.trim()
        : order.shipping?.fullAddress
          ? String(order.shipping.fullAddress).trim()
          : JSON.stringify(order.shipping || order.shippingAddress || {})

    const payload = {
      id,
      order_id: id,
      customer_name: String(order.customer?.fullName || order.customerName || 'Khách hàng'),
      customer_phone: String(order.customer?.phone || order.customerPhone || ''),
      customer_email: order.customer?.email || order.customerEmail || null,
      shipping_address: shippingAddressStr,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Number(order.subtotal ?? order.total ?? 0),
      discount_amount: Number(order.discount ?? order.discountAmount ?? 0),
      shipping_fee: Number(order.shippingFee ?? 0),
      total: Number(order.total ?? 0),
      payment_method: order.payment?.method || order.paymentMethod || 'COD',
      payment_status: order.payment?.status || order.paymentStatus || 'PENDING',
      order_status: order.status || 'PENDING',
      tracking_code: order.trackingCode || null,
      notes: order.note ?? order.notes ?? '',
      metadata: {
        voucherCode: order.voucherCode || null,
        deliveryOption: order.deliveryOption || 'COMBINED',
        isMixedPreOrder: Boolean(order.isMixedPreOrder),
        baseShippingFee: Number(order.baseShippingFee ?? 0),
        splitShippingFee: Number(order.splitShippingFee ?? 0),
        tierDiscountPercent: Number(order.tierDiscountPercent ?? 0),
        tierDiscountAmount: Number(order.tierDiscountAmount ?? 0),
        voucherDiscount: Number(order.voucherDiscount ?? 0),
        bankTransferDiscount: Number(order.bankTransferDiscount ?? 0),
        hasPreOrder: Boolean(order.hasPreOrder),
      },
      updated_at: new Date().toISOString(),
    }

    // Lưu ý: @supabase/supabase-js trả về PostgrestFilterBuilder (thenable, KHÔNG có .catch()),
    // nên bắt buộc dùng await bên trong try/catch thay vì chuỗi .upsert(...).catch(...)
    const result = await client.from('orders').upsert(payload, { onConflict: 'id' })
    if (result?.error) {
      console.warn(`⚠️ [SUPABASE SYNC] Lỗi đồng bộ đơn ${id}:`, result.error.message || result.error)
      return false
    }
    return true
  } catch (err) {
    console.warn('⚠️ [SUPABASE SYNC] Ngoại lệ khi chuẩn bị đồng bộ đơn:', err?.message || err)
    return false
  }
}

const STORE_FILE = resolveTestSafeFilePath(process.env.ORDER_STORE_FILE, 'orders_store.json', 'orders_store.test.json')
const TX_FILE = resolveTestSafeFilePath(process.env.TX_STORE_FILE, 'processed_tx.json', 'processed_tx.test.json')

// Ensure target directory exists (test mode luôn nằm ngoài server/data)
for (const targetDir of new Set([path.dirname(STORE_FILE), path.dirname(TX_FILE)])) {
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true })
    } catch (e) {
      console.warn('Cannot create data directory:', e.message)
    }
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
        const validOrders = []
        data.forEach((order) => {
          if (order && order.orderId) {
            ordersMap.set(order.orderId, order)
            validOrders.push(order)
          }
        })
        if (validOrders.length > 0) {
          try {
            const db = getDb()
            const syncAll = db.transaction((orders) => {
              for (const ord of orders) {
                try {
                  upsertOrderToDb(ord, db)
                } catch {}
              }
            })
            syncAll(validOrders)
          } catch {}
        }
      }
      console.log(`📦 [PERSISTENCE] Đã khôi phục ${ordersMap.size} đơn hàng từ disk và đồng bộ vào Database SQLite.`)
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
    let order = ordersMap.get(orderId)
    if (!order) {
      order = getOrderFromDb(orderId)
      if (order) {
        ordersMap.set(orderId, order)
      }
    }
    return order || null
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
    syncOrderToSupabase(order)
    upsertOrderToDb(order)

    // Loyalty Order Status Hooks (Idempotent, an toàn khi tắt cờ)
    if (order.status === 'DELIVERED') {
      try {
        handleOrderDeliveredHook(order)
      } catch (err) {
        console.error('⚠️ [LOYALTY HOOK ERROR]', err.message)
      }
    } else if (order.status === 'CANCELLED') {
      try {
        handleOrderCancelledHook(order)
      } catch (err) {
        console.error('⚠️ [LOYALTY CANCEL HOOK ERROR]', err.message)
      }
    }
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
        syncOrderToSupabase(order)
        upsertOrderToDb(order)

        if (order.status === 'DELIVERED') {
          try {
            handleOrderDeliveredHook(order)
          } catch (err) {
            console.error('⚠️ [LOYALTY BATCH HOOK ERROR]', err.message)
          }
        }
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
    try {
      deleteOrderFromDb(orderId)
    } catch {}
    if (res) saveToDisk()
    return res
  },

  getAll() {
    return Array.from(ordersMap.values()).filter((order) => {
      const isCancelled = String(order?.status || '').toUpperCase() === 'CANCELLED'
      const isExpired = String(order?.paymentStatus || '').toUpperCase() === 'EXPIRED_TIMEOUT' ||
                        String(order?.payment?.status || '').toUpperCase() === 'EXPIRED_TIMEOUT'
      return !isCancelled && !isExpired
    })
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
