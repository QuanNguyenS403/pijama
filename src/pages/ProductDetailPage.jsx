import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ChevronRight } from 'lucide-react'
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
import fabricMacroImg from '../assets/images/fabric-macro.jpg'
import storyDaybreakMaterialImg from '../assets/images/story-daybreak-material.jpg'
import storyStillwaterMaterialImg from '../assets/images/story-stillwater-material.jpg'
import storyHearthMaterialImg from '../assets/images/story-hearth-material.jpg'

const materialStoryConfig = {
  'the-classic-set': {
    image: storyDaybreakMaterialImg,
    alt: 'The Daybreak Set — Triết lý chất liệu mềm hơn mỗi ngày trôi qua',
    tag: 'Chất Liệu Tự Nhiên Cao Cấp',
    note: 'Quy trình xử lý vi sinh xoa mềm độc quyền mang lại cảm giác thoải mái tuyệt đối',
  },
  'the-cafe-look': {
    image: storyStillwaterMaterialImg,
    alt: 'The Stillwater Set — Triết lý chất liệu mềm hơn mỗi ngày trôi qua',
    tag: 'Chất Liệu Tự Nhiên Cao Cấp',
    note: 'Quy trình xử lý vi sinh xoa mềm độc quyền mang lại cảm giác thoải mái tuyệt đối',
  },
  'the-evening-edit': {
    image: storyHearthMaterialImg,
    alt: 'The Hearth Set — Triết lý chất liệu mềm hơn mỗi ngày trôi qua',
    tag: 'Chất Liệu Tự Nhiên Cao Cấp',
    note: 'Quy trình xử lý vi sinh xoa mềm độc quyền mang lại cảm giác thoải mái tuyệt đối',
  },
}


