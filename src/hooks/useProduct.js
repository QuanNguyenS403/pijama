import { products } from '../data/products'
import { LEGACY_PRODUCT_SLUG_REDIRECTS, resolveCanonicalProductSlug } from '../lib/productUtils'

export function useProduct(slug) {
  const canonicalSlug = resolveCanonicalProductSlug(slug)
  const isLegacySlug = Boolean(slug && LEGACY_PRODUCT_SLUG_REDIRECTS[String(slug).toLowerCase()])
  const product = products.find(
    (p) => p.slug === canonicalSlug || p.id === canonicalSlug || p.slug === slug || p.id === slug
  )
  const related = product
    ? products.filter((p) => product.relatedProducts?.includes(p.slug) || product.relatedProducts?.includes(p.id))
    : []
  return { product: product || null, related, isLegacySlug }
}
