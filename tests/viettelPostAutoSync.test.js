// tests/viettelPostAutoSync.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { orderPersistence } from '../server/lib/orderPersistence.js'
import {
  syncSingleOrderWithViettelPost,
  syncAllShippedOrdersWithViettelPost,
  trackOrderUniversal,
} from '../server/lib/viettelPostService.js'

test('Viettel Post Auto-Sync: Chuyển tự động đơn SHIPPED sang DELIVERED khi khách nhận hàng & bảo toàn dữ liệu', async () => {
  const testOrderId = `QNS-VTTEST-${Date.now()}`
  const mockOrder = {
    orderId: testOrderId,
    id: testOrderId,
    customerName: 'Khách hàng Thử Nghiệm',
    customerPhone: '0988776655',
    shippingAddress: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    status: 'SHIPPED',
    carrier: 'Viettel Post',
    trackingCode: 'VT123456789VN',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    items: [
      {
        productName: 'Bộ Pijama Lụa Cao Cấp',
        colorLabel: 'Xanh Navy',
        size: 'L',
        quantity: 2,
        unitPrice: 450000,
        totalPrice: 900000,
      },
    ],
    subtotal: 900000,
    shippingFee: 30000,
    discount: 0,
    total: 930000,
    createdAt: new Date().toISOString(),
  }

  // Lưu đơn vào persistence
  orderPersistence.set(testOrderId, mockOrder)

  // 1. Kiểm tra đơn hàng đang SHIPPED
  const initialOrder = orderPersistence.get(testOrderId)
  assert.equal(initialOrder.status, 'SHIPPED')
  assert.equal(initialOrder.paymentStatus, 'UNPAID')

  // 2. Kích hoạt sync với Viettel Post (giả lập bưu tá phát hàng thành công)
  const syncResult = await syncSingleOrderWithViettelPost(testOrderId, { forceDeliver: true })
  assert.equal(syncResult.success, true)
  assert.equal(syncResult.delivered, true)
  assert.equal(syncResult.status, 'DELIVERED')

  // 3. Xác thực dữ liệu sau khi sync
  const updatedOrder = orderPersistence.get(testOrderId)
  assert.equal(updatedOrder.status, 'DELIVERED', 'Trạng thái đơn hàng phải là DELIVERED')
  assert.equal(updatedOrder.isDelivered, true, 'isDelivered phải là true')
  assert.equal(updatedOrder.paymentStatus, 'PAID', 'COD phải tự động chuyển sang PAID khi giao hàng thành công')
  assert.ok(updatedOrder.deliveredAt, 'Phải có timestamp deliveredAt')

  // 4. QUAN TRỌNG (Yêu cầu 3): Không tự ý xóa dữ liệu đơn hàng dù bất cứ phương thức nào
  assert.equal(updatedOrder.items.length, 1, 'Danh sách sản phẩm không bị xóa')
  assert.equal(updatedOrder.items[0].productName, 'Bộ Pijama Lụa Cao Cấp')
  assert.equal(updatedOrder.items[0].quantity, 2)
  assert.equal(updatedOrder.total, 930000, 'Tổng tiền không bị thay đổi')
  assert.equal(updatedOrder.customerName, 'Khách hàng Thử Nghiệm')
  assert.equal(updatedOrder.customerPhone, '0988776655')

  // Dọn dẹp
  orderPersistence.delete(testOrderId)
})

test('Viettel Post Batch Sync: Quét danh sách đơn hàng đang vận chuyển', async () => {
  const testOrderId2 = `QNS-VTTEST-BATCH-${Date.now()}`
  const mockOrder2 = {
    orderId: testOrderId2,
    id: testOrderId2,
    customerName: 'Khách Batch Sync',
    customerPhone: '0912345678',
    shippingAddress: '456 Cầu Giấy, Hà Nội',
    status: 'SHIPPED',
    carrier: 'Viettel Post',
    trackingCode: 'VT987654321VN',
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    items: [{ productName: 'Pijama Test', quantity: 1, unitPrice: 300000 }],
    total: 300000,
    createdAt: new Date().toISOString(),
  }

  orderPersistence.set(testOrderId2, mockOrder2)

  const batchResult = await syncAllShippedOrdersWithViettelPost()
  assert.equal(batchResult.success, true)
  assert.ok(batchResult.totalShipped >= 1, 'Phải nhận diện được ít nhất 1 đơn SHIPPED')

  // Dọn dẹp
  orderPersistence.delete(testOrderId2)
})

test('Viettel Post Strict Tracking Lookup: Chỉ cho phép tra cứu bằng chính xác mã tracking đã được cấp', async () => {
  const testOrderId3 = `QNS-VTTEST-STRICT-${Date.now()}`
  const validTrackingCode = `VT${Date.now()}VN`
  const mockOrder3 = {
    orderId: testOrderId3,
    id: testOrderId3,
    customerName: 'Khách Tra Cứu Strict',
    customerPhone: '0977112233',
    shippingAddress: '789 Phố Huế, Hà Nội',
    status: 'SHIPPED',
    carrier: 'Viettel Post',
    trackingCode: validTrackingCode,
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    items: [{ productName: 'Pijama Strict', quantity: 1, unitPrice: 500000 }],
    total: 500000,
    createdAt: new Date().toISOString(),
  }

  orderPersistence.set(testOrderId3, mockOrder3)

  // 1. Nhập mã tracking ngẫu nhiên / chưa được cấp -> từ chối
  const invalidResult = await trackOrderUniversal('VT999999999999', { strictTrackingOnly: true })
  assert.equal(invalidResult.success, false)
  assert.match(invalidResult.error, /chưa được cấp hoặc không khớp/i)

  // 2. Nhập số điện thoại trong chế độ strict -> từ chối
  const phoneResult = await trackOrderUniversal('0977112233', { strictTrackingOnly: true })
  assert.equal(phoneResult.success, false)

  // 3. Nhập mã đơn QNS trong chế độ strict -> từ chối
  const orderIdResult = await trackOrderUniversal(testOrderId3, { strictTrackingOnly: true })
  assert.equal(orderIdResult.success, false)

  // 4. Nhập chính xác mã tracking đã được cấp tại mục đơn hàng -> thành công!
  const validResult = await trackOrderUniversal(validTrackingCode, { strictTrackingOnly: true })
  assert.equal(validResult.success, true)
  assert.ok(validResult.order)
  assert.equal(validResult.order.orderId, testOrderId3)
  assert.equal(validResult.carrier, 'Viettel Post')

  // Dọn dẹp
  orderPersistence.delete(testOrderId3)
})