function VisualProofSection({ summary }) {
  const hasReviews = summary && summary.totalReviews > 0

  return (
    <section className="py-14 sm:py-16 md:py-20 bg-[#FAF8F5] border-b border-[#E8DFD5]" aria-label="Tại sao khách hàng tin tưởng">
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[#E8DFD5]">
          <div className="flex flex-col items-center justify-center p-4">
            <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none mb-2">
              50+
            </span>
            <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-normal">
              lần giặt — màu sắc vẫn như mới
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4">
            <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none mb-2">
              BST 2026
            </span>
            <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-normal">
              phiên bản giới hạn thiết kế độc quyền
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-4">
            {hasReviews ? (
              <>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none">
                    {summary.averageRating}
                  </span>
                  <span className="text-3xl text-[#D4AF37]">★</span>
                </div>
                <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-normal">
                  điểm đánh giá thực tế ({summary.totalReviews} lượt)
                </span>
              </>
            ) : (
              <>
                <span className="font-serif text-4xl sm:text-5xl font-bold text-[#631521] leading-none mb-2">
                  100%
                </span>
                <span className="font-sans text-xs sm:text-sm text-[#4A3F38] font-normal">
                  may đo chuẩn chỉ từng đường kim
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

import StickyMobileAtc from '../components/product/StickyMobileAtc'
import { useCart } from '../hooks/useCart'
import { useProductReviews } from '../hooks/useProductReviews'

export default function ProductDetailPage() {
  const { productSlug } = useParams()
  const { product, related } = useProduct(productSlug)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const { addItem } = useCart()
  const { summary } = useProductReviews(product?.id)

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors?.[0] || null)
      setSelectedSize(null)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [product?.id])

  if (!product) {
    return <Navigate to="/" replace />
  }

  const handleAddToCart = (info) => {
    setToast({ ...info, id: Date.now() })
  }

  const handleStickyAddToCart = () => {
    if (!selectedSize) {
      // Dẫn dắt khách hàng cuộn lên phần chọn size và làm nổi bật khu vực chọn size
      const sizeSection =
        document.getElementById('size-selector-section') ||
        document.querySelector('[role="radiogroup"][aria-label="Chọn size"]')
      if (sizeSection) {
        sizeSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
        sizeSection.classList.add('ring-2', 'ring-[#631521]', 'p-2', 'rounded-[4px]')
        setTimeout(() => {
          sizeSection.classList.remove('ring-2', 'ring-[#631521]', 'p-2', 'rounded-[4px]')
        }, 1500)
      }
      return
    }

    let img = ''
    if (Array.isArray(product.images)) {
      img = product.images[0]
    } else if (typeof product.images === 'object') {
      img = (selectedColor?.name && product.images[selectedColor.name]?.[0]) || Object.values(product.images)[0]?.[0] || ''
    }

    const cartItem = {
      id: `${product.id}-${selectedColor?.name}-${selectedSize}`,
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      color: selectedColor,
      size: selectedSize,
      quantity: 1,
      price: product.price,
      originalPrice: product.originalPrice,
      image: img,
      slug: product.slug,
      preOrder: product.preOrder || null,
    }

    addItem(cartItem)
    handleAddToCart({
      productName: product.name,
      variant: `${selectedColor?.label || selectedColor?.name} | Size ${selectedSize}`,
      price: product.price,
      image: img,
    })
  }

  const metaImage = typeof product.images === 'object' && !Array.isArray(product.images)
    ? ((selectedColor?.name && product.images[selectedColor.name]?.[0]) || Object.values(product.images)[0]?.[0] || '')
    : (Array.isArray(product.images) ? product.images[0] : '')
  const fullImageUrl = metaImage && typeof metaImage === 'string' && metaImage.startsWith('http')
    ? metaImage
    : `https://quannguyens.com${metaImage || ''}`
  const pageUrl = `https://quannguyens.com/san-pham/${product.slug}`
  const pageTitle = `${product.name} — ${product.subtitle} | QuanNguyenS Pijama`
  const pageDesc = product.description || `${product.name} — Thiết kế pijama cao cấp, chất liệu tự nhiên thoáng khí chuẩn phong cách châu Âu.`

  const currentStory = (product && (materialStoryConfig[product.id] || materialStoryConfig[product.slug])) || {
    image: fabricMacroImg,
    alt: 'Cận cảnh kết cấu vải tự nhiên cao cấp QuanNguyenS',
    tag: 'Chất Liệu Tự Nhiên Cao Cấp',
    note: 'Quy trình xử lý vi sinh xoa mềm độc quyền mang lại cảm giác thoải mái tuyệt đối',
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] overflow-x-clip">
      {/* Dynamic SEO & OpenGraph Meta Tags (P2-2) */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content="product" />
      <meta property="og:site_name" content="QuanNguyenS Pijama" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={fullImageUrl} />
      <link rel="canonical" href={pageUrl} />

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* Header */}
      <Header onCartOpen={() => setCartDrawerOpen(true)} onAddToCart={handleAddToCart} />

      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20" />

      {/* Breadcrumb */}
      <div className="bg-[#FAF8F5] border-b border-[#E8DFD5]">
        <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5">
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

      {/* Hero — 2-column PDP: Cột ảnh bên trái STICKY gắn liền, Cột thông tin bên phải cuộn đầy đủ */}
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start">
          {/* Left — Gallery (6 cols, STICKY trong suốt quá trình cuộn đọc thông tin bên phải) */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 xl:top-28 self-start flex justify-center lg:justify-start">
            <div className="w-full max-w-[530px]">
              <ProductImageGallery
                images={product.images}
                selectedColor={selectedColor}
                badge={product.badge}
                preOrder={product.preOrder}
                productName={product.name}
              />
            </div>
          </div>

          {/* Right — Info (6 cols, cuộn tự nhiên 100% toàn bộ thông tin đầy đủ không cắt giảm) */}
          <div className="lg:col-span-6">
            <ProductInfo
              product={product}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              selectedSize={selectedSize}
              onSizeChange={setSelectedSize}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>
      </div>

      {/* Craftsmanship Strip */}
      <CraftsmanshipStrip />

      {/* Product Story — Dark Burgundy Luxury Section */}
      <section className="relative bg-[#631521] text-white py-14 sm:py-16 md:py-18 border-y border-white/10 overflow-hidden" aria-label="Triết lý chất liệu">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#4A0D17]/60 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Text side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#D4AF37] uppercase block mb-2 sm:mb-2.5">
                TRIẾT LÝ CHẤT LIỆU
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-white leading-[1.12] mb-4 sm:mb-5">
                Mềm hơn mỗi
                <span className="block text-[#D4AF37] italic font-normal mt-0.5">
                  ngày trôi qua
                </span>
              </h2>
              <p className="font-sans text-sm sm:text-base text-white/90 font-normal leading-relaxed mb-6">
                Chúng tôi không nói nhiều về chất vải — chúng tôi để cảm giác trên da bạn nói thay. Được làm từ sợi tự nhiên qua quy trình kiểm định kỹ lưỡng, mỗi bộ QuanNguyenS được thiết kế để trở nên tốt hơn theo thời gian — mềm hơn, quen tay hơn, và gắn bó hơn với cuộc sống của bạn.
              </p>
              <div className="space-y-1.5 pt-1">
                {[
                  { arrow: '↳', title: 'Thoáng khí 4 mùa', desc: 'Sợi vi xốp điều hoà thân nhiệt tự nhiên cả mùa đông lẫn hè' },
                  { arrow: '↳', title: 'Càng giặt càng mềm', desc: 'Không bai dão, không xù lông, ngày càng mịn màng' },
                  { arrow: '↳', title: 'Thân thiện da nhạy cảm', desc: '100% tự nhiên, nhuộm thực vật, không gây kích ứng' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 sm:py-2.5 border-t border-white/15">
                    <span className="text-[#D4AF37] font-serif text-lg shrink-0 mt-0.5">{item.arrow}</span>
                    <div>
                      <span className="font-serif text-sm sm:text-base font-bold text-[#D4AF37] block">{item.title}</span>
                      <span className="font-sans text-xs sm:text-sm text-white/80 font-normal">{item.desc}</span>
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
                  src={currentStory.image}
                  alt={currentStory.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-[320px] sm:h-[380px] md:h-[420px] lg:h-[460px] object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-3 left-3 right-3 bg-[#1E1510]/90 backdrop-blur-md p-3 sm:p-3.5 rounded-[2px] border border-[#D4AF37]/30">
                  <span className="font-serif text-xs sm:text-sm font-semibold text-[#D4AF37] block">
                    {currentStory.tag}
                  </span>
                  <span className="text-[11px] sm:text-xs text-white/80 font-sans mt-0.5 block">
                    {currentStory.note}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Proof Section: Tại Sao Khách Tin Tưởng */}
      <VisualProofSection summary={summary} />

      {/* Reviews */}
      <ProductReviews product={product} />

      {/* Related products */}
      {related.length > 0 && (
        <RelatedProducts products={related} onAddToCart={handleAddToCart} />
      )}


      {/* Sticky Mobile Add To Cart Bar */}
      <StickyMobileAtc
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onAddToCart={handleStickyAddToCart}
        onOpenSizeGuide={() => {
          const el =
            document.getElementById('size-selector-section') ||
            document.querySelector('[role="radiogroup"][aria-label="Chọn size"]')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
      />
 
      {/* Footer */}
      <Section12Footer />
    </div>
  )
}
