import { ThumbsUp, Heart } from 'lucide-react'

// ─── Dữ liệu bình luận Facebook thực tế (Kèm thread phản hồi chuẩn ảnh mẫu) ───
const facebookThreads = [
  {
    id: 1,
    main: {
      name: 'Mai Thương',
      avatar: 'MT',
      avatarBg: '#B45309',
      time: '6 ngày',
      text: 'Trước toàn tốn tiền triệu mua mấy bộ đồ ngủ lụa phi bóng trên mạng, mặc bí bách khó chịu mà giặt 2 lần là xù mép. Từ ngày chuyển sang pijama lụa của QuanNguyenS mới thấy chân ái. Vải lụa tự nhiên chạm vào da mát lịm, nhẹ tênh như không mặc gì. Chồng mình bình thường ít để ý mà nay cũng khen nhìn sang hẳn người ra.',
      likes: 354,
      reactions: ['care', 'haha', 'like'],
    },
    reply: {
      name: 'Hà Trang',
      avatar: 'HT',
      avatarBg: '#631521',
      time: '3 ngày',
      text: 'Chuẩn luôn chị ơi! Em cũng vừa chốt bộ thứ 3 màu Sage xanh cốm. Vải mềm rủ tự nhiên giặt máy không lo nhăn xù, mặc đi dạo xuống sảnh chung cư vừa tiện vừa lịch sự.',
      likes: 128,
      reactions: ['love'],
    },
  },
  {
    id: 2,
    main: {
      name: 'Nguyễn Linh',
      avatar: 'NL',
      avatarBg: '#C5A059',
      time: '2 ngày',
      text: 'Thấy bài viết trên page nhiều review khen nên đặt thử 1 bộ Daybreak sọc hồng. Mặc ngủ một giấc dậy không muốn cởi ra luôn vì quá mềm êm 😭 Không hề bị tích điện hay dính dính vào da. Lần này mình order thêm 2 bộ nữa cho mẹ và chị gái làm quà.',
      likes: 247,
      reactions: ['love', 'like'],
    },
    reply: {
      name: 'QuanNguyenS · Tác giả',
      avatar: 'QN',
      avatarBg: '#631521',
      isAuthor: true,
      time: '1 ngày',
      text: 'Dạ QuanNguyenS cảm ơn chị Linh rất nhiều ạ! Món quà tặng mẹ và chị gái sẽ được shop đóng hộp nơ lụa cao cấp kèm thiệp viết tay chỉn chu chị nha ❤️',
      likes: 56,
      reactions: ['love'],
    },
  },
  {
    id: 3,
    main: {
      name: 'Vũ Phương Thảo',
      avatar: 'PT',
      avatarBg: '#0F7443',
      time: '5 ngày',
      text: 'Review thật tâm dưới bài viết cho các chị em đang phân vân: Mình cao 1m60 nặng 50kg mặc size S vừa chuẩn form. Vải lụa mềm mướt chạm vào mát rượi, cho túi giặt máy giặt xong phơi lên vẫn phẳng phiu. Bật điều hòa ngủ một mạch tới sáng, 10/10 điểm!',
      likes: 312,
      reactions: ['care', 'like'],
    },
    reply: {
      name: 'Trần Thu Hương',
      avatar: 'TH',
      avatarBg: '#7C3AED',
      time: '4 ngày',
      text: 'Cùng size với bạn nè, form quần áo mặc thoải mái mà không bị thùng thình. Đường may giấu chỉ tinh tế cực kỳ, đáng đồng tiền bát gạo!',
      likes: 89,
      reactions: ['like'],
    },
  },
  {
    id: 4,
    main: {
      name: 'Bảo Ngọc',
      avatar: 'BN',
      avatarBg: '#1877F2',
      time: '1 tuần',
      text: 'Mua làm quà sinh nhật tặng mẹ, mẹ khó tính mà cũng tấm tắc khen. Vải tự nhiên thoáng khí không cộm ngứa da nhạy cảm. Thấy bài viết trên page nên vào để lại feedback cảm ơn shop và đội ngũ tư vấn size rất có tâm.',
      likes: 228,
      reactions: ['love', 'care'],
    },
    reply: {
      name: 'Đỗ Quỳnh Anh',
      avatar: 'QA',
      avatarBg: '#A16207',
      time: '5 ngày',
      text: 'Công nhận khâu đóng gói quà của shop xịn xò như đồ hiệu quốc tế chị nhỉ, mở hộp ra thơm phức luôn!',
      likes: 64,
      reactions: ['love'],
    },
  },
  {
    id: 5,
    main: {
      name: 'Lê Thanh Hằng',
      avatar: 'LH',
      avatarBg: '#2563EB',
      time: '4 ngày',
      text: 'Đúng kiểu "từ nhà ra phố" luôn ạ! Thiết kế cổ áo với viền phối màu sang chảnh, sáng dậy tiếp khách tới nhà chơi hay chạy vội xuống sảnh chung cư nhận bưu phẩm vẫn tự tin tuyệt đối. Chất lụa mát rượi mê mẩn.',
      likes: 195,
      reactions: ['like', 'care'],
    },
    reply: {
      name: 'QuanNguyenS · Tác giả',
      avatar: 'QN',
      avatarBg: '#631521',
      isAuthor: true,
      time: '3 ngày',
      text: 'Dạ đó chính là tinh thần Casual Luxury mà QuanNguyenS hướng tới — vừa thư thái thoải mái tại nhà, vừa thanh lịch chỉn chu khi bước ra phố ạ ✨',
      likes: 72,
      reactions: ['love'],
    },
  },
  {
    id: 6,
    main: {
      name: 'Hoàng Bích Thủy',
      avatar: 'BT',
      avatarBg: '#D97706',
      time: '3 ngày',
      text: 'Lướt thấy bài đăng trên Facebook, ban đầu hơi e ngại vì giá cao hơn hàng chợ. Nhưng nhận hàng về sờ vào chất vải mới thấy cực kỳ xứng đáng. Sợi dệt tự nhiên thoáng mát, mặc cả ngày không bí bách. Đã rủ nguyên nhóm bạn cùng đặt.',
      likes: 286,
      reactions: ['love', 'haha'],
    },
    reply: {
      name: 'Nguyễn Minh Thư',
      avatar: 'MT',
      avatarBg: '#059669',
      time: '2 ngày',
      text: 'Nhóm mình 4 đứa rủ nhau mua chung mặc chụp ảnh concept pijama party cưng xỉu luôn bạn ơi 😂 Chất lụa lên hình bóng mờ xịn đét!',
      likes: 93,
      reactions: ['care'],
    },
  },
]

