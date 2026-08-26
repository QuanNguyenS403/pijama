import { useState, useEffect } from 'react'
import { products } from '../data/products'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch {
      // ignore
    }
  }

  return [storedValue, setValue]
}

export function useRecentlyViewed(maxItems = 10) {
  const [viewed, setViewed] = useLocalStorage('qns-recently-viewed', [])

  const addViewed = (product) => {
    const img = Array.isArray(product.images)
      ? product.images[0]
      : (product.images?.[product.colors?.[0]?.name]?.[0] || Object.values(product.images || {})[0]?.[0])
    setViewed((prev) => {
      const filtered = prev.filter((p) => p.slug !== product.slug)
      return [{ slug: product.slug, name: product.name, price: product.price, image: img }, ...filtered].slice(0, maxItems)
    })
  }

  // Lọc bỏ mọi sản phẩm đã đổi tên/gỡ khỏi danh mục hiện tại —
  // tự động dọn "ghost product" khỏi localStorage của MỌI khách,
  // không cần yêu cầu khách tự xóa cache.
  const validSlugs = new Set(products.map((p) => p.slug))
  const validViewed = viewed.filter((p) => validSlugs.has(p.slug))

  return { viewed: validViewed, addViewed }
}

