import test from 'node:test'
import assert from 'node:assert/strict'
import { validateOrderStock } from '../server/lib/stockValidator.js'

test('StockValidator: Chấp nhận đơn hàng với số lượng hợp lệ trong mức tồn kho', () => {
  const validOrder = {
    orderId: 'QNS-STOCK-TEST-001',
    items: [
      {
        productId: 'the-classic-set',
        productName: 'THE CLASSIC SET',
        color: { name: 'Pink Stripe' },
        size: 'S',
        quantity: 2,
      },
    ],
  }

  const result = validateOrderStock(validOrder)
  assert.equal(result.isValid, true)
})

test('StockValidator: Từ chối đơn hàng vượt quá tồn kho khả dụng', () => {
  const overStockOrder = {
    orderId: 'QNS-STOCK-TEST-002',
    items: [
      {
        productId: 'the-classic-set',
        productName: 'THE CLASSIC SET',
        color: { name: 'Pink Stripe' },
        size: 'S', // Tồn kho S là 10
        quantity: 999, // Yêu cầu 999 chiếc
      },
    ],
  }

  const result = validateOrderStock(overStockOrder)
  assert.equal(result.isValid, false)
  assert.match(result.error, /chỉ còn .* sản phẩm trong kho/i)
})
