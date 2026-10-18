/**
 * Local Smart Advisor Engine (Trợ lý Tư Vấn Thông Minh Cục Bộ)
 * Trả lời tự nhiên, ấm áp, chuẩn mực như một nhân viên bán hàng thời trang cao cấp thực thụ.
 * Hoạt động 100% độc lập, không phụ thuộc vào LLM bên ngoài, không tốn 1 xu chi phí,
 * đảm bảo hệ thống LUÔN LUÔN trả lời được mọi câu hỏi của khách hàng mà không bị rơi vào vòng lặp "gặp chủ shop".
 */

import { products } from '../../../src/data/products.js'
import { removeVietnameseTones, retrieveKnowledge } from './knowledgeBase.js'
import { buildLiveFacts, LIVE_CONSTANTS } from './liveFacts.js'

/**
 * Trích xuất cân nặng và chiều cao từ tin nhắn khách
 */
function extractBodyMeasurements(text) {
  const norm = removeVietnameseTones(text)
  let weight = null
  let height = null

  // Tìm cân nặng (vd: 45kg, 52 kg, nặng 50, 55 cân, 48 kí)
  const weightMatch =
    norm.match(/(\d{2})\s*(?:kg|kilo|can|ki|ky)\b/) ||
    norm.match(/(?:nang|can\s+nang|nang\s+tam|khoang)\s*(\d{2})\b/) ||
    norm.match(/\b(\d{2})\s*(?:kg|cân|kí)\b/)

  if (weightMatch) {
    const w = parseInt(weightMatch[1], 10)
    if (w >= 35 && w <= 110) weight = w
  }

  // Tìm chiều cao (vd: 1m55, 1m60, 158cm, cao 1m65, cao 160)
  const heightMatch =
    norm.match(/(?:1m|1m\s*)(\d{2})\b/) ||
    norm.match(/(\d{3})\s*(?:cm)?\b/) ||
    norm.match(/(?:cao|chieu\s+cao)\s*(\d{2,3})\b/)

  if (heightMatch) {
    if (heightMatch[1] && heightMatch[1].length === 2) {
      height = 100 + parseInt(heightMatch[1], 10)
    } else if (heightMatch[1] && heightMatch[1].length === 3) {
      const h = parseInt(heightMatch[1], 10)
      if (h >= 140 && h <= 200) height = h
    }
  }

  return { weight, height }
}

/**
 * Tư vấn size dựa trên số đo thực tế
 */
function adviseSize(weight, height) {
  if (!weight && !height) return null

  // Trường hợp dưới 50kg (40-49kg)
  if (weight && weight < 50) {
    return {
      recommendedSize: 'Size S',
      reason: `với cân nặng ${weight}kg${height ? ` và chiều cao ${height}cm` : ''}, anh/chị mặc chuẩn nhất là **Size S** ạ (thiết kế chuẩn cho người từ 40–49kg). Phom dáng suông rộng rãi thoải mái theo phong cách châu Âu, mặc ngủ hay làm việc tại nhà đều rất vừa vặn.`,
      models: 'Mẫu **THE DAYBREAK SET** (Sọc Hồng, 390k) hoặc **THE HEARTH SET** (Sọc Nâu Tencel, 750k) đều có Size S rất đẹp ạ.',
    }
  }

  // Trường hợp từ 50kg đến 58kg
  if (weight && weight >= 50 && weight <= 58) {
    return {
      recommendedSize: 'Size M',
      reason: `với cân nặng ${weight}kg${height ? ` và chiều cao ${height}cm` : ''}, anh/chị mặc đẹp và thoải mái nhất là **Size M** ạ (chuẩn cho người từ 50–58kg). Phom áo suông thẳng và đai quần co giãn êm ái giúp cử động hoàn toàn thư giãn.`,
      models: 'Cả 3 mẫu của QuanNguyenS (**The Daybreak Set**, **The Stillwater Set**, **The Hearth Set**) đều có Size M chuẩn chỉnh ạ.',
    }
  }

  // Trường hợp từ 59kg đến 66kg
  if (weight && weight >= 59 && weight <= 66) {
    return {
      recommendedSize: 'Size L',
      reason: `với cân nặng ${weight}kg${height ? ` và chiều cao ${height}cm` : ''}, anh/chị mặc chuẩn nhất là **Size L** của mẫu **THE STILLWATER SET** (Caro Navy) ạ (chuẩn cho người từ 58–66kg, chiều cao 162–172cm). Chất vải Modal kết hợp Spandex mướt mát, co giãn nhẹ và chống nhăn tự nhiên.`,
      models: 'Mẫu **THE STILLWATER SET (Caro Navy - 550.000đ)** cổ V thanh lịch có sẵn Size L giao ngay ạ.',
    }
  }

  // Trường hợp trên 66kg
  if (weight && weight > 66) {
    return {
      recommendedSize: 'Tư vấn may đo riêng',
      reason: `dạ hiện các mẫu may sẵn của QuanNguyenS có kích cỡ tối đa là Size L (dành cho người dưới 66kg). Với cân nặng ${weight}kg, để mặc thoải mái và chuẩn form nhất, em có thể hỗ trợ anh/chị kết nối với chủ shop để được tư vấn kích thước hoặc may đo theo yêu cầu nhé ạ!`,
      models: null,
      needsHandoff: true,
    }
  }

  return null
}

