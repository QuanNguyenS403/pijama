import { products } from '../data/products'

export function useProduct(slug) {
  const product = products.find((p) => p.slug === slug)
  const related = product
    ? products.filter((p) => product.relatedProducts?.includes(p.slug))
    : []
  return { product: product || null, related }
}
