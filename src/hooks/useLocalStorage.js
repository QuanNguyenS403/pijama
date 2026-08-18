import { useState, useEffect } from 'react'

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

  return { viewed, addViewed }
}
