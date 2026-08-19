import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { appendOrderToSheet, initializeSheet } from './server/lib/googleSheets.js'

async function runTestSheet() {
  console.log('🔄 Đang kiểm tra kết nối Google Sheets API...')
  console.log(`- GOOGLE_SHEET_ID: ${process.env.GOOGLE_SHEET_ID || 'Chưa cấu hình'}`)
  console.log(`- SERVICE_ACCOUNT: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Chưa cấu hình'}`)

  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.error('❌ Thiếu GOOGLE_SHEET_ID hoặc GOOGLE_SERVICE_ACCOUNT_EMAIL trong .env.local')
    return
  }

  const testOrder = {
    orderId: `QNS-TEST-${Date.now().toString().slice(-4)}`,
    orderDate: new Date().toISOString(),
    orderDateVN: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    status: 'PENDING',
    customer: {
      fullName: 'Khách Hàng Test',
      phone: '0981753082',
      email: 'ducquan16102006@gmail.com',
    },
    shipping: {
      address: 'Amber Riverside, 622 Minh Khai',
      ward: 'Vĩnh Tuy',
      district: 'Hai Bà Trưng',
      city: 'Hà Nội',
      fullAddress: 'Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội',
    },
    items: [
      {
        productName: 'THE SIGNATURE STRIPE',
        variant: 'Navy Stripe | Size L',
        color: 'Navy Stripe',
        size: 'L',
        quantity: 1,
        unitPrice: 420000,
        totalPrice: 420000,
      },
    ],
    subtotal: 420000,
    shippingFee: 0,
    discount: 42000,
    voucherCode: '',
    total: 378000,
    note: 'Đơn test tự động hóa từ test-sheet.js',
    payment: {
      method: 'BANK_TRANSFER',
      methodLabel: 'Chuyển khoản VietQR (Giảm 10%)',
      status: 'AWAITING_PAYMENT',
    },
    source: 'test-script',
  }

  try {
    console.log('📑 Đang khởi tạo header bảng tính...')
    await initializeSheet()

    console.log(`📝 Đang ghi đơn test [${testOrder.orderId}] vào Google Sheet...`)
    const result = await appendOrderToSheet(testOrder)

    console.log('🎉 Ghi Google Sheet thành công 100%!')
    console.log('👉 Vui lòng mở Google Sheet kiểm tra cả 2 tab: "Đơn Hàng" và "Chi Tiết SP"!')
  } catch (error) {
    console.error('❌ Ghi Google Sheets thất bại:', error.message)
    console.log('\n💡 Hướng dẫn sửa:')
    console.log('1. Đảm bảo đã BẬT Google Sheets API trong Google Cloud Console.')
    console.log('2. Đảm bảo đã SHARE quyền "Editor" cho email Service Account trong Google Sheet của bạn.')
    console.log('3. Đảm bảo GOOGLE_PRIVATE_KEY trong .env.local giữ nguyên định dạng "-----BEGIN RSA PRIVATE KEY-----\\n..."')
  }
}

runTestSheet()
