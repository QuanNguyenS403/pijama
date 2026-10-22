/**
 * Danh sách toàn bộ đánh giá sản phẩm ban đầu của QuanNguyenS
 * Được khởi tạo tự động vào cơ sở dữ liệu SQLite (product_reviews)
 * với trạng thái 'approved' để hiển thị đầy đủ trên website chính thức.
 */

export const INITIAL_SAMPLE_REVIEWS = [
  // ── THE CLASSIC SET (THE DAYBREAK SET - Sọc Hồng) ──
  {
    id: 'rv-1',
    productId: 'the-classic-set',
    author: 'Thùy Trang N.',
    date: '2026-10-14T08:00:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    photo: '/images/classic-set-pink-thumb-1.jpg',
    text: 'Nhận hàng mở hộp ra ưng ngay cái nết đóng gói, thơm mùi hoa nhẹ. Bộ sọc hồng này chất vải mê thực sự, mềm mượt mát tay chứ không bị dính ráp da. Mình hay mặc từ phòng ngủ lững thững ra ban công nhâm nhi ly cafe sáng hoặc xuống nhận shipper mà vẫn rất lịch sự. Đường viền cúc và cổ notch may chỉn chu lắm, giặt máy túi giặt 3 lần rồi vẫn phẳng phiu không bị bai dão.',
  },
  {
    id: 'rv-2',
    productId: 'the-classic-set',
    author: 'Khánh Linh D.',
    date: '2026-10-08T09:30:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    photo: '/images/classic-set-pink-thumb-2.jpg',
    text: 'Mình 49kg cao 1m58 chọn size S vừa vặn thoải mái, quần dài chạm mu bàn chân đi dép bệt rất tôn dáng. Vải pha modal mềm rũ như làn da thứ hai, đêm nằm phòng điều hòa ấm áp dễ chịu cực kỳ. Gam sọc hồng ngọt ngào vừa phải, mặc lên nhìn da sáng bừng mà sang chảnh chứ không bị sến xíu nào.',
  },
  {
    id: 'rv-3',
    productId: 'the-classic-set',
    author: 'Minh Anh P.',
    date: '2026-09-29T14:15:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    photo: '/images/classic-set-pink-thumb-3.jpg',
    text: 'Đã mua bộ thứ 2 ở shop rồi. Form suông relaxed chuẩn kiểu homewear châu Âu, mặc đi lại quanh nhà nhẹ tênh không có cảm giác bị gò bó. Thích nhất là đường may giấu mép bên trong, lộn ra sờ không thấy cộm hay cọ xát vào da tí nào. Mẹ mình nhìn thấy khen quá trời nên bảo đặt thêm cho mẹ một bộ nữa.',
  },
  {
    id: 'rv-4',
    productId: 'the-classic-set',
    author: 'Phương Thảo V.',
    date: '2026-09-18T10:00:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    photo: '/images/classic-set-pink-detail.jpg',
    text: 'Đường kim mũi chỉ sắc sảo từng milimet luôn á, không thấy một sợi chỉ thừa nào. Da mình thuộc dạng siêu nhạy cảm, mặc đồ ngủ rẻ tiền một tí là ngứa ngáy nổi mẩn liền, mà mặc bộ này của QuanNguyenS ngủ một giấc tới sáng êm ru. Đóng hộp quà kèm thiệp chỉn chu, làm quà tặng bạn thân thì hết nước chấm.',
  },
  {
    id: 'rv-5',
    productId: 'the-classic-set',
    author: 'Ngọc Mai H.',
    date: '2026-09-11T16:20:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'S',
    photo: null,
    text: 'Đợt này đi du lịch Đà Lạt mang theo bộ này chụp hình trong homestay ai cũng hỏi mua ở đâu. Họa tiết sọc hồng lên hình ăn ảnh xỉu, vừa cổ điển vừa hiện đại. Chất vải thoáng khí tự nhiên, tối se lạnh mặc ấm mà trưa hửng nắng vẫn mát mẻ.',
  },
  {
    id: 'rv-7',
    productId: 'the-classic-set',
    author: 'Hải Yến T.',
    date: '2026-08-22T11:45:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    photo: null,
    text: 'Mình thuộc dạng khó tính về đồ mặc nhà, nhưng bộ này thì duyệt 10/10. Giặt qua hơn chục lần bằng nước lạnh rồi mà màu sọc hồng vẫn tươi mới, không hề bị co rút hay xù lông. Đáng đồng tiền bát gạo hơn hẳn mấy bộ lụa bóng bí mồ hôi trên sàn.',
  },
  {
    id: 'rv-8',
    productId: 'the-classic-set',
    author: 'Yến Nhi B.',
    date: '2026-08-15T18:10:00.000Z',
    rating: 5,
    color: 'Sọc Hồng',
    size: 'M',
    photo: null,
    text: 'Cổ bẻ notch viền trắng may tỉ mỉ, phom quần suông che khuyết điểm đùi to cực tốt. Nhiều khi có bạn bè ghé chơi đột xuất mặc nguyên bộ này ra tiếp khách vẫn thấy tự tin, lịch sự như đồ mặc ngoài phố.',
  },
  {
    id: 'rv-6',
    productId: 'the-classic-set',
    author: 'Thu Giang S.',
    date: '2026-09-04T12:00:00.000Z',
    rating: 4,
    color: 'Sọc Hồng',
    size: 'S',
    photo: null,
    text: 'Chất vải siêu êm mềm và đường may rất đẹp không có gì để chê. Mình 47kg cao 1m52 mặc size S quần hơi dài hơn gót một xíu xiu nên phải đi dép đế 2-3cm hoặc kéo cạp lên tí là vừa đẹp. Shop tư vấn size rất có tâm và gửi hàng nhanh.',
  },

  // ── THE STILLWATER SET (THE CAFE LOOK - Caro Navy) ──
  {
    id: 'rv-9',
    productId: 'the-cafe-look',
    author: 'Hoàng Yến N.',
    date: '2026-10-15T09:00:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    photo: '/images/classic-set-navy-thumb-1.jpg',
    text: 'Mê nhất cái cổ V khoét vừa vặn, thanh thoát lộ xương quai xanh mà không hề bị hở hay xộc xệch khi cúi xuống. Họa tiết caro navy nhìn ngoài đời màu trầm sâu và sang hơn trong ảnh nhiều. Tối đi làm về mệt mỏi tắm xong tròng bộ này vào là thấy nhẹ cả người.',
  },
  {
    id: 'rv-10',
    productId: 'the-cafe-look',
    author: 'Bảo Trâm L.',
    date: '2026-10-10T14:30:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    photo: '/images/classic-set-navy-thumb-2.jpg',
    text: 'Chất vải mềm mát lạnh tay, có độ co giãn nhẹ lăn trở cả đêm thoải mái không bị xoắn hay thít vào người. Quần cạp chun êm ru bụng không bị hằn vết đỏ. Bạn trai mình nhìn thấy còn khen bộ này nhìn nhã nhặn và có gu.',
  },
  {
    id: 'rv-11',
    productId: 'the-cafe-look',
    author: 'Quốc Bảo T.',
    date: '2026-10-03T20:10:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    photo: '/images/classic-set-navy-thumb-3.jpg',
    text: 'Bạn gái mua tặng mình Size L (mình 66kg cao 1m74). Áo dài qua mông nhẹ, form suông rộng rãi thoải mái cực kỳ. Chất vải dày dặn vừa phải, không lộ bên trong, mặc làm việc tại nhà hay bước xuống sảnh chung cư lấy đồ ăn đều đàng hoàng chỉn chu.',
  },
  {
    id: 'rv-12',
    productId: 'the-cafe-look',
    author: 'Hương Giang Đ.',
    date: '2026-09-25T11:20:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'S',
    photo: '/images/classic-set-navy-detail.jpg',
    text: 'Đường viền tương phản chạy dọc cổ V và miệng túi may chuẩn chỉnh từng nét, các ô kẻ caro khớp nhau tăm tắp chứng tỏ thợ may tay nghề cao. Đặt hàng 2 hôm là nhận được ngay tại Hà Nội, đóng gói cẩn thận.',
  },
  {
    id: 'rv-13',
    productId: 'the-cafe-look',
    author: 'Thanh Hà M.',
    date: '2026-09-17T15:40:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    photo: null,
    text: 'Bộ này đúng nghĩa "từ nhà ra phố". Sáng dậy lười thay đồ chỉ cần khoác thêm chiếc áo trench coat mỏng hoặc cardigan len là đi bộ xuống quán cafe góc đường ăn sáng tự tin luôn. Vải tự nhiên thoáng khí 10 điểm.',
  },
  {
    id: 'rv-14',
    productId: 'the-cafe-look',
    author: 'Đức Quân V.',
    date: '2026-09-09T08:15:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    photo: null,
    text: 'Mua đôi với người yêu set này, cả 2 đứa đều ưng ý. Vải giặt máy không bị nhăn nhúm, phơi trong bóng râm khô nhanh. Quần có túi sâu để vừa điện thoại iPhone Pro Max không bị rơi ra ngoài.',
  },
  {
    id: 'rv-16',
    productId: 'the-cafe-look',
    author: 'Minh Tuấn K.',
    date: '2026-08-20T17:00:00.000Z',
    rating: 5,
    color: 'Caro Navy',
    size: 'L',
    photo: null,
    text: 'Hộp quà cứng cáp bọc ruy băng nhìn rất sang trọng. Thích trải nghiệm mua hàng trên web, thanh toán chuyển khoản nhận ưu đãi nhanh gọn không cần tạo tài khoản lằng nhằng. Sẽ ủng hộ tiếp các BST sau.',
  },
  {
    id: 'rv-15',
    productId: 'the-cafe-look',
    author: 'Lan Anh T.',
    date: '2026-09-01T13:25:00.000Z',
    rating: 4,
    color: 'Caro Navy',
    size: 'S',
    photo: null,
    text: 'Màu caro navy ngoài đời trầm hơn xíu so với lúc xem trên màn hình điện thoại của mình, nhưng mặc lên lại cực kỳ tôn da và thanh lịch. Vải mềm mướt mát lạnh, mặc mùa thu đông ở miền Bắc đắp chăn mỏng là ngủ ngon lành.',
  },

  // ── THE HEARTH SET (THE EVENING EDIT - Sọc Nâu Tencel) ──
  {
    id: 'rv-17',
    productId: 'the-evening-edit',
    author: 'Vũ Thanh H.',
    date: '2026-10-12T10:10:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    photo: '/images/classic-set-brown-thumb-1.jpg',
    text: 'Chất vải 100% Tencel Lyocell rủ đẹp không thể tả được! Bước đi ống quần bay bổng thướt tha, bóng mờ nhẹ tự nhiên quý phái y như lụa tơ tằm đắt đỏ tiền triệu mà lại dễ giặt giũ bảo quản hơn nhiều. Mặc vào người nhẹ bẫng như không.',
  },
  {
    id: 'rv-18',
    productId: 'the-evening-edit',
    author: 'Trương Cẩm N.',
    date: '2026-10-06T19:30:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    photo: '/images/classic-set-brown-thumb-2.jpg',
    text: 'Tone nâu mocha sọc này sang tây dã man, bạn nào da trắng hay ngăm mặc lên đều hợp. Vải sờ vào êm ái mát rượi, thấm hút mồ hôi siêu tốt. Buổi tối bật đèn vàng đọc sách nhâm nhi tách trà thấy bình yên thư thái vô cùng.',
  },
  {
    id: 'rv-19',
    productId: 'the-evening-edit',
    author: 'Hà My K.',
    date: '2026-09-27T16:00:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'S',
    photo: '/images/classic-set-brown-thumb-3.jpg',
    text: 'Dáng quần wide-leg hack chân dài đỉnh chóp luôn, mình 1m62 mặc vào nhìn như 1m70 vậy á. Mang đi resort nghỉ dưỡng chụp hình mà ai cũng tưởng set đồ thiết kế đi tiệc. Đường may giấu chỉ sắc sảo, không cọ xát da.',
  },
  {
    id: 'rv-20',
    productId: 'the-evening-edit',
    author: 'Phan Minh A.',
    date: '2026-09-19T08:50:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    photo: '/images/classic-set-brown-detail.jpg',
    text: 'Đặt may thủ công đợi gần tuần lễ nhưng nhận hàng thì thấy hoàn toàn bõ công chờ đợi. Đóng hộp cứng cáp, từng nếp gấp phẳng phiu tinh tế. Chất vải tencel rủ tự nhiên, mặc lên người toát ra vẻ thanh lịch sang trọng ngầm.',
  },
  {
    id: 'rv-21',
    productId: 'the-evening-edit',
    author: 'Diệu Anh N.',
    date: '2026-09-10T14:15:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'S',
    photo: null,
    text: 'Thiết kế mang năng lượng Thổ an lành ấm áp. Vải tự nhiên mềm mại, không bị tích điện hay dính dính vào chân vào những ngày mùa đông hanh khô. Mặc ngủ một giấc dậy thấy tinh thần khoan khoái hẳn.',
  },
  {
    id: 'rv-22',
    productId: 'the-evening-edit',
    author: 'Kim Oanh L.',
    date: '2026-09-02T11:00:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    photo: null,
    text: 'Mua set này tặng quà cưới cho cô bạn thân, nó khen nức nở bảo là món quà ưng ý nhất trong các quà được tặng. Chất vải sờ là biết đồ cao cấp xịn sò, không phải hàng may công nghiệp đại trà.',
  },
  {
    id: 'rv-24',
    productId: 'the-evening-edit',
    author: 'Thục Quyên T.',
    date: '2026-08-16T21:40:00.000Z',
    rating: 5,
    color: 'Sọc Nâu',
    size: 'M',
    photo: null,
    text: 'Bộ pijama sang và êm nhất tủ đồ của mình tính đến giờ. Dáng áo thanh mảnh, cổ bẻ vừa vặn không bị xộc xệch. Mặc ở nhà tiếp khách hay ăn tối thân mật gia đình đều rất nhã nhặn, tôn trọng người đối diện.',
  },
  {
    id: 'rv-23',
    productId: 'the-evening-edit',
    author: 'Thảo Nguyên D.',
    date: '2026-08-24T18:30:00.000Z',
    rating: 4,
    color: 'Sọc Nâu',
    size: 'S',
    photo: null,
    text: 'Chất vải Tencel mềm rủ như mơ, mặc thích mê tơi. Do vải tự nhiên cao cấp nên khi giặt xong cần giũ mạnh và phơi trên móc trong bóng mát để giữ form phẳng phiu nhất. Phom dáng suông rộng rãi thoải mái, cho shop 4 sao rưỡi!',
  },
]

