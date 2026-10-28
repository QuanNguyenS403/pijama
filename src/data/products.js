// 🔒 DỮ LIỆU ĐÃ KHOÁ — xem PROTECTED-DATA.md trước khi sửa file này.
// Chỉ chỉnh sửa khi có yêu cầu rõ ràng, cụ thể nhắm đúng vào nội dung file này.
export const products = [
  {
    id: "the-classic-set",
    slug: "the-classic-set",
    name: "THE DAYBREAK SET",
    subtitle: "Pijama Phong Cách Châu Âu · Sọc Hồng Nắng Sớm",
    collection: "Thu Đông 2026",
    badge: "MỚI RA MẮT",
    preOrder: {
      enabled: true,
      leadTimeDays: [7, 10],
      message: 'Hàng đặt trước — Giao hàng dự kiến trong 7-10 ngày làm việc',
    },

    description: `Bộ pijama lấy cảm hứng từ phong cách ngủ cổ điển châu Âu với họa tiết Sọc Hồng ngọt ngào — đường viền tương phản tinh tế, cổ áo notch thanh lịch, và phom dáng suông tự do cho cảm giác thoải mái trọn ngày. Mang năng lượng Hỏa ấm áp và rạng rỡ như nắng sớm, khơi dậy nguồn sinh khí tươi mới cho không gian nghỉ ngơi của bạn.`,

    longDescription: `THE DAYBREAK SET được thiết kế để mang lại cảm giác như đang thức giấc tại một khách sạn boutique 5 sao giữa lòng châu Âu. Họa tiết Sọc Hồng (Pink Stripe) mang sắc thái ấm áp, dịu dàng của hành Hỏa — như những tia nắng sớm đầu ngày tiếp thêm sinh khí và năng lượng tích cực cho tinh thần. Thiết kế suông nhẹ, viền tương phản sắc nét giúp bạn luôn thanh lịch, tự tin diện từ phòng ngủ ra phố hay tiếp khách tại nhà mà không cần đắn đo. Tương sinh và hòa hợp lý tưởng cho người mệnh Hỏa và Thổ.`,

    detailedDescription: `THE DAYBREAK SET lấy cảm hứng từ đồ ngủ của các khách sạn boutique châu Âu — nơi pijama không chỉ là trang phục nghỉ ngơi mà là một tuyên ngôn phong cách sống tinh tế.

Thiết kế notch collar (cổ bẻ cổ điển) với viền tương phản trắng sắc nét chạy dọc ve áo, cổ tay và miệng túi — tạo nên dấu ấn thanh lịch đặc trưng. Hàng cúc trước tiệp màu cùng hai túi patch rộng rãi và một túi ngực nhỏ hoàn thiện phom dáng chuẩn mực.

Quần dáng suông thẳng (straight-leg) với độ rủ tự nhiên từ sợi dệt cao cấp — thoải mái tối đa khi nằm nghỉ, chỉn chu tuyệt đối khi bước ra ngoài.

Họa tiết Sọc Hồng (Pink Stripe) biểu trưng cho năng lượng Hỏa — biểu tượng của sự ấm áp, yêu đời và nhiệt huyết dịu lành. Rất hòa hợp và tương sinh cho những ai tìm kiếm sự cân bằng, đặc biệt là người mang mệnh Hỏa và Thổ.`,

    tagline: `Khởi đầu ngày mới tràn đầy sinh khí với sắc hồng ấm áp và phom dáng châu Âu kinh điển.`,
    sectionLabel: "BST THU ĐÔNG 2026 · HỎA SẮC SỚM MAI",

    price: 390000,
    originalPrice: 490000,
    discount: 20,
    rating: 4.8,
    reviewCount: 78,

    // ─── FENG SHUI INSPIRATION (NGŨ HÀNH) ───────────────────────────────────
    fengShui: {
      element: "Hỏa",
      elementEn: "Fire",
      color: "Sọc Hồng",
      goodFor: ["Hỏa", "Thổ"],
      energyNote: "Ấm áp, nhiệt huyết, dịu dàng nhưng tràn đầy sức sống — như nắng sớm mai tiếp thêm sinh khí.",
    },

    // ─── STYLE VARIANTS (treated as "colors" in the UI selector) ─────────────
    colors: [
      {
        name: "Pink Stripe",
        label: "Sọc Hồng",
        hex: "#EFAEA0",          // representative swatch color (Hồng Đào)
        patternPreview: true,    // flag: render pattern thumbnail, not plain swatch
        patternType: "stripe",   // used by ColorSelector to pick preview style
        stock: { S: 10, M: 8 },
      },
    ],

    // ─── SIZES — only S and M ────────────────────────────────────────────────
    sizes: ["S", "M"],

    // ─── SIZE GUIDE — Bảng Size chuẩn hóa cho THE DAYBREAK SET ─────────────
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
      "Bảo quản nơi khô ráo",
      "Giặt máy chế độ nhẹ, tốt nhất khi giặt tay",
      "Không sử dụng chất tẩy quần áo",
      "Không vắt hoặc xoắn mạnh vì điều này có thể gây ra các nếp nhăn và ảnh hưởng đến độ bền, cấu trúc của vải.",
      "Không ngâm bột giặt có chất tẩy mạnh để tránh loang màu vải.",
      "Hạn chế sử dụng máy sấy nóng và ủi ở nhiệt độ thích hợp.",
    ],

    returnPolicy: "Hỗ trợ đổi trả trong 30 ngày — Áp dụng theo chính sách đổi trả & cam kết chất lượng QuanNguyenS — Liên hệ hotline 0981 753 082",

    highlights: [
      "Họa tiết Sọc Hồng năng lượng Hỏa — ấm áp, dịu dàng, tràn đầy sinh khí như nắng sớm",
      "Viền tương phản trắng tinh tế — dấu ấn tay nghề may chuẩn phong cách châu Âu",
      "Phom dáng suông tự do — ôm đẹp mọi vóc dáng, thoải mái từ nhà ra phố",
    ],

    tags: ["Mới Ra Mắt", "Classic", "Sọc Hồng", "European Style", "Hành Hỏa"],
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
    },
  },
  {
    id: 'the-cafe-look',
    slug: 'the-cafe-look',
    name: 'THE STILLWATER SET',
    subtitle: 'Pijama Thiết Kế Cổ V · Caro Navy Tĩnh Tại',
    collection: 'Thu Đông 2026',
    badge: 'BÁN CHẠY NHẤT',

    description: 'Thiết kế cổ V thanh lịch với đường viền tương phản nổi bật kết hợp họa tiết Caro Navy lịch lãm. Mang chiều sâu tĩnh tại của hành Thủy — tựa mặt nước hồ phẳng lặng, mang đến cảm giác an yên tuyệt đối cho những buổi sáng thưởng cà phê hay góc làm việc tại nhà.',

    longDescription: 'THE STILLWATER SET là sự giao thoa hoàn hảo giữa nét phóng khoáng hiện đại và sự tĩnh tại sâu lắng. Mang gam màu Caro Navy biểu trưng cho hành Thủy — năng lượng của sự thông thái, điềm tĩnh và an nhiên. Thiết kế cổ V thanh thoát cùng viền tương phản tạo điểm nhấn tinh giản mà sắc sảo. Được dệt từ chất liệu tự nhiên mềm mại, đây là bộ trang phục lý tưởng để bạn bắt đầu ngày mới với một tách cappuccino hoặc đắm mình trong trang sách yêu thích. Tương hợp và nuôi dưỡng tuyệt vời cho người mệnh Thủy và Mộc.',

    detailedDescription: `THE STILLWATER SET được may đo theo chuẩn phong cách homewear hiện đại của các thủ phủ thời trang Bắc Âu.

Phom áo cổ V xẻ vừa phải tôn lên nét thanh mảnh của phần cổ và xương quai xanh, viền phối tương phản sắc sảo dọc cổ và lai áo.

Quần ống suông thoải mái với đai chun co giãn êm ái, thích hợp cho cả ngày làm việc tại nhà hoặc bước xuống quán café góc phố.

Họa tiết Caro Navy mang đậm năng lượng hành Thủy — biểu trưng cho sự tĩnh lặng, sâu sắc và trí tuệ. Rất phù hợp để xoa dịu tâm trí sau những giờ làm việc căng thẳng, tương hợp và nuôi dưỡng tuyệt vời cho người mệnh Thủy và Mộc.`,

    tagline: `Tĩnh tại và an yên — phong cách cổ V thanh lịch cùng sắc xanh Navy trầm lắng.`,
    sectionLabel: "BST THU ĐÔNG 2026 · THỦY SẮC TĨNH TẠI",

    price: 550000,
    originalPrice: null,
    discount: 0,
    rating: 4.7,
    reviewCount: 43,

    // ─── FENG SHUI INSPIRATION (NGŨ HÀNH) ───────────────────────────────────
    fengShui: {
      element: "Thủy",
      elementEn: "Water",
      color: "Caro Navy",
      goodFor: ["Thủy", "Mộc"],
      energyNote: "Tĩnh tại, sâu lắng, trí tuệ, an yên như mặt nước lặng — mang lại sự tập trung và thư thái.",
    },

    images: {
      "Navy Plaid": [
        "/images/classic-set-navy-main.jpg",
        "/images/classic-set-navy-thumb-1.jpg",
        "/images/classic-set-navy-thumb-2.jpg",
        "/images/classic-set-navy-thumb-3.jpg",
        "/images/classic-set-navy-detail.jpg",
      ],
      "Caro Navy": [
        "/images/classic-set-navy-main.jpg",
        "/images/classic-set-navy-thumb-1.jpg",
        "/images/classic-set-navy-thumb-2.jpg",
        "/images/classic-set-navy-thumb-3.jpg",
        "/images/classic-set-navy-detail.jpg",
      ],
    },

    colors: [
      {
        name: "Navy Plaid",
        label: "Caro Navy",
        hex: "#222636",
        patternPreview: true,
        patternType: "plaid",
        stock: { S: 50, M: 50 },
      },
    ],

    sizes: ['S', 'M'],
    sizeGuide: {
      S: {
        shirtLength: '66 cm',
        chest: '124 cm',
        sleeveLength: '53 cm',
        maxWaist: '80 cm',
        thigh: '64 cm',
        trouserLength: '98 cm',
      },
      M: {
        shirtLength: '68 cm',
        chest: '132 cm',
        sleeveLength: '55 cm',
        maxWaist: '88 cm',
        thigh: '68 cm',
        trouserLength: '102 cm',
      },
    },
    fabric: '95% Modal Sợi Gỗ Tự Nhiên & 5% Spandex Cao Cấp',
    fabricDetail: 'Định lượng 180 GSM · Xử lý vi sinh xoa mềm bề mặt · Cảm giác mướt mát, chống nhăn tự nhiên',
    careInstructions: [
      "Bảo quản nơi khô ráo",
      "Giặt máy chế độ nhẹ, tốt nhất khi giặt tay",
      "Không sử dụng chất tẩy quần áo",
      "Không vắt hoặc xoắn mạnh vì điều này có thể gây ra các nếp nhăn và ảnh hưởng đến độ bền, cấu trúc của vải.",
      "Không ngâm bột giặt có chất tẩy mạnh để tránh loang màu vải.",
      "Hạn chế sử dụng máy sấy nóng và ủi ở nhiệt độ thích hợp.",
    ],
    returnPolicy: 'Hỗ trợ đổi trả trong 30 ngày — Áp dụng theo chính sách đổi trả & cam kết chất lượng QuanNguyenS — Liên hệ hotline 0981 753 082',
    highlights: [
      'Họa tiết Caro Navy năng lượng Thủy — tĩnh tại, sâu lắng, mang lại cảm giác an yên như mặt nước lặng',
      'Cổ V thanh lịch, viền tương phản nổi bật tôn dáng cổ và xương quai xanh',
      'Dáng relaxed fit thoải mái — dễ dàng chuyển đổi từ phòng ngủ sang góc café sáng',
    ],
    tags: ['Bán Chạy', 'Caro Navy', 'Cổ V', 'Chất Liệu Cao Cấp', 'Hành Thủy'],
    relatedProducts: ['the-classic-set', 'the-evening-edit'],
  },
  {
    id: 'the-evening-edit',
    slug: 'the-evening-edit',
    name: 'THE HEARTH SET',
    subtitle: 'Pijama Wide-Leg Cao Cấp · Sọc Nâu Vững Chãi',
    collection: 'Thu Đông 2026',
    badge: 'PHIÊN BẢN GIỚI HẠN',
    preOrder: {
      enabled: true,
      leadTimeDays: [7, 10],
      message: 'Hàng đặt trước — Giao hàng dự kiến trong 7-10 ngày làm việc',
    },

    description: 'Dáng wide-leg sang trọng kết hợp họa tiết Sọc Nâu mocha ấm áp — mang năng lượng Thổ vững chãi, nuôi dưỡng và vỗ về cảm xúc. Phiên bản giới hạn dành cho những khoảnh khắc thư giãn đỉnh cao và bữa tối ấm cúng cuối ngày.',

    longDescription: 'THE HEARTH SET là định nghĩa cao cấp nhất về đồ mặc nhà sang trọng. Mang gam màu Sọc Nâu (Brown Stripe) thuộc hành Thổ — biểu tượng của sự vững chãi, bình yên và cảm giác "về nhà" nuôi dưỡng năng lượng. Thiết kế quần wide-leg suông rộng quý phái cùng chất liệu dệt tự nhiên rũ nhẹ tạo nên từng bước chuyển động thướt tha, đẳng cấp. Đặc biệt phù hợp với những ai yêu thích sự ổn định và cảm giác an yên mà hành Thổ mang lại.',

    detailedDescription: `THE HEARTH SET là tuyệt phẩm giới hạn được chế tác từ chất liệu tự nhiên thượng hạng với độ bóng mờ quý phái.

Thiết kế quần dáng wide-leg (ống rộng) buông rủ hoàn hảo kết hợp áo phom thoải mái chuẩn châu Âu, mang đến khí chất sang trọng vượt bậc.

Họa tiết Sọc Nâu mocha (Brown Stripe) đại diện cho năng lượng hành Thổ — như đất mẹ hiền hòa, bao dung và vững chãi. Là lựa chọn tuyệt vời để tái tạo năng lượng sau một ngày bận rộn, mang lại sự che chở và gắn kết, đặc biệt tương sinh hòa hợp cho người mệnh Thổ và Kim.`,

    tagline: `Vững chãi và ấm áp — cảm giác trở về nhà trong phom dáng wide-leg thượng lưu và sắc nâu an lành.`,
    sectionLabel: "BST THU ĐÔNG 2026 · THỔ SẮC AN NHIÊN",

    price: 750000,
    originalPrice: null,
    discount: 0,
    rating: 5.0,
    reviewCount: 18,

    // ─── FENG SHUI INSPIRATION (NGŨ HÀNH) ───────────────────────────────────
    fengShui: {
      element: "Thổ",
      elementEn: "Earth",
      color: "Sọc Nâu",
      goodFor: ["Thổ", "Kim"],
      energyNote: "Vững chãi, ấm áp, bền bỉ, cảm giác 'về nhà' như đất mẹ nuôi dưỡng tâm hồn.",
    },

    images: {
      "Brown Stripe": [
        "/images/classic-set-brown-main.jpg",
        "/images/classic-set-brown-thumb-1.jpg",
        "/images/classic-set-brown-thumb-2.jpg",
        "/images/classic-set-brown-thumb-3.jpg",
        "/images/classic-set-brown-detail.jpg",
      ],
      "Sọc Nâu": [
        "/images/classic-set-brown-main.jpg",
        "/images/classic-set-brown-thumb-1.jpg",
        "/images/classic-set-brown-thumb-2.jpg",
        "/images/classic-set-brown-thumb-3.jpg",
        "/images/classic-set-brown-detail.jpg",
      ],
    },

    colors: [
      {
        name: "Brown Stripe",
        label: "Sọc Nâu",
        hex: "#5C3A21",
        patternPreview: true,
        patternType: "brown-stripe",
        stock: { S: 6, M: 8 },
      },
    ],

    sizes: ['S', 'M'],
    sizeGuide: {
      S:  { weight: '42–50 kg', height: '152–162 cm', chest: '82–86 cm', waist: '64–70 cm', trouserLength: '94 cm', sleeveLength: '54 cm' },
      M:  { weight: '51–58 kg', height: '160–167 cm', chest: '87–93 cm', waist: '71–77 cm', trouserLength: '96 cm', sleeveLength: '55 cm' },
    },
    fabric: '100% Tencel Lyocell Thượng Hạng Dáng Rủ',
    fabricDetail: 'Định lượng 190 GSM · Dệt bóng mờ tone-on-tone sang trọng · Thấm hút gấp 1.5 lần cotton, mềm rũ tự nhiên',
    careInstructions: [
      "Bảo quản nơi khô ráo",
      "Giặt máy chế độ nhẹ, tốt nhất khi giặt tay",
      "Không sử dụng chất tẩy quần áo",
      "Không vắt hoặc xoắn mạnh vì điều này có thể gây ra các nếp nhăn và ảnh hưởng đến độ bền, cấu trúc của vải.",
      "Không ngâm bột giặt có chất tẩy mạnh để tránh loang màu vải.",
      "Hạn chế sử dụng máy sấy nóng và ủi ở nhiệt độ thích hợp.",
    ],
    returnPolicy: 'Hỗ trợ đổi trả trong 30 ngày — Áp dụng theo chính sách đổi trả & cam kết chất lượng QuanNguyenS — Liên hệ hotline 0981 753 082',
    highlights: [
      'Họa tiết Sọc Nâu năng lượng Thổ — vững chãi, ấm áp, mang lại cảm giác bình yên như trở về nhà',
      'Chất vải Tencel thượng hạng — độ rủ thướt tha, mềm mướt và thoáng khí vượt trội',
      'Dáng wide-leg sang trọng — khí chất đẳng cấp, hoàn hảo cho cả những bữa tiệc tối riêng tư',
    ],
    tags: ['Giới Hạn', 'Sọc Nâu', 'Wide-Leg', 'Chất Liệu Cao Cấp', 'Hành Thổ'],
    relatedProducts: ['the-classic-set', 'the-cafe-look'],
  },
]

