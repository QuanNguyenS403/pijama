export const products = [
  {
    id: "the-classic-set",
    slug: "the-classic-set",
    name: "THE DAYBREAK SET",
    subtitle: "Pijama Phong Cách Châu Âu · Sọc Hồng Nắng Sớm",
    collection: "Thu Đông 2026",
    badge: "MỚI RA MẮT",

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
      color: "Sọc Hồng (Pink Stripe)",
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
      "Giặt tay hoặc máy chế độ nhẹ (delicate)",
      "Nước lạnh hoặc ấm — tối đa 30°C",
      "Không sử dụng thuốc tẩy mạnh",
      "Phơi bóng mát, tránh ánh nắng trực tiếp",
      "Không sấy máy",
      "Ủi nhiệt độ thấp nếu cần",
    ],

    returnPolicy: "Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ",

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

Họa tiết Caro Navy (Navy Plaid) mang đậm năng lượng hành Thủy — biểu trưng cho sự tĩnh lặng, sâu sắc và trí tuệ. Rất phù hợp để xoa dịu tâm trí sau những giờ làm việc căng thẳng, tương hợp và nuôi dưỡng tuyệt vời cho người mệnh Thủy và Mộc.`,

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
      color: "Caro Navy (Navy Plaid)",
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
    },

    colors: [
      {
        name: "Navy Plaid",
        label: "Caro Navy",
        hex: "#222636",
        patternPreview: true,
        patternType: "plaid",
        stock: { S: 8, M: 10 },
      },
    ],

    sizes: ['S', 'M'],
    sizeGuide: {
      S:  { weight: '40–49 kg', height: '150–160 cm', chest: '82–86 cm', waist: '64–69 cm', trouserLength: '91 cm', sleeveLength: '53 cm' },
      M:  { weight: '50–57 kg', height: '158–165 cm', chest: '87–92 cm', waist: '70–75 cm', trouserLength: '93 cm', sleeveLength: '54 cm' },
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
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ',
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
      color: "Sọc Nâu (Brown Stripe)",
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
      'Giặt tay nhẹ nhàng',
      'Nước lạnh dưới 25°C',
      'Không sử dụng chất tẩy mạnh',
      'Phơi trong bóng mát',
      'Không sấy khô',
      'Ủi nhiệt độ thấp nhất',
    ],
    returnPolicy: 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Hỗ trợ đổi size tận nhà — Liên hệ hotline 0981 753 082 để được hỗ trợ',
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
  {
    id: 'rv-1',
    productId: 'the-classic-set',
    name: 'Nguyễn Thị Minh',
    date: '12/07/2026',
    rating: 5,
    color: 'Pink Stripe',
    size: 'M',
    verified: true,
    text: 'Vải mềm quá trời! Mình mua mẫu Sọc Hồng mặc ở nhà mà người nhà cứ khen sang. Tông hồng nhẹ nhàng ấm áp, viền trắng rất tinh tế, chất lượng xứng đáng với giá tiền.',
  },
  {
    id: 'rv-2',
    productId: 'the-cafe-look',
    name: 'Trần Thị Lan Anh',
    date: '28/06/2026',
    rating: 5,
    color: 'Navy Plaid',
    size: 'S',
    verified: true,
    text: 'Đóng gói đẹp lắm, mua làm quà tặng sinh nhật bạn thân là chuẩn. Mẫu Caro Navy bên ngoài nhìn cực kỳ thanh lịch và sắc nét. Cổ V mặc rất tôn dáng.',
  },
  {
    id: 'rv-3',
    productId: 'the-classic-set',
    name: 'Phạm Quỳnh Trang',
    date: '15/06/2026',
    rating: 4,
    color: 'Pink Stripe',
    size: 'S',
    verified: true,
    text: 'Mình 48kg cao 1m58 chọn size S hơi rộng một chút ở phần vai nhưng nhìn chung vẫn ok theo phom suông. Họa tiết sọc hồng mặc lên sáng da hẳn, chất vải thích nhất.',
  },
  {
    id: 'rv-4',
    productId: 'the-cafe-look',
    name: 'Lê Hoàng Mai',
    date: '03/06/2026',
    rating: 5,
    color: 'Navy Plaid',
    size: 'M',
    verified: true,
    text: 'Chất vải tự nhiên rất tốt, thoáng khí và nhẹ nhàng. Họa tiết Caro Navy trầm tĩnh, mặc uống cafe sáng hay làm việc tại nhà đều rất lịch sự. 10/10!',
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
    text: 'Sọc hồng ngọt ngào, đường may kỹ càng. Mình mặc tiếp khách tại nhà mà ai cũng hỏi mua ở đâu vì nhìn vừa ấm cúng vừa sang. Sẽ ủng hộ shop thêm!',
  },
  {
    id: 'rv-6',
    productId: 'the-evening-edit',
    name: 'Vũ Thanh Hương',
    date: '18/08/2026',
    rating: 5,
    color: 'Brown Stripe',
    size: 'M',
    verified: true,
    text: 'Mẫu Sọc Nâu đẹp xuất sắc ngoài đời, tone nâu mocha rất tôn da và sang trọng. Dáng wide-leg bước đi bay bổng, đường may tỉ mỉ, mặc ấm mà vẫn nhẹ nhàng thoải mái.',
  },
  {
    id: 'rv-7',
    productId: 'the-cafe-look',
    name: 'Hoàng Yến Nhi',
    date: '14/08/2026',
    rating: 5,
    color: 'Navy Plaid',
    size: 'M',
    verified: true,
    text: 'Cổ V rất tôn dáng cổ và xương quai xanh, viền tương phản nổi bật trên nền Caro Navy nhìn sang trọng tinh tế. Chất vải mềm mướt bất ngờ so với giá tiền.',
  },
  {
    id: 'rv-8',
    productId: 'the-cafe-look',
    name: 'Ngô Bảo Trâm',
    date: '02/08/2026',
    rating: 4,
    color: 'Navy Plaid',
    size: 'S',
    verified: true,
    text: 'Mẫu Caro Navy mặc đi cafe sáng cuối tuần kết hợp khoác blazer mỏng cực kỳ sành điệu. Chỉ tiếc là chưa có size XL cho dáng người hơi đầy đặn như mình.',
  },
  {
    id: 'rv-9',
    productId: 'the-evening-edit',
    name: 'Phan Minh Anh',
    date: '10/08/2026',
    rating: 5,
    color: 'Brown Stripe',
    size: 'M',
    verified: true,
    text: 'Chất vải sọc nâu rũ đẹp tuyệt vời, tông màu đất ấm áp sang trọng. Dáng wide-leg bước đi rất thoải mái mà vẫn thanh lịch. Đáng từng đồng bỏ ra!',
  },
  {
    id: 'rv-10',
    productId: 'the-evening-edit',
    name: 'Trương Cẩm Nhung',
    date: '25/07/2026',
    rating: 5,
    color: 'Brown Stripe',
    size: 'L',
    verified: true,
    text: 'Họa tiết Sọc Nâu sang chảnh tối thượng. Đường may sắc nét đúng chuẩn xuất khẩu châu Âu. Đóng hộp quà cao cấp, vải mềm mịn tuyệt đối.',
  },
]

