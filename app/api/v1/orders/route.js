import { NextResponse }       from 'next/server'
import { OrderService }       from '@/lib/services/orderService'
import { checkoutRateLimit }  from '@/lib/middleware/rateLimit'
import { validate, CheckoutSchema } from '@/lib/middleware/validation'
import { getTokenFromRequest, verifyToken } from '@/lib/middleware/auth'

export async function POST(req) {
  try {
    // 1. Rate limiting
    const rl = await checkoutRateLimit(req)
    if (!rl.isAllowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(rl.limit),
            'X-RateLimit-Remaining': '0',
            'Retry-After':           '60',
          },
        }
      )
    }

    // 2. Parse body
    const body = await req.json()

    // 3. Validate
    const { errors, data } = validate(CheckoutSchema, body)
    if (errors) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ', errors }, { status: 400 })
    }

    // 4. Lấy userId nếu đã đăng nhập (optional)
    const token = getTokenFromRequest(req)
    const user  = token ? await verifyToken(token) : null

    // 5. Tạo đơn hàng
    const order = await OrderService.createOrder({
      ...data,
      userId: user?.id || null,
    })

    // 6. Với COD hoặc Bank Transfer → confirm ngay (chuyển reserved sang sold và gửi email/sheet)
    if (data.paymentMethod === 'COD' || data.paymentMethod === 'BANK_TRANSFER') {
      await OrderService.confirmOrder(order.id)
    }

    return NextResponse.json({
      success:     true,
      orderId:     order.id,
      orderNumber: order.orderNumber,
      total:       order.total,
    })

  } catch (error) {
    console.error('Create order error:', error)

    // Lỗi business logic (tồn kho, voucher...)
    if (error.message && !error.message.includes('Internal')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Có lỗi xảy ra. Vui lòng liên hệ 0981753082' },
      { status: 500 }
    )
  }
}
