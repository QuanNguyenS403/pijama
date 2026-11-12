import { useState, useEffect, useCallback } from 'react'
import { getSampleReviewsByProduct } from '../data/reviewsData'

const REVIEWS_SOURCE = import.meta.env.VITE_REVIEWS_SOURCE || 'api'

export function useProductReviews(productId, { rating = null, hasPhoto = false, page = 1, limit = 10 } = {}) {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    photoCount: 0,
  })
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(async () => {
    if (!productId) {
      setReviews([])
      setLoading(false)
      return
    }

    const fallbackData = getSampleReviewsByProduct(productId, { rating, hasPhoto, page, limit })

    // Nếu cấu hình dùng API
    if (REVIEWS_SOURCE === 'api') {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        if (rating) params.append('rating', rating)
        if (hasPhoto) params.append('hasPhoto', 'true')
        if (page) params.append('page', page)
        if (limit) params.append('limit', limit)

        const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews?${params.toString()}`)
        if (!res.ok) {
          throw new Error(`Máy chủ phản hồi mã lỗi ${res.status}`)
        }

        const json = await res.json()
        if (json.success && json.data && (json.data.totalReviews > 0 || (json.data.reviews && json.data.reviews.length > 0))) {
          setReviews(json.data.reviews || [])
          setSummary(json.data.summary || {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            photoCount: 0,
          })
          setTotalPages(json.data.totalPages || 1)
          return
        }

        // Nếu API trả về mảng rỗng nhưng có reviews mẫu có sẵn
        if (fallbackData && fallbackData.summary.totalReviews > 0) {
          setReviews(fallbackData.reviews)
          setSummary(fallbackData.summary)
          setTotalPages(fallbackData.totalPages)
          return
        }

        setReviews([])
      } catch (err) {
        // Khi lỗi mạng, server offline hoặc không kết nối được API:
        // Tự động fallback sang kho đánh giá mẫu chất lượng cao cho PDP
        if (fallbackData && fallbackData.summary.totalReviews > 0) {
          setReviews(fallbackData.reviews)
          setSummary(fallbackData.summary)
          setTotalPages(fallbackData.totalPages)
          return
        }
        console.warn(`[REVIEWS HOOK] Lỗi tải đánh giá sản phẩm ${productId}:`, err.message)
        setError(err.message)
        setReviews([])
        setSummary({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          photoCount: 0,
        })
      } finally {
        setLoading(false)
      }
    } else {
      // Chế độ không dùng API
      setReviews(fallbackData.reviews)
      setSummary(fallbackData.summary)
      setTotalPages(fallbackData.totalPages)
      setLoading(false)
    }
  }, [productId, rating, hasPhoto, page, limit])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return {
    reviews,
    summary,
    totalPages,
    loading,
    error,
    refetch: fetchReviews,
  }
}
