// lib/services/orderService.ts — Business logic đơn hàng

import prisma from '../prisma';
import { InventoryService, InventoryItemInput } from './inventoryService';
import { VoucherService } from './voucherService';
import { NotificationService } from './notificationService';
import { logger } from '../monitoring/logger';
import { nanoid } from 'nanoid';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreateOrderInput {
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  shipping: {
    address: string;
    ward: string;
    district: string;
    city: string;
  };
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  note?: string;
  userId?: string | null;
}

export const OrderService = {
  // Tạo order number duy nhất
  generateOrderNumber(): string {
    const ts = Date.now().toString().slice(-6);
    const rand = nanoid(4).toUpperCase();
    return `QNS-${ts}-${rand}`;
  },

  // Validate và tạo đơn hàng mới (transaction đảm bảo toàn vẹn)
  async createOrder(input: CreateOrderInput) {
    const { customer, shipping, items, paymentMethod, voucherCode, note, userId } = input;

    return await prisma.$transaction(async (tx) => {
      // 1. Lấy và validate tất cả variants
      const variantIds = items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });

      if (variants.length !== items.length) {
        throw new Error('Một hoặc nhiều sản phẩm không tồn tại');
      }

      // 2. Kiểm tra tồn kho (atomic)
      for (const item of items) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) continue;

        const available = variant.stockQty - variant.reservedQty;
        if (available < item.quantity) {
          throw new Error(
            `${variant.product.name} (${variant.colorLabel} - ${variant.size}) chỉ còn ${available} sản phẩm`
          );
        }
      }

      // 3. Tính giá
      let subtotal = 0;
      const orderItems = items.map((item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        const price = variant.priceOverride ?? variant.product.basePrice;
        const total = price * item.quantity;
        subtotal += total;

        return {
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          colorName: variant.colorName,
          colorLabel: variant.colorLabel,
          size: variant.size,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice: price,
          totalPrice: total,
        };
      });

      // 4. Lấy cài đặt ship
      const freeThreshold = await tx.setting.findUnique({ where: { key: 'free_shipping_threshold' } });
      const defaultFee = await tx.setting.findUnique({ where: { key: 'default_shipping_fee' } });
      const shippingFee =
        subtotal >= parseInt(freeThreshold?.value || '500000', 10)
          ? 0
          : parseInt(defaultFee?.value || '30000', 10);

      // 5. Áp dụng voucher
      let discount = 0;
      let voucherId: string | null = null;
      if (voucherCode) {
        const voucherResult = await VoucherService.apply(voucherCode, subtotal, userId, tx);
        discount = voucherResult.discount;
        voucherId = voucherResult.voucherId;
      }

      const total = subtotal + shippingFee - discount;

      // 6. Tạo đơn hàng
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId: userId || null,
          guestEmail: userId ? null : customer.email,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          shippingAddress: {
            address: shipping.address,
            ward: shipping.ward,
            district: shipping.district,
            city: shipping.city,
            fullAddress: `${shipping.address}, ${shipping.ward}, ${shipping.district}, ${shipping.city}`,
          },
          subtotal,
          shippingFee,
          discount,
          total,
          voucherId: voucherId || null,
          voucherCode: voucherCode || null,
          paymentMethod,
          paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING_VERIFICATION',
          status: 'PENDING',
          customerNote: note || null,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // 7. Reserve tồn kho (tránh oversell)
      await InventoryService.reserveStock(items, order.id, tx);

      // 8. Cập nhật usage count voucher
      if (voucherId) {
        await tx.voucher.update({
          where: { id: voucherId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return order;
    });
  },

  // Xác nhận đơn hàng (sau transaction thành công)
  async confirmOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    // Chuyển reserved stock → sold stock
    await InventoryService.confirmSale(
      order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      orderId
    );

    // Gửi thông báo (email + sheet) — không block
    NotificationService.sendOrderConfirmation(order).catch(console.error);

    return order;
  },

  // Hủy đơn hàng
  async cancelOrder(orderId: string, reason: string, adminId?: string) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');
      if (['DELIVERED', 'REFUNDED'].includes(order.status)) {
        throw new Error('Không thể hủy đơn hàng ở trạng thái này');
      }

      // Hoàn trả tồn kho
      await InventoryService.releaseStock(
        order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        orderId,
        tx
      );

      // Cập nhật trạng thái
      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          adminNote: `Hủy bởi ${adminId || 'hệ thống'}: ${reason}`,
        },
      });
    });
  },

  // Cập nhật trạng thái đơn
  async updateStatus(orderId: string, status: OrderStatus, extra: any = {}) {
    return prisma.order.update({
      where: { id: orderId },
      data: { status, ...extra },
    });
  },

  // ════════════════════════════════════════════
  // Lấy danh sách đơn hàng cho admin
  // ════════════════════════════════════════════
  async getAdminOrders({
    page = 1,
    limit = 20,
    status = null, // filter theo status
    payment = null, // filter theo paymentMethod
    search = null, // tìm theo tên/SĐT/email/orderNumber
    dateFrom = null,
    dateTo = null,
    sortBy = 'createdAt',
    sortDir = 'desc',
  }: {
    page?: number;
    limit?: number;
    status?: OrderStatus | null;
    payment?: PaymentMethod | null;
    search?: string | null;
    dateFrom?: string | Date | null;
    dateTo?: string | Date | null;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  } = {}) {
    const where: any = {};

    // Filter trạng thái
    if (status) where.status = status;
    if (payment) where.paymentMethod = payment;

    // Filter ngày
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }

    // Tìm kiếm full-text
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { name: true, slug: true } },
              variant: { select: { colorLabel: true, size: true, sku: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  },

  // ════════════════════════════════════════════
  // Lấy chi tiết 1 đơn hàng
  // ════════════════════════════════════════════
  async getOrderDetail(orderIdOrNumber: string) {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
        ],
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, images: { take: 1 } } },
            variant: true,
          },
        },
        voucher: true,
      },
    });
    return order;
  },

  // ════════════════════════════════════════════
  // Chủ shop XÁC NHẬN đơn hàng thủ công
  // ════════════════════════════════════════════
  async adminConfirmOrder(orderId: string, adminId: string, note = '') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    // Chỉ confirm được từ PENDING
    if (order.status !== 'PENDING') {
      throw new Error(
        `Không thể xác nhận đơn ở trạng thái "${ORDER_STATUS_LABELS[order.status]}". ` +
        `Chỉ có thể xác nhận đơn đang ở trạng thái "Chờ xác nhận".`
      );
    }

    // Cập nhật trạng thái
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        adminNote: note
          ? `[${new Date().toLocaleString('vi-VN')}] Xác nhận bởi admin: ${note}`
          : undefined,
      },
      include: { items: { include: { product: true, variant: true } } },
    });

    // Confirm inventory (trừ stock thật sự)
    await InventoryService.confirmSale(
      order.items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })),
      orderId
    );

    // Gửi email thông báo khách + cập nhật Sheet
    NotificationService.sendStatusUpdate(updated, 'CONFIRMED').catch(console.error);

    logger.order('ADMIN_CONFIRMED', orderId, { adminId, note });
    return updated;
  },

  // ════════════════════════════════════════════
  // Chủ shop cập nhật trạng thái → PROCESSING
  // ════════════════════════════════════════════
  async markAsProcessing(orderId: string, adminId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'CONFIRMED') {
      throw new Error('Chỉ chuyển sang "Đang đóng gói" từ trạng thái "Đã xác nhận"');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PROCESSING' },
    });

    logger.order('MARKED_PROCESSING', orderId, { adminId });
    return updated;
  },

  // ════════════════════════════════════════════
  // Chủ shop đánh dấu ĐÃ GIAO SHIPPER + tracking
  // ════════════════════════════════════════════
  async markAsShipped(orderId: string, adminId: string, trackingNumber?: string | null, shippingNote = '') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (!['CONFIRMED', 'PROCESSING'].includes(order.status)) {
      throw new Error('Chỉ có thể giao hàng từ trạng thái "Đã xác nhận" hoặc "Đang đóng gói"');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingNumber: trackingNumber || null,
        shippedAt: new Date(),
        adminNote: shippingNote || undefined,
      },
      include: { items: { include: { product: true, variant: true } } },
    });

    // Email khách có tracking
    NotificationService.sendStatusUpdate(updated, 'SHIPPED', { trackingNumber }).catch(console.error);

    logger.order('MARKED_SHIPPED', orderId, { adminId, trackingNumber });
    return updated;
  },

  // ════════════════════════════════════════════
  // Chủ shop đánh dấu ĐÃ GIAO HÀNG thành công
  // ════════════════════════════════════════════
  async markAsDelivered(orderId: string, adminId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'SHIPPED') {
      throw new Error('Chỉ có thể xác nhận giao thành công từ trạng thái "Đang giao"');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        // Nếu COD → đánh dấu đã thu tiền
        ...(order.paymentMethod === 'COD' && {
          paymentStatus: 'PAID',
          paidAt: new Date(),
        }),
      },
    });

    // Cập nhật Sheet
    NotificationService.updateSheetStatus(order.orderNumber, 'DELIVERED').catch(console.error);

    logger.order('MARKED_DELIVERED', orderId, { adminId });
    return updated;
  },

  // ════════════════════════════════════════════
  // Chủ shop HỦY đơn hàng (override cancelOrder cũ)
  // ════════════════════════════════════════════
  async adminCancelOrder(orderId: string, adminId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Vui lòng nhập lý do hủy đơn (tối thiểu 5 ký tự)');
    }

    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { variant: true } } },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');

      // Không thể hủy đơn đã giao hoặc đã hoàn tiền
      const nonCancellable = ['DELIVERED', 'REFUNDED'];
      if (nonCancellable.includes(order.status)) {
        throw new Error(
          `Không thể hủy đơn đã ở trạng thái "${ORDER_STATUS_LABELS[order.status]}"`
        );
      }

      // Hoàn kho dựa theo trạng thái hiện tại
      if (order.status === 'PENDING') {
        // Chưa confirm → chỉ giải phóng reserved
        await InventoryService.releaseStock(
          order.items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })),
          orderId,
          tx
        );
      } else {
        // Đã confirm/processing/shipped → hoàn kho thật sự
        await InventoryService.returnStock(
          order.items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })),
          orderId,
          tx
        );
      }

      // Cập nhật trạng thái
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          adminNote: `[${new Date().toLocaleString('vi-VN')}] Hủy bởi ${adminId}: ${reason}`,
        },
        include: { items: { include: { product: true, variant: true } } },
      });

      // Gửi email thông báo hủy cho khách
      NotificationService.sendStatusUpdate(updated, 'CANCELLED', { reason }).catch(console.error);

      // Cập nhật Sheet
      NotificationService.updateSheetStatus(order.orderNumber, 'CANCELLED', reason).catch(console.error);

      logger.order('ADMIN_CANCELLED', orderId, { adminId, reason });
      return updated;
    });
  },

  // ════════════════════════════════════════════
  // Cập nhật ghi chú nội bộ
  // ════════════════════════════════════════════
  async updateAdminNote(orderId: string, note: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { adminNote: note },
    });
  },
};

// Map trạng thái → label tiếng Việt (dùng trong error messages)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang đóng gói',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

export default OrderService;
