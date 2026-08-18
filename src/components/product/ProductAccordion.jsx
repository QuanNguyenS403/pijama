import Accordion from '../ui/Accordion'
import { Check } from 'lucide-react'

export default function ProductAccordion({ product }) {
  const detailedText = product.detailedDescription || product.longDescription || product.description

  const items = [
    {
      label: 'Mô Tả Chi Tiết Sản Phẩm',
      content: (
        <div className="font-sans font-light text-sm text-[#4A3F38] leading-relaxed space-y-3 whitespace-pre-line">
          {detailedText ? (
            detailedText.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))
          ) : (
            <p>
              Được làm từ chất vải tự nhiên cao cấp mà chúng tôi tự tay tuyển chọn, {product.name} mang lại cảm giác nhẹ nhàng, thoáng mát như không mặc gì — trong khi vẫn đủ thanh lịch để bước ra ngoài mà không cần thay đồ.
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Hướng Dẫn Chọn Size',
      content: (
        <div className="space-y-2 text-sm font-light text-[#4A3F38]">
          <p>
            {product.sizeGuide && Object.values(product.sizeGuide)[0]?.hasOwnProperty('weight')
              ? 'Đối với dáng pijama suông cổ điển châu Âu, bạn có thể dễ dàng chọn theo bảng cân nặng và chiều dài quần/tay — Nếu cân nặng nằm giữa 2 size, hãy chọn size lớn hơn để có phom dáng rộng rãi thoải mái nhất.'
              : 'Sử dụng thước dây đo vòng ngực, vòng eo và vòng hông theo hướng dẫn — Nếu số đo nằm giữa 2 size, hãy chọn size lớn hơn để mặc thoải mái hơn với dáng suông.'}
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-xs sm:text-sm">
            {product.sizeGuide && Object.values(product.sizeGuide)[0]?.hasOwnProperty('weight') ? (
              <>
                <li>Size S: Cân nặng 40–49 kg · Dài quần 90 cm · Dài tay 53,5 cm</li>
                <li>Size M: Cân nặng 50–55 kg · Dài quần 92 cm · Dài tay 54,5 cm</li>
              </>
            ) : (
              <>
                <li>Vòng ngực: đo ở điểm rộng nhất của ngực</li>
                <li>Vòng eo: đo ở điểm nhỏ nhất của eo</li>
                <li>Vòng hông: đo ở điểm rộng nhất của hông</li>
              </>
            )}
          </ul>
        </div>
      ),
    },
    {
      label: 'Chất Liệu & Hướng Dẫn Bảo Quản',
      content: (
        <div className="space-y-4 text-sm font-light text-[#4A3F38]">
          <div>
            <p className="font-medium text-[#1A1614] mb-1.5 uppercase text-xs tracking-wider">Về Chất Liệu:</p>
            <p className="leading-relaxed mb-3">
              {product.fabric || 'QuanNguyenS sử dụng chất liệu sợi tự nhiên cao cấp được tuyển chọn kỹ lưỡng.'} {product.fabricDetail || ''}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs font-medium text-[#631521]">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Sợi tự nhiên</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Kiểm định xuất khẩu</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Thân thiện da</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#D4AF37]" /> Bền bỉ</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8DFD5]">
            <p className="font-medium text-[#1A1614] mb-1.5 uppercase text-xs tracking-wider">Hướng Dẫn Bảo Quản:</p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
              {(product.careInstructions || [
                'Giặt tay hoặc máy chế độ nhẹ (delicate)',
                'Nước lạnh hoặc ấm — tối đa 30°C',
                'Không sử dụng chất tẩy mạnh',
                'Phơi trong bóng mát, tránh ánh nắng trực tiếp',
                'Không sấy máy — để vải giữ form tự nhiên',
                'Ủi ở nhiệt độ thấp nếu cần',
              ]).map((ins, i) => (
                <li key={i}>{ins}</li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      label: 'Chính Sách Đổi Trả',
      content: (
        <p className="font-sans font-light text-sm text-[#4A3F38] leading-relaxed">
          {product.returnPolicy || 'Đổi trả miễn phí trong 30 ngày kể từ ngày nhận hàng — Sản phẩm còn nguyên tag và chưa qua sử dụng — Liên hệ hotline 0981 753 082 để được hỗ trợ nhanh nhất'}
        </p>
      ),
    },
  ]

  return (
    <div className="border-t border-[#E8DFD5]">
      <Accordion items={items} />
    </div>
  )
}
