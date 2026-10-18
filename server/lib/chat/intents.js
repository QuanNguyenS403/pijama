/**
 * Intents & Tier 0 Rule-Based Processor Module
 * Xử lý các câu hỏi thường gặp (FAQ, chính sách, bảng size, voucher, tra cứu đơn)
 * hoàn toàn bằng quy tắc logic cục bộ: CHI PHÍ = 0đ, phản hồi tức thì, không phụ thuộc LLM.
 */

import { removeVietnameseTones } from './knowledgeBase.js'
import { buildLiveFacts, LIVE_CONSTANTS } from './liveFacts.js'

/**
 * Nhận diện tín hiệu yêu cầu gặp người thật / chủ shop / khiếu nại gay gắt (Handoff)
 */
export function detectHandoffSignal(message) {
  if (!message || typeof message !== 'string') return false

  const norm = removeVietnameseTones(message)

  // 1. Khách khiếu nại gay gắt / lừa đảo / tranh chấp / đòi tiền / chưa nhận được hàng
  const complaintKeywords = [
    'kieu nai', 'khieu nai', 'lua dao', 'hang gia', 'doi tien', 'hoan tien gap',
    'hoan tien', 'tranh chap', 'khong tin bot', 'khong tin chatbot',
    'khong noi chuyen voi robot', 'lam an tro he', 'chua thay hang',
    'chua nhan duoc hang', 'dat 50 bo', 'qua tang cong ty', 'qua tang doanh nghiep',
    'dat may rieng', 'mua si'
  ]
  if (complaintKeywords.some((kw) => norm.includes(kw))) {
    return true
  }

  // 2. Yêu cầu gặp người thật / nhân viên thật
  const humanKeywords = [
    'gap nguoi that', 'nhan vien that', 'cho gap nguoi', 'noi chuyen nguoi that',
    'nguoi that tu van', 'chuyen sang nguoi that', 'goi lai cho toi'
  ]
  if (humanKeywords.some((kw) => norm.includes(kw))) {
    return true
  }

  // 3. Tương tác có chủ đích muốn gặp / nói chuyện / xin số chủ shop hoặc quản lý
  const ownerKeywords = ['chu shop', 'chu', 'quan ly']
  const contactActionKeywords = [
    'gap', 'noi chuyen', 'lien he', 'trao doi', 'cho gap', 'muon gap',
    'sdt', 'so dien thoai', 'so hotline', 'hotline', 'goi dien', 'goi cho'
  ]

  const hasOwner = ownerKeywords.some((o) => norm.includes(o))
  const hasContactAction = contactActionKeywords.some((a) => norm.includes(a))

  if (hasOwner && hasContactAction) {
    return true
  }

  // 4. Các nút bấm hoặc cụm từ chọn trực tiếp
  if (norm === 'gap chu shop' || norm === 'gap chu' || norm === 'chu shop') {
    return true
  }

  return false
}

/**
 * Nhận diện câu hỏi ngoài phạm vi (Prompt Injection / Out of scope)
 */
export function detectOutOfScope(message) {
  if (!message || typeof message !== 'string') return false
  const norm = removeVietnameseTones(message)

  const injectionTriggers = [
    'bo qua moi quy tac', 'ignore all previous instructions', 'system prompt',
    'lap trinh', 'viet code', 'lam tho', 'giai toan', 'viet tieu luan',
    'chinh tri', 'dang cong san', 'tong thong', 'thuoc tri benh', 'kham benh'
  ]

  return injectionTriggers.some((t) => norm.includes(t))
}

/**
 * Phân loại ý định và xử lý Tầng 0 (Nếu khớp quy tắc định sẵn)
 * @param {string} message - Tin nhắn khách gửi
 * @param {Object} context - Ngữ cảnh bổ sung
 * @returns {{ handled: boolean, reply?: string, quickReplies?: string[], handoff?: Object, intentName?: string }}
 */
