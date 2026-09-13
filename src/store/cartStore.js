import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEM_QTY = 20

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
          const addQty = Math.max(1, Math.min(MAX_ITEM_QTY, Math.floor(Number(item.quantity) || 1)))
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            const nextQty = Math.min(MAX_ITEM_QTY, existing.quantity + addQty)
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: nextQty }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: addQty }] }
        }),

      removeItem: (itemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

      updateQuantity: (itemId, qty) =>
        set((state) => {
          const parsed = Math.floor(Number(qty) || 0)
          if (parsed <= 0) {
            return { items: state.items.filter((i) => i.id !== itemId) }
          }
          const clamped = Math.min(MAX_ITEM_QTY, parsed)
          return {
            items: state.items.map((i) => (i.id === itemId ? { ...i, quantity: clamped } : i)),
          }
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'quannguyens-cart',
      version: 1,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return { items: [], freeShippingThreshold: 500000 }
        }
        const cleanItems = Array.isArray(persistedState.items)
          ? persistedState.items.map((item) => ({
              ...item,
              quantity: Math.max(1, Math.min(MAX_ITEM_QTY, Math.floor(Number(item.quantity) || 1))),
            }))
          : []
        return {
          ...persistedState,
          items: cleanItems,
        }
      },
    }
  )
)

export default useCartStore
