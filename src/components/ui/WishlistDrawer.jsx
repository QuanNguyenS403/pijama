import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { products } from '../../data/products'
import { useCart } from '../../hooks/useCart'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function WishlistDrawer({ isOpen, onClose, onAddToCart }) {
  const [wishlistKeys, setWishlistKeys] = useState([])
  const { addItem } = useCart()

  const loadWishlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('qns_wishlist') || '[]')
      setWishlistKeys(saved)
    } catch {
      setWishlistKeys([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadWishlist()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const removeFromWishlist = (key) => {
    const updated = wishlistKeys.filter((k) => k !== key)
    localStorage.setItem('qns_wishlist', JSON.stringify(updated))
    setWishlistKeys(updated)
  }

  // Parse wishlist items into rich product data
  const wishlistedItems = wishlistKeys.map((key) => {
    const [productId, colorName] = key.split('-')
    const product = products.find((p) => p.id === productId) || products[0]
    const colorObj = product?.colors?.find((c) => c.name === colorName) || product?.colors?.[0]
    
    let img = ''
    if (product) {
      if (Array.isArray(product.images)) {
        img = product.images[0]
      } else if (typeof product.images === 'object') {
        img = (colorName && product.images[colorName]?.[0]) || Object.values(product.images)[0]?.[0] || ''
      }
    }

    return {
      key,
      productId,
      product,
      colorName,
      colorLabel: colorObj?.label || colorName,
      image: img,
      price: product?.price || 0,
      name: product?.name || 'Sản phẩm QuanNguyenS',
      slug: product?.slug || '',
      sizes: product?.sizes || ['S', 'M'],
    }
  }).filter(item => item.product)

  const handleQuickAdd = (item, selectedSize = 'S') => {
    const cartItem = {
      id: `${item.productId}-${item.colorName}-${selectedSize}`,
      productId: item.productId,
      name: item.name,
      subtitle: item.product?.subtitle,
      color: item.product?.colors?.find((c) => c.name === item.colorName) || item.product?.colors?.[0],
      size: selectedSize,
      quantity: 1,
      price: item.price,
      originalPrice: item.product?.originalPrice,
      image: item.image,
      slug: item.slug,
    }
    addItem(cartItem)
    onAddToCart?.({
      productName: item.name,
      variant: `${item.colorLabel} | Size ${selectedSize}`,
      price: item.price,
      image: item.image,
    })
    removeFromWishlist(item.key)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 z-[161] w-full max-w-[420px] bg-[#FAF8F5] shadow-2xl flex flex-col border-l border-[#E8DFD5]"
            role="dialog"
            aria-label="Danh Sách Yêu Thích"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E8DFD5] bg-[#631521] text-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37] text-lg">♥</span>
                <h2 className="font-serif text-lg font-bold uppercase tracking-wider">
                  MỤC ĐÃ LƯU ({wishlistedItems.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-[#D4AF37] transition-colors p-1.5 cursor-pointer"
                aria-label="Đóng danh sách yêu thích"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {wishlistedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#8C7E74] mb-3 border border-[#E8DFD5]">
                    <span className="text-2xl">♡</span>
                  </div>
                  <p className="font-serif text-xl font-bold text-[#1A1614] mb-1">
                    Chưa có mục nào được lưu
                  </p>
                  <p className="font-sans text-xs text-[#8C7E74] font-light max-w-xs mb-5">
                    Hãy bấm biểu tượng trái tim ở các bộ pijama bạn yêu thích để xem lại sau
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-[2px] hover:bg-[#4A0D17] transition-colors"
                  >
                    Xem Bộ Sưu Tập
                  </button>
                </div>
              ) : (
                wishlistedItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex gap-3.5 bg-white p-3.5 rounded-[3px] border border-[#E8DFD5] shadow-xs group"
                  >
                    <Link
                      to={`/san-pham/${item.slug}`}
                      onClick={onClose}
                      className="shrink-0 w-20 h-24 bg-[#F5F0EB] overflow-hidden rounded-[2px] border border-[#E8DFD5]"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/san-pham/${item.slug}`}
                            onClick={onClose}
                            className="font-serif font-bold text-sm text-[#1A1614] hover:text-[#631521] transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            onClick={() => removeFromWishlist(item.key)}
                            className="text-[#8C7E74] hover:text-[#631521] transition-colors p-1"
                            title="Xóa khỏi yêu thích"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-sans text-xs text-[#8C7E74] mt-0.5">
                          {item.colorLabel}
                        </p>
                        <p className="font-serif text-sm font-bold text-[#631521] mt-1">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#F5F0EB]">
                        <button
                          onClick={() => handleQuickAdd(item, item.sizes[0] || 'S')}
                          className="flex-1 bg-[#631521] text-white hover:bg-[#4A0D17] font-sans text-[11px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-[2px] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3 h-3" /> Thêm size {item.sizes[0] || 'S'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {wishlistedItems.length > 0 && (
              <div className="p-4 border-t border-[#E8DFD5] bg-white">
                <button
                  onClick={onClose}
                  className="w-full bg-[#FAF8F5] border border-[#E8DFD5] text-[#1A1614] hover:bg-[#F5F0EB] hover:text-[#631521] font-sans text-xs font-bold uppercase tracking-wider py-3 rounded-[2px] transition-colors"
                >
                  Tiếp Tục Xem Hàng
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
