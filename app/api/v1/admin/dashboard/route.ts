import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    todayOrders,
    monthRevenue,
    pendingOrders,
    lowStockVariants,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: thisMonth }, paymentStatus: 'PAID' },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.productVariant.findMany({
      where: { stockQty: { lte: 3 }, product: { isActive: true } },
      include: { product: { select: { name: true, slug: true } } },
      take: 10,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalOrders,
      todayOrders,
      monthRevenue: monthRevenue._sum.total || 0,
      pendingOrders,
    },
    lowStockVariants,
    recentOrders,
  });
}
