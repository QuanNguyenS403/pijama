import { NextResponse } from 'next/server'
import { ProductService } from '@/lib/services/product'
import { apiRateLimit }   from '@/lib/middleware/rateLimit'

export async function GET(req, { params }) {
  try {
    const rl = await apiRateLimit(req)
    if (!rl.isAllowed) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu' }, { status: 429 })
    }

    const { slug } = await params
    const product = await ProductService.getBySlug(slug)

    if (!product) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy sản phẩm' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error('Get product by slug error:', error)
    return NextResponse.json({ success: false, error: 'Không thể tải chi tiết sản phẩm' }, { status: 500 })
  }
}
