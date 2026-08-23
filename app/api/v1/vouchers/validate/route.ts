import { NextResponse } from 'next/server';
import { VoucherService } from '@/lib/services/voucherService';
import { validate, VoucherSchema } from '@/lib/middleware/validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { errors, data } = validate(VoucherSchema, body);
    if (errors || !data) {
      return NextResponse.json({ valid: false, error: 'Dữ liệu không hợp lệ', errors }, { status: 400 });
    }

    const result = await VoucherService.validate(data.code, data.orderValue);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'Lỗi kiểm tra voucher' },
      { status: 500 }
    );
  }
}
