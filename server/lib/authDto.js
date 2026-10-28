import { z } from 'zod'

export const RegisterDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có tối thiểu 2 ký tự')
    .max(100, 'Họ và tên không vượt quá 100 ký tự'),
  phone: z.string().trim().optional().nullable(),
  marketingOptIn: z.boolean().optional().default(false),
  turnstileToken: z.string().optional().nullable(),
})

export const LoginDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  password: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu'),
  turnstileToken: z.string().optional().nullable(),
})

export const SendOtpDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  purpose: z
    .enum(['register', 'login', 'reset_password', 'verify_email'])
    .default('verify_email'),
  turnstileToken: z.string().optional().nullable(),
})

export const VerifyOtpDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã OTP phải gồm chính xác 6 chữ số'),
  purpose: z
    .enum(['register', 'login', 'reset_password', 'verify_email'])
    .default('verify_email'),
})

export const ForgotPasswordDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  turnstileToken: z.string().optional().nullable(),
})

export const ResetPasswordDtoSchema = z.object({
  resetToken: z
    .string()
    .trim()
    .min(1, 'Mã phiên đặt lại mật khẩu không hợp lệ'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số'),
  confirmPassword: z
    .string()
    .min(1, 'Vui lòng xác nhận mật khẩu mới'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới',
  path: ['confirmPassword'],
})

export const RegisterRequestOtpDtoSchema = RegisterDtoSchema

export const RegisterVerifyOtpDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã OTP phải gồm chính xác 6 chữ số'),
})

/**
 * Middleware validate body request bằng Zod Schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Dữ liệu đầu vào không hợp lệ'
      return res.status(400).json({
        success: false,
        error: firstError,
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }
    req.validatedBody = result.data
    next()
  }
}