/**
 * Xử lý tư vấn thông minh cục bộ khi khách hỏi
 */
export function generateLocalAdvisorResponse(message, context = {}) {
  const norm = removeVietnameseTones(message)
  const liveFacts = buildLiveFacts(context)

  // 1. Khách hỏi xem danh mục sản phẩm, có những mẫu nào, shop bán gì
  if (
    norm.includes('co nhung mau nao') ||
    norm.includes('cac mau') ||
    norm.includes('mau nao dep') ||
    norm.includes('xem mau') ||
    norm.includes('shop ban gi') ||
    norm.includes('co may mau') ||
    norm.includes('gioi thieu mau') ||
    norm.includes('san pham') ||
    norm.includes('tu van mau') ||
    norm.includes('ban chay') ||
    norm.includes('bo do ngu') ||
    norm.includes('bo pijama')
  ) {
    return {
      reply:
        'Dạ QuanNguyenS hiện có 3 bộ pijama thiết kế cao cấp trong Bộ Sưu Tập Thu Đông 2026 chuẩn phong cách European Casual Luxury ạ:\n\n' +
        '1. 🌸 **THE DAYBREAK SET (390.000đ)**: Họa tiết sọc hồng nắng sớm ấm áp (Hành Hỏa), viền tương phản sắc nét, cổ notch cổ điển, 100% sợi tự nhiên Cotton-Modal thoáng khí 4 mùa (Size S, M).\n\n' +
        '2. 🌊 **THE STILLWATER SET (550.000đ)**: Họa tiết Caro Navy lịch lãm (Hành Thủy), thiết kế cổ V thanh thoát tôn dáng, chất liệu 95% Modal & 5% Spandex mướt mát chống nhăn tự nhiên (Size M, L).\n\n' +
        '3. 🍂 **THE HEARTH SET (750.000đ)**: Họa tiết sọc nâu mocha quý phái (Hành Thổ), quần dáng wide-leg ống rộng buông rủ kiêu sa, chế tác từ 100% Tencel Lyocell thượng hạng (Size S, M).\n\n' +
        'Anh/chị đang tìm đồ mặc nhà thoáng mát hay đang muốn chọn một món quà tinh tế cho người thân ạ?',
      quickReplies: ['Mẫu Daybreak (Hồng)', 'Mẫu Stillwater (Navy)', 'Mẫu Hearth (Nâu)', 'Tư vấn chọn size'],
    }
  }

  // 2. Tư vấn size theo cân nặng / chiều cao cụ thể
  const { weight, height } = extractBodyMeasurements(message)
  if (weight || height) {
    const sizeAdvice = adviseSize(weight, height)
    if (sizeAdvice) {
      if (sizeAdvice.needsHandoff) {
        return {
          reply: `Dạ ${sizeAdvice.reason}`,
          quickReplies: ['Chat Zalo chủ shop', 'Gọi Hotline 0981753082', 'Xem các mẫu'],
          handoff: {
            active: true,
            zalo: liveFacts.zaloLink,
            tel: `tel:${liveFacts.hotline}`,
            phoneDisplay: liveFacts.hotline,
          },
        }
      }

      return {
        reply: `Dạ ${sizeAdvice.reason}\n\n${sizeAdvice.models}\n\nAnh/chị thích mẫu pijama tone màu nào nhất để em gửi chi tiết ạ?`,
        quickReplies: ['Xem Daybreak (Hồng)', 'Xem Stillwater (Navy)', 'Xem Hearth (Nâu)', 'Phí ship & Ưu đãi'],
      }
    }
  }

  // 3. Hỏi chi tiết mẫu The Daybreak Set (Sọc Hồng)
  if (
    norm.includes('daybreak') ||
    norm.includes('soc hong') ||
    norm.includes('mau hong') ||
    (norm.includes('390') && !norm.includes('hearth') && !norm.includes('stillwater'))
  ) {
    return {
      reply:
        'Dạ bộ **THE DAYBREAK SET** là mẫu pijama cổ bẻ kinh điển phong cách châu Âu bán rất chạy tại QuanNguyenS ạ:\n\n' +
        '• **Giá bán**: 390.000đ (đang ưu đãi 20% từ giá gốc 490.000đ).\n' +
        '• **Màu sắc**: Sọc Hồng (Pink Stripe) mang năng lượng Hỏa ấm áp, tươi vui như nắng sớm.\n' +
        '• **Chất liệu**: 100% sợi tự nhiên Cotton-Modal dệt thoi thoáng khí 4 mùa, an toàn cho da nhạy cảm theo tiêu chuẩn OEKO-TEX 100.\n' +
        '• **Kích cỡ**: Size S (40–49kg) và Size M (50–58kg).\n' +
        '• **Đặt may**: Sản phẩm may thủ công giới hạn, hoàn thiện và giao trong 7–10 ngày làm việc.\n\n' +
        'Anh/chị cho em xin chiều cao và cân nặng để em chọn size vừa vặn nhất cho mình nhé!',
      quickReplies: ['Chọn size cho bộ này', 'Chính sách freeship', 'Xem mẫu Caro Navy'],
      product: {
        name: 'THE DAYBREAK SET',
        subtitle: 'Pijama Phong Cách Châu Âu · Sọc Hồng',
        price: 390000,
        slug: 'the-classic-set',
        preOrder: true,
        image: '/images/hero-slide-01.jpg',
      },
    }
  }

  // 4. Hỏi chi tiết mẫu The Stillwater Set (Caro Navy)
  if (
    norm.includes('stillwater') ||
    norm.includes('caro navy') ||
    norm.includes('caro') ||
    norm.includes('navy') ||
    norm.includes('co v') ||
    norm.includes('550')
  ) {
    return {
      reply:
        'Dạ bộ **THE STILLWATER SET** là thiết kế pijama cổ V hiện đại được rất nhiều khách hàng yêu thích:\n\n' +
        '• **Giá bán**: 550.000đ.\n' +
        '• **Màu sắc**: Họa tiết Caro Navy lịch lãm, chiều sâu tĩnh tại của hành Thủy mang lại cảm giác an yên, thư thái.\n' +
        '• **Chất liệu**: 95% sợi gỗ tự nhiên Modal & 5% Spandex cao cấp định lượng 180 GSM, sờ vào mềm mướt mát lạnh và chống nhăn tự nhiên.\n' +
        '• **Kích cỡ**: Size M (50–57kg) và Size L (58–66kg).\n' +
        '• **Tình trạng**: Hàng có sẵn trong kho, đóng gói hộp quà và bàn giao vận chuyển trong 24h.\n\n' +
        'Anh/chị đang muốn chọn Size M hay Size L ạ?',
      quickReplies: ['Tư vấn size M', 'Tư vấn size L', 'Ưu đãi chuyển khoản VietQR'],
      product: {
        name: 'THE STILLWATER SET',
        subtitle: 'Pijama Cổ V Lịch Lãm · Caro Navy',
        price: 550000,
        slug: 'the-stillwater-set',
        preOrder: false,
        image: '/images/hero-slide-02.jpg',
      },
    }
  }

  // 5. Hỏi chi tiết mẫu The Hearth Set (Sọc Nâu)
  if (
    norm.includes('hearth') ||
    norm.includes('soc nau') ||
    norm.includes('mau nau') ||
    norm.includes('wide leg') ||
    norm.includes('ong rong') ||
    norm.includes('750')
  ) {
    return {
      reply:
        'Dạ tuyệt phẩm **THE HEARTH SET** là dòng homewear cao cấp nhất tại QuanNguyenS:\n\n' +
        '• **Giá bán**: 750.000đ (Phiên bản giới hạn).\n' +
        '• **Thiết kế**: Quần dáng wide-leg (ống rộng) thượng lưu buông rủ thướt tha, phối áo phom thoải mái chuẩn châu Âu.\n' +
        '• **Chất liệu**: 100% Tencel Lyocell thượng hạng định lượng 190 GSM, dệt bóng mờ sang trọng, thấm hút gấp 1.5 lần cotton và rủ mềm tự nhiên.\n' +
        '• **Màu sắc**: Sọc Nâu mocha ấm áp thuộc hành Thổ, mang lại cảm giác bình yên như trở về tổ ấm.\n' +
        '• **Kích cỡ**: Size S (42–50kg) và Size M (51–58kg). Hàng đặt may thủ công giao trong 7–10 ngày làm việc.\n\n' +
        'Bộ này diện tiếp khách tại nhà hay làm quà tặng sinh nhật thì cực kỳ đẳng cấp ạ!',
      quickReplies: ['Tư vấn chọn size', 'Chính sách đổi trả', 'Gặp chủ shop'],
      product: {
        name: 'THE HEARTH SET',
        subtitle: 'Pijama Wide-Leg Thượng Hạng · Sọc Nâu',
        price: 750000,
        slug: 'the-hearth-set',
        preOrder: true,
        image: '/images/hero-slide-03.jpg',
      },
    }
  }

  // 6. Hỏi về Chất liệu, độ mát, giặt ủi, co rút, nhăn vải
  if (
    norm.includes('vai gi') ||
    norm.includes('chat lieu') ||
    norm.includes('vai co mat khong') ||
    norm.includes('co mat khong') ||
    norm.includes('co nhan khong') ||
    norm.includes('giat may') ||
    norm.includes('co rut') ||
    norm.includes('tencel') ||
    norm.includes('modal') ||
    norm.includes('cotton') ||
    norm.includes('oeko')
  ) {
    return {
      reply:
        'Dạ toàn bộ sản phẩm của QuanNguyenS đều sử dụng chất liệu sợi dệt tự nhiên thượng hạng thân thiện với làn da:\n\n' +
        '• **Cotton-Modal (The Daybreak Set)**: Dệt thoi vân chéo thoáng khí 4 mùa, đạt chuẩn an toàn OEKO-TEX 100 không gây kích ứng da.\n' +
        '• **Modal & Spandex (The Stillwater Set)**: Chiết xuất từ sợi gỗ sồi tự nhiên, sờ vào mướt mát, có độ đàn hồi nhẹ và chống nhăn tự nhiên.\n' +
        '• **100% Tencel Lyocell (The Hearth Set)**: Vải sinh học cao cấp có độ bóng mờ sang trọng, mềm rủ quý phái và thấm hút vượt trội.\n\n' +
        '💡 **Hướng dẫn giặt**: Anh/chị nên giặt tay hoặc giặt máy chế độ nhẹ (delicate) dưới 30°C, phơi trong bóng mát và không sấy máy để trang phục giữ form bền đẹp nhiều năm nhé ạ!',
      quickReplies: ['Xem mẫu The Daybreak', 'Xem mẫu The Stillwater', 'Xem mẫu The Hearth'],
    }
  }

  // 7. Hỏi Giá cả, bao nhiêu tiền một bộ
  if (
    norm.includes('gia bao nhieu') ||
    norm.includes('nhieu tien') ||
    norm.includes('bao nhieu tien') ||
    norm.includes('gia ca') ||
    norm.includes('bao nhieu mot bo')
  ) {
    return {
      reply:
        'Dạ QuanNguyenS niêm yết mức giá minh bạch cho 3 bộ pijama thiết kế như sau ạ:\n\n' +
        '• **THE DAYBREAK SET**: 390.000đ (đang ưu đãi từ 490.000đ) · Sọc Hồng Cotton-Modal.\n' +
        '• **THE STILLWATER SET**: 550.000đ · Caro Navy Modal cao cấp.\n' +
        '• **THE HEARTH SET**: 750.000đ · Sọc Nâu Wide-Leg Tencel thượng hạng.\n\n' +
        '🎁 **Ưu đãi áp dụng**:\n' +
        '• Giảm ngay **10% TRỰC TIẾP** trên tổng đơn khi thanh toán Chuyển khoản VietQR (Napas 24/7).\n' +
        '• **MIỄN PHÍ VẬN CHUYỂN** toàn quốc cho đơn từ 500.000đ ạ!',
      quickReplies: ['Tư vấn chọn size', 'Xem mẫu pijama', 'Gặp chủ shop'],
    }
  }

  // 8. Khách mua làm quà tặng / mua cho người yêu / vợ / mẹ / sếp
  if (
    norm.includes('mua tang') ||
    norm.includes('tang vo') ||
    norm.includes('tang me') ||
    norm.includes('tang ban gai') ||
    norm.includes('tang nguoi yeu') ||
    norm.includes('qua tang') ||
    norm.includes('sinh nhat') ||
    norm.includes('set doi')
  ) {
    return {
      reply:
        'Dạ anh/chị chọn pijama cao cấp làm quà tặng là một lựa chọn cực kỳ chu đáo và tinh tế!\n\n' +
        '• Nếu người nhận thích phong cách ngọt ngào, tươi trẻ: mẫu **THE DAYBREAK SET** (Sọc Hồng, 390k) mang năng lượng ấm áp, rạng rỡ như nắng sớm.\n' +
        '• Nếu người nhận thích phong cách thanh lịch, trầm tĩnh: mẫu **THE STILLWATER SET** (Caro Navy, 550k) cổ V rất tôn dáng và hiện đại.\n' +
        '• Nếu muốn món quà đẳng cấp nhất dành tặng người đặc biệt: mẫu **THE HEARTH SET** (Sọc Nâu Tencel, 750k) phom wide-leg quý phái là lựa chọn hoàn hảo nhất.\n\n' +
        'Mỗi đơn hàng QuanNguyenS đều được đóng gói hộp quà trang nhã và hỗ trợ đồng kiểm khi nhận hàng ạ. Anh/chị cho em xin số đo hoặc chiều cao/cân nặng của người nhận để em gợi ý size chuẩn nhé!',
      quickReplies: ['Tư vấn size quà tặng', 'Chính sách đổi trả', 'Gặp chủ shop'],
    }
  }

  // 9. Hỏi chung về Ngũ Hành, màu sắc phong thủy
  if (
    norm.includes('ngu hanh') ||
    norm.includes('phong thuy') ||
    norm.includes('hop menh') ||
    norm.includes('menh hoa') ||
    norm.includes('menh thuy') ||
    norm.includes('menh tho') ||
    norm.includes('menh kim') ||
    norm.includes('menh moc')
  ) {
    return {
      reply:
        'Dạ các thiết kế của QuanNguyenS lấy cảm hứng thẩm mỹ màu sắc từ Ngũ Hành tự nhiên để mang lại cảm xúc an yên trọn vẹn:\n\n' +
        '• **Hỏa Sắc (The Daybreak Set - Sọc Hồng)**: Ấm áp, yêu đời, tiếp thêm sinh khí tích cực — rất tương sinh hòa hợp cho người mệnh Hỏa và Thổ.\n' +
        '• **Thủy Sắc (The Stillwater Set - Caro Navy)**: Tĩnh tại, sâu lắng, mang lại sự thư thái như mặt hồ phẳng lặng — tương hợp nuôi dưỡng cho người mệnh Thủy và Mộc.\n' +
        '• **Thổ Sắc (The Hearth Set - Sọc Nâu)**: Vững chãi, an lành, mang cảm giác bình yên của tổ ấm — hòa hợp cho người mệnh Thổ và Kim.\n\n' +
        'Lưu ý là Ngũ Hành ở đây là gợi cảm hứng thẩm mỹ tinh tế cho không gian nghỉ ngơi của anh/chị ạ! Anh/chị đang có cảm tình với tone màu nào nhất ạ?',
      quickReplies: ['Tone Hồng (Hỏa)', 'Tone Navy (Thủy)', 'Tone Nâu (Thổ)', 'Tư vấn size'],
    }
  }

  // 9.5. Khách hỏi đồ nam hay nữ / nam mặc được không / pijama nam / đồ đôi
  if (
    norm.includes('nam mac duoc khong') ||
    norm.includes('do nam hay nu') ||
    norm.includes('do nam') ||
    norm.includes('pijama nam') ||
    norm.includes('cho nam') ||
    norm.includes('unisex')
  ) {
    return {
      reply:
        'Dạ toàn bộ thiết kế của QuanNguyenS mang phom dáng suông phóng khoáng (straight-leg & relaxed fit) theo chuẩn phong cách châu Âu, nên cả nam và nữ đều mặc rất sang và thoải mái ạ!\n\n' +
        '• Đặc biệt mẫu **THE STILLWATER SET (Caro Navy)** có Size L (dành cho người 58–66kg, chiều cao đến 1m72) với họa tiết caro cổ V lịch lãm được rất nhiều khách hàng nam yêu thích.\n' +
        '• Rất nhiều khách hàng cũng chọn làm set pijama đôi (couple) cho cả hai vợ chồng/bạn gái bạn trai.\n\n' +
        'Anh/chị cho em xin chiều cao và cân nặng để em tư vấn size chuẩn nhất nhé!',
      quickReplies: ['Mẫu The Stillwater (Navy)', 'Tư vấn chọn size', 'Ưu đãi & Freeship'],
      product: {
        name: 'THE STILLWATER SET',
        subtitle: 'Pijama Cổ V Lịch Lãm · Caro Navy',
        price: 550000,
        slug: 'the-stillwater-set',
        preOrder: false,
        image: '/images/hero-slide-02.jpg',
      },
    }
  }

  // 10. Tìm kiếm theo Knowledge Base nếu câu hỏi chuyên sâu khác
  const relevant = retrieveKnowledge(message, 1)
  if (relevant.length > 0 && relevant[0].score >= 1) {
    const chunk = relevant[0]
    return {
      reply: `Dạ em xin chia sẻ thông tin chi tiết về ${chunk.title} tại QuanNguyenS ạ:\n\n${chunk.text}\n\nAnh/chị cần em hỗ trợ thêm thông tin nào về sản phẩm hay chọn size nữa không ạ?`,
      quickReplies: ['Tư vấn chọn size', 'Xem các mẫu khác', 'Phí ship & Ưu đãi'],
    }
  }

  // Fallback thân thiện, luôn hỗ trợ khách nhiệt tình
  return {
    reply:
      'Dạ em là Trợ lý ảo thời trang của QuanNguyenS (phong cách European Casual Luxury). Em rất vui được hỗ trợ anh/chị chọn size vừa vặn theo chiều cao/cân nặng, tư vấn chất liệu các mẫu pijama (Daybreak Sọc Hồng, Stillwater Caro Navy, Hearth Sọc Nâu Tencel) hoặc thông tin ưu đãi và giao nhận của shop ạ.\n\nAnh/chị đang quan tâm đến bộ pijama cho dịp nào ạ?',
    quickReplies: ['Xem 3 mẫu Pijama', 'Tư vấn chọn size', 'Ưu đãi & Freeship', 'Gặp chủ shop'],
  }
}
