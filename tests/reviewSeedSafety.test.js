import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { initReviewSchema } from '../server/lib/reviewDb.js'
import { seedInitialReviews } from '../server/lib/seedReviews.js'

test('R2-1: seedInitialReviews không bao giờ xóa reviews có source = imported', () => {
  const db = new Database(':memory:')
  initReviewSchema(db)

  // Giả lập 1 review thật do script nhập (source = 'imported')
  db.prepare(`
    INSERT INTO product_reviews (
      id, product_id, order_id, item_key, rating, body, display_name,
      status, reject_reason, verified_purchase, source, consent_evidence,
      shop_reply, shop_replied_at, created_at, moderated_at
    ) VALUES (
      'rv_real_imported_01', 'the-classic-set', 'QNS-REAL-123', 'Size S', 5,
      'Đồ rất đẹp và xịn', 'Khách Thật', 'approved', NULL, 1, 'imported', 'zalo_chat_screenshot',
      NULL, NULL, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'
    )
  `).run()

  // Chạy seed lần 1
  seedInitialReviews(db)
  const realAfterSeed1 = db.prepare("SELECT * FROM product_reviews WHERE id = 'rv_real_imported_01'").get()
  assert.ok(realAfterSeed1, 'Review thật (source=imported) phải còn nguyên sau seed lần 1')

  // Chạy seed lần 2
  seedInitialReviews(db)
  const realAfterSeed2 = db.prepare("SELECT * FROM product_reviews WHERE id = 'rv_real_imported_01'").get()
  assert.ok(realAfterSeed2, 'Review thật (source=imported) phải còn nguyên sau seed lần 2')
})

test('R2-2: Review mẫu từ seed có source = sample và verified_purchase = 0 (vì không có order_id)', () => {
  const db = new Database(':memory:')
  initReviewSchema(db)
  seedInitialReviews(db)

  const sampleReviews = db.prepare("SELECT * FROM product_reviews WHERE source = 'sample'").all()
  assert.equal(sampleReviews.length, 54, 'Phải nạp đúng 54 reviews mẫu với source=sample')

  const invalidVerified = db.prepare("SELECT * FROM product_reviews WHERE source = 'sample' AND verified_purchase = 1").all()
  assert.equal(invalidVerified.length, 0, 'Tuyệt đối không có review mẫu nào được gắn cờ verified_purchase = 1 khi không có đơn hàng')
})

test('R2-3: seedInitialReviews mặc định TẮT ở production trừ khi REVIEW_SEED_ENABLED=true', () => {
  const prevEnv = process.env.NODE_ENV
  const prevSeed = process.env.REVIEW_SEED_ENABLED

  try {
    process.env.NODE_ENV = 'production'
    delete process.env.REVIEW_SEED_ENABLED

    const db = new Database(':memory:')
    initReviewSchema(db)
    seedInitialReviews(db)

    const count = db.prepare("SELECT COUNT(1) AS cnt FROM product_reviews WHERE source = 'sample'").get()?.cnt || 0
    assert.equal(count, 0, 'Ở production khi chưa bật REVIEW_SEED_ENABLED, không được tự động seed reviews')

    // Khi bật cờ REVIEW_SEED_ENABLED=true
    process.env.REVIEW_SEED_ENABLED = 'true'
    seedInitialReviews(db)
    const countEnabled = db.prepare("SELECT COUNT(1) AS cnt FROM product_reviews WHERE source = 'sample'").get()?.cnt || 0
    assert.equal(countEnabled, 54, 'Khi REVIEW_SEED_ENABLED=true, nạp đúng 54 reviews mẫu')
  } finally {
    process.env.NODE_ENV = prevEnv
    if (prevSeed !== undefined) process.env.REVIEW_SEED_ENABLED = prevSeed
    else delete process.env.REVIEW_SEED_ENABLED
  }
})

test('R2-4: Migration schema product_reviews khi foreign_keys = ON tuyệt đối không làm cascade-delete review_photos', () => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      order_id TEXT,
      item_key TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      body TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      reject_reason TEXT,
      verified_purchase INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'order' CHECK(source IN ('order', 'imported')),
      consent_evidence TEXT,
      shop_reply TEXT,
      shop_replied_at TEXT,
      created_at TEXT NOT NULL,
      moderated_at TEXT
    );
    CREATE TABLE review_photos (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
    );
    INSERT INTO product_reviews (
      id, product_id, order_id, item_key, rating, body, display_name,
      verified_purchase, source, created_at
    ) VALUES ('rv_legacy_1', 'the-classic-set', 'ORD-1', 'S', 5, 'Vải mát đẹp', 'Chị Hoa', 1, 'order', '2026-09-01T00:00:00Z');
    INSERT INTO review_photos (id, review_id, photo_url, created_at)
    VALUES ('ph_legacy_1', 'rv_legacy_1', '/uploads/reviews/test.jpg', '2026-09-01T00:00:00Z');
  `)

  initReviewSchema(db)

  assert.equal(db.pragma('foreign_keys', { simple: true }), 1, 'PRAGMA foreign_keys phải được bật lại sau migration')
  assert.equal(db.pragma('foreign_key_check').length, 0, 'Không được có vi phạm khóa ngoại sau migration')
  const legacyPhoto = db.prepare("SELECT * FROM review_photos WHERE id = 'ph_legacy_1'").get()
  const reviewRow = db.prepare("SELECT source FROM product_reviews WHERE id = 'rv_legacy_1'").get()
  assert.ok(legacyPhoto, 'review_photos cũ (ph_legacy_1) KHÔNG được bị ON DELETE CASCADE xóa mất trong lúc migrate')
  assert.equal(legacyPhoto.review_id, 'rv_legacy_1')
  assert.equal(reviewRow?.source, 'order')
})