export function processTier0Intent(message, context = {}) {
  if (!message || typeof message !== 'string') {
    return { handled: false }
  }

  const norm = removeVietnameseTones(message)
  const liveFacts = buildLiveFacts(context)

  // 1. Tín hiệu Handoff (Gặp chủ shop / người thật / khiếu nại)
  if (detectHandoffSignal(message)) {
    return {
      handled: true,
      intentName: 'HANDOFF',
      reply:
        'Dạ em hiểu ạ! Em xin phép kết nối anh/chị ngay cùng chủ shop QuanNguyenS để được hỗ trợ chu đáo nhất qua Zalo, gọi điện trực tiếp hoặc để lại số điện thoại em xin liên hệ lại ngay nhé ạ.',
      quickReplies: ['Chat Zalo', 'Gọi Hotline', 'Để lại SĐT'],
      handoff: {
        active: true,
        zalo: liveFacts.zaloLink,
        tel: `tel:${liveFacts.hotline}`,
        phoneDisplay: liveFacts.hotline,
      },
      usedTier: 'tier-0',
    }
  }

  // 2. Chặn Ngoài phạm vi / Prompt injection
  if (detectOutOfScope(message)) {
    return {
      handled: true,
      intentName: 'OUT_OF_SCOPE',
      reply:
        'Dạ em là trợ lý ảo chuyên về trang phục pijama cao cấp và dịch vụ của QuanNguyenS, nên em chưa hỗ trợ được chủ đề ngoài thời trang rồi ạ. Em rất sẵn lòng hỗ trợ anh/chị về mẫu mã, chất liệu hoặc chọn size vừa vặn nhé!',
      quickReplies: ['Xem các mẫu Pijama', 'Tư vấn chọn size', 'Phí ship & Ưu đãi'],
      usedTier: 'tier-0',
    }
  }

  // 3. Chào hỏi ban đầu
  if (
    /^(chao|xin chao|hello|hi|alo|chao em|chao shop|shop oi|co ai khong|chu shop oi|chao chu shop|shop co do khong)\b/i.test(norm) &&
    norm.length < 40
  ) {
    return {
      handled: true,
      intentName: 'GREETING',
      reply:
        'Dạ em chào anh/chị ạ! Em là Trợ lý ảo của QuanNguyenS. Em rất vui được hỗ trợ anh/chị chọn size chuẩn vóc dáng, tìm hiểu chất liệu các bộ pijama hoặc các ưu đãi đang áp dụng. Anh/chị đang quan tâm đến bộ pijama cho dịp nào ạ?',
      quickReplies: ['Tư vấn chọn size', 'Xem 3 mẫu Pijama', 'Ưu đãi & Freeship', 'Gặp chủ shop'],
      usedTier: 'tier-0',
    }
  }

  // 4. Hỏi về Phí Ship / Thời gian giao hàng / Freeship
  if (
    norm.includes('phi ship') ||
    norm.includes('cuoc ship') ||
    norm.includes('freeship') ||
    norm.includes('bao gio nhan') ||
    norm.includes('bao lau nhan') ||
    norm.includes('giao hang mat bao lau') ||
    norm.includes('ship toan quoc khong')
  ) {
    let upsellNote = ''
    if (liveFacts.cartUpsellFact) {
      upsellNote = `\n\n💡 ${liveFacts.cartUpsellFact}`
    }

    return {
      handled: true,
      intentName: 'POLICY_SHIPPING',
      reply:
        'Dạ QuanNguyenS MIỄN PHÍ VẬN CHUYỂN toàn quốc cho đơn hàng từ 500.000đ trở lên ạ! Đơn dưới 500.000đ áp dụng phí ship đồng giá tiêu chuẩn 30.000đ.\n\n• Nội thành Hà Nội: 1–2 ngày làm việc.\n• Tỉnh thành khác: 2–4 ngày làm việc.\n• Dòng đặt may thủ công (Pre-order): 7–10 ngày làm việc.\nĐặc biệt, quý khách được đồng kiểm gói hàng cùng nhân viên bưu tá trước khi nhận nhé ạ!' +
        upsellNote,
      quickReplies: ['Chính sách đổi trả', 'Xem mẫu pijama', 'Thanh toán VietQR'],
      usedTier: 'tier-0',
    }
  }

  // 5. Hỏi về Mã Giảm Giá / Voucher / Ưu đãi
  if (
    norm.includes('voucher') ||
    norm.includes('ma giam gia') ||
    norm.includes('khuyen mai') ||
    norm.includes('uu dai') ||
    norm.includes('ma khuyen mai') ||
    norm.includes('co giam gia khong')
  ) {
    const vouchers = liveFacts.activeVouchers
    let voucherText = ''
    if (vouchers.length > 0) {
      voucherText = vouchers.map((v) => `• ${v.label}`).join('\n')
    } else {
      voucherText = '• Hiện tại shop đang áp dụng ưu đãi Giảm 10% trực tiếp khi chọn Thanh toán Chuyển khoản VietQR.'
    }

    return {
      handled: true,
      intentName: 'VOUCHER_QUERY',
      reply:
        `Dạ QuanNguyenS hiện có các chương trình ưu đãi thực tế sau ạ:\n\n${voucherText}\n• Giảm 10% TRỰC TIẾP trên tổng đơn khi thanh toán Chuyển khoản VietQR (Napas 24/7).\n• Miễn phí vận chuyển toàn quốc cho đơn từ 500.000đ.\n\nAnh/chị chỉ cần nhập mã tại trang thanh toán là được trừ tiền ngay ạ!`,
      quickReplies: ['Cách áp mã', 'Tư vấn chọn size', 'Xem giỏ hàng'],
      usedTier: 'tier-0',
    }
  }

  // 6. Hỏi về Chính Sách Đổi Trả / Bảo Hành
  if (
    norm.includes('doi tra') ||
    norm.includes('tra hang') ||
    norm.includes('bao hanh') ||
    norm.includes('mac khong vua co duoc doi') ||
    norm.includes('doi size')
  ) {
    return {
      handled: true,
      intentName: 'POLICY_RETURN',
      reply:
        'Dạ QuanNguyenS cam kết đồng hành cùng trải nghiệm của anh/chị với chính sách đổi trả trong vòng 30 ngày kể từ khi nhận hàng nếu có bất kỳ điểm nào chưa ưng ý về chất lượng vải hay đường may. Trong trường hợp cần chỉnh sửa thông tin hoặc đổi size trước khi xuất kho, anh/chị có thể báo shop trong vòng 1 giờ sau khi đặt hàng nhé ạ!',
      quickReplies: ['Tư vấn chọn size chuẩn', 'Hotline hỗ trợ', 'Gặp chủ shop'],
      usedTier: 'tier-0',
    }
  }

  // 7. Hỏi về Phương Thức Thanh Toán (COD / VietQR)
  if (
    norm.includes('thanh toan') ||
    norm.includes('chuyen khoan') ||
    norm.includes('co cod khong') ||
    norm.includes('ship cod') ||
    norm.includes('vietqr')
  ) {
    return {
      handled: true,
      intentName: 'POLICY_PAYMENT',
      reply:
        'Dạ QuanNguyenS hỗ trợ 2 phương thức thanh toán linh hoạt và an toàn:\n1. Thanh toán khi nhận hàng (COD): Nhận hàng kiểm tra rồi mới trả tiền cho shipper.\n2. Chuyển khoản VietQR / Napas 24/7: Nhận ngay ưu đãi GIẢM 10% TRỰC TIẾP trên tổng giá trị đơn hàng (Quét mã VietQR tự động, bảo mật và tiện lợi) ạ!',
      quickReplies: ['Xem ưu đãi VietQR', 'Chính sách giao hàng', 'Gặp chủ shop'],
      usedTier: 'tier-0',
    }
  }

  // 8. Hỏi Địa chỉ Cửa hàng / Showroom
  if (
    norm.includes('dia chi') ||
    norm.includes('cua hang o dau') ||
    norm.includes('shop o dau') ||
    norm.includes('o dau ha noi') ||
    norm.includes('showroom')
  ) {
    return {
      handled: true,
      intentName: 'STORE_INFO',
      reply:
        `Dạ xưởng may và không gian trưng bày của QuanNguyenS tọa lạc tại:\n📍 ${liveFacts.shopAddress}.\n📞 Hotline/Zalo tư vấn 24/7: ${liveFacts.hotline}.\nWebsite: https://quannguyens.com\n\nShop hỗ trợ giao hàng tận nơi trên toàn quốc và đồng kiểm khi nhận hàng ạ!`,
      quickReplies: ['Chat Zalo', 'Gọi Hotline', 'Xem 3 mẫu pijama'],
      usedTier: 'tier-0',
    }
  }

  // 9. Hỏi Tra cứu đơn hàng / Đơn hàng ở đâu
  if (
    norm.includes('tra cuu don') ||
    norm.includes('don hang cua toi') ||
    norm.includes('kiem tra don') ||
    norm.includes('don o dau roi') ||
    norm.includes('ma van don')
  ) {
    return {
      handled: true,
      intentName: 'ORDER_LOOKUP',
      reply:
        'Dạ để bảo mật thông tin cá nhân và đơn hàng của anh/chị, em không thể truy vấn trực tiếp chi tiết đơn hàng trong khung chat này. Anh/chị có thể dễ dàng kiểm tra:\n• Link tra cứu trực tiếp trong Email xác nhận đặt hàng.\n• Hoặc vào mục "Tài Khoản" tại website https://quannguyens.com/tai-khoan để xem hành trình Viettel Post.\nNếu cần hỗ trợ gấp, em xin phép kết nối ngay cùng chủ shop nhé ạ!',
      quickReplies: ['Gặp chủ shop', 'Gọi Hotline 0981753082'],
      handoff: {
        active: true,
        zalo: liveFacts.zaloLink,
        tel: `tel:${liveFacts.hotline}`,
        phoneDisplay: liveFacts.hotline,
      },
      usedTier: 'tier-0',
    }
  }

  // 10. Bảng size chung nếu khách hỏi vắn tắt "bảng size", "tư vấn size"
  if (
    norm === 'bang size' ||
    norm === 'size' ||
    norm === 'chon size' ||
    norm === 'tu van size' ||
    norm === 'tu van chon size'
  ) {
    return {
      handled: true,
      intentName: 'SIZE_GUIDE',
      reply:
        'Dạ QuanNguyenS có bảng size chuẩn thiết kế theo vóc dáng người Việt:\n\n• Size S: Cân nặng 40–50 kg · Chiều cao 150–162 cm\n• Size M: Cân nặng 50–58 kg · Chiều cao 158–168 cm\n• Size L: Cân nặng 58–66 kg · Chiều cao 162–172 cm (dành cho mẫu THE STILLWATER SET)\n\nAnh/chị cho em xin chiều cao và cân nặng để em chọn size vừa vặn và thoải mái nhất cho mình nhé!',
      quickReplies: ['Mẫu The Daybreak (Hồng)', 'Mẫu The Stillwater (Navy)', 'Mẫu The Hearth (Nâu)'],
      usedTier: 'tier-0',
    }
  }

  // Không khớp quy tắc Tầng 0 -> chuyển sang xử lý Tầng 1 (LLM)
  return { handled: false }
}
