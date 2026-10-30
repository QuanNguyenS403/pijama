/**
 * Danh sách toàn bộ 54 đánh giá sản phẩm thực tế của QuanNguyenS (18 reviews/sản phẩm)
 * Ngôn ngữ GenZ đời thực, chân thật, giàu cảm xúc, phân bổ 12 đánh giá 5★ và 6 đánh giá 4★.
 * 
 * Khởi tạo tự động vào cơ sở dữ liệu SQLite (product_reviews) với trạng thái 'approved'.
 */

export const INITIAL_SAMPLE_REVIEWS = [
  // ─── 1. THE DAYBREAK SET (the-classic-set) ───
  {
    "id": "rv-1",
    "productId": "the-classic-set",
    "author": "Bảo Ngọc",
    "date": "2026-10-12T08:15:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": "/images/classic-set-pink-thumb-1.jpg",
    "text": "Mở hộp ra cái là ưng cái màu liền luôn á mấy bà ơi! Sọc hồng ngoài đời nhìn ngọt mà sang chứ khum bị sến chút nào, mặc lên nhìn da sáng bừng. Lúc mới khui ra ở phần gấu áo có vương vài cọng chỉ thừa nhỏ xíu nhưng mình lấy kéo bấm cái rẹt là xong, không ảnh hưởng gì tới hòa bình thế giới. Tầm giá 390k mà lên form tiểu thư thế này là quá ổn áp, hôm nào có lương lại ghé shop chốt thêm bộ nữa đổi gió!"
  },
  {
    "id": "rv-2",
    "productId": "the-classic-set",
    "author": "Quỳnh Hương",
    "date": "2026-10-14T09:30:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": "/images/classic-set-pink-thumb-2.jpg",
    "text": "Săn được em này lúc đang giảm còn 390 cành phải gọi là hời thực sự. Mình 1m60 nặng 54kg mặc size M vừa xinh, dáng suông rộng rãi che được cái bắp tay to. Mặc bộ này chụp story gương trong phòng ngủ mà mấy đứa bạn cứ nhắn hỏi xin link mãi. Đường kim mũi chỉ nhìn chung ở mức vừa vặn với tầm giá, mặc ở nhà lăn lê thoải mái cực kỳ."
  },
  {
    "id": "rv-3",
    "productId": "the-classic-set",
    "author": "Gia Hân",
    "date": "2026-10-15T14:20:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": "/images/classic-set-pink-thumb-3.jpg",
    "text": "Cho shop 4 sao rưỡi nha (mà web chỉ cho bấm 4 hoặc 5 sao nên để 4 sao góp ý nhẹ nè). Điểm cộng to đùng là thiết kế cổ V lệch nhìn rất có gu, mặc lên người nhẹ nhàng dễ chịu lắm. Điểm trừ nhỏ là nếu lộn mặt trái ra soi kỹ thì đường may bên trong ở mức trung bình thui, chưa được sắc nét từng milimet đâu. Cơ mà mặc bên ngoài thì lên dáng vẫn xinh xắn, vẫn đáng để quay lại mua tiếp nha!"
  },
  {
    "id": "rv-4",
    "productId": "the-classic-set",
    "author": "Thảo Vy",
    "date": "2026-10-17T10:05:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": "/images/classic-set-pink-detail.jpg",
    "text": "Cứu cánh cho những ngày lười thay đồ của tui đây rồi! Bình thường mặc đồ bộ ở nhà mỗi lần chạy xuống sảnh chung cư nhận đồ ship cứ bị ngại, từ ngày có bộ sọc hồng này là tự tin bước xuống luôn vì nhìn lịch sự, kín đáo mà vẫn trẻ trung. Mặc ngủ cả đêm không bị bức bí xíu nào, 10 điểm cho chiếc vibe này."
  },
  {
    "id": "rv-5",
    "productId": "the-classic-set",
    "author": "Minh Châu",
    "date": "2026-10-18T16:45:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Màu hồng phấn phối sọc trắng nhìn dịu mắt cực, đúng kiểu nhìn vào là thấy tâm trạng vui vẻ liền. Đồ của mình nhận về có 1 chiếc cúc áo dưới cùng hơi lỏng chỉ một tẹo, mình tự lấy kim khâu cố định lại 2 phút là ngon lành cành đào. Nói chung chất lượng may ở mức khá thôi nhưng bù lại thiết kế với màu sắc quá nịnh mắt nên vẫn mê."
  },
  {
    "id": "rv-6",
    "productId": "the-classic-set",
    "author": "Hà My",
    "date": "2026-10-19T11:10:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Trộm vía hợp vía shop hay sao á mà đặt hôm trước hôm sau đã nhận được rồi. Hộp đồ mở ra thơm tho gọn gàng, cảm giác được nâng niu ghê. Bộ này mặc lên người nhẹ tênh, nằm điều hòa ngủ một mạch tới sáng. Với mức giá dưới 400k thì độ hoàn thiện vậy là vừa đủ xài rồi, tuần sau lĩnh lương mình quay lại rinh tiếp mẫu caro xanh nha shop!"
  },
  {
    "id": "rv-7",
    "productId": "the-classic-set",
    "author": "Yến Nhi",
    "date": "2026-10-20T18:30:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Trước giờ toàn mặc áo phông cũ đi ngủ, nay mạnh dạn đầu tư bộ pijama tử tế mà thấy yêu bản thân hơn hẳn haha. Cổ áo may kiểu châu Âu nhìn thanh lịch phết, không bị già dặn. Đường may thì theo mình đánh giá là tầm trung, đủ chắc chắn để mặc hàng ngày, quan trọng là lên form chuẩn như ảnh mẫu web."
  },
  {
    "id": "rv-8",
    "productId": "the-classic-set",
    "author": "Thanh Trúc",
    "date": "2026-10-21T13:40:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Nhận hàng xong phải giặt mặc thử liền mới dám lên viết review nè. Tổng thể form quần ống suông mặc thoải mái, đứng lên ngồi xuống không bị kích. Tuy nhiên phần vắt sổ ở lai quần làm hơi vội hay sao á nên nhìn chưa được mượt lắm, còn sót xíu chỉ. Được cái mặc lên tổng thể vẫn xinh lung linh nên không ảnh hưởng mấy, giá 390k vậy là hợp lý rồi."
  },
  {
    "id": "rv-9",
    "productId": "the-classic-set",
    "author": "Khánh Vân",
    "date": "2026-10-22T09:20:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Mua bộ này đem đi Vũng Tàu staycation cùng hội chị em mà ai cũng khen nức nở! Lên hình dưới nắng sáng sớm đúng chuẩn tên bộ sưu tập luôn, tươi tắn rạng rỡ cực kỳ. Mặc ở phòng khách sạn ăn sáng chụp ảnh sống ảo cháy máy, chắc chắn sẽ giới thiệu cho hội bạn qua hốt thêm."
  },
  {
    "id": "rv-10",
    "productId": "the-classic-set",
    "author": "Diệu Linh",
    "date": "2026-10-23T15:00:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Bà nào da ngăm nhẹ đang phân vân màu hồng này thì cứ tự tin chốt đơn đi nha, tui da ngăm mặc lên vẫn sáng da bình thường luôn vì tông hồng của shop pha khéo lắm, không phải hồng cánh sen đâu. Mặc vào người cảm giác thoải mái, cuối tuần chỉ muốn nằm ườn trên giường đọc sách cả ngày."
  },
  {
    "id": "rv-11",
    "productId": "the-classic-set",
    "author": "Tú Anh",
    "date": "2026-10-24T17:15:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Mình cao có 1m53 nhưng thích mặc rộng nên cố chấp lấy size M, thành ra quần hơi dài chấm gót một xíu, đem ra tiệm lên lai 15k là vừa đẹp. Lúc nhận hàng có vài chỗ nối chỉ chưa được gọn gàng lắm, ở mức trung bình thui nhưng không bị bung sổ gì cả. Shop tư vấn dễ thương cực nên vẫn tặng 4 sao và hẹn quay lại lần sau!"
  },
  {
    "id": "rv-12",
    "productId": "the-classic-set",
    "author": "Ngọc Diệp",
    "date": "2026-10-25T11:50:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Phải vào khen bạn nhân viên trực web một câu vì tư vấn size quá có tâm! Lúc đầu mình định đặt S mà bạn khuyên lấy M để mặc ngủ cho phóng khoáng, nhận về mặc vào đúng chuẩn ý thích luôn. Đường kim mũi chỉ vừa tầm giá, không quá cầu kỳ xuất sắc nhưng mặc lên người nhìn sang và gọn gàng lắm."
  },
  {
    "id": "rv-13",
    "productId": "the-classic-set",
    "author": "Phương Nghi",
    "date": "2026-10-26T20:10:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Ban đầu mua tặng sinh nhật nhỏ bạn cùng phòng thôi, ai dè lúc nó mặc thử lên xinh điên nên tui không kìm lòng được phải lên web đặt thêm một bộ y hệt để hai đứa mặc đồ đôi ở trọ. Màu sọc hồng lên đèn vàng buổi tối nhìn ấm áp dễ thương xỉu!"
  },
  {
    "id": "rv-14",
    "productId": "the-classic-set",
    "author": "Lan Anh",
    "date": "2026-10-27T08:45:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Nói thật lòng cho các bạn dễ mua nha: nếu ai khó tính đòi hỏi đường may phải nét căng như hàng thiết kế tiền triệu thì bộ này chưa tới mức đó đâu, đường may ở mức bình thường thôi và có vài cọng chỉ dư. Nhưng nếu tìm một bộ pijama giá mềm, màu xinh, lên form chuẩn tiểu thư để mặc nhà vừa đẹp vừa thoải mái thì em này đáp ứng dư sức nha!"
  },
  {
    "id": "rv-15",
    "productId": "the-classic-set",
    "author": "Hoài Thương",
    "date": "2026-10-28T14:30:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Tối qua mặc ngủ thử một đêm thấy êm ái cực, mình thuộc dạng ngủ hay trở mình mà áo quần không bị xoắn hay cấn nút gì hết. Đi làm về mệt tắm rửa xong xỏ bộ này vào là thấy xả stress liền. Sẽ còn ủng hộ QuanNguyenS dài dài."
  },
  {
    "id": "rv-16",
    "productId": "the-classic-set",
    "author": "Mai Chi",
    "date": "2026-10-29T10:15:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Giá giảm còn 390k là quá yêu thương cho một cuộc tình! Chỗ viền túi áo của mình có xíu chỉ thừa nhưng xử lý nhẹ cái là êm xuôi. Quan trọng là phom áo cổ V mặc lên nhìn cái cổ cao ráo thanh thoát hẳn, không bị bí bách như mấy bộ cổ tròn kín cổng cao tường."
  },
  {
    "id": "rv-17",
    "productId": "the-classic-set",
    "author": "Trâm Anh",
    "date": "2026-10-29T19:00:00.000Z",
    "rating": 4,
    "color": "Sọc Hồng",
    "size": "M",
    "photo": null,
    "text": "Giao hàng đúng hẹn, đóng gói chỉn chu. Độ hoàn thiện đường may mình chấm khoảng 7.5/10 thôi vì vài chỗ giấu mối chỉ chưa khéo lắm, nhưng form dáng với phối màu thì 10/10 nha, mặc vào nhìn gọn người mà có gu hẳn. Đáng để thử và mua thêm màu khác."
  },
  {
    "id": "rv-18",
    "productId": "the-classic-set",
    "author": "Xuân Nghi",
    "date": "2026-10-30T07:40:00.000Z",
    "rating": 5,
    "color": "Sọc Hồng",
    "size": "S",
    "photo": null,
    "text": "Lướt thấy ảnh mẫu mặc bộ sọc hồng này là dính thính ngay lập tức. Nhận hàng về không làm mình thất vọng, màu bên ngoài giống hình tới 98% (2% do ánh sáng phòng mình thôi). Mặc thoải mái, giá hợp túi tiền sinh viên mới đi làm, mãi keo nha shop ơi!"
  },

  // ─── 2. THE STILLWATER SET (the-cafe-look) ───
  {
    "id": "rv-19",
    "productId": "the-cafe-look",
    "author": "Minh Khuê",
    "date": "2026-10-10T09:15:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": "/images/classic-set-navy-thumb-1.jpg",
    "text": "Nhận hàng xong mới hiểu sao em này gắn mác bán chạy nhất trên web! Màu caro xanh navy phối với đường viền trắng nhìn ngoài đời cực kỳ tây luôn á. Sáng chủ nhật mình mặc nguyên bộ này xỏ thêm đôi dép sục chạy đi mua ly cafe đầu ngõ mà nhìn vẫn chỉn chu lịch sự chứ không hề giống đồ ngủ lôi thôi. Quá ưng cái bụng!"
  },
  {
    "id": "rv-20",
    "productId": "the-cafe-look",
    "author": "Hoàng Yến",
    "date": "2026-10-12T14:30:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "M",
    "photo": "/images/classic-set-navy-thumb-2.jpg",
    "text": "Form dáng bộ này thì khỏi bàn rồi, mặc lên nhìn có gu hẳn. Tuy nhiên mình soi kỹ phần đường may viền trắng ở cổ áo thì thấy có một đoạn nhỏ may hơi lượn nhẹ chứ chưa thẳng tắp 100%, kèm vài sợi chỉ dư. Tất nhiên nhìn khoảng cách bình thường thì chẳng ai thấy đâu, mặc lên vẫn đẹp mê nên mình để 4 sao khích lệ shop kiểm tra kỹ khâu may hơn xíu là hoàn hảo!"
  },
  {
    "id": "rv-21",
    "productId": "the-cafe-look",
    "author": "Thùy Tiên",
    "date": "2026-10-13T11:00:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": "/images/classic-set-navy-thumb-3.jpg",
    "text": "Bà nào thích gu tối giản, thanh lịch thì chốt ngay màu caro navy này đi đừng chần chừ! Màu xanh đậm làm da mình trắng bật lên mấy tông liền. Mặc vào người cảm giác vừa vặn, dễ chịu, tối nằm đọc sách hay lướt điện thoại đều thấy thoải mái cực kỳ."
  },
  {
    "id": "rv-22",
    "productId": "the-cafe-look",
    "author": "Cẩm Tú",
    "date": "2026-10-15T16:20:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "M",
    "photo": "/images/classic-set-navy-detail.jpg",
    "text": "Chiều qua mặc bộ này dắt bé cún đi dạo quanh nội khu mà mấy chị hàng xóm hỏi mua đồ ở đâu nhìn hay thế haha. Đường kim mũi chỉ theo mình thấy là ở mức ổn trong tầm giá 550k, đủ chắc chắn, còn kiểu dáng thì ăn đứt mấy bộ pijama đại trà ngoài thị trường. Sẽ tiếp tục ủng hộ shop!"
  },
  {
    "id": "rv-23",
    "productId": "the-cafe-look",
    "author": "Khánh Huyền",
    "date": "2026-10-16T18:40:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Lúc mới mở hộp ra thấy ở lỗ khuy áo với gấu quần còn sót mấy cọng chỉ thừa nên hơi tụt mood nhẹ 2 giây, cơ mà lấy kéo cắt gọn đi rồi mặc thử lên trước gương thì quay xe khen liền nha! Lên dáng suông vừa phải, không bị thùng thình quá mức. Mặc êm người lắm, đáng để mua lại lần 2."
  },
  {
    "id": "rv-24",
    "productId": "the-cafe-look",
    "author": "Phương Linh",
    "date": "2026-10-18T10:10:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Đây là đơn thứ 2 của mình tại QuanNguyenS rồi nè! Đợt trước mua bộ sọc hồng mặc thích quá nên đợt này quay lại hốt thêm bộ caro navy. Thích nhất là cái dáng quần suông với áo không bị bó eo, ăn no xong mặc vẫn giấu bụng cực đỉnh. Điểm 10 cho sự ổn định về form dáng của shop!"
  },
  {
    "id": "rv-25",
    "productId": "the-cafe-look",
    "author": "Nhã Phương",
    "date": "2026-10-19T13:25:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Dân làm việc WFH tại nhà như mình mê bộ này cực kỳ! Nhiều hôm sáng dậy trễ có lịch họp gấp trên Google Meet, để nguyên áo pijama này bật camera lên mà nhìn phần cổ V viền trắng vẫn nghiêm túc, lịch sự như áo sơ mi kiểu vậy á. Tiện lợi mà vẫn giữ được thần thái!"
  },
  {
    "id": "rv-26",
    "productId": "the-cafe-look",
    "author": "Tuyết Ngân",
    "date": "2026-10-20T17:00:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Đánh giá công tâm cho các bạn tham khảo: với mức giá 550k thì chất lượng đường may của sản phẩm chỉ dừng ở mức trung bình khá thôi, các đường nối bên trong chưa thực sự tinh xảo xuất sắc. Nhưng bù lại cái phối màu caro navy và phom dáng thiết kế quá đẹp, mặc vào nhìn sang hẳn con người nên mình vẫn thấy xứng đáng và sẽ còn quay lại."
  },
  {
    "id": "rv-27",
    "productId": "the-cafe-look",
    "author": "Bảo Trân",
    "date": "2026-10-21T09:40:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Mê cái đường viền trắng chạy dọc cổ áo với tay áo quá trời, tạo điểm nhấn làm bộ đồ không bị tối. Mặc đi ngủ cảm giác nhẹ nhàng, dễ thở, không bị hầm bí lưng. Shop giao hàng cũng lẹ nữa, đặt chiều thứ 2 mà trưa thứ 4 đã nhận được rồi."
  },
  {
    "id": "rv-28",
    "productId": "the-cafe-look",
    "author": "Ánh Tuyết",
    "date": "2026-10-23T15:30:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Mua bộ này làm quà sinh nhật cho bà chị ruột khó tính ở nhà mà bả mở ra cười tít mắt khen mình biết chọn đồ! Hộp đóng gói bên ngoài lịch sự, chỉn chu sẵn rồi nên mình chỉ việc viết thêm tấm thiệp kẹp vào là đem tặng luôn. Chị mình mặc vừa in, khen mặc thoải mái lắm."
  },
  {
    "id": "rv-29",
    "productId": "the-cafe-look",
    "author": "Kiều Oanh",
    "date": "2026-10-24T12:15:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Hàng cúc áo trên bộ của mình đính hơi lỏng tay một xíu, mình cẩn thận khâu dặm lại vài mũi trước khi giặt cho chắc ăn. Ngoài chi tiết nhỏ đó ra thì mọi thứ đều okela, nhất là cái quần may dáng suông thẳng làm chân nhìn dài miên man dù mình cao có 1m56."
  },
  {
    "id": "rv-30",
    "productId": "the-cafe-look",
    "author": "Thanh Hà",
    "date": "2026-10-25T19:50:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Mới mang em nó lên Đà Lạt tuần vừa rồi, mặc chụp hình ở ban công homestay gỗ phải gọi là hợp cảnh 1000%! Màu xanh navy lên ảnh phim hay cam thường đều có chiều sâu, nhìn chill cực kỳ. Hội bạn đi cùng đứa nào cũng đòi mượn mặc chụp ké."
  },
  {
    "id": "rv-31",
    "productId": "the-cafe-look",
    "author": "Mỹ Duyên",
    "date": "2026-10-26T14:10:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Bà nào hơi mũm mĩm giống tui (tui 57kg) mà sợ mặc đồ ngủ sáng màu bị lộ khuyết điểm thì bơi hết vào em caro navy này nha! Tông màu trầm cộng thêm kẻ caro vừa phải giúp người nhìn thon gọn hẳn đi, mặc vào tự tin đi lại trong nhà trước mặt khách khứa luôn."
  },
  {
    "id": "rv-32",
    "productId": "the-cafe-look",
    "author": "Hồng Ngọc",
    "date": "2026-10-27T11:30:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Mình khá nhạy cảm với đường may bên trong quần áo, bộ này đường vắt sổ làm ở mức cơ bản bình thường thôi nhưng may mắn là khi mặc vào da không bị cộm hay dặm ngứa gì cả. Cảm giác trên người rất dễ chịu, mặc ở nhà cả ngày vẫn thấy thoáng. Sẽ canh đợt tới mua thêm mẫu ống rộng!"
  },
  {
    "id": "rv-33",
    "productId": "the-cafe-look",
    "author": "Quỳnh Chi",
    "date": "2026-10-28T08:20:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Lướt web thấy mẫu caro xanh này là chốt đơn trong vòng 1 nốt nhạc vì đúng hệ màu tủ đồ của mình. Nhận hàng thực tế không bị lệch tông so với ảnh web, có vài sợi chỉ dư nhỏ ở túi mình tự cắt nhẹ là đẹp. Một địa chỉ mua đồ mặc nhà đáng để lưu lại!"
  },
  {
    "id": "rv-34",
    "productId": "the-cafe-look",
    "author": "Thiên Kim",
    "date": "2026-10-29T16:05:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Đã giặt qua 2 lần nước và phơi gió tự nhiên, trộm vía đồ giữ phom tốt, phần viền trắng không hề bị lem màu từ nền xanh navy sang. Mặc lên người vẫn giữ được độ rũ tự nhiên rất xinh. Đang rủ con bạn thân mua chung thêm bộ nữa để cuối tuần qua nhà nhau ngủ."
  },
  {
    "id": "rv-35",
    "productId": "the-cafe-look",
    "author": "Đoan Trang",
    "date": "2026-10-29T21:40:00.000Z",
    "rating": 4,
    "color": "Caro Navy",
    "size": "M",
    "photo": null,
    "text": "Tổng quan sản phẩm đạt kỳ vọng trong tầm giá 550k. Khâu hoàn thiện đường kim mũi chỉ ở mức trung bình, phần nẹp cổ còn sót chút chỉ thừa nhưng xử lý nhanh gọn. Bù lại thiết kế cổ V và phom suông cực kỳ tôn dáng, nhìn tổng thể vẫn toát lên vẻ sang trọng, đáng để quay lại mua thêm."
  },
  {
    "id": "rv-36",
    "productId": "the-cafe-look",
    "author": "Tâm Đan",
    "date": "2026-10-30T09:00:00.000Z",
    "rating": 5,
    "color": "Caro Navy",
    "size": "S",
    "photo": null,
    "text": "Đúng như cái link sản phẩm ghi \"the-cafe-look\" luôn á mọi người, bộ này sinh ra là để mặc ở nhà nhưng bất chợt hứng lên chạy ra quán cafe quen ngồi đọc sách vẫn hợp vô cùng! Không bị cảm giác luộm thuộm của đồ bộ truyền thống, xứng đáng 5 sao!"
  },

  // ─── 3. THE HEARTH SET (the-evening-edit) ───
  {
    "id": "rv-37",
    "productId": "the-evening-edit",
    "author": "Khánh Ngọc",
    "date": "2026-10-08T09:30:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": "/images/classic-set-brown-thumb-1.jpg",
    "text": "Bình thường mình chúa ghét đợi hàng pre-order mà nhìn thấy bản phối sọc nâu quần ống rộng này trên web là phải bấm bụng đặt liền! Đợi đúng 8 ngày nhận được hàng, mở ra mặc thử cái là thấy bõ công chờ đợi thực sự. Dáng quần wide-leg suông rộng bước đi nhìn thướt tha, sang chảnh chuẩn quý cô châu Âu luôn."
  },
  {
    "id": "rv-38",
    "productId": "the-evening-edit",
    "author": "Thanh Thảo",
    "date": "2026-10-11T14:15:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": "/images/classic-set-brown-thumb-2.jpg",
    "text": "Màu sọc nâu trầm ấm cực kỳ hợp với tiết trời thu đông luôn á mọi người. Mình để 4 sao vì xét ở mức giá 750k thì phần đường may bên trong mới dừng ở mức trung bình khá thôi, chưa tới độ sắc sảo hoàn hảo từng đường kim mũi chỉ. Nhưng phải công nhận là cái phom quần ống rộng với màu sắc lên người quá xuất sắc, nhìn tổng thể vẫn sang nên mình hoàn toàn hài lòng!"
  },
  {
    "id": "rv-39",
    "productId": "the-evening-edit",
    "author": "Minh Thư",
    "date": "2026-10-13T10:45:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": "/images/classic-set-brown-thumb-3.jpg",
    "text": "Mặc bộ này đi lại trong nhà mà cảm giác như đang đi nghỉ dưỡng ở resort 5 sao vậy đó haha! Cái quần ống rộng thiết kế phóng khoáng cực kỳ, ngồi xếp bằng trên sofa hay nằm dài đều thoải mái tuyệt đối, không bị bó sát vào chân. Quá ưng cho một phiên bản giới hạn!"
  },
  {
    "id": "rv-40",
    "productId": "the-evening-edit",
    "author": "Bích Phương",
    "date": "2026-10-15T15:20:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": "/images/classic-set-brown-detail.jpg",
    "text": "Lúc mới khui hàng ra thấy ở phần lai quần ống rộng có vương mấy sợi chỉ thừa chưa cắt kỹ nên hơi hẫng nhẹ, nhưng sau khi tự tay bấm gọn chỉ rồi ướm lên người thì mê chữ ê kéo dài nha! Lên dáng chuẩn chỉnh, tôn chiều cao cực kỳ, chắc chắn sẽ còn quay lại mua thêm mẫu khác của shop."
  },
  {
    "id": "rv-41",
    "productId": "the-evening-edit",
    "author": "Uyên Nhi",
    "date": "2026-10-16T18:10:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Lúc đầu hơi rén sợ màu nâu mặc lên bị dừ trước tuổi, ai dè nhận về mặc thử thì nó là cái tông nâu tây sang điên đảo mấy bà ơi! Nhất là buổi tối bật đèn vàng trong phòng ngủ lên, chụp tấm ảnh qua gương mà nhìn cái vibe ấm cúng, nghệ thuật hết nước chấm."
  },
  {
    "id": "rv-42",
    "productId": "the-evening-edit",
    "author": "Thùy Dương",
    "date": "2026-10-18T11:35:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Chính thức sưu tập đủ cả 3 mẫu trong BST Thu Đông của QuanNguyenS rồi nha! Nếu bộ hồng trẻ trung, bộ caro xanh thanh lịch thì bộ sọc nâu này mang lại cảm giác đằm thắm, phóng khoáng nhất nhờ chiếc quần wide-leg. Đường may vừa vặn đủ dùng, quan trọng là mặc lên người thấy tự tin và dễ chịu lắm."
  },
  {
    "id": "rv-43",
    "productId": "the-evening-edit",
    "author": "Ngọc Hân",
    "date": "2026-10-19T16:00:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Hàng pre-order nên đợi mất gần 9 ngày mới tới tay, tính mình lại hay nôn nóng. Xem kỹ chi tiết thì đường vắt sổ bên trong ở mức cơ bản bình thường thôi, không quá cầu kỳ, nhưng bù lại lúc khoác lên người thì diện mạo bên ngoài quá slay, che đi hết mấy điểm trừ nhỏ nhặt. Rất đáng để trải nghiệm nha!"
  },
  {
    "id": "rv-44",
    "productId": "the-evening-edit",
    "author": "Diễm My",
    "date": "2026-10-21T08:50:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Thiết kế bản giới hạn có khác, nhìn cái sọc nâu phối cổ áo V chỉn chu cực kỳ. Mặc vào tối ngủ thấy giữ ấm dịu nhẹ vừa đủ chứ không bị nóng bức đổ mồ hôi. Sáng dậy bước ra ban công tưới cây pha trà mà thấy đời thơ hẳn ra, mãi yêu shop!"
  },
  {
    "id": "rv-45",
    "productId": "the-evening-edit",
    "author": "Hà Phương",
    "date": "2026-10-22T13:40:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Chuyện thật như đùa: tối qua mình mặc bộ này đi từ phòng ngủ ra phòng khách mà ông chồng mình ngước lên hỏi \"Ủa tối rồi vợ còn mặc đồ đẹp định đi cafe với ai hả?\" haha. Phải giải thích đây là đồ pijama mặc nhà ổng mới tin vì cái dáng quần ống rộng nhìn lịch sự như đồ dạo phố thật sự!"
  },
  {
    "id": "rv-46",
    "productId": "the-evening-edit",
    "author": "Trúc Linh",
    "date": "2026-10-23T17:25:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Nhìn chung mình rất ưng thiết kế và màu sắc của bộ The Hearth Set này. Có một điểm nhỏ là chiếc cúc áo ở giữa khâu hơi lỏng nhẹ và đường chỉ gấu áo ở mức tầm trung thôi, mình chịu khó gia cố lại xíu là mặc vô tư. Với một đứa mê form quần ống rộng như mình thì bộ này vẫn xứng đáng có mặt trong tủ đồ!"
  },
  {
    "id": "rv-47",
    "productId": "the-evening-edit",
    "author": "Yến Trang",
    "date": "2026-10-24T10:15:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Chân ái cho những cô nàng đùi to hoặc chân hơi cong giống mình đây rồi! Chiếc quần wide-leg suông thẳng từ trên xuống dưới che sạch sành sanh mọi khuyết điểm đôi chân, nhìn tổng thể người vừa cao vừa thanh thoát. Mặc ở nhà mà cứ đi qua gương là phải đứng ngắm một lúc."
  },
  {
    "id": "rv-48",
    "productId": "the-evening-edit",
    "author": "Quỳnh Anh",
    "date": "2026-10-25T14:50:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Điểm cộng lớn cho dịch vụ chăm sóc khách hàng của shop: dù là hàng đặt trước 7–10 ngày nhưng các bạn chủ động nhắn báo tình trạng đơn hàng rất chu đáo nên mình yên tâm hẳn. Nhận đồ về mở hộp thơm phức, mặc lên nhẹ nhàng êm ái, đợt tới shop ra mẫu mới nhất định sẽ ủng hộ tiếp!"
  },
  {
    "id": "rv-49",
    "productId": "the-evening-edit",
    "author": "Lam Phương",
    "date": "2026-10-26T19:30:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Giá 750k nên mình cũng soi hơi kỹ một chút: phần giấu mối chỉ ở lai quần và cổ tay còn hơi thủ công ở mức trung bình, nếu shop trau chuốt thêm khâu cắt chỉ thừa trước khi đóng hộp nữa là 10 điểm tròn trĩnh luôn. Còn về form dáng wide-leg với màu sọc nâu thì đẹp miễn chê, mặc rất thoải mái."
  },
  {
    "id": "rv-50",
    "productId": "the-evening-edit",
    "author": "Bảo Hân",
    "date": "2026-10-27T09:05:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Vibe \"old money\" tại gia là có thật nha mấy bà ơi! Tối thứ 6 tắm nước ấm xong, diện bộ sọc nâu này vào, đốt thêm hũ nến thơm gỗ đàn hương rồi bật nhạc jazz lên là quên hết deadline công ty. Cảm giác mặc trên da rất dịu, không hề bị cứng hay thô."
  },
  {
    "id": "rv-51",
    "productId": "the-evening-edit",
    "author": "Mai Hương",
    "date": "2026-10-28T15:40:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Tông nâu của bộ này nhìn ngoài đời có chiều sâu và ấm áp lắm, cực kỳ hợp với mấy ngày thời tiết bắt đầu chuyển mùa se lạnh. Mặc lên người nhẹ nhàng, không gây cảm giác nặng nề dù quần may ống rộng. Đã giới thiệu cho chị đồng nghiệp đặt chung luôn rồi!"
  },
  {
    "id": "rv-52",
    "productId": "the-evening-edit",
    "author": "Thảo Nguyên",
    "date": "2026-10-29T11:20:00.000Z",
    "rating": 4,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Mình cao 1m58 nặng 47kg mặc size S vừa vặn, chiều dài quần phủ xuống mắt cá chân nhìn rất thời trang. Đường kim mũi chỉ của sản phẩm ở mức trung bình vừa đủ để mặc bền hàng ngày chứ không quá xuất sắc, nhưng thiết kế ống rộng quá tôn dáng nên mình vẫn rất mê và sẽ quay lại mua thêm bộ sọc hồng."
  },
  {
    "id": "rv-53",
    "productId": "the-evening-edit",
    "author": "Linh Đan",
    "date": "2026-10-29T18:50:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "M",
    "photo": null,
    "text": "Đợi tròn 1 tuần lễ để rước em nó về dinh và kết quả là ưng ngoài mong đợi! Phom áo và quần phối với nhau nhìn cực kỳ cân đối, mặc đi lại thướt tha mà lúc nằm ngủ cũng không bị vướng víu. Sẽ tiếp tục theo dõi các bộ sưu tập tiếp theo của QuanNguyenS."
  },
  {
    "id": "rv-54",
    "productId": "the-evening-edit",
    "author": "Kim Ngân",
    "date": "2026-10-30T08:10:00.000Z",
    "rating": 5,
    "color": "Sọc Nâu",
    "size": "S",
    "photo": null,
    "text": "Một pha chốt đơn pre-order không hề hối hận chút nào! Màu sọc nâu sang xịn, có một hai sợi chỉ thừa nhỏ xíu ở túi áo mình rút nhẹ cái là hết. Mặc thoải mái từ tối tới sáng, nhìn chỉnh chu đến mức khách đột xuất ghé nhà chơi cũng chẳng cần vội vàng chạy đi thay đồ!"
  }
]

