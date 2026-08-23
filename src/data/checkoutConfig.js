import { VIETNAM_PROVINCES } from './provinces'

export const PAYMENT_METHODS = [
  {
    value: "COD",
    label: "Thanh toán khi nhận hàng (COD)",
    icon: "🚚",
    description: "Trả tiền mặt cho nhân viên giao hàng khi nhận được sản phẩm",
  },
  {
    value: "BANK_TRANSFER",
    label: "Chuyển khoản ngân hàng (VietQR)",
    icon: "🏦",
    discountPercent: 10,
    badge: "Giảm 10% trực tiếp",
    description: "Quét mã VietQR tiện lợi — Nhận ngay ưu đãi GIẢM 10% trên tổng giá trị đơn hàng",
    bankInfo: {
      bankName: "Vietcombank (Ngân hàng TMCP Ngoại thương Việt Nam)",
      bankCode: "VCB",
      bin: "970436",
      accountNumber: "1050773506",
      accountName: "NGUYEN DUC QUAN",
      branch: "Vietcombank",
      contentPrefix: "Tên + SĐT",
      contentGuide: "Tên + SĐT của bạn",
    },
  },
  {
    value: "MOMO",
    label: "Ví điện tử MoMo / ZaloPay",
    icon: "📱",
    discountPercent: 10,
    badge: "Giảm 10% trực tiếp",
    description: "Quét mã QR MoMo / ZaloPay đa năng — Nhận ngay ưu đãi GIẢM 10% trực tiếp",
  },
]

export const PAYMENT_LABELS = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản VietQR (Giảm 10%)",
  MOMO: "Ví MoMo / ZaloPay (Giảm 10%)",
}

export const ORDER_STATUSES = {
  AWAITING_PAYMENT: { label: "Chờ thanh toán", color: "blue", step: 0 },
  PENDING: { label: "Đã xác nhận", color: "amber", step: 1 },
  CONFIRMED: { label: "Đã xác nhận", color: "amber", step: 1 },
  PACKING: { label: "Đang đóng gói", color: "indigo", step: 2 },
  SHIPPED: { label: "Đang giao hàng", color: "purple", step: 3 },
  DELIVERED: { label: "Đã giao thành công", color: "emerald", step: 4 },
  CANCELLED: { label: "Đã hủy đơn", color: "rose", step: -1 },
}

export const CARRIER_TRACKING_URLS = {
  GHN: (code) => `https://tracking.ghn.vn/?order_code=${code}`,
  GHTK: (code) => `https://i.ghtk.vn/${code}`,
  VIETTEL_POST: (code) => `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang/?order_number=${code}`,
  SPX: (code) => `https://spx.vn/track?bill_no=${code}`,
}

export const validators = {
  fullName: (v) => (!v || v.trim().length < 2 ? "Vui lòng nhập họ tên đầy đủ" : null),
  phone: (v) =>
    !v || !/^(0|\+84)[0-9]{9}$/.test(v.replace(/\s/g, ''))
      ? "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)"
      : null,
  email: (v) =>
    !v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? "Email không hợp lệ (ví dụ: name@example.com)"
      : null,
  address: (v) =>
    !v || v.trim().length < 5 ? "Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường)" : null,
  ward: (v) => (!v || v.trim().length < 1 ? "Vui lòng nhập phường/xã" : null),
  district: (v) => (!v || v.trim().length < 1 ? "Vui lòng nhập quận/huyện" : null),
  city: (v) => (!v || v === "" ? "Vui lòng chọn tỉnh/thành phố" : null),
  payment: (v) => (!v || v === "" ? "Vui lòng chọn phương thức thanh toán" : null),
}

// Helper: Tạo mã đơn hàng duy nhất dạng QNS-XXXXXX-XXXX
export const generateOrderId = () => {
  const ts = Date.now().toString().slice(-6)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `QNS-${ts}-${rand}`
}

// Helper: Format ngày giờ Việt Nam
export const formatVNDate = (date = new Date()) => {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}

// Helper: Format tiền tệ Việt Nam
export const formatVND = (amount) =>
  Number(amount || 0).toLocaleString('vi-VN') + 'đ'

// Helper: Đóng gói payload đơn hàng hoàn chỉnh
export const createOrderPayload = (formData, cartItems, cartSummary) => {
  const orderId = generateOrderId()
  const now = new Date()

  return {
    // ── ĐỊNH DANH ──────────────────────────────────────────
    orderId,
    orderDate: now.toISOString(),
    orderDateVN: formatVNDate(now),
    status: formData.paymentMethod === "COD" ? "PENDING" : "AWAITING_PAYMENT",

    // ── THÔNG TIN KHÁCH HÀNG ──────────────────────────────
    customer: {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
    },

    // ── ĐỊA CHỈ GIAO HÀNG ────────────────────────────────
    shipping: {
      address: formData.address.trim(),
      ward: formData.ward.trim(),
      district: formData.district.trim(),
      city: formData.city,
      fullAddress: `${formData.address.trim()}, ${formData.ward.trim()}, ${formData.district.trim()}, ${formData.city}`,
    },

    // ── SẢN PHẨM ──────────────────────────────────────────
    items: cartItems.map((item) => ({
      productName: item.name,
      variant: `${item.color?.name || item.color || ''} | Size ${item.size}`,
      color: item.color?.name || item.color || '',
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      image: item.image || item.imageSrc || '',
    })),

    // ── GIÁ TRỊ ───────────────────────────────────────────
    subtotal: cartSummary.subtotal,
    shippingFee: cartSummary.shippingFee || 0,
    discount: cartSummary.discount || 0,
    voucherCode: cartSummary.voucherCode || "",
    total: cartSummary.total,

    // ── THANH TOÁN ────────────────────────────────────────
    payment: {
      method: formData.paymentMethod,
      methodLabel: PAYMENT_LABELS[formData.paymentMethod] || formData.paymentMethod,
      status: formData.paymentMethod === "COD" ? "UNPAID" : "PENDING_VERIFICATION",
      paidAt: null,
    },

    // ── GHI CHÚ ──────────────────────────────────────────
    note: formData.note ? formData.note.trim() : "",

    // ── META ─────────────────────────────────────────────
    source: "website",
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'browser',
  }
}