// Nhân đôi danh sách để tạo chuyển động vô tận từ phải sang trái không giật
const marqueeThreads = [...facebookThreads, ...facebookThreads]

// Component hiển thị cụm reaction Facebook (Like, Love, Care, Haha)
function FacebookReactions({ typeList, count }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11.5px] sm:text-[12px] text-[#65676B] font-normal mr-0.5">
        {count}
      </span>
      <div className="flex items-center -space-x-1">
        {typeList.includes('care') && (
          <span
            className="w-4 h-4 rounded-full bg-[#F7B125] flex items-center justify-center text-[10px] ring-1 ring-white shadow-xs select-none"
            title="Thương thương"
          >
            🥰
          </span>
        )}
        {typeList.includes('like') && (
          <span
            className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white ring-1 ring-white shadow-xs"
            title="Thích"
          >
            <ThumbsUp className="w-2.5 h-2.5 fill-current" />
          </span>
        )}
        {typeList.includes('love') && (
          <span
            className="w-4 h-4 rounded-full bg-[#FA383E] flex items-center justify-center text-white ring-1 ring-white shadow-xs"
            title="Yêu thích"
          >
            <Heart className="w-2.5 h-2.5 fill-current" />
          </span>
        )}
        {typeList.includes('haha') && (
          <span
            className="w-4 h-4 rounded-full bg-[#F7B125] flex items-center justify-center text-[10px] ring-1 ring-white shadow-xs select-none"
            title="Haha"
          >
            😆
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Card thiết kế chuẩn 1:1 theo ảnh chụp màn hình comment Facebook ──────────
function FacebookCommentScreenshotCard({ item }) {
  const { main, reply } = item

  return (
    <div className="w-[310px] sm:w-[350px] md:w-[370px] shrink-0 rounded-2xl bg-white p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.28)] border border-white/60 flex flex-col justify-between select-none">
      <div>
        {/* ─── BÌNH LUẬN CHÍNH (Main Comment) ─── */}
        <div className="relative flex items-start gap-2.5">
          {/* Avatar chính */}
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 shadow-xs ring-1 ring-black/5"
            style={{ background: main.avatarBg }}
          >
            {main.avatar}
          </div>

          {/* Đường line kết nối xuống avatar phản hồi (Chuẩn thread Facebook) */}
          <div className="absolute left-[17px] sm:left-[19px] top-10 sm:top-11 bottom-[-16px] w-[2px] bg-[#CCD0D5]" />

          {/* Khung bong bóng bình luận (Facebook Comment Bubble) */}
          <div className="flex-1 min-w-0">
            <div className="bg-[#F0F2F5] rounded-[18px] px-3.5 py-2.5 sm:px-4 sm:py-3 inline-block w-full">
              <span className="font-bold text-[13.5px] sm:text-[14px] text-[#050505] leading-tight block mb-1">
                {main.name}
              </span>
              <p className="text-[12.5px] sm:text-[13px] text-[#050505] leading-[1.48] font-normal">
                {main.text}
              </p>
            </div>

            {/* Thanh tương tác dưới bong bóng */}
            <div className="flex items-center justify-between px-3 mt-1 text-[11px] sm:text-[11.5px] text-[#65676B]">
              <div className="flex items-center gap-3">
                <span className="text-[#65676B] font-normal">{main.time}</span>
                <span className="font-bold hover:underline cursor-pointer">Thích</span>
                <span className="font-bold hover:underline cursor-pointer">Phản hồi</span>
              </div>
              <FacebookReactions typeList={main.reactions} count={main.likes} />
            </div>
          </div>
        </div>

        {/* ─── PHẢN HỒI THREADED (Reply Comment) ─── */}
        {reply && (
          <div className="relative flex items-start gap-2.5 ml-6 sm:ml-7 mt-3">
            {/* Đường móc cong nối từ line chính sang avatar reply */}
            <div className="absolute -left-[9px] sm:-left-[10px] top-0 w-3 sm:w-3.5 h-4.5 border-l-2 border-b-2 border-[#CCD0D5] rounded-bl-lg" />

            {/* Avatar phản hồi */}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shrink-0 shadow-xs ring-1 ring-black/5 z-10 ${
                reply.isAuthor ? 'ring-2 ring-[#631521]' : ''
              }`}
              style={{ background: reply.avatarBg }}
            >
              {reply.avatar}
            </div>

            {/* Khung bong bóng phản hồi */}
            <div className="flex-1 min-w-0">
              <div className="bg-[#F0F2F5] rounded-[16px] px-3 py-2 sm:px-3.5 sm:py-2.5 inline-block w-full">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-[12.5px] sm:text-[13px] text-[#050505] leading-tight">
                    {reply.name}
                  </span>
                  {reply.isAuthor && (
                    <span className="text-[9px] bg-[#631521] text-[#FAF8F5] px-1.5 py-0.2 rounded font-semibold">
                      Tác giả
                    </span>
                  )}
                </div>
                <p className="text-[12px] sm:text-[12.5px] text-[#050505] leading-[1.45] font-normal">
                  {reply.text}
                </p>
              </div>

              {/* Thanh tương tác dưới bong bóng phản hồi */}
              <div className="flex items-center justify-between px-2.5 mt-1 text-[10.5px] sm:text-[11px] text-[#65676B]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[#65676B] font-normal">{reply.time}</span>
                  <span className="font-bold hover:underline cursor-pointer">Thích</span>
                  <span className="font-bold hover:underline cursor-pointer">Phản hồi</span>
                </div>
                <FacebookReactions typeList={reply.reactions} count={reply.likes} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SocialProofScreenshots() {
  return (
    <section
      id="social-proof-screenshots"
      aria-label="Đánh giá thực tế từ bình luận bài viết Facebook"
      className="relative w-full overflow-hidden bg-[#631521] text-white py-12 sm:py-16 lg:py-20 border-b border-white/10"
    >
      {/* Gold accent lines */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      {/* Grain texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px',
        }}
      />

      {/* ─── Tỷ lệ 35:65 (Trái 35% - Phải 65%): Trái = Tiêu đề, Phải = Dải ảnh chụp comment ─── */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-[35fr_65fr] items-center gap-8 lg:gap-10 xl:gap-12">

        {/* ─── PHẦN BÊN TRÁI: Chiếm 35% - Tiêu Đề & Giới Thiệu ─── */}
        <div className="w-full text-left pr-0 lg:pr-4">
          {/* Headline */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold text-[#FAF8F5] tracking-tight leading-[1.18] mb-4">
            Đây Là Những Gì<br />
            Diễn Ra Trong Năm Nay
          </h2>

          <div className="w-16 h-[2px] bg-[#D4AF37] mb-4" />

          {/* Subtitle nhấn mạnh màu vàng chuẩn tone website với kích thước lớn */}
          <p className="font-serif-italic text-2xl sm:text-3xl lg:text-[34px] font-medium text-[#D4AF37] leading-tight tracking-wide">
            Nghe có vẻ như...
          </p>
        </div>

        {/* ─── PHẦN BÊN PHẢI: Chiếm 65% - Dải Ảnh Chụp Comment Chuyển Động Liên Tục Không Dừng ─── */}
        <div className="relative w-full min-w-0 overflow-hidden py-2">
          {/* Left Edge Gradient Fade */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 lg:w-20 bg-gradient-to-r from-[#631521] via-[#631521]/80 to-transparent z-20" />

          {/* Right Edge Gradient Fade */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 lg:w-20 bg-gradient-to-l from-[#631521] via-[#631521]/80 to-transparent z-20" />

          {/* Infinite Loop Track (Chuyển động liên tục từ phải qua trái, không dừng) */}
          <div className="animate-reviews-marquee flex items-stretch gap-4 sm:gap-5 pl-2">
            {marqueeThreads.map((item, index) => (
              <FacebookCommentScreenshotCard
                key={`${item.id}-${index}`}
                item={item}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
