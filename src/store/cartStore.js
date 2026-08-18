import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      freeShippingThreshold: 500000,

      get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      get subtotal() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      get freeShippingProgress() {
        const sub = get().items.reduce((s, i) => s + i.price * i.quantity, 0)
        return Math.min(100, (sub / get().freeShippingThreshold) * 100)
      },

      get remainingForFreeShipping() {
        const sub = get().items.reduce((s, i) => s + i.price * i.quantity, 0)
        return Math.max(0, get().freeShippingThreshold - sub)
      },

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: item.quantity || 1 }] }
        }),

      removeItem: (itemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

      updateQuantity: (itemId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.id !== itemId) }
          }
          return {
            items: state.items.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i)),
          }
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'quannguyens-cart',
    }
  )
)

export default useCartStore
