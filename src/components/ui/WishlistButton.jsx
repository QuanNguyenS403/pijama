import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function WishlistButton({
  productId,
  colorName = 'default',
  size = 'default',
  className = '',
}) {
  // Key: product + selected color (each variant can be wishlisted separately)
  const wishlistKey = `${productId}-${colorName}`

  const [isWishlisted, setIsWishlisted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('qns_wishlist') || '[]')
      return saved.includes(wishlistKey)
    } catch {
      return false
    }
  })

  // Synchronize when wishlistKey changes
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('qns_wishlist') || '[]')
      setIsWishlisted(saved.includes(wishlistKey))
    } catch {
      setIsWishlisted(false)
    }
  }, [wishlistKey])

  const toggleWishlist = (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      const saved = JSON.parse(localStorage.getItem('qns_wishlist') || '[]')
      let updated
      if (isWishlisted) {
        updated = saved.filter((k) => k !== wishlistKey)
      } else {
        updated = [...saved, wishlistKey]
      }
      localStorage.setItem('qns_wishlist', JSON.stringify(updated))
      setIsWishlisted(!isWishlisted)
    } catch (err) {
      console.error('Wishlist error', err)
      setIsWishlisted(!isWishlisted)
    }
  }

  if (size === 'small') {
    return (
      <motion.button
        type="button"
        onClick={toggleWishlist}
        aria-label={isWishlisted ? 'Đã lưu vào yêu thích' : 'Lưu vào yêu thích'}
        title={isWishlisted ? 'Đã lưu vào yêu thích' : 'Lưu vào yêu thích'}
        className={`w-9 h-9 flex items-center justify-center bg-[#FAF8F5]/85 backdrop-blur-sm border border-[#E8DFD5]/80 hover:bg-[#FAF8F5] transition-colors ${className}`}
        style={{ borderRadius: '0px' }}
        whileTap={{ scale: 0.88 }}
      >
        <motion.span
          key={isWishlisted ? 'filled' : 'outline'}
          initial={{ scale: 0.7 }}
          animate={{ scale: [0.7, 1.35, 1] }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-base leading-none select-none"
          style={{
            color: isWishlisted ? '#631521' : '#8C7E74',
          }}
        >
          {isWishlisted ? '♥' : '♡'}
        </motion.span>
      </motion.button>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={toggleWishlist}
      aria-label={isWishlisted ? 'Đã lưu vào yêu thích' : 'Lưu vào yêu thích'}
      className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-sans font-medium transition-colors select-none ${className}`}
      style={{
        color: isWishlisted ? '#631521' : '#8C7E74',
      }}
      whileTap={{ scale: 0.92 }}
    >
      <motion.span
        key={isWishlisted ? 'filled' : 'outline'}
        initial={{ scale: 0.75 }}
        animate={{ scale: [0.75, 1.35, 1] }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="text-base leading-none"
      >
        {isWishlisted ? '♥' : '♡'}
      </motion.span>
      <span>{isWishlisted ? 'Đã yêu thích' : 'Yêu thích'}</span>
    </motion.button>
  )
}
