import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function ProductCard({ product, onSelect }) {
  if (!product) return null

  const formatVND = (amount) => Number(amount || 0).toLocaleString('vi-VN') + 'đ'

  return (
    <div className="mt-2.5 p-2.5 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[4px] hover:border-[#D4AF37] transition-all duration-200 shadow-xs flex items-center gap-3 group">
      {product.image && (
        <img
          src={product.image}
          alt={product.name}
          className="w-14 h-14 object-cover rounded-[2px] border border-[#E8DFD5] shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="font-serif text-xs font-bold text-[#631521] uppercase tracking-wide truncate">
          {product.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-sans text-xs font-bold text-[#2C201A]">
            {formatVND(product.price)}
          </span>
        </div>
      </div>
      <Link
        to={`/san-pham/${product.slug}`}
        onClick={onSelect}
        className="p-2 text-[#8C7E74] group-hover:text-[#631521] group-hover:bg-[#E8DFD5]/40 rounded-full transition-colors shrink-0"
        title="Xem chi tiết sản phẩm"
      >
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
