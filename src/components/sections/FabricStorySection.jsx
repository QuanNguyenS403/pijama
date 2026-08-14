import { useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Wind, Feather, Droplets, Leaf } from 'lucide-react'
import fabricMacroImg from '../../assets/images/fabric-macro.jpg'
import craftsmanshipImg from '../../assets/images/craftsmanship-detail.jpg'

export default function FabricStorySection() {
  const [activeTab, setActiveTab] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const fabricAttributes = [
    {
      id: 'attribute-01',
      number: '01',
      title: 'THOÁNG MÁT',
      subtitle: 'Khả năng hút ẩm 20%',
      icon: Wind,
      heading: 'Cấu Trúc Vi Xốp Thở Tự Nhiên',
      desc: 'Sợi đũi tơ tằm thiên nhiên sở hữu các khe rãnh siêu nhỏ giúp thoát nhiệt gấp 3 lần vải dệt thông thường. Cơ thể bạn luôn được khô thoáng tuyệt đối ngay cả trong đêm hè oi bức.',
      stat: '+300% Thoát Nhiệt',
      image: fabricMacroImg,
    },
    {
      id: 'attribute-02',
      number: '02',
      title: 'MỀM MẠI',
      subtitle: 'Xử lý giặt xả vi sinh',
      icon: Feather,
      heading: 'Càng Giặt Càng Êm Ái',
      desc: 'Công nghệ giặt xả vi sinh giúp bóc tách độ thô ráp ban đầu của sợi tự nhiên. Mỗi lần giặt là một lần thớ vải trở nên dịu êm hơn, vuốt ve làn da nhạy cảm.',
      stat: '100% Không Xù Lông',
      image: craftsmanshipImg,
    },
    {
      id: 'attribute-03',
      number: '03',
      title: 'NHẸ TÊNH',
      subtitle: 'Trọng lượng siêu nhẹ',
      icon: Droplets,
      heading: 'Cảm Giác Mặc Như Không Mặc',
      desc: 'Chỉ 180 gram cho cả bộ pijama. Độ rủ tự nhiên ôm nhẹ theo dáng cử động, xóa bỏ mọi gò bó gối chăn để bạn thả lỏng hoàn toàn.',
      stat: '180g Siêu Nhẹ',
      image: fabricMacroImg,
    },
    {
      id: 'attribute-04',
      number: '04',
      title: 'TỰ NHIÊN',
      subtitle: '100% Sợi Đũi Thuần Khiết',
      icon: Leaf,
      heading: 'Lành Tính Tuyệt Đối Cho Làn Da',
      desc: 'Không pha sợi tổng hợp polyester, không nhuộm hóa chất độc hại. Nguồn gốc xơ thực vật thuần khiết an toàn tuyệt đối cho làn da nhạy cảm.',
      stat: '0% Sợi Hóa Học',
      image: craftsmanshipImg,
    },
  ]

  return (
    <section
      id="fabric-story"
      aria-label="Câu chuyện chất liệu vải đũi QuanNguyenS"
      className="bg-[#0F172A] text-[#FAF8F5] py-14 sm:py-18 md:py-24 relative overflow-hidden border-b border-[#1E293B]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10" ref={ref}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 border-b border-[#1E293B] pb-6">
          <div>
            <span className="text-[10.5px] font-bold tracking-[0.25em] text-[#C5A059] uppercase block mb-2">
              THE FABRIC OF REST — NGHỆ THUẬT SỢI ĐŨI
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#FAF8F5] tracking-tight">
              Bốn Yếu Tố Tạo Nên <br />
              <span className="font-serif-italic text-[#E8DFD5]">Giấc Ngủ Nhẹ Tênh</span>
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-[#94A3B8] font-light max-w-md leading-relaxed">
            Đũi tự nhiên không đơn thuần là một chất liệu — đó là hơi thở của thiên nhiên được QuanNguyenS dệt thành sự êm ái cho riêng giấc ngủ của bạn.
          </p>
        </div>

        {/* Attribute Selection Tabs (01 THOÁNG, 02 MỀM, 03 NHẸ, 04 TỰ NHIÊN) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {fabricAttributes.map((attr, idx) => {
            const Icon = attr.icon
            const isSelected = activeTab === idx
            return (
              <button
                key={attr.id}
                onClick={() => setActiveTab(idx)}
                className={`p-4 sm:p-5 text-left rounded-[2px] transition-all duration-300 border ${
                  isSelected
                    ? 'bg-[#1E293B] border-[#C5A059] shadow-lg'
                    : 'bg-[#0F172A] border-[#334155]/40 hover:border-[#64748B]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-serif text-xl sm:text-2xl font-bold ${isSelected ? 'text-[#C5A059]' : 'text-[#64748B]'}`}>
                    {attr.number}
                  </span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C5A059]' : 'text-[#64748B]'}`} />
                </div>
                <span className="text-xs font-bold tracking-[0.16em] uppercase block text-[#FAF8F5]">
                  {attr.title}
                </span>
                <span className="text-[10px] text-[#94A3B8] block mt-0.5">
                  {attr.subtitle}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active Attribute Content Display */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center bg-[#1E293B] p-6 sm:p-10 rounded-[3px] border border-[#334155] shadow-luxury"
        >
          {/* Left Text Detail (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-[10.5px] font-bold tracking-[0.2em] text-[#C5A059] uppercase">
                YẾU TỐ ĐẶC BIỆT {fabricAttributes[activeTab].number}
              </span>
              <span className="w-6 h-[1px] bg-[#C5A059]" />
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#FAF8F5] mb-4">
              {fabricAttributes[activeTab].heading}
            </h3>

            <p className="text-sm text-[#CBD5E1] font-light leading-relaxed mb-6 max-w-xl">
              {fabricAttributes[activeTab].desc}
            </p>

            <div className="flex items-center gap-6 pt-4 border-t border-[#334155]">
              <div>
                <span className="text-[9.5px] font-bold tracking-[0.18em] text-[#94A3B8] uppercase block mb-0.5">
                  CHỈ SỐ THỰC TẾ
                </span>
                <span className="font-serif text-2xl sm:text-3xl font-bold text-[#C5A059]">
                  {fabricAttributes[activeTab].stat}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-[#334155]" />
              <div className="text-xs text-[#94A3B8] font-light">
                Đạt tiêu chuẩn an toàn sinh học dệt may tự nhiên.
              </div>
            </div>
          </div>

          {/* Right Macro Fabric Visual (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[2px] overflow-hidden border border-[#334155] shadow-lg aspect-[4/3]">
              <img
                src={fabricAttributes[activeTab].image}
                alt={fabricAttributes[activeTab].heading}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 text-[9.5px] font-bold tracking-[0.18em] text-[#E2E8F0] uppercase bg-[#0F172A]/85 backdrop-blur-sm px-2.5 py-1 rounded-[2px]">
                MACRO TEXTURE • 100% VẢI ĐŨI SLUB
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
