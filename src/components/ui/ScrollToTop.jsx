import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { smoothScrollTo } from '../../lib/smoothScroll'

/**
 * Tự động đưa vị trí cuộn về đầu trang ngay khi chuyển sang trang mới
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    smoothScrollTo(0, { immediate: true })
  }, [pathname])

  return null
}
