import heroCampaignImg from '../assets/images/hero-campaign.jpg'
import productCollectionImg from '../assets/images/product-collection.jpg'
import lifestyleNightImg from '../assets/images/lifestyle-night.jpg'
import craftsmanshipImg from '../assets/images/craftsmanship-detail.jpg'
import fabricMacroImg from '../assets/images/fabric-macro.jpg'

export const products = [
  {
    id: 'qns-pijama-navy-check',
    name: 'Bộ Pijama Đũi Kẻ Caro Cổ V',
    subtitle: 'Navy Plaid Check / Xanh Than',
    tagline: 'Thanh lịch & Nam tính cổ điển',
    category: 'Bộ Dài Tay',
    price: '599.000₫',
    priceRaw: 599000,
    originalPrice: '750.000₫',
    colorName: 'Xanh Than Kẻ / Navy Check',
    colorHex: '#1B2A4A',
    badge: 'Mới Nhất',
    isNew: true,
    image: productCollectionImg,
    secondaryImage: lifestyleNightImg,
    description: 'Họa tiết kẻ caro xanh than lịch lãm viền trắng chỉn chu. Vải đũi dệt sợi đôi dày dặn nhưng cực kỳ thoáng khí, cổ bẻ thanh lịch, túi ngực tiện dụng.',
    details: [
      '100% Sợi đũi tự nhiên pha tơ tằm mềm mát',
      'Đường viền cúp ngực & tay áo may thủ công',
      'Phom suông thoải mái cả ngày lẫn đêm',
      'Kháng khuẩn tự nhiên, khử mùi vượt trội'
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'qns-pijama-pink-stripe',
    name: 'Bộ Pijama Đũi Sọc Dọc Pastel',
    subtitle: 'Dusty Pink Stripe / Hồng Phấn',
    tagline: 'Ngọt ngào & Dịu dàng nữ tính',
    category: 'Bộ Dài Tay',
    price: '599.000₫',
    priceRaw: 599000,
    originalPrice: '750.000₫',
    colorName: 'Sọc Hồng Pastel / Soft Rose',
    colorHex: '#E2A9A1',
    badge: 'Yêu Thích Nhất',
    isHot: true,
    image: lifestyleNightImg,
    secondaryImage: productCollectionImg,
    description: 'Sọc dọc màu hồng phấn dịu mắt phối trắng, đường may viền nẹp tinh tế. Sợi đũi vi sinh xoa mềm mang lại cảm giác vuốt ve làn da êm ái tuyệt đối.',
    details: [
      'Tông màu nhuộm thực vật dịu dàng',
      'Đường may viền trắng cổ & gấu quần sắc nét',
      'Cực kỳ nhẹ tênh, không dính bết mồ hôi',
      'Hộp quà sang trọng thích hợp làm quà tặng'
    ],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 'qns-pijama-oatmeal-classic',
    name: 'Bộ Pijama Đũi Classic Trắng Ngà',
    subtitle: 'Warm Oatmeal / Trắng Tự Nhiên',
    tagline: 'Quiet Luxury & Thuần khiết',
    category: 'Bộ Dài Tay',
    price: '599.000₫',
    priceRaw: 599000,
    originalPrice: '750.000₫',
    colorName: 'Trắng Ngà / Warm Oatmeal',
    colorHex: '#F5F0EB',
    badge: 'Bán Chạy Nhất',
    isBestSeller: true,
    image: heroCampaignImg,
    secondaryImage: craftsmanshipImg,
    description: 'Gam màu mộc mạc nguyên bản của sợi đũi tự nhiên không tẩy trắng hóa học. Đính cúc mộc dừa thủ công, đường may lộn giấu chỉ hoàn mỹ.',
    details: [
      'Đũi mộc 100% nguyên bản thân thiện làn da',
      'Cúc mộc dừa tự nhiên đánh bóng thủ công',
      'May giấu chỉ French seams không gây cấn da',
      'Càng giặt qua nước càng trắng sáng mềm mại'
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  },
  {
    id: 'qns-pijama-charcoal-short',
    name: 'Bộ Pijama Đũi Cộc Xám Than',
    subtitle: 'Slate Charcoal / Xám Than Đêm',
    tagline: 'Mát lành & Tiện lợi ngày hè',
    category: 'Bộ Cộc Tay',
    price: '549.000₫',
    priceRaw: 549000,
    originalPrice: '690.000₫',
    colorName: 'Xám Than / Slate Charcoal',
    colorHex: '#334155',
    badge: 'Mùa Hè',
    image: craftsmanshipImg,
    secondaryImage: fabricMacroImg,
    description: 'Thiết kế áo cộc tay quần lửng năng động, hoàn hảo cho những đêm hè oi bức 35°C. Sợi vi xốp mở rộng giải nhiệt cấp tốc cho cơ thể.',
    details: [
      'Áo cộc tay + Quần sooc lửng thoải mái',
      'Thấm hút mồ hôi & khô thoáng gấp 3 lần cotton',
      'Lưng thun co giãn êm ái không hằn bụng',
      'Mặc nhà, dạo phố hoặc đi du lịch nghỉ dưỡng'
    ],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 'qns-pijama-sage-green',
    name: 'Bộ Pijama Đũi Xanh Sage',
    subtitle: 'Pale Sage / Xanh Bạc Hà Thảo Mộc',
    tagline: 'Thư thái giác quan & Bình yên',
    category: 'Bộ Dài Tay',
    price: '599.000₫',
    priceRaw: 599000,
    originalPrice: '750.000₫',
    colorName: 'Xanh Sage / Pale Sage',
    colorHex: '#788779',
    badge: 'Xu Hướng',
    image: fabricMacroImg,
    secondaryImage: lifestyleNightImg,
    description: 'Sắc xanh thảo mộc thanh thoát xua tan căng thẳng mệt mỏi sau ngày dài làm việc. Phom dáng suông rủ tự nhiên chuẩn phong thái slow-living.',
    details: [
      'Chiết xuất màu từ lá xô thơm tự nhiên',
      'Độ thoáng mát tối đa đạt chứng nhận an toàn',
      'Không phai màu sau hàng trăm lần giặt',
      'Đổi size miễn phí 30 ngày tận nhà'
    ],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 'qns-pijama-taupe-earth',
    name: 'Bộ Pijama Đũi Nâu Đất Taupe',
    subtitle: 'Muted Cocoa / Nâu Trầm Tinh Tế',
    tagline: 'Ấm áp & Sang trọng đương đại',
    category: 'Bộ Dài Tay',
    price: '599.000₫',
    priceRaw: 599000,
    originalPrice: '750.000₫',
    colorName: 'Nâu Đất / Muted Taupe',
    colorHex: '#8C7E74',
    badge: 'Phiên Bản Giới Hạn',
    image: productCollectionImg,
    secondaryImage: heroCampaignImg,
    description: 'Gam màu taupe trầm ấm độc đáo kết hợp cùng chất đũi tự nhiên. Đem lại vẻ đẹp thanh lịch, kín đáo nhưng đầy cuốn hút cho gia chủ.',
    details: [
      'Tông màu đất thanh lịch chuẩn Quiet Luxury',
      'Độ rủ mềm mại ôm nhẹ cử động cơ thể',
      'Hai túi hông sâu tiện dụng đựng điện thoại',
      'Bảo hành đường may 1 năm miễn phí'
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL']
  }
]
