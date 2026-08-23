// lib/validations/index.js — Zod schemas & request validation helpers

import { z } from 'zod';

// Checkout form
export const CheckoutSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2, 'Vui lòng nhập họ tên'),
    phone:    z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
    email:    z.string().email('Email không hợp lệ'),
  }),
  shipping: z.object({
    address:  z.string().min(5, 'Vui lòng nhập địa chỉ'),
    ward:     z.string().min(1, 'Vui lòng nhập phường/xã'),
    district: z.string().min(1, 'Vui lòng nhập quận/huyện'),
    city:     z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  }),
  items: z.array(z.object({
    variantId: z.string(),
    quantity:  z.number().int().positive('Số lượng phải lớn hơn 0'),
  })).min(1, 'Giỏ hàng trống'),
  paymentMethod: z.enum(['COD', 'VNPAY', 'MOMO', 'BANK_TRANSFER']),
  voucherCode:   z.string().optional(),
  note:          z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

// User registration
export const RegisterSchema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  phone:    z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

// User login
export const LoginSchema = z.object({
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

// Product review
export const ReviewSchema = z.object({
  productId:  z.string().min(1, 'Vui lòng chọn sản phẩm'),
  rating:     z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  title:      z.string().max(100, 'Tiêu đề tối đa 100 ký tự').optional(),
  content:    z.string().min(10, 'Đánh giá tối thiểu 10 ký tự').max(1000, 'Đánh giá tối đa 1000 ký tự'),
  colorName:  z.string().optional(),
  size:       z.string().optional(),
});

// Voucher apply
export const VoucherSchema = z.object({
  code:       z.string().min(1, 'Vui lòng nhập mã voucher').max(50).toUpperCase(),
  orderValue: z.number().positive('Giá trị đơn hàng phải lớn hơn 0'),
});

// Helper: validate và trả về lỗi chuẩn
export const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    const errors = errorList.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return { errors, data: null };
  }
  return { errors: null, data: result.data };
};
