// lib/services/inventoryService.ts — Quản lý tồn kho chính xác — tránh oversell

import prisma from '../prisma';

export interface InventoryItemInput {
  variantId: string;
  quantity: number;
}

export const InventoryService = {
  // Reserve stock khi đặt hàng (chưa confirm)
  async reserveStock(items: InventoryItemInput[], orderId: string, tx: any = prisma) {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedQty: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          action: 'RESERVE',
          quantity: -item.quantity,
          previousQty: 0,
          newQty: 0,
          orderId,
          note: `Reserve cho đơn ${orderId}`,
        },
      });
    }
  },

  // Xác nhận bán (trừ stock thật sự)
  async confirmSale(items: InventoryItemInput[], orderId: string, tx: any = prisma) {
    for (const item of items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (!variant) continue;

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          stockQty: { decrement: item.quantity },
          reservedQty: { decrement: item.quantity },
        },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          action: 'SALE',
          quantity: -item.quantity,
          previousQty: variant.stockQty,
          newQty: variant.stockQty - item.quantity,
          orderId,
          note: `Bán hàng - đơn ${orderId}`,
        },
      });
    }
  },

  // Giải phóng stock khi hủy đơn
  async releaseStock(items: InventoryItemInput[], orderId: string, tx: any = prisma) {
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedQty: { decrement: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          action: 'RELEASE',
          quantity: item.quantity,
          previousQty: 0,
          newQty: 0,
          orderId,
          note: `Hoàn kho - hủy đơn ${orderId}`,
        },
      });
    }
  },

  // Hoàn kho thật sự khi hủy đơn đã xác nhận (cộng lại stockQty)
  async returnStock(items: InventoryItemInput[], orderId: string, tx: any = prisma) {
    for (const item of items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
      });
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQty: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          action: 'RESTOCK',
          quantity: item.quantity,
          previousQty: variant?.stockQty || 0,
          newQty: (variant?.stockQty || 0) + item.quantity,
          orderId,
          note: `Hoàn kho - hủy đơn ${orderId}`,
        },
      });
    }
  },

  // Nhập hàng
  async restock(variantId: string, quantity: number, note?: string, adminId?: string) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new Error(`Không tìm thấy variant ID: ${variantId}`);

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQty: { increment: quantity } },
    });
    await prisma.inventoryLog.create({
      data: {
        variantId,
        action: 'RESTOCK',
        quantity: quantity,
        previousQty: variant.stockQty,
        newQty: variant.stockQty + quantity,
        note: note || `Nhập hàng bởi admin ${adminId || 'hệ thống'}`,
      },
    });
    return updated;
  },
};

export default InventoryService;
