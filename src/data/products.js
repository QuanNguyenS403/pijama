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
    subtitle: "Pijama Phong Cách Châu Âu · Ba Mẫu",
    collection: "Thu Đông 2026",
    badge: "MỚI RA MẮT",

    description: `Bộ pijama lấy cảm hứng từ phong cách ngủ cổ điển châu Âu —
    đường viền tương phản tinh tế, cổ áo notch thanh lịch, và phom dáng
    suông tự do cho cảm giác thoải mái trọn ngày. Có ba mẫu hoa văn
    để lựa chọn: sọc dọc hồng ngọt ngào, caro navy lịch lãm và sọc nâu mocha ấm áp sang trọng.`,

    longDescription: `THE CLASSIC SET được thiết kế để mang lại cảm giác
    như mặc đồ ngủ của một khách sạn 5 sao — mỗi ngày. Ba mẫu hoa văn
    phản ánh ba trạng thái: Pink Stripe cho những buổi sáng nhẹ nhàng,
    dịu dàng; Navy Plaid cho vẻ ngoài có chủ đích hơn, vừa chill vừa có
    phong cách; Brown Stripe mang nét cổ điển, ấm áp và thanh lịch vượt thời gian.
    Cả ba đều có thể mặc ra ngoài mà không cần giải thích gì thêm.`,

    detailedDescription: `THE CLASSIC SET lấy cảm hứng từ đồ ngủ của các khách sạn boutique châu Âu — nơi pijama không chỉ là đồ ngủ mà là một phần của phong cách sống.

Thiết kế notch collar (cổ áo bẻ cổ) với viền tương phản trắng chạy dọc cổ áo, cổ tay, và viền túi — tạo nên điểm nhấn tinh tế mà có chủ đích. Hàng cúc phía trước, hai túi patch phía dưới và một túi ngực nhỏ hoàn thiện phom dáng cổ điển.

Quần dáng thẳng (straight-leg) với độ rủ tự nhiên — không quá rộng để mặc ở nhà, không quá bó để không thể ra ngoài.

Có trong ba mẫu hoa văn: Pink Stripe (sọc dọc hồng trắng), Navy Plaid (caro navy xám trắng) và Brown Stripe (sọc dọc nâu mocha). Mỗi mẫu được sản xuất có giới hạn.`,

    tagline: `Chọn theo mood hôm nay — sọc hồng nhẹ nhàng, caro navy lịch lãm hay sọc nâu ấm áp?`,
    sectionLabel: "BST THU ĐÔNG 2026 · BA MẪU",

    price: 390000,
    originalPrice: 490000,
    discount: 20,
    rating: 4.9,
    reviewCount: 78,

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
      {
        name: "Brown Stripe",
        label: "Sọc Nâu",
        hex: "#5C3A21",
        patternPreview: true,
        patternType: "brown-stripe",
        stock: { S: 10, M: 10 },
      },
    ],

    // ─── SIZES — only S and M ────────────────────────────────────────────────
    sizes: ["S", "M"],

    // ─── SIZE GUIDE — Bảng Size chuẩn hóa cho THE CLASSIC SET ─────────────
    sizeGuide: {
      S: {
        weight: "40–49 kg",
        height: "150–160 cm",
        chest: "82–88 cm",
        waist: "62–70 cm",
        trouserLength: "90 cm",
        sleeveLength: "53,5 cm",
      },
      M: {
        weight: "50–58 kg",
        height: "158–168 cm",
        chest: "89–95 cm",
        waist: "71–78 cm",
        trouserLength: "92 cm",
        sleeveLength: "54,5 cm",
      },
    },

    fabric: "100% Sợi Tự Nhiên Cao Cấp (Natural Plant-Based Cotton-Modal Blend)",
    fabricDetail: "Định lượng 165 GSM · Dệt thoi vân chéo thoáng khí 4 mùa · Tiêu chuẩn OEKO-TEX Standard 100 an toàn cho da",

    careInstructions: [
      "Giặt tay hoặc máy chế độ nhẹ (delicate)",
      "Nước lạnh hoặc ấm — tối đa 30°C",
      "Không sử dụng thuốc tẩy mạnh",
      "Phơi bóng mát, tránh ánh nắng trực tiếp",
      "Không sấy máy",
      "Ủi nhiệt độ thấp nếu cần",
    ],

    returnPolicy: "Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size/màu tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ",

    highlights: [
      "Viền tương phản trắng tinh tế — điểm nhấn thương hiệu trên từng đường may",
      "Phom dáng suông tự do — ôm đẹp mọi vóc dáng, thoải mái từ nhà ra phố",
      "Ba hoa văn độc lập — chọn theo mood, không cần suy nghĩ nhiều",
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
      "Brown Stripe": [
        "/images/classic-set-brown-main.jpg",
        "/images/classic-set-brown-thumb-1.jpg",
        "/images/classic-set-brown-thumb-2.jpg",
        "/images/classic-set-brown-thumb-3.jpg",
        "/images/classic-set-brown-detail.jpg",
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
      S:  { weight: '40–49 kg', height: '150–160 cm', chest: '82–86 cm', waist: '64–69 cm', trouserLength: '91 cm', sleeveLength: '53 cm' },
      M:  { weight: '50–57 kg', height: '158–165 cm', chest: '87–92 cm', waist: '70–75 cm', trouserLength: '93 cm', sleeveLength: '54 cm' },
      L:  { weight: '58–65 kg', height: '163–170 cm', chest: '93–98 cm', waist: '76–82 cm', trouserLength: '95 cm', sleeveLength: '55 cm' },
      XL: { weight: '66–75 kg', height: '168–175 cm', chest: '99–106 cm', waist: '83–90 cm', trouserLength: '97 cm', sleeveLength: '56 cm' },
    },
    fabric: '95% Modal Sợi Gỗ Tự Nhiên & 5% Spandex Cao Cấp',
    fabricDetail: 'Định lượng 180 GSM · Xử lý vi sinh xoa mềm bề mặt · Cảm giác mướt mát, chống nhăn tự nhiên',
    careInstructions: [
      'Giặt tay hoặc máy chế độ nhẹ (delicate)',
      'Nước lạnh hoặc ấm — tối đa 30°C',
      'Không sử dụng chất tẩy mạnh hoặc thuốc tẩy trắng',
      'Phơi trong bóng mát, tránh ánh nắng trực tiếp',
      'Không sấy máy — để vải giữ form tự nhiên',
      'Ủi ở nhiệt độ thấp nếu cần — vải sẽ tự rũ đẹp khi mặc',
    ],
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size/màu tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ',
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
      S:  { weight: '42–50 kg', height: '152–162 cm', chest: '82–86 cm', waist: '64–70 cm', trouserLength: '94 cm', sleeveLength: '54 cm' },
      M:  { weight: '51–58 kg', height: '160–167 cm', chest: '87–93 cm', waist: '71–77 cm', trouserLength: '96 cm', sleeveLength: '55 cm' },
      L:  { weight: '59–66 kg', height: '165–172 cm', chest: '94–100 cm', waist: '78–84 cm', trouserLength: '98 cm', sleeveLength: '56 cm' },
      XL: { weight: '67–76 kg', height: '168–176 cm', chest: '101–108 cm', waist: '85–92 cm', trouserLength: '100 cm', sleeveLength: '57 cm' },
    },
    fabric: '100% Tencel Lyocell Thượng Hạng Dáng Rủ',
    fabricDetail: 'Định lượng 190 GSM · Dệt bóng mờ tone-on-tone sang trọng · Thấm hút gấp 1.5 lần cotton, mềm rũ tự nhiên',
    careInstructions: [
      'Giặt tay nhẹ nhàng',
      'Nước lạnh dưới 25°C',
      'Không sử dụng chất tẩy mạnh',
      'Phơi trong bóng mát',
      'Không sấy khô',
      'Ủi nhiệt độ thấp nhất',
    ],
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size/màu tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ',
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
    date: '12/07/2026',
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
    date: '28/06/2026',
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
    date: '15/06/2026',
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
    date: '03/06/2026',
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
    date: '20/05/2026',
    rating: 5,
    color: 'Pink Stripe',
    size: 'M',
    verified: true,
    text: 'Sọc hồng ngọt ngào, đường may kỹ càng. Mình mặc tiếp khách tại nhà mà ai cũng hỏi mua ở đâu. Sẽ ủng hộ shop thêm!',
  },
  {
    id: 'rv-6',
    productId: 'the-classic-set',
    name: 'Vũ Thanh Hương',
    date: '18/08/2026',
    rating: 5,
    color: 'Brown Stripe',
    size: 'M',
    verified: true,
    text: 'Mẫu Sọc Nâu đẹp xuất sắc ngoài đời, tone nâu mocha rất tôn da và sang trọng. Đường may tỉ mỉ, chất vải mặc siêu mát và nhẹ.',
  },
  {
    id: 'rv-7',
    productId: 'the-cafe-look',
    name: 'Hoàng Yến Nhi',
    date: '14/08/2026',
    rating: 5,
    color: 'Ivory Cream',
    size: 'M',
    verified: true,
    text: 'Cổ V rất tôn dáng cổ và xương quai xanh, viền tương phản màu đất nung nhìn sang trọng tinh tế. Chất modal mềm mướt như lụa.',
  },
  {
    id: 'rv-8',
    productId: 'the-cafe-look',
    name: 'Ngô Bảo Trâm',
    date: '02/08/2026',
    rating: 5,
    color: 'Sand',
    size: 'S',
    verified: true,
    text: 'Màu Sand bên ngoài ấm áp nhẹ nhàng, mặc đi cafe sáng cuối tuần kết hợp khoác blazer mỏng cực kỳ sành điệu.',
  },
  {
    id: 'rv-9',
    productId: 'the-evening-edit',
    name: 'Phan Minh Anh',
    date: '10/08/2026',
    rating: 5,
    color: 'Deep Wine',
    size: 'M',
    verified: true,
    text: 'Chất vải Tencel rũ đẹp tuyệt vời, dáng wide-leg bước đi rất bay bổng và quyền lực. Đáng từng đồng bỏ ra!',
  },
  {
    id: 'rv-10',
    productId: 'the-evening-edit',
    name: 'Trương Cẩm Nhung',
    date: '25/07/2026',
    rating: 5,
    color: 'Charcoal',
    size: 'L',
    verified: true,
    text: 'Màu Charcoal tone-on-tone sang chảnh tối thượng. Đường may sắc nét đúng chuẩn xuất khẩu châu Âu. Đóng hộp quà cao cấp.',
  },
]
