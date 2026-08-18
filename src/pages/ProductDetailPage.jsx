import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ChevronRight, Star } from 'lucide-react'
import Header from '../components/layout/Header'
import ProductImageGallery from '../components/product/ProductImageGallery'
import ProductInfo from '../components/product/ProductInfo'
import ProductReviews from '../components/product/ProductReviews'
import RelatedProducts from '../components/product/RelatedProducts'
import CartDrawer from '../components/cart/CartDrawer'
import { Toast } from '../components/ui/Toast'
import Section12Footer from '../components/sections/Section12Footer'
import CraftsmanshipStrip from '../components/sections/CraftsmanshipStrip'
import { useProduct } from '../hooks/useProduct'
import { useRecentlyViewed } from '../hooks/useLocalStorage'
import fabricMacroImg from '../assets/images/fabric-macro.jpg'

function RecentlyViewedStrip({ viewed }) {
  if (!viewed.length) return null
  return (
    <section className="py-12 bg-[#FAF8F5] border-t border-[#E8DFD5]" aria-label="Đã xem gần đây">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-4">
          ĐÃ XEM GẦN ĐÂY
        </span>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {viewed.map((p) => (
            <Link
              key={p.slug}
              to={`/san-pham/${p.slug}`}
              className="shrink-0 flex items-center gap-3.5 bg-white p-2.5 rounded-[3px] border border-[#E8DFD5] hover:border-[#631521] transition-all group shadow-xs"
            >
              <img src={p.image} alt={p.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[2px] shrink-0" />
              <div className="pr-2">
                <p className="font-serif text-sm font-bold text-[#1A1614] group-hover:text-[#631521] transition-colors line-clamp-1">{p.name}</p>
                <p className="font-serif text-xs sm:text-sm text-[#631521] font-bold mt-0.5">
                  {new Intl.NumberFormat('vi-VN').format(p.price)}đ
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function VisualProofSection() {
  return (
    <section className="py-14 sm:py-16 bg-[#FAF8F5] border-b border-[#E8DFD5]" aria-label="Tại sao khách hàng tin tưởng">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[#E8DFD5]">
          <div className="flex flex-col items-center justify-center p-4">
            <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none mb-2">
              50+
            </span>
            <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-light">
              lần giặt — màu sắc vẫn như mới
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4">
            <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none mb-2">
              127
            </span>
            <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-light">
              khách đã quay lại mua thêm
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none">
                4.9
              </span>
              <span className="text-3xl text-[#D4AF37]">★</span>
            </div>
            <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-light">
              điểm đánh giá trung bình
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ProductDetailPage() {
  const { productSlug } = useParams()
  const { product, related } = useProduct(productSlug)
  const [selectedColor, setSelectedColor] = useState(null)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const { viewed, addViewed } = useRecentlyViewed()

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0] || null)
      addViewed(product)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [product?.id])

  if (!product) {
    return <Navigate to="/" replace />
  }

  const handleAddToCart = (info) => {
    setToast({ ...info, id: Date.now() })
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* SEO */}
      <title>{product.name} — QuanNguyenS European Casual Luxury</title>

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Header */}
      <Header onCartOpen={() => setCartDrawerOpen(true)} />

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" />

      {/* Breadcrumb */}
      <div className="bg-[#FAF8F5] border-b border-[#E8DFD5]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="flex items-center gap-1 font-sans text-xs font-medium text-[#8C7E74] hover:text-[#631521] transition-colors">
              <Home className="w-3.5 h-3.5" /> Trang Chủ
            </Link>
            <ChevronRight className="w-3 h-3 text-[#E8DFD5]" />
            <Link to="/" className="font-sans text-xs font-medium text-[#8C7E74] hover:text-[#631521] transition-colors">
              Bộ Sưu Tập
            </Link>
            <ChevronRight className="w-3 h-3 text-[#E8DFD5]" />
            <span className="font-sans text-xs font-semibold text-[#1A1614]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero — 2-column PDP */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left — Gallery (7 cols) */}
          <div className="lg:col-span-7">
            <ProductImageGallery
              images={product.images}
              selectedColor={selectedColor}
              badge={product.badge}
              productName={product.name}
            />
          </div>

          {/* Right — Info (5 cols) */}
          <div className="lg:col-span-5">
            <ProductInfo
              product={product}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>
      </motion.div>

      {/* Craftsmanship Strip */}
      <CraftsmanshipStrip />

      {/* Product Story — Dark Burgundy Luxury Section */}
      <section className="relative bg-[#631521] text-white py-20 sm:py-24 border-y border-white/10 overflow-hidden" aria-label="Triết lý chất liệu">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#4A0D17]/60 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-3">
                TRIẾT LÝ CHẤT LIỆU
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-6">
                Mềm hơn mỗi
                <span className="block text-[#D4AF37] italic font-light mt-1">
                  ngày trôi qua
                </span>
              </h2>
              <p className="font-sans text-base sm:text-lg text-white/90 font-light leading-relaxed mb-8">
                Chúng tôi không nói nhiều về chất vải — chúng tôi để cảm giác trên da bạn nói thay. Được làm từ sợi tự nhiên qua quy trình kiểm định kỹ lưỡng, mỗi bộ QuanNguyenS được thiết kế để trở nên tốt hơn theo thời gian — mềm hơn, quen tay hơn, và gắn bó hơn với cuộc sống của bạn.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  { arrow: '↳', title: 'Thoáng khí 4 mùa', desc: 'Sợi vi xốp điều hoà thân nhiệt tự nhiên cả mùa đông lẫn hè' },
                  { arrow: '↳', title: 'Càng giặt càng mềm', desc: 'Không bai dão, không xù lông, ngày càng mịn màng' },
                  { arrow: '↳', title: 'Thân thiện da nhạy cảm', desc: '100% tự nhiên, nhuộm thực vật, không gây kích ứng' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3.5 py-3 border-t border-white/15">
                    <span className="text-[#D4AF37] font-serif text-xl shrink-0 mt-0.5">{item.arrow}</span>
                    <div>
                      <span className="font-serif text-base font-bold text-[#D4AF37] block">{item.title}</span>
                      <span className="font-sans text-xs sm:text-sm text-white/80 font-light">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Image side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:col-span-6"
            >
              <div className="relative rounded-[4px] overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#1E1510] group">
                <img
                  src={fabricMacroImg}
                  alt="Cận cảnh kết cấu vải tự nhiên cao cấp QuanNguyenS"
                  className="w-full h-[380px] sm:h-[460px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-[#1E1510]/90 backdrop-blur-md p-4 rounded-[2px] border border-[#D4AF37]/30">
                  <span className="font-serif text-sm font-semibold text-[#D4AF37] block">
                    Chất Liệu Tự Nhiên Cao Cấp
                  </span>
                  <span className="text-xs text-white/80 font-sans mt-0.5 block">
                    Quy trình xử lý vi sinh xoa mềm độc quyền mang lại cảm giác thoải mái tuyệt đối
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Proof Section: Tại Sao Khách Tin Tưởng */}
      <VisualProofSection />

      {/* Reviews */}
      <ProductReviews product={product} />

      {/* Related products */}
      {related.length > 0 && (
        <RelatedProducts products={related} onAddToCart={handleAddToCart} />
      )}

      {/* Recently Viewed */}
      <RecentlyViewedStrip viewed={viewed.filter((v) => v.slug !== product.slug)} />

      {/* Footer */}
      <Section12Footer />
    </div>
  )
}
