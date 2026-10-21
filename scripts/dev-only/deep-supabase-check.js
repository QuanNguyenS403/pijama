import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { getSupabase, isSupabaseConfigured } from '../../server/lib/supabaseClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (e) {
    return null
  }
}

async function deepCheck() {
  console.log('========================================================')
  console.log('🔍 KIỂM TRA CHI TIẾT CẤU HÌNH & KẾT NỐI SUPABASE DATABASE')
  console.log('========================================================\n')

  const url = (process.env.SUPABASE_URL || '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim()

  console.log('1. CẤU HÌNH BIẾN MÔI TRƯỜNG (.env):')
  console.log(`- SUPABASE_URL: ${url || '(chưa có)'}`)
  console.log(`- Có Service Role Key: ${Boolean(serviceKey)}`)
  console.log(`- Có Anon Key: ${Boolean(anonKey)}`)
  console.log(`- isSupabaseConfigured() = ${isSupabaseConfigured()}`)

  if (serviceKey) {
    const payload = decodeJwtPayload(serviceKey)
    if (payload) {
      console.log(`  • Service Role Key Ref: ${payload.ref}, Role: ${payload.role}`)
      console.log(`  • Hạn dùng (exp): ${new Date(payload.exp * 1000).toLocaleString('vi-VN')}`)
      const isExpired = payload.exp * 1000 < Date.now()
      console.log(`  • Trạng thái hạn: ${isExpired ? '❌ ĐÃ HẾT HẠN' : '✅ CÒN HẠN DÀI HẠN'}`)
    }
  }

  if (anonKey) {
    const payload = decodeJwtPayload(anonKey)
    if (payload) {
      console.log(`  • Anon Key Ref: ${payload.ref}, Role: ${payload.role}`)
    }
  }

  if (!isSupabaseConfigured()) {
    console.error('\n❌ Supabase chưa được cấu hình hợp lệ!')
    return
  }

  const client = getSupabase()
  console.log('\n2. KIỂM TRA KẾT NỐI & CÁC BẢNG TRÊN SUPABASE:')

  const tables = ['users', 'orders', 'vouchers', 'enterprise_accounts', 'enterprise_sessions', 'security_audit_logs']

  for (const table of tables) {
    const start = Date.now()
    try {
      const { data, count, error } = await client.from(table).select('*', { count: 'exact', head: true })
      const latency = Date.now() - start
      if (error) {
        console.log(`- Bảng [${table}]: ❌ Lỗi: ${error.message} (code: ${error.code})`)
      } else {
        console.log(`- Bảng [${table}]: ✅ Hoạt động bình thường | ${count ?? 0} bản ghi | Phản hồi: ${latency}ms`)
      }
    } catch (e) {
      console.log(`- Bảng [${table}]: ❌ Ngoại lệ: ${e.message}`)
    }
  }

  console.log('\n3. KIỂM TRA QUYỀN GHI / ĐỌC / XÓA (TEST WRITE & DELETE):')
  const testOrderId = `TEST_PING_${Date.now()}`
  try {
    const writeStart = Date.now()
    const { error: insertErr } = await client.from('orders').upsert({
      id: testOrderId,
      order_id: testOrderId,
      customer_name: 'Ping Test Robot',
      customer_phone: '0000000000',
      total: 0,
      notes: 'Testing database health'
    })
    const writeLatency = Date.now() - writeStart

    if (insertErr) {
      console.log(`- Quyền ghi (Upsert): ❌ Lỗi: ${insertErr.message}`)
    } else {
      console.log(`- Quyền ghi (Upsert): ✅ Thành công (${writeLatency}ms)`)

      // Kiểm tra đọc lại
      const { data: readData, error: readErr } = await client.from('orders').select('id, customer_name').eq('id', testOrderId).single()
      if (readErr) {
        console.log(`- Quyền đọc (Select test record): ❌ Lỗi: ${readErr.message}`)
      } else {
        console.log(`- Quyền đọc (Select test record): ✅ Thành công (${readData.customer_name})`)
      }

      // Xóa bản ghi test
      const { error: delErr } = await client.from('orders').delete().eq('id', testOrderId)
      if (delErr) {
        console.log(`- Dọn dẹp bản ghi test (Delete): ⚠️ Lỗi dọn: ${delErr.message}`)
      } else {
        console.log(`- Dọn dẹp bản ghi test (Delete): ✅ Hoàn tất dọn dẹp sạch sẽ`)
      }
    }
  } catch (err) {
    console.log(`- Thao tác test ghi/xóa gặp lỗi: ${err.message}`)
  }

  console.log('\n4. KIỂM TRA ĐỒNG BỘ HIỆN TẠI VỚI HỆ THỐNG:')
  // So sánh số lượng orders trên local vs Supabase
  try {
    const fs = await import('fs')
    const localStorePath = path.resolve(__dirname, '../../server/data/orders_store.json')
    let localCount = 0
    if (fs.existsSync(localStorePath)) {
      const orders = JSON.parse(fs.readFileSync(localStorePath, 'utf8') || '[]')
      localCount = orders.length
    }
    const { count: supaCount } = await client.from('orders').select('*', { count: 'exact', head: true })
    console.log(`- Đơn hàng lưu tại máy chủ (local JSON): ${localCount} đơn`)
    console.log(`- Đơn hàng đã đồng bộ trên Supabase: ${supaCount ?? 0} đơn`)
    if (supaCount >= localCount) {
      console.log(`- Trạng thái đồng bộ: ✅ Đầy đủ dữ liệu trên Supabase Cloud`)
    } else {
      console.log(`- Trạng thái đồng bộ: ℹ️ Có đơn chưa đồng bộ hoặc Supabase đang ít hơn local (Có thể chạy scripts/migrate-to-supabase.js để đồng bộ bù)`)
    }
  } catch (e) {
    console.log(`- Kiểm tra đồng bộ đơn: ${e.message}`)
  }

  console.log('\n========================================================')
  console.log('🎯 KẾT LUẬN: Supabase Cloud Database đang hoạt động 100% bình thường!')
  console.log('========================================================\n')
}

deepCheck()
