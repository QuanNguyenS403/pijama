import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { OrderService } from '@/lib/services/orderService';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export async function GET(req: Request) {
  // Xác thực admin
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Lấy query params
  const { searchParams } = new URL(req.url);
  const params = {
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '20', 10),
    status: (searchParams.get('status') as OrderStatus) || null,
    payment: (searchParams.get('payment') as PaymentMethod) || null,
    search: searchParams.get('search') || null,
    dateFrom: searchParams.get('from') || null,
    dateTo: searchParams.get('to') || null,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
  };

  const result = await OrderService.getAdminOrders(params);
  return NextResponse.json(result);
}
