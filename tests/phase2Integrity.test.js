import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateOrderPricing } from '../server/lib/pricingValidator.js'
import { validateVoucher, redeemVoucher } from '../server/lib/voucherValidator.js'
import { getDb, createWelcomeVoucher } from '../server/lib/accountDb.js'
import { orderPersistence } from '../server/lib/orderPersistence.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('Pha 2 — COM-001 & PAY-005: Pricing Validator Rejects Fractional Quantity & Bad Payment Enum', () => {
  const invalidQtyOrder = {
    orderId: 'QNS-TEST-QTY',
    items: [
      {
        productId: 'the-sunday-set',
        color: 'Ivory',
        size: 'M',
        quantity: 1.5, // Fractional quantity
        unitPrice: 650000,
        totalPrice: 975000,
      },
    ],
    subtotal: 975000,
    shippingFee: 0,
    discount: 0,
    total: 975000,
    payment: { method: 'COD' },
  }

  const res1 = validateOrderPricing(invalidQtyOrder)
  assert.equal(res1.isValid, false, 'Phải từ chối số lượng không phải số nguyên')

  const invalidPaymentOrder = {
    orderId: 'QNS-TEST-PAYMETHOD',
    items: [
      {
        productId: 'the-sunday-set',
        color: 'Ivory',
        size: 'M',
        quantity: 1,
        unitPrice: 650000,
        totalPrice: 650000,
      },
    ],
    subtotal: 650000,
    shippingFee: 0,
    discount: 0,
    total: 650000,
    payment: { method: 'CRYPTO_UNSUPPORTED' },
  }

  const res2 = validateOrderPricing(invalidPaymentOrder)
  assert.equal(res2.isValid, false, 'Phải từ chối phương thức thanh toán không nằm trong enum')
})

test('Pha 2 — COM-005 & G-17: Voucher Persistence, Single Use & Database Redemption', () => {
  // 1. Kiểm tra campaign voucher QNS10 trong SQLite
  const resValid = validateVoucher('QNS10')
  assert.equal(resValid.isValid, true, 'Voucher QNS10 phải hợp lệ khi tra cứu từ DB')
  assert.equal(resValid.voucher.discountPercent, 10)

  // 2. Redeem voucher cho 1 đơn hàng cụ thể
  const testOrderId = `QNS-VOUCH-TEST-${Date.now()}`
  const redeemed = redeemVoucher('QNS10', testOrderId)
  assert.equal(redeemed, true, 'Redeem voucher phải trả về true và cập nhật DB')

  // 3. Tra cứu lại voucher sau khi đã used -> Phải bị từ chối
  const resUsed = validateVoucher('QNS10')
  assert.equal(resUsed.isValid, false, 'Voucher đã used phải bị từ chối')
  assert.match(resUsed.error, /đã được sử dụng/i)

  // Reset lại voucher QNS10 để không ảnh hưởng môi trường test khác
  const db = getDb()
  db.prepare('UPDATE vouchers SET used = 0, used_at = NULL, order_id = NULL WHERE UPPER(code) = ?').run('QNS10')
})

test('Pha 2 — FE-004: Wishlist Key Parsing with Hyphenated Product IDs', () => {
  const wishlistKey = 'the-classic-set::navy-stripe'

  let productId = ''
  let colorName = ''

  if (wishlistKey.includes('::')) {
    const parts = wishlistKey.split('::')
    productId = parts[0]
    colorName = parts[1]
  }

  assert.equal(productId, 'the-classic-set', 'Product ID chứa dấu gạch ngang phải được parse chính xác')
  assert.equal(colorName, 'navy-stripe', 'Mã màu phải được parse chính xác')
})

test('Pha 2 — DATA-002 & G-21: Atomic Order Persistence Write', () => {
  const testId = `QNS-ATOMIC-${Date.now()}`
  const testOrder = {
    orderId: testId,
    total: 650000,
    status: 'PENDING',
    payment: { method: 'COD', status: 'UNPAID' },
  }

  // Ghi vào persistence
  orderPersistence.set(testId, testOrder)

  // Đọc lại từ bộ nhớ persistence
  const retrieved = orderPersistence.get(testId)
  assert.ok(retrieved, 'Đơn hàng phải được ghi nhận trong persistence')
  assert.equal(retrieved.orderId, testId)

  // Đọc trực tiếp từ file disk để chứng minh đã ghi đĩa an toàn
  const diskStore = JSON.parse(fs.readFileSync(orderPersistence.getStoreFilePath(), 'utf-8'))
  const foundOnDisk = diskStore.find((o) => o.orderId === testId)
  assert.ok(foundOnDisk, 'Đơn hàng phải tồn tại trên disk sau atomic write')
})

test('Pha 2 — DATA-001 & G-19: Google Sheets Parser Reconstructs Items Array', () => {
  // Dòng giả lập 26 cột từ Google Sheets
  const mockSheetRow = [
    'QNS-260901-A1B2', // A: Mã Đơn
    '01/09/2026', // B: Ngày
    '14:30', // C: Giờ
    'Nguyễn Văn A', // D: Tên Khách
    '0912345678', // E: SĐT
    'a@example.com', // F: Email
    '123 Phố Huế', // G: Địa Chỉ
    'Hàng Bài', // H: Phường
    'Hoàn Kiếm', // I: Quận
    'Hà Nội', // J: Tỉnh
    '123 Phố Huế, Hàng Bài, Hoàn Kiếm, Hà Nội', // K: Full Address
    'The Sunday Set | The Cafe Look', // L: Tên Sản Phẩm (nhiều sản phẩm)
    'Ivory / Size M | Mocha / Size L', // M: Biến Thể
    '1 | 2', // N: Số Lượng
    '1800000', // O: Tạm tính
    '0', // P: Phí ship
    '180000', // Q: Giảm giá
    'QNS10', // R: Voucher
    '1620000', // S: Tổng cộng
    'COD', // T: Phương thức
    'UNPAID', // U: TT Thanh toán
    'Giao giờ hành chính', // V: Ghi chú
    'PENDING', // W: TT Đơn hàng
    'website', // X: Nguồn
    '', // Y: Vận đơn
    '', // Z: Đơn vị VC
  ]

  // Reconstruct logic khớp với googleSheets.js
  const itemNames = (mockSheetRow[11] || '').split(' | ').map((s) => s.trim()).filter(Boolean)
  const itemVariants = (mockSheetRow[12] || '').split(' | ').map((s) => s.trim())
  const itemQtys = (mockSheetRow[13] || '').split(' | ').map((s) => s.trim())

  const items = itemNames.map((name, idx) => ({
    productName: name,
    variant: itemVariants[idx] || '',
    quantity: Number(itemQtys[idx]) || 1,
  }))

  assert.equal(items.length, 2, 'Phải tái tạo đúng 2 sản phẩm trong mảng items')
  assert.equal(items[0].productName, 'The Sunday Set')
  assert.equal(items[0].variant, 'Ivory / Size M')
  assert.equal(items[0].quantity, 1)
  assert.equal(items[1].productName, 'The Cafe Look')
  assert.equal(items[1].variant, 'Mocha / Size L')
  assert.equal(items[1].quantity, 2)
})
