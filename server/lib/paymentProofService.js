// server/lib/paymentProofService.js
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { orderPersistence } from './orderPersistence.js'
import { getOrderFromDb } from './accountDb.js'
import {
  verifyTrackingToken,
  createSignedProofUrl,
  stripProofUrlSignature,
} from './orderTokenService.js'
import { normalizeVietnamesePhone } from './smsService.js'
import { checkRateLimit } from './cacheService.js'
import { broadcastOrderUpdate } from './orderEvents.js'
import { formatAdminOrder } from './adminOrdersHandler.js'
import { logSecurityAudit } from './auditLogger.js'
import { updateOrderStatusInSheet } from './googleSheets.js'
import { getTransporter } from './emailConfig.js'
import { isAutomatedTestEnvironment, isNodeTestRunner } from './emailRecipientGuard.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROD_UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads/payment-proofs')
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_PROOF_UPLOADS_PER_ORDER = 5
const OWNER_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000
const lastProofEmailSentAt = new Map()

function escapeHtml(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Xác định thư mục lưu ảnh chứng từ chuyển khoản (tách biệt thư mục tạm khi chạy test, hỗ trợ UPLOADS_DIR).
 */
export function resolveProofUploadsDir() {
  const isTest = isNodeTestRunner() || isAutomatedTestEnvironment()
  if (isTest) {
    const testDir = path.join(os.tmpdir(), `qns-test-uploads-${process.pid}`, 'payment-proofs')
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    return testDir
  }
  const customUploadsDir = String(process.env.UPLOADS_DIR || '').trim()
  const dir = customUploadsDir
    ? (customUploadsDir.replace(/[\\/]+$/, '').endsWith('payment-proofs')
        ? path.resolve(customUploadsDir)
        : path.resolve(customUploadsDir, 'payment-proofs'))
    : PROD_UPLOADS_DIR
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Kiểm tra magic bytes để xác thực đúng tệp ảnh JPEG, PNG hoặc WebP.
 */
export function detectImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg'
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png'
  }
  // WebP: RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp'
  }
  return null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (allowed.has(String(file.mimetype || '').toLowerCase())) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận tệp hình ảnh định dạng JPEG, PNG hoặc WebP'))
    }
  },
})

export function uploadPaymentProofMiddleware(req, res, next) {
  upload.single('proofImage')(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Ảnh chuyển khoản không được vượt quá 5MB.',
      })
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'Tệp tải lên không hợp lệ.',
    })
  })
}

function findOrderRecord(orderId) {
  const cleanId = String(orderId || '').trim()
  if (!cleanId) return null
  return orderPersistence.get(cleanId) || getOrderFromDb(cleanId) || null
}

function isOrderUploadAuthorized(order, { trackingToken, phone, customerAccount, allowPhoneFallback = true }) {
  const orderId = order.orderId || order.id
  const orderPhone = String(order.customer?.phone || order.customerPhone || '').trim()
  const cleanOrderPhone = normalizeVietnamesePhone(orderPhone)
  const cleanInputPhone = normalizeVietnamesePhone(phone || '')

  if (trackingToken && verifyTrackingToken(orderId, orderPhone, String(trackingToken))) {
    return true
  }
  const orderAccountId = order.accountId || order.customer?.accountId
  if (customerAccount?.id && orderAccountId && customerAccount.id === orderAccountId) {
    return true
  }
  if (allowPhoneFallback && cleanInputPhone && cleanOrderPhone && cleanInputPhone === cleanOrderPhone) {
    return true
  }
  return false
}