export function seedInitialReviews(database) {
  const checkStmt = database.prepare('SELECT COUNT(1) AS cnt FROM product_reviews WHERE id = ?')
  const insertReviewStmt = database.prepare(`
    INSERT OR IGNORE INTO product_reviews (
      id, product_id, order_id, item_key, rating, body, display_name,
      status, reject_reason, verified_purchase, source, consent_evidence,
      shop_reply, shop_replied_at, created_at, moderated_at
    ) VALUES (
      ?, ?, NULL, ?, ?, ?, ?,
      'approved', NULL, 0, 'imported', NULL,
      NULL, NULL, ?, ?
    )
  `)

  const insertPhotoStmt = database.prepare(`
    INSERT OR IGNORE INTO review_photos (id, review_id, photo_url, created_at)
    VALUES (?, ?, ?, ?)
  `)

  for (const r of INITIAL_SAMPLE_REVIEWS) {
    const existing = checkStmt.get(r.id)
    if (!existing || existing.cnt === 0) {
      insertReviewStmt.run(
        r.id,
        r.productId,
        `${r.productId}-${r.size || 'std'}`,
        r.rating,
        r.text,
        r.author,
        r.date,
        r.date
      )

      if (r.photo) {
        insertPhotoStmt.run(`photo_${r.id}`, r.id, r.photo, r.date)
      }
    }
  }
}
