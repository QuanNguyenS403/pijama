import { z } from 'zod'

const COMMON_WEAK_PASSWORDS = new Set([
  'password123',
  '12345678',
  '123456789',
  '12345678a',
  'password',
  'admin123',
  'qwertyuiop',
  '11111111',
  'quannguyen123',
  'pijama123',
])

export function isCommonWeakPassword(password) {
  if (!password || typeof password !== 'string') return false
  return COMMON_WEAK_PASSWORDS.has(password.toLowerCase().trim())
}

export const RegisterDtoSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
    .refine((val) => !isCommonWeakPassword(val), {
      message: 'Mật khẩu quá phổ biến và dễ đoán. Vui lòng chọn mật khẩu phức tạp hơn.',
    }),
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
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(72, 'Mật khẩu không vượt quá 72 ký tự'),
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

export const ResetPasswordDtoSchema = z
  .object({
    resetToken: z
      .string()
      .trim()
      .min(1, 'Mã phiên đặt lại mật khẩu không hợp lệ'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự')
      .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .refine((val) => !isCommonWeakPassword(val), {
        message: 'Mật khẩu quá phổ biến và dễ đoán. Vui lòng chọn mật khẩu phức tạp hơn.',
      }),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
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
      const issues = result.error?.issues || result.error?.errors || []
      const firstError = issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ'
      return res.status(400).json({
        success: false,
        error: firstError,
        details: issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message,
        })),
      })
    }
    req.validatedBody = result.data
    next()
  }
}
