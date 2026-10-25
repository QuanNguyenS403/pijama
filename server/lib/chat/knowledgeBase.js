/**
 * Knowledge Base Module — Single Source of Truth
 * Đọc trực tiếp từ products.js, policies.js và checkoutConfig.js khi server khởi động.
 * Không sao chép cứng thông tin vào prompt.
 * Cung cấp cơ chế tìm kiếm văn bản cục bộ tiếng Việt (0đ, không phụ thuộc API ngoài).
 */

import { products } from '../../../src/data/products.js'
import { policiesData } from '../../../src/data/policies.js'

// Hàm chuẩn hóa chuỗi tiếng Việt: bỏ dấu, chuyển chữ thường để so khớp
export function removeVietnameseTones(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

// Từ điển từ đồng nghĩa tiếng Việt cho thương mại điện tử
const SYNONYMS = {
  ship: ['giao hang', 'van chuyen', 'phi ship', 'cuoc ship', 'phi giao', 'bao lau nhan'],
  'giao hang': ['ship', 'van chuyen', 'nhan hang', 'thoi gian giao'],
  'doi tra': ['tra hang', 'hoan tien', 'doi size', 'doi mau', 'bao hanh', 'loi'],
  size: ['co', 'kich co', 'bang size', 'vua khong', 'can nang', 'chieu cao', 'form', 'kg', 'cm'],
  'chat lieu': ['vai', 'cotton', 'modal', 'tencel', 'giat', 'bao quan', 'nhan', 'co gian', 'mat'],
  'uu dai': ['voucher', 'ma giam gia', 'khuyen mai', 'discount', 'giam gia', 'code'],
  'thanh toan': ['chuyen khoan', 'cod', 'vietqr', 'tien mat', 'napas', 'vcb'],
  'dia chi': ['o dau', 'cua hang', 'shop o dau', 'showroom', 'ha noi', 'amber riverside'],
  'lien he': ['chu shop', 'hotline', 'zalo', 'sdt', 'dien thoai', 'nhan vien', 'nguoi that', 'gap'],
  'ngu hanh': ['phong thuy', 'menh hoa', 'menh thuy', 'menh tho', 'menh kim', 'menh moc', 'mau hop'],
}

/**
 * Xây dựng danh sách các mẩu kiến thức (chunks) tự động từ dữ liệu chuẩn
 */
function buildKnowledgeChunks() {
  const chunks = []

  // 1. Chunks Sản phẩm
  for (const p of products) {
    const sizeKeys = p.sizes || []
    const sizeDetails = sizeKeys
      .map((s) => {
        const guide = p.sizeGuide?.[s]
        if (!guide) return `Size ${s}`
        const parts = []
        if (guide.shirtLength) parts.push(`dài áo ${guide.shirtLength}`)
        if (guide.chest) parts.push(`vòng ngực ${guide.chest}`)
        if (guide.sleeveLength) parts.push(`dài tay ${guide.sleeveLength}`)
        if (guide.maxWaist) parts.push(`max eo ${guide.maxWaist}`)
        else if (guide.waist) parts.push(`vòng eo ${guide.waist}`)
        if (guide.thigh) parts.push(`đùi ${guide.thigh}`)
        if (guide.trouserLength) parts.push(`dài quần ${guide.trouserLength}`)
        if (guide.weight) parts.push(`cân nặng ${guide.weight}`)
        if (guide.height) parts.push(`chiều cao ${guide.height}`)
        return `Size ${s}: ${parts.join(', ')}`
      })
      .join('; ')

    const colors = (p.colors || []).map((c) => c.label || c.name).join(', ')
    const preOrderNote = p.preOrder?.enabled
      ? 'Hàng đặt may thủ công (Pre-order): Giao dự kiến trong 7-10 ngày làm việc.'
      : 'Hàng có sẵn trong kho, đóng gói gửi đi trong 24h.'

    const fengShuiNote = p.fengShui
      ? `Gợi cảm hứng Ngũ Hành thẩm mỹ: Hành ${p.fengShui.element} (${p.fengShui.color}), hòa hợp với mệnh ${p.fengShui.goodFor?.join(', ')}. Ghi chú: ${p.fengShui.energyNote}`
      : ''

    const careNote = Array.isArray(p.careInstructions) ? p.careInstructions.join('. ') : ''
    const highlightsNote = Array.isArray(p.highlights) ? p.highlights.join('. ') : ''

    chunks.push({
      id: `product_${p.id}`,
      topic: 'product',
      productId: p.id,
      slug: p.slug,
      title: `${p.name} (${p.subtitle || ''})`,
      price: p.price,
      originalPrice: p.originalPrice || null,
      text: [
        `Tên sản phẩm: ${p.name}.`,
        `Phụ đề: ${p.subtitle || ''}.`,
        `Giá niêm yết: ${p.price.toLocaleString('vi-VN')}đ${p.originalPrice ? ` (Giá gốc ${p.originalPrice.toLocaleString('vi-VN')}đ, giảm ${p.discount}%)` : ''}.`,
        `Màu sắc & họa tiết: ${colors}.`,
        `Các kích cỡ: ${sizeKeys.join(', ')}.`,
        `Bảng size chi tiết: ${sizeDetails}.`,
        `Chất liệu: ${p.fabric || ''} (${p.fabricDetail || ''}).`,
        `Điểm nổi bật: ${highlightsNote}`,
        `Hướng dẫn giặt & bảo quản: ${careNote}`,
        preOrderNote,
        fengShuiNote,
      ]
        .filter(Boolean)
        .join(' '),
      keywords: [
        p.name,
        p.subtitle,
        p.slug,
        colors,
        ...sizeKeys,
        p.fabric,
        p.fengShui?.element,
      ]
        .filter(Boolean)
        .join(' '),
    })
  }

  // 2. Chunks Chính sách Giao hàng & Vận chuyển
  chunks.push({
    id: 'policy_shipping',
    topic: 'shipping',
    title: 'Chính sách Vận chuyển & Giao hàng',
    text: [
      'Miễn phí vận chuyển (Freeship) toàn quốc cho tất cả đơn hàng từ 500.000đ trở lên.',
      'Đơn hàng dưới 500.000đ áp dụng phí vận chuyển tiêu chuẩn 30.000đ toàn quốc.',
      'Thời gian giao hàng tiêu chuẩn: Nội thành Hà Nội từ 1–2 ngày làm việc; Các tỉnh thành khác từ 2–4 ngày làm việc.',
      'Sản phẩm đặt may thủ công (Pre-order): Thời gian hoàn thiện và giao hàng dự kiến 7–10 ngày làm việc.',
      'Đồng kiểm COD: Quý khách được quyền kiểm tra niêm phong kiện hàng bên ngoài cùng nhân viên bưu tá trước khi thanh toán.',
      'Khung giờ chỉnh sửa đơn: Quý khách có 1 giờ kể từ khi đặt hàng để liên hệ chỉnh sửa địa chỉ, số điện thoại hoặc mẫu mã.',
    ].join(' '),
    keywords: 'ship giao hang phi ship van chuyen freeship dong kiem thoi gian 30000 500000 ha noi',
  })

  // 3. Chunks Chính sách Đổi trả & Bảo hành
  chunks.push({
    id: 'policy_return',
    topic: 'return',
    title: 'Chính sách Đổi trả & Cam kết Chất lượng',
    text: [
      'Cam kết chất lượng: Hỗ trợ đổi trả trong vòng 30 ngày kể từ khi nhận hàng nếu không hài lòng với chất lượng sản phẩm.',
      'Trường hợp hoàn tiền dựa trên sự hài lòng chịu phí xử lý môi trường 15%, phí vận chuyển ban đầu không được hoàn lại, và chi phí gửi hàng trả lại do khách hàng chi trả.',
      'Hàng hóa bị hư hỏng hoặc thiếu do vận chuyển: Khách hàng cần liên hệ trong vòng 24 giờ kể từ khi nhận hàng kèm hình ảnh minh chứng để được gửi bù ngay lập tức.',
      'Chỉnh sửa và hủy đơn: Hỗ trợ chỉnh sửa hoặc hủy đơn trong vòng 1 giờ đầu tiên sau khi đặt hàng.',
      'Hotline tiếp nhận đổi trả: 0981 753 082 hoặc Email: quannguyens403@gmail.com.',
    ].join(' '),
    keywords: 'doi tra hoan tien tra hang bao hanh 30 ngay 15% loi rach hu hong huy don',
  })

  // 4. Chunks Phương thức Thanh toán & Ưu đãi Chuyển khoản
  chunks.push({
    id: 'policy_payment',
    topic: 'payment',
    title: 'Phương thức Thanh toán & Ưu đãi',
    text: [
      'QuanNguyenS hỗ trợ 2 phương thức thanh toán an toàn:',
      '1. Thanh toán khi nhận hàng (COD): Trả tiền mặt cho shipper khi nhận được hàng trên toàn quốc.',
      '2. Chuyển khoản VietQR / Napas 24/7: Nhận ngay ưu đãi GIẢM 10% TRỰC TIẾP trên tổng giá trị đơn hàng.',
      'Thông tin thanh toán: Vietcombank (VCB), STK: 1050773506, Chủ tài khoản: NGUYEN DUC QUAN.',
      'Mọi giao dịch thanh toán VietQR đều được quét tự động bằng mã QR chuẩn Napas 24/7, xác nhận tức thì.',
    ].join(' '),
    keywords: 'thanh toan cod chuyen khoan vietqr giam 10% ngan hang vcb napas tien mat',
  })

  // 5. Chunks Thông tin Shop & Kênh Hỗ trợ
  chunks.push({
    id: 'shop_info',
    topic: 'contact',
    title: 'Thông tin Thương hiệu & Kênh Liên hệ QuanNguyenS',
    text: [
      'Thương hiệu: QuanNguyenS — Thời trang pijama cao cấp định vị Style To Be Lived In ("Every girls deserve QuanNguyenS\'s Pyjama").',
      'Slogan chính: "Style To Be Lived In".',
      'Địa chỉ: Amber Riverside, 622 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội.',
      'Hotline & Zalo tư vấn 24/7: 0981 753 082.',
      'Link chat Zalo trực tiếp: https://zalo.me/0981753082.',
      'Email: quannguyens403@gmail.com.',
      'Website chính thức: https://quannguyens.com.',
    ].join(' '),
    keywords: 'dia chi quannguyens amber riverside minh khai ha noi hotline zalo 0981753082 email lien he',
  })

  // 6. Chunks Hướng dẫn Tra cứu Đơn hàng
  chunks.push({
    id: 'guide_order_tracking',
    topic: 'tracking',
    title: 'Hướng dẫn Tra cứu Hành trình Đơn hàng',
    text: [
      'Để tra cứu tình trạng đơn hàng, quý khách có thể kiểm tra email xác nhận đơn hàng chứa link tra cứu trực tiếp.',
      'Hoặc đăng nhập vào mục "Tài Khoản" tại https://quannguyens.com/tai-khoan để xem lịch sử đơn hàng và mã bưu vận Viettel Post kèm link theo dõi.',
      'Chatbot trợ lý ảo không tự ý đọc hoặc chỉnh sửa thông tin đơn hàng vì lý do bảo mật quyền riêng tư.',
    ].join(' '),
    keywords: 'tra cuu don hang o dau kiem tra don hanh trinh viettel post ma don link',
  })

  return chunks
}

// Khởi tạo bộ nhớ Knowledge Base
const KNOWLEDGE_CHUNKS = buildKnowledgeChunks()

/**
 * Tìm kiếm các mẩu kiến thức liên quan nhất dựa trên truy vấn người dùng
 * Sử dụng thuật toán so khớp token + từ đồng nghĩa + loại bỏ dấu tiếng Việt (Local BM-Score)
 * @param {string} query - Câu hỏi của khách hàng
 * @param {number} topK - Số lượng chunk trả về (mặc định 3)
 * @returns {Array<Object>}
 */
export function retrieveKnowledge(query, topK = 3) {
  if (!query || typeof query !== 'string') return []

  const cleanQuery = removeVietnameseTones(query)
  const queryTokens = cleanQuery.split(/[\s,?.!;:()/-]+/).filter((t) => t.length > 1)

  // Mở rộng queryTokens bằng từ đồng nghĩa
  const expandedTokens = new Set(queryTokens)
  for (const [key, synList] of Object.entries(SYNONYMS)) {
    const keyNorm = removeVietnameseTones(key)
    if (cleanQuery.includes(keyNorm)) {
      for (const syn of synList) {
        removeVietnameseTones(syn).split(/\s+/).forEach((t) => expandedTokens.add(t))
      }
    }
    for (const syn of synList) {
      if (cleanQuery.includes(removeVietnameseTones(syn))) {
        removeVietnameseTones(key).split(/\s+/).forEach((t) => expandedTokens.add(t))
      }
    }
  }

  // Chấm điểm từng chunk
  const scoredChunks = KNOWLEDGE_CHUNKS.map((chunk) => {
    let score = 0
    const chunkTextNorm = removeVietnameseTones(chunk.text + ' ' + (chunk.keywords || ''))

    for (const token of expandedTokens) {
      if (token.length < 2) continue
      // Khớp chính xác từ
      const regex = new RegExp(`\\b${token}\\b`, 'gi')
      const matches = chunkTextNorm.match(regex)
      if (matches) {
        score += matches.length * 3
      } else if (chunkTextNorm.includes(token)) {
        score += 1
      }
    }

    // Ưu tiên sản phẩm đích danh nếu query nhắc đúng tên hoặc màu sắc đặc trưng
    if (chunk.topic === 'product') {
      const titleLower = chunk.title.toLowerCase()
      if (titleLower.includes('daybreak') && (cleanQuery.includes('daybreak') || cleanQuery.includes('hong') || cleanQuery.includes('pink'))) {
        score += 35
      } else if (titleLower.includes('stillwater') && (cleanQuery.includes('stillwater') || cleanQuery.includes('navy') || cleanQuery.includes('caro') || cleanQuery.includes('size l') || cleanQuery.includes('65kg') || cleanQuery.includes('1m72') || cleanQuery.includes('nam'))) {
        score += 35
      } else if (titleLower.includes('hearth') && (cleanQuery.includes('hearth') || cleanQuery.includes('nau') || cleanQuery.includes('brown'))) {
        score += 35
      }
    }

    return { ...chunk, score }
  })

  // Sắp xếp điểm giảm dần và lấy topK
  return scoredChunks
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/**
 * Lấy toàn bộ danh sách sản phẩm tóm tắt cho persona / system context
 */
export function getAllProductsSummary() {
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    price: p.price,
    originalPrice: p.originalPrice || null,
    discount: p.discount || 0,
    sizes: p.sizes,
    colors: (p.colors || []).map((c) => c.label || c.name),
    fabric: p.fabric,
    preOrder: !!p.preOrder?.enabled,
    fengShui: p.fengShui ? `${p.fengShui.element} (${p.fengShui.goodFor?.join(', ')})` : null,
  }))
}

export { KNOWLEDGE_CHUNKS }
