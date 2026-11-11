import useCartStore from '../store/cartStore'
import { analyzeCartFulfillment } from '../lib/productUtils'
import { FREE_SHIP_THRESHOLD, STANDARD_SHIPPING_FEE, SPLIT_SHIPPING_EXTRA_FEE } from '../lib/pricingCalculator'

export function useCart() {
  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const freeShippingThreshold = useCartStore((s) => s.freeShippingThreshold) || FREE_SHIP_THRESHOLD
  const appliedVoucher = useCartStore((s) => s.appliedVoucher)
  const setAppliedVoucher = useCartStore((s) => s.setAppliedVoucher)
  const deliveryOption = useCartStore((s) => s.deliveryOption)
  const setDeliveryOption = useCartStore((s) => s.setDeliveryOption)
  const syncFromServerCart = useCartStore((s) => s.syncFromServerCart)

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100)
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const fulfillment = analyzeCartFulfillment(items)
  const baseShippingFee = subtotal >= freeShippingThreshold ? 0 : STANDARD_SHIPPING_FEE
  const splitShippingFee = fulfillment.isMixed && deliveryOption === 'SPLIT_SHIPPING' ? SPLIT_SHIPPING_EXTRA_FEE : 0
  const shippingFee = baseShippingFee

  return {
    items,
    totalItems,
    subtotal,
    freeShippingProgress,
    remainingForFreeShipping,
    shippingFee,
    baseShippingFee,
    splitShippingFee,
    freeShippingThreshold,
    appliedVoucher,
    setAppliedVoucher,
    deliveryOption,
    setDeliveryOption,
    fulfillment,
    syncFromServerCart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }
}
