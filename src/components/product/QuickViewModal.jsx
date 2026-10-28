import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import ColorSelector from './ColorSelector'
import SizeSelector from './SizeSelector'
import QuantitySelector from './QuantitySelector'
import Button from '../ui/Button'
import { useCart } from '../../hooks/useCart'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function QuickViewModal({ product, onClose, onAddToCart }) {
  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  useEffect(() => {
    if (product?.colors?.[0]) {
      setSelectedColor(product.colors[0])
    }
  }, [product?.id])

  if (!product) return null

  const getProductImg = () => {
    if (!product.images) return ''
    if (Array.isArray(product.images)) return product.images[0]
    if (typeof product.images === 'object') {
      if (selectedColor?.name && product.images[selectedColor.name]) {
        return product.images[selectedColor.name][0]
      }
      const first = Object.keys(product.images)[0]
      return first ? product.images[first][0] : ''
    }
    return ''
  }

  const stockForSize = selectedColor && selectedSize ? (selectedColor.stock?.[selectedSize] ?? 0) : 99
  const canAdd = selectedSize && stockForSize > 0

  const handleAdd = () => {
    if (!canAdd) return
    const img = getProductImg()
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
      image: img,
      slug: product.slug,
      preOrder: product.preOrder || null,
    }
    addItem(cartItem)
    onAddToCart?.({
      productName: product.name,
      variant: `${selectedColor?.label || selectedColor?.name} | Size ${selectedSize}`,
      price: product.price,
      image: img,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="qv-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="qv-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[101] m-auto h-fit max-h-[92vh] w-[calc(100%-2rem)] max-w-[800px] bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] shadow-2xl overflow-y-auto pdp-scrollbar"
            role="dialog"
            aria-modal="true"
            aria-label={`Xem nhanh: ${product.name}`}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 text-[#8C7E74] hover:text-[#631521] transition-colors p-1.5 cursor-pointer bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] rounded-full"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
              {/* Image */}
              <div className="relative bg-[#F5F0EB] aspect-[4/3] sm:aspect-[4/5] md:aspect-auto md:h-full overflow-hidden max-h-[240px] md:max-h-none">
                <img
                  src={getProductImg()}
                  alt={`${product.name} — ${selectedColor?.name || ''}`}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>

              {/* Info */}
              <div className="p-4 sm:p-5 md:py-4 md:px-6 flex flex-col gap-2.5 sm:gap-3 justify-center">
                {/* Product Titles */}
                <div className="space-y-0.5">
                  <p className="font-serif text-[0.7rem] uppercase tracking-[0.2em] font-semibold text-[#631521]">
                    BST {product.collection?.toUpperCase()}
                  </p>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1614] leading-tight">
                    {product.name}
                  </h2>
                  <p className="font-sans text-xs sm:text-sm font-normal italic text-[#8C7E74]">
                    {product.subtitle}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-xl sm:text-2xl font-bold text-[#631521]">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="font-sans text-xs sm:text-sm text-[#8C7E74] line-through font-normal">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="border-t border-[#E8DFD5]/80 my-0.5" />

                {product.colors && (
                  <ColorSelector colors={product.colors} selected={selectedColor} onChange={setSelectedColor} />
                )}
                {product.sizes && (
                  <SizeSelector
                    sizes={product.sizes}
                    selectedColor={selectedColor}
                    selected={selectedSize}
                    onChange={setSelectedSize}
                    onSizeGuide={() => {}}
                  />
                )}
                {/* Pre-Order Notice */}
                {product.preOrder?.enabled && (
                  <div className="bg-[#FAF5F0] border border-[#D4AF37] px-2.5 py-1.5 rounded-[2px] text-xs font-sans text-[#631521]">
                    <p className="font-bold text-[11px] sm:text-xs">⏱ Sản phẩm đặt trước (Pre-Order)</p>
                    <p className="text-[10px] sm:text-[11px] text-[#4A3F38] mt-0.5 leading-snug">
                      {product.preOrder.message || 'Giao hàng dự kiến trong 7-10 ngày'}
                    </p>
                  </div>
                )}

                <QuantitySelector quantity={quantity} onChange={setQuantity} />

                <div className="flex flex-col gap-1.5 pt-1 mt-1">
                  <Button variant="primary" onClick={handleAdd} disabled={!canAdd} className="w-full py-2.5 text-xs sm:text-sm">
                    <ShoppingBag className="w-4 h-4" />{' '}
                    {product.preOrder?.enabled ? 'Đặt Trước Ngay (Pre-Order)' : 'Thêm Vào Giỏ Hàng'}
                  </Button>
                  <Link
                    to={`/san-pham/${product.slug}`}
                    onClick={onClose}
                    className="text-center font-sans text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#631521] hover:underline py-0.5"
                  >
                    Xem Chi Tiết Sản Phẩm →
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
