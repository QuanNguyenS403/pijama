import { products } from '../data/products'

// Mapping slug thân thiện mới -> id / slug hệ thống
const SLUG_ALIASES = {
  'the-daybreak-set': 'the-classic-set',
  'the-stillwater-set': 'the-cafe-look',
  'the-hearth-set': 'the-evening-edit',
}

export function useProduct(slug) {
  const targetSlug = SLUG_ALIASES[slug] || slug
  const product = products.find((p) => p.slug === targetSlug || p.id === targetSlug || p.slug === slug || p.id === slug)
  const related = product
    ? products.filter((p) => product.relatedProducts?.includes(p.slug) || product.relatedProducts?.includes(p.id))
    : []
  return { product: product || null, related }
}
