import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, CreditCard, Share2, Ruler, Truck, RotateCcw, CheckCircle, Lock } from 'lucide-react'
import ColorSelector from './ColorSelector'
import SizeSelector from './SizeSelector'
import QuantitySelector from './QuantitySelector'
import ProductAccordion from './ProductAccordion'
import SizeGuideModal from './SizeGuideModal'
import WishlistButton from '../ui/WishlistButton'
import Button from '../ui/Button'
import { useCart } from '../../hooks/useCart'
import { useNavigate } from 'react-router-dom'

function StarRow({ rating, size = 'sm' }) {
  const full = Math.floor(rating)
  const partial = rating % 1
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} sao`}>
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={`${size === 'sm' ? 'text-sm' : 'text-base'}`}
          style={{ color: i < full ? '#D4AF37' : i === full && partial > 0 ? '#D4AF37' : '#E8DFD5' }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

const trustItems = [
  { icon: <Truck className="w-5 h-5" />, label: 'Giao hàng miễn phí', sub: 'Đơn từ 500K' },
  { icon: <RotateCcw className="w-5 h-5" />, label: 'Đổi trả 30 ngày', sub: 'Miễn phí tận nhà' },
  { icon: <CheckCircle className="w-5 h-5" />, label: 'Chất liệu tự nhiên', sub: 'Thuần khiết cao cấp' },
  { icon: <Lock className="w-5 h-5" />, label: 'Thanh toán an toàn', sub: 'Mã hoá SSL' },
]

export default function ProductInfo({
  product,
  selectedColor: controlledColor,
  onColorChange,
  onAddToCart,
}) {
  const [internalColor, setInternalColor] = useState(product.colors?.[0] || null)
  const selectedColor = controlledColor !== undefined ? controlledColor : internalColor
  const setSelectedColor = (col) => {
    if (onColorChange) onColorChange(col)
    setInternalColor(col)
  }

  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [addedState, setAddedState] = useState(false)
  const [sharedToast, setSharedToast] = useState(false)

  const { addItem } = useCart()
  const navigate = useNavigate()

  const stockForSize = selectedColor && selectedSize ? (selectedColor.stock?.[selectedSize] ?? 0) : 99
  const canAdd = selectedSize && stockForSize > 0

  const getProductMainImg = () => {
    if (!product.images) return ''
    if (Array.isArray(product.images)) return product.images[0]
    if (typeof product.images === 'object') {
      if (selectedColor?.name && product.images[selectedColor.name]) {
        return product.images[selectedColor.name][0]
      }
      const firstKey = Object.keys(product.images)[0]
      return firstKey ? product.images[firstKey][0] : ''
    }
    return ''
  }

  const handleAddToCart = () => {
    if (!canAdd) return

    const cartItem = {
      id: `${product.id}-${selectedColor?.name}-${selectedSize}`,
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      color: selectedColor,
      size: selectedSize,
      quantity,
      price: product.price,
      originalPrice: product.originalPrice,
      image: getProductMainImg(),
      slug: product.slug,
    }
    addItem(cartItem)

    if (onAddToCart) {
      onAddToCart({
        productName: product.name,
        variant: `${selectedColor?.label || selectedColor?.name} | Size ${selectedSize}`,
        price: product.price,
        image: getProductMainImg(),
      })
    }

    setAddedState(true)
    setTimeout(() => setAddedState(false), 1500)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    setTimeout(() => navigate('/checkout'), 100)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.subtitle,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(window.location.href)
      setSharedToast(true)
      setTimeout(() => setSharedToast(false), 2000)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Section label */}
        <p className="font-serif text-[0.85rem] uppercase tracking-[0.25em] font-semibold text-[#631521]">
          {product.sectionLabel || `BST ${product.collection?.toUpperCase()}`}
        </p>

        {/* Product name & subtitle */}
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-[42px] font-bold leading-[1.12] text-[#1A1614] tracking-tight">
            {product.name}
          </h1>
          <p className="font-sans text-base font-light italic text-[#8C7E74] mt-1.5">
            {product.subtitle}
          </p>
          {product.tagline && (
            <p className="font-sans text-sm font-light italic text-[#4A3F38] mt-2 leading-relaxed bg-[#FAF5F0] p-2.5 border-l-2 border-[#631521]">
              "{product.tagline}"
            </p>
          )}
        </div>

        {/* Material Philosophy Badge */}
        <div className="inline-block border border-[#E8DFD5] px-4 py-2 bg-[#FAF8F5] text-[0.75rem] font-sans font-light uppercase tracking-[0.15em] text-[#631521] w-fit">
          ✦ CHẤT LIỆU ĐƯỢC TUYỂN CHỌN & KIỂM ĐỊNH ✦
        </div>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-2.5">
            <StarRow rating={product.rating} />
            <span className="font-sans text-sm font-bold text-[#1A1614]">{product.rating}</span>
            <a href="#reviews" className="font-sans text-sm font-medium text-[#8C7E74] hover:text-[#631521] underline transition-colors">
              ({product.reviewCount} đánh giá)
            </a>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#E8DFD5]" />

        {/* Price block */}
        <div className="flex flex-wrap items-baseline gap-3.5">
          <span className="font-serif font-bold text-3xl sm:text-4xl leading-none text-[#631521]">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="font-sans text-base text-[#8C7E74] line-through font-light">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          {product.discount > 0 && (
            <span className="bg-[#631521]/10 text-[#631521] border border-[#631521]/20 font-sans font-bold text-[0.75rem] uppercase tracking-wider px-2.5 py-1 rounded-[2px]">
              TIẾT KIỆM {product.discount}%
            </span>
          )}
        </div>

        {/* Freeship suggestion callout (P3 Item 12) */}
        {product.price < 500000 && (
          <div className="bg-[#FAF5F0] border border-[#D4AF37]/50 p-2.5 rounded-[2px] flex items-center gap-2 text-xs font-sans text-[#631521]">
            <span className="text-sm">🎁</span>
            <span>
              Mua thêm <strong>{formatPrice(500000 - product.price)}</strong> để được <strong>MIỄN PHÍ VẬN CHUYỂN</strong> toàn quốc (đơn từ 500.000đ).
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#E8DFD5]" />

        {/* Color */}
        {product.colors && (
          <ColorSelector
            colors={product.colors}
            selected={selectedColor}
            onChange={setSelectedColor}
          />
        )}

        {/* Size */}
        {product.sizes && (
          <SizeSelector
            sizes={product.sizes}
            selectedColor={selectedColor}
            selected={selectedSize}
            onChange={setSelectedSize}
            onSizeGuide={() => setSizeGuideOpen(true)}
          />
        )}

        {/* Quantity */}
        <QuantitySelector
          quantity={quantity}
          onChange={setQuantity}
          max={stockForSize > 0 ? stockForSize : 1}
        />

        {/* Divider */}
        <div className="border-t border-[#E8DFD5]" />

        {/* Highlights */}
        {product.highlights && (
          <ul className="space-y-2.5">
            {product.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 font-sans text-sm text-[#4A3F38]">
                <span className="text-[#D4AF37] font-bold shrink-0 mt-0.5">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Feng Shui Inspiration Card */}
        {product.fengShui && (
          <div className="bg-[#FAF5F0] border border-[#E8DFD5] p-3.5 rounded-[3px] flex items-start gap-3">
            <span className="text-sm shrink-0 mt-0.5 text-[#D4AF37]">✦</span>
            <div className="text-xs font-sans text-[#4A3F38]">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-serif font-bold text-[#631521] uppercase tracking-wider text-[11px]">
                  Năng Lượng Ngũ Hành · Hành {product.fengShui.element}
                </span>
                <span className="bg-[#631521]/10 text-[#631521] px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium">
                  Hợp mệnh {product.fengShui.goodFor.join(' & ')}
                </span>
              </div>
              <p className="font-light leading-relaxed text-[#4A3F38]">
                {product.fengShui.energyNote}
              </p>
            </div>
          </div>
        )}

        {/* Fabric Sensory Callout */}
        <div className="bg-[#FAF5F0] border-l-[3px] border-[#D4AF37] p-4 sm:p-5">
          <span className="font-sans font-semibold text-[11px] uppercase tracking-[0.15em] text-[#631521] block mb-1">
            CẢM NHẬN KHÁC BIỆT
          </span>
          <p className="font-sans font-light italic text-sm text-[#4A3F38] leading-relaxed">
            "Chất vải của chúng tôi không cần một cái tên để chứng minh. Chỉ cần một lần chạm."
          </p>
        </div>

        {/* Validation hint */}
        {!selectedSize && (
          <p className="text-xs font-sans text-[#631521] font-semibold">
            👉 Vui lòng chọn size trước khi thêm vào giỏ hàng
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3 pt-1">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              onClick={handleAddToCart}
              disabled={!canAdd}
              className="w-full text-sm font-bold tracking-wider py-4 shadow-luxury hover:bg-[#4A0D17]"
              aria-label="Thêm vào giỏ hàng"
            >
              <ShoppingBag className="w-4 h-4" />
              {addedState ? '✓ Đã Thêm Vào Giỏ' : 'Thêm Vào Giỏ Hàng'}
            </Button>
          </motion.div>

          {/* MUA NGAY: White background frame with gold text */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canAdd}
              className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#D4AF37] border-2 border-[#D4AF37] hover:bg-[#FAF8F5] hover:text-[#B8860B] hover:border-[#B8860B] hover:shadow-gold-glow text-sm font-bold uppercase tracking-[0.12em] py-3.5 rounded-[2px] transition-all duration-200 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Mua ngay"
            >
              <CreditCard className="w-4 h-4" />
              MUA NGAY
            </button>
          </motion.div>

          {/* Action Row 3: Wishlist | Share | Size Guide */}
          <div className="flex items-center justify-center gap-8 pt-2">
            <WishlistButton
              productId={product.id}
              colorName={selectedColor?.name || 'default'}
            />

            <div className="w-[1px] h-4 bg-[#E8DFD5]" />

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[#8C7E74] hover:text-[#631521] transition-colors text-xs font-sans font-medium cursor-pointer"
              aria-label="Chia sẻ"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharedToast ? 'Đã sao chép link!' : 'Chia sẻ'}</span>
            </button>

            <div className="w-[1px] h-4 bg-[#E8DFD5]" />

            <button
              type="button"
              onClick={() => setSizeGuideOpen(true)}
              className="flex items-center gap-1.5 text-[#8C7E74] hover:text-[#631521] transition-colors text-xs font-sans font-medium cursor-pointer"
              aria-label="Bảng size"
            >
              <Ruler className="w-4 h-4" />
              <span>Bảng size</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E8DFD5]" />

        {/* Trust strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-center bg-[#F5F0EB] p-4 rounded-[3px] border border-[#E8DFD5]">
          {trustItems.map((t) => (
            <div key={t.label} className="flex flex-col items-center gap-1">
              <span className="text-[#631521]">{t.icon}</span>
              <span className="font-sans text-[0.75rem] font-bold text-[#1A1614] leading-tight">{t.label}</span>
              <span className="font-sans text-[0.7rem] font-light text-[#8C7E74]">{t.sub}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[#E8DFD5]" />

        {/* Accordion */}
        <ProductAccordion product={product} />
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        sizeGuide={product.sizeGuide || {}}
      />
    </>
  )
}
