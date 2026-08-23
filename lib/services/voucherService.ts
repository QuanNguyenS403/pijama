// lib/services/voucherService.ts — Quản lý mã giảm giá

import prisma from '../prisma';

export interface VoucherApplyResult {
  discount: number;
  voucherId: string;
}

export interface VoucherValidateResult {
  valid: boolean;
  discount?: number;
  error?: string;
}

export const VoucherService = {
  async apply(code: string, orderValue: number, userId?: string | null, tx: any = prisma): Promise<VoucherApplyResult> {
    const voucher = await tx.voucher.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!voucher) throw new Error('Mã giảm giá không tồn tại');
    if (!voucher.isActive) throw new Error('Mã giảm giá đã hết hiệu lực');
    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      throw new Error('Mã giảm giá đã hết hạn');
    }
    if (voucher.startsAt && new Date() < voucher.startsAt) {
      throw new Error('Mã giảm giá chưa có hiệu lực');
    }
    if (orderValue < voucher.minOrderValue) {
      const min = voucher.minOrderValue.toLocaleString('vi-VN');
      throw new Error(`Đơn hàng tối thiểu ${min}đ để dùng mã này`);
    }
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new Error('Mã giảm giá đã hết lượt sử dụng');
    }

    // Tính giá trị giảm
    let discount = 0;
    if (voucher.discountType === 'PERCENTAGE') {
      discount = Math.floor((orderValue * voucher.discountValue) / 100);
      if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
    } else {
      discount = Math.min(voucher.discountValue, orderValue);
    }

    return { discount, voucherId: voucher.id };
  },

  async validate(code: string, orderValue: number): Promise<VoucherValidateResult> {
    try {
      const result = await this.apply(code, orderValue);
      return { valid: true, discount: result.discount };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  },
};

export default VoucherService;
