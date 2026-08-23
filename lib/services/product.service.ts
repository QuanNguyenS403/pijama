// lib/services/product.service.ts — Business logic liên quan đến sản phẩm

import prisma from '../prisma';
import redis from '../redis';

const CACHE_TTL = 300; // 5 phút (300 giây)

export interface GetProductsQuery {
  page?: number;
  limit?: number;
  featured?: boolean;
}

export const ProductService = {
  // Lấy tất cả sản phẩm active (có cache)
  async getAll({ page = 1, limit = 12, featured = false }: GetProductsQuery = {}) {
    const cacheKey = `products:all:${page}:${limit}:${featured}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (cacheErr) {
      console.warn('[Redis Cache Get Error]', cacheErr);
    }

    const where: any = {
      isActive: true,
      isArchived: false,
      ...(featured && { isFeatured: true }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: true,
          images: { orderBy: { sortOrder: 'asc' } },
          reviews: { where: { isApproved: true }, select: { rating: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Tính rating trung bình
    const enriched = products.map((p) => ({
      ...p,
      avgRating: p.reviews.length
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : 0,
      reviewCount: p.reviews.length,
    }));

    const result = {
      products: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (cacheErr) {
      console.warn('[Redis Cache Set Error]', cacheErr);
    }

    return result;
  },

  // Lấy 1 sản phẩm theo slug
  async getBySlug(slug: string) {
    const cacheKey = `product:${slug}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (cacheErr) {
      console.warn('[Redis Cache Get Error]', cacheErr);
    }

    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        variants: { orderBy: [{ colorName: 'asc' }, { size: 'asc' }] },
        images: { orderBy: { sortOrder: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) return null;

    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(product));
    } catch (cacheErr) {
      console.warn('[Redis Cache Set Error]', cacheErr);
    }

    return product;
  },

  // Xóa cache sản phẩm (gọi sau khi create / update / delete)
  async invalidateCache(slug?: string) {
    try {
      if (slug) {
        await redis.del(`product:${slug}`);
      }
      const keys = await redis.keys('products:all:*');
      if (keys.length) {
        await redis.del(...keys);
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Invalidate Error]', cacheErr);
    }
  },
};

export default ProductService;
