import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { isSupabaseConfigured, getSupabase } from '../server/lib/supabaseClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
  console.log('===========================================================')
  console.log('⚡ KIỂM TRA KẾT NỐI SUPABASE CLOUD DATABASE (QuanNguyenS)')
  console.log('===========================================================\n')

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  console.log(`📍 SUPABASE_URL: ${url ? (url.includes('[project]') ? '⚠️ Đang là placeholder [project]' : url) : '❌ Chưa cấu hình'}`)
  console.log(`🔑 SERVICE_ROLE_KEY: ${serviceKey ? (serviceKey.includes('eyJ...') ? '⚠️ Đang là placeholder eyJ...' : '✅ Đã nhập key (' + serviceKey.slice(0, 12) + '...)') : '❌ Chưa cấu hình'}`)
  console.log(`🔑 ANON_KEY: ${anonKey ? (anonKey.includes('eyJ...') ? '⚠️ Đang là placeholder eyJ...' : '✅ Đã nhập key (' + anonKey.slice(0, 12) + '...)') : '❌ Chưa cấu hình'}\n`)

  if (!isSupabaseConfigured()) {
    console.log('❌ Supabase chưa được cấu hình khóa thật trong file .env!')
    console.log('👉 Vui lòng tạo project trên https://supabase.com và copy Project URL + Service Role Key vào .env')
    process.exitCode = 1
    return
  }

  const client = getSupabase()
  console.log('⏳ Đang kiểm tra kết nối tới máy chủ Supabase Cloud...')

  try {
    // 1. Kiểm tra bảng users
    const { data: users, error: userError } = await client.from('users').select('id').limit(1)
    if (userError) {
      console.log(`❌ Lỗi truy cập bảng "users": ${userError.message}`)
      console.log('💡 Gợi ý: Hãy mở Supabase SQL Editor và chạy đoạn lệnh GRANT quyền bảng trong scripts/supabase-schema.sql')
      process.exitCode = 1
      return
    }
    console.log('✅ Bảng "users": Đã kết nối thành công!')

    // 2. Kiểm tra bảng orders
    const { data: orders, error: orderError } = await client.from('orders').select('id').limit(1)
    if (orderError) {
      console.log(`❌ Lỗi truy cập bảng "orders": ${orderError.message}`)
      process.exitCode = 1
      return
    }
    console.log('✅ Bảng "orders": Đã kết nối thành công!')

    // 3. Kiểm tra bảng vouchers
    const { data: vouchers, error: voucherError } = await client.from('vouchers').select('code').limit(1)
    if (voucherError) {
      console.log(`❌ Lỗi truy cập bảng "vouchers": ${voucherError.message}`)
      process.exitCode = 1
      return
    }
    console.log('✅ Bảng "vouchers": Đã kết nối thành công!')

    console.log('\n🎉 KẾT NỐI SUPABASE CLOUD THÀNH CÔNG 100%! HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG TRÊN CLOUD.')
  } catch (err) {
    console.error('❌ Lỗi kết nối Supabase:', err.message)
    process.exitCode = 1
  }
}

main()
