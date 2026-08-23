// prisma/seed.js — Dữ liệu khởi tạo

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Tạo sản phẩm THE CLASSIC SET
  const product1 = await prisma.product.upsert({
    where: { slug: 'the-classic-set' },
    update: {},
    create: {
      slug:           'the-classic-set',
      name:           'THE CLASSIC SET',
      subtitle:       'Pijama Phong Cách Châu Âu · Hai Mẫu',
      badge:          'MỚI RA MẮT',
      collection:     'Thu Đông 2025',
      basePrice:      390000,
      comparePrice:   490000,
      description:    'Bộ pijama lấy cảm hứng từ phong cách châu Âu...',
      isFeatured:     true,
      isActive:       true,

      variants: {
        create: [
          { colorName: 'Pink Stripe', colorHex: '#F2C4CE', colorLabel: 'Sọc Hồng', patternType: 'stripe', size: 'S', sku: 'QNS-CLASSIC-PINK-S', stockQty: 10 },
          { colorName: 'Pink Stripe', colorHex: '#F2C4CE', colorLabel: 'Sọc Hồng', patternType: 'stripe', size: 'M', sku: 'QNS-CLASSIC-PINK-M', stockQty: 8  },
          { colorName: 'Navy Plaid',  colorHex: '#1B2A4A', colorLabel: 'Caro Navy', patternType: 'plaid',  size: 'S', sku: 'QNS-CLASSIC-NAVY-S', stockQty: 8  },
          { colorName: 'Navy Plaid',  colorHex: '#1B2A4A', colorLabel: 'Caro Navy', patternType: 'plaid',  size: 'M', sku: 'QNS-CLASSIC-NAVY-M', stockQty: 10 },
        ],
      },
    },
  })

  // Tạo admin user
  await prisma.user.upsert({
    where: { email: 'ducquan16102006@gmail.com' },
    update: {},
    create: {
      email:        'ducquan16102006@gmail.com',
      fullName:     'Nguyễn Đức Quân',
      phone:        '0981753082',
      role:         'ADMIN',
      isVerified:   true,
    },
  })

  // Tạo voucher chào mừng
  await prisma.voucher.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code:           'WELCOME10',
      description:    'Giảm 10% cho đơn hàng đầu tiên',
      discountType:   'PERCENTAGE',
      discountValue:  10,
      maxDiscount:    50000,
      minOrderValue:  200000,
      usageLimit:     1000,
      isActive:       true,
    },
  })

  // Cài đặt hệ thống
  const settings = [
    { key: 'free_shipping_threshold', value: '500000', description: 'Đơn tối thiểu để miễn phí ship' },
    { key: 'default_shipping_fee',    value: '30000',  description: 'Phí ship mặc định' },
    { key: 'shop_name',               value: 'QuanNguyenS' },
    { key: 'maintenance_mode',        value: 'false' },
    { key: 'low_stock_threshold',     value: '3' },
  ]
  for (const setting of settings) {
    await prisma.setting.upsert({
      where:  { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }

  console.log('✅ Seed data created successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
