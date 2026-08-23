import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { OrderService } from '@/lib/services/orderService'

export async function GET(req) {
  // Xác thực admin
  const auth = await requireAdmin(req)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Lấy query params
  const { searchParams } = new URL(req.url)
  const params = {
    page:     parseInt(searchParams.get('page')    || '1'),
    limit:    parseInt(searchParams.get('limit')   || '20'),
    status:   searchParams.get('status')  || null,
    payment:  searchParams.get('payment') || null,
    search:   searchParams.get('search')  || null,
    dateFrom: searchParams.get('from')    || null,
    dateTo:   searchParams.get('to')      || null,
    sortBy:   searchParams.get('sortBy')  || 'createdAt',
    sortDir:  searchParams.get('sortDir') || 'desc',
  }

  const result = await OrderService.getAdminOrders(params)
  return NextResponse.json(result)
}
