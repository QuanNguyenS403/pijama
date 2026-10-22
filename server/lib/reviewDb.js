import crypto from 'crypto'
import { getDb } from './accountDb.js'

/**
 * Khởi tạo Schema bảng đánh giá sản phẩm thật (Idempotent)
 */
export function initReviewSchema(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      order_id TEXT,
      item_key TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      body TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reject_reason TEXT,
      verified_purchase INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'order' CHECK(source IN ('order', 'imported')),
      consent_evidence TEXT,
      shop_reply TEXT,
      shop_replied_at TEXT,
      created_at TEXT NOT NULL,
      moderated_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_item 
      ON product_reviews(order_id, item_key) 
      WHERE order_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_reviews_product_status 
      ON product_reviews(product_id, status);

    CREATE INDEX IF NOT EXISTS idx_reviews_status 
      ON product_reviews(status);

    CREATE INDEX IF NOT EXISTS idx_reviews_created 
      ON product_reviews(created_at);

    CREATE TABLE IF NOT EXISTS review_photos (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_photos_review 
      ON review_photos(review_id);

    CREATE TABLE IF NOT EXISTS review_invites (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      invite_count INTEGER NOT NULL DEFAULT 1,
      first_sent_at TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_review_invites_token 
      ON review_invites(token);

    CREATE INDEX IF NOT EXISTS idx_review_invites_order 
      ON review_invites(order_id);
  `)
}

/**
 * Định dạng tên khách hiển thị an toàn (bảo vệ quyền riêng tư cá nhân)
 * Ví dụ: "Nguyễn Thị Thùy Trang" -> "Thùy Trang N."
 */
export function formatDisplayName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Khách hàng'
  const trimmed = rawName.trim().replace(/\s+/g, ' ')
  const parts = trimmed.split(' ')

  if (parts.length === 1) {
    return parts[0]
  }

  // Nếu đã có dạng "Thùy Trang N." thì giữ nguyên
  if (parts[parts.length - 1].length <= 2 && parts[parts.length - 1].endsWith('.')) {
    return trimmed
  }

  // Tên cuối cùng làm tên chính, lấy chữ cái đầu của họ
  const firstName = parts[0]
  const rest = parts.slice(1).join(' ')
  return `${rest} ${firstName[0].toUpperCase()}.`
}

/**
 * Khử mã độc HTML / XSS trong nội dung đánh giá
 */
export function sanitizeReviewBody(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim()
}

/**
 * Tạo mới đánh giá sản phẩm (mặc định status = 'pending')
 */
export function createReview({
  productId,
  orderId = null,
  itemKey = null,
  rating,
  body,
  displayName,
  verifiedPurchase = 0,
  source = 'order',
  consentEvidence = null,
  photos = [],
  status = 'pending',
}, database = getDb()) {
  initReviewSchema(database)

  const reviewId = `rv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  const now = new Date().toISOString()
  const cleanDisplayName = formatDisplayName(displayName)
  const cleanBody = sanitizeReviewBody(body)

  const stmt = database.prepare(`
    INSERT INTO product_reviews (
      id, product_id, order_id, item_key, rating, body, display_name,
      status, reject_reason, verified_purchase, source, consent_evidence,
      shop_reply, shop_replied_at, created_at, moderated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, NULL, ?, ?, ?,
      NULL, NULL, ?, NULL
    )
  `)

  stmt.run(
    reviewId,
    productId,
    orderId,
    itemKey,
    Number(rating),
    cleanBody,
    cleanDisplayName,
    status,
    verifiedPurchase ? 1 : 0,
    source,
    consentEvidence,
    now
  )

  if (Array.isArray(photos) && photos.length > 0) {
    const insertPhoto = database.prepare(`
      INSERT INTO review_photos (id, review_id, photo_url, created_at)
      VALUES (?, ?, ?, ?)
    `)

    for (const url of photos) {
      if (typeof url === 'string' && url.trim()) {
        const photoId = `rp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        insertPhoto.run(photoId, reviewId, url.trim(), now)
      }
    }
  }

  return getReviewById(reviewId, database)
}

/**
 * Lấy chi tiết đánh giá theo ID
 */
export function getReviewById(id, database = getDb()) {
  initReviewSchema(database)
  const review = database.prepare('SELECT * FROM product_reviews WHERE id = ?').get(id)
  if (!review) return null

  const photos = database
    .prepare('SELECT photo_url FROM review_photos WHERE review_id = ? ORDER BY created_at ASC')
    .all(id)
    .map((p) => p.photo_url)

  return {
    ...review,
    verified_purchase: Boolean(review.verified_purchase),
    photos,
  }
}

/**
 * Kiểm tra xem một mặt hàng trong đơn đã được đánh giá chưa
 */
export function hasReviewedItem(orderId, itemKey, database = getDb()) {
  if (!orderId || !itemKey) return false
  initReviewSchema(database)
  const row = database
    .prepare('SELECT 1 FROM product_reviews WHERE order_id = ? AND item_key = ? LIMIT 1')
    .get(orderId, itemKey)
  return Boolean(row)
}

/**
 * Lấy danh sách đánh giá ĐÃ DUYỆT (approved) cho trang chi tiết sản phẩm (PDP)
 * Kèm tổng hợp thống kê tính tại server
 */
export function getApprovedReviewsByProduct(
  productId,
  { page = 1, limit = 10, rating = null, hasPhoto = false } = {},
  database = getDb()
) {
  initReviewSchema(database)

  // 1. Tính toán số liệu tổng hợp (Summary Stats) trên toàn bộ review approved của sản phẩm
  const allApproved = database
    .prepare(`
      SELECT r.id, r.rating, 
        (SELECT COUNT(1) FROM review_photos p WHERE p.review_id = r.id) AS photo_count
      FROM product_reviews r
      WHERE r.product_id = ? AND r.status = 'approved'
    `)
    .all(productId)

  const totalReviews = allApproved.length
  let sumRating = 0
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let photoCount = 0

  for (const item of allApproved) {
    sumRating += item.rating
    if (ratingDistribution[item.rating] !== undefined) {
      ratingDistribution[item.rating]++
    }
    if (item.photo_count > 0) {
      photoCount++
    }
  }

  const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0

  // 2. Xây dựng truy vấn danh sách có phân trang và bộ lọc
  let query = `
    SELECT r.* 
    FROM product_reviews r
    WHERE r.product_id = ? AND r.status = 'approved'
  `
  const params = [productId]

  if (rating) {
    query += ' AND r.rating = ?'
    params.push(Number(rating))
  }

  if (hasPhoto) {
    query += ' AND EXISTS (SELECT 1 FROM review_photos p WHERE p.review_id = r.id)'
  }

  // Đếm tổng số kết quả khớp bộ lọc
  const countQuery = `SELECT COUNT(1) as total FROM (${query})`
  const filteredTotal = database.prepare(countQuery).get(...params)?.total || 0

  // Sắp xếp: Ưu tiên review có ảnh -> đánh giá cao -> mới nhất
  query += `
    ORDER BY 
      (SELECT COUNT(1) FROM review_photos p WHERE p.review_id = r.id) DESC,
      r.rating DESC,
      r.created_at DESC
    LIMIT ? OFFSET ?
  `
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10))
  const offset = (safePage - 1) * safeLimit
  params.push(safeLimit, offset)

  const rows = database.prepare(query).all(...params)

  // Gắn danh sách ảnh cho từng review
  const reviews = rows.map((r) => {
    const photos = database
      .prepare('SELECT photo_url FROM review_photos WHERE review_id = ? ORDER BY created_at ASC')
      .all(r.id)
      .map((p) => p.photo_url)

    return {
      id: r.id,
      productId: r.product_id,
      rating: r.rating,
      body: r.body,
      displayName: r.display_name,
      verifiedPurchase: Boolean(r.verified_purchase),
      source: r.source,
      shopReply: r.shop_reply,
      shopRepliedAt: r.shop_replied_at,
      createdAt: r.created_at,
      photos,
    }
  })

  return {
    reviews,
    total: filteredTotal,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(filteredTotal / safeLimit) || 1,
    summary: {
      totalReviews,
      averageRating,
      ratingDistribution,
      photoCount,
    },
  }
}

/**
 * Lấy danh sách reviews cho Admin kiểm duyệt (hỗ trợ lọc status: all, pending, approved, rejected)
 */
export function getAllReviewsForAdmin(
  { status = 'all', page = 1, limit = 50 } = {},
  database = getDb()
) {
  initReviewSchema(database)

  // Đếm thống kê theo từng trạng thái
  const countsRow = database
    .prepare(`
      SELECT 
        COUNT(1) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM product_reviews
    `)
    .get()

  let query = 'SELECT * FROM product_reviews WHERE 1=1'
  const params = []

  if (status && status !== 'all') {
    query += ' AND status = ?'
    params.push(status)
  }

  const countQuery = `SELECT COUNT(1) as count FROM (${query})`
  const totalFiltered = database.prepare(countQuery).get(...params)?.count || 0

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50))
  const offset = (safePage - 1) * safeLimit
  params.push(safeLimit, offset)

  const rows = database.prepare(query).all(...params)

  const reviews = rows.map((r) => {
    const photos = database
      .prepare('SELECT photo_url FROM review_photos WHERE review_id = ? ORDER BY created_at ASC')
      .all(r.id)
      .map((p) => p.photo_url)

    return {
      ...r,
      verified_purchase: Boolean(r.verified_purchase),
      photos,
    }
  })

  return {
    reviews,
    total: totalFiltered,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(totalFiltered / safeLimit) || 1,
    counts: {
      total: countsRow.total || 0,
      pending: countsRow.pending || 0,
      approved: countsRow.approved || 0,
      rejected: countsRow.rejected || 0,
    },
  }
}

/**
 * Phê duyệt hoặc từ chối đánh giá (Admin)
 */
export function moderateReview(reviewId, { status, rejectReason = null }, database = getDb()) {
  initReviewSchema(database)
  const now = new Date().toISOString()
  const stmt = database.prepare(`
    UPDATE product_reviews
    SET status = ?, reject_reason = ?, moderated_at = ?
    WHERE id = ?
  `)
  const result = stmt.run(status, rejectReason, now, reviewId)
  return result.changes > 0
}

/**
 * Trả lời phản hồi của shop (Admin)
 */
export function replyToReview(reviewId, shopReply, database = getDb()) {
  initReviewSchema(database)
  const now = new Date().toISOString()
  const stmt = database.prepare(`
    UPDATE product_reviews
    SET shop_reply = ?, shop_replied_at = ?
    WHERE id = ?
  `)
  const result = stmt.run(shopReply, now, reviewId)
  return result.changes > 0
}

/**
 * Tra cứu mã mời đánh giá
 */
export function getReviewInviteByToken(token, database = getDb()) {
  if (!token) return null
  initReviewSchema(database)
  return database.prepare('SELECT * FROM review_invites WHERE token = ?').get(token) || null
}

/**
 * Ghi nhận hoặc cập nhật lượt gửi thư mời đánh giá
 */
export function recordReviewInvite({ orderId, email, token }, database = getDb()) {
  initReviewSchema(database)
  const now = new Date().toISOString()

  const existing = database.prepare('SELECT * FROM review_invites WHERE order_id = ?').get(orderId)
  if (existing) {
    database.prepare(`
      UPDATE review_invites
      SET invite_count = invite_count + 1, last_sent_at = ?, token = ?
      WHERE order_id = ?
    `).run(now, token, orderId)
    return { ...existing, invite_count: existing.invite_count + 1, last_sent_at: now, token }
  }

  const id = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  database.prepare(`
    INSERT INTO review_invites (id, order_id, email, token, invite_count, first_sent_at, last_sent_at, used_at, created_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, NULL, ?)
  `).run(id, orderId, email.toLowerCase().trim(), token, now, now, now)

  return { id, order_id: orderId, email, token, invite_count: 1, first_sent_at: now, last_sent_at: now }
}

/**
 * Đánh dấu mã mời đã được sử dụng
 */
export function markInviteUsed(token, database = getDb()) {
  if (!token) return
  initReviewSchema(database)
  const now = new Date().toISOString()
  database.prepare('UPDATE review_invites SET used_at = ? WHERE token = ?').run(now, token)
}
