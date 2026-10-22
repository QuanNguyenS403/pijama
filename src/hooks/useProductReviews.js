import { useState, useEffect, useCallback } from 'react'

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

    // Nếu cấu hình dùng API (Mặc định bắt buộc theo Luật Thép)
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
        if (json.success && json.data) {
          setReviews(json.data.reviews || [])
          setSummary(json.data.summary || {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            photoCount: 0,
          })
          setTotalPages(json.data.totalPages || 1)
        } else {
          setReviews([])
        }
      } catch (err) {
        console.warn(`[REVIEWS HOOK] Lỗi tải đánh giá sản phẩm ${productId}:`, err.message)
        setError(err.message)
        // Khi lỗi mạng/server: TUYỆT ĐỐI không fallback sang review giả
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
