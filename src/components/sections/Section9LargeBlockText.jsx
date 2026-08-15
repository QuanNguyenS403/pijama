import { motion } from 'framer-motion'

export default function Section9LargeBlockText() {
  return (
    <section
      id="section-large-block-text"
      aria-label="Large Block Text Section"
      className="py-24 sm:py-28 md:py-32 bg-[#631521] bg-weave-pattern text-white border-b border-white/10 relative overflow-hidden text-center"
    >
      {/* Decorative wood grain / woven subtle overlay bands */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4A0D17]/80 via-transparent to-[#4A0D17]/80 pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Subtitle tag */}
          <span className="font-serif text-sm sm:text-base font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-4">
            Bản Tuyên Ngôn Nghề Nghiệp
          </span>

          {/* Tiêu đề: Tiêu đề serif lớn màu trắng: "AUTHENTICITY & CRAFTSMANSHIP" */}
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.08] mb-8">
            AUTHENTICITY & CRAFTSMANSHIP
          </h2>

          <div className="w-24 h-[2px] bg-[#D4AF37] mx-auto mb-10" />

          {/* Mô tả: Văn bản mô tả dài inter tập trung vào giá trị thủ công, nguồn gốc nguyên liệu và cam kết chất lượng */}
          <div className="space-y-6 text-base sm:text-lg md:text-xl font-sans text-white/90 font-light leading-relaxed text-balance">
            <p>
              Chúng tôi tin rằng sự xa xỉ thực thụ trong thế giới hiện đại bắt nguồn từ tính nguyên bản và sự thuần khiết. Mỗi sợi vải đũi mộc được thu hoạch từ những cánh đồng canh tác hữu cơ bền vững, trải qua quá trình tuyển lựa nghiêm ngặt và ủ men tự nhiên không sử dụng hóa chất tẩy trắng công nghiệp.
            </p>
            <p>
              Dưới bàn tay khéo léo của các nghệ nhân dệt thoi truyền thống, từng đường đan cài sợi ngang sợi dọc được tính toán chuẩn xác để tạo nên cấu trúc vi xốp rỗng đặc trưng. Đó là nơi không khí tự do lưu thông, mang lại cảm giác mát dịu tức thì khi chạm vào làn da, đồng thời lưu giữ độ bền vượt trội qua năm tháng.
            </p>
            <p>
              Cam kết chất lượng của chúng tôi là lời hứa không bao giờ thỏa hiệp với sự vội vã. Mỗi sản phẩm khi đến tay bạn là một tác phẩm dệt may trọn vẹn sự tận tâm, tôn vinh vẻ đẹp chân thật của cuộc sống và nâng niu từng giấc ngủ an lành của mọi gia đình.
            </p>
          </div>

          <div className="mt-12 flex items-center justify-center gap-4 text-xs font-sans tracking-[0.2em] uppercase text-[#D4AF37]">
            <span>◆ 100% NGUYÊN BẢN</span>
            <span>◆ BẢO HÀNH TRỌN ĐỜI ĐƯỜNG MAY</span>
            <span>◆ THÂN THIỆN MÔI TRƯỜNG</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
