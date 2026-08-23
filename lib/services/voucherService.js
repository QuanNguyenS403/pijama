// lib/services/voucherService.js — Quản lý mã giảm giá

import { prisma } from '../prisma.js'

export const VoucherService = {

  async apply(code, orderValue, userId, tx = prisma) {
    const voucher = await tx.voucher.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!voucher)          throw new Error('Mã giảm giá không tồn tại')
    if (!voucher.isActive) throw new Error('Mã giảm giá đã hết hiệu lực')
    if (voucher.expiresAt && new Date() > voucher.expiresAt) {
      throw new Error('Mã giảm giá đã hết hạn')
    }
    if (voucher.startsAt && new Date() < voucher.startsAt) {
      throw new Error('Mã giảm giá chưa có hiệu lực')
    }
    if (orderValue < voucher.minOrderValue) {
      const min = voucher.minOrderValue.toLocaleString('vi-VN')
      throw new Error(`Đơn hàng tối thiểu ${min}đ để dùng mã này`)
    }
    if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
      throw new Error('Mã giảm giá đã hết lượt sử dụng')
    }

    // Tính giá trị giảm
    let discount = 0
    if (voucher.discountType === 'PERCENTAGE') {
      discount = Math.floor(orderValue * voucher.discountValue / 100)
      if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount)
    } else {
      discount = Math.min(voucher.discountValue, orderValue)
    }

    return { discount, voucherId: voucher.id }
  },

  async validate(code, orderValue) {
    try {
      const result = await this.apply(code, orderValue)
      return { valid: true, discount: result.discount }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  },
}

export default VoucherService
