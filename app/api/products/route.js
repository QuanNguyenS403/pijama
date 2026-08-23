import { NextResponse } from 'next/server'
import { ProductService } from '@/lib/services/product'
import { apiRateLimit }   from '@/lib/middleware/rateLimit'

export async function GET(req) {
  try {
    const rl = await apiRateLimit(req)
    if (!rl.isAllowed) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page') || '1', 10)
    const limit    = parseInt(searchParams.get('limit') || '12', 10)
    const featured = searchParams.get('featured') === 'true'

    const data = await ProductService.getAll({ page, limit, featured })
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ success: false, error: 'Không thể tải danh sách sản phẩm' }, { status: 500 })
  }
}
