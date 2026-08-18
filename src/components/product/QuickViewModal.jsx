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
            className="fixed inset-0 z-[101] m-auto h-fit max-h-[90vh] w-[calc(100%-2rem)] max-w-[900px] bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] shadow-2xl overflow-y-auto pdp-scrollbar"
            role="dialog"
            aria-modal="true"
            aria-label={`Xem nhanh: ${product.name}`}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-[#8C7E74] hover:text-[#631521] transition-colors p-1 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image */}
              <div className="relative bg-[#F5F0EB]" style={{ aspectRatio: '3/4' }}>
                <img
                  src={getProductImg()}
                  alt={`${product.name} — ${selectedColor?.name || ''}`}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>

              {/* Info */}
              <div className="p-6 md:p-8 flex flex-col gap-4">
                <p className="font-serif text-[0.8rem] uppercase tracking-[0.25em] font-semibold text-[#631521]">
                  BST {product.collection?.toUpperCase()}
                </p>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1614]">{product.name}</h2>
                <p className="font-sans text-sm font-light italic text-[#8C7E74]">{product.subtitle}</p>

                {/* Price */}
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-[1.75rem] font-bold text-[#631521]">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="font-sans text-sm text-[#8C7E74] line-through font-light">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="border-t border-[#E8DFD5]" />

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
                <QuantitySelector quantity={quantity} onChange={setQuantity} />

                <div className="flex flex-col gap-2.5 mt-auto pt-2">
                  <Button variant="primary" onClick={handleAdd} disabled={!canAdd} className="w-full">
                    <ShoppingBag className="w-4 h-4" /> Thêm Vào Giỏ Hàng
                  </Button>
                  <Link
                    to={`/san-pham/${product.slug}`}
                    onClick={onClose}
                    className="text-center font-sans text-xs font-semibold uppercase tracking-wider text-[#631521] hover:underline pt-1"
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
