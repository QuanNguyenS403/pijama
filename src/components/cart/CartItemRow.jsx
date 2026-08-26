import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CartItemRow({ item, onUpdateQuantity, onRemove, compact = false }) {
  return (
    <div className={`flex gap-3.5 ${compact ? 'py-3.5' : 'py-4'} border-b border-[#E8DFD5] last:border-0`}>
      {/* Image */}
      <Link to={`/san-pham/${item.slug}`} className="shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className={`object-cover rounded-[2px] border border-[#E8DFD5] ${compact ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-20 h-20'}`}
        />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <Link to={`/san-pham/${item.slug}`}>
            <p className="font-sans font-bold text-sm text-[#1A1614] leading-tight hover:text-[#631521] transition-colors truncate">
              {item.name}
            </p>
          </Link>
          <p className="font-sans text-[0.8rem] font-light text-[#8C7E74] mt-0.5">
            {item.color?.name || (typeof item.color === 'string' ? item.color : '')} | Size <span className="font-medium text-[#1A1614]">{item.size}</span>
          </p>
          {(item.preOrder?.enabled || item.isPreOrder || item.slug === 'the-evening-edit' || item.productId === 'the-evening-edit') && (
            <p className="font-sans text-[0.7rem] font-bold text-[#631521] bg-[#FAF5F0] border border-[#D4AF37]/60 px-1.5 py-0.5 rounded-[2px] w-fit mt-1 flex items-center gap-1">
              <span>⏱</span> Đặt trước — giao trong 7-10 ngày
            </p>
          )}
          <p className="font-serif font-bold text-[1.15rem] text-[#631521] mt-1">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        {/* Qty + Remove */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="inline-flex items-center border border-[#E8DFD5] bg-white rounded-[2px]">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              aria-label="Giảm số lượng"
              disabled={item.quantity <= 1}
              className="w-7 h-7 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521] disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 h-7 flex items-center justify-center font-sans font-bold text-xs text-[#1A1614] border-x border-[#E8DFD5]">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              aria-label="Tăng số lượng"
              className="w-7 h-7 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            aria-label={`Xóa ${item.name}`}
            className="flex items-center gap-1 font-sans text-[0.75rem] font-medium text-[#8C7E74] hover:text-[#631521] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa
          </button>
        </div>
      </div>
    </div>
  )
}