function removeReplacedProofFile(previousUrl, uploadsDir) {
  const cleanPrev = stripProofUrlSignature(previousUrl)
  if (!cleanPrev || typeof cleanPrev !== 'string') return
  if (!cleanPrev.startsWith('/uploads/payment-proofs/')) return
  const oldFileName = path.basename(cleanPrev)
  if (!oldFileName || oldFileName.includes('..')) return
  const oldFilePath = path.join(uploadsDir, oldFileName)
  try {
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath)
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function notifyOwnerProofUploaded(order, imageUrl, note) {
  const orderId = order.orderId || order.id
  if (!orderId) return
  if (isNodeTestRunner() || isAutomatedTestEnvironment()) return
  if (
    orderId.startsWith('QNS-ADV-') ||
    orderId.startsWith('TEST-') ||
    orderId.includes('-TEST-')
  ) {
    return
  }

  // G4: Không ghi URL trực tiếp của ảnh chứng từ vào Google Sheets để tránh lộ chứng từ qua trang tính chia sẻ
  const sheetNote = `[ẢNH CK KHÁCH GỬI] Đã tải ảnh chứng từ cho đơn ${orderId}${note ? ` | Ghi chú: ${note}` : ''}`
  updateOrderStatusInSheet(orderId, order.status, sheetNote).catch(() => {})

  const lastSent = lastProofEmailSentAt.get(orderId) || 0
  if (Date.now() - lastSent < OWNER_NOTIFY_COOLDOWN_MS) return
  lastProofEmailSentAt.set(orderId, Date.now())

  try {
    const ownerEmail = (process.env.OWNER_EMAIL || 'quannguyens403@gmail.com').trim()
    const transporter = getTransporter()
    const totalFormatted = Number(order.total || 0).toLocaleString('vi-VN') + 'đ'
    const customerName = escapeHtml(order.customer?.fullName || order.customerName || 'Khách hàng')
    const customerPhone = escapeHtml(order.customer?.phone || order.customerPhone || '')
    const publicBase = String(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '')
    const signedImageUrl = createSignedProofUrl(imageUrl)
    const fullImageUrl = publicBase ? `${publicBase}${signedImageUrl}` : signedImageUrl

    await transporter.sendMail({
      from: `"QuanNguyenS System" <${process.env.GMAIL_USER || ownerEmail}>`,
      to: ownerEmail,
      subject: `🧾 ẢNH CHUYỂN KHOẢN MỚI [${orderId}] — ${customerName} — ${totalFormatted}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #E8DFD5;padding:20px;background:#FAF8F5;">
          <h2 style="color:#631521;margin-top:0;">Khách hàng đã tải lên ảnh chuyển khoản</h2>
          <p><strong>Mã đơn:</strong> ${escapeHtml(orderId)}</p>
          <p><strong>Khách hàng:</strong> ${customerName}${customerPhone ? ` (${customerPhone})` : ''}</p>
          <p><strong>Tổng thanh toán:</strong> ${escapeHtml(totalFormatted)}</p>
          ${note ? `<p><strong>Ghi chú của khách:</strong> ${escapeHtml(note)}</p>` : ''}
          <p><strong>Đường dẫn ảnh (có chữ ký bảo mật):</strong> <a href="${escapeHtml(fullImageUrl)}">Xem ảnh chứng từ #${escapeHtml(orderId)}</a></p>
          <p style="font-size:12px;color:#6B5D54;margin-top:16px;">Vui lòng mở trang Quản Trị Đơn Hàng (/admin/orders) để xem ảnh và đối soát dòng tiền trước khi bấm xác nhận đã nhận tiền.</p>
        </div>
      `,
    })
  } catch (err) {
    console.warn('⚠️ Không thể gửi email thông báo ảnh CK cho chủ shop:', err?.message || err)
  }
}

export async function handleUploadPaymentProof(req, res) {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1'
    const rateCheck = await checkRateLimit(`payment_proof:${clientIp}`, 12, 300)
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rateCheck.retryAfter} giây.`,
      })
    }

    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng chọn ảnh chuyển khoản thành công để tải lên.',
      })
    }

    const ext = detectImageExtension(req.file.buffer)
    if (!ext) {
      return res.status(400).json({
        success: false,
        error: 'Tệp tải lên không phải hình ảnh hợp lệ (chỉ hỗ trợ JPEG, PNG hoặc WebP).',
      })
    }

    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng.' })
    }

    const order = findOrderRecord(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng trong hệ thống.' })
    }

    const method = order.payment?.method || order.paymentMethod || 'COD'
    if (method !== 'BANK_TRANSFER') {
      return res.status(400).json({
        success: false,
        error: 'Chỉ đơn hàng chuyển khoản VietQR mới hỗ trợ tải ảnh chứng từ.',
      })
    }

    if (order.status === 'CANCELLED' || order.payment?.status === 'EXPIRED_TIMEOUT') {
      return res.status(400).json({
        success: false,
        error: 'Đơn hàng đã hết hạn hoặc bị hủy, không thể tải ảnh chứng từ.',
      })
    }

    if (
      order.payment?.status === 'PAID' ||
      ['CONFIRMED', 'PROCESSING', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Đơn hàng đã được xác nhận thanh toán, không thể thay đổi ảnh chứng từ.',
      })
    }

    const orderRateCheck = await checkRateLimit(`payment_proof_order:${orderId}`, 6, 900)
    if (!orderRateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Đơn hàng này đã tải ảnh quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau ${orderRateCheck.retryAfter} giây.`,
      })
    }

    const currentUploadCount = Number(order.payment?.proofUploadCount || 0)
    if (currentUploadCount >= MAX_PROOF_UPLOADS_PER_ORDER) {
      return res.status(429).json({
        success: false,
        error: `Đơn hàng đã đạt giới hạn tối đa ${MAX_PROOF_UPLOADS_PER_ORDER} lần tải ảnh chứng từ. Vui lòng liên hệ Hotline/Zalo của shop nếu cần hỗ trợ.`,
      })
    }

    // G5: Nếu đơn hàng đã có ảnh chứng từ trên hệ thống, không cho phép chỉ dùng SĐT để ghi đè (bắt buộc trackingToken hoặc phiên đăng nhập chủ đơn)
    const alreadyHasProof = Boolean(order.payment?.proofImageUrl || order.paymentProof?.imageUrl)
    const authorized = isOrderUploadAuthorized(order, {
      trackingToken: req.body?.trackingToken || req.headers['x-order-token'],
      phone: req.body?.phone,
      customerAccount: req.customerAccount,
      allowPhoneFallback: !alreadyHasProof,
    })
    if (!authorized) {
      logSecurityAudit({
        action: 'PAYMENT_PROOF_UPLOAD_UNAUTHORIZED',
        status: 'BLOCKED',
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        details: { orderId, alreadyHasProof },
      })
      return res.status(401).json({
        success: false,
        error: alreadyHasProof
          ? 'Đơn hàng đã có chứng từ. Để thay đổi ảnh chứng từ, vui lòng mở đúng liên kết thanh toán của đơn hàng hoặc đăng nhập tài khoản đặt hàng.'
          : 'Không thể xác thực quyền tải ảnh cho đơn hàng này.',
      })
    }

    const cleanNote = String(req.body?.note || '').trim().slice(0, 200)
    const uploadsDir = resolveProofUploadsDir()
    const fileName = `proof_${crypto.randomBytes(16).toString('hex')}${ext}`
    const filePath = path.join(uploadsDir, fileName)
    fs.writeFileSync(filePath, req.file.buffer)

    const imageUrl = `/uploads/payment-proofs/${fileName}`
    const signedImageUrl = createSignedProofUrl(imageUrl)
    const previousUrl = order.payment?.proofImageUrl
    const nowIso = new Date().toISOString()

    if (!order.payment) order.payment = {}
    order.payment.proofImageUrl = imageUrl
    order.payment.proofUploadedAt = nowIso
    order.payment.proofUploadCount = currentUploadCount + 1
    if (cleanNote) {
      order.payment.proofNote = cleanNote
    } else {
      delete order.payment.proofNote
    }
    order.paymentProofBackup = {
      fileName,
      base64: req.file.buffer.toString('base64'),
    }
    order.updatedAt = nowIso

    orderPersistence.set(orderId, order)
    removeReplacedProofFile(previousUrl, uploadsDir)

    broadcastOrderUpdate(formatAdminOrder(order))

    logSecurityAudit({
      action: 'PAYMENT_PROOF_UPLOADED',
      status: 'SUCCESS',
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      details: { orderId, fileName, uploadCount: order.payment.proofUploadCount, hasNote: Boolean(cleanNote) },
    })

    notifyOwnerProofUploaded(order, imageUrl, cleanNote).catch(() => {})

    return res.status(200).json({
      success: true,
      message: 'Đã gửi ảnh xác nhận chuyển khoản. Chủ shop sẽ đối soát dòng tiền và xác nhận đơn cho bạn.',
      paymentProof: {
        imageUrl: signedImageUrl,
        uploadedAt: nowIso,
        note: cleanNote,
      },
    })
  } catch (err) {
    console.error('❌ Lỗi tải lên ảnh chuyển khoản:', err)
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'Đã có lỗi xảy ra khi tải ảnh chuyển khoản.'
        : (err?.message || 'Lỗi tải ảnh chuyển khoản'),
    })
  }
}