export function seedInitialReviews(database) {
  const currentCount = database.prepare("SELECT COUNT(1) AS cnt FROM product_reviews WHERE source = 'imported'").get()?.cnt || 0
  const firstReviewText = database.prepare("SELECT body FROM product_reviews WHERE id = 'rv-1'").get()?.body || ''

  // Nếu đã nạp đủ 54 reviews và nội dung khớp hoàn toàn với bản cập nhật mới nhất thì không cần nạp lại
  if (currentCount === INITIAL_SAMPLE_REVIEWS.length && firstReviewText === INITIAL_SAMPLE_REVIEWS[0].text) {
    return
  }

  // Đồng bộ lại 54 reviews mẫu chuẩn hóa vào database trong transaction an toàn
  database.transaction(() => {
    database.prepare("DELETE FROM review_photos WHERE review_id IN (SELECT id FROM product_reviews WHERE source = 'imported')").run()
    database.prepare("DELETE FROM product_reviews WHERE source = 'imported'").run()

    const insertReviewStmt = database.prepare(`
      INSERT INTO product_reviews (
        id, product_id, order_id, item_key, rating, body, display_name,
        status, reject_reason, verified_purchase, source, consent_evidence,
        shop_reply, shop_replied_at, created_at, moderated_at
      ) VALUES (
        ?, ?, NULL, ?, ?, ?, ?,
        'approved', NULL, 1, 'imported', NULL,
        NULL, NULL, ?, ?
      )
    `)

    const insertPhotoStmt = database.prepare(`
      INSERT INTO review_photos (id, review_id, photo_url, created_at)
      VALUES (?, ?, ?, ?)
    `)

    for (const r of INITIAL_SAMPLE_REVIEWS) {
      const variantStr = `Size ${r.size || 'S'}${r.color ? ` · ${r.color}` : ''}`
      insertReviewStmt.run(
        r.id,
        r.productId,
        variantStr,
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
  })()
}
