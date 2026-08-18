import useCartStore from '../store/cartStore'

export function useCart() {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const freeShippingThreshold = useCartStore((s) => s.freeShippingThreshold)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100)
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const shippingFee = subtotal >= freeShippingThreshold ? 0 : 30000

  return {
    items,
    totalItems,
    subtotal,
    freeShippingProgress,
    remainingForFreeShipping,
    shippingFee,
    freeShippingThreshold,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
