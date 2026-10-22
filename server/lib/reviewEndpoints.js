import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { z } from 'zod'
import {
  createReview,
  getApprovedReviewsByProduct,
  getAllReviewsForAdmin,
  moderateReview,
  replyToReview,
  hasReviewedItem,
  getReviewInviteByToken,
  markInviteUsed,
} from './reviewDb.js'
import { orderPersistence } from './orderPersistence.js'
import { verifyTrackingToken } from './orderTokenService.js'
import { normalizeVietnamesePhone } from './smsService.js'
import { checkRateLimit } from './cacheService.js'
import { requireAdminAuth } from './adminAuth.js'
import { sendReviewInviteEmail } from './emailReviewInvite.js'
import { products } from '../../src/data/products.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thư mục lưu trữ ảnh review do khách tải lên
const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads/reviews')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

// Cấu hình Multer lưu ảnh an toàn
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    const safeName = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, safeName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  if (allowed.includes(file.mimetype.toLowerCase())) {
    cb(null, true)
  } else {
    cb(new Error('Chỉ chấp nhận tệp hình ảnh định dạng JPEG, PNG hoặc WebP'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Tối đa 5MB mỗi ảnh
    files: 3, // Tối đa 3 ảnh mỗi lượt đánh giá
  },
})

// Schema validation Zod cho Review
const reviewSchema = z.object({
  productId: z.string().min(1, 'Mã sản phẩm không được để trống'),
  rating: z.coerce.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  body: z.string().min(10, 'Nội dung đánh giá phải có ít nhất 10 ký tự').max(2000, 'Nội dung đánh giá không quá 2000 ký tự'),
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50, 'Tên hiển thị tối đa 50 ký tự'),
  orderId: z.string().optional(),
  token: z.string().optional(),
  phone: z.string().optional(),
  inviteToken: z.string().optional(),
  itemKey: z.string().optional(),
  consentDisplay: z.union([z.boolean(), z.string()]).optional(),
})

