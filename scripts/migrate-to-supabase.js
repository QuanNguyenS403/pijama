import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { isSupabaseConfigured, getSupabase } from '../server/lib/supabaseClient.js'
import { getDb } from '../server/lib/accountDb.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function migrateData() {
  console.log('===========================================================')
  console.log('🚀 ĐỒNG BỘ DỮ LIỆU TỪ SQLITE / DISK LÊN SUPABASE CLOUD')
  console.log('===========================================================\n')

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase chưa được cấu hình khóa thật trong .env. Vui lòng kiểm tra lại!')
    process.exit(1)
  }

  const client = getSupabase()
  const sqliteDb = getDb()

  // 1. Đồng bộ người dùng (Users)
  console.log('📦 1. Đang đồng bộ người dùng từ SQLite...')
  try {
    const localUsers = sqliteDb.prepare('SELECT * FROM users').all()
    console.log(`   Tìm thấy ${localUsers.length} tài khoản trong SQLite.`)

    if (localUsers.length > 0) {
      const { error } = await client.from('users').upsert(
        localUsers.map((u) => ({
          id: u.id,
          email: u.email,
          password_hash: u.password_hash,
          full_name: u.full_name,
          avatar_url: u.avatar_url,
          phone: u.phone,
          role: u.role || 'customer',
          status: u.status || 'active',
          verified: u.verified || 0,
          verified_at: u.verified_at,
          marketing_email_opt_in: u.marketing_email_opt_in || 0,
          created_at: u.created_at || new Date().toISOString(),
          updated_at: u.updated_at || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )

      if (error) throw error
      console.log('   ✅ Đã đẩy toàn bộ người dùng lên Supabase Cloud!')
    }
  } catch (err) {
    console.error('   ❌ Lỗi đồng bộ users:', err.message)
  }

  // 2. Đồng bộ Vouchers
  console.log('\n📦 2. Đang đồng bộ Vouchers...')
  try {
    const localVouchers = sqliteDb.prepare('SELECT * FROM vouchers').all()
    console.log(`   Tìm thấy ${localVouchers.length} vouchers trong SQLite.`)

    if (localVouchers.length > 0) {
      const { error } = await client.from('vouchers').upsert(
        localVouchers.map((v) => ({
          code: v.code,
          account_id: v.account_id,
          discount_percent: v.discount_percent || 10,
          freeship: v.freeship !== undefined ? v.freeship : 1,
          single_use: v.single_use !== undefined ? v.single_use : 1,
          used: v.used || 0,
          used_at: v.used_at,
          order_id: v.order_id,
          created_at: v.created_at || new Date().toISOString(),
        })),
        { onConflict: 'code' }
      )

      if (error) throw error
      console.log('   ✅ Đã đẩy toàn bộ vouchers lên Supabase Cloud!')
    }
  } catch (err) {
    console.error('   ❌ Lỗi đồng bộ vouchers:', err.message)
  }

  // 3. Đồng bộ Đơn hàng (Orders)
  console.log('\n📦 3. Đang đồng bộ Đơn hàng từ orders_store.json...')
  try {
    const ordersFilePath = path.resolve(__dirname, '../server/data/orders_store.json')
    if (fs.existsSync(ordersFilePath)) {
      const rawOrders = JSON.parse(fs.readFileSync(ordersFilePath, 'utf-8') || '[]')
      console.log(`   Tìm thấy ${rawOrders.length} đơn hàng trong disk.`)

      if (rawOrders.length > 0) {
        const payload = rawOrders.map((o) => ({
          id: o.orderId || o.id,
          order_id: o.orderId || o.id,
          customer_name: o.customer?.fullName || o.customerName || 'Khách hàng',
          customer_phone: o.customer?.phone || o.customerPhone || '',
          customer_email: o.customer?.email || o.customerEmail || null,
          shipping_address: typeof o.shippingAddress === 'string' ? o.shippingAddress : JSON.stringify(o.shippingAddress || {}),
          items: o.items || [],
          subtotal: o.subtotal || o.total || 0,
          discount_amount: o.discountAmount || 0,
          shipping_fee: o.shippingFee || 0,
          total: o.total || 0,
          payment_method: o.paymentMethod || 'COD',
          payment_status: o.paymentStatus || 'PENDING',
          order_status: o.status || 'PENDING',
          tracking_code: o.trackingCode || null,
          notes: o.notes || '',
          created_at: o.createdAt || new Date().toISOString(),
          updated_at: o.updatedAt || new Date().toISOString(),
        }))

        const { error } = await client.from('orders').upsert(payload, { onConflict: 'id' })
        if (error) throw error
        console.log('   ✅ Đã đẩy toàn bộ đơn hàng lên Supabase Cloud!')
      }
    } else {
      console.log('   ℹ️ Chưa có file orders_store.json cục bộ để đồng bộ.')
    }
  } catch (err) {
    console.error('   ❌ Lỗi đồng bộ orders:', err.message)
  }

  console.log('\n🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU LÊN SUPABASE CLOUD!')
}

migrateData()
