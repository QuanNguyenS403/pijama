import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { OrderService } from '@/lib/services/orderService'
import { z }           from 'zod'

// Schema validate cho từng action
const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('CONFIRM'),
    note:   z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('PROCESSING'),
  }),
  z.object({
    action:         z.literal('SHIP'),
    trackingNumber: z.string().max(100).optional(),
    note:           z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('DELIVER'),
  }),
  z.object({
    action: z.literal('CANCEL'),
    reason: z.string().min(5, 'Lý do hủy tối thiểu 5 ký tự').max(500),
  }),
  z.object({
    action: z.literal('NOTE'),
    note:   z.string().max(1000),
  }),
])

// GET /api/admin/orders/:id — chi tiết đơn
export async function GET(req, { params }) {
  const auth = await requireAdmin(req)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const resolvedParams = await params
  const id = resolvedParams?.id || params?.id

  const order = await OrderService.getOrderDetail(id)
  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 })
  }

  return NextResponse.json(order)
}

// PATCH /api/admin/orders/:id — thao tác trên đơn hàng
export async function PATCH(req, { params }) {
  const auth = await requireAdmin(req)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await req.json()

  // Validate action
  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => e.message).join(', ')
    return NextResponse.json({ error: errors }, { status: 400 })
  }

  const { action, ...rest } = parsed.data
  const resolvedParams = await params
  const orderId = resolvedParams?.id || params?.id
  const adminId = auth.user?.id || 'admin'

  try {
    let updatedOrder

    switch (action) {
      case 'CONFIRM':
        updatedOrder = await OrderService.adminConfirmOrder(orderId, adminId, rest.note)
        break

      case 'PROCESSING':
        updatedOrder = await OrderService.markAsProcessing(orderId, adminId)
        break

      case 'SHIP':
        updatedOrder = await OrderService.markAsShipped(
          orderId, adminId, rest.trackingNumber, rest.note
        )
        break

      case 'DELIVER':
        updatedOrder = await OrderService.markAsDelivered(orderId, adminId)
        break

      case 'CANCEL':
        updatedOrder = await OrderService.adminCancelOrder(orderId, adminId, rest.reason)
        break

      case 'NOTE':
        updatedOrder = await OrderService.updateAdminNote(orderId, rest.note)
        break

      default:
        return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      order:   updatedOrder,
      message: ACTION_SUCCESS_MSG[action],
    })

  } catch (error) {
    // Business logic errors (sai trạng thái, đơn không tồn tại...)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

const ACTION_SUCCESS_MSG = {
  CONFIRM:    '✅ Đơn hàng đã được xác nhận thành công',
  PROCESSING: '📦 Đơn hàng chuyển sang trạng thái đang đóng gói',
  SHIP:       '🚚 Đơn hàng đã được giao cho shipper',
  DELIVER:    '🎉 Đơn hàng đã giao thành công',
  CANCEL:     '❌ Đơn hàng đã được hủy',
  NOTE:       '📝 Ghi chú đã được cập nhật',
}