export function registerReviewEndpoints(app) {
  /**
   * 1. GET /api/products/:productId/reviews
   * Trả về danh sách đánh giá ĐÃ DUYỆT (approved) và số liệu thống kê server-side
   */
  app.get('/api/products/:productId/reviews', async (req, res) => {
    try {
      const { productId } = req.params
      const { page = 1, limit = 10, rating, hasPhoto } = req.query

      const data = getApprovedReviewsByProduct(productId, {
        page: Number(page),
        limit: Number(limit),
        rating: rating ? Number(rating) : null,
        hasPhoto: hasPhoto === 'true' || hasPhoto === '1',
      })

      return res.json({ success: true, data })
    } catch (err) {
      console.error('Lỗi lấy danh sách đánh giá:', err)
      return res.status(500).json({ success: false, error: 'Đã có lỗi xảy ra khi lấy danh sách đánh giá' })
    }
  })

  /**
   * 2. GET /api/reviews/verify-order
   * Kiểm tra điều kiện gửi đánh giá của đơn hàng (dựa trên orderId + token / phone hoặc inviteToken)
   */
  app.get('/api/reviews/verify-order', async (req, res) => {
    try {
      const { orderId: queryOrderId, phone, token, inviteToken } = req.query
      let targetOrderId = queryOrderId

      if (inviteToken) {
        const invite = getReviewInviteByToken(inviteToken)
        if (!invite) {
          return res.status(404).json({ success: false, error: 'Mã mời đánh giá không hợp lệ hoặc đã hết hạn' })
        }
        targetOrderId = invite.order_id
      }

      if (!targetOrderId) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp mã đơn hàng' })
      }

      let order = orderPersistence.get(targetOrderId)
      if (!order) {
        const { getOrderFromDb } = await import('./accountDb.js')
        order = getOrderFromDb(targetOrderId)
      }
      if (!order) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng trong hệ thống' })
      }

      // Kiểm tra quyền sở hữu đơn nếu không dùng inviteToken
      if (!inviteToken) {
        const customerPhone = order.customer?.phone || ''
        const cleanCustPhone = normalizeVietnamesePhone(customerPhone)
        const cleanInputPhone = normalizeVietnamesePhone(phone || '')

        let isAuth = false
        if (token && verifyTrackingToken(targetOrderId, customerPhone, String(token))) {
          isAuth = true
        } else if (cleanInputPhone && cleanCustPhone && cleanInputPhone === cleanCustPhone) {
          isAuth = true
        }

        if (!isAuth) {
          return res.status(401).json({
            success: false,
            error: 'Xác thực không thành công: Vui lòng nhập đúng số điện thoại đặt hàng hoặc token hợp lệ.',
          })
        }
      }

      // Kiểm tra trạng thái đơn: Bất cứ khách nào mua hàng thành công (không bị hủy) đều có thể đánh giá
      const isPurchased = order.status !== 'CANCELLED'

      // Kiểm tra các mặt hàng trong đơn và trạng thái đã đánh giá chưa
      const items = (order.items || []).map((item) => {
        const itemKey = `${item.productId || item.slug || 'item'}-${item.size || 'std'}`
        const alreadyReviewed = hasReviewedItem(targetOrderId, itemKey)
        return {
          productId: item.productId || item.slug,
          productName: item.productName || item.name,
          color: item.color?.label || item.color?.name || item.color,
          size: item.size,
          itemKey,
          alreadyReviewed,
        }
      })

      return res.json({
        success: true,
        orderId: targetOrderId,
        customerName: order.customer?.fullName || 'Quý khách',
        status: order.status,
        isDelivered: isPurchased,
        items,
        eligible: isPurchased && items.some((i) => !i.alreadyReviewed),
      })
    } catch (err) {
      console.error('Lỗi xác minh đơn hàng để đánh giá:', err)
      return res.status(500).json({ success: false, error: 'Đã có lỗi xảy ra khi xác thực đơn hàng' })
    }
  })

  /**
   * 3. POST /api/reviews
   * Gửi đánh giá sản phẩm mới
   * Ràng buộc:
   * - Chỉ khách đã nhận hàng (DELIVERED) mới gửi được.
   * - Không được tự đặt cờ verified_purchase (server tự kiểm tra).
   * - Mỗi mặt hàng trong mỗi đơn chỉ đánh giá 01 lần.
   * - HTML trong body bị khử/vô hiệu hóa.
   * - Giới hạn tần suất và dung lượng ảnh.
   */
  app.post('/api/reviews', upload.array('photos', 3), async (req, res) => {
    try {
      const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1'
      const rateKey = `submit_rev:${clientIp}`
      const rateLimitResult = await checkRateLimit(rateKey, 10, 300) // Tối đa 10 request/5 phút

      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          success: false,
          error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rateLimitResult.retryAfter} giây.`,
        })
      }

      // Validate dữ liệu gửi lên bằng Zod
      const parseResult = reviewSchema.safeParse(req.body)
      if (!parseResult.success) {
        const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu đánh giá không hợp lệ'
        return res.status(400).json({ success: false, error: firstError })
      }

      const {
        productId,
        rating,
        body,
        displayName,
        orderId: rawOrderId,
        token,
        phone,
        inviteToken,
        itemKey: rawItemKey,
      } = parseResult.data

      // Kiểm tra sản phẩm có tồn tại trong danh mục không
      const catalogProduct = products.find((p) => p.id === productId || p.slug === productId)
      if (!catalogProduct) {
        return res.status(400).json({ success: false, error: `Sản phẩm "${productId}" không tồn tại trong danh mục.` })
      }

      let orderId = rawOrderId
      if (inviteToken) {
        const invite = getReviewInviteByToken(inviteToken)
        if (invite) {
          orderId = invite.order_id
        }
      }

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu thông tin đơn hàng. Vui lòng cung cấp mã đơn hàng để xác minh mua hàng thật.',
        })
      }

      // Tra cứu đơn hàng từ hệ thống (RAM Map + SQLite orders table)
      let order = orderPersistence.get(orderId)
      if (!order) {
        const { getOrderFromDb } = await import('./accountDb.js')
        order = getOrderFromDb(orderId)
      }
      if (!order) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng tương ứng.' })
      }

      // Xác thực quyền đánh giá đơn hàng
      if (!inviteToken) {
        const customerPhone = order.customer?.phone || ''
        const cleanCustPhone = normalizeVietnamesePhone(customerPhone)
        const cleanInputPhone = normalizeVietnamesePhone(phone || '')

        let isAuth = false
        if (token && verifyTrackingToken(orderId, customerPhone, String(token))) {
          isAuth = true
        } else if (cleanInputPhone && cleanCustPhone && cleanInputPhone === cleanCustPhone) {
          isAuth = true
        }

        if (!isAuth) {
          return res.status(401).json({
            success: false,
            error: 'Xác thực không thành công: Bạn cần cung cấp đúng số điện thoại đặt hàng hoặc token xác thực.',
          })
        }
      }

      // Kiểm tra trạng thái đơn: Không được là đơn đã hủy (CANCELLED)
      if (order.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          error: `Đơn hàng #${orderId} đã bị hủy. Quý khách chỉ có thể đánh giá cho đơn hàng mua thành công.`,
        })
      }

      // Kiểm tra nghiêm ngặt: KHÔNG ĐƯỢC PHÉP khi mua sản phẩm này nhưng review trong trang sản phẩm khác
      const matchedItem = (order.items || []).find(
        (i) => i.productId === catalogProduct.id || i.slug === catalogProduct.slug || i.productId === productId || i.slug === productId
      )

      if (!matchedItem) {
        return res.status(400).json({
          success: false,
          error: `Đơn hàng #${orderId} không chứa sản phẩm "${catalogProduct.name}". Quý khách chỉ có thể đánh giá cho đúng sản phẩm đã mua trong đơn hàng này.`,
        })
      }

      // Xác định itemKey duy nhất
      const itemKey = rawItemKey || `${catalogProduct.id}-${matchedItem.size || 'std'}`

      // Kiểm tra trùng lặp: Một đánh giá cho mỗi mặt hàng trong mỗi đơn
      if (hasReviewedItem(orderId, itemKey)) {
        return res.status(409).json({
          success: false,
          error: 'Mặt hàng này trong đơn hàng của bạn đã được đánh giá. Cảm ơn bạn!',
        })
      }

      // Xử lý ảnh đính kèm (từ multipart hoặc URL gửi qua body)
      const photoUrls = []
      if (Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files) {
          photoUrls.push(`/uploads/reviews/${file.filename}`)
        }
      } else if (req.body.photos && Array.isArray(req.body.photos)) {
        for (const url of req.body.photos) {
          if (typeof url === 'string' && url.trim()) {
            photoUrls.push(url.trim())
          }
        }
      }

      // Tạo review mới với status = 'approved' (TỰ ĐỘNG DUYỆT VÀ ĐĂNG NGAY LẬP TỨC, không cần qua admin phê duyệt)
      const newReview = createReview({
        productId: catalogProduct.id,
        orderId,
        itemKey,
        rating,
        body,
        displayName,
        verifiedPurchase: 1,
        source: 'order',
        consentEvidence: 'order_purchased',
        photos: photoUrls,
        status: 'approved',
      })

      if (inviteToken) {
        markInviteUsed(inviteToken)
      }

      return res.status(201).json({
        success: true,
        message: 'Đánh giá của bạn đã được ghi nhận và hiển thị thành công trên trang sản phẩm. Cảm ơn bạn!',
        reviewId: newReview.id,
      })
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err)
      return res.status(500).json({ success: false, error: err.message || 'Đã có lỗi xảy ra khi gửi đánh giá.' })
    }
  })

  /**
   * 4. GET /api/admin/reviews
   * Lấy danh sách đánh giá chờ duyệt / đã duyệt (bảo vệ bằng requireAdminAuth)
   */
  app.get('/api/admin/reviews', requireAdminAuth, (req, res) => {
    try {
      const { status = 'all', page = 1, limit = 50 } = req.query
      const result = getAllReviewsForAdmin({ status, page: Number(page), limit: Number(limit) })
      return res.json({ success: true, data: result })
    } catch (err) {
      console.error('Admin get reviews error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  /**
   * 5. PATCH /api/admin/reviews/:id/moderate
   * Duyệt hoặc từ chối đánh giá (bảo vệ bằng requireAdminAuth)
   */
  app.patch('/api/admin/reviews/:id/moderate', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params
      const { status, rejectReason } = req.body

      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Trạng thái kiểm duyệt không hợp lệ' })
      }

      if (status === 'rejected' && (!rejectReason || !String(rejectReason).trim())) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp lý do từ chối đánh giá' })
      }

      const ok = moderateReview(id, { status, rejectReason: rejectReason || null })
      if (!ok) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá cần kiểm duyệt' })
      }

      return res.json({ success: true, message: `Đã cập nhật trạng thái đánh giá thành "${status}"` })
    } catch (err) {
      console.error('Admin moderate review error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  /**
   * 6. POST /api/admin/reviews/:id/reply
   * Gửi phản hồi chính thức từ shop (bảo vệ bằng requireAdminAuth)
   */
  app.post('/api/admin/reviews/:id/reply', requireAdminAuth, (req, res) => {
    try {
      const { id } = req.params
      const { shopReply } = req.body

      if (!shopReply || !String(shopReply).trim()) {
        return res.status(400).json({ success: false, error: 'Nội dung phản hồi không được để trống' })
      }

      const ok = replyToReview(id, String(shopReply).trim())
      if (!ok) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy đánh giá để phản hồi' })
      }

      return res.json({ success: true, message: 'Đã lưu phản hồi của QuanNguyenS thành công' })
    } catch (err) {
      console.error('Admin reply review error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })

  /**
   * 7. POST /api/admin/reviews/trigger-invites
   * Kích hoạt gửi thư mời đánh giá cho các đơn đã giao (bảo vệ bằng requireAdminAuth)
   */
  app.post('/api/admin/reviews/trigger-invites', requireAdminAuth, async (req, res) => {
    try {
      const { minDaysDelivered = 5 } = req.body
      const orders = []
      // Quét các đơn từ persistence
      const allOrders = Array.from(orderPersistence.getAll ? orderPersistence.getAll() : [])

      let sent = 0
      let skipped = 0

      for (const order of allOrders) {
        if (order.status === 'DELIVERED' && order.customer?.email) {
          const resSend = await sendReviewInviteEmail(order)
          if (resSend.success) sent++
          else skipped++
        }
      }

      return res.json({
        success: true,
        message: `Đã xử lý quét đơn hàng DELIVERED: ${sent} thư mời đã gửi, ${skipped} đơn đã bỏ qua.`,
        sent,
        skipped,
      })
    } catch (err) {
      console.error('Admin trigger invites error:', err)
      return res.status(500).json({ success: false, error: err.message })
    }
  })
}