export function handleGetPaymentProof(req, res) {
  const orderId = String(req.query?.orderId || '').trim()
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng.' })
  }

  const order = findOrderRecord(orderId)
  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' })
  }

  const authorized = isOrderUploadAuthorized(order, {
    trackingToken: req.query?.token || req.headers['x-order-token'],
    phone: '',
    customerAccount: req.customerAccount,
  })
  if (!authorized) {
    return res.status(401).json({ success: false, error: 'Không có quyền truy cập chứng từ đơn hàng này.' })
  }

  return res.json({
    success: true,
    paymentProof: order.payment?.proofImageUrl
      ? {
          imageUrl: createSignedProofUrl(order.payment.proofImageUrl),
          uploadedAt: order.payment.proofUploadedAt || null,
          note: order.payment.proofNote || '',
        }
      : null,
  })
}

/**
 * Khách hàng xác nhận đã chuyển khoản & tải lên ảnh xong, bấm "Thanh toán"
 * để chuyển đơn hàng sang trạng thái chờ Admin xác nhận thủ công.
 */
export async function handleSubmitQrPayment(req, res) {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1'
    const rateCheck = await checkRateLimit(`submit_qr:${clientIp}`, 15, 300)
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${rateCheck.retryAfter} giây.`,
      })
    }

    const orderId = String(req.body?.orderId || '').trim()
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Thiếu mã đơn hàng.' })
    }

    const order = findOrderRecord(orderId)
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng trong hệ thống.' })
    }

    const method = order.payment?.method || order.paymentMethod || 'COD'
    if (method !== 'BANK_TRANSFER') {
      return res.status(400).json({
        success: false,
        error: 'Luồng chờ xác nhận này chỉ dành riêng cho đơn hàng thanh toán bằng mã QR.',
      })
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'Đơn hàng này đã bị hủy, không thể xác nhận thanh toán.',
      })
    }

    const authorized = isOrderUploadAuthorized(order, {
      trackingToken: req.body?.trackingToken || req.headers['x-order-token'],
      phone: req.body?.phone,
      customerAccount: req.customerAccount,
      allowPhoneFallback: !order.payment?.submittedAt,
    })
    if (!authorized) {
      logSecurityAudit({
        action: 'QR_PAYMENT_SUBMIT_UNAUTHORIZED',
        status: 'BLOCKED',
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        details: { orderId, alreadySubmitted: Boolean(order.payment?.submittedAt) },
      })
      return res.status(401).json({
        success: false,
        error: 'Không thể xác thực quyền xác nhận thanh toán cho đơn hàng này.',
      })
    }

    if (
      order.payment?.status === 'PAID' ||
      ['CONFIRMED', 'PROCESSING', 'PACKING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status)
    ) {
      return res.status(200).json({
        success: true,
        alreadyPaid: true,
        orderId,
        phase: 'PAID',
        paymentStatus: order.payment?.status || 'PAID',
        status: order.status || 'CONFIRMED',
      })
    }

    if (!order.payment?.proofImageUrl) {
      return res.status(400).json({
        success: false,
        code: 'PAYMENT_PROOF_REQUIRED',
        error: 'Vui lòng tải lên ảnh chuyển khoản thành công trước khi bấm Thanh toán.',
      })
    }

    const nowIso = new Date().toISOString()
    if (!order.payment) order.payment = {}
    order.payment.status = 'PENDING_ADMIN_CONFIRMATION'
    order.payment.submittedAt = order.payment.submittedAt || nowIso
    order.paymentStatus = 'PENDING_ADMIN_CONFIRMATION'
    order.status = 'AWAITING_PAYMENT'
    order.updatedAt = nowIso

    orderPersistence.set(orderId, order)
    broadcastOrderUpdate(formatAdminOrder(order))

    logSecurityAudit({
      action: 'QR_PAYMENT_SUBMITTED_FOR_ADMIN',
      status: 'SUCCESS',
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      details: {
        orderId,
        submittedAt: order.payment.submittedAt,
      },
    })

    if (
      !isNodeTestRunner() &&
      !isAutomatedTestEnvironment() &&
      !orderId.startsWith('QNS-ADV-') &&
      !orderId.startsWith('TEST-') &&
      !orderId.includes('-TEST-')
    ) {
      updateOrderStatusInSheet(
        orderId,
        'AWAITING_PAYMENT',
        `[CHỜ ADMIN DUYỆT CK] Khách đã bấm Thanh toán & đính kèm chứng từ`
      ).catch(() => {})
    }

    return res.status(200).json({
      success: true,
      message: 'Đã ghi nhận yêu cầu thanh toán QR. Đơn hàng đang chờ admin xác nhận thủ công.',
      orderId,
      phase: 'WAITING_CONFIRMATION',
      status: order.status,
      paymentStatus: 'PENDING_ADMIN_CONFIRMATION',
      submittedAt: order.payment.submittedAt,
      paymentProof: {
        imageUrl: createSignedProofUrl(order.payment.proofImageUrl),
        uploadedAt: order.payment.proofUploadedAt || null,
        note: order.payment.proofNote || '',
      },
    })
  } catch (err) {
    console.error('❌ Lỗi gửi yêu cầu xác nhận thanh toán QR:', err)
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production'
        ? 'Đã có lỗi xảy ra khi xác nhận thanh toán.'
        : (err?.message || 'Lỗi xác nhận thanh toán QR'),
    })
  }
}

