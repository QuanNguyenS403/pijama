import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ChevronRight, Trash2, ShoppingBag } from 'lucide-react'
import Header from '../components/layout/Header'
import CartSummary from '../components/cart/CartSummary'
import CartDrawer from '../components/cart/CartDrawer'
import { Toast } from '../components/ui/Toast'
import Section12Footer from '../components/sections/Section12Footer'
import { useCart } from '../hooks/useCart'
import { motion } from 'framer-motion'

function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

export default function CartPage() {
  const { items, totalItems, subtotal, freeShippingProgress, remainingForFreeShipping, shippingFee, removeItem, updateQuantity } = useCart()
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <title>Giỏ Hàng — QuanNguyenS European Casual Luxury</title>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />

      {/* Spacer */}
      <div className="h-16 md:h-20" />

      {/* Breadcrumb */}
      <div className="bg-[#FAF8F5] border-b border-[#E8DFD5]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1 font-sans text-xs font-medium text-[#8C7E74] hover:text-[#631521] transition-colors">
              <Home className="w-3.5 h-3.5" /> Trang Chủ
            </Link>
            <ChevronRight className="w-3 h-3 text-[#E8DFD5]" />
            <span className="font-sans text-xs font-semibold text-[#1A1614]">Giỏ Hàng</span>
          </nav>
        </div>
      </div>

      {/* Page content */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-10 md:py-14">
        {/* Heading */}
        <div className="mb-10">
          <span className="font-serif text-sm font-semibold tracking-[0.25em] text-[#631521] uppercase block mb-2">
            GIỎ HÀNG CỦA BẠN
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1614] tracking-tight">
            {totalItems > 0 ? `${totalItems} sản phẩm đang chờ bạn` : 'Giỏ hàng của bạn đang trống'}
          </h1>
          <div className="w-16 h-[2px] bg-[#D4AF37] mt-4" />
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center bg-white p-8 rounded-[4px] border border-[#E8DFD5] shadow-sm max-w-lg mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#8C7E74] mb-4 border border-[#E8DFD5]">
              <ShoppingBag className="w-9 h-9" />
            </div>
            <p className="font-serif text-2xl font-bold text-[#1A1614] mb-2">Chưa có sản phẩm nào</p>
            <p className="font-sans text-sm font-light text-[#8C7E74] mb-6 max-w-xs">
              Hãy khám phá những bộ pijama tự nhiên cao cấp phong cách châu Âu
            </p>
            <Link
              to="/"
              className="bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] px-9 py-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-luxury transition-all duration-200"
            >
              Khám Phá Bộ Sưu Tập
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left — items table (7/8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white p-6 rounded-[4px] border border-[#E8DFD5] shadow-sm">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2.5fr_1.2fr_1fr_auto] gap-4 pb-4 border-b border-[#E8DFD5] mb-2">
                {['SẢN PHẨM', 'MÀU SẮC / SIZE', 'SỐ LƯỢNG', 'GIÁ'].map((h) => (
                  <span key={h} className="font-serif text-xs font-bold uppercase tracking-[0.15em] text-[#631521]">
                    {h}
                  </span>
                ))}
              </div>

              {/* Item list */}
              <div className="divide-y divide-[#E8DFD5]">
                {items.map((item) => (
                  <div key={item.id} className="py-5">
                    {/* Mobile layout */}
                    <div className="flex md:hidden gap-3.5">
                      <Link to={`/san-pham/${item.slug}`}>
                        <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-[2px] border border-[#E8DFD5] shrink-0" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/san-pham/${item.slug}`}>
                          <p className="font-serif font-bold text-base text-[#1A1614] leading-snug">{item.name}</p>
                        </Link>
                        <p className="font-sans text-xs text-[#8C7E74] mt-0.5">{item.color?.name || (typeof item.color === 'string' ? item.color : '')} | Size <span className="font-bold text-[#1A1614]">{item.size}</span></p>
                        {(item.preOrder?.enabled || item.isPreOrder || item.slug === 'the-evening-edit' || item.productId === 'the-evening-edit') && (
                          <p className="font-sans text-[0.7rem] font-bold text-[#631521] bg-[#FAF5F0] border border-[#D4AF37]/60 px-1.5 py-0.5 rounded-[2px] w-fit mt-1 flex items-center gap-1">
                            <span>⏱</span> Đặt trước — giao trong 7-10 ngày
                          </p>
                        )}
                        <p className="font-serif text-base font-bold text-[#631521] mt-1">{formatPrice(item.price * item.quantity)}</p>
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="inline-flex border border-[#E8DFD5] bg-white rounded-[2px] items-center">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB]">-</button>
                            <span className="w-8 h-7 flex items-center justify-center border-x border-[#E8DFD5] font-sans text-xs font-bold text-[#1A1614]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB]">+</button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-[#8C7E74] hover:text-[#631521] transition-colors p-1" aria-label="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-[2.5fr_1.2fr_1fr_auto] gap-4 items-center">
                      <div className="flex items-center gap-4">
                        <Link to={`/san-pham/${item.slug}`} className="shrink-0">
                          <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-[2px] border border-[#E8DFD5]" />
                        </Link>
                        <div>
                          <Link to={`/san-pham/${item.slug}`}>
                            <p className="font-serif font-bold text-base text-[#1A1614] hover:text-[#631521] transition-colors leading-snug">{item.name}</p>
                          </Link>
                          <p className="font-sans text-xs font-light text-[#8C7E74] mt-0.5">{item.subtitle}</p>
                          {(item.preOrder?.enabled || item.isPreOrder || item.slug === 'the-evening-edit' || item.productId === 'the-evening-edit') && (
                            <span className="inline-flex items-center gap-1 font-sans text-[0.7rem] font-bold text-[#631521] bg-[#FAF5F0] border border-[#D4AF37]/60 px-1.5 py-0.5 rounded-[2px] mt-1.5">
                              ⏱ Đặt trước — giao trong 7-10 ngày
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="font-sans text-sm text-[#1A1614] font-medium">{item.color?.name || (typeof item.color === 'string' ? item.color : '')}</p>
                        <p className="font-sans text-xs text-[#8C7E74] mt-0.5">Size <span className="font-bold text-[#1A1614]">{item.size}</span></p>
                      </div>

                      <div className="inline-flex border border-[#E8DFD5] bg-white rounded-[2px] items-center self-center">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521]">-</button>
                        <span className="w-9 h-8 flex items-center justify-center border-x border-[#E8DFD5] font-sans text-xs font-bold text-[#1A1614]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-[#4A3F38] hover:bg-[#F5F0EB] hover:text-[#631521]">+</button>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="font-serif text-lg font-bold text-[#631521]">{formatPrice(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.id)} aria-label="Xóa sản phẩm" className="text-[#8C7E74] hover:text-[#631521] transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table footer */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E8DFD5]">
                <Link to="/" className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521] hover:underline flex items-center gap-1.5">
                  ← Tiếp Tục Mua Sắm
                </Link>
              </div>
            </div>

            {/* Right — Summary (5/4 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
              <CartSummary
                subtotal={subtotal}
                shippingFee={shippingFee}
                freeShippingProgress={freeShippingProgress}
                remainingForFreeShipping={remainingForFreeShipping}
                onCheckout={() => navigate('/checkout')}
                showVoucher
              />
            </div>
          </div>
        )}
      </main>

      <Section12Footer />
    </div>
  )
}
