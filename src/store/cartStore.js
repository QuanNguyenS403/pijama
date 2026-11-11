import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../lib/apiClient'

const MAX_ITEM_QTY = 20

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      freeShippingThreshold: 500000,
      appliedVoucher: null,
      deliveryOption: 'COMBINED',
      serverSyncEnabled: false,

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

      clearCart: () => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.removeItem('qns_active_voucher')
        } catch {}
        set({ items: [], appliedVoucher: null, deliveryOption: 'COMBINED' })
        if (get().serverSyncEnabled && typeof fetch === 'function') {
          apiClient('/api/cart', { method: 'DELETE' }).catch(() => {})
        }
      },

      setAppliedVoucher: (voucher) => {
        const cleanVoucher = voucher && typeof voucher === 'object' ? voucher : null
        try {
          if (typeof localStorage !== 'undefined') {
            if (cleanVoucher) localStorage.setItem('qns_active_voucher', JSON.stringify(cleanVoucher))
            else localStorage.removeItem('qns_active_voucher')
          }
        } catch {}
        set({ appliedVoucher: cleanVoucher })
        get().pushToServerCart()
      },

      setDeliveryOption: (option) => {
        const normalized = option === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED'
        set({ deliveryOption: normalized })
        get().pushToServerCart()
      },

      pushToServerCart: async () => {
        if (!get().serverSyncEnabled || typeof fetch !== 'function') return
        const { items, appliedVoucher, deliveryOption } = get()
        try {
          await apiClient('/api/cart', {
            method: 'PUT',
            body: JSON.stringify({ items, appliedVoucher, deliveryOption }),
          })
        } catch {
          // ignore offline/guest error
        }
      },

      syncFromServerCart: async () => {
        if (typeof fetch !== 'function') return null
        try {
          const res = await apiClient('/api/cart', { method: 'GET' })
          if (!res.ok) {
            if (res.status === 401) set({ serverSyncEnabled: false })
            return null
          }
          const data = await res.json()
          set({ serverSyncEnabled: true })
          const localState = get()
          const serverItems = Array.isArray(data.items) ? data.items : []
          if (localState.items.length === 0 && serverItems.length > 0) {
            set({
              items: serverItems,
              appliedVoucher: data.appliedVoucher || localState.appliedVoucher,
              deliveryOption: data.deliveryOption === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : localState.deliveryOption,
            })
          } else if (localState.items.length > 0 && serverItems.length === 0) {
            await get().pushToServerCart()
          } else if (!localState.appliedVoucher && data.appliedVoucher) {
            set({ appliedVoucher: data.appliedVoucher })
          }
          return data
        } catch {
          return null
        }
      },
    }),
    {
      name: 'quannguyens-cart',
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            items: [],
            freeShippingThreshold: 500000,
            appliedVoucher: null,
            deliveryOption: 'COMBINED',
          }
        }
        const cleanItems = Array.isArray(persistedState.items)
          ? persistedState.items.map((item) => ({
              ...item,
              quantity: Math.max(1, Math.min(MAX_ITEM_QTY, Math.floor(Number(item.quantity) || 1))),
            }))
          : []
        let legacyVoucher = persistedState.appliedVoucher || null
        if (!legacyVoucher && typeof localStorage !== 'undefined') {
          try {
            legacyVoucher = JSON.parse(localStorage.getItem('qns_active_voucher') || 'null')
          } catch {}
        }
        return {
          ...persistedState,
          items: cleanItems,
          freeShippingThreshold: persistedState.freeShippingThreshold || 500000,
          appliedVoucher: legacyVoucher,
          deliveryOption: persistedState.deliveryOption === 'SPLIT_SHIPPING' ? 'SPLIT_SHIPPING' : 'COMBINED',
        }
      },
    }
  )
)

// Tự động đồng bộ thay đổi giỏ hàng khi đã đăng nhập
if (typeof window !== 'undefined') {
  let lastItemsRef = useCartStore.getState().items
  let syncTimer = null
  useCartStore.subscribe((state) => {
    if (state.serverSyncEnabled && state.items !== lastItemsRef) {
      lastItemsRef = state.items
      if (syncTimer) clearTimeout(syncTimer)
      syncTimer = setTimeout(() => {
        useCartStore.getState().pushToServerCart()
      }, 300)
    }
  })

  window.addEventListener('customer_auth_changed', (e) => {
    if (!e?.detail?.user) {
      useCartStore.setState({ serverSyncEnabled: false })
    } else {
      useCartStore.getState().syncFromServerCart()
    }
  })

  window.addEventListener('auth_expired', () => {
    useCartStore.setState({ serverSyncEnabled: false })
  })
}

export default useCartStore
