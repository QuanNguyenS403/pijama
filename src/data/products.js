import heroCampaignImg from '../assets/images/hero-campaign.jpg'
import productCollectionImg from '../assets/images/product-collection.jpg'
import lifestyleNightImg from '../assets/images/lifestyle-night.jpg'
import craftsmanshipImg from '../assets/images/craftsmanship-detail.jpg'
import fabricMacroImg from '../assets/images/fabric-macro.jpg'

export const products = [
  {
    id: "the-classic-set",
    slug: "the-classic-set",
    name: "THE CLASSIC SET",
    subtitle: "Pijama Phong Cách Châu Âu · Hai Mẫu",
    collection: "Thu Đông 2025",
    badge: "MỚI RA MẮT",

    description: `Bộ pijama lấy cảm hứng từ phong cách ngủ cổ điển châu Âu —
    đường viền tương phản tinh tế, cổ áo notch thanh lịch, và phom dáng
    suông tự do cho cảm giác thoải mái trọn ngày. Có hai mẫu hoa văn
    để lựa chọn: sọc dọc hồng ngọt ngào và caro navy lịch lãm.`,

    longDescription: `THE CLASSIC SET được thiết kế để mang lại cảm giác
    như mặc đồ ngủ của một khách sạn 5 sao — mỗi ngày. Hai mẫu hoa văn
    phản ánh hai trạng thái: Pink Stripe cho những buổi sáng nhẹ nhàng,
    dịu dàng; Navy Plaid cho vẻ ngoài có chủ đích hơn, vừa chill vừa có
    phong cách. Cả hai đều có thể mặc ra ngoài mà không cần giải thích gì thêm.`,

    detailedDescription: `THE CLASSIC SET lấy cảm hứng từ đồ ngủ của các khách sạn boutique châu Âu — nơi pijama không chỉ là đồ ngủ mà là một phần của phong cách sống.

Thiết kế notch collar (cổ áo bẻ cổ) với viền tương phản trắng chạy dọc cổ áo, cổ tay, và viền túi — tạo nên điểm nhấn tinh tế mà có chủ đích. Hàng cúc phía trước, hai túi patch phía dưới và một túi ngực nhỏ hoàn thiện phom dáng cổ điển.

Quần dáng thẳng (straight-leg) với độ rủ tự nhiên — không quá rộng để mặc ở nhà, không quá bó để không thể ra ngoài.

Có trong hai mẫu hoa văn: Pink Stripe (sọc dọc hồng trắng) và Navy Plaid (caro navy xám trắng). Mỗi mẫu được sản xuất có giới hạn.`,

    tagline: `Chọn theo mood hôm nay — sọc hồng nhẹ nhàng hay caro navy có chủ đích?`,
    sectionLabel: "BST THU ĐÔNG 2025 · HAI MẪU",

    price: 390000,
    originalPrice: 490000,
    discount: 20,
    rating: 4.9,
    reviewCount: 64,

    // ─── STYLE VARIANTS (treated as "colors" in the UI selector) ─────────────
    colors: [
      {
        name: "Pink Stripe",
        label: "Sọc Hồng",
        hex: "#F2C4CE",          // representative swatch color
        patternPreview: true,    // flag: render pattern thumbnail, not plain swatch
        patternType: "stripe",   // used by ColorSelector to pick preview style
        stock: { S: 10, M: 8 },
      },
      {
        name: "Navy Plaid",
        label: "Caro Navy",
        hex: "#1B2A4A",
        patternPreview: true,
        patternType: "plaid",
        stock: { S: 8, M: 10 },
      },
    ],

    // ─── SIZES — only S and M ────────────────────────────────────────────────
    sizes: ["S", "M"],

    // ─── SIZE GUIDE — from reference image (Bảng Size) ────────────────────
    sizeGuide: {
      S: {
        weight: "40–49 kg",
        trouserLength: "90 cm",
        sleeveLength: "53,5 cm",
      },
      M: {
        weight: "50–55 kg",
        trouserLength: "92 cm",
        sleeveLength: "54,5 cm",
      },
    },

    fabric: "Chất liệu tự nhiên cao cấp — được tuyển chọn",
    fabricDetail: "Sợi tự nhiên · Kiểm định xuất khẩu · Không hóa chất tổng hợp",

    careInstructions: [
      "Giặt tay hoặc máy chế độ nhẹ (delicate)",
      "Nước lạnh hoặc ấm — tối đa 30°C",
      "Không sử dụng thuốc tẩy mạnh",
      "Phơi bóng mát, tránh ánh nắng trực tiếp",
      "Không sấy máy",
      "Ủi nhiệt độ thấp nếu cần",
    ],

    returnPolicy: "Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Liên hệ hotline 0981 753 082 để được hỗ trợ",

    highlights: [
      "Viền tương phản trắng tinh tế — điểm nhấn thương hiệu trên từng đường may",
      "Phom dáng suông tự do — ôm đẹp mọi vóc dáng, thoải mái từ nhà ra phố",
      "Hai hoa văn độc lập — chọn theo mood, không cần suy nghĩ nhiều",
    ],

    tags: ["Mới Ra Mắt", "Classic", "Casual", "European Style"],
    relatedProducts: ["the-cafe-look", "the-evening-edit"],

    // ─── IMAGE MAP — keyed by color.name ─────────────────────────────────────
    images: {
      "Pink Stripe": [
        "/images/classic-set-pink-main.jpg",
        "/images/classic-set-pink-thumb-1.jpg",
        "/images/classic-set-pink-thumb-2.jpg",
        "/images/classic-set-pink-thumb-3.jpg",
        "/images/classic-set-pink-detail.jpg",
      ],
      "Navy Plaid": [
        "/images/classic-set-navy-main.jpg",
        "/images/classic-set-navy-thumb-1.jpg",
        "/images/classic-set-navy-thumb-2.jpg",
        "/images/classic-set-navy-thumb-3.jpg",
        "/images/classic-set-navy-detail.jpg",
      ],
    },
  },
  {
    id: 'the-cafe-look',
    slug: 'the-cafe-look',
    name: 'THE CAFÉ LOOK',
    subtitle: 'Pijama Thiết Kế Cổ V · Viền Tương Phản',
    collection: 'Thu Đông 2026',
    badge: 'MỚI',
    description: 'Thiết kế cổ V thanh lịch với đường viền tương phản nổi bật — Phong cách tối giản châu Âu cho buổi sáng cà phê hoặc cả ngày ở nhà',
    longDescription: 'THE CAFÉ LOOK mang đến vẻ đẹp tinh tế với cổ V sâu vừa phải và đường viền tương phản màu đất nung. Được chế tác từ chất vải mềm mại tự nhiên, phù hợp từ buổi sáng uống cà phê đọc sách đến buổi chiều làm việc tại nhà.',
    price: 550000,
    originalPrice: null,
    discount: 0,
    rating: 4.8,
    reviewCount: 43,
    images: [
      heroCampaignImg,
      productCollectionImg,
      lifestyleNightImg,
      craftsmanshipImg,
    ],
    colors: [
      { name: 'Ivory Cream', hex: '#FAF8F5', stock: { S: 6, M: 8, L: 5, XL: 3 } },
      { name: 'Sand',        hex: '#D4AF37', stock: { S: 4, M: 6, L: 4, XL: 2 } },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    sizeGuide: {
      S:  { chest: '81–85', waist: '65–69', hip: '89–93',   height: '155–160' },
      M:  { chest: '86–90', waist: '70–74', hip: '94–98',   height: '158–163' },
      L:  { chest: '91–96', waist: '75–80', hip: '99–104',  height: '162–167' },
      XL: { chest: '97–102', waist: '81–86', hip: '105–110', height: '165–170' },
    },
    fabric: 'Chất liệu tự nhiên cao cấp — được tuyển chọn',
    fabricDetail: 'Sợi tự nhiên · Kiểm định xuất khẩu · Không hóa chất tổng hợp',
    careInstructions: [
      'Giặt tay hoặc máy chế độ nhẹ (delicate)',
      'Nước lạnh hoặc ấm — tối đa 30°C',
      'Không sử dụng chất tẩy mạnh hoặc thuốc tẩy trắng',
      'Phơi trong bóng mát, tránh ánh nắng trực tiếp',
      'Không sấy máy — để vải giữ form tự nhiên',
      'Ủi ở nhiệt độ thấp nếu cần — vải sẽ tự rũ đẹp khi mặc',
    ],
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng',
    highlights: [
      'Chất liệu mềm mại tự nhiên — thoáng theo từng nhịp thở',
      'Cổ V thanh lịch, viền tương phản nổi bật',
      'Dáng relaxed fit — thoải mái suốt ngày dài',
    ],
    tags: ['Mới', 'Chất Liệu Cao Cấp', 'Café Style'],
    relatedProducts: ['the-classic-set', 'the-evening-edit'],
  },
  {
    id: 'the-evening-edit',
    slug: 'the-evening-edit',
    name: 'THE EVENING EDIT',
    subtitle: 'Pijama Wide-Leg Cao Cấp · Phiên Bản Giới Hạn',
    collection: 'Thu Đông 2026',
    badge: 'GIỚI HẠN',
    description: 'Dáng wide-leg sang trọng, tone-on-tone phối màu — Bộ sưu tập giới hạn dành cho những ai yêu phong cách tối thượng',
    longDescription: 'THE EVENING EDIT là đỉnh cao của dòng sản phẩm QuanNguyenS — wide-leg trousers kết hợp áo blazer nhẹ bằng chất liệu tự nhiên cao cấp. Tone-on-tone tinh tế, phù hợp ăn tối ngoài hoặc buổi tối ở nhà sang trọng.',
    price: 750000,
    originalPrice: null,
    discount: 0,
    rating: 5.0,
    reviewCount: 18,
    images: [
      lifestyleNightImg,
      craftsmanshipImg,
      heroCampaignImg,
      fabricMacroImg,
    ],
    colors: [
      { name: 'Deep Wine',  hex: '#4A0D17', stock: { S: 3, M: 4, L: 2, XL: 1 } },
      { name: 'Charcoal',   hex: '#2C201A', stock: { S: 2, M: 3, L: 3, XL: 2 } },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    sizeGuide: {
      S:  { chest: '81–85', waist: '65–69', hip: '89–93',   height: '155–160' },
      M:  { chest: '86–90', waist: '70–74', hip: '94–98',   height: '158–163' },
      L:  { chest: '91–96', waist: '75–80', hip: '99–104',  height: '162–167' },
      XL: { chest: '97–102', waist: '81–86', hip: '105–110', height: '165–170' },
    },
    fabric: 'Chất liệu tự nhiên cao cấp — được tuyển chọn',
    fabricDetail: 'Sợi tự nhiên · Kiểm định xuất khẩu · Không hóa chất tổng hợp',
    careInstructions: [
      'Giặt tay nhẹ nhàng',
      'Nước lạnh dưới 25°C',
      'Không sử dụng chất tẩy mạnh',
      'Phơi trong bóng mát',
      'Không sấy khô',
      'Ủi nhiệt độ thấp nhất',
    ],
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng',
    highlights: [
      'Chất vải thủ công thượng hạng — độ rũ hoàn hảo',
      'Dáng wide-leg sang trọng, tone-on-tone phối màu',
      'Bộ sưu tập giới hạn — chuẩn xuất khẩu châu Âu',
    ],
    tags: ['Giới Hạn', 'Premium', 'Wide-Leg', 'Chất Liệu Cao Cấp'],
    relatedProducts: ['the-classic-set', 'the-cafe-look'],
  },
]

export const sampleReviews = [
  {
    id: 'rv-1',
    productId: 'the-classic-set',
    name: 'Nguyễn Thị Minh',
    date: '12/07/2025',
    rating: 5,
    color: 'Pink Stripe',
    size: 'M',
    verified: true,
    text: 'Vải mềm quá trời! Mình mua mẫu Sọc Hồng mặc ở nhà mà người nhà cứ khen sang. Viền trắng rất tinh tế, chất lượng xứng đáng với giá tiền.',
  },
  {
    id: 'rv-2',
    productId: 'the-classic-set',
    name: 'Trần Thị Lan Anh',
    date: '28/06/2025',
    rating: 5,
    color: 'Navy Plaid',
    size: 'S',
    verified: true,
    text: 'Đóng gói đẹp lắm, mua làm quà tặng sinh nhật bạn thân là chuẩn. Mẫu Caro Navy bên ngoài nhìn cực kỳ thanh lịch và sắc nét. Rất hài lòng.',
  },
  {
    id: 'rv-3',
    productId: 'the-classic-set',
    name: 'Phạm Quỳnh Trang',
    date: '15/06/2025',
    rating: 5,
    color: 'Pink Stripe',
    size: 'S',
    verified: true,
    text: 'Mình 48kg cao 1m58 chọn size S vừa vặn tuyệt đối theo bảng size. Phom dáng suông rộng rãi thoải mái cực kỳ, mặc ra ngoài mua đồ vẫn tự tin.',
  },
  {
    id: 'rv-4',
    productId: 'the-classic-set',
    name: 'Lê Hoàng Mai',
    date: '03/06/2025',
    rating: 5,
    color: 'Navy Plaid',
    size: 'M',
    verified: true,
    text: 'Chất vải tự nhiên rất tốt, thoáng khí và nhẹ nhàng. Phom áo notch collar viền trắng nhìn như đồ ngủ khách sạn 5 sao. 10/10!',
  },
  {
    id: 'rv-5',
    productId: 'the-classic-set',
    name: 'Đỗ Thu Hà',
    date: '20/05/2025',
    rating: 5,
    color: 'Pink Stripe',
    size: 'M',
    verified: true,
    text: 'Sọc hồng ngọt ngào, đường may kỹ càng. Mình mặc tiếp khách tại nhà mà ai cũng hỏi mua ở đâu. Sẽ ủng hộ shop thêm!',
  },
]
