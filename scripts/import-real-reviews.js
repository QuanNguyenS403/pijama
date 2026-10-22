/**
 * Script nhập phản hồi thật từ khách hàng (Zalo, Facebook, Tin nhắn)
 * BẮT BUỘC:
 * - Chỉ nhập khi có bằng chứng khách đồng ý cho phép hiển thị (consent_evidence).
 * - Nội dung giữ nguyên văn.
 * - Nhãn nguồn: "imported", không gắn cờ "Đã mua hàng" (verified_purchase = 0) nếu không có mã đơn hàng đối chiếu.
 *
 * Cách chạy:
 * node scripts/import-real-reviews.js [path-to-json-file]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createReview, initReviewSchema } from '../server/lib/reviewDb.js'
import { getDb } from '../server/lib/accountDb.js'
import { products } from '../src/data/products.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const filePathArg = process.argv[2] || 'data/real-reviews-import.json'
  const fullPath = path.resolve(process.cwd(), filePathArg)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Không tìm thấy tệp dữ liệu: ${fullPath}`)
    console.error(`Vui lòng tạo tệp mẫu JSON theo cấu trúc:
[
  {
    "productId": "the-classic-set",
    "rating": 5,
    "displayName": "Khánh Linh D.",
    "body": "Nội dung phản hồi nguyên văn từ khách...",
    "consentEvidence": "Tin nhắn Zalo ngày 15/10/2026 xác nhận đồng ý đăng ảnh feedback",
    "photos": ["/images/classic-set-pink-thumb-1.jpg"],
    "status": "approved"
  }
]`)
    process.exit(1)
  }

  let rawData = []
  try {
    rawData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
    if (!Array.isArray(rawData)) {
      throw new Error('Dữ liệu JSON phải là một mảng danh sách các đánh giá')
    }
  } catch (err) {
    console.error(`❌ Lỗi đọc định dạng JSON: ${err.message}`)
    process.exit(1)
  }

  console.log(`🔍 Bắt đầu kiểm tra và nhập ${rawData.length} phản hồi từ tệp ${filePathArg}...`)
  initReviewSchema(getDb())

  let successCount = 0
  let skipCount = 0

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i]

    // 1. Kiểm tra bằng chứng đồng ý của khách (BẮT BUỘC)
    if (!item.consentEvidence || typeof item.consentEvidence !== 'string' || !item.consentEvidence.trim()) {
      console.warn(`⚠️ [BỎ QUA mục ${i + 1}]: Thiếu 'consentEvidence' (Bằng chứng khách đồng ý cho phép hiển thị).`)
      skipCount++
      continue
    }

    // 2. Kiểm tra mã sản phẩm
    const validProduct = products.find((p) => p.id === item.productId || p.slug === item.productId)
    if (!validProduct) {
      console.warn(`⚠️ [BỎ QUA mục ${i + 1}]: Mã sản phẩm "${item.productId}" không tồn tại trong catalog.`)
      skipCount++
      continue
    }

    // 3. Kiểm tra số sao
    const rating = Number(item.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      console.warn(`⚠️ [BỎ QUA mục ${i + 1}]: Số sao không hợp lệ (nhận: ${item.rating}).`)
      skipCount++
      continue
    }

    // 4. Kiểm tra nội dung
    if (!item.body || typeof item.body !== 'string' || item.body.trim().length < 5) {
      console.warn(`⚠️ [BỎ QUA mục ${i + 1}]: Nội dung phản hồi quá ngắn hoặc không hợp lệ.`)
      skipCount++
      continue
    }

    try {
      const created = createReview({
        productId: validProduct.id,
        orderId: item.orderId || null,
        itemKey: item.itemKey || null,
        rating,
        body: item.body,
        displayName: item.displayName || 'Khách hàng',
        verifiedPurchase: item.orderId ? 1 : 0,
        source: 'imported',
        consentEvidence: item.consentEvidence.trim(),
        photos: Array.isArray(item.photos) ? item.photos : [],
        status: item.status === 'approved' ? 'approved' : 'pending',
      })

      console.log(`✅ [ĐÃ NHẬP ${i + 1}]: ID ${created.id} — Sản phẩm: ${validProduct.name} — Khách: ${created.display_name}`)
      successCount++
    } catch (err) {
      console.error(`❌ [LỖI mục ${i + 1}]: ${err.message}`)
      skipCount++
    }
  }

  console.log(`\n========================================`)
  console.log(`📊 TỔNG KẾT NHẬP DỮ LIỆU:`)
  console.log(`   - Thành công: ${successCount}`)
  console.log(`   - Bỏ qua do thiếu bằng chứng / lỗi: ${skipCount}`)
  console.log(`========================================`)
}

main()