export const sampleReviews = [
  // ── THE CLASSIC SET (THE DAYBREAK SET - Sọc Hồng) ──
  {
    id: 'rv-1',
    productId: 'the-classic-set',
    author: 'Thùy Trang N.',
    date: '14/10/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-pink-thumb-1.jpg',
    text: 'Nhận hàng mở hộp ra ưng ngay cái nết đóng gói, thơm mùi hoa nhẹ. Bộ sọc hồng này chất vải mê thực sự, mềm mượt mát tay chứ không bị dính ráp da. Mình hay mặc từ phòng ngủ lững thững ra ban công nhâm nhi ly cafe sáng hoặc xuống nhận shipper mà vẫn rất lịch sự. Đường viền cúc và cổ notch may chỉn chu lắm, giặt máy túi giặt 3 lần rồi vẫn phẳng phiu không bị bai dão.',
  },
  {
    id: 'rv-2',
    productId: 'the-classic-set',
    author: 'Khánh Linh D.',
    date: '08/10/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-pink-thumb-2.jpg',
    text: 'Mình 49kg cao 1m58 chọn size S vừa vặn thoải mái, quần dài chạm mu bàn chân đi dép bệt rất tôn dáng. Vải pha modal mềm rũ như làn da thứ hai, đêm nằm phòng điều hòa ấm áp dễ chịu cực kỳ. Gam sọc hồng ngọt ngào vừa phải, mặc lên nhìn da sáng bừng mà sang chảnh chứ không bị sến xíu nào.',
  },
  {
    id: 'rv-3',
    productId: 'the-classic-set',
    author: 'Minh Anh P.',
    date: '29/09/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    verified: true,
    photo: '/images/classic-set-pink-thumb-3.jpg',
    text: 'Đã mua bộ thứ 2 ở shop rồi. Form suông relaxed chuẩn kiểu homewear châu Âu, mặc đi lại quanh nhà nhẹ tênh không có cảm giác bị gò bó. Thích nhất là đường may giấu mép bên trong, lộn ra sờ không thấy cộm hay cọ xát vào da tí nào. Mẹ mình nhìn thấy khen quá trời nên bảo đặt thêm cho mẹ một bộ nữa.',
  },
  {
    id: 'rv-4',
    productId: 'the-classic-set',
    author: 'Phương Thảo V.',
    date: '18/09/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    verified: true,
    photo: '/images/classic-set-pink-detail.jpg',
    text: 'Đường kim mũi chỉ sắc sảo từng milimet luôn á, không thấy một sợi chỉ thừa nào. Da mình thuộc dạng siêu nhạy cảm, mặc đồ ngủ rẻ tiền một tí là ngứa ngáy nổi mẩn liền, mà mặc bộ này của QuanNguyenS ngủ một giấc tới sáng êm ru. Đóng hộp quà kèm thiệp chỉn chu, làm quà tặng bạn thân thì hết nước chấm.',
  },
  {
    id: 'rv-5',
    productId: 'the-classic-set',
    author: 'Ngọc Mai H.',
    date: '11/09/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    verified: true,
    photo: null,
    text: 'Đợt này đi du lịch Đà Lạt mang theo bộ này chụp hình trong homestay ai cũng hỏi mua ở đâu. Họa tiết sọc hồng lên hình ăn ảnh xỉu, vừa cổ điển vừa hiện đại. Chất vải thoáng khí tự nhiên, tối se lạnh mặc ấm mà trưa hửng nắng vẫn mát mẻ.',
  },
  {
    id: 'rv-7',
    productId: 'the-classic-set',
    author: 'Hải Yến T.',
    date: '22/08/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    verified: true,
    photo: null,
    text: 'Mình thuộc dạng khó tính về đồ mặc nhà, nhưng bộ này thì duyệt 10/10. Giặt qua hơn chục lần bằng nước lạnh rồi mà màu sọc hồng vẫn tươi mới, không hề bị co rút hay xù lông. Đáng đồng tiền bát gạo hơn hẳn mấy bộ lụa bóng bí mồ hôi trên sàn.',
  },
  {
    id: 'rv-8',
    productId: 'the-classic-set',
    author: 'Yến Nhi B.',
    date: '15/08/2026',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    verified: true,
    photo: null,
    text: 'Cổ bẻ notch viền trắng may tỉ mỉ, phom quần suông che khuyết điểm đùi to cực tốt. Nhiều khi có bạn bè ghé chơi đột xuất mặc nguyên bộ này ra tiếp khách vẫn thấy tự tin, lịch sự như đồ mặc ngoài phố.',
  },
  {
    id: 'rv-6',
    productId: 'the-classic-set',
    author: 'Thu Giang S.',
    date: '04/09/2026',
    rating: 4,
    color: 'Sọc Hồng',
    size: 'S',
    verified: true,
    photo: null,
    text: 'Chất vải siêu êm mềm và đường may rất đẹp không có gì để chê. Mình 47kg cao 1m52 mặc size S quần hơi dài hơn gót một xíu xiu nên phải đi dép đế 2-3cm hoặc kéo cạp lên tí là vừa đẹp. Shop tư vấn size rất có tâm và gửi hàng nhanh.',
  },

  // ── THE STILLWATER SET (Caro Navy) ──
  {
    id: 'rv-9',
    productId: 'the-cafe-look',
    author: 'Hoàng Yến N.',
    date: '15/10/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-navy-thumb-1.jpg',
    text: 'Mê nhất cái cổ V khoét vừa vặn, thanh thoát lộ xương quai xanh mà không hề bị hở hay xộc xệch khi cúi xuống. Họa tiết caro navy nhìn ngoài đời màu trầm sâu và sang hơn trong ảnh nhiều. Tối đi làm về mệt mỏi tắm xong tròng bộ này vào là thấy nhẹ cả người.',
  },
  {
    id: 'rv-10',
    productId: 'the-cafe-look',
    author: 'Bảo Trâm L.',
    date: '10/10/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-navy-thumb-2.jpg',
    text: 'Chất vải mềm mát lạnh tay, có độ co giãn nhẹ lăn trở cả đêm thoải mái không bị xoắn hay thít vào người. Quần cạp chun êm ru bụng không bị hằn vết đỏ. Bạn trai mình nhìn thấy còn khen bộ này nhìn nhã nhặn và có gu.',
  },
  {
    id: 'rv-11',
    productId: 'the-cafe-look',
    author: 'Quốc Bảo T.',
    date: '03/10/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    verified: true,
    photo: '/images/classic-set-navy-thumb-3.jpg',
    text: 'Bạn gái mua tặng mình Size L (mình 66kg cao 1m74). Áo dài qua mông nhẹ, form suông rộng rãi thoải mái cực kỳ. Chất vải dày dặn vừa phải, không lộ bên trong, mặc làm việc tại nhà hay bước xuống sảnh chung cư lấy đồ ăn đều đàng hoàng chỉn chu.',
  },
  {
    id: 'rv-12',
    productId: 'the-cafe-look',
    author: 'Hương Giang Đ.',
    date: '25/09/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-navy-detail.jpg',
    text: 'Đường viền tương phản chạy dọc cổ V và miệng túi may chuẩn chỉnh từng nét, các ô kẻ caro khớp nhau tăm tắp chứng tỏ thợ may tay nghề cao. Đặt hàng 2 hôm là nhận được ngay tại Hà Nội, đóng gói cẩn thận.',
  },
  {
    id: 'rv-13',
    productId: 'the-cafe-look',
    author: 'Thanh Hà M.',
    date: '17/09/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    verified: true,
    photo: null,
    text: 'Bộ này đúng nghĩa "từ nhà ra phố". Sáng dậy lười thay đồ chỉ cần khoác thêm chiếc áo trench coat mỏng hoặc cardigan len là đi bộ xuống quán cafe góc đường ăn sáng tự tin luôn. Vải tự nhiên thoáng khí 10 điểm.',
  },
  {
    id: 'rv-14',
    productId: 'the-cafe-look',
    author: 'Đức Quân V.',
    date: '09/09/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    verified: true,
    photo: null,
    text: 'Mua đôi với người yêu set này, cả 2 đứa đều ưng ý. Vải giặt máy không bị nhăn nhúm, phơi trong bóng râm khô nhanh. Quần có túi sâu để vừa điện thoại iPhone Pro Max không bị rơi ra ngoài.',
  },
  {
    id: 'rv-16',
    productId: 'the-cafe-look',
    author: 'Minh Tuấn K.',
    date: '20/08/2026',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    verified: true,
    photo: null,
    text: 'Hộp quà cứng cáp bọc ruy băng nhìn rất sang trọng. Thích trải nghiệm mua hàng trên web, thanh toán chuyển khoản nhận ưu đãi nhanh gọn không cần tạo tài khoản lằng nhằng. Sẽ ủng hộ tiếp các BST sau.',
  },
  {
    id: 'rv-15',
    productId: 'the-cafe-look',
    author: 'Lan Anh T.',
    date: '01/09/2026',
    rating: 4,
    color: 'Caro Navy',
    size: 'S',
    verified: true,
    photo: null,
    text: 'Màu caro navy ngoài đời trầm hơn xíu so với lúc xem trên màn hình điện thoại của mình, nhưng mặc lên lại cực kỳ tôn da và thanh lịch. Vải mềm mướt mát lạnh, mặc mùa thu đông ở miền Bắc đắp chăn mỏng là ngủ ngon lành.',
  },

  // ── THE HEARTH SET (Sọc Nâu Tencel) ──
  {
    id: 'rv-17',
    productId: 'the-evening-edit',
    author: 'Vũ Thanh H.',
    date: '12/10/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    verified: true,
    photo: '/images/classic-set-brown-thumb-1.jpg',
    text: 'Chất vải 100% Tencel Lyocell rủ đẹp không thể tả được! Bước đi ống quần bay bổng thướt tha, bóng mờ nhẹ tự nhiên quý phái y như lụa tơ tằm đắt đỏ tiền triệu mà lại dễ giặt giũ bảo quản hơn nhiều. Mặc vào người nhẹ bẫng như không.',
  },
  {
    id: 'rv-18',
    productId: 'the-evening-edit',
    author: 'Trương Cẩm N.',
    date: '06/10/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    verified: true,
    photo: '/images/classic-set-brown-thumb-2.jpg',
    text: 'Tone nâu mocha sọc này sang tây dã man, bạn nào da trắng hay ngăm mặc lên đều hợp. Vải sờ vào êm ái mát rượi, thấm hút mồ hôi siêu tốt. Buổi tối bật đèn vàng đọc sách nhâm nhi tách trà thấy bình yên thư thái vô cùng.',
  },
  {
    id: 'rv-19',
    productId: 'the-evening-edit',
    author: 'Hà My K.',
    date: '27/09/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'S',
    verified: true,
    photo: '/images/classic-set-brown-thumb-3.jpg',
    text: 'Dáng quần wide-leg hack chân dài đỉnh chóp luôn, mình 1m62 mặc vào nhìn như 1m70 vậy á. Mang đi resort nghỉ dưỡng chụp hình mà ai cũng tưởng set đồ thiết kế đi tiệc. Đường may giấu chỉ sắc sảo, không cọ xát da.',
  },
  {
    id: 'rv-20',
    productId: 'the-evening-edit',
    author: 'Phan Minh A.',
    date: '19/09/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    verified: true,
    photo: '/images/classic-set-brown-detail.jpg',
    text: 'Đặt may thủ công đợi gần tuần lễ nhưng nhận hàng thì thấy hoàn toàn bõ công chờ đợi. Đóng hộp cứng cáp, từng nếp gấp phẳng phiu tinh tế. Chất vải tencel rủ tự nhiên, mặc lên người toát ra vẻ thanh lịch sang trọng ngầm.',
  },
  {
    id: 'rv-21',
    productId: 'the-evening-edit',
    author: 'Diệu Anh N.',
    date: '10/09/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'S',
    verified: true,
    photo: null,
    text: 'Thiết kế mang năng lượng Thổ an lành ấm áp. Vải tự nhiên mềm mại, không bị tích điện hay dính dính vào chân vào những ngày mùa đông hanh khô. Mặc ngủ một giấc dậy thấy tinh thần khoan khoái hẳn.',
  },
  {
    id: 'rv-22',
    productId: 'the-evening-edit',
    author: 'Kim Oanh L.',
    date: '02/09/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    verified: true,
    photo: null,
    text: 'Mua set này tặng quà cưới cho cô bạn thân, nó khen nức nở bảo là món quà ưng ý nhất trong các quà được tặng. Chất vải sờ là biết đồ cao cấp xịn sò, không phải hàng may công nghiệp đại trà.',
  },
  {
    id: 'rv-24',
    productId: 'the-evening-edit',
    author: 'Thục Quyên T.',
    date: '16/08/2026',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    verified: true,
    photo: null,
    text: 'Bộ sleepwear sang và êm nhất tủ đồ của mình tính đến giờ. Dáng áo thanh mảnh, cổ bẻ vừa vặn không bị xộc xệch. Mặc ở nhà tiếp khách hay ăn tối thân mật gia đình đều rất nhã nhặn, tôn trọng người đối diện.',
  },
  {
    id: 'rv-23',
    productId: 'the-evening-edit',
    author: 'Thảo Nguyên D.',
    date: '24/08/2026',
    rating: 4,
    color: 'Sọc Nâu',
    size: 'S',
    verified: true,
    photo: null,
    text: 'Chất vải Tencel mềm rủ như mơ, mặc thích mê tơi. Do vải tự nhiên cao cấp nên khi giặt xong cần giũ mạnh và phơi trên móc trong bóng mát để giữ form phẳng phiu nhất. Phom dáng suông rộng rãi thoải mái, cho shop 4 sao rưỡi!',
  },
]

