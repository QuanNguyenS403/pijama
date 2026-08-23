import test from 'node:test'
import assert from 'node:assert/strict'
import { validateOrderPricing } from '../server/lib/pricingValidator.js'

test('PricingValidator: Tính đúng giá đơn hàng COD dưới 500k (có phí ship 30k, không giảm giá)', () => {
  const order = {
    orderId: 'QNS-TEST-001',
    customer: { email: 'test@example.com' },
    payment: { method: 'COD' },
    items: [
      {
        productId: 'the-classic-set',
        productName: 'THE CLASSIC SET',
        unitPrice: 390000,
        quantity: 1,
        totalPrice: 390000,
      },
    ],
    subtotal: 390000,
    shippingFee: 30000,
    discount: 0,
    total: 420000,
  }

  const result = validateOrderPricing(order)
  assert.equal(result.isValid, true)
  assert.equal(result.summary.subtotal, 390000)
  assert.equal(result.summary.shippingFee, 30000)
  assert.equal(result.summary.discount, 0)
  assert.equal(result.summary.total, 420000)
})

test('PricingValidator: Tính đúng đơn hàng Bank Transfer trên 500k (Freeship + Giảm 10%)', () => {
  const order = {
    orderId: 'QNS-TEST-002',
    customer: { email: 'test@example.com' },
    payment: { method: 'BANK_TRANSFER' },
    items: [
      {
        productId: 'the-cafe-look',
        productName: 'THE CAFÉ LOOK',
        unitPrice: 550000,
        quantity: 1,
        totalPrice: 550000,
      },
    ],
    subtotal: 550000,
    shippingFee: 0,
    discount: 55000, // 10% của 550.000đ
    total: 495000,   // 550.000 - 55.000
  }

  const result = validateOrderPricing(order)
  assert.equal(result.isValid, true)
  assert.equal(result.summary.subtotal, 550000)
  assert.equal(result.summary.shippingFee, 0)
  assert.equal(result.summary.discount, 55000)
  assert.equal(result.summary.total, 495000)
})

test('PricingValidator: Từ chối đơn hàng khi client cố tình sửa giảm đơn giá (P0-1 Security)', () => {
  const tamperedOrder = {
    orderId: 'QNS-TAMPER-001',
    customer: { email: 'hacker@example.com' },
    payment: { method: 'COD' },
    items: [
      {
        productId: 'the-evening-edit', // Giá thật là 750.000đ
        productName: 'THE EVENING EDIT',
        unitPrice: 1000, // Hack giá thành 1.000đ
        quantity: 1,
        totalPrice: 1000,
      },
    ],
    subtotal: 1000,
    shippingFee: 30000,
    discount: 0,
    total: 31000,
  }

  const result = validateOrderPricing(tamperedOrder)
  assert.equal(result.isValid, false)
  assert.match(result.error, /không khớp/i)
})

test('PricingValidator: Từ chối đơn hàng khi client cố tình sửa tổng tiền thanh toán', () => {
  const tamperedOrder = {
    orderId: 'QNS-TAMPER-002',
    customer: { email: 'hacker@example.com' },
    payment: { method: 'COD' },
    items: [
      {
        productId: 'the-classic-set',
        productName: 'THE CLASSIC SET',
        unitPrice: 390000,
        quantity: 1,
        totalPrice: 390000,
      },
    ],
    subtotal: 390000,
    shippingFee: 30000,
    discount: 0,
    total: 50000, // Giá đúng là 420.000đ nhưng client gửi 50.000đ
  }

  const result = validateOrderPricing(tamperedOrder)
  assert.equal(result.isValid, false)
  assert.match(result.error, /Tổng thanh toán không hợp lệ/i)
})

test('PricingValidator: Từ chối đơn hàng với mã sản phẩm không tồn tại', () => {
  const fakeOrder = {
    orderId: 'QNS-FAKE-001',
    customer: { email: 'fake@example.com' },
    payment: { method: 'COD' },
    items: [
      {
        productId: 'fake-product-999',
        productName: 'Fake Product',
        unitPrice: 100000,
        quantity: 1,
        totalPrice: 100000,
      },
    ],
    subtotal: 100000,
    total: 130000,
  }

  const result = validateOrderPricing(fakeOrder)
  assert.equal(result.isValid, false)
  assert.match(result.error, /không tồn tại/i)
})
